/* =====================================================
   CLOUDS + GLOBE (CURTAIN REVEAL)
===================================================== */
const clouds = gsap.utils.toArray("#cloudScene .cloud");

const leftClouds = ["#cloudScene .c1", "#cloudScene .c2", "#cloudScene .c3"];
const rightClouds = ["#cloudScene .c6", "#cloudScene .c7", "#cloudScene .c8", "#cloudScene .c9"];
const midClouds = ["#cloudScene .c4", "#cloudScene .c5"];
const bottomClouds = ["#cloudScene .c10", "#cloudScene .c11", "#cloudScene .c12"];

gsap.timeline({
  scrollTrigger: {
    trigger: "#cloudScene",
    start: "top 70%",   /*when to start and end animation while scroll snap*/
    end: "top 0%",
    scrub: true,

    // Stop wobble while the curtain animation controls the positions
    onEnter:      () => stopCloudWobble(),
    onEnterBack:  () => stopCloudWobble(),

    // When we leave the curtain range, restart wobble
    // → wobble tweens are created from the NEW curtain positions
    onLeave:      () => startCloudWobble(),
    onLeaveBack:  () => startCloudWobble()
  }
})
  .to("#cloudScene .cloud-backdrop", { autoAlpha: 0.7 }, 0)
  .to("#cloudScene .globe-wrapper", { autoAlpha: 1, scale: 1, ease: "power2.out" }, 0.08)

  .to(leftClouds, {
    x: (i) => -220 - i * 110,
    y: 90,
    rotation: (i) => -2 - i,
    autoAlpha: 0.58,
    scale: 1.8,
    ease: "power2.out"
  }, 0)

  .to(rightClouds, {
    x: (i) => 220 + i * 110,
    y: 100,
    rotation: (i) => 2 + i,
    autoAlpha: 0.58,
    scale: 1.8,
    ease: "power2.out"
  }, 0)

  .to(midClouds, {
    y: -30,
    x: 0,
    autoAlpha: 0.70,
    scale: 1.4,
    ease: "power2.out"
  }, 0)

  .to(bottomClouds, {
    y: 300,
    x: (i) => 0,
    autoAlpha: 0.70,
    scale: 1.6,
    ease: "power2.out"
  }, 0);

// keep references to all wobble tweens
const wobbleTweens = [];

function startCloudWobble() {
  // avoid stacking multiple wobble sets
  if (wobbleTweens.length) return;

  const targets = gsap.utils.toArray("#cloudScene .cloud, #cloudScene .cloud-svg");
  if (!targets.length) return;

  targets.forEach((c, i) => {
    const t = gsap.to(c, {
      x: `+=${gsap.utils.random(-26, 26)}`,
      y: `+=${gsap.utils.random(-10, 10)}`,
      rotation: gsap.utils.random(-1.5, 1.5),
      duration: gsap.utils.random(6, 12),
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: i * 0.15
    });

    wobbleTweens.push(t);
  });
}

function stopCloudWobble() {
  wobbleTweens.forEach(t => t.kill());
  wobbleTweens.length = 0;
}

// start wobble by default when page loads
startCloudWobble();