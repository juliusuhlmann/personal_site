import "./particles.js";
import katex from "katex";
import "katex/dist/katex.min.css";
import particlesConfig from "./particles-config.js";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let particleStageWidth = window.innerWidth;
let particleFadeEnd = null;
let particleDensityFrame = null;
let currentParticleDensity = particlesConfig.particles.number.value;
let articleScrollMorphFrame = null;

const updateParticleDensity = () => {
  particleDensityFrame = null;

  const particleInstance = window.pJSDom?.find(
    ({ pJS }) => pJS.canvas.el.parentElement?.id === "particles-js",
  )?.pJS;

  if (!particleInstance || particleFadeEnd === null) {
    return;
  }

  const densityRange = Math.max(1, particleFadeEnd - window.innerHeight);
  const scrollProgress = Math.min(1, Math.max(0, window.scrollY / densityRange));
  const densityScale = 1 - scrollProgress * 0.6;
  const nextDensity = Math.round(
    particlesConfig.particles.number.value * densityScale,
  );

  if (nextDensity === currentParticleDensity) {
    return;
  }

  currentParticleDensity = nextDensity;
  particleInstance.particles.number.value = nextDensity;
  particleInstance.fn.vendors.densityAutoParticles();
};

const queueParticleDensityUpdate = () => {
  if (particleDensityFrame !== null) {
    return;
  }

  particleDensityFrame = window.requestAnimationFrame(updateParticleDensity);
};

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
    particleFadeEnd = aboutPanelRect.bottom + window.scrollY;
  }

  if (particleFadeEnd !== null) {
    stage.style.setProperty("--particle-fade-end", `${particleFadeEnd}px`);
    stage.style.setProperty("--particle-field-height", `${particleFadeEnd}px`);
    queueParticleDensityUpdate();
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

const renderArticleMath = () => {
  document.querySelectorAll(".article-math, .article-equation").forEach((node) => {
    const tex = node.dataset.tex;

    if (!tex) {
      return;
    }

    katex.render(tex, node, {
      displayMode:
        node.dataset.display === "true" ||
        node.classList.contains("article-equation"),
      throwOnError: false,
      strict: "warn",
    });
  });
};

const setArticleScrollMorphProgress = (morph, progress) => {
  const chatPanel = morph.querySelector("[data-article-morph-chat]");
  const tokenPanel = morph.querySelector("[data-article-morph-tokens]");

  if (!chatPanel || !tokenPanel) {
    return;
  }

  const state = progress > 0.62 ? "tokens" : "chat";

  morph.style.setProperty("--article-token-progress", progress.toFixed(3));
  morph.dataset.morphState = state;
  chatPanel.setAttribute("aria-hidden", String(state === "tokens"));
  tokenPanel.setAttribute("aria-hidden", String(state === "chat"));

  morph
    .querySelectorAll("[data-article-morph-view]")
    .forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.articleMorphView === state),
      );
    });
};

const updateArticleScrollMorphs = () => {
  articleScrollMorphFrame = null;

  document.querySelectorAll("[data-article-scroll-morph]").forEach((morph) => {
    const stage = morph.querySelector(".article-scroll-morph-stage");

    if (!stage) {
      return;
    }

    const morphRect = morph.getBoundingClientRect();
    const morphStart = window.innerHeight * 0.28;
    const morphEnd = window.innerHeight * 0.18;
    const morphRange = Math.max(1, morphStart - morphEnd);
    const progress = reduceMotion
      ? 0
      : Math.min(1, Math.max(0, (morphStart - morphRect.top) / morphRange));

    setArticleScrollMorphProgress(morph, progress);
  });
};

const queueArticleScrollMorphUpdate = () => {
  if (articleScrollMorphFrame !== null) {
    return;
  }

  articleScrollMorphFrame = window.requestAnimationFrame(updateArticleScrollMorphs);
};

const initializeArticleScrollMorphs = () => {
  updateArticleScrollMorphs();

  document.querySelectorAll("[data-article-morph-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const morph = button.closest("[data-article-scroll-morph]");
      const progress = button.dataset.articleMorphView === "tokens" ? 1 : 0;

      if (morph) {
        setArticleScrollMorphProgress(morph, progress);
      }
    });
  });

  document.querySelectorAll(".article-overlay").forEach((overlay) => {
    overlay.addEventListener("scroll", queueArticleScrollMorphUpdate, {
      passive: true,
    });
  });
};

const initializeWritingNotifyForms = () => {
  document.querySelectorAll("[data-writing-notify-form]").forEach((form) => {
    const input = form.querySelector("input[type='email']");
    const status = form.querySelector("[data-writing-notify-status]");
    const button = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!input?.checkValidity()) {
        input?.reportValidity();
        return;
      }

      const email = input.value.trim();
      const source = form.classList.contains("article-notify")
        ? "article"
        : "writing";

      if (status) {
        status.textContent = "Saving...";
      }

      if (button) {
        button.disabled = true;
      }

      try {
        const response = await fetch("/api/writing-subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, source }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({
            message:
              response.status === 404
                ? "Signup endpoint unavailable. Run with Vercel or deploy first."
                : "Could not save your email right now.",
          }));
          throw new Error(result.message);
        }

        if (status) {
          status.textContent = "Thanks, see you soon :)";
        }

        form.reset();
      } catch (error) {
        if (status) {
          status.textContent =
            error instanceof Error
              ? error.message
              : "Could not save your email right now.";
        }
      } finally {
        if (button) {
          button.disabled = false;
        }
      }
    });
  });
};

const articleWindows = [
  {
    hash: "#but-how-does-the-llm-predict-the-next-token",
    openerSelector:
      '[data-article-open="but-how-does-the-llm-predict-the-next-token"]',
    overlay: document.querySelector(
      '[data-article-overlay="but-how-does-the-llm-predict-the-next-token"]',
    ),
  },
];

const getArticleParticleCount = () => {
  const referenceArea = 1440 * 900;
  const viewportScale = Math.sqrt(
    (window.innerWidth * window.innerHeight) / referenceArea,
  );

  return Math.min(333, Math.max(109, Math.round(141 * viewportScale)));
};

const articleParticlesConfig = {
  ...particlesConfig,
  particles: {
    ...particlesConfig.particles,
    number: {
      ...particlesConfig.particles.number,
      value: 141,
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

const updateArticleParticleDensity = () => {
  const nextCount = getArticleParticleCount();

  window.pJSDom?.forEach(({ pJS }) => {
    if (!pJS.canvas.el.parentElement?.matches("[data-article-particles]")) {
      return;
    }

    const currentCount = pJS.particles.array.length;
    pJS.particles.number.value = nextCount;

    if (currentCount < nextCount) {
      pJS.fn.modes.pushParticles(nextCount - currentCount);
    } else if (currentCount > nextCount) {
      pJS.fn.modes.removeParticles(currentCount - nextCount);
    }
  });
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
        window.particlesJS(id, {
          ...articleParticlesConfig,
          particles: {
            ...articleParticlesConfig.particles,
            number: {
              ...articleParticlesConfig.particles.number,
              value: getArticleParticleCount(),
            },
          },
        });
      }
      container.dataset.particlesInitialized = "true";
    });
};

const centerAttentionScrolls = (root = document) => {
  root.querySelectorAll(".article-attention-scroll").forEach((scroller) => {
    scroller.scrollLeft = Math.max(
      0,
      (scroller.scrollWidth - scroller.clientWidth) / 2,
    );
  });
};

const hideArticle = () => {
  articleWindows.forEach((articleWindow) => {
    if (articleWindow.overlay) {
      articleWindow.overlay.hidden = true;
    }
  });
  document.documentElement.classList.remove("article-open");
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
  queueArticleScrollMorphUpdate();
  window.requestAnimationFrame(() => {
    centerAttentionScrolls(targetWindow.overlay);
  });
  document.documentElement.classList.add("article-open");
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

renderArticleMath();
initializeArticleScrollMorphs();
initializeWritingNotifyForms();
initializeTimelineDisclosures();
updateEditorLineNumbers();
updateParticleStageHeight();
window.addEventListener("resize", updateParticleStageHeightOnLayoutResize);
window.addEventListener("resize", updateArticleParticleDensity);
window.addEventListener("resize", queueArticleScrollMorphUpdate);
window.addEventListener("scroll", queueParticleDensityUpdate, { passive: true });
window.addEventListener("scroll", queueArticleScrollMorphUpdate, { passive: true });
window.addEventListener("load", () => {
  updateEditorLineNumbers();
  updateParticleStageHeight();
  updateArticleScrollMorphs();
  centerAttentionScrolls();
});

if (!reduceMotion && typeof window.particlesJS === "function") {
  window.particlesJS("particles-js", particlesConfig);
  queueParticleDensityUpdate();
}
