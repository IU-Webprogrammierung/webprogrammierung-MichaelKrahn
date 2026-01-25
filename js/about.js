document.addEventListener("DOMContentLoaded", () => {
  const section = document.querySelector("#about-skills");
  if (!section) return;

  const snapRoot = document.querySelector(".main") || null;

  // Ensure you have <canvas id="skills-overlay"></canvas> in the DOM
  const overlay = document.querySelector("#skills-overlay");
  if (!overlay) return;

  let hasPlayed = false;

  // 4 towers with different counts
  const TOWERS = {
    web: { baseColor: 0x2ea8ff, blocks: ["HTML", "CSS", "JavaScript"] },
    embedded: { baseColor: 0xff7a2e, blocks: ["Arduino", "C++", "Sensors", "Control"] },
    visual: { baseColor: 0x7c5cff, blocks: ["Blender", "Photoshop", "UI/UX"] },
    proto: { baseColor: 0x33d18f, blocks: ["3D Printing", "Electronics", "Prototyping"] }
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: overlay,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.sortObjects = true;

  const scene = new THREE.Scene();
  let camera = null;

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(300, -400, 900);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-500, 200, 700);
  scene.add(fill);

  // Pixel-world constants
  const blockSizePx = 48;
  const gapPx = 49;     // slightly larger than 49 to reduce visual edge intersections
  const dropG = 1200;
  const damp = 0.07;
  const maxVy = 1500;

  // Presentation tilt (gives "top view" without breaking your DOM anchoring)
  // IMPORTANT: this tilt is isolated in a dedicated group so yaw remains clean.
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
      // If you still see rare z-fighting on some GPUs, we can add polygonOffset here.
    });
  }

  function buildBlockMesh(mat) {
    const geo = new THREE.BoxGeometry(blockSizePx, blockSizePx, blockSizePx);
    return new THREE.Mesh(geo, mat);
  }

  // Build towers
  const towerEls = [...section.querySelectorAll(".skill-tower")];
  const towers = [];

  function buildTowers() {
    for (const t of towers) scene.remove(t.group);
    towers.length = 0;

    for (const el of towerEls) {
      const towerKey = el.dataset.tower;
      const cfg = TOWERS[towerKey];
      if (!cfg) continue;

      const group = new THREE.Group();
      scene.add(group);

      const blocks = [];
      const count = cfg.blocks.length;

      for (let i = 0; i < count; i++) {
        const mat = plasticMaterial(cfg.baseColor, i, count);
        const mesh = buildBlockMesh(mat);

        // --- NEW HIERARCHY ---

        // 1. Yaw: Rotates the block around its own center (Vertical Axis)
        // This is the "Human Rotation"
        const yaw = new THREE.Group();
        yaw.add(mesh);

        // 2. Offset: Moves the block on the "Floor Plane" (X and Z)
        // Since this is inside Tilt, Z is depth into the scene, not screen Y
        const offset = new THREE.Group();
        offset.add(yaw);

        // 3. Tilt: The fixed "Presentation View"
        // This tips the imaginary table so we can see the top faces
        const tilt = new THREE.Group();
        tilt.add(offset);

        // 4. Wrap: The Physics Container
        // Moves the whole assembly down the Screen Y (Gravity)
        const wrap = new THREE.Group();
        wrap.add(tilt);
        
        group.add(wrap);

        // --- APPLY TRANSFORMS ---

        // 1. Apply the fixed presentation tilt to the "Table"
        tilt.rotation.x = TILT_X;
        tilt.rotation.y = TILT_Y;

        // 2. Random Placement on the table
        const xJ = (Math.random() * 2 - 1) * 15; 
        const zJ = (Math.random() * 2 - 1) * 15; 
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
          offR: 0, vR: 0
        });
      }

      const tower = { el, cfg, group, blocks };
      towers.push(tower);

      // Hover push (kept, but we do NOT apply offR to yaw yet — later)
      el.addEventListener("mouseenter", () => {
        for (const b of tower.blocks) {
          b.vX += (Math.random() * 2 - 1) * 70;
          b.vR += (Math.random() * 2 - 1) * 0.45;
        }
      }, { passive: true });
    }
  }

  buildTowers();

  // Map DOM -> world targets
  // With our calibrated perspective camera (no camera tilt), x/y in world = pixels at z=0.
  function updateTargetsFromDOM() {
    for (const t of towers) {
      const stageEl = t.el.querySelector(".tower-canvas");
      if (!stageEl) continue;

      const r = stageEl.getBoundingClientRect();

      // Anchor near the bottom of the stage so the stack grows upward
      const baseX = r.right - 750;
      const baseY = r.bottom - 150;

      t.group.position.set(baseX, baseY, 0);

      const n = t.blocks.length;
      for (let i = 0; i < n; i++) {
        const b = t.blocks[i];

        // Important: keep targetX clean; random x/z lives in b.offset.position
        b.targetX = 0;

        // Stack upward: bottom block at 0, next above at gapPx, etc.
        b.targetY = (n - 1 - i) * gapPx;
      }
    }
  }

  function replayDrop() {
    const startScale = 3.2;

    updateTargetsFromDOM();

    for (const t of towers) {
      const groupY = t.group.position.y;

      for (const b of t.blocks) {
        b.vy = 0;
        b.settled = false;
        b.active = false;

        // Start above the top edge in screen-space; higher blocks start higher
        b.startY = -groupY - (blockSizePx * 2) - Math.random() * 260 - b.targetY;
        b.y = b.startY;

        b.startScale = startScale;
        b.wrap.scale.set(startScale, startScale, startScale);
        b.wrap.visible = false;

        b.offX = 0; b.vX = 0;
        b.offR = 0; b.vR = 0;
      }
    }
  }

  function settleNow() {
    for (const t of towers) {
      for (const b of t.blocks) {
        b.settled = true;
        b.active = true;
        b.wrap.visible = true;
        b.y = b.targetY;
        b.vy = 0;
        b.wrap.scale.set(1, 1, 1);
      }
    }
  }

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
      for (const b of t.blocks) {
        if (!b.active && time >= b.startDelay) {
          b.active = true;
          b.wrap.visible = true;
        }

        // FALL + SCALE
        if (b.active && !b.settled) {
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

        // Hover drift physics (unchanged)
        const linDrag = 10.5;
        const rotDrag = 12.0;

        b.vX *= Math.exp(-linDrag * dt);
        b.offX += b.vX * dt;

        b.vR *= Math.exp(-rotDrag * dt);
        b.offR += b.vR * dt;

        // Clamp values
        const maxOffX = blockSizePx * 0.28;
        const maxOffR = 0.38;
        b.offX = clamp(b.offX, -maxOffX, maxOffX);
        b.offR = clamp(b.offR, -maxOffR, maxOffR);

        // 1. Position (Falling):
        // We move the 'wrap' because that is our Screen-Space container
        // We add b.offX here because that's "Screen Drift"
        b.wrap.position.set(
          b.targetX + b.offX,
          b.y,
          0
        );

        // 2. Rotation (Yaw):
        // We add b.offR (hover rotation) to the random base rotation
        // This spins the block on the "Tilted Table" axis
        b.yaw.rotation.y = b.rY + b.offR;
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // Snap trigger
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && e.intersectionRatio >= 0.65) {
        if (!hasPlayed) {
          hasPlayed = true;
          time = 0;
          replayDrop();
        }
      }

      if (!e.isIntersecting || e.intersectionRatio <= 0.05) {
        hasPlayed = false;
        replayDrop();
      }
    }
  }, { root: snapRoot, threshold: [0.05, 0.65] });

  io.observe(section);

  // Initial trigger if already visible
  requestAnimationFrame(() => {
    const r = section.getBoundingClientRect();
    const visible = (r.top < window.innerHeight * 0.35 && r.bottom > window.innerHeight * 0.65);

    if (visible && !hasPlayed) {
      hasPlayed = true;
      time = 0;
      replayDrop();
    }
  });
});
