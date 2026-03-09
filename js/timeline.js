document.addEventListener("DOMContentLoaded", () => {
  // =============================
  // 1) ELEMENTS
  // =============================

  const wrapper = document.getElementById("cv");     
  const viewport = document.getElementById("timeline");
  const track = document.getElementById("timelineTrack");
  if (!wrapper || !viewport || !track) return;

  const windowStartEl = document.getElementById("windowStart");
  const windowEndEl = document.getElementById("windowEnd");

  const tooltip = document.getElementById("timelineTooltip");
  const ttTitle = document.getElementById("ttTitle");
  const ttRange = document.getElementById("ttRange");
  const ttTimespan = document.getElementById("ttTimespan");
  const ttDesc = document.getElementById("ttDesc");

  // =============================
  // 2) CONFIG & HELPERS
  // =============================
  // Add 1 extra year of padding before birth to make start easier to read
  const START_DATE = new Date("1996-06-28");
  const END_DATE = new Date();
  END_DATE.setMonth(END_DATE.getMonth() + 6);
  const PADDED_START_DATE = new Date("1995-06-28"); // start virtual scrolling a year earlier
  const TOTAL_MS = END_DATE.getTime() - PADDED_START_DATE.getTime();

  const VIRTUAL_WIDTH = 4000;
  track.style.width = `${VIRTUAL_WIDTH}px`;

  const monthYearFmt = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
  const yearFmt = new Intl.DateTimeFormat("de-DE", { year: "numeric" });
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerpDate = (a, b, t) => new Date(a.getTime() + (b.getTime() - a.getTime()) * t);

  // Flexible date parser: handles "YYYY", "YYYY-MM", "YYYY-MM-DD"
  const nice = (s) => {
    if (!s) return "";
    const parts = String(s).split("-").map(Number);
    const year = parts[0];
    const month = parts.length > 1 ? parts[1] - 1 : 0; // Default to January
    const day = parts.length > 2 ? parts[2] : 1; // Default to 1st
    
    if (parts.length === 1) {
      // Just year
      return yearFmt.format(new Date(year, 0, 1));
    }
    return monthYearFmt.format(new Date(year, month, day));
  };

  // Parse date string to Date object, handling flexible formats
  const parseDate = (s) => {
    if (!s) return null;
    const parts = String(s).split("-").map(Number);
    const year = parts[0];
    const month = parts.length > 1 ? parts[1] - 1 : 0;
    const day = parts.length > 2 ? parts[2] : 1;
    return new Date(year, month, day);
  };

  // Calculate duration between two dates in a human-readable format
  const getDuration = (start, end) => {
    if (!start || !end) return "";
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!startDate || !endDate) return "";
    
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    const totalMonths = years * 12 + months;
    
    if (totalMonths >= 12) {
      const y = Math.floor(totalMonths / 12);
      const m = totalMonths % 12;
      return m > 0 ? `${y} Jahr${y > 1 ? 'e' : ''}, ${m} Monat${m > 1 ? 'e' : ''}` : `${y} Jahr${y > 1 ? 'e' : ''}`;
    }
    return `${totalMonths} Monat${totalMonths !== 1 ? 'e' : ''}`;
  };

  // Calculate timespan percentage for visualization (0-100)
  const getTimespanPercent = (start, end) => {
    if (!start || !end) return null;
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    if (!startDate || !endDate) return null;
    
    const startMs = startDate.getTime() - PADDED_START_DATE.getTime();
    const endMs = endDate.getTime() - PADDED_START_DATE.getTime();
    
    const left = (startMs / TOTAL_MS) * 100;
    const right = (endMs / TOTAL_MS) * 100;
    
    return { left: Math.max(0, left), width: Math.min(100 - left, right - left) };
  };

  // =============================
  // IMAGE DIMENSION & DEDUPLICATION
  // =============================
  
  // Global set to track rendered image sources (prevent duplicates)
  const renderedImages = new Set();
  
  // Cache for image dimensions: { src: { width, height } }
  const imageDimensionsCache = {};
  
  // Load image and get its natural dimensions
  const getImageDimensions = (src) => {
    return new Promise((resolve) => {
      // Return cached dimensions if available
      if (imageDimensionsCache[src]) {
        resolve(imageDimensionsCache[src]);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        const dims = { width: img.naturalWidth, height: img.naturalHeight };
        imageDimensionsCache[src] = dims;
        resolve(dims);
      };
      img.onerror = () => {
        // Fallback dimensions on error
        const dims = { width: 220, height: 150 };
        imageDimensionsCache[src] = dims;
        resolve(dims);
      };
      img.src = src;
    });
  };
  
  // Preload all images from milestones and store their dimensions
  const preloadImageDimensions = async (items) => {
    const imageSources = new Set();
    
    // Collect all unique image sources
    items.forEach(item => {
      if (Array.isArray(item.images)) {
        item.images.forEach(im => {
          if (im && im.src) {
            imageSources.add(im.src);
          }
        });
      }
    });
    
    // Preload each image to get dimensions
    const promises = Array.from(imageSources).map(src => getImageDimensions(src));
    await Promise.all(promises);
  };
  
  // Generate randomized dimensions based on real image, scaled by 0.6-1.0
  const getRandomizedDimensions = (src) => {
    const dims = imageDimensionsCache[src] || { width: 220, height: 150 };
    const scaleFactor = 0.4 + Math.random() * 0.3; // Random between 0.4 and 0.7
    return {
      width: Math.round(dims.width * scaleFactor),
      height: Math.round(dims.height * scaleFactor)
    };
  };

  // =============================
  // 3) MILESTONES & SCROLL LOGIC
  // =============================
  fetch("data/milestones.json")
    .then((r) => r.json())
    .then(async (items) => {
      // Preload all image dimensions first
      await preloadImageDimensions(items);
      generateMilestones(items);
      updateTimelineState(); // Initial calculation
      updateMediaScale();
      startAmbient();
    });

  function generateMilestones(items) {
    track.innerHTML = "";

    // Lanes in px relative to the center line. Negative = above, positive = below.
    // 3 lanes per side:
    const LANES_UP = [15, -25, -65];
    const LANES_DOWN = [-15, 25, 65];

    // Keep placed label ranges per lane to detect overlap (in track coordinates)
    const usedUp = LANES_UP.map(() => []);
    const usedDown = LANES_DOWN.map(() => []);

    items.forEach((item, index) => {
      const startDate = parseDate(item.start);
      if (!startDate) return;
      
      const itemTime = startDate.getTime();
      const pct = (itemTime - PADDED_START_DATE.getTime()) / TOTAL_MS;
      const pxPos = pct * VIRTUAL_WIDTH;

      const div = document.createElement("div");
      const isDown = !!(index % 2);
      div.className = `milestone ${isDown ? "down" : "up"}`;
      div.style.left = `${pxPos}px`;
      div.dataset.images = JSON.stringify(item.images || []);

      let durationWidth = 0;
      if (item.end) {
        const endDate = parseDate(item.end);
        if (endDate) {
           const endPct = (endDate.getTime() - PADDED_START_DATE.getTime()) / TOTAL_MS;
           durationWidth = Math.max(0, (endPct * VIRTUAL_WIDTH) - pxPos);
        }
      }

      // Pull default language strings for data attributes
      const titleDe = item.de?.title || item.title || "";
      const titleEn = item.en?.title || item.title || "";
      const descDe = item.de?.desc || item.desc || "";
      const descEn = item.en?.desc || item.desc || "";
      const labelDe = item.de?.label || item.label || "";
      const labelEn = item.en?.label || item.label || "";

      // Only insert the physical duration bar if we calculated a valid pixel width
      const durationHtml = durationWidth > 0 
          ? `<div class="milestone-duration" style="width: ${durationWidth}px;"></div>` 
          : '';

      div.innerHTML = `
      ${durationHtml}
      <button class="milestone-dot" type="button"
        data-start="${item.start}" data-end="${item.end}"
        data-title-de="${titleDe}" data-title-en="${titleEn}" 
        data-desc-de="${descDe}" data-desc-en="${descEn}">
      </button>
      <span class="milestone-label">
        ${nice(item.start)} • <span data-de="${labelDe}" data-en="${labelEn}">${labelDe}</span>
      </span>
    `;
      track.appendChild(div);

      const label = div.querySelector(".milestone-label");

      // Measure label width after it's in DOM
      const w = label.getBoundingClientRect().width;

      // Label range in track coordinates:
      const x1 = pxPos - w / 2;
      const x2 = pxPos + w / 2;

      // Choose lane with minimal overlap on that side
      const lanes = isDown ? LANES_DOWN : LANES_UP;
      const used = isDown ? usedDown : usedUp;

      let bestLane = 0;
      let bestPenalty = Infinity;

      for (let li = 0; li < lanes.length; li++) {
        const penalty = overlapPenalty(x1, x2, used[li]);
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestLane = li;
          if (penalty === 0) break; // perfect lane found
        }
      }

      // Set vertical offset via CSS variable
      label.style.setProperty("--y", `${lanes[bestLane]}px`);

      // Store occupied range
      used[bestLane].push([x1 - 8, x2 + 8]);

      // Tooltip events 
      const dot = div.querySelector(".milestone-dot");
      dot.addEventListener("mouseenter", () => showTooltip(dot));
      dot.addEventListener("mouseleave", hideTooltip);
    });
  }

  const activeCards = new Set();

  function animationLoop(t) {
    const now = t * 0.001;
    let dt = animationLoop.last ? now - animationLoop.last : 0.016;
    
    // Performance Guard: Clamp dt. If the browser tab goes to sleep or lags,
    // dt can become massive (e.g., 5-10 seconds). This huge multiplier gets applied
    // to the image's drift velocity, catapulting it at lightning speed across the screen
    // (creating the rogue high-momentum effect). Cap it at 100ms max.
    if (dt > 0.1) dt = 0.016; 
    
    animationLoop.last = now;

    activeCards.forEach(card => updateCard(card, dt, now));

    requestAnimationFrame(animationLoop);
  }
  requestAnimationFrame(animationLoop);

  const ambient = document.getElementById("timelineAmbient");

  // Reset slots to a wide grid mapping top and mid canvas 
  const SLOTS = [
    { x: 20, y: 5 },  // Top Left
    { x: 50, y: 0 },  // Top Center
    { x: 80, y: 5 },  // Top Right
    { x: 10, y: 25 }, // Mid Far Left
    { x: 35, y: 20 }, // Mid Inner Left
    { x: 65, y: 20 }, // Mid Inner Right
    { x: 90, y: 25 }, // Mid Far Right
  ];

  const slotBusy = new Array(SLOTS.length).fill(false);

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function getClosestMilestones(k = 3) {
    const milestones = [...track.querySelectorAll(".milestone")];
    const vRect = viewport.getBoundingClientRect();
    const centerX = vRect.left + vRect.width / 2;

    const scored = milestones.map(m => {
      const r = m.getBoundingClientRect();
      const mx = r.left + r.width / 2;
      return { m, d: Math.abs(mx - centerX) };
    });

    scored.sort((a, b) => a.d - b.d);
    return scored.slice(0, k).map(s => s.m);
  }

  function gatherCandidateImages() {
    // 2-3 Milestones around center
    const closest = getClosestMilestones(3);

    const imgs = [];
    for (const m of closest) {
      try {
        const arr = JSON.parse(m.dataset.images || "[]");
        for (const im of arr) {
          // Filter out duplicates using the renderedImages Set
          if (im && im.src && !renderedImages.has(im.src)) {
            imgs.push(im);
          }
        }
      } catch (_) { }
    }
    return imgs;
  }

  function findFreeSlot() {
    const free = [];
    for (let i = 0; i < SLOTS.length; i++) {
      if (!slotBusy[i]) free.push(i);
    }
    if (!free.length) return -1;
    return pick(free);
  }

  function spawnAmbientCard(forcedImage = null) {
    if (!ambient) return;

    // Hard limit: never spawn more than 3 active ambient cards at a time to prevent flooding
    if (activeCards.size >= 3) return;

    // Only when CV Section is visible
    const secRect = wrapper.getBoundingClientRect();
    const inView = secRect.top < window.innerHeight * 0.75 && secRect.bottom > window.innerHeight * 0.25;
    if (!inView && !forcedImage) return; // Allow forced images even if technically out of strict view bounds

    let im = null;
    if (forcedImage) {
      im = forcedImage;
      // Do not force spawn if it's already rendered on the screen
      if (renderedImages.has(im.src)) return; 
    } else {
      const candidates = gatherCandidateImages();
      if (!candidates.length) return;
      im = pick(candidates);
    }

    const slotIndex = findFreeSlot();
    if (slotIndex === -1) return;
    
    // Mark this image as rendered to prevent duplicates
    renderedImages.add(im.src);
    
    slotBusy[slotIndex] = true;

    const card = document.createElement("div");
    card.className = "ambient-card";

    // Get randomized dimensions based on real image
    const dims = getRandomizedDimensions(im.src);
    
    // slot position
    const s = SLOTS[slotIndex];
    card.style.left = `${s.x}%`;
    card.style.top = `${s.y}%`;
    card.slotIndex = slotIndex;

    // Use randomized dimensions with small random variation
    const w = dims.width;
    const h = dims.height;
    card.style.setProperty("--w", `${Math.max(300, w)}px`);
    card.style.setProperty("--h", `${Math.max(300, h)}px`);

    const img = document.createElement("img");
    img.src = im.src;
    img.alt = "";
    img.loading = "lazy";

    card.motion = createMotion();
    card.age = 0;
    card.life = 6 + Math.random() * 4;
    card.imgSrc = im.src; // save reference for cleanup
    
    card.px = 0;
    card.py = 0;
    card.appendChild(img);

    ambient.appendChild(card);

    activeCards.add(card);

    // fade in next frame
    requestAnimationFrame(() => card.classList.add("is-in"));
  }

  // spawn loop
  let ambientTimer = null;
  function startAmbient() {
    if (ambientTimer) return;
    ambientTimer = setInterval(() => {
      if (Math.random() < 0.40) spawnAmbientCard();
    }, 2000);

    // Custom hit-testing to trigger hover states on images since they are natively blocked by timeline z-index
    let hoveredCard = null;
    document.addEventListener("mousemove", (e) => {
      let found = null;
      // Reverse array to test the top-most (most recently spawned) card first
      const cards = Array.from(activeCards).reverse();
      for (const card of cards) {
        // Opacity filter: don't hover practically invisible cards
        if (parseFloat(card.style.opacity) < 0.1) continue; 
        
        const rect = card.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          found = card;
          break; 
        }
      }
      
      if (found !== hoveredCard) {
        if (hoveredCard) hoveredCard.classList.remove("is-hovered");
        if (found) found.classList.add("is-hovered");
        hoveredCard = found;
      }
    }, {passive: true});
  }

  viewport.addEventListener("scroll", () => {
    // Passive scroll handler
  }, { passive: true });

  function updateMediaScale() {
    const centerX = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;

    const cards = track.querySelectorAll(".timeline-media-card");
    cards.forEach((card) => {
      const r = card.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;

      const dist = Math.abs(cardCenter - centerX);
      const falloff = viewport.clientWidth * 0.55;
      const t = clamp01(dist / falloff);
      const ease = 1 - (1 - t) * (1 - t);
      const s = 1.2 - 0.2 * ease;

      card.style.setProperty("--s", s.toFixed(3));
    });
  }

  function createMotion() {
    return {
      phase: Math.random() * Math.PI * 2,
      freq: 0.05 + Math.random() * 0.05, 
      ampX: 10 + Math.random() * 10,
      ampY: 5 + Math.random() * 5, 
      
      // Explicitly allow negative (left) and positive (right) drift up to 8px/sec
      driftX: (Math.random() - 0.5) * 16, 
      
      // Explicitly allow negative (up) and positive (down) drift up to 4px/sec
      driftY: (Math.random() - 0.5) * 8, 
      
      rotSpeed: (Math.random() - 0.5) * 0.1,
      scalePhase: Math.random() * Math.PI * 2,
    };
  }

  function updateCard(card, dt, time) {
    card.age += dt;
    const m = card.motion;
    const t = time + m.phase;

    // Slower, more organic sway
    const swayX = Math.sin(t * m.freq) * m.ampX;
    const swayY = Math.cos(t * m.freq * 0.85) * m.ampY;
    const flutter = Math.sin(t * 1.5) * 2.0;

    card.px += m.driftX * dt;
    card.py += m.driftY * dt;

    const x = card.px + swayX + flutter;
    const y = card.py + swayY;

    const lifeT = card.age / card.life;
    const fadeInDur = 0.15;
    // Start fading out earlier (at 60% life) for a much smoother, lingering disappearance
    const fadeOutStart = 0.60; 

    let opacity;
    if (lifeT < fadeInDur) opacity = lifeT / fadeInDur;
    else if (lifeT > fadeOutStart) {
      // Use smoothstep-like easing curve for natural fade out
      // Math.pow ensures a softer descent to 0 so it doesn't pop at the very end
      const fadeProgress = (lifeT - fadeOutStart) / (1 - fadeOutStart);
      opacity = Math.max(0, Math.pow(Math.cos(fadeProgress * Math.PI / 2), 1.5)); 
    }
    else opacity = 1;

    opacity = Math.max(0, Math.min(1, opacity));
    
    // Subtle breathing scale effect
    const breath = 1 + Math.sin(time * 0.5 + m.scalePhase) * 0.03;
    const scale = (0.94 + 0.06 * opacity) * breath;

    card.style.opacity = opacity;
    // CRITICAL FIX: Base CSS relies on translate(-50%, -50%) to center cards on their X/Y slot origin!
    // Overwriting it with a raw translate(px) meant 0,0 was Top-Left, forcing all negative drift to look buggy
    // and all positive drift to physically sweep Bottom-Right.
    card.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${m.rotSpeed * card.age}deg) scale(${scale})`;

    // natural removal
    if (card.age >= card.life) {
      activeCards.delete(card);
      // Remove from rendered tracker so it can spawn again later!
      if (card.imgSrc) renderedImages.delete(card.imgSrc);
      card.remove();
      slotBusy[card.slotIndex] = false;
    }
  }


  function overlapPenalty(x1, x2, ranges) {
    let sum = 0;
    for (const [a, b] of ranges) {
      const o1 = Math.max(x1, a);
      const o2 = Math.min(x2, b);
      if (o2 > o1) sum += (o2 - o1);
    }
    return sum;
  }










  // =============================
  // SCROLL HANDLER (Updates Labels & Rainbow)
  // =============================
  function updateTimelineState() {
    const maxShift = viewport.scrollWidth - viewport.clientWidth;
    const scrollLeft = viewport.scrollLeft;

    const progress = maxShift > 0 ? clamp01(scrollLeft / maxShift) : 0;
    wrapper.style.setProperty('--progress', progress);

    const windowSpan = 0.08;
    const t0 = progress;
    const t1 = clamp01(progress + windowSpan);

    const dateLeft = lerpDate(PADDED_START_DATE, END_DATE, t0);
    const dateRight = lerpDate(PADDED_START_DATE, END_DATE, t1);

    // Custom window labels, override to hide the padded '95 year before actual birth
    if (windowStartEl && windowEndEl) {
        const d1 = dateLeft.getFullYear() < 1996 ? new Date("1996-01-01") : dateLeft;
        windowStartEl.textContent = monthYearFmt.format(d1);
        windowEndEl.textContent = monthYearFmt.format(dateRight);
    }
  }

  viewport.addEventListener("scroll", () => {
    hideTooltip();
    updateTimelineState();
    updateMediaScale();
  }, { passive: true });

  // Tooltip Logic
  function showTooltip(dot) {
    const dotRect = dot.getBoundingClientRect();
    const area = dot.closest(".timeline-area");
    const areaRect = area.getBoundingClientRect();

    // Fetch current language from language.js setting on body, default to de (German)
    const lang = document.body.getAttribute('data-current-lang') || "de";

    ttTitle.textContent = dot.dataset[`title${lang === 'en' ? 'En' : 'De'}`];
    
    const startStr = nice(dot.dataset.start);
    const endStr = dot.dataset.end ? nice(dot.dataset.end) : "";
    ttRange.textContent = endStr ? `${startStr} → ${endStr}` : startStr;
    
    ttDesc.textContent = dot.dataset[`desc${lang === 'en' ? 'En' : 'De'}`];
    
    // Show duration if there's an end date
    const duration = getDuration(dot.dataset.start, dot.dataset.end);
    if (ttTimespan && duration) {
      ttTimespan.textContent = duration;
      ttTimespan.style.display = "block";
    } else if (ttTimespan) {
      ttTimespan.style.display = "none";
    }

    // Position tooltip
    let left = dotRect.left - areaRect.left + dotRect.width / 2;
    let top = dotRect.top - areaRect.top;

    const padding = 12;
    left = Math.max(padding, Math.min(areaRect.width - padding, left));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top - 10}px`;
    tooltip.classList.add("active");

    // Spawn dedicated image for this milestone immediately
    try {
      const imagesRaw = dot.parentElement.dataset.images;
      if (imagesRaw) {
        const msImgs = JSON.parse(imagesRaw);
        if (msImgs && msImgs.length > 0) {
           // pick one random image from this milestone to pop up instantly
           const imgToSpawn = msImgs[Math.floor(Math.random() * msImgs.length)];
           spawnAmbientCard(imgToSpawn);
        }
      }
    } catch(e) { console.error(e); }
  }

  function hideTooltip() { tooltip.classList.remove("active"); }

  // Listen for global language toggles to refresh all static labels
  window.addEventListener('languageToggled', (e) => {
    // Retrigger tooltip logic if it's currently open
    if (tooltip.classList.contains("active")) {
      // Find the currently hovered dot and re-render it
      const dots = document.querySelectorAll(".milestone-dot:hover");
      if (dots.length > 0) showTooltip(dots[0]); 
    }
  });
});








// =====================================================
// ELASTIC WHEEL HANDOFF (The Feedback Mechanism)
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
  const RESISTANCE = 350;

  let edgeAccumulator = 0;
  let bounceTimeout;

  const onWheel = (e) => {
    const r = section.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.35 || r.bottom < window.innerHeight * 0.65) return;

    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const max = viewport.scrollWidth - viewport.clientWidth;
    const atStart = viewport.scrollLeft <= 2;
    const atEnd = viewport.scrollLeft >= max - 2;

    const goingForward = delta > 0;
    const goingBack = delta < 0;

    if ((goingForward && !atEnd) || (goingBack && !atStart)) {
      e.preventDefault();
      viewport.scrollLeft += delta * WHEEL_SPEED;
      edgeAccumulator = 0;
      viewport.style.transform = `translateX(0px)`;
      return;
    }

    e.preventDefault();
    edgeAccumulator += delta;

    const visualStretch = Math.max(-50, Math.min(50, edgeAccumulator * -0.5));
    viewport.style.transform = `translateX(${visualStretch}px)`;

    if (bounceTimeout) clearTimeout(bounceTimeout);

    if (Math.abs(edgeAccumulator) > RESISTANCE) {
      const idx = getSectionIndex();
      if (goingForward && atEnd) snapToIndex(idx + 1);
      else if (goingBack && atStart) snapToIndex(idx - 1);

      edgeAccumulator = 0;
      viewport.style.transform = `translateX(0px)`;
    } else {
      bounceTimeout = setTimeout(() => {
        edgeAccumulator = 0;
        viewport.style.transform = `translateX(0px)`;
      }, 150);
    }
  };

  main.addEventListener("wheel", onWheel, { passive: false });
})();
