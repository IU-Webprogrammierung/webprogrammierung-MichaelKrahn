gsap.registerPlugin(ScrollTrigger);

/* =====================================================
   NAVBAR COLLAPSE & ACTIVE INDICATOR
===================================================== */
(function initNavbarStickyAndActive() {
  const navbar = document.querySelector(".navbar");
  const nav = navbar?.querySelector("nav");
  if (!navbar || !nav) return;

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));

  // --- Build section map
  const items = links
    .map(a => {
      const sel = a.getAttribute("href");
      const section = sel ? document.querySelector(sel) : null;
      return section ? { a, section } : null;
    })
    .filter(Boolean);

  // --- Indicator
  let indicator = nav.querySelector(".nav-indicator");
  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "nav-indicator";
    nav.appendChild(indicator);
  }

  let activeLink = null;

  function moveIndicatorTo(link, immediate = false) {
    if (!link) return;

    links.forEach(a => a.classList.toggle("active", a === link));
    activeLink = link;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    const left = linkRect.left - navRect.left;
    const width = linkRect.width;

    gsap.to(indicator, {
      x: left,
      width,
      duration: immediate ? 0 : 0.25,
      ease: "power2.out",
      overwrite: "auto"
    });
  }

  // --- FLIP-style transition to sticky
  function flipSticky(makeSticky) {
    const first = navbar.getBoundingClientRect();

    navbar.classList.toggle("is-sticky", makeSticky);

    // Force layout calculation after class change
    const last = navbar.getBoundingClientRect();

    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = first.width / last.width;
    const sy = first.height / last.height;

    gsap.fromTo(
      navbar,
      { x: dx, y: dy, scaleX: sx, scaleY: sy, transformOrigin: "top left" },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 0.45,
        ease: "power2.out",
        clearProps: "transform"
      }
    );

    // When width/layout changes, indicator must be repositioned
    requestAnimationFrame(() => {
      if (activeLink) moveIndicatorTo(activeLink, true);
    });
  }

  // --- Sticky trigger: when leaving the hero section
  ScrollTrigger.create({
      scroller: "#main", // Keep your custom scroller
      trigger: "body",   // Use body or your main wrapper as the reference
      start: "top top-=100", // "When Body Top is 100px above Viewport Top" (User scrolled 100px)
      end: 99999,        // Keep it active indefinitely
      onEnter: () => flipSticky(true),
      onLeaveBack: () => flipSticky(false),
  });

  // --- Active section logic (robust)

  // --- Click: move immediately (ScrollTrigger will keep it correct on scroll)
  links.forEach(a => {
    a.addEventListener("click", () => moveIndicatorTo(a));
  });

  // --- Initialize to hash or first valid item
  const initial = items.find(x => `#${x.section.id}` === location.hash)?.a || items[0]?.a || links[0];
  requestAnimationFrame(() => moveIndicatorTo(initial, true));

  // --- Keep indicator correct on resize/refresh
  window.addEventListener("resize", () => {
    if (activeLink) requestAnimationFrame(() => moveIndicatorTo(activeLink, true));
  });

  ScrollTrigger.create({
    scroller: "#main",
    trigger: hero,     // normally should trigger on every section. but there error seo debug set hero
    start: "top center",
    end: "bottom center",
    onToggle: self => { if (self.isActive) moveIndicatorTo(a); },
    invalidateOnRefresh: true
  });

  // One refresh after images/fonts settle helps reduce “wrong section” glitches
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();



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


/* =====================================================
   NEWS TICKER (Sliding Window Effect)
===================================================== */
const newsTarget = document.getElementById("navbarText");

// CONFIGURATION
const MAX_VISIBLE_CHARS = 50; // Approx 5-7 words
const TYPING_SPEED = 120;      // ms per character
const RSS_FEED_URL = "https://www.theverge.com/rss/index.xml"; // Tech News Source
// Alternative: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"

async function initNewsTicker() {
  let newsString = "Initializing news feed... ";

  try {
    // 1. Fetch RSS data using a public proxy (rss2json) to avoid CORS errors
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_FEED_URL)}`);
    const data = await res.json();

    if (data.status === 'ok') {
      // 2. Combine headlines into one long string separated by " +++ "
      newsString = data.items
        .map(item => item.title)
        .join("  +++  ") + "  +++  (End of Stream)  +++  ";
    } else {
      throw new Error("Feed load failed");
    }
  } catch (error) {
    console.warn("News fetch failed, using fallback.", error);
    newsString = "Welcome to my portfolio +++ Current stack: HTML, CSS, JS, GSAP, Three.js +++ ";
  }

  // 3. Start the animation loop
  let cursor = 0;

  function typeTick() {
    // Determine the start index:
    // If we haven't typed enough chars yet, start at 0.
    // If we have, move the start index so we only see the last MAX_VISIBLE_CHARS.
    const start = Math.max(0, cursor - MAX_VISIBLE_CHARS);
    
    // Slice the string window
    const currentText = newsString.substring(start, cursor);

    // Update DOM (Added a block cursor '█' for retro feel, remove if unwanted)
    newsTarget.textContent = currentText;

    cursor++;

    // Loop logic: If we reached the end, reset.
    if (cursor <= newsString.length) {
      setTimeout(typeTick, TYPING_SPEED);
    } else {
      cursor = 0; // Loop back to start
      setTimeout(typeTick, TYPING_SPEED);
    }
  }

  typeTick();
}

// Start the function
initNewsTicker();
