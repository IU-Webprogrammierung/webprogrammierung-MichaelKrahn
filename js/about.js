/* =====================================================
   ABOUT SECTION
===================================================== */

document.addEventListener("DOMContentLoaded", (event) => {
  
    //gsap.registerPlugin(ScrollTrigger);

    gsap.from("#about .about-wrap", {
    scrollTrigger: {
        trigger: "#about",
        start: "top 75%",
        toggleActions: "play none none reverse"
    },
    y: 18,
    opacity: 0.2,
    duration: 0.7,
    ease: "power2.out"
    });

    gsap.from("#about .about-text p", {
    scrollTrigger: {
        trigger: "#about",
        start: "top 75%",
        toggleActions: "play none none reverse"
    },
    y: 10,
    opacity: 0.8,
    duration: 0.55,
    stagger: 0.08,
    ease: "power2.out"
    });

    gsap.from("#about .about-card", {
    scrollTrigger: {
        trigger: "#about",
        start: "top 75%",
        toggleActions: "play none none reverse"
    },
    y: 12,
    opacity: 0.6,
    duration: 0.6,
    stagger: 0.10,
    ease: "power2.out"
    });
});