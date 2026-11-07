const form = document.querySelector("#departure-form");
const textbox = document.querySelector("#confession");
const stage = document.querySelector("#departure-animation");
const button = form.querySelector("button");
const main = document.querySelector("main");

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

// Remove the previous completion message.
document.querySelectorAll(".departure-status").forEach(
  (element) => element.remove()
);

// Create the ending screen.
let ending = document.querySelector("#departure-ending");

if (!ending) {
  ending = document.createElement("section");
  ending.id = "departure-ending";
  ending.hidden = true;
  ending.setAttribute("aria-label", "Departure complete");

  const message = document.createElement("p");
  message.textContent = "DEPARTED.";
  message.setAttribute("role", "status");

  const restart = document.createElement("button");
  restart.type = "button";
  restart.textContent = "Release something else";

  ending.append(message, restart);
  document.body.append(ending);
}

const restart = ending.querySelector("button");
let releasing = false;

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = textbox.value.trim();

  if (!message || releasing) {
    return;
  }

  releasing = true;
  button.disabled = true;
  textbox.disabled = true;
  ending.hidden = true;
  stage.replaceChildren();

  // Keep the placeholder hidden until the visitor starts again.
  textbox.placeholder = "";

  // Use the whole browser window for the animation.
  Object.assign(stage.style, {
    inset: "0",
    left: "0",
    top: "0",
    width: "100%",
    height: "100%"
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

  const width = window.innerWidth;
  const height = window.innerHeight;

  const cloud = document.createElement("div");
  cloud.className = "departing-words";

  // Center the message before its letters scatter.
  Object.assign(cloud.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(80vw, 700px)",
    maxHeight: "75vh",
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

    // JavaScript controls the movement instead of CSS.
    letter.style.animation = "none";

    cloud.append(letter);
    letters.push(letter);
  }

  stage.append(cloud);

  // Fit longer messages within the animation space.
  let fontSize = parseFloat(getComputedStyle(cloud).fontSize);

  while (cloud.scrollHeight > height * 0.7 && fontSize > 10) {
    fontSize -= 1;
    cloud.style.fontSize = `${fontSize}px`;
  }

  const positions = letters.map(
    (letter) => letter.getBoundingClientRect()
  );

  // Place each letter independently without changing its starting spot.
  letters.forEach((letter, index) => {
    const bounds = positions[index];

    Object.assign(letter.style, {
      position: "absolute",
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      fontSize: `${fontSize}px`,
      lineHeight: "1",
      margin: "0"
    });

    stage.append(letter);
  });

  cloud.remove();

  const animations = letters.map((letter, index) => {
    const start = positions[index];

    // Choose a destination safely inside the screen.
    const targetX = 24 + Math.random() * Math.max(0, width - 72);
    const targetY = 24 + Math.random() * Math.max(0, height - 72);

    const dx = targetX - start.left;
    const dy = targetY - start.top;
    const sway = (Math.random() - 0.5) * 80;
    const rotation = (Math.random() - 0.5) * 60;

    return letter.animate(
      [
        {
          offset: 0,
          opacity: 0,
          transform: "translate(0, 0)",
          filter: "blur(0px)",
          color: "#c5f8ff"
        },
        {
          offset: 0.1,
          opacity: 1,
          transform: "translate(0, 0)",
          filter: "blur(0px)",
          color: "#c5f8ff"
        },
        {
          offset: 0.22,
          opacity: 1,
          transform: "translate(0, 0)",
          color: "#e2c4ff"
        },
        {
          offset: 0.6,
          opacity: 1,
          transform: `translate(${dx * 0.55 + sway}px, ${dy * 0.55}px)
                      rotate(${rotation * 0.5}deg)`,
          color: "#ffbddf"
        },
        {
          offset: 0.85,
          opacity: 0.8,
          transform: `translate(${dx * 0.9}px, ${dy * 0.9}px)
                      rotate(${rotation}deg)`,
          filter: "blur(0px)",
          color: "#b9ffe3"
        },
        {
          offset: 1,
          opacity: 0,
          transform: `translate(${dx}px, ${dy}px)
                      rotate(${rotation}deg)`,
          filter: "blur(5px)",
          color: "#c5f8ff"
        }
      ],
      {
        duration: 9000 + Math.random() * 1000,
        easing: "linear",
        fill: "forwards"
      }
    );
  });

  await Promise.allSettled(
    animations.map((animation) => animation.finished)
  );

  animations.forEach((animation) => animation.cancel());
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