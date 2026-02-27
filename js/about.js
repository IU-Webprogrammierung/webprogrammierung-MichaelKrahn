document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("#about-skills");
  if (!section) return;

  const overlay = document.querySelector("#skills-overlay");
  if (!overlay) return;

  gsap.registerPlugin(ScrollTrigger);

  let sectionState = "outside";
  let towersVisible = false;
  // outside → entering → inside → leaving


  // 4 towers with different counts
  const TOWERS = {
    web: { baseColor: 0x2ea8ff, blocks: ["HTML", "CSS", "JavaScript"] },
    embedded: { baseColor: 0xff7a2e, blocks: ["Arduino", "C++", "Sensors", "Control"] },
    visual: { baseColor: 0x7c5cff, blocks: ["Blender", "Photoshop"] },
    proto: { baseColor: 0x33d18f, blocks: ["3D Printing", "Electronics", "Prototyping"] }
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: overlay,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.sortObjects = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // relatively cheap


  const scene = new THREE.Scene();
  let camera = null;

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(300, -400, 900);
  key.castShadow = true;

  // Keep shadow map small-ish for performance
  key.shadow.mapSize.set(256, 256);

  // Tune shadow camera to cover your scene region (pixel space around towers)
  key.shadow.camera.near = 100;
  key.shadow.camera.far = 2500;

  // Reduce acne;
  key.shadow.bias = -0.0006;

  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-500, 200, 700);
  scene.add(fill);

  // Pixel-world constants
  const blockSizePx = 44;
  const gapPx = 45;     // slightly larger than 49 to reduce visual edge intersections
  let dropG = 1500;
  const damp = 0.07;
  const maxVy = 5000;

  // Presentation tilt (gives "top view" without breaking your DOM anchoring)
  const TILT_X = -0.15;
  const TILT_Y = 0.35;

  // Perspective camera settings
  const FOV = 42; // degrees

  function resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);

    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Perspective camera, but calibrated so that at z=0 plane:
    // 1 world unit == 1 pixel (for DOM anchoring), as long as camera is NOT tilted.
    const fovRad = THREE.MathUtils.degToRad(FOV);
    const camZ = (h / 2) / Math.tan(fovRad / 2);

    camera = new THREE.PerspectiveCamera(FOV, w / h, 0.1, 5000);

    // Center the light + its shadow frustum on the viewport center (pixel-space world)
    key.target.position.set(w / 2, h / 2, 0);
    scene.add(key.target);

    // Keep the light position relative to the viewport (so direction stays stable)
    key.position.set(w / 2 + 300, h / 2 - 400, camZ + 900);

    // Make shadow camera cover the visible pixel-space region
    const cover = 0.75; // lower = tighter + sharper, higher = safer coverage
    key.shadow.camera.left = -(w * cover);
    key.shadow.camera.right = (w * cover);
    key.shadow.camera.top = (h * cover);
    key.shadow.camera.bottom = -(h * cover);
    key.shadow.camera.updateProjectionMatrix();

    key.shadow.camera.near = 1;
    key.shadow.camera.far = camZ + 3000;
    key.shadow.camera.updateProjectionMatrix();

    // Use "pixel space" coordinates directly: (0..w, 0..h), y down
    camera.up.set(0, -1, 0);
    camera.position.set(w / 2, h / 2, camZ);
    camera.lookAt(new THREE.Vector3(w / 2, h / 2, 0));
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  function plasticMaterial(hexColor, index, count) {
    const base = new THREE.Color(hexColor);
    const hsl = {};
    base.getHSL(hsl);

    const t = count <= 1 ? 0 : index / (count - 1);
    const s = lerp(hsl.s, clamp(hsl.s * 1.2, 0.4, 1.0), t);
    const l = lerp(0.75, clamp(hsl.l * 0.80, 0.20, 0.7), t);

    const shaded = new THREE.Color().setHSL(hsl.h, s, l);

    return new THREE.MeshStandardMaterial({
      color: shaded,
      metalness: 0.0,
      roughness: 0.42,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
      depthTest: true
    });
  }

  function buildBlockMesh(mat) {
    const geo = new THREE.BoxGeometry(blockSizePx, blockSizePx, blockSizePx);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  }

  // ----------------------
  // Build towers
  // ----------------------
  const towerEls = [...section.querySelectorAll(".skill-tower")];
  const towers = [];

  function buildTowers() {
    for (const t of towers) scene.remove(t.group);
    towers.length = 0;

    for (const el of towerEls) {
      const towerKey = el.dataset.tower;
      const cfg = TOWERS[towerKey];
      if (!cfg) continue;

      const accent = new THREE.Color(cfg.baseColor);
      const accentSoft = accent.clone().lerp(new THREE.Color(0xffffff), 0.28); // slightly brighter

      el.style.setProperty("--tower-accent", `#${accent.getHexString()}`);
      el.style.setProperty("--tower-accent-soft", `#${accentSoft.getHexString()}`);

      const group = new THREE.Group();

      // -- FLOOR (per tower) --

      // 1) Tilt container for the "table"
      const floorTilt = new THREE.Group();
      floorTilt.rotation.x = TILT_X;
      //floorTilt.rotation.y = TILT_Y;

      // 2) Geometry: make it an XZ plane (horizontal table)
      const floorGeo = new THREE.PlaneGeometry(300, 720);
      floorGeo.rotateX(-Math.PI / 2);

      // 3) Shadow catcher (invisible except shadow)
      const floorMat = new THREE.ShadowMaterial({ opacity: 0.20 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.receiveShadow = true;

      // Put it just under the bottom cube bottom face.
      floor.position.set(0, blockSizePx * 0.5, -230);

      floor.frustumCulled = false;
      floor.material.side = THREE.DoubleSide;

      floorTilt.add(floor);

      // 4) Optional faint visible base plane (helps you SEE the table)
      const baseMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        //opacity: 0.04,
        opacity: 0.00,
        depthWrite: false
      });
      const basePlane = new THREE.Mesh(floorGeo.clone(), baseMat);
      basePlane.position.copy(floor.position);

      // Same safety flags
      basePlane.frustumCulled = false;
      basePlane.material.side = THREE.DoubleSide;

      // Nudge slightly to prevent z-fighting with the shadow receiver
      basePlane.position.y += 0.05;

      floorTilt.add(basePlane);

      // 5) Add to group BEFORE scene.add(group)
      group.add(floorTilt);

      scene.add(group);

      const blocks = [];
      const count = cfg.blocks.length;

      for (let i = 0; i < count; i++) {
        const mat = plasticMaterial(cfg.baseColor, i, count);
        const mesh = buildBlockMesh(mat);

        // --- HIERARCHY ---
        // 1. Yaw: Rotates the block around its own center (Vertical Axis)
        const yaw = new THREE.Group();
        yaw.add(mesh);
        // 2. Offset: Moves the block on the "Floor Plane" (X and Z)
        const offset = new THREE.Group();
        offset.add(yaw);
        // 3. Tilt: The fixed "Presentation View"
        const tilt = new THREE.Group();
        tilt.add(offset);
        // 4. Wrap: The Physics Container
        const wrap = new THREE.Group();
        wrap.add(tilt);
        group.add(wrap);

        // --- APPLY TRANSFORMS ---
        // 1. Apply the fixed presentation tilt to the "Table"
        tilt.rotation.x = TILT_X;
        tilt.rotation.y = TILT_Y;
        // 2. Random Placement on the table
        const xJ = (Math.random() * 2 - 1) * 13;
        const zJ = (Math.random() * 2 - 1) * 13;
        offset.position.set(xJ, 0, zJ);
        // 3. Random Yaw (0..360)
        // Now rotates around the vertical axis perpendicular to the tilted table
        const rY = Math.random() * Math.PI * 2;
        const startDelay = Math.random() * 0.9 + i * 0.7;

        blocks.push({
          wrap,
          yaw,
          offset, // We track this now to apply offsets if needed
          tilt,   // Track tilt if you ever want to animate the camera angle

          targetX: 0,
          targetY: 0,

          rY, // We will apply this to yaw.rotation.y in the tick loop

          // fall physics
          y: -200,
          vy: 0,
          settled: false,
          active: false,
          startDelay,

          // scale
          startY: 0,
          startScale: 1,

          // hover
          offX: 0, vX: 0,
          offR: 0, vR: 0,

          // idle wobble
          wobPhase: Math.random() * Math.PI * 2,
          wobFreq: 1.2 + Math.random() * 0.8,   // slow, organic
          wobKick: 0,                           // decays (fade-out)

          // Leaving screen
          exitVy: 0,
          exitFade: 1,
          exiting: false,
        });
      }

      const tower = {
        el,
        cfg,
        group,
        blocks,
        anchoredToDOM: true,
        hasDropped: false
      };
      towers.push(tower);

      // Hover push
      el.addEventListener("mouseenter", () => {
        const n = tower.blocks.length || 1;
        for (let i = 0; i < n; i++) {
          const b = tower.blocks[i];
          const t = n <= 1 ? 1 : i / (n - 1);              // 0 bottom .. 1 top
          const topBias = Math.pow(t, 1.6);                // top gets more

          // softer, less "jerky"
          b.vX += (Math.random() * 2 - 1) * (50 + 50 * topBias);
          b.vZ += (Math.random() * 2 - 1) * (50 + 50 * topBias);
          b.vR += (Math.random() * 2 - 1) * (0.05 + 0.05 * topBias);

          // adds a wobble kick that fades out
          b.wobKick += (0.2 + 0.5 * topBias);
        }
      }, { passive: true });
    }
  }

  buildTowers();





  ////Animation


  // Map DOM -> world targets
  function updateTargetsFromDOM() {
    const canvasRect = overlay.getBoundingClientRect();
    const canvasW = canvasRect.width;

    // Scale towers down on mobile to fit the tighter layout
    const isMobile = window.innerWidth < 900;
    const tScale = isMobile ? 0.75 : 1.0;

    for (const t of towers) {
      t.group.scale.set(tScale, tScale, tScale); // Apply scale to the whole tower

      const stageEl = t.el.querySelector(".tower-canvas");
      if (!stageEl) continue;

      const r = stageEl.getBoundingClientRect();

      // tower center in canvas-local pixels
      const cx = (r.left - canvasRect.left) + (r.width * 0.5);

      // MIRROR X to fix left/right swap
      const baseX = canvasW - cx;

      // Adjust vertical anchor slightly for mobile
      const baseY = (r.bottom - canvasRect.top) - (isMobile ? 25 : 40);

      if (t.anchoredToDOM) {
        t.group.position.set(baseX, baseY, 0);
      }

      const n = t.blocks.length;
      for (let i = 0; i < n; i++) {
        const b = t.blocks[i];
        b.targetX = 0;
        b.targetY = -i * gapPx;
      }
    }
  }





  function replayDrop() {
    // Check if we are on mobile
    const isMobile = window.innerWidth < 900;

    // 1. Aggressive scaling & faster falling for mobile
    const startScale = isMobile ? 5.5 : 3.2;
    dropG = isMobile ? 3000 : 1500; // Double gravity on mobile so it snaps down faster

    if (sectionState === "inside" || sectionState === "entering" || sectionState === "leaving") {
      updateTargetsFromDOM();
    }

    // Iterate using index (tIdx) to determine which tower we are dropping
    towers.forEach((t, tIdx) => {
      t.anchoredToDOM = true;
      t.hasDropped = true;

      const groupY = t.group.position.y;
      const currentScale = t.group.scale.y || 1;

      // 2. Desktop Stagger: Delay the top row (indices 0 & 1) so bottom row builds first
      const towerDelay = (!isMobile && tIdx < 2) ? 0.9 : 0;

      t.blocks.forEach((b, i) => {
        b.vy = 0;
        b.vRx = 0; b.vRy = 0; b.vRz = 0;
        b.z = 0;
        b.settled = false;
        b.active = false;
        b.exiting = false;
        b.exitFade = 1;
        b.scaleVy = 0;

        // Apply the tower delay, plus a slight stagger for each individual block
        b.startDelay = towerDelay + (Math.random() * 0.45) + (i * 0.35);

        // Increase startY randomly on mobile so the larger blocks have room to accelerate
        const heightOffset = isMobile ? 600 : 350;
        b.startY = (-groupY / currentScale) - (blockSizePx * 2) - (Math.random() * heightOffset) + b.targetY;
        b.y = b.startY;

        b.startScale = startScale;
        b.wrap.scale.set(startScale, startScale, startScale);
        b.wrap.visible = false;

        b.offX = 0; b.vX = 0;
        b.offR = 0; b.vR = 0;
      });
    });
  }

  function settleNow() {
    for (const t of towers) {
      for (const b of t.blocks) {
        b.settled = true;
        b.active = true;
        b.wrap.visible = true;

        b.y = b.targetY;
        b.z = 0; // Fix depth
        b.vy = 0;

        b.wrap.scale.set(1, 1, 1);
        b.wrap.rotation.set(0, 0, 0); // Fix rotation
      }
    }
  }


  function startLeaving() {
    sectionState = "leaving";

    gsap.fromTo(overlay,
      { filter: "blur(0px)" },
      {
        filter: "blur(2px)", duration: 0.15, ease: "power2.in", onComplete: () => {
          gsap.to(overlay, { filter: "blur(0px)", duration: 0.3, ease: "power2.out" });
        }
      }
    );

    for (const t of towers) {
      t.blocks.forEach((b, i) => {
        b.exiting = true;

        // 1. Sideways Spread (More horizontal inertia)
        const speedX = 150 + Math.random() * 250;
        b.vX = (Math.random() - 0.5) * speedX;

        // 2. Depth Pop (Fly TOWARDS the camera so bigger blocks naturally render in front)
        b.vZ = 100 + Math.random() * 400;

        // 3. Vertical Pop (Reduced to prevent hitting the top of the screen)
        b.vy = -50 - Math.random() * 150;

        // 4. Multi-Axis Tumble (Spinning out of control)
        b.vRx = (Math.random() - 0.5) * 15;
        b.vRy = (Math.random() - 0.5) * 15;
        b.vRz = (Math.random() - 0.5) * 15;

        // 5. Gentle Scale Burst (Since they are physically moving closer via Z-axis, we need less scale)
        b.scaleVy = 0.5 + Math.random() * 1.5;

        b.settled = false;
      });
    }
  }






  // State Machine
  ScrollTrigger.create({
    trigger: "#about-skills",
    start: "top 10%",
    end: "bottom 90%",
    onEnter: () => {
      time = 0;
      sectionState = "entering";
      towersVisible = true;
      section.classList.add("is-visible");
      updateTargetsFromDOM();
      replayDrop();
    },
    onLeaveBack: () => {
      sectionState = "leaving";
      section.classList.remove("is-visible");
      startLeaving();
    },
    onLeave: () => {
      sectionState = "leaving";
      section.classList.remove("is-visible");
      startLeaving();
    },
    onEnterBack: () => {
      time = 0;
      sectionState = "entering";
      towersVisible = true;
      section.classList.add("is-visible");
      updateTargetsFromDOM();
      replayDrop();
    }
  });





  for (const t of towers) {
    t.el.addEventListener("click", settleNow, { passive: true });
  }

  // Loop
  let last = performance.now();
  let time = 0;

  function tick(now) {
    const dt = clamp((now - last) / 1000, 0, 1 / 30);
    last = now;
    time += dt;

    updateTargetsFromDOM();

    for (const t of towers) {
      const n = t.blocks.length || 1;
      for (let i = 0; i < n; i++) {
        const b = t.blocks[i];

        if (!b.active && time >= b.startDelay) {
          b.active = true;
          b.wrap.visible = true;
        }

        if (b.active && !b.settled && sectionState !== "leaving") {

          b.wrap.rotation.set(0, 0, 0);
          b.z = 0;
          b.vy += dropG * dt;
          b.vy = clamp(b.vy, -maxVy, maxVy);
          b.y += b.vy * dt;

          const denom = (b.targetY - b.startY) || 1;
          const prog = clamp((b.y - b.startY) / denom, 0, 1);
          const s = lerp(b.startScale, 1, prog);
          b.wrap.scale.set(s, s, s);

          if (b.y >= b.targetY) {
            b.y = b.targetY;
            if (Math.abs(b.vy) < 120) {
              b.vy = 0;
              b.settled = true;
              b.wrap.scale.set(1, 1, 1);
            } else {
              b.vy = -b.vy * damp;
            }
          }
        }

        // Hover drift physics
        const linDrag = 10.5;
        const rotDrag = 12.0;

        b.vX *= Math.exp(-linDrag * dt);
        b.offX += b.vX * dt;

        b.vR *= Math.exp(-rotDrag * dt);
        b.offR += b.vR * dt;

        // Idle wobble
        const t01 = n <= 1 ? 1 : i / (n - 1);
        const topBias = Math.pow(t01, 1.6);

        b.wobKick *= Math.exp(-1.25 * dt);

        const baseEnergy = 0.35 + 0.65 * topBias;
        const energy = baseEnergy + b.wobKick;

        const wobX = Math.sin(time * b.wobFreq + b.wobPhase) * (blockSizePx * 0.020) * energy;
        const wobR = Math.sin(time * (b.wobFreq * 1.35) + b.wobPhase * 1.7) * (0.05) * energy;

        const maxOffX = blockSizePx * 0.32;
        const maxOffR = 0.42;
        b.offX = clamp(b.offX, -maxOffX, maxOffX);
        b.offR = clamp(b.offR, -maxOffR, maxOffR);

        // ---> FIX: Add b.z here so it can fly towards the camera
        b.wrap.position.set(b.targetX + b.offX + wobX, b.y, b.z || 0);
        b.yaw.rotation.y = b.rY + b.offR + wobR;

        // FREE PHYSICS DURING LEAVE (real falling)
        if (sectionState === "leaving" && b.exiting) {
          b.vy += dropG * dt; // Gravity

          // Friction / Drag
          b.vX *= Math.exp(-1.2 * dt);
          b.vZ *= Math.exp(-1.2 * dt);
          b.vRx *= Math.exp(-0.8 * dt);
          b.vRy *= Math.exp(-0.8 * dt);
          b.vRz *= Math.exp(-0.8 * dt);

          // Apply Movement
          b.y += b.vy * dt;
          b.offX += b.vX * dt;
          b.z += b.vZ * dt;

          // Apply Multi-Axis Tumble
          b.wrap.rotation.x += b.vRx * dt;
          b.wrap.rotation.y += b.vRy * dt;
          b.wrap.rotation.z += b.vRz * dt;

          // Scale & Shrink Logic
          b.scaleVy -= 4.5 * dt; // Gravity for the scale
          let s = b.wrap.scale.x + (b.scaleVy * dt);

          // Once the pop peaks, force them to shrink rapidly into the distance
          if (b.scaleVy < 0) {
            s -= 2.5 * dt;
          }

          s = Math.max(0, s); // Prevent negative scale crash
          b.wrap.scale.set(s, s, s);
        }
      }
    }

    // ---> FIX: Only shut off the canvas when the blocks have actually shrunk to 0
    if (sectionState === "leaving") {
      const allGone = towers.every(t => t.blocks.every(b => b.wrap.scale.x <= 0.01));
      if (allGone) {
        towersVisible = false;
        sectionState = "outside";
      }
    }

    if (towersVisible) {
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
});