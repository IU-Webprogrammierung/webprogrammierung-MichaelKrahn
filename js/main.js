gsap.registerPlugin(ScrollTrigger);

/* =====================================================
   SCROLL TO TOP ON RELOAD
===================================================== */
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);


/* =====================================================
   CUSTOM CURSOR
===================================================== */
const dot = document.querySelector('.cursor-dot');
const outline = document.querySelector('.cursor-outline');

window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;

    // Dot moves instantly
    dot.style.left = `${posX}px`;
    dot.style.top = `${posY}px`;

    // Outline moves with a slight delay (animation logic)
    outline.animate({
        left: `${posX}px`,
        top: `${posY}px`
    }, { duration: 500, fill: "forwards" });
});



/* =====================================================
   HERO HEADER COLLAPSE
===================================================== */
initHeroCollapse();

function initHeroCollapse() {
  const header = document.querySelector("#siteHeader");
  const nav = document.querySelector(".navbar");
  if (!header || !nav) return;

  // Reset
  document.body.classList.remove("dark-mode");
  nav.classList.remove("is-sticky");
  gsap.set(nav, { y: 0, scale: 1 });
  gsap.set(".hero-center", { autoAlpha: 1, y: 0 });
  gsap.set(".hero-portrait", { autoAlpha: 1, x: 0 });
  ScrollTrigger.create({
    trigger: header,
    start: "top top",
    end: "bottom top", // hero fully scrolled away
    scrub: true,

    onUpdate: (self) => {
      const p = self.progress;

      /* ===== visual collapse ===== */
      gsap.to(nav, {
        y: gsap.utils.interpolate(0, -220, p),
        scale: gsap.utils.interpolate(1, 0.92, p),
        overwrite: true
      });

      gsap.to(".hero-center", {
        autoAlpha: 1 - p * 1.4,
        y: -80 * p,
        overwrite: true
      });

      gsap.to(".hero-portrait", {
        autoAlpha: 1 - p * 1.2,
        x: 60 * p,
        overwrite: true
      });

      /* ===== sticky navbar switch ===== */
      if (p > 0.95) {
        nav.classList.add("is-sticky");
      } else {
        nav.classList.remove("is-sticky");
      }
    }
  });
}