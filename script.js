const form = document.querySelector("#departure-form");
const textbox = document.querySelector("#confession");
const stage = document.querySelector("#departure-animation");
const button = form.querySelector("button");
const main = document.querySelector("main");

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

document.querySelectorAll(".departure-status").forEach(
  (element) => element.remove()
);

// Create the ending screen if it does not already exist.
let ending = document.querySelector("#departure-ending");

if (!ending) {
  ending = document.createElement("section");
  ending.id = "departure-ending";
  ending.hidden = true;
  ending.setAttribute("aria-label", "Departure complete");

  const message = document.createElement("p");
  message.textContent = "Just departed.";
  message.setAttribute("role", "status");

  const restartButton = document.createElement("button");
  restartButton.type = "button";
  restartButton.textContent = "Release something else";

  ending.append(message, restartButton);
  document.body.append(ending);
}

const restart = ending.querySelector("button");
const pointer = { x: 0, y: 0, active: false };
const colors = ["#c5f8ff", "#e2c4ff", "#ffbddf", "#b9ffe3"];

let releasing = false;

function trackPointer(event) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
}

window.addEventListener("pointermove", trackPointer);
window.addEventListener("pointerdown", trackPointer);

window.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "mouse") {
    pointer.active = false;
  }
});

window.addEventListener("pointercancel", () => {
  pointer.active = false;
});

document.documentElement.addEventListener("pointerleave", () => {
  pointer.active = false;
});

window.addEventListener("blur", () => {
  pointer.active = false;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = textbox.value.trim();

  if (!message || releasing) return;

  releasing = true;
  button.disabled = true;
  textbox.disabled = true;
  textbox.placeholder = "";
  ending.hidden = true;
  stage.replaceChildren();

  Object.assign(stage.style, {
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none"
  });

  document.body.classList.add("is-departing");
  main.inert = true;

  try {
    if (!reducedMotion.matches) {
      await animateDeparture(message);
    }
  } catch (error) {
    console.error("Departure animation:", error);
  } finally {
    stage.replaceChildren();
    textbox.value = "";

    document.body.classList.remove("is-departing");
    document.body.classList.add("has-departed");

    ending.hidden = false;
    restart.focus();
  }
});

async function animateDeparture(message) {
  await document.fonts.ready;

  const cloud = document.createElement("div");
  cloud.className = "departing-words";

  Object.assign(cloud.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(80vw, 700px)",
    padding: "0",
    textAlign: "center",
    fontSize: message.length > 250 ? "1rem" : "1.35rem"
  });

  const letters = [];

  for (const character of message.toUpperCase()) {
    if (/\s/.test(character)) {
      cloud.append(document.createTextNode(character));
      continue;
    }

    const letter = document.createElement("span");
    letter.className = "departing-letter";
    letter.textContent = character;
    letter.style.animation = "none";

    cloud.append(letter);
    letters.push(letter);
  }

  stage.append(cloud);

  let fontSize = parseFloat(getComputedStyle(cloud).fontSize);

  while (
    cloud.scrollHeight > window.innerHeight * 0.7 &&
    fontSize > 10
  ) {
    fontSize -= 1;
    cloud.style.fontSize = `${fontSize}px`;
  }

  const positions = letters.map(
    (letter) => letter.getBoundingClientRect()
  );

  const particles = letters.map((letter, index) => {
    const bounds = positions[index];

    Object.assign(letter.style, {
      position: "absolute",
      left: "0",
      top: "0",
      fontSize: `${fontSize}px`,
      lineHeight: "1",
      margin: "0",
      opacity: "0",
      transformOrigin: "center",
      willChange: "transform, opacity"
    });

    stage.append(letter);

    return {
      element: letter,
      startX: bounds.left,
      startY: bounds.top,
      targetX: Math.random(),
      targetY: Math.random(),
      phase: Math.random() * Math.PI * 2,
      duration: 8500 + Math.random() * 1500,
      pushX: 0,
      pushY: 0,
      velocityX: 0,
      velocityY: 0,
      color: colors[index % colors.length],
      star: false
    };
  });

  cloud.remove();

  await new Promise((resolve) => {
    let started;
    let previous;

    function frame(now) {
      if (started === undefined) {
        started = now;
        previous = now;
      }

      const elapsed = now - started;
      const dt = Math.min((now - previous) / 1000, 0.04);
      previous = now;

      const width = window.innerWidth;
      const height = window.innerHeight;

      let unfinished = false;

      for (const particle of particles) {
        const progress = Math.min(
          elapsed / particle.duration,
          1
        );

        if (progress >= 1) {
          particle.element.style.opacity = "0";
          continue;
        }

        unfinished = true;

        // Hold the words together before they wander.
        const travel = Math.max(
          0,
          Math.min((progress - 0.18) / 0.67, 1)
        );

        const eased = travel * travel * (3 - 2 * travel);

        const targetX =
          24 + particle.targetX * Math.max(0, width - 72);

        const targetY =
          24 + particle.targetY * Math.max(0, height - 72);

        let x =
          particle.startX +
          (targetX - particle.startX) * eased;

        let y =
          particle.startY +
          (targetY - particle.startY) * eased;

        x += Math.sin(elapsed / 1000 + particle.phase) *
          24 * travel;

        y += Math.cos(elapsed / 1300 + particle.phase) *
          18 * travel;

        // Gently repel letters near the mouse or touch.
        if (pointer.active && progress > 0.18) {
          const dx = x + particle.pushX - pointer.x;
          const dy = y + particle.pushY - pointer.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 150) {
            const direction = distance > 0.1
              ? Math.atan2(dy, dx)
              : particle.phase;

            const force = (1 - distance / 150) * 900;

            particle.velocityX +=
              Math.cos(direction) * force * dt;

            particle.velocityY +=
              Math.sin(direction) * force * dt;
          }
        }

        // Soft spring and friction keep the motion gentle.
        particle.velocityX -= particle.pushX * 3 * dt;
        particle.velocityY -= particle.pushY * 3 * dt;

        particle.velocityX *= Math.exp(-4 * dt);
        particle.velocityY *= Math.exp(-4 * dt);

        particle.pushX += particle.velocityX * dt;
        particle.pushY += particle.velocityY * dt;

        x = Math.max(
          12,
          Math.min(width - fontSize - 12, x + particle.pushX)
        );

        y = Math.max(
          12,
          Math.min(height - fontSize - 12, y + particle.pushY)
        );

        let scale = 1;
        let rotation = Math.sin(particle.phase) * 20 * travel;
        let opacity = Math.min(progress / 0.08, 1);

        // Each letter becomes a small four-point star.
        if (progress >= 0.84) {
          if (!particle.star) {
            particle.star = true;
            particle.element.textContent = "";
            particle.element.classList.add("departure-star");
          }

          const starProgress = (progress - 0.84) / 0.16;

          scale = starProgress < 0.3
            ? 0.6 + (starProgress / 0.3) * 0.8
            : 1.4 * (1 - (starProgress - 0.3) / 0.7);

          opacity = 1 - starProgress;
          rotation += starProgress * 90;
        }

        particle.element.style.color = particle.color;
        particle.element.style.opacity = `${opacity}`;
        particle.element.style.transform =
          `translate(${x}px, ${y}px) ` +
          `rotate(${rotation}deg) scale(${scale})`;
      }

      if (unfinished) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

restart.addEventListener("click", () => {
  ending.hidden = true;
  stage.replaceChildren();

  document.body.classList.remove(
    "is-departing",
    "has-departed"
  );

  main.inert = false;
  releasing = false;
  button.disabled = false;
  textbox.disabled = false;
  textbox.placeholder = "Leave your words here...";
  textbox.focus();
});

textbox.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing
  ) {
    event.preventDefault();

    if (!event.repeat && !button.disabled) {
      form.requestSubmit(button);
    }
  }
});