/* =====================================================
   CUSTOM CURSOR
   - Auto-loads GSAP if not present
   - Disables on mobile/touch devices
   - Creates cursor elements dynamically if not in DOM
===================================================== */

// Check if device is mobile/touch-only (not a laptop with touchscreen)
function isMobileOrTouch() {
    // Only disable on small screens (phones/tablets)
    // Allow laptops with touchscreens to still use the cursor
    const isSmallScreen = window.matchMedia("(max-width: 900px)").matches;
    const isTouchOnly = (
        'ontouchstart' in window && 
        navigator.maxTouchPoints > 0 &&
        !window.matchMedia("(pointer: fine)").matches
    );
    
    return isSmallScreen || isTouchOnly;
}

// Load GSAP from CDN if not already loaded
function loadGSAP() {
    return new Promise((resolve, reject) => {
        if (typeof gsap !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Create cursor elements if they don't exist
function createCursorElements() {
    const existingDot = document.querySelector('.cursor-dot');
    const existingOutline = document.querySelector('.cursor-outline');

    if (!existingDot) {
        const dot = document.createElement('div');
        dot.className = 'cursor-dot';
        document.body.appendChild(dot);
    }

    if (!existingOutline) {
        const outline = document.createElement('div');
        outline.className = 'cursor-outline';
        document.body.appendChild(outline);
    }
}

// Initialize the cursor
async function initCursor() {
    // Skip on mobile/touch devices
    if (isMobileOrTouch()) {
        console.log('Custom cursor disabled on mobile/touch device');
        return;
    }

    try {
        // Load GSAP if needed
        await loadGSAP();

        // Create cursor elements if not present
        createCursorElements();

        // Now get the elements (they should exist now)
        const dot = document.querySelector('.cursor-dot');
        const outline = document.querySelector('.cursor-outline');

        // Final safety check
        if (!dot || !outline) {
            console.warn('Custom cursor: Cursor elements not found');
            return;
        }

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

        console.log('Custom cursor initialized');
    } catch (error) {
        console.error('Failed to initialize custom cursor:', error);
    }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCursor);
} else {
    initCursor();
}
