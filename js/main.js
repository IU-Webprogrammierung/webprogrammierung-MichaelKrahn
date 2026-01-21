gsap.registerPlugin(ScrollTrigger);

/* =====================================================
   PROJECT SECTION
===================================================== */
const cards = [...document.querySelectorAll(".project-card")];

cards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    const isLeft = cards.indexOf(card) === 0;
    const other = cards.find(c => c !== card);

    gsap.to(card, {
      x: isLeft ? 160 : -160,
      scale: 1.2,
      zIndex: 10,
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto"
    });

    gsap.to(other, {
      x: isLeft ? -260 : 260,
      scale: 0.88,
      filter: "brightness(0.6) blur(2px)",
      zIndex: 1,
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto"
    });
  });

  card.addEventListener("mouseleave", () => {
    gsap.to(cards, {
      x: 0,
      scale: 1,
      filter: "brightness(1) blur(0px)",
      zIndex: 1,
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto"
    });
  });
});




/* =====================================================
   SCROLL TO TOP ON RELOAD
===================================================== */
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);



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