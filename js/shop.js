/* ------------------------------
   Main KitchenAid Viewer
-------------------------------- */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


const scroller = document.getElementById("scroller");
const sections = Array.from(document.querySelectorAll(".snap-section[data-model]"));
const mainCanvas = document.getElementById("main3d");

const renderer = new THREE.WebGLRenderer({
    canvas: mainCanvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0.15, 3.3);

const hemi = new THREE.HemisphereLight(0xffffff, 0x0b1020, 0.9);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(2.5, 3, 2);
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.55);
fill.position.set(-2.5, 1.2, 1.5);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.45);
rim.position.set(0, 2.0, -3.5);
scene.add(rim);

const loader = new GLTFLoaderCtor();

const modelCache = new Map();

let activeIndex = 0;
let currentRoot = null;
let desiredRotY = 0;

// A subtle “platform” shadow feel (optional)
const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.25, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.95;
floor.visible = true;
scene.add(floor);

function disposeObject3D(obj) {
    obj.traverse((n) => {
        if (n.isMesh) {
            n.geometry?.dispose?.();
            if (Array.isArray(n.material)) {
                n.material.forEach((m) => m?.dispose?.());
            } else {
                n.material?.dispose?.();
            }
        }
    });
}

function loadGLB(url) {
    if (modelCache.has(url)) return Promise.resolve(modelCache.get(url).clone(true));

    return new Promise((resolve, reject) => {
        loader.load(
            url,
            (gltf) => {
                const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
                if (!root) return reject(new Error("No scene in GLB"));

                root.rotation.set(0, 0, 0);
                root.position.set(0, -0.85, 0);

                // Normalize
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
        new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1 })
    );
    mesh.position.y = -0.2;
    g.add(mesh);
    return g;
}

async function setActiveModel(index) {
    activeIndex = index;

    const url = sections[index]?.dataset?.model;
    if (!url) return;

    // Remove previous
    if (currentRoot) {
        scene.remove(currentRoot);
        disposeObject3D(currentRoot);
        currentRoot = null;
    }

    try {
        currentRoot = await loadGLB(url);
    } catch (e) {
        console.warn("Model load failed:", url, e);
        currentRoot = fallbackModel();
    }

    scene.add(currentRoot);
}

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
            powerPreference: "high-performance"
        });

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 20);
        this.camera.position.set(0, 0.15, 2.2);

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x101828, 0.9));
        const dl = new THREE.DirectionalLight(0xffffff, 0.9);
        dl.position.set(1.5, 2, 2);
        this.scene.add(dl);

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
                new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.35 })
            );
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

    // Smooth rotation (no jitter)
    if (currentRoot) {
        const current = currentRoot.rotation.y;
        const next = THREE.MathUtils.lerp(current, desiredRotY, 0.12);
        currentRoot.rotation.y = next;

        // Slight tilt looks premium
        currentRoot.rotation.x = THREE.MathUtils.lerp(currentRoot.rotation.x, -0.06, 0.06);
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
