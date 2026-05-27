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

const windows = [
  {
    hash: "#about",
    openerSelector: "[data-about-open]",
    overlay: document.querySelector("[data-about-overlay]"),
  },
  {
    hash: "#contact",
    openerSelector: "[data-contact-open]",
    overlay: document.querySelector("[data-contact-overlay]"),
  },
].map((windowState) => ({
  ...windowState,
  panel: windowState.overlay?.querySelector(".about-panel"),
}));

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
