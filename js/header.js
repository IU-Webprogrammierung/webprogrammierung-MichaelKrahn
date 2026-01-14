/* ========================
   TYPING EFFECT
======================== */

const text = "Hallo, ich bin Michael";
let index = 0;
const typingTarget = document.getElementById("typingText");

function typing() {
    if(index <= text.length){
        typingTarget.innerHTML = text.slice(0, index);
        index++;
        setTimeout(typing, 80);
    }
}
typing();

gsap.to(".header", {
  scrollTrigger: {
    trigger: "#hero",
    start: "top top",
    end: "120 top",
    scrub: true,
  },
  top: 18,
  left: "50%",
  xPercent: -50,
  yPercent: 0,
  borderRadius: 18,
});