const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

let backgroundWidth = window.innerWidth;
let articleScrollMorphFrame = null;
let articleScrollbarFrame = null;
let articleMathModulePromise = null;

const updateBackgroundHeight = () => {
  const background = document.querySelector("#site-background");
  const footer = document.querySelector(".site-footer");

  if (!background) {
    return;
  }

  const footerHeight = footer?.offsetHeight ?? 0;
  background.style.height = `${document.documentElement.scrollHeight - footerHeight}px`;
};

const backgroundDotSpacing = 20;
const backgroundAccentTileCells = 100;
const backgroundAccentDotRatio = 1 / 175;

// Tint a random scattering of background grid dots with the accent color.
const initializeBackgroundAccentDots = () => {
  const tileSize = backgroundDotSpacing * backgroundAccentTileCells;
  const circles = [];

  for (let row = 0; row < backgroundAccentTileCells; row += 1) {
    for (let column = 0; column < backgroundAccentTileCells; column += 1) {
      if (Math.random() >= backgroundAccentDotRatio) {
        continue;
      }

      const x = column * backgroundDotSpacing + backgroundDotSpacing / 2;
      const y = row * backgroundDotSpacing + backgroundDotSpacing / 2;
      circles.push(`<circle cx="${x}" cy="${y}" r="1"/>`);
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}">` +
    `<g fill="rgb(208, 111, 255)" fill-opacity="0.6">${circles.join("")}</g></svg>`;
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty(
    "--background-dot-accent",
    `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
  );
  rootStyle.setProperty("--background-dot-accent-size", `${tileSize}px ${tileSize}px`);
};

const mouseTrailRadius = 34;
const mouseTrailFadeMs = 500;
const touchTrailRadius = 56;
const touchTrailFadeMs = 800;
const dotTrailEmptyMask = "linear-gradient(transparent, transparent)";

// Reveal a purple copy of the dot grid along the mouse or finger path and let
// it fade. The copy shares the background's box, so only existing grid dots
// light up.
const initializeBackgroundDotTrail = () => {
  const background = document.querySelector("#site-background");

  if (!background || reduceMotion) {
    return;
  }

  const trail = document.createElement("div");
  trail.className = "background-dot-trail";
  trail.setAttribute("aria-hidden", "true");
  background.append(trail);

  // Fading spots, keyed by grid cell so a path never stacks up.
  const spots = new Map();
  let lastMouse = null;
  let lastTouch = null;
  let trailFrame = null;

  const setMask = (mask) => {
    trail.style.maskImage = mask;
    trail.style.webkitMaskImage = mask;
  };

  const drawTrail = () => {
    trailFrame = null;

    const now = performance.now();
    const circles = [];

    spots.forEach((spot, key) => {
      const opacity = 1 - (now - spot.time) / spot.fadeMs;

      if (opacity <= 0) {
        spots.delete(key);
        return;
      }

      circles.push(
        `<circle cx="${spot.x}" cy="${spot.y}" r="${spot.radius}" opacity="${opacity.toFixed(3)}"/>`,
      );
    });

    if (circles.length === 0) {
      setMask(dotTrailEmptyMask);
      return;
    }

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${background.offsetWidth}" height="${background.offsetHeight}">` +
      `<defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
      `<g fill="url(#g)">${circles.join("")}</g></svg>`;

    setMask(`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
    trailFrame = window.requestAnimationFrame(drawTrail);
  };

  // Light the path from the previous point to this one and return the new point.
  const tracePath = (from, clientX, clientY, radius, fadeMs) => {
    if (document.documentElement.classList.contains("article-open")) {
      return null;
    }

    const origin = background.getBoundingClientRect();
    const pointer = {
      x: Math.round(clientX - origin.left),
      y: Math.round(clientY - origin.top),
    };
    const start = from ?? pointer;
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(pointer.x - start.x, pointer.y - start.y) / (backgroundDotSpacing / 2)),
    );
    const now = performance.now();

    // Fill in the gaps left by fast movement.
    for (let step = 1; step <= steps; step += 1) {
      const x = Math.round(start.x + ((pointer.x - start.x) * step) / steps);
      const y = Math.round(start.y + ((pointer.y - start.y) * step) / steps);
      const key = `${Math.floor(x / backgroundDotSpacing)},${Math.floor(y / backgroundDotSpacing)}`;

      spots.set(key, { x, y, radius, time: now, fadeMs });
    }

    trailFrame ??= window.requestAnimationFrame(drawTrail);
    return pointer;
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      // Touches are traced through touch events, which keep firing while scrolling.
      if (event.pointerType === "mouse") {
        lastMouse = tracePath(
          lastMouse,
          event.clientX,
          event.clientY,
          mouseTrailRadius,
          mouseTrailFadeMs,
        );
      }
    },
    { passive: true },
  );
  const endMouseTrail = () => {
    lastMouse = null;
  };

  document.addEventListener("pointerleave", endMouseTrail);
  // Scrolling moves the page under a still cursor, so start a fresh path
  // instead of joining the old and new positions.
  window.addEventListener("scroll", endMouseTrail, { passive: true });

  const traceTouch = (event) => {
    const touch = event.touches[0];
    lastTouch = touch
      ? tracePath(lastTouch, touch.clientX, touch.clientY, touchTrailRadius, touchTrailFadeMs)
      : null;
  };

  const endTouch = () => {
    lastTouch = null;
  };

  window.addEventListener(
    "touchstart",
    (event) => {
      endTouch();
      traceTouch(event);
    },
    { passive: true },
  );
  window.addEventListener("touchmove", traceTouch, { passive: true });
  window.addEventListener("touchend", endTouch, { passive: true });
  window.addEventListener("touchcancel", endTouch, { passive: true });

  setMask(dotTrailEmptyMask);
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

const updateBackgroundHeightOnLayoutResize = () => {
  if (window.innerWidth === backgroundWidth) {
    return;
  }

  backgroundWidth = window.innerWidth;
  updateEditorLineNumbers();
  updateBackgroundHeight();
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

const renderArticleMath = async (root) => {
  const nodes = Array.from(
    root.querySelectorAll(
      ".article-math:not([data-math-rendered]), .article-equation:not([data-math-rendered])",
    ),
  );

  if (nodes.length === 0) {
    return;
  }

  articleMathModulePromise ??= Promise.all([
    import("katex"),
    import("katex/dist/katex.min.css"),
  ]).then(([{ default: katex }]) => katex);

  try {
    const katex = await articleMathModulePromise;

    nodes.forEach((node) => {
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
      node.dataset.mathRendered = "true";
    });
  } catch (error) {
    console.error("Unable to load article math.", error);
  }
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
  if (
    articleScrollMorphFrame !== null ||
    !document.querySelector(".article-overlay:not([hidden])")
  ) {
    return;
  }

  articleScrollMorphFrame = window.requestAnimationFrame(updateArticleScrollMorphs);
};

const updateArticleScrollbar = () => {
  articleScrollbarFrame = null;

  document.querySelectorAll(".article-overlay").forEach((overlay) => {
    if (overlay.hidden) {
      return;
    }

    const scrollbarInset = 12;
    const scrollbarHeight = Math.max(1, overlay.clientHeight - scrollbarInset * 2);
    const scrollableHeight = Math.max(0, overlay.scrollHeight - overlay.clientHeight);
    const thumbHeight = Math.max(
      48,
      Math.round((overlay.clientHeight / overlay.scrollHeight) * scrollbarHeight),
    );
    const thumbTravel = Math.max(0, scrollbarHeight - thumbHeight);
    const thumbTop =
      scrollableHeight === 0
        ? 0
        : Math.round((overlay.scrollTop / scrollableHeight) * thumbTravel);

    overlay.style.setProperty(
      "--article-mobile-scrollbar-thumb-height",
      `${thumbHeight}px`,
    );
    overlay.style.setProperty("--article-mobile-scrollbar-top", `${thumbTop}px`);
  });
};

const queueArticleScrollbarUpdate = () => {
  if (articleScrollbarFrame !== null) {
    return;
  }

  articleScrollbarFrame = window.requestAnimationFrame(updateArticleScrollbar);
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
    overlay.addEventListener("scroll", queueArticleScrollbarUpdate, {
      passive: true,
    });
  });
};

const articleWindows = [
  {
    hash: "#unaligning-qwen3-8-27b-with-reinforcement-learning",
    openerSelector: '[data-article-open="unaligning-qwen3-8-27b-with-reinforcement-learning"]',
    overlay: document.querySelector('[data-article-overlay="unaligning-qwen3-8-27b-with-reinforcement-learning"]'),
  },
  {
    hash: "#finetuning-qwen3-32b-to-text-like-me",
    openerSelector:
      '[data-article-open="finetuning-qwen3-32b-to-text-like-me"]',
    overlay: document.querySelector(
      '[data-article-overlay="finetuning-qwen3-32b-to-text-like-me"]',
    ),
  },
  {
    hash: "#but-how-does-the-llm-predict-the-next-token",
    openerSelector:
      '[data-article-open="but-how-does-the-llm-predict-the-next-token"]',
    overlay: document.querySelector(
      '[data-article-overlay="but-how-does-the-llm-predict-the-next-token"]',
    ),
  },
  {
    hash: "#the-state-of-competitive-ml",
    openerSelector: '[data-article-open="the-state-of-competitive-ml"]',
    overlay: document.querySelector(
      '[data-article-overlay="the-state-of-competitive-ml"]',
    ),
  },
  {
    hash: "#a-case-for-lacto-vegetarianism",
    openerSelector: '[data-article-open="a-case-for-lacto-vegetarianism"]',
    overlay: document.querySelector(
      '[data-article-overlay="a-case-for-lacto-vegetarianism"]',
    ),
  },
];

const initializeTimelineDisclosures = () => {
  document
    .querySelectorAll("[data-about-overlay] .timeline-item:not(.timeline-item-static)")
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
  void renderArticleMath(targetWindow.overlay);
  queueArticleScrollMorphUpdate();
  queueArticleScrollbarUpdate();
  window.requestAnimationFrame(() => {
    centerAttentionScrolls(targetWindow.overlay);
    updateArticleScrollbar();
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

document.querySelectorAll("[data-article-reference]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
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

initializeBackgroundAccentDots();
initializeBackgroundDotTrail();
initializeArticleScrollMorphs();
initializeTimelineDisclosures();
updateEditorLineNumbers();
updateBackgroundHeight();
window.addEventListener("resize", updateBackgroundHeightOnLayoutResize);
window.addEventListener("resize", queueArticleScrollMorphUpdate);
window.addEventListener("resize", queueArticleScrollbarUpdate);
window.addEventListener("scroll", queueArticleScrollMorphUpdate, { passive: true });
window.addEventListener("load", () => {
  updateEditorLineNumbers();
  updateBackgroundHeight();
  updateArticleScrollMorphs();
  updateArticleScrollbar();
  centerAttentionScrolls();
});
