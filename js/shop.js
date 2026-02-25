/* ------------------------------
   Main KitchenAid Viewer
   - Fixed GLB cleanup
   - Smoother rotation
   - Improved lighting
-------------------------------- */

import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


const scroller = document.getElementById("scroller");
const sections = Array.from(document.querySelectorAll(".snap-section[data-model]"));
const mainCanvas = document.getElementById("main3d");

const loader = new GLTFLoader();

const renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.2
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0.15, 3.3);

/* ------------------------------
   Premium Studio Lighting Setup
-------------------------------- */

// 1. Base Environment Light (Drastically reduced to let shadows live)
// We removed AmbientLight entirely. The Hemisphere light gives a slight color gradient to the shadows.
const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.05);
scene.add(hemi);

// 2. Key Light (The sun/main studio strobe)
// Increased intensity, moved slightly to cast a more dramatic angle
const key = new THREE.DirectionalLight(0xfff5e6, 0.5);
key.position.set(4, 5, 3);
key.castShadow = true;

// 3. Shadow Camera Tightening (CRITICAL FOR GOOD SHADOWS)
key.shadow.mapSize.width = 2048;
key.shadow.mapSize.height = 2048;
// Tightly wrap the shadow camera around the mixer to concentrate resolution
key.shadow.camera.left = -2;
key.shadow.camera.right = 2;
key.shadow.camera.top = 2;
key.shadow.camera.bottom = -2;
key.shadow.camera.near = 0.1;
key.shadow.camera.far = 15;
key.shadow.bias = -0.0005; // Helps prevent shadow acne/striping
scene.add(key);

// 4. Fill Light (Softens the pitch-black shadows on the unlit side)
// Keep intensity low to maintain the 3D contrast
const fill = new THREE.DirectionalLight(0xe6f0ff, 0.075);
fill.position.set(-4, 2, 2);
scene.add(fill);

// 5. Rim / Backlight (Separates the model from the background)
// High intensity, positioned behind and above
const rim = new THREE.DirectionalLight(0xffffff, 0.25);
rim.position.set(0, 4, -4);
scene.add(rim);

// Point light for highlights
//const highlight = new THREE.PointLight(0xffffff, 0.5, 10);
//highlight.position.set(2, 1, 2);
//scene.add(highlight);

const modelCache = new Map();

let activeIndex = 0;
let currentRoot = null;
let desiredRotY = 0;

// Shadow-receiving visible platform (Raised higher)
const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 96),
    new THREE.MeshStandardMaterial({
        color: 0xf6f6f8,
        roughness: 0.7,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.65; // Raised from -0.95
floor.receiveShadow = true;
floor.visible = true;
scene.add(floor);

// Environment map for reflections
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Create a simple gradient environment
function createEnvironment() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Make the base environment DARK. 
    // This stops it from acting like a massive ambient light and washing out shadows.
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 1024, 512);

    // 2. Paint bright "Studio Softbox Lights" for specular reflections
    ctx.fillStyle = '#ffffff';
    ctx.filter = 'blur(10px)'; // Soften the edges

    // Left, Right, and Backlight softboxes
    ctx.fillRect(150, 100, 200, 150);
    ctx.fillRect(650, 100, 200, 150);
    ctx.fillRect(400, 300, 200, 100);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

scene.environment = createEnvironment();

/* ------------------------------
   GLB Loading & Cleanup
-------------------------------- */

function disposeObject3D(obj) {
    if (!obj) return;

    obj.traverse((n) => {
        if (n.isMesh) {
            if (n.geometry) {
                n.geometry.dispose();
            }
            if (n.material) {
                if (Array.isArray(n.material)) {
                    n.material.forEach((m) => {
                        if (m) {
                            m.dispose();
                            if (m.map) m.map.dispose();
                            if (m.normalMap) m.normalMap.dispose();
                            if (m.roughnessMap) m.roughnessMap.dispose();
                            if (m.metalnessMap) m.metalnessMap.dispose();
                        }
                    });
                } else {
                    n.material.dispose();
                    if (n.material.map) n.material.map.dispose();
                    if (n.material.normalMap) n.material.normalMap.dispose();
                    if (n.material.roughnessMap) n.material.roughnessMap.dispose();
                    if (n.material.metalnessMap) n.material.metalnessMap.dispose();
                }
            }
        }
    });
}

function loadGLB(url) {
    if (modelCache.has(url)) {
        const cached = modelCache.get(url).clone(true);

        // Enable shadows on cloned model
        cached.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Improve material quality
                if (child.material) {
                    // Boost environment reflections to make it look premium/shiny
                    child.material.envMapIntensity = 2.0;
                    child.material.needsUpdate = true;
                }
            }
        });

        return Promise.resolve(cached);
    }

    return new Promise((resolve, reject) => {
        loader.load(
            url,
            (gltf) => {
                const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                if (!root) return reject(new Error("No scene in GLB"));

                // Enable shadows
                // Enable shadows, enhance materials, and SMOOTH vertices
                root.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Force Three.js to calculate smooth surface normals
                        if (child.geometry) {
                            child.geometry.computeVertexNormals();
                        }

                        // Enhance materials and disable flat shading
                        if (child.material) {
                            child.material.flatShading = false; // Ensures smooth curves
                            child.material.envMapIntensity = 2.0;
                            child.material.needsUpdate = true;
                        }
                    }
                });

                root.rotation.set(0, 0, 0);
                root.position.set(0, -0.67, 0);

                // Normalize size
                const box = new THREE.Box3().setFromObject(root);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const target = 1.9;
                root.scale.setScalar(target / maxDim);

                // Center
                box.setFromObject(root);
                const center = new THREE.Vector3();
                box.getCenter(center);
                root.position.x -= center.x;
                root.position.z -= center.z;

                modelCache.set(url, root);
                resolve(root.clone(true));
            },
            undefined,
            (err) => reject(err)
        );
    });
}


function fallbackModel() {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
            roughness: 0.5,
            metalness: 0.2,
            envMapIntensity: 1.0
        })
    );
    mesh.position.y = -0.2;
    mesh.castShadow = true;
    g.add(mesh);
    return g;
}

/* ------------------------------
   Active Model Management
-------------------------------- */
let loadSessionId = 0; // Tracks the current active load

async function setActiveModel(index) {
    activeIndex = index;
    const currentSession = ++loadSessionId; // Increment session on every scroll trigger

    const url = sections[index]?.dataset?.model;
    if (!url) return;

    // Remove previous model (but DO NOT dispose it, so our cache stays intact)
    if (currentRoot) {
        scene.remove(currentRoot);
        currentRoot = null;
    }

    try {
        const loadedRoot = await loadGLB(url);

        // CRITICAL: If the user scrolled away while this was loading, discard it!
        if (currentSession !== loadSessionId) return;

        currentRoot = loadedRoot;
        scene.add(currentRoot);
    } catch (e) {
        console.warn("Model load failed:", url, e);
        if (currentSession === loadSessionId) {
            currentRoot = fallbackModel();
            scene.add(currentRoot);
        }
    }
}


/* ------------------------------
   Contact Section GLB Cleanup
-------------------------------- */

// Track when user scrolls to contact section
const contactSection = document.getElementById('contact');
// Update the contact observer to just remove, not dispose
let contactObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            if (currentRoot) {
                scene.remove(currentRoot);
                // Removed disposeObject3D(currentRoot) here as well
                currentRoot = null;
                floor.visible = false;
            }
        } else if (!entry.isIntersecting && sections.length > 0) {
            floor.visible = true;
            const activeSection = sections[activeIndex];
            if (activeSection?.dataset?.model && !currentRoot) {
                setActiveModel(activeIndex);
            }
        }
    });
}, { threshold: 0.5 });

if (contactSection) {
    contactObserver.observe(contactSection);
}

/* ------------------------------
   Section Progress Tracking
-------------------------------- */

function getSectionProgress(section) {
    // Progress 0..1 across the section's scroll window
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh;           // section just below viewport
    const end = -rect.height;   // section scrolled past
    const t = (start - rect.top) / (start - end);
    return Math.min(1, Math.max(0, t));
}

/* ------------------------------
   Fade + active section tracking
-------------------------------- */

const io = new IntersectionObserver((entries) => {
    // Choose the most visible section as active
    let best = { idx: activeIndex, ratio: 0 };

    for (const entry of entries) {
        const idx = sections.indexOf(entry.target);
        if (idx >= 0) {
            entry.target.classList.toggle("is-active", entry.isIntersecting);
            if (entry.intersectionRatio > best.ratio) best = { idx, ratio: entry.intersectionRatio };
        }
    }

    if (best.idx !== activeIndex) {
        setActiveModel(best.idx);
    }
}, {
    root: scroller,
    threshold: [0.15, 0.25, 0.35, 0.5, 0.65, 0.8]
});

sections.forEach(s => io.observe(s));

/* ------------------------------
   Accessory Viewers (per section)
   Runs only when section active
-------------------------------- */

class AccessoryViewer {
    constructor(canvas, modelUrl) {
        this.canvas = canvas;
        this.url = modelUrl;
        this.running = false;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2
        });

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 20);
        this.camera.position.set(0, 0.15, 2.2);

        // Improved lighting for accessory
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x101828, 0.6);
        this.scene.add(hemiLight);

        const dl = new THREE.DirectionalLight(0xffffff, 1.0);
        dl.position.set(1.5, 2, 2);
        this.scene.add(dl);

        const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4);
        fillLight.position.set(-1.5, 1, 1);
        this.scene.add(fillLight);

        this.root = null;
        this._raf = null;
    }

    async init() {
        try {
            const gltf = await new Promise((resolve, reject) => {
                loader.load(this.url, resolve, undefined, reject);
            });

            this.root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
            this.root.rotation.set(0, 0, 0);
            this.root.position.set(0, -0.25, 0);

            // Enable shadows
            this.root.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Improve materials
                    if (child.material) {
                        child.material.envMapIntensity = 1.0;
                    }
                }
            });

            // Normalize size
            const box = new THREE.Box3().setFromObject(this.root);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const target = 1.15;
            const s = target / maxDim;
            this.root.scale.setScalar(s);

            box.setFromObject(this.root);
            const center = new THREE.Vector3();
            box.getCenter(center);
            this.root.position.x -= center.x;
            this.root.position.z -= center.z;

            this.scene.add(this.root);
        } catch (e) {
            // fallback
            const mesh = new THREE.Mesh(
                new THREE.TorusKnotGeometry(0.45, 0.14, 120, 16),
                new THREE.MeshStandardMaterial({
                    roughness: 0.35,
                    metalness: 0.35,
                    envMapIntensity: 1.0
                })
            );
            mesh.castShadow = true;
            this.root = mesh;
            this.scene.add(mesh);
        }
    }

    start() {
        if (this.running) return;
        this.running = true;

        const loop = () => {
            if (!this.running) return;
            this._raf = requestAnimationFrame(loop);

            if (this.root) {
                // Smoother rotation
                this.root.rotation.y += 0.015;
                this.root.rotation.x = 0.15;
            }
            this.renderer.render(this.scene, this.camera);
        };

        loop();
    }

    stop() {
        this.running = false;
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = null;
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }
}

const accessoryViewers = [];

async function initAccessories() {
    for (const section of sections) {
        const canvas = section.querySelector(".acc-canvas");
        const url = section.dataset.accessory;
        if (!canvas || !url) continue;

        const viewer = new AccessoryViewer(canvas, url);
        accessoryViewers.push({ section, viewer });

        await viewer.init();
        viewer.resize();
    }
}

/* ------------------------------
   Scroll-driven rotation + overlay
-------------------------------- */

let ticking = false;

function updateFromScroll() {
    ticking = false;

    const activeSection = sections[activeIndex];
    if (!activeSection) return;

    const p = getSectionProgress(activeSection);
    desiredRotY = p * Math.PI * 2; // full rotation per section

    // Overlay after half rotation
    activeSection.classList.toggle("show-overlay", p >= 0.5);

    // Accessory canvases: run only for active section
    for (const { section, viewer } of accessoryViewers) {
        if (section === activeSection) viewer.start();
        else viewer.stop();
    }
}

scroller.addEventListener("scroll", () => {
    if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateFromScroll);
    }
}, { passive: true });

/* ------------------------------
   Render loop (main viewer)
-------------------------------- */

function animate() {
    requestAnimationFrame(animate);

    // Smooth rotation with increased lerp factor for smoother animation
    if (currentRoot) {
        const current = currentRoot.rotation.y;
        // Increased from 0.12 to 0.08 for smoother/slower rotation
        const next = THREE.MathUtils.lerp(current, desiredRotY, 0.08);
        currentRoot.rotation.y = next;

        // Slight tilt looks premium - smoother interpolation
        const targetTilt = -0.06;
        currentRoot.rotation.x = THREE.MathUtils.lerp(currentRoot.rotation.x, targetTilt, 0.04);
    }

    renderer.render(scene, camera);
}

function onResize() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    for (const { viewer } of accessoryViewers) viewer.resize();
}

window.addEventListener("resize", onResize);

/* ------------------------------
   Navbar scroll behavior
-------------------------------- */

const nav = document.getElementById('nav');
let lastScrollY = 0;

function updateNav() {
    const scrollY = scroller.scrollTop;

    if (scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    lastScrollY = scrollY;
}

scroller.addEventListener('scroll', updateNav, { passive: true });

/* ------------------------------
   Boot
-------------------------------- */

(async function boot() {
    // Mark first section active immediately
    sections[0]?.classList.add("is-active");
    await setActiveModel(0);

    await initAccessories();

    // Initial compute for overlay/rotation/accessories
    updateFromScroll();

    animate();
})();


let currentLang = 'en';

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'de' : 'en';

    // Update all elements with data-en and data-de attributes
    document.querySelectorAll('[data-en][data-de]').forEach(el => {
        el.textContent = el.getAttribute(`data-${currentLang}`);
    });

    // Update placeholders
    document.querySelectorAll('[data-placeholder-en][data-placeholder-de]').forEach(el => {
        el.placeholder = el.getAttribute(`data-placeholder-${currentLang}`);
    });

    // Update CTA buttons in sections
    document.querySelectorAll('.cta').forEach(el => {
        if (el.hasAttribute('data-en') && el.hasAttribute('data-de')) {
            el.textContent = el.getAttribute(`data-${currentLang}`);
        }
    });

    // Update language toggle button
    const langToggle = document.querySelector('.lang-toggle');
    langToggle.innerHTML = currentLang === 'en' ? '<span class="lang-flag">🇩🇪</span>' : '<span class="lang-flag">🇬🇧</span>';

    // Save preference
    localStorage.setItem('shopLang', currentLang);
}

// Expose toggleLanguage to global scope so it can be called from HTML onclick
window.toggleLanguage = toggleLanguage;

// Load saved language preference
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('shopLang');
    if (savedLang) {
        currentLang = savedLang;
        // Trigger the toggle to apply saved language
        if (savedLang === 'de') {
            toggleLanguage();
        }
    }
});
