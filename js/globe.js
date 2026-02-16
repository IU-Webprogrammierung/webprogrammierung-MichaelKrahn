/* =====================================================
   GLOBE + Clouds
===================================================== */
gsap.registerPlugin(ScrollTrigger);

// Scene state
const sceneState = {
    reveal: 0,     // 0 → 1 : clouds open + exposure rises
    approach: 0,   // 0 → 1 : camera moves in
    explore: 0,    // 0 → 1 : orbit & parallax
    depart: 0      // 0 → 1 : fade away
};

const sceneParams = {
    spin: 0.0,      // Ring rotation
    spread: 0.2,    // Cloud spread
    offsetZ: 6.5,   // Cloud distance
    tilt: 0.2,      // Ring tilt
    exposure: 1.0,  // Controls scene brightness
    starY: 0        // Controls star movement
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

// SKY SPHERE (dark sky behind globe)
//const skyGeo = new THREE.SphereGeometry(50, 32, 32);
//const skyMat = new THREE.MeshBasicMaterial({ color: 0x1a1f28, side: THREE.BackSide });
//const skyMesh = new THREE.Mesh(skyGeo, skyMat);
//scene.add(skyMesh);

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
//renderer.setClearColor(0xffffff, 0); // white background, alpha=0
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




// --- 3. OBJECTS ---

// STARFIELD
const starCount = 1000; // reduced for performance
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 60;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    size: 0.12,
    sizeAttenuation: true,
    map: (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'white'); grad.addColorStop(0.2, 'white');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.6)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
        const t = new THREE.Texture(c); t.needsUpdate = true; return t;
    })(),
    alphaTest: 0.1
});
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

// A. THE GLOBE

// --- A. THE GLOBE (LAYERED)  ---
const globeRig = new THREE.Group();     // cinematic position
const globeOrbit = new THREE.Group();   // scroll rotation
const globeIdle = new THREE.Group();    // constant rotation

scene.add(globeRig);
globeRig.add(globeOrbit);
globeOrbit.add(globeIdle);

const globe = new ThreeGlobe()
    .showAtmosphere(true)
    .atmosphereColor("#9ad1ff")
    .atmosphereAltitude(0.12);

globeIdle.add(globe);
globeRig.scale.set(0.005, 0.005, 0.005);

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
/* ============================================================
   LOAD DATA
============================================================ */

(async function loadGlobeData() {
    try {
        // 1. Load Topology
        const worldTopo = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json").then(r => r.json());
        const countries = topojson.feature(worldTopo, worldTopo.objects.countries).features;

        // 2. Load Visited Countries (Safe Mode)
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
            .polygonAltitude(0.012)
            .polygonCapColor(f => visitedDataSet.has(String(f.id))
                ? "rgba(40,120,220,0.20)"
                : "rgba(15,15,18,0.10)")
            .polygonSideColor(f => visitedDataSet.has(String(f.id))
                ? "rgba(40,120,220,0.08)"
                : "rgba(15,15,18,0.04)")
            .polygonStrokeColor(f => visitedDataSet.has(String(f.id))
                ? "rgba(50,160,250,0.36)"
                : "rgba(20,20,25,0.18)")
            .polygonsTransitionDuration(250);

        // 3. Load Cities
        try {
            const citiesRes = await fetch("./data/cities.json", { cache: "no-store" });
            if (citiesRes.ok) {
                const cities = await citiesRes.json();
                globe
                    .pointsData(cities)
                    .pointLat(d => d.lat)
                    .pointLng(d => d.lng)
                    .pointAltitude(0.075)
                    .pointRadius(0.24)
                    .pointColor(() => "rgba(215, 176, 90, 0.95)");
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

const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, opacity: 0.9, depthWrite: false });
const cloudGeo = new THREE.SphereGeometry(1.0, 12, 12); // fewer segments for perf

const clouds = [];
for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(cloudGeo, cloudMat);
    const s = 0.7 + Math.random() * 0.9; c.scale.set(s, s, s);
    const radius = 7 + Math.random() * 2, angle = Math.random() * Math.PI * 2, yOff = (Math.random() - 0.5) * 2.2, zFlat = 0.55 + Math.random() * 0.25;
    c.userData = { radius, baseAngle: angle, yOff, zFlat, speed: 0.2 + Math.random() * 0.4 };
    clouds.push(c); cloudOrbit.add(c);
}
cloudRig.position.set(0, 0, 6.5); cloudOrbit.rotation.set(0.15, 0, 0);

// Create clouds with ORBIT params
for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);

    // random scale for variety
    const s = 0.7 + Math.random() * 0.9;
    cloud.scale.set(s, s, s);

    // Orbit parameters
    const radius = 7 + Math.random() * 2.0;
    const angle = Math.random() * Math.PI * 2;
    const yOff = (Math.random() - 0.5) * 2.2;
    const zFlat = 0.55 + Math.random() * 0.25;

    cloud.userData = {
        radius,
        baseAngle: angle,
        yOff,
        zFlat,
        speed: 0.2 + Math.random() * 0.4
    };

    clouds.push(cloud);
    cloudOrbit.add(cloud);
}

cloudRig.position.set(0, 0, 6.5);
cloudOrbit.rotation.set(0.15, 0, 0);

// VEIL OVERLAY (for light-page darkening)
const veilUniforms = { dark: { value: 0 } };
const veilMat = new THREE.ShaderMaterial({
    uniforms: veilUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy,0.,1.); }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform float dark;
        void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, dark);
        }
    `
});
const veilMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), veilMat);
const veilScene = new THREE.Scene();
const veilCamera = new THREE.Camera();
veilScene.add(veilMesh);



// --- ANIMATION LOOP (optimized, frame-rate independent) ---
const clock = new THREE.Clock();
function animate() {
    const time = clock.getElapsedTime();

    // STARFIELD
    starField.position.y = sceneParams.starY * 0.5;
    starField.rotation.y += 0.0005;

    // GLOBE + CLOUDS
    globeIdle.rotation.y += 0.002;
    cloudRig.rotation.y += 0.005;

    clouds.forEach((c, i) => {
        const o = c.userData;
        const a = o.baseAngle + sceneParams.spin * o.speed;
        const r = THREE.MathUtils.lerp(1.8, o.radius, sceneParams.spread);
        c.position.x = Math.cos(a) * r;
        c.position.z = Math.sin(a) * r * o.zFlat;
        c.position.y = THREE.MathUtils.lerp(0, o.yOff, sceneParams.spread) + Math.sin(time + i) * 0.18;
        c.rotation.y += 0.01; c.rotation.x = Math.sin(time * 2 + i) * 0.25; c.rotation.z = Math.cos(time * 1.5 + i) * 0.15;
    });

    camera.position.z = THREE.MathUtils.lerp(20, 11.5, sceneState.approach) + sceneState.depart * 5.0;

    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.render(veilScene, veilCamera); // apply darkening
    renderer.autoClear = true;

    requestAnimationFrame(animate);
}
animate();




// Section 1: Hero title fades
gsap.timeline({
    scrollTrigger: {
        trigger: "#globe-1",
        start: "top top",
        end: "bottom top",
        scrub: 0.8
    }
})
    .fromTo(globeRig.scale,
        { x: 0.010, y: 0.010, z: 0.010 },
        { x: 0.04, y: 0.04, z: 0.04, ease: "power2.out" },
        0
    )
    .fromTo(cameraRig.position,
        { z: 18 },
        { z: 10, ease: "power2.out" },
        0
    )
    .fromTo(sceneParams,
        { spread: 0.05, offsetZ: 6.5, spin: 0.0 },
        { spread: 0.9, offsetZ: 1.0, spin: 0.6, ease: "power2.out" },
        0
    )
    .to(".hero-title", { y: -120, autoAlpha: 0, filter: "blur(18px)", ease: "power2.out" }, 0.55);


// Section 2: left copy enters
gsap.timeline({
    scrollTrigger: {
        trigger: "#globe-2",
        start: "top top",
        end: "bottom top",
        scrub: 0.8,
        onLeaveBack: () => gsap.to(veilUniforms.dark, { value: 0, ease:"power1.inOut" }),
        onLeave: () => gsap.to(veilUniforms.dark, { value: 0, ease:"power1.inOut" })
    }
})
    .fromTo("#globe-2 .copy-block",
        { autoAlpha: 0, y: 24, filter: "blur(10px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", ease: "power2.out" },
        0
    )
    .to(globeRig.rotation, { y: "+=1.2", ease: "none" }, 0)
    .to(cloudMat, { opacity: 0.65, ease: "power1.out" }, 0)

    .to(veilUniforms.dark, { value: 0.50, ease: "power1.inOut" }) // adjust darkness

    .to(sceneParams, {
        spin: "+=0.8",
        exposure: 0.3, // Lowers brightness (Dark mode)
        starY: -10,    // Moves stars (Parallax)
        ease: "power2.inOut",
        duration: 1,
    }, 0);

// Section 3: right copy enters
gsap.timeline({
    scrollTrigger: {
        trigger: "#globe-3",
        start: "top top",
        end: "bottom top",
        scrub: 0.8
    }
})
    .fromTo("#globe-3 .copy-block",
        { autoAlpha: 0, y: 24, filter: "blur(10px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", ease: "power2.out" },
        0
    )
    .to(globeRig.rotation, { y: "+=1.2", ease: "none" }, 0)
    .to(sceneParams, {
        spin: "+=0.8",
        exposure: 0.3, // Lowers brightness (Dark mode)
        starY: -10,    // Moves stars (Parallax)
        ease: "power2.inOut",
        duration: 1
    }, 0);


gsap.timeline({
    scrollTrigger: {
        trigger: "#globe-4",
        start: "top top",
        end: "bottom top",
        scrub: 0.8,
        onLeaveBack: () => gsap.to(veilUniforms.dark, { value: 0, ease: "power1.inOut" }),
        onLeave: () => gsap.to(veilUniforms.dark, { value: 0, ease: "power1.inOut" })
    }
})
    .to("#globe-4", { autoAlpha: 1 }, 0)
    .to(globeRig.scale, { x: 0.018, y: 0.018, z: 0.018, ease: "power2.inOut" }, 0)
    .to(cameraRig.position, { z: 16, ease: "power2.inOut" }, 0)
    .to(sceneParams, { spread: 0.25, offsetZ: 5.0, ease: "power2.inOut" }, 0)
    .to(cloudMat, { opacity: 0.25, ease: "power2.inOut" }, 0.1);








// OLD but working....    
function setGlobeVisible(on) {
    const globeEl = document.getElementById("globe");
    if (!globeEl) return;
    globeEl.style.opacity = on ? "1" : "0";
}

ScrollTrigger.create({
    trigger: "#globe-1",
    start: "top 80%",
    end: "bottom top",
    onEnter: () => setGlobeVisible(true),
    onEnterBack: () => setGlobeVisible(true)
});




// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(() => ScrollTrigger.refresh());
