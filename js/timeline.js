// =============================
// CV SECTION
// =============================


document.addEventListener("DOMContentLoaded", () => {
    // =============================
    // 1. CONFIGURATION & SETUP
    // =============================
    const track = document.getElementById('timelineTrack');
    const viewport = document.getElementById("timeline");
    const startEl = document.getElementById("windowStart");
    const endEl = document.getElementById("windowEnd");
    
    // Tooltip Elements
    const tooltip = document.getElementById("timelineTooltip");
    const ttTitle = document.getElementById("ttTitle");
    const ttRange = document.getElementById("ttRange");
    const ttDesc = document.getElementById("ttDesc");

    // Define the boundaries of the timeline (Synchronize this!)
    // These control 0% and 100% positions
    const TIMELINE_START = new Date('1997-01-28');
    const TIMELINE_END = new Date();
    TIMELINE_END.setMonth(TIMELINE_END.getMonth() + 3);
    const TOTAL_DURATION = TIMELINE_END.getTime() - TIMELINE_START.getTime();

    // formatting helpers
    const fmt = (d) => d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const lerpDate = (a, b, t) => new Date(a.getTime() + (b.getTime() - a.getTime()) * t);
    
    const niceDate = (dateString) => {
        if (!dateString) return "";
        const [y, m] = dateString.split("-").map(Number);
        const d = new Date(y, m - 1, 1);
        return fmt(d);
    };

    // Global tween variable to control pause/play later
    let timelineTween; 

    // =============================
    // 2. FETCH & GENERATE
    // =============================
    fetch('data/milestones.json')
        .then(response => response.json())
        .then(data => {
            generateMilestones(data);
            // Only start animation AFTER elements exist
            initTimelineAnimation(); 
        })
        .catch(error => console.error('Error loading timeline:', error));

    function generateMilestones(milestones) {
        milestones.forEach((item, index) => {
            // A. Calculate Position
            const itemDate = new Date(item.start).getTime();
            let percentage = ((itemDate - TIMELINE_START.getTime()) / TOTAL_DURATION) * 100;
            percentage = Math.max(0, Math.min(100, percentage));

            // B. Create Container
            const milestoneDiv = document.createElement('div');
            milestoneDiv.classList.add('milestone', `milestone--${item.category}`);
            // Add up/down class based on index (even/odd)
            milestoneDiv.classList.add(index % 2 === 0 ? "up" : "down"); 
            milestoneDiv.style.setProperty('--pos', percentage.toFixed(2));

            // C. Create Button
            const btn = document.createElement('button');
            btn.classList.add('milestone-dot');
            btn.type = 'button';
            // Store data for tooltip
            btn.dataset.title = item.title;
            btn.dataset.start = item.start;
            btn.dataset.end = item.end;
            btn.dataset.desc = item.desc;

            // Accessibility
            const srSpan = document.createElement('span');
            srSpan.classList.add('sr-only');
            srSpan.textContent = `${item.title} (${item.start})`;
            btn.appendChild(srSpan);

            // D. Create Label
            const labelSpan = document.createElement('span');
            labelSpan.classList.add('milestone-label');
            labelSpan.textContent = `${niceDate(item.start)} • ${item.label}`;

            // E. Attach Events (Tooltip & Pause)
            btn.addEventListener("mouseenter", () => {
                pauseAnimation();
                showTooltip(btn);
            });
            btn.addEventListener("mouseleave", hideTooltip);
            btn.addEventListener("focus", () => {
                pauseAnimation();
                showTooltip(btn);
            });
            btn.addEventListener("blur", () => {
                hideTooltip();
                resumeAnimation();
            });

            // F. Append to DOM
            milestoneDiv.appendChild(btn);
            milestoneDiv.appendChild(labelSpan);
            track.appendChild(milestoneDiv);
        });
    }

    // =============================
    // 3. ANIMATION & INTERACTION
    // =============================
    function initTimelineAnimation() {
        if (!viewport || !track) return;

        // Track movement logic
        const updateBounds = () => {
            const vw = viewport.clientWidth;
            const tw = track.scrollWidth;
            // Only scroll if content is wider than viewport
            const maxShift = Math.max(0, tw - vw); 
            return { maxShift };
        };

        let { maxShift } = updateBounds();

        // GSAP Infinite Scroll
        timelineTween = gsap.to(track, {
            x: -maxShift,
            duration: 40, 
            ease: "none",
            repeat: -1,
            modifiers: {
                x: (x) => {
                    // Wrap x smoothly to loop
                    const value = parseFloat(x);
                    // Avoid division by zero if maxShift is 0
                    if (maxShift <= 0) return "0px";
                    const wrapped = value % -maxShift;
                    return `${wrapped}px`;
                }
            }
        });

        // Update Labels (Year Range)
        const updateWindowLabels = () => {
            ({ maxShift } = updateBounds());
            if (maxShift <= 0) return;

            const x = gsap.getProperty(track, "x");
            const progress = Math.min(1, Math.max(0, (-x) / maxShift));

            // Determine visible time slice (adjust 0.22 to fit your design)
            const windowSpan = 0.22; 
            const t0 = progress;
            const t1 = Math.min(1, progress + windowSpan);

            const d0 = lerpDate(TIMELINE_START, TIMELINE_END, t0);
            const d1 = lerpDate(TIMELINE_START, TIMELINE_END, t1);

            if(startEl) startEl.textContent = fmt(d0);
            if(endEl) endEl.textContent = fmt(d1);
        };

        gsap.ticker.add(updateWindowLabels);

        // Pause auto-scroll on viewport hover
        viewport.addEventListener("mouseenter", pauseAnimation);
        viewport.addEventListener("mouseleave", () => {
            hideTooltip();
            resumeAnimation();
        });

        // Recalc on resize
        window.addEventListener("resize", () => {
            const b = updateBounds();
            maxShift = b.maxShift;
            // Update tween destination if needed (advanced GSAP) or just let the modifier handle it
        });
    }

    // =============================
    // 4. TOOLTIP LOGIC
    // =============================
    function showTooltip(dot) {
        const rectV = viewport.getBoundingClientRect();
        const rectD = dot.getBoundingClientRect();

        const title = dot.dataset.title;
        const start = dot.dataset.start;
        const end = dot.dataset.end;
        const desc = dot.dataset.desc;

        ttTitle.textContent = title;
        ttRange.textContent = `${niceDate(start)} → ${end ? niceDate(end) : 'Heute'}`;
        ttDesc.textContent = desc;

        const x = rectD.left - rectV.left + rectD.width / 2;
        const y = rectD.top - rectV.top;

        // Position logic
        const placeBelow = y < 110; 
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

    function pauseAnimation() {
        if (timelineTween) timelineTween.pause();
    }

    function resumeAnimation() {
        if (timelineTween) timelineTween.resume();
    }
});