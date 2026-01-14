gsap.registerPlugin(ScrollTrigger);

/* =====================================================
   PROJECT HOVER ANIMATIONS (UNCHANGED, SAFE)
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
   CLOUDS + GLOBE (SAFE)
===================================================== */
const clouds = gsap.utils.toArray("#cloudScene .cloud");

gsap.timeline({
  scrollTrigger: {
    trigger: "#cloudScene",
    start: "top 75%",
    end: "top 25%",
    scrub: true
  }
})
.to(".globe-wrapper", { autoAlpha: 1, scale: 1 }, 0)
.to(clouds, {
  x: i => i % 2 === 0 ? -500 : 500,
  y: -120,
  autoAlpha: 0.5
}, 0);


/* =====================================================
   TYPING EFFECT (SAFE)
===================================================== */
const text = "Hallo, ich bin Michael";
let index = 0;
const typingTarget = document.getElementById("typingText");

function typing() {
  if (index <= text.length) {
    typingTarget.textContent = text.slice(0, index);
    index++;
    setTimeout(typing, 80);
  }
}
typing();


/* =====================================================
   HERO HEADER COLLAPSE (SINGLE SOURCE OF TRUTH)
===================================================== */
ScrollTrigger.clearScrollMemory();
initHeroCollapse();

function initHeroCollapse() {
  const header = document.querySelector("#siteHeader");
  const nav = document.querySelector(".topbar");
  if (!header || !nav) return;

  // Threshold before anything happens
  const INTENT_PX = 90;

  // Collapse animation portion
  const COLLAPSE_DISTANCE = 320;

  // Extra distance to ensure hero is completely out of view after snap
  // Use a larger value than before; this is the main reason "background still visible".
  const EXIT_PADDING = window.innerHeight * 0.9;

  // When should we consider the collapse “committed”?
  // 0.3 means at least 30% of the timeline.
  const SNAP_THRESHOLD = 0.30;

  // Reset
  document.body.classList.remove("dark-mode");
  nav.classList.remove("is-sticky");
  gsap.set(nav, { y: 0, scale: 1 });
  gsap.set(".hero-center", { autoAlpha: 1, y: 0 });
  gsap.set(".hero-portrait", { autoAlpha: 1, x: 0 });

  gsap.timeline({
    scrollTrigger: {
      trigger: header,
      start: `top+=${INTENT_PX} top`,
      end: `+=${COLLAPSE_DISTANCE + EXIT_PADDING}`,
      scrub: true,
      pin: true,
      anticipatePin: 1,

      // Snapping that engages around 50% and feels immediate
      snap: {
        snapTo: (value) => (value < SNAP_THRESHOLD ? 0 : 1),
        duration: 0.30,
        ease: "power.inOut",
        delay: 0
      },

      onUpdate: (self) => {
        // Dark mode comes on once collapse is noticeably underway
        document.body.classList.toggle("dark-mode", self.progress > 0.12);
      },

      onLeave: () => {
        nav.classList.add("is-sticky");
        // Clear transforms so sticky CSS isn't offset by GSAP transforms
        gsap.set(nav, { clearProps: "transform" });
      },
      onEnterBack: () => {
        nav.classList.remove("is-sticky");
      }
    }
  })
  // The actual collapse animation happens early in the overall timeline
  // Because we extended end distance, we keep the motion near the beginning.
  .to(nav, { y: -220, scale: 0.92, ease: "power3.out" }, 0)
  .to(".hero-center", { autoAlpha: 0, y: -80, ease: "power2.out" }, 0)
  .to(".hero-portrait", { autoAlpha: 0, x: 60, ease: "power2.out" }, 0);
}
