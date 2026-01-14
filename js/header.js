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
