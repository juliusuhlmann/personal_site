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
const backgroundAccentDotRatio = 1 / 140;

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

const cursorTrailRadius = 34;
const cursorTrailEmptyMask = "linear-gradient(transparent, transparent)";

// Reveal a purple copy of the dot grid wherever the mouse has been.
// The copy shares the background's box, so only existing grid dots light up.
const initializeBackgroundCursorTrail = () => {
  const background = document.querySelector("#site-background");

  if (!background || reduceMotion) {
    return;
  }

  const trail = document.createElement("div");
  trail.className = "background-cursor-trail";
  trail.setAttribute("aria-hidden", "true");
  background.append(trail);

  const visitedCells = new Map();
  let lastPointer = null;
  let trailFrame = null;

  const setMask = (mask) => {
    trail.style.maskImage = mask;
    trail.style.webkitMaskImage = mask;
  };

  const drawTrail = () => {
    trailFrame = null;

    const width = background.offsetWidth;
    const height = background.offsetHeight;
    const circles = [...visitedCells.values()]
      .map(({ x, y }) => `<circle cx="${x}" cy="${y}" r="${cursorTrailRadius}"/>`)
      .join("");
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<defs><radialGradient id="g"><stop offset="0" stop-color="#fff"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
      `<g fill="url(#g)">${circles}</g></svg>`;

    setMask(`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
  };

  const visit = (x, y) => {
    const column = Math.floor(x / backgroundDotSpacing);
    const row = Math.floor(y / backgroundDotSpacing);
    const key = `${column},${row}`;

    if (visitedCells.has(key)) {
      return false;
    }

    visitedCells.set(key, { x, y });
    return true;
  };

  const trace = (clientX, clientY) => {
    if (document.documentElement.classList.contains("article-open")) {
      lastPointer = null;
      return;
    }

    const origin = background.getBoundingClientRect();
    const pointer = {
      x: Math.round(clientX - origin.left),
      y: Math.round(clientY - origin.top),
    };

    // Fill in the gaps left by fast movement.
    const from = lastPointer ?? pointer;
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(pointer.x - from.x, pointer.y - from.y) / (backgroundDotSpacing / 2)),
    );
    let changed = false;

    for (let step = 1; step <= steps; step += 1) {
      changed =
        visit(
          Math.round(from.x + ((pointer.x - from.x) * step) / steps),
          Math.round(from.y + ((pointer.y - from.y) * step) / steps),
        ) || changed;
    }

    lastPointer = pointer;

    if (changed) {
      trailFrame ??= window.requestAnimationFrame(drawTrail);
    }
  };

  const traceTouch = (event) => {
    const touch = event.touches[0];

    if (touch) {
      trace(touch.clientX, touch.clientY);
    }
  };

  const endTrace = () => {
    lastPointer = null;
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      // Touches are traced through touch events, which keep firing while scrolling.
      if (event.pointerType === "mouse") {
        trace(event.clientX, event.clientY);
      }
    },
    { passive: true },
  );
  window.addEventListener(
    "touchstart",
    (event) => {
      endTrace();
      traceTouch(event);
    },
    { passive: true },
  );
  window.addEventListener("touchmove", traceTouch, { passive: true });
  window.addEventListener("touchend", endTrace, { passive: true });
  window.addEventListener("touchcancel", endTrace, { passive: true });
  document.addEventListener("pointerleave", endTrace);
  setMask(cursorTrailEmptyMask);
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
initializeBackgroundCursorTrail();
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
