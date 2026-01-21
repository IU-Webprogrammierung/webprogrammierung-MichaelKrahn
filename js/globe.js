/* =====================================================
   GLOBE + Clouds
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // --- CONFIGURATION ---
    const config = {
        bg: 0xe0e0e0, 
        globeColor: 0xffffff,
        cloudColor: 0xffffff,
    };

    // --- 1. SETUP THREE.JS SCENE ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    // Note: We don't set background color here if we want CSS to handle it, 
    // but for Fog to work, we need to match it.
    scene.fog = new THREE.Fog(config.bg, 10, 50);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    // Initial Camera Position (Looking at CV section state)
    camera.position.set(0, 0, 20); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // --- 2. LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // --- 3. OBJECTS ---

    // A. The Globe
    const globeGeo = new THREE.SphereGeometry(3.5, 64, 64);
    const globeMat = new THREE.MeshStandardMaterial({ 
        color: config.globeColor, 
        roughness: 0.6 
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.castShadow = true;
    globe.receiveShadow = true;
    
    // INITIAL STATE (For CV Section):
    // Pushed to the RIGHT (x: 12) and Invisible (scale: 0) initially
    // We will fade it in when CV appears.
    globe.position.set(12, 0, 0); 
    globe.scale.set(0,0,0); 
    scene.add(globe);

    // B. Clouds
    const cloudGroup = new THREE.Group();
    // Position clouds around the globe's initial position
    cloudGroup.position.set(6, 0, 6); 
    
    const cloudGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const cloudMat = new THREE.MeshStandardMaterial({ 
        color: config.cloudColor, 
        roughness: 0.9,
        transparent: true,
        opacity: 0.0 // Start invisible
    });

    const clouds = [];
    for (let i = 0; i < 12; i++) {
        const cloud = new THREE.Mesh(cloudGeo, cloudMat);
        
        // Initial "Cluster/Curtain" Formation
        cloud.position.set(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 4,
            (Math.random() * 4) // Varied depth
        );

        // Store target "Orbit" data for later
        cloud.userData = {
            angle: Math.random() * Math.PI * 2,
            radius: 7 + Math.random() * 2,
            yOff: (Math.random() - 0.5) * 2,
            speed: 0.002 + Math.random() * 0.002
        };

        clouds.push(cloud);
        cloudGroup.add(cloud);
    }
    scene.add(cloudGroup);


    // --- 4. GSAP SCROLL TRIGGERS ---
    gsap.registerPlugin(ScrollTrigger);

    // Helper to control orbit spread
    const orbitCtrl = { spread: 0 }; // 0 = Cluster, 1 = Orbit Ring

    // --- PHASE 1: ENTERING CV SECTION ---
    // Action: Fade in Globe on the RIGHT side.
    ScrollTrigger.create({
        trigger: "#cv",
        start: "top center", 
        end: "bottom center",
        onEnter: () => {
            gsap.to(globe.scale, { x: 1, y: 1, z: 1, duration: 1.5, ease: "power2.out" });
            gsap.to(cloudMat, { opacity: 0.9, duration: 1.5 });
            // Ensure position is Right
            gsap.to(globe.position, { x: 12, y: 0, duration: 2 });
            gsap.to(cloudGroup.position, { x: 12, duration: 2 });
        },
        onLeaveBack: () => {
            // If we scroll back up to Projects, hide globe
            gsap.to(globe.scale, { x: 0, y: 0, z: 0, duration: 1 });
            gsap.to(cloudMat, { opacity: 0, duration: 1 });
        }
    });

    // --- PHASE 2: CV -> GLOBE SECTION (The Reveal) ---
    // Action: Move Globe to CENTER, "Explode" Clouds.
    // We attach this to the #globe section entering.
    
    // We use a Timeline scrubbed by the transition space between CV and Globe
    // OR simply trigger it when #globe hits center.
    // Given Snap Scroll, a "scrub" might feel jerky. Let's use a smooth animation trigger.
    
    ScrollTrigger.create({
        trigger: "#globe",
        start: "top 60%", // Starts slightly before section hits top
        onEnter: () => {
            // 1. Move everything to Center
            gsap.to(globe.position, { x: 0, duration: 2, ease: "power3.inOut" });
            gsap.to(cloudGroup.position, { x: 0, z: 0, duration: 2, ease: "power3.inOut" });
            
            // 2. Explode Clouds (Cluster -> Orbit)
            gsap.to(orbitCtrl, { spread: 1, duration: 2.5, ease: "power2.out" });

            // 3. Camera Zoom effect
            gsap.to(camera.position, { z: 16, duration: 2 });
        },
        onLeaveBack: () => {
            // Go back to CV state (Right side, Clustered)
            gsap.to(globe.position, { x: 6, duration: 2, ease: "power3.inOut" });
            gsap.to(cloudGroup.position, { x: 6, z: 6, duration: 2, ease: "power3.inOut" });
            gsap.to(orbitCtrl, { spread: 0, duration: 2 });
            gsap.to(camera.position, { z: 20, duration: 2 });
        }
    });

    // --- PHASE 3: GLOBE -> CONTACT SECTION ---
    // Action: Move Globe to LEFT, maybe dim it.
    ScrollTrigger.create({
        trigger: "#contact",
        start: "top 60%",
        onEnter: () => {
            // Move Left
            gsap.to(globe.position, { x: -12, duration: 1.5, ease: "power2.inOut" });
            gsap.to(cloudGroup.position, { x: -12, duration: 1.5, ease: "power2.inOut" });
            // Optional: Dim slightly so form is readable
            gsap.to(cloudMat, { opacity: 0.4, duration: 1 });
        },
        onLeaveBack: () => {
            // Go back to Center
            gsap.to(globe.position, { x: 0, duration: 1.5, ease: "power2.inOut" });
            gsap.to(cloudGroup.position, { x: 0, duration: 1.5, ease: "power2.inOut" });
            gsap.to(cloudMat, { opacity: 0.9, duration: 1 });
        }
    });


    // --- 5. RENDER LOOP ---
    function animate() {
        requestAnimationFrame(animate);

        // Constant Rotation
        globe.rotation.y += 0.001;
        cloudGroup.rotation.y += 0.0005;

        // Dynamic Cloud Positioning based on 'orbitCtrl.spread'
        // 0 = Cluster (Random pos), 1 = Orbit (Ring)
        clouds.forEach((c, i) => {
            // Current "Cluster" position (we just use the initial random positions logic vaguely here)
            // Ideally, we stored initial positions. For simplicity, let's just lerp to Orbit.
            
            const u = c.userData;
            const time = Date.now() * 0.0001;
            
            if(orbitCtrl.spread > 0.01) {
                // Calculate Orbit Position
                const angle = u.angle + time; // Moving orbit
                const r = u.radius;
                
                const targetX = Math.cos(angle) * r;
                const targetZ = Math.sin(angle) * r;
                const targetY = u.yOff;

                // We technically need to LERP from their "Cluster" position to this "Orbit" position
                // But since the group moves and we didn't save exact cluster coords in a retrievable way for lerp in loop,
                // we can rely on GSAP animating the `spread` value to transition logic.
                
                // Hacky but effective: 
                // When spread is 0, they are at (0,0,0) relative to group + noise? 
                // Let's just Apply Orbit Logic scaled by Spread.
                
                c.position.x = THREE.MathUtils.lerp(c.position.x, targetX, 0.05 * orbitCtrl.spread);
                c.position.z = THREE.MathUtils.lerp(c.position.z, targetZ, 0.05 * orbitCtrl.spread);
                c.position.y = THREE.MathUtils.lerp(c.position.y, targetY, 0.05 * orbitCtrl.spread);
                
                // Face Camera-ish
                c.lookAt(camera.position);
            }
        });

        renderer.render(scene, camera);
    }
    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

});