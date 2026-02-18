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
     CUSTOM CURSOR
  ===================================================== */
  const dot = document.querySelector('.cursor-dot');
  const outline = document.querySelector('.cursor-outline');

  // SAFETY CHECK: Only run if cursor elements exist
  if (dot && outline) {
      // Use x/y for better performance instead of top/left
      gsap.set(dot, { xPercent: -50, yPercent: -50 });
      gsap.set(outline, { xPercent: -50, yPercent: -50 });

      const xTo = gsap.quickTo(outline, "x", { duration: 0.4, ease: "power3" });
      const yTo = gsap.quickTo(outline, "y", { duration: 0.4, ease: "power3" });

      window.addEventListener('mousemove', (e) => {
          gsap.set(dot, { x: e.clientX, y: e.clientY });
          xTo(e.clientX);
          yTo(e.clientY);
      });
  }

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