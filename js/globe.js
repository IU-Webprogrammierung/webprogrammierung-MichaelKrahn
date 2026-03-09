/* =====================================================
   GLOBE + Clouds
===================================================== */
gsap.registerPlugin(ScrollTrigger);

// Scene state
const sceneState = {
    reveal: 0,
    approach: 0,
    explore: 0,
    depart: 0
};

const sceneParams = {
    spin: 0.0,
    spread: 0.2,
    offsetZ: 6.5,
    tilt: 0.2,
    exposure: 1.0,
    starY: 0
};

// Renderer + scene
const canvas = document.getElementById("globeCanvas");
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 10, 50);

// SCROLLER
const scrollerEl = document.querySelector("#main");
ScrollTrigger.defaults({
    scroller: scrollerEl
});
window.addEventListener("load", () => ScrollTrigger.refresh());

// CAMERA RIG
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const cameraRig = new THREE.Group();
const cameraOrbit = new THREE.Group();
cameraRig.add(cameraOrbit);
cameraOrbit.add(camera);
scene.add(cameraRig);
camera.position.set(0, 0, 20);

// RENDERER
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// LIGHTS
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0xf2efe9, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(6, 10, 12);
scene.add(dirLight);

// STARFIELD
const starCount = 1000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 60;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

const createStarTexture = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'white');
    grad.addColorStop(0.2, 'white');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
};

const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    size: 0.12,
    sizeAttenuation: true,
    map: createStarTexture(),
    alphaTest: 0.1
});
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

// THE GLOBE
const globeRig = new THREE.Group();
const globeOrbit = new THREE.Group();
const globeIdle = new THREE.Group();

scene.add(globeRig);
globeRig.add(globeOrbit);
globeOrbit.add(globeIdle);

// APPLY REAL EARTH TILT (23.5 degrees)
globeRig.rotation.z = 23.5 * (Math.PI / 180);

const globe = new ThreeGlobe()
    .showAtmosphere(true)
    .atmosphereColor("#9ad1ff")
    .atmosphereAltitude(0.12);

globeIdle.add(globe);
globeRig.scale.set(0.06, 0.06, 0.06);
globeRig.position.set(0, 0, 0);

// CREATE TRUE 3D GLOW
const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const grad = ctx.createRadialGradient(128, 128, 64, 128, 128, 128);
    // Adjust these colors if you want a warmer or cooler glow!
    grad.addColorStop(0, 'rgba(154, 209, 255, 0.35)'); // Inner glow
    grad.addColorStop(1, 'rgba(154, 209, 255, 0.0)');  // Fade out
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.Texture(canvas);
};

const glowMat = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending, // Makes it behave like real light
    depthWrite: false
});
const globeGlow = new THREE.Sprite(glowMat);
// Since globe radius is ~6 (100 * 0.06), scale sprite to wrap around it beautifully
globeGlow.scale.set(22, 22, 1); 
globeRig.add(globeGlow); // Attached to Rig, so it follows the globe perfectly!

if (typeof globe.globeMaterial === "function") {
    const m = globe.globeMaterial();
    if (m?.color) m.color.set("#f6f7fb");
    if ("roughness" in m) m.roughness = 0.55;
    if ("metalness" in m) m.metalness = 0.08;
    m.transparent = true;
    m.opacity = 0.92;
    if (m?.emissive) m.emissive.set("#0b0d12");
    if ("emissiveIntensity" in m) m.emissiveIntensity = 0.08;
}

// LOAD DATA
(async function loadGlobeData() {
    try {
        let worldTopo;

        try {
            // 1. Try fetching the local file first
            const localRes = await fetch("./data/countries-110m.json");
            if (!localRes.ok) throw new Error("Local fetch failed");
            worldTopo = await localRes.json();
        } catch (localErr) {
            console.warn("Local topology missing, falling back to CDN...", localErr);

            // 2. Fallback to unpkg if the local file is missing/fails
            const cdnRes = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json");
            if (!cdnRes.ok) throw new Error("CDN fetch failed");
            worldTopo = await cdnRes.json();
        }

        const countries = topojson.feature(worldTopo, worldTopo.objects.countries).features;

        let visitedDataSet = new Set();
        try {
            const visitedRes = await fetch("./data/countries.json", { cache: "no-store" });
            if (visitedRes.ok) {
                const visitedJSON = await visitedRes.json();
                (visitedJSON.visited || []).forEach(code => {
                    visitedDataSet.add(String(code));
                });
            }
        } catch (e) {
            console.warn("Could not load ./data/countries.json, defaulting to empty list.");
        }

        globe
            .polygonsData(countries)
            // 1. Altitude: Nice visible pop for visited
            .polygonAltitude(f => visitedDataSet.has(String(f.id))
                ? 0.020
                : 0.010)

            // 2. Cap Color: Crisp off-white (visited) vs. Sleek dark gray (unvisited)
            .polygonCapColor(f => visitedDataSet.has(String(f.id))
                ? "rgba(246, 246, 248, 0.90)" // Fixed typo, slight transparency for lighting
                : "rgba(20, 22, 26, 0.75)")   // Dark, but not totally pitch black

            // 3. Side Color: Crucial for the 3D minimalist aesthetic
            .polygonSideColor(f => visitedDataSet.has(String(f.id))
                ? "rgba(200, 200, 202, 0.80)" // Light gray sides for visited depth
                : "rgba(10, 12, 15, 0.60)")   // Very dark sides for unvisited depth

            // 4. Stroke Color: Defines the borders
            .polygonStrokeColor(f => visitedDataSet.has(String(f.id))
                ? "rgba(255, 255, 255, 1.0)"  // Pure white borders for visited
                : "rgba(45, 49, 57, 0.50)")   // Subtle lighter gray borders for unvisited

            .polygonsTransitionDuration(0);

        try {
            const citiesRes = await fetch("./data/cities.json", { cache: "no-store" });
            if (citiesRes.ok) {
                const cities = await citiesRes.json();
                globe
                    .pointsData(cities)
                    .pointLat(d => d.lat)
                    .pointLng(d => d.lng)
                    .pointAltitude(0.085)
                    .pointRadius(0.20)
                    //.pointColor(() => "rgba(215, 176, 90, 0.95)");
                    .pointColor(() => "rgba(255, 255, 255, 1.0)");
            }
        } catch (e) {
            console.warn("Could not load cities.json");
        }

    } catch (err) {
        console.error("Critical error loading globe data:", err);
    }
})();




// CLOUDS
const cloudRig = new THREE.Group();
const cloudOrbit = new THREE.Group();
const cloudIdle = new THREE.Group();
scene.add(cloudRig); cloudRig.add(cloudOrbit); cloudOrbit.add(cloudIdle);

const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, opacity: 0.6, depthWrite: false });
const cloudGeo = new THREE.SphereGeometry(1.0, 12, 12);

const clouds = [];

for (let i = 0; i < 24; i++) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    const s = 1.2 + Math.random() * 2.0;
    cloud.scale.set(s, s, s);
    
    const radius = 14 + Math.random() * 12.0; 
    const angle = Math.random() * Math.PI * 2;
    const yOff = (Math.random() - 0.5) * 12.0;
    const zFlat = 0.55 + Math.random() * 0.25;

    cloud.userData = { radius, baseAngle: angle, yOff, zFlat, speed: 0.2 + Math.random() * 0.4 };
    clouds.push(cloud);
    cloudOrbit.add(cloud);
}

cloudRig.position.set(0, 0, 0);
cloudOrbit.rotation.set(0.15, 0, 0);


// VISIBILITY TRACKING
let isGlobeVisible = false;
let globeAnimationId = null;

const globeSections = ['#globe-1', '#globe-2', '#globe-3', '#globe-4', '#contact'];

globeSections.forEach((sectionId, index) => {
    ScrollTrigger.create({
        trigger: sectionId,
        start: "top bottom",
        end: "bottom top",
        onEnter: () => {
            isGlobeVisible = true;
            setGlobeContainerVisible(true);
            startGlobeAnimation();
        },
        onLeave: () => {
            if (!isAnyGlobeSectionVisible()) {
                isGlobeVisible = false;
                setGlobeContainerVisible(false);
                stopGlobeAnimation();
            }
        },
        onEnterBack: () => {
            isGlobeVisible = true;
            setGlobeContainerVisible(true);
            startGlobeAnimation();
        },
        onLeaveBack: () => {
            if (!isAnyGlobeSectionVisible()) {
                isGlobeVisible = false;
                setGlobeContainerVisible(false);
                stopGlobeAnimation();
            }
        }
    });
});

function isAnyGlobeSectionVisible() {
    return globeSections.some(selector => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    });
}

function startGlobeAnimation() {
    if (!globeAnimationId) {
        animate();
    }
}

function stopGlobeAnimation() {
    if (globeAnimationId) {
        cancelAnimationFrame(globeAnimationId);
        globeAnimationId = null;
    }
}

// ANIMATION LOOP
const clock = new THREE.Clock();
let lastTime = 0;

function animate(currentTime) {
    globeAnimationId = requestAnimationFrame(animate);

    if (!isGlobeVisible) {
        return;
    }

    const time = clock.getElapsedTime();

    starField.position.y = sceneParams.starY * 0.5;
    starField.rotation.y += 0.0005;

    globeIdle.rotation.y += 0.002;
    cloudRig.rotation.y += 0.005;

    clouds.forEach((c, i) => {
        const o = c.userData;
        const a = o.baseAngle + sceneParams.spin * o.speed;
        const r = o.radius * sceneParams.spread;

        c.position.x = Math.cos(a) * r;
        c.position.z = Math.sin(a) * r * o.zFlat;
        c.position.y = (o.yOff * sceneParams.spread) + Math.sin(time + i) * 0.18;

        c.rotation.y += 0.01;
        c.rotation.x = Math.sin(time * 2 + i) * 0.25;
        c.rotation.z = Math.cos(time * 1.5 + i) * 0.15;
    });

    renderer.render(scene, camera);
}

function setGlobeContainerVisible(visible) {
    const globeEl = document.getElementById("globe");
    if (!globeEl) return;
    globeEl.style.opacity = visible ? "1" : "0";
}

window.addEventListener("DOMContentLoaded", () => {
    if (isAnyGlobeSectionVisible()) {
        isGlobeVisible = true;
        setGlobeContainerVisible(true);
        startGlobeAnimation();
    }
});














// Section 1: Fly through clouds to center stage
gsap.timeline({
    scrollTrigger: { trigger: "#globe-1", start: "top 75%", end: "bottom top", scrub: 0.8 }
})
    .fromTo(camera.position, 
        { z: 90 }, 
        { z: 30, ease: "power2.out" }, 
        0
    )
    .fromTo(cameraRig.position, 
        { x: 0, y: 0 }, 
        { x: 0, y: 0, ease: "power2.out" }, // Centered reveal
        0
    )
    .fromTo(sceneParams,
        { spread: 0.2, spin: 0.0 }, 
        { spread: 1.2, spin: 0.4, ease: "power2.out" }, // Clouds part
        0
    )
    .to(".hero-title", { y: -120, autoAlpha: 0, filter: "blur(18px)", ease: "power2.out" }, 0.55)
    .to("#vignette-overlay", { opacity: 1, ease: "power2.out" }, 0);


// Section 2: Globe on the Right Border (2/3rds visible)
gsap.timeline({
    scrollTrigger: { trigger: "#globe-2", start: "top 75%", end: "bottom top", scrub: 0.8 }
})
    .fromTo("#globe-2 .copy-block", 
        { autoAlpha: 0, y: 40, filter: "blur(12px)" }, 
        { autoAlpha: 1, y: 0, filter: "blur(0px)", ease: "power2.out", duration: 0.3 }, 
        0
    )
    .to(cameraOrbit.rotation, { y: 1.2, ease: "none" }, 0) 
    .to(camera.position, { z: 40, ease: "power1.inOut" }, 0) 
    // Moving the camera LEFT (-20) pushes the globe visually to the RIGHT
    .to(cameraRig.position, { x: -20, y: 0, ease: "power2.inOut" }, 0) 
    .to(sceneParams, { spin: "+=0.6", duration: 1 }, 0); 


// Section 3: Transition & Rotation (Optional framing adjust)
gsap.timeline({
    scrollTrigger: { trigger: "#globe-3", start: "top 75%", end: "bottom top", scrub: 0.8 }
})
    .fromTo("#globe-3 .copy-block", 
        { autoAlpha: 0, y: 40, filter: "blur(12px)" }, 
        { autoAlpha: 1, y: 0, filter: "blur(0px)", ease: "power2.out", duration: 0.3 }, 
        0
    )
    .to(cameraOrbit.rotation, { y: 2.4, ease: "none" }, 0) 
    .to(camera.position, { z: 22, ease: "power2.inOut" }, 0) 
    // Drift back toward center to prepare for final drop
    .to(cameraRig.position, { x: 0, y: -1.0, ease: "power2.inOut" }, 0) 
    .to(sceneParams, { spread: 1.5, ease: "power2.inOut" }, 0); 


// Section 4: Globe against the Lower Border
gsap.timeline({
    scrollTrigger: { trigger: "#globe-4", start: "top 75%", end: "bottom top", scrub: 0.8 }
})
    .to("#globe-4", { autoAlpha: 1 }, 0)
    .to(cameraOrbit.rotation, { y: 3.4, ease: "none" }, 0) 
    .to(camera.position, { z: 18, ease: "power2.inOut" }, 0) // Nice tight crop
    // Moving camera UP (+5.0) pushes the globe to the BOTTOM edge of the screen
    .to(cameraRig.position, { x: 0, y: 5.0, ease: "power2.inOut" }, 0) 
    .to(cloudMat, { opacity: 0.15, ease: "power2.inOut" }, 0);











// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(() => ScrollTrigger.refresh());
