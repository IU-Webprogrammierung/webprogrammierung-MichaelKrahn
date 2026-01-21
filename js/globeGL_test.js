// --- CONFIG ---
const config = {
    bg: 0xe0e0e0,
    globeColor: 0xffffff,
    cloudColor: 0xffffff
};

// --- 1. SETUP SCENE ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(config.bg);
scene.fog = new THREE.Fog(config.bg, 10, 50);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Better modern color / contrast
renderer.outputEncoding = THREE.sRGBEncoding; 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// Softer physically plausible lighting
renderer.physicallyCorrectLights = true;

// Shadows (soft)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);


// --- 2. LIGHTS ---
// Ambient (very soft)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

// Hemisphere (adds subtle sky/ground tint = modern look)
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0xf2efe9, 0.85);
scene.add(hemi);

// Key light (soft)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(6, 10, 12);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.radius = 4;
dirLight.shadow.bias = -0.0002;
scene.add(dirLight);

// --- 3. OBJECTS ---

// A. THE GLOBE

// --- A. THE GLOBE (use a wrapper group) ---
const globeGroup = new THREE.Group();
scene.add(globeGroup);

const globe = new ThreeGlobe()
    .showAtmosphere(true)
    .atmosphereColor("#9ad1ff")
    .atmosphereAltitude(0.12);

// Make the globe visible even without an image texture:
if (typeof globe.globeMaterial === "function") {
    const m = globe.globeMaterial();
    if (m?.color) m.color.set(0xffffff);
    // optional: helps in flat lighting
    if (m?.emissive) m.emissive.set(0x111111);
}
// Make globe surface feel like "water + glassy highlights"
if (typeof globe.globeMaterial === "function") {
    const m = globe.globeMaterial();

    // Base (water) tint
    if (m?.color) m.color.set("#f6f7fb");

    // Specular highlights (modern)
    if ("roughness" in m) m.roughness = 0.55;
    if ("metalness" in m) m.metalness = 0.08;

    // Optional subtle translucency (do not overdo, can look weird if too transparent)
    m.transparent = true;
    m.opacity = 0.92;

    // Slight emissive lift so it doesn't look dead in shadows
    if (m?.emissive) m.emissive.set("#0b0d12");
    if ("emissiveIntensity" in m) m.emissiveIntensity = 0.08;
}

globeGroup.add(globe);


// Set a stable visible size
globeGroup.scale.set(0.005, 0.005, 0.005);

(async function loadGlobeData() {
    // Countries topology
    const world = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json").then(r => r.json());
    const countries = topojson.feature(world, world.objects.countries).features;

    globe
        .polygonsData(countries)
        .polygonAltitude(0.012)
        .polygonCapColor(() => "rgba(15,15,18,0.10)")      // subtle land tint
        .polygonSideColor(() => "rgba(15,15,18,0.04)")
        .polygonStrokeColor(() => "rgba(20,20,25,0.18)")   // cleaner borders
        .polygonsTransitionDuration(250)
        .showAtmosphere(true)
        .atmosphereColor("#bfe3ff")
        .atmosphereAltitude(0.09);

    // Load city markers
    const cities = await loadVisitedCities();
    console.log("Loaded cities:", cities);

    globe
        .pointsData(cities)
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointAltitude(0.045)
        .pointRadius(0.18)
        .pointColor(() => "rgba(215, 176, 90, 0.95)") // muted gold


    // Optional labels (only if supported by your build/version)
    if (typeof globe.pointLabel === "function") {
        globe.pointLabel(d => d.name);
    }

})();

async function loadVisitedCities() {
    const res = await fetch("./data/cities.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load cities JSON: ${res.status} ${res.statusText}`);
    return await res.json();
}



// B. CLOUDS
const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

// Material first (must exist before meshes)
const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
});

const cloudGeo = new THREE.SphereGeometry(1.0, 24, 24);

// Create clouds with ORBIT params
const clouds = [];
for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);

    // random scale for variety
    const s = 0.7 + Math.random() * 0.9;
    cloud.scale.set(s, s , s);

    // Orbit parameters
    const radius = 7 + Math.random() * 2.0;
    const angle = Math.random() * Math.PI * 2;
    const yOff = (Math.random() - 0.5) * 2.2;
    const zFlat = 0.55 + Math.random() * 0.25;

    cloud.userData.orbit = { radius, angle, yOff, zFlat };
    cloud.userData.speed = 0.5 + Math.random();

    clouds.push(cloud);
    cloudGroup.add(cloud);
}

cloudGroup.position.set(0, 0, 6.5);
cloudGroup.rotation.set(0.15, 0, 0);

const orbitCtrl = {
    spin: 0.0,     // how much the ring has rotated around Y overall
    spread: 0.2,   // 0 = tight curtain, 1 = fully around globe
    offsetZ: 6.5,   // curtain distance
    tilt: 0.2     // ring tilt
};

// --- 4. ANIMATION SEQUENCE ---
gsap.registerPlugin(ScrollTrigger);

// We create a timeline mapped to the scrolling of the .scroller container
const scrollerEl = document.querySelector(".scroller");

const tl = gsap.timeline({
    scrollTrigger: {
        trigger: scrollerEl,
        scroller: scrollerEl,
        //start: 0,
        //end: () => scrollerEl.scrollHeight - scrollerEl.clientHeight,
        start: "top top",
        end: () => `+=${scrollerEl.scrollHeight - scrollerEl.clientHeight}`,
        scrub: 0.8,
        invalidateOnRefresh: true
    }
});

// --- STEP 1: HERO -> SECTION 2 (The Reveal) ---
// This happens while scrolling from Section 1 to Section 2.

// 3. CLOUDS: Move OUTSIDE (The "Parting" effect)
// We move the group closer to camera (Z) and spread them (Scale) 
// effectively making them fly past the viewer or to the edges.
tl.to(".hero-title", { opacity: 0, filter: "blur(20px)", duration: 1 }, 0);

// Stage 1: section 1 -> section 2
tl.to(globeGroup.scale, { x: 0.02, y: 0.02, z: 0.02, ease: "power2.out", duration: 2 }, 0);

// Stage 2: section 2 -> section 3 (slight growth)
tl.to(globeGroup.scale, { x: 0.03, y: 0.03, z: 0.03, ease: "power1.out", duration: 2 }, 2);

// Optional: Stage 3: section 3 -> section 4 (another slight growth)
tl.to(globeGroup.scale, { x: 0.035, y: 0.035, z: 0.035, ease: "power1.out", duration: 2 }, 4);


// Pull camera slightly in (helps the “zoom-out reveal” feeling)
tl.to(camera.position, { z: 14, duration: 2 }, 0);

// Clouds: from curtain -> orbiting ring
tl.to(orbitCtrl, { spread: 1, duration: 2, ease: "power2.out" }, 0);
tl.to(orbitCtrl, { offsetZ: 0.0, duration: 2, ease: "power2.out" }, 0); // bring ring to globe

// Add slow orbit rotation over the scroll range
tl.to(orbitCtrl, { spin: 1.2, duration: 4, ease: "none" }, 0);

// Keep clouds visible (no fade to 0). If you want slight fade:
tl.to(cloudMat, { opacity: 0.7, duration: 2 }, 0.3);


// --- STEP 2: SECTION 2 -> SECTION 3 (Interaction) ---
// Rotate the globe and zoom camera
tl.to(globe.rotation, { y: 2.5, duration: 2 }, 2);
tl.to(camera.position, { z: 12, duration: 2 }, 2);
tl.to(orbitCtrl, { spin: 2.4, duration: 2, ease: "none" }, 2);

// --- 5. RENDER LOOP ---
function animate() {

    requestAnimationFrame(animate);

    // optional idle globe rotation (keep small so scroll rotation still matters)
    globe.rotation.y += 0.002;

    // apply ring transforms
    cloudGroup.position.z = orbitCtrl.offsetZ;
    cloudGroup.rotation.x = orbitCtrl.tilt;
    cloudGroup.rotation.y = orbitCtrl.spin;

    // compute each cloud's orbital position
    clouds.forEach(c => {
        const o = c.userData.orbit;

        // spread: tighten at start, widen to full orbit
        // start radius smaller and move toward orbit radius
        const r = THREE.MathUtils.lerp(1.8, o.radius, orbitCtrl.spread);

        // angle advances a little for wobble/variation + global spin
        // keep some per-cloud motion even when scrubbed
        const sp = c.userData.speed ?? 1.0;
        o.angle += 0.002 * sp;

        const a = o.angle;

        c.position.x = Math.cos(a) * r;
        c.position.z = Math.sin(a) * r * o.zFlat;  // flattened ring depth
        c.position.y = THREE.MathUtils.lerp(0, o.yOff, orbitCtrl.spread);

        // subtle tumbling
        //c.rotation.x += c.userData.speed * 0.04;
        //c.rotation.y += c.userData.speed * 0.06;
    });
    renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(() => ScrollTrigger.refresh());
