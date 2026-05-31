import "./particles.js";
import particlesConfig from "./particles-config.js";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const goHome = () => {
  window.location.href = "/";
};

const windows = [
  {
    hash: "#about",
    openerSelector: "[data-about-open]",
    overlay: document.querySelector("[data-about-overlay]"),
  },
  {
    hash: "#writing",
    openerSelector: "[data-writing-open]",
    overlay: document.querySelector("[data-writing-overlay]"),
  },
  {
    hash: "#writing-entry-1",
    openerSelector: '[data-article-open="writing-entry-1"]',
    overlay: document.querySelector('[data-article-overlay="writing-entry-1"]'),
  },
].map((windowState) => ({
  ...windowState,
  panel: windowState.overlay?.querySelector(".about-panel, .article-shell"),
}));

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

const initializeArticleParticles = (windowState) => {
  if (!windowState?.overlay || !windowState.hash?.startsWith("#writing-entry-")) {
    return;
  }

  windowState.overlay
    .querySelectorAll("[data-article-particles]")
    .forEach((container, index) => {
      if (container.dataset.particlesInitialized === "true") {
        return;
      }

      const id = container.id || `article-particles-${windowState.hash.slice(1)}-${index + 1}`;
      container.id = id;
      if (typeof window.particlesJS === "function") {
        window.particlesJS(id, articleParticlesConfig);
      }
      container.dataset.particlesInitialized = "true";
    });
};

const visibleWindows = () =>
  windows.filter(({ overlay }) => overlay && !overlay.hidden);

const syncBodyState = () => {
  document.body.classList.toggle("about-open", visibleWindows().length > 0);
};

const clearPanelState = (panel) => {
  panel?.classList.remove("about-panel-minimizing");
  panel?.removeAttribute("data-minimizing");
};

const clearWindowHash = (hash) => {
  if (window.location.hash === hash) {
    window.history.pushState(null, "", window.location.pathname);
  }
};

const hideWindow = (windowState, { updateHash = true } = {}) => {
  if (!windowState?.overlay) {
    return;
  }

  windowState.overlay.hidden = true;
  clearPanelState(windowState.panel);
  syncBodyState();

  if (updateHash) {
    clearWindowHash(windowState.hash);
  }
};

const hideAllWindows = ({ updateHash = true } = {}) => {
  windows.forEach((windowState) => {
    if (!windowState.overlay) {
      return;
    }

    windowState.overlay.hidden = true;
    clearPanelState(windowState.panel);
  });

  syncBodyState();

  if (updateHash && windows.some(({ hash }) => hash === window.location.hash)) {
    window.history.pushState(null, "", window.location.pathname);
  }
};

const showWindow = (targetWindow, { updateHash = true } = {}) => {
  if (!targetWindow?.overlay) {
    return;
  }

  windows.forEach((windowState) => {
    if (windowState !== targetWindow) {
      hideWindow(windowState, { updateHash: false });
    }
  });

  targetWindow.overlay.hidden = false;
  clearPanelState(targetWindow.panel);
  syncBodyState();
  initializeArticleParticles(targetWindow);

  if (updateHash && window.location.hash !== targetWindow.hash) {
    window.history.pushState(null, "", targetWindow.hash);
  }
};

windows.forEach((windowState) => {
  document.querySelectorAll(windowState.openerSelector).forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showWindow(windowState);
    });
  });
});

document.querySelectorAll("[data-window-target]").forEach((control) => {
  control.addEventListener("click", (event) => {
    const targetHash = control.getAttribute("data-window-target");
    const targetWindow = windows.find(({ hash }) => hash === targetHash);

    if (!targetWindow) {
      return;
    }

    event.preventDefault();
    showWindow(targetWindow);
  });
});

document.querySelectorAll("[data-window-close]").forEach((control) => {
  control.addEventListener("click", (event) => {
    const windowState = windows.find(({ overlay }) => overlay?.contains(control));

    if (windowState) {
      event.preventDefault();
      hideWindow(windowState);
      return;
    }

    goHome();
  });
});

document.querySelectorAll("[data-window-minimize]").forEach((control) => {
  control.addEventListener("click", () => {
    const windowState = windows.find(({ overlay }) => overlay?.contains(control));
    const panel = windowState?.panel ?? document.querySelector(".about-panel");
    const finishMinimize = windowState ? () => hideWindow(windowState) : goHome;

    if (!panel || panel.dataset.minimizing === "true" || reduceMotion) {
      finishMinimize();
      return;
    }

    panel.dataset.minimizing = "true";
    panel.classList.add("about-panel-minimizing");

    panel.addEventListener("animationend", finishMinimize, { once: true });
  });
});

let zoomHoverCount = 0;

document.querySelectorAll(".window-control-zoom").forEach((control) => {
  control.addEventListener("mouseenter", () => {
    zoomHoverCount += 1;

    if (zoomHoverCount !== 3) {
      return;
    }

    const panel = control.closest(".about-panel");

    if (!panel || panel.querySelector(".zoom-hover-note")) {
      return;
    }

    const note = document.createElement("div");
    note.className = "zoom-hover-note";
    note.innerHTML = `
      <p>The sizing is totally adequate already ;)</p>
      <button class="zoom-hover-note-close" type="button" aria-label="Dismiss note"></button>
    `;
    panel.append(note);

    note
      .querySelector(".zoom-hover-note-close")
      ?.addEventListener("click", () => note.remove());
  });
});

window.addEventListener("popstate", () => {
  const windowState = windows.find(
    ({ hash, overlay }) => overlay && hash === window.location.hash,
  );

  if (windowState) {
    showWindow(windowState, { updateHash: false });
    return;
  }

  hideAllWindows({ updateHash: false });
});

const initialWindow = windows.find(
  ({ hash, overlay }) => overlay && hash === window.location.hash,
);

if (initialWindow) {
  showWindow(initialWindow, { updateHash: false });
}

if (!reduceMotion && typeof window.particlesJS === "function") {
  window.particlesJS("particles-js", particlesConfig);
}
