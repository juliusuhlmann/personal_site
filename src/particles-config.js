const particlesConfig = {
  particles: {
    number: {
      value: 100,
      density: {
        enable: true,
        value_area: 900,
      },
    },
    color: {
      value: "#d9b4ef",
    },
    shape: {
      type: "polygon",
      stroke: {
        width: 0,
        color: "#000000",
      },
      polygon: {
        nb_sides: 6,
      },
    },
    opacity: {
      value: 0.52,
      random: false,
      anim: {
        enable: false,
      },
    },
    size: {
      value: 4.1,
      minimum: 2.3,
      random: true,
      anim: {
        enable: false,
      },
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: "#d9b4ef",
      opacity: 0.32,
      width: 1,
    },
    move: {
      enable: true,
      speed: 1.35,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "out",
      bounce: false,
      attract: {
        enable: false,
      },
    },
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: true,
        mode: "repulse",
      },
      onclick: {
        enable: true,
        mode: "push",
      },
      resize: true,
    },
    modes: {
      repulse: {
        distance: 115,
        duration: 0.35,
      },
      push: {
        particles_nb: 3,
      },
    },
  },
  retina_detect: true,
};

export default particlesConfig;
