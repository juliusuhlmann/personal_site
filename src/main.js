import "./particles.js";
import particlesConfig from "./particles-config.js";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let particleStageWidth = window.innerWidth;
let particleFadeEnd = null;

const updateParticleStageHeight = () => {
  const stage = document.querySelector("#particles-js");
  const footer = document.querySelector(".site-footer");
  const aboutPanel = document.querySelector("[data-about-overlay] .about-panel");

  if (!stage) {
    return;
  }

  const footerHeight = footer?.offsetHeight ?? 0;
  stage.style.height = `${document.documentElement.scrollHeight - footerHeight}px`;

  if (aboutPanel && particleFadeEnd === null) {
    const aboutPanelRect = aboutPanel.getBoundingClientRect();
    particleFadeEnd =
      aboutPanelRect.top + window.scrollY + aboutPanelRect.height * (2 / 3);
  }

  if (particleFadeEnd !== null) {
    stage.style.setProperty("--particle-fade-end", `${particleFadeEnd}px`);
    stage.style.setProperty("--particle-field-height", `${particleFadeEnd}px`);
  }
};

const updateEditorLineNumbers = () => {
  document.querySelectorAll("[data-editor-line-numbers]").forEach((rail) => {
    const panel = rail.closest(".about-panel");

    if (!panel) {
      return;
    }

    const railStyles = getComputedStyle(rail);
    const lineHeight = Number.parseFloat(railStyles.lineHeight);
    const topOffset = Number.parseFloat(railStyles.top);
    const bottomOffset = Number.parseFloat(railStyles.bottom);
    const railHeight = Math.max(0, panel.clientHeight - topOffset - bottomOffset);
    const count = Math.max(1, Math.ceil(railHeight / lineHeight));
    const currentCount = Number.parseInt(rail.dataset.lineCount || "0", 10);

    if (currentCount === count) {
      return;
    }

    rail.replaceChildren(
      ...Array.from({ length: count }, (_, index) => {
        const line = document.createElement("span");
        line.textContent = String(index + 1).padStart(2, "0");
        return line;
      }),
    );
    rail.dataset.lineCount = String(count);
  });
};

const updateParticleStageHeightOnLayoutResize = () => {
  if (window.innerWidth === particleStageWidth) {
    return;
  }

  particleStageWidth = window.innerWidth;
  particleFadeEnd = null;
  updateEditorLineNumbers();
  updateParticleStageHeight();
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

const initializeTimelineDisclosures = () => {
  document
    .querySelectorAll("[data-about-overlay] .timeline-item")
    .forEach((item, index) => {
      const details = item.querySelector(".timeline-details");

      if (!details) {
        return;
      }

      const detailsId = details.id || `timeline-details-${index + 1}`;
      details.id = detailsId;
      details.setAttribute("aria-hidden", "true");

      item.classList.remove("timeline-item-open");
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-expanded", "false");
      item.setAttribute("aria-controls", detailsId);

      const setOpen = (isOpen) => {
        item.classList.toggle("timeline-item-open", isOpen);
        item.setAttribute("aria-expanded", String(isOpen));
        details.setAttribute("aria-hidden", String(!isOpen));

        window.setTimeout(() => {
          updateEditorLineNumbers();
        }, reduceMotion ? 0 : 240);
      };

      const toggleOpen = () => {
        setOpen(!item.classList.contains("timeline-item-open"));
      };

      item.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
          return;
        }

        toggleOpen();
      });

      item.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        toggleOpen();
      });
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

      const id =
        container.id || `article-particles-${articleWindow.hash.slice(1)}-${index + 1}`;
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

initializeTimelineDisclosures();
updateEditorLineNumbers();
updateParticleStageHeight();
window.addEventListener("resize", updateParticleStageHeightOnLayoutResize);
window.addEventListener("load", () => {
  updateEditorLineNumbers();
  updateParticleStageHeight();
});

if (!reduceMotion && typeof window.particlesJS === "function") {
  window.particlesJS("particles-js", particlesConfig);
}
