const cards = document.querySelectorAll(".project-card");

cards.forEach(card => {
  card.addEventListener("mouseenter", () => {
    const other = [...cards].filter(c => c !== card);

    gsap.to(card, {
      scale: 1.15,
      x: 0,
      zIndex: 10,
      duration: 0.6,
      ease: "power3.out"
    });

    gsap.to(other, {
      scale: 0.9,
      x: index => index === 0 ? -120 : 120,
      filter: "brightness(0.6) blur(2px)",
      duration: 0.6,
      ease: "power3.out"
    });
  });

  card.addEventListener("mouseleave", () => {
    gsap.to(cards, {
      scale: 1,
      x: 0,
      filter: "brightness(1)",
      zIndex: 1,
      duration: 0.6,
      ease: "power3.out"
    });
  });
});


// Scroll Animations

gsap.registerPlugin(ScrollTrigger);

const clouds = gsap.utils.toArray(".cloud");

gsap.to(clouds, {
  scrollTrigger: {
    trigger: "#cloudScene",
    start: "top center",
    end: "bottom center",
    scrub: true
  },
  x: (i) => i % 2 === 0 ? -600 : 600,
  y: -120,
  opacity: 0.4,
  ease: "power2.out"
});

// Globe reveal
gsap.to(".globe-wrapper", {
  scrollTrigger:{
    trigger:"#cloudScene",
    start:"top center",
    scrub:true
  },
  opacity: 1,
  scale: 1,
  ease:"power2.out"
});

//gsap.to(".c1", { x:-500, scrollTrigger:{...} });
//gsap.to(".c2", { x:-700, scrollTrigger:{...} });
//gsap.to(".c3", { x:600, scrollTrigger:{...} });
//gsap.to(".c4", { x:800, scrollTrigger:{...} });
