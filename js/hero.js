// Wrap everything in this listener
document.addEventListener("DOMContentLoaded", (event) => {
  
  gsap.registerPlugin(ScrollTrigger);

  /* =====================================================
     SCROLL TO TOP
  ===================================================== */
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);

  /* =====================================================
     HERO HEADER COLLAPSE
  ===================================================== */
  const hero = document.querySelector("#hero");
  
  if (hero) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero, 
          start: "top top", 
          end: "bottom top", 
          scrub: true 
        }
      });

      tl.to(".hero-center", {
        autoAlpha: 0,
        y: -100,
        ease: "none"
      }, 0);

      tl.to(".hero-portrait", {
        autoAlpha: 0,
        x: 200,
        ease: "none"
      }, 0);
  } else {
      console.error("GSAP Error: #hero section not found.");
  }

});