/* =========================================
   PROJECTS
========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const cards = Array.from(document.querySelectorAll('.project-card'));
    
    // Store timeouts so we can cancel them if the user hovers quickly
    const typingTimeouts = {}; 

    // Initial Sort
    updateStack(cards);

    cards.forEach(card => {
        // 1. CLICK: Sort Logic
        card.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            
            // Only shuffle if it's not already in front
            if (index !== 0) {
                // Move elements in the array to bring clicked one to front
                for (let i = 0; i < index; i++) {
                    cards.push(cards.shift());
                }
                updateStack(cards);
            }
        });

        // 2. HOVER: Typing Logic (Restart every time)
        card.addEventListener('mouseenter', function() {
            const cardId = this.id;
            const textEl = this.querySelector('.typing-text');
            const url = this.getAttribute('data-url');
            
            // Clear any existing animation for this card
            if (typingTimeouts[cardId]) {
                clearTimeout(typingTimeouts[cardId]);
            }
            
            // Reset text
            textEl.innerHTML = "";
            
            // Start typing
            typeUrl(cardId, textEl, url, 0);
        });
    });

    function updateStack(cardArray) {
        cardArray.forEach((card, index) => {
            // We set the CSS variable --i which drives the transform
            card.style.setProperty('--i', index);
            
            // We also update data-index for logic
            card.setAttribute('data-index', index);
            
            // Clear text when card goes to background
            if (index !== 0) {
                 const cardId = card.id;
                 if (typingTimeouts[cardId]) clearTimeout(typingTimeouts[cardId]);
                 card.querySelector('.typing-text').innerHTML = "";
            }
        });
    }

    function typeUrl(cardId, targetElement, text, charIndex) {
        if (charIndex < text.length) {
            targetElement.innerHTML += text.charAt(charIndex);
            // Save the timeout ID so we can stop it if needed
            typingTimeouts[cardId] = setTimeout(() => {
                typeUrl(cardId, targetElement, text, charIndex + 1);
            }, 50); // Speed of typing
        }
    }
});