document.addEventListener("DOMContentLoaded", () => {
  // =============================
  // 1) ELEMENTS
  // =============================

  const wrapper = document.getElementById("cv");        // was #timelineWrapper
  const viewport = document.getElementById("timeline"); // keep (mechanics)
  const track = document.getElementById("timelineTrack");
  if (!wrapper || !viewport || !track) return;

  const windowStartEl = document.getElementById("windowStart");
  const windowEndEl = document.getElementById("windowEnd");

  const tooltip = document.getElementById("timelineTooltip");
  const ttTitle = document.getElementById("ttTitle");
  const ttRange = document.getElementById("ttRange");
  const ttDesc = document.getElementById("ttDesc");

  // =============================
  // 2) CONFIG & HELPERS
  // =============================
  const START_DATE = new Date("1996-06-28");
  const END_DATE = new Date();
  END_DATE.setMonth(END_DATE.getMonth() + 6);
  const TOTAL_MS = END_DATE.getTime() - START_DATE.getTime();

  const VIRTUAL_WIDTH = 3000;
  track.style.width = `${VIRTUAL_WIDTH}px`;

  const monthYearFmt = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerpDate = (a, b, t) => new Date(a.getTime() + (b.getTime() - a.getTime()) * t);
  const nice = (s) => {
    if (!s) return "";
    const [y, m] = String(s).split("-").map(Number);
    return monthYearFmt.format(new Date(y, m - 1, 1));
  };

  // =============================
  // 3) MILESTONES & SCROLL LOGIC
  // =============================
  fetch("data/milestones.json")
    .then((r) => r.json())
    .then((items) => {
      generateMilestones(items);
      updateTimelineState(); // Initial calculation
    });

  function generateMilestones(items) {
    track.innerHTML = "";
    items.forEach((item, index) => {
      const itemTime = new Date(item.start).getTime();
      const pct = (itemTime - START_DATE.getTime()) / TOTAL_MS;
      const pxPos = pct * VIRTUAL_WIDTH;

      const div = document.createElement("div");
      div.className = `milestone ${index % 2 ? "down" : "up"}`;
      div.style.left = `${pxPos}px`;

      div.innerHTML = `
        <button class="milestone-dot" type="button"
          data-title="${item.title}" data-start="${item.start}" 
          data-end="${item.end}" data-desc="${item.desc}">
        </button>
        <span class="milestone-label">${nice(item.start)} • ${item.title}</span>
      `;
      track.appendChild(div);

      // Events
      const dot = div.querySelector(".milestone-dot");
      dot.addEventListener("mouseenter", () => showTooltip(dot));
      dot.addEventListener("mouseleave", hideTooltip);
    });
  }

  // =============================
  // 4) SCROLL HANDLER (Updates Labels & Rainbow)
  // =============================
  function updateTimelineState() {
    const maxShift = viewport.scrollWidth - viewport.clientWidth;
    const scrollLeft = viewport.scrollLeft;

    // 1. Calculate Progress (0 to 1)
    const progress = maxShift > 0 ? clamp01(scrollLeft / maxShift) : 0;

    // 2. Update CSS Variable for Rainbow Color Shift
    wrapper.style.setProperty('--progress', progress);

    // 3. Update Window Labels (Start/End dates)
    const windowSpan = 0.08; // How much time fits on screen roughly
    const t0 = progress;
    const t1 = clamp01(progress + windowSpan);

    const dateLeft = lerpDate(START_DATE, END_DATE, t0);
    const dateRight = lerpDate(START_DATE, END_DATE, t1);

    if (windowStartEl) windowStartEl.textContent = monthYearFmt.format(dateLeft);
    if (windowEndEl) windowEndEl.textContent = monthYearFmt.format(dateRight);
  }

  viewport.addEventListener("scroll", () => {
    hideTooltip();
    updateTimelineState();
  }, { passive: true });

  // Tooltip Logic (Simplified for brevity)
  function showTooltip(dot) {
    const dotRect = dot.getBoundingClientRect();

    // IMPORTANT: use the tooltip's containing block
    const area = dot.closest(".timeline-area");
    const areaRect = area.getBoundingClientRect();

    ttTitle.textContent = dot.dataset.title;
    ttRange.textContent = `${nice(dot.dataset.start)} → ${nice(dot.dataset.end)}`;
    ttDesc.textContent = dot.dataset.desc;

    // position relative to timeline-area (not #cv)
    let left = dotRect.left - areaRect.left + dotRect.width / 2;
    let top = dotRect.top - areaRect.top;

    // clamp horizontally to stay inside timeline-area
    const padding = 12;
    left = Math.max(padding, Math.min(areaRect.width - padding, left));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top - 10}px`;
    tooltip.classList.add("active");
  }

  function hideTooltip() { tooltip.classList.remove("active"); }
});

// =====================================================
// 5) ELASTIC WHEEL HANDOFF (The Feedback Mechanism)
// =====================================================
(function initElasticHandoff() {
  const main = document.querySelector("#main");
  const section = document.querySelector("#cv");
  const viewport = document.querySelector("#timeline");
  if (!main || !section || !viewport) return;

  const getSnapSections = () => [...main.querySelectorAll("section")];
  const getSectionIndex = () => getSnapSections().indexOf(section);
  const snapToIndex = (idx) => getSnapSections()[idx]?.scrollIntoView({ behavior: "smooth" });

  const WHEEL_SPEED = 1.0;
  const RESISTANCE = 300; // How much edgeAccumulator is needed to jump

  let edgeAccumulator = 0;
  let bounceTimeout;

  const onWheel = (e) => {
    // Only active if CV section is in view
    const r = section.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.35 || r.bottom < window.innerHeight * 0.65) return;

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const max = viewport.scrollWidth - viewport.clientWidth;
    const atStart = viewport.scrollLeft <= 2;
    const atEnd = viewport.scrollLeft >= max - 2;

    const goingForward = delta > 0;
    const goingBack = delta < 0;

    // Normal Horizontal Scroll
    if ((goingForward && !atEnd) || (goingBack && !atStart)) {
      e.preventDefault();
      viewport.scrollLeft += delta * WHEEL_SPEED;
      edgeAccumulator = 0;
      viewport.style.transform = `translateX(0px)`; // Reset bounce
      return;
    }

    // EDGE LOGIC: Elastic Bounce Feedback
    e.preventDefault(); // Stop vertical scroll while building tension
    edgeAccumulator += delta;

    // Apply Visual "Stretch" (The Feedback)
    // We cap the visual stretch at 50px so it doesn't look broken
    const visualStretch = Math.max(-50, Math.min(50, edgeAccumulator * -0.5));
    viewport.style.transform = `translateX(${visualStretch}px)`;

    // Clear previous release timer
    if (bounceTimeout) clearTimeout(bounceTimeout);

    // Check if we pushed hard enough to jump
    if (Math.abs(edgeAccumulator) > RESISTANCE) {
      const idx = getSectionIndex();
      if (goingForward && atEnd) snapToIndex(idx + 1);
      else if (goingBack && atStart) snapToIndex(idx - 1);

      // Reset
      edgeAccumulator = 0;
      viewport.style.transform = `translateX(0px)`;
    } else {
      // If user stops scrolling before breaking resistance, bounce back
      bounceTimeout = setTimeout(() => {
        edgeAccumulator = 0;
        viewport.style.transform = `translateX(0px)`;
      }, 150);
    }
  };

  main.addEventListener("wheel", onWheel, { passive: false });
})();