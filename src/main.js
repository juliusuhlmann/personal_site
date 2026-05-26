import "./styles.css";
import "./particles.js";
import particlesConfig from "./particles-config.js";

document.querySelectorAll("[data-placeholder-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
  });
});

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const goHome = () => {
  window.location.href = "/";
};

const aboutOverlay = document.querySelector("[data-about-overlay]");
const aboutPanel = aboutOverlay?.querySelector(".about-panel");

const removeAboutHash = () => {
  if (window.location.hash === "#about") {
    window.history.pushState(null, "", window.location.pathname);
  }
};

const showAbout = () => {
  if (!aboutOverlay) {
    return;
  }

  aboutOverlay.hidden = false;
  document.body.classList.add("about-open");
  aboutPanel?.classList.remove("about-panel-minimizing");
  aboutPanel?.removeAttribute("data-minimizing");

  if (window.location.hash !== "#about") {
    window.history.pushState(null, "", "#about");
  }
};

const hideAbout = () => {
  if (!aboutOverlay) {
    return;
  }

  aboutOverlay.hidden = true;
  document.body.classList.remove("about-open");
  aboutPanel?.classList.remove("about-panel-minimizing");
  aboutPanel?.removeAttribute("data-minimizing");
  removeAboutHash();
};

document.querySelectorAll("[data-about-open]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showAbout();
  });
});

document.querySelectorAll("[data-window-close]").forEach((control) => {
  control.addEventListener("click", (event) => {
    if (aboutOverlay?.contains(control)) {
      event.preventDefault();
      hideAbout();
      return;
    }

    goHome();
  });
});

document.querySelector("[data-window-minimize]")?.addEventListener("click", () => {
  const panel = aboutPanel ?? document.querySelector(".about-panel");
  const finishMinimize = aboutOverlay ? hideAbout : goHome;

  if (!panel || panel.dataset.minimizing === "true" || reduceMotion) {
    finishMinimize();
    return;
  }

  panel.dataset.minimizing = "true";
  panel.classList.add("about-panel-minimizing");

  panel.addEventListener("animationend", finishMinimize, { once: true });
});

window.addEventListener("popstate", () => {
  if (!aboutOverlay) {
    return;
  }

  if (window.location.hash === "#about") {
    showAbout();
    return;
  }

  hideAbout();
});

if (aboutOverlay && window.location.hash === "#about") {
  showAbout();
}

if (!reduceMotion && typeof window.particlesJS === "function") {
  window.particlesJS("particles-js", particlesConfig);
}
