/* =========================================
   PROJECTS - Fully working iframe lazy-loading
========================================= */
document.addEventListener('DOMContentLoaded', () => {

    const cards = Array.from(document.querySelectorAll('.project-card'));
    const typingTimeouts = {};

    // =====================
    // Load iframe for front card only
    // =====================
    function loadFrontIframe() {
        // Find the card with --i == 0 (front)
        const frontCard = cards.find(card => parseInt(card.style.getPropertyValue('--i')) === 0);
        if (!frontCard) return;

        // Load iframe if not already loaded using getAttribute
        const iframe = frontCard.querySelector('iframe');
        if (iframe && !iframe.getAttribute('src')) {
            iframe.setAttribute('src', iframe.dataset.src);
        }

        // Unload all other iframes using removeAttribute
        cards.forEach(card => {
            if (card !== frontCard) {
                const otherIframe = card.querySelector('iframe');
                if (otherIframe && otherIframe.hasAttribute('src')) {
                    otherIframe.removeAttribute('src');
                }
            }
        });
    }
    // =====================
    // Update stack positions
    // =====================
    function updateStack(cardArray) {
        cardArray.forEach((card, index) => {
            card.style.setProperty('--i', index);
            card.setAttribute('data-index', index);

            // Clear typing text for background cards
            if (index !== 0) {
                const cardId = card.id;
                if (typingTimeouts[cardId]) clearTimeout(typingTimeouts[cardId]);
                card.querySelector('.typing-text').innerHTML = "";
            }
        });

        // Load iframe for front card
        loadFrontIframe();
    }

    // =====================
    // Typing animation
    // =====================
    function typeUrl(cardId, targetElement, text, charIndex) {
        if (charIndex < text.length) {
            targetElement.innerHTML += text.charAt(charIndex);
            typingTimeouts[cardId] = setTimeout(() => {
                typeUrl(cardId, targetElement, text, charIndex + 1);
            }, 50);
        }
    }

    // =====================
    // Initial load
    // =====================
    updateStack(cards);

    // =====================
    // Click & Hover handlers
    // =====================
    cards.forEach(card => {

        // Click -> bring card to front
        card.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-index'));
            if (index !== 0) {
                // Reorder array: move clicked card to front
                for (let i = 0; i < index; i++) {
                    cards.push(cards.shift());
                }
                updateStack(cards);
            }
        });

        // Hover -> type URL
        card.addEventListener('mouseenter', function () {
            const cardId = this.id;
            const textEl = this.querySelector('.typing-text');
            const url = this.getAttribute('data-url');

            if (typingTimeouts[cardId]) clearTimeout(typingTimeouts[cardId]);
            textEl.innerHTML = "";
            typeUrl(cardId, textEl, url, 0);
        });

    });

});