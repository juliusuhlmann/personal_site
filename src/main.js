import "./particles.js";
import particlesConfig from "./particles-config.js";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const updateParticleStageHeight = () => {
  const stage = document.querySelector("#particles-js");

  if (!stage) {
    return;
  }

  stage.style.height = `${document.documentElement.scrollHeight}px`;
};

const articleWindows = [
  {
    hash: "#writing-entry-1",
    openerSelector: '[data-article-open="writing-entry-1"]',
    overlay: document.querySelector('[data-article-overlay="writing-entry-1"]'),
  },
];

const articleParticlesConfig = {
  ...particlesConfig,
  particles: {
    ...particlesConfig.particles,
    number: {
      ...particlesConfig.particles.number,
      value: 13,
      density: {
        ...particlesConfig.particles.number.density,
        enable: false,
      },
    },
    move: {
      ...particlesConfig.particles.move,
      enable: false,
    },
  },
  interactivity: {
    ...particlesConfig.interactivity,
    events: {
      ...particlesConfig.interactivity.events,
      onhover: {
        ...particlesConfig.interactivity.events.onhover,
        enable: false,
      },
      onclick: {
        ...particlesConfig.interactivity.events.onclick,
        enable: false,
      },
    },
  },
};

const scrollToHash = (hash) => {
  const target = document.querySelector(hash);

  if (!target) {
    return;
  }

  target.scrollIntoView({
    block: "start",
    behavior: reduceMotion ? "auto" : "smooth",
  });
};

const initializeArticleParticles = (articleWindow) => {
  if (!articleWindow?.overlay) {
    return;
  }

  articleWindow.overlay
    .querySelectorAll("[data-article-particles]")
    .forEach((container, index) => {
      if (container.dataset.particlesInitialized === "true") {
        return;
      }

      const id = container.id || `article-particles-${articleWindow.hash.slice(1)}-${index + 1}`;
      container.id = id;
      if (typeof window.particlesJS === "function") {
        window.particlesJS(id, articleParticlesConfig);
      }
      container.dataset.particlesInitialized = "true";
    });
};

const hideArticle = () => {
  articleWindows.forEach((articleWindow) => {
    if (articleWindow.overlay) {
      articleWindow.overlay.hidden = true;
    }
  });
  document.body.classList.remove("article-open");
};

const showArticle = (targetWindow, { updateHash = true } = {}) => {
  if (!targetWindow?.overlay) {
    return;
  }

  articleWindows.forEach((articleWindow) => {
    if (articleWindow.overlay) {
      articleWindow.overlay.hidden = articleWindow !== targetWindow;
    }
  });

  targetWindow.overlay.hidden = false;
  initializeArticleParticles(targetWindow);
  document.body.classList.add("article-open");

  if (updateHash && window.location.hash !== targetWindow.hash) {
    window.history.pushState(null, "", targetWindow.hash);
  }
};

articleWindows.forEach((articleWindow) => {
  document.querySelectorAll(articleWindow.openerSelector).forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showArticle(articleWindow);
    });
  });
});

document.querySelectorAll("[data-window-target]").forEach((control) => {
  control.addEventListener("click", (event) => {
    const targetHash = control.getAttribute("data-window-target");

    event.preventDefault();
    hideArticle();
    if (targetHash) {
      window.history.pushState(null, "", targetHash);
      scrollToHash(targetHash);
    }
  });
});

window.addEventListener("popstate", () => {
  const articleWindow = articleWindows.find(
    ({ hash, overlay }) => overlay && hash === window.location.hash,
  );

  if (articleWindow) {
    showArticle(articleWindow, { updateHash: false });
    return;
  }

  hideArticle();
});

const initialArticle = articleWindows.find(
  ({ hash, overlay }) => overlay && hash === window.location.hash,
);

if (initialArticle) {
  showArticle(initialArticle, { updateHash: false });
}

updateParticleStageHeight();
window.addEventListener("resize", updateParticleStageHeight);
window.addEventListener("load", updateParticleStageHeight);

if (!reduceMotion && typeof window.particlesJS === "function") {
  window.particlesJS("particles-js", particlesConfig);
}
