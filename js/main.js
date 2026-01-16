gsap.registerPlugin(ScrollTrigger);


/* =====================================================
   PROJECT HOVER ANIMATIONS
===================================================== */
const cards = [...document.querySelectorAll(".project-card")];

cards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    const isLeft = cards.indexOf(card) === 0;
    const other = cards.find(c => c !== card);

    gsap.to(card, {
      x: isLeft ? 160 : -160,
      scale: 1.2,
      zIndex: 10,
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto"
    });

    gsap.to(other, {
      x: isLeft ? -260 : 260,
      scale: 0.88,
      filter: "brightness(0.6) blur(2px)",
      zIndex: 1,
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto"
    });
  });

  card.addEventListener("mouseleave", () => {
    gsap.to(cards, {
      x: 0,
      scale: 1,
      filter: "brightness(1) blur(0px)",
      zIndex: 1,
      duration: 0.6,
      ease: "power3.out",
      overwrite: "auto"
    });
  });
});


/* =====================================================
   TYPING EFFECT
===================================================== */
const text = "Hallo, ich bin Michael";
let index = 0;
const typingTarget = document.getElementById("typingText");

function typing() {
  if (index <= text.length) {
    typingTarget.textContent = text.slice(0, index);
    index++;
    setTimeout(typing, 80);
  }
}
typing();



// =============================
// Timeline auto-scroll + tooltip
// =============================
(function initTimeline() {
  const viewport = document.getElementById("timeline");
  const track = document.getElementById("timelineTrack");
  if (!viewport || !track) return;

  const startEl = document.getElementById("windowStart");
  const endEl = document.getElementById("windowEnd");

  const tooltip = document.getElementById("timelineTooltip");
  const ttTitle = document.getElementById("ttTitle");
  const ttRange = document.getElementById("ttRange");
  const ttDesc = document.getElementById("ttDesc");

  // Define the overall time range for the track
  const RANGE_START = new Date("2017-01-01");
  const RANGE_END = new Date("2026-01-01");

  const fmt = (d) =>
    d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const lerpDate = (a, b, t) => new Date(a.getTime() + (b.getTime() - a.getTime()) * t);

  // Track movement: move left continuously, loop seamlessly by wrapping.
  // We animate x from 0 to -(trackWidth - viewportWidth).
  const updateBounds = () => {
    const vw = viewport.clientWidth;
    const tw = track.scrollWidth;
    const maxShift = Math.max(0, tw - vw);
    return { vw, tw, maxShift };
  };

  let { maxShift } = updateBounds();

  const tween = gsap.to(track, {
    x: -maxShift,
    duration: 100,               // slower/faster auto-scroll
    ease: "none",
    repeat: -1,
    modifiers: {
      x: (x) => {
        // Wrap x smoothly (keeps it looping)
        const value = parseFloat(x);
        const wrapped = value % -maxShift;
        return `${wrapped}px`;
      }
    }
  });

  // Update "window start/end" labels based on current x
  const updateWindowLabels = () => {
    ({ maxShift } = updateBounds());
    const x = gsap.getProperty(track, "x");
    const progress = maxShift > 0 ? Math.min(1, Math.max(0, (-x) / maxShift)) : 0;

    // Window shows a slice of time. You can tune the “window size”.
    const windowSpan = 0.22; // 22% of the full time range visible at once
    const t0 = progress;
    const t1 = Math.min(1, progress + windowSpan);

    const d0 = lerpDate(RANGE_START, RANGE_END, t0);
    const d1 = lerpDate(RANGE_START, RANGE_END, t1);

    startEl.textContent = fmt(d0);
    endEl.textContent = fmt(d1);
  };

  gsap.ticker.add(updateWindowLabels);

  // Pause auto-scroll on hover over viewport (or a dot)
  const pause = () => tween.pause();
  const play = () => tween.resume();

  viewport.addEventListener("mouseenter", pause);
  viewport.addEventListener("mouseleave", () => {
    hideTooltip();
    play();
  });

  const dots = track.querySelectorAll(".milestone-dot");
  const milestones = track.querySelectorAll(".milestone");

  milestones.forEach((m, i) => {
    m.classList.add(i % 2 === 0 ? "up" : "down");

    const dot = m.querySelector(".milestone-dot");
    const label = m.querySelector(".milestone-label");
    if (!dot || !label) return;

    const title = dot.dataset.title || "";
    const start = dot.dataset.start || "";
    // optional: end if you want "start–end"
    // const end = dot.dataset.end || "";
    label.textContent = `${start} • ${title}`;
  });


  const parseYM = (s) => {
    if (!s) return null;
    const [y, m] = String(s).split("-").map(Number);
    if (!y || !m) return null;
    return new Date(y, m - 1, 1);
  };

  const nice = (s) => {
    const d = parseYM(s);
    return d ? fmt(d) : String(s);
  };

  // Build labels + alternate up/down
  milestones.forEach((m, i) => {
    m.classList.add(i % 2 === 0 ? "up" : "down");

    const dot = m.querySelector(".milestone-dot");
    let label = m.querySelector(".milestone-label");
    if (!dot) return;

    if (!label) {
      label = document.createElement("span");
      label.className = "milestone-label";
      m.appendChild(label);
    }

    const title = dot.dataset.title || "";
    const start = dot.dataset.start || "";
    label.textContent = `${nice(start)} • ${title}`;
  });

  function showTooltip(dot) {
    const rectV = viewport.getBoundingClientRect();
    const rectD = dot.getBoundingClientRect();

    const title = dot.dataset.title || "";
    const start = dot.dataset.start || "";
    const end = dot.dataset.end || "";
    const desc = dot.dataset.desc || "";

    ttTitle.textContent = title;
    ttRange.textContent = `${nice(start)} → ${nice(end)}`;
    ttDesc.textContent = desc;

    const x = rectD.left - rectV.left + rectD.width / 2;
    const y = rectD.top - rectV.top;

    const tooltipHeight = 120; // approx; we can measure too
    const placeBelow = y < 110; // near top -> place below

    tooltip.style.left = `${x}px`;
    tooltip.style.top = placeBelow ? `${y + 22}px` : `${y}px`;
    tooltip.style.transform = placeBelow ? "translate(-50%, 10%)" : "translate(-50%, -110%)";

    tooltip.setAttribute("aria-hidden", "false");

    gsap.to(tooltip, { autoAlpha: 1, duration: 0.18, ease: "power2.out" });
  }

  function hideTooltip() {
    tooltip.setAttribute("aria-hidden", "true");
    gsap.to(tooltip, { autoAlpha: 0, duration: 0.12, ease: "power2.out" });
  }

  dots.forEach((dot) => {
    dot.addEventListener("mouseenter", () => {
      pause();
      showTooltip(dot);
    });
    dot.addEventListener("mouseleave", hideTooltip);

    // keyboard support
    dot.addEventListener("focus", () => {
      pause();
      showTooltip(dot);
    });
    dot.addEventListener("blur", () => {
      hideTooltip();
      play();
    });
  });

  // Recalc on resize
  window.addEventListener("resize", () => {
    const b = updateBounds();
    maxShift = b.maxShift;
  });
})();



/* =====================================================
   SCROLL TO TOP ON RELOAD
===================================================== */
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);






/* =====================================================
   HERO HEADER COLLAPSE
===================================================== */
initHeroCollapse();

function initHeroCollapse() {
  const header = document.querySelector("#siteHeader");
  const nav = document.querySelector(".navbar");
  if (!header || !nav) return;

  // Reset
  document.body.classList.remove("dark-mode");
  nav.classList.remove("is-sticky");
  gsap.set(nav, { y: 0, scale: 1 });
  gsap.set(".hero-center", { autoAlpha: 1, y: 0 });
  gsap.set(".hero-portrait", { autoAlpha: 1, x: 0 });
  ScrollTrigger.create({
    trigger: header,
    start: "top top",
    end: "bottom top", // hero fully scrolled away
    scrub: true,

    onUpdate: (self) => {
      const p = self.progress;

      /* ===== visual collapse ===== */
      gsap.to(nav, {
        y: gsap.utils.interpolate(0, -220, p),
        scale: gsap.utils.interpolate(1, 0.92, p),
        overwrite: true
      });

      gsap.to(".hero-center", {
        autoAlpha: 1 - p * 1.4,
        y: -80 * p,
        overwrite: true
      });

      gsap.to(".hero-portrait", {
        autoAlpha: 1 - p * 1.2,
        x: 60 * p,
        overwrite: true
      });

      /* ===== dark mode threshold ===== */
      document.body.classList.toggle("dark-mode", p > 0.15);

      /* ===== sticky navbar switch ===== */
      if (p > 0.95) {
        nav.classList.add("is-sticky");
      } else {
        nav.classList.remove("is-sticky");
      }
    }
  });
}

// =========================================
// NAV ACTIVE SECTION HIGHLIGHT (ScrollTrigger)
// =========================================
(function initActiveNav() {
  const nav = document.querySelector(".navbar nav");
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  // Create indicator element once
  let indicator = nav.querySelector(".nav-indicator");
  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "nav-indicator";
    nav.appendChild(indicator);
  }

  const getLinkForId = (id) =>
    links.find(a => a.getAttribute("href") === `#${id}`);

  const moveIndicatorTo = (link) => {
    if (!link) return;

    // Set active class
    links.forEach(a => a.classList.toggle("active", a === link));

    // Compute indicator position relative to nav
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();

    const left = linkRect.left - navRect.left + 10; // align with your underline inset
    const width = Math.max(18, linkRect.width - 20);

    gsap.to(indicator, {
      x: left,
      width: width,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto"
    });
  };

  // Initialize to current hash or first section link
  const initialHash = (location.hash || "").replace("#", "");
  const initial = initialHash ? getLinkForId(initialHash) : links[0];
  requestAnimationFrame(() => moveIndicatorTo(initial));

  // Create ScrollTriggers for each linked section
  links.forEach((link) => {
    const id = (link.getAttribute("href") || "").replace("#", "");
    if (!id) return;

    const section = document.getElementById(id);
    if (!section) return;

    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",      // adjust feel
      end: "bottom 45%",
      onEnter: () => moveIndicatorTo(link),
      onEnterBack: () => moveIndicatorTo(link)
    });
  });

  // Also react to manual clicks
  links.forEach((link) => {
    link.addEventListener("click", () => {
      // indicator updates instantly on click, ScrollTrigger will keep it correct on scroll
      moveIndicatorTo(link);
    });
  });
})();







//ABOUT PAGE
gsap.from("#about .about-wrap", {
  scrollTrigger: {
    trigger: "#about",
    start: "top 75%",
    toggleActions: "play none none reverse"
  },
  y: 18,
  opacity: 0,
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
  opacity: 0,
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
  opacity: 0,
  duration: 0.6,
  stagger: 0.10,
  ease: "power2.out"
});

