
/* ------------------------------
   LANGUAGE
-------------------------------- */
let currentLang = 'en';

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'de' : 'en';

    // Update all elements with data-en and data-de attributes
    document.querySelectorAll('[data-en][data-de]').forEach(el => {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    });

    // Update placeholders
    document.querySelectorAll('[data-placeholder-en][data-placeholder-de]').forEach(el => {
        el.placeholder = el.getAttribute(`data-placeholder-${currentLang}`);
    });

    // Update CTA buttons in sections
    document.querySelectorAll('.cta').forEach(el => {
        if (el.hasAttribute('data-en') && el.hasAttribute('data-de')) {
            el.textContent = el.getAttribute(`data-${currentLang}`);
        }
    });

    // Update language toggle button
    const langToggle = document.querySelector('.lang-toggle');
    langToggle.innerHTML = currentLang === 'en' ? '<span class="lang-flag">🇩🇪</span>' : '<span class="lang-flag">🇬🇧</span>';
    
    // Set status on body so timeline.js can read it dynamically 
    document.body.setAttribute('data-current-lang', currentLang);

    // Save preference
    localStorage.setItem('shopLang', currentLang);
    
    // Dispatch a custom event so timeline.js or others can re-render open components
    window.dispatchEvent(new CustomEvent('languageToggled', { detail: { lang: currentLang } }));
}

// Expose toggleLanguage to global scope so it can be called from HTML onclick
window.toggleLanguage = toggleLanguage;

// Load saved language preference
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('shopLang');
    if (savedLang) {
        currentLang = savedLang;
        // Trigger the toggle to apply saved language
        if (savedLang === 'de') {
            toggleLanguage();
        }
    }
});
