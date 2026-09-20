/* ===== 05-bearing-3d.js — مدل سه‌بعدی بلبرینگ (Three.js) ===== */
/* ===== 3D BEARING (About page — Globe-style motion, bearing model) ===== */
const Bearing3D = {
    inited: false, renderer: null, scene: null, camera: null,
    bearing: null, balls: [], cage: [], seals: [], dust: null, markers: [],
    outer: null, inner: null,
    targetRX: -0.32, targetRY: 0.5, rotX: -0.32, rotY: 0.5,
    velX: 0, velY: 0, dragging: false, lastX: 0, lastY: 0,
    hovering: false, autoSpeed: 0.55, direction: 1, paused: false,
    explode: 1, explodeTarget: 1, zoom: 6.4, zoomTarget: 6.4,
    raf: 0, last: 0, rollAngle: 0, introDone: false
};

function ensureBearing3D() {
    const stage = document.getElementById('bearingStage');
    if (!stage) return;
    const fb = document.getElementById('bearingFallback');
    if (typeof THREE === 'undefined') {
        if (fb) { fb.style.display = 'flex'; }
        setTimeout(() => { if (typeof THREE !== 'undefined') ensureBearing3D(); }, 800);
        return;
    }
    if (!Bearing3D.inited) {
        try {
            initBearing3D();
        } catch (err) {
            // WebGL unavailable (disabled GPU, old device, blocked context):
            // keep the CSS fallback visible instead of breaking the page.
            Bearing3D.failed = true;
            console.warn('3D bearing disabled — WebGL unavailable:', err);
            if (fb) { fb.style.display = 'flex'; }
            return;
        }
    } else if (!Bearing3D.failed) {
        resizeBearing3D();
    }
}

function initBearing3D() {
    const stage = document.getElementById('bearingStage');
    if (!stage || Bearing3D.inited) return;
    const W = stage.clientWidth || 600, H = stage.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;
    }
    stage.insertBefore(renderer.domElement, stage.firstChild);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0.4, Bearing3D.zoom);
    camera.lookAt(0, 0, 0);

    /* neutral studio lighting — true metal colors, no color cast */
    scene.add(new THREE.HemisphereLight(0xe8eefb, 0x11151f, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(4, 6, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
    fill.position.set(-5, -1, 4);
    scene.add(fill);
    const rimBlue = new THREE.PointLight(0x9db8ff, 0.55, 30);
    rimBlue.position.set(-6, 2.5, -3);
    scene.add(rimBlue);
    const rimGold = new THREE.PointLight(0xffd9a0, 0.45, 30);
    rimGold.position.set(5, -3.5, 3.5);
    scene.add(rimGold);

    /* ---- natural studio environment for true metal reflections ---- */
    function makeStudioEnv() {
        const s = 64;
        function face(draw) {
            const c = document.createElement('canvas'); c.width = c.height = s;
            const x = c.getContext('2d');
            x.fillStyle = '#101725'; x.fillRect(0, 0, s, s); draw(x); return c;
        }
        function soft(x, px, py, w, h, a) {
            const g = x.createLinearGradient(px, 0, px + w, 0);
            g.addColorStop(0, 'rgba(255,255,255,0)');
            g.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            x.fillStyle = g; x.fillRect(px, py, w, h);
        }
        const imgs = [
            face(x => { soft(x, 6, 18, 52, 22, 0.95); }),
            face(x => { soft(x, 6, 18, 52, 22, 0.55); }),
            face(x => { x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(0, 0, s, s); }),
            face(x => { soft(x, 10, 40, 44, 10, 0.25); }),
            face(x => { soft(x, 4, 14, 26, 30, 0.8); soft(x, 34, 14, 26, 30, 0.8); }),
            face(x => { soft(x, 4, 14, 26, 30, 0.8); soft(x, 34, 14, 26, 30, 0.8); })
        ];
        const tex = new THREE.CubeTexture(imgs);
        tex.needsUpdate = true;
        return tex;
    }
    const studioEnv = makeStudioEnv();

    /* ---- natural material palette: chrome steel, brass, NBR rubber ---- */
    const steel = new THREE.MeshStandardMaterial({ color: 0xd6dce6, metalness: 1.0, roughness: 0.24, envMap: studioEnv, envMapIntensity: 1.25 });
    const steelRace = new THREE.MeshStandardMaterial({ color: 0xb9c2d2, metalness: 1.0, roughness: 0.16, envMap: studioEnv, envMapIntensity: 1.35 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.06, envMap: studioEnv, envMapIntensity: 1.5 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xa9853c, metalness: 1.0, roughness: 0.38, envMap: studioEnv, envMapIntensity: 1.0 });
    const brassDark = new THREE.MeshStandardMaterial({ color: 0x8a6c2c, metalness: 1.0, roughness: 0.48, envMap: studioEnv, envMapIntensity: 0.8 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1e2126, metalness: 0.05, roughness: 0.62 });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x00f7ff });

    /* laser-etched circular marking for the seal face */
    function makeSealMarking() {
        const c = document.createElement('canvas'); c.width = c.height = 512;
        const x = c.getContext('2d');
        x.fillStyle = '#1e2126'; x.fillRect(0, 0, 512, 512);
        x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 3;
        x.beginPath(); x.arc(256, 256, 200, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.arc(256, 256, 118, 0, Math.PI * 2); x.stroke();
        const txt = 'SKF · 6205-2RS · 25×52×15 · SWEDEN · ';
        x.fillStyle = '#c9d1de'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
        let ang = -Math.PI / 2;
        const step = (Math.PI * 2) / txt.length;
        for (let i = 0; i < txt.length; i++) {
            x.save();
            x.translate(256 + Math.cos(ang) * 159, 256 + Math.sin(ang) * 159);
            x.rotate(ang + Math.PI / 2);
            x.fillText(txt[i], 0, 0);
            x.restore();
            ang += step;
        }
        const t = new THREE.CanvasTexture(c);
        return t;
    }

    const bearing = new THREE.Group();

    /* ---- outer ring: lathed profile with raceway groove + chamfers ---- */
    function lathe(pts, mat, seg) {
        const v = pts.map(p => new THREE.Vector2(p[0], p[1]));
        const m = new THREE.Mesh(new THREE.LatheGeometry(v, seg || 128), mat);
        m.rotation.x = Math.PI / 2; /* axis -> Z (faces camera) */
        return m;
    }
    const outerProfile = [
        [1.90, -0.55], [2.30, -0.55], [2.58, -0.55],
        [2.72, -0.42], [2.76, -0.28], [2.765, 0], [2.76, 0.28],
        [2.72, 0.42], [2.58, 0.55], [2.30, 0.55], [1.90, 0.55],
        [1.90, 0.34], [1.925, 0.22], [1.955, 0.10], [1.968, 0],
        [1.955, -0.10], [1.925, -0.22], [1.90, -0.34], [1.90, -0.55]
    ];
    const outer = new THREE.Group();
    outer.add(lathe(outerProfile, steel));
    const outerGrooveRing = new THREE.Mesh(new THREE.TorusGeometry(1.945, 0.075, 14, 140), steelRace);
    outer.add(outerGrooveRing);
    bearing.add(outer);

    /* ---- inner ring: lathed with groove + chamfers ---- */
    const innerProfile = [
        [0.62, -0.50], [1.06, -0.50], [1.20, -0.44], [1.27, -0.32],
        [1.295, -0.20], [1.283, -0.10], [1.272, 0],
        [1.283, 0.10], [1.295, 0.20], [1.27, 0.32],
        [1.20, 0.44], [1.06, 0.50], [0.62, 0.50], [0.62, -0.50]
    ];
    const inner = new THREE.Group();
    inner.add(lathe(innerProfile, steel));
    const innerGrooveRing = new THREE.Mesh(new THREE.TorusGeometry(1.285, 0.06, 12, 120), steelRace);
    inner.add(innerGrooveRing);
    bearing.add(inner);

    /* ---- rubber seals: front etched, steel insert lips ---- */
    const sealGeo = new THREE.RingGeometry(1.30, 2.30, 96);
    const sealMarked = new THREE.MeshStandardMaterial({ map: makeSealMarking(), metalness: 0.05, roughness: 0.62 });
    const sealF = new THREE.Mesh(sealGeo, sealMarked);
    sealF.position.z = 0.52;
    const sealB = new THREE.Mesh(sealGeo, rubber);
    sealB.position.z = -0.52; sealB.rotation.y = Math.PI;
    const insertGeo = new THREE.TorusGeometry(2.31, 0.035, 10, 120);
    const steelInsert = new THREE.MeshStandardMaterial({ color: 0x6d7789, metalness: 1.0, roughness: 0.35, envMap: studioEnv, envMapIntensity: 1.0 });
    const lipF = new THREE.Mesh(insertGeo, steelInsert);
    lipF.position.z = 0.52;
    const lipB = new THREE.Mesh(insertGeo, lipF.material); lipB.position.z = -0.52;
    const dustLipGeo = new THREE.TorusGeometry(1.33, 0.03, 8, 110);
    const dustF = new THREE.Mesh(dustLipGeo, rubber); dustF.position.z = 0.52;
    const dustB = new THREE.Mesh(dustLipGeo, rubber); dustB.position.z = -0.52;
    bearing.add(sealF); bearing.add(sealB); bearing.add(lipF); bearing.add(lipB); bearing.add(dustF); bearing.add(dustB);

    /* ---- riveted brass cage: side rings + pillars + rivet heads ---- */
    const cageF = new THREE.Group(), cageB = new THREE.Group();
    const cageRingGeo = new THREE.RingGeometry(1.30, 1.94, 110);
    const cageSide = new THREE.MeshStandardMaterial({ color: 0xa9853c, metalness: 1.0, roughness: 0.4, envMap: studioEnv, envMapIntensity: 1.0, side: THREE.DoubleSide });
    const cf = new THREE.Mesh(cageRingGeo, cageSide); cf.position.z = 0.26; cageF.add(cf);
    const cb = new THREE.Mesh(cageRingGeo, cageSide); cb.position.z = -0.26; cageB.add(cb);
    const pillarGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.52, 12);
    const rivetGeo = new THREE.SphereGeometry(0.095, 14, 14);
    const N = 9;
    for (let i = 0; i < N; i++) {
        const a = ((i + 0.5) / N) * Math.PI * 2;
        const px = Math.cos(a) * 1.62, py = Math.sin(a) * 1.62;
        const pillar = new THREE.Mesh(pillarGeo, brass);
        pillar.rotation.x = Math.PI / 2; pillar.position.set(px, py, 0);
        cageF.add(pillar);
        const rF = new THREE.Mesh(rivetGeo, brassDark); rF.position.set(px, py, 0.28); cageF.add(rF);
        const rB = new THREE.Mesh(rivetGeo, brassDark); rB.position.set(px, py, -0.28); cageB.add(rB);
    }
    bearing.add(cageF); bearing.add(cageB);

    /* ---- chrome balls ---- */
    const balls = [];
    const ballGeo = new THREE.SphereGeometry(0.34, 32, 32);
    for (let i = 0; i < N; i++) {
        const m = new THREE.Mesh(ballGeo, chrome);
        m.userData.angle = (i / N) * Math.PI * 2;
        balls.push(m); bearing.add(m);
    }
    const markers = [];
    const markerGeo = new THREE.SphereGeometry(0.07, 12, 12);
    [0.5, 2.6, 4.7].forEach(a => {
        const mk = new THREE.Mesh(markerGeo, cyan);
        mk.userData.angle = a;
        markers.push(mk); bearing.add(mk);
    });

    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 320;
    const pos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        const r = 3.4 + Math.random() * 3.2;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(p) * Math.cos(t);
        pos[i * 3 + 1] = r * Math.cos(p) * 0.7;
        pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x8fb4ff, size: 0.035, transparent: true, opacity: 0.65 }));
    scene.add(dust);

    /* ---- cinematic showroom: turntable, glow ring, grid, orbit, sparks ---- */
    scene.fog = new THREE.FogExp2(0x050b18, 0.022);
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(4.8, 72),
        new THREE.MeshStandardMaterial({ color: 0x0a1326, metalness: 0.55, roughness: 0.55, transparent: true, opacity: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -3.15;
    scene.add(floor);
    const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(3.05, 3.55, 96),
        new THREE.MeshBasicMaterial({ color: 0xe8a81d, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = -3.06;
    scene.add(glowRing);
    const grid = new THREE.GridHelper(26, 26, 0x2f6bff, 0x18294e);
    grid.position.y = -3.18;
    grid.material.transparent = true; grid.material.opacity = 0.26;
    scene.add(grid);
    const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(3.7, 0.016, 8, 180),
        new THREE.MeshBasicMaterial({ color: 0x4a82ff, transparent: true, opacity: 0.55 })
    );
    orbit.rotation.x = Math.PI / 2 - 0.28;
    scene.add(orbit);
    const orbit2 = new THREE.Mesh(
        new THREE.TorusGeometry(4.3, 0.012, 8, 180),
        new THREE.MeshBasicMaterial({ color: 0xe8a81d, transparent: true, opacity: 0.35 })
    );
    orbit2.rotation.x = Math.PI / 2 + 0.22;
    scene.add(orbit2);
    const sweep = new THREE.PointLight(0xffffff, 1.5, 26);
    scene.add(sweep);
    const sparkGeo = new THREE.BufferGeometry();
    const sparkCount = 130;
    const spos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
        const r = 2.6 + Math.random() * 3.4;
        const t = Math.random() * Math.PI * 2;
        spos[i * 3] = Math.cos(t) * r;
        spos[i * 3 + 1] = -2.6 + Math.random() * 5.4;
        spos[i * 3 + 2] = Math.sin(t) * r;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xffd98a, size: 0.045, transparent: true, opacity: 0.8 }));
    scene.add(sparks);

    /* centered below the text — no side offset */
    const sideX = 0;
    bearing.position.x = sideX;

    scene.add(bearing);

    Object.assign(Bearing3D, { renderer, scene, camera, bearing, balls, markers, dust, sparks, floor, glowRing, orbit, orbit2, sweep, grid, sideX, outer, inner, seals: [sealF, sealB, lipF, lipB, dustF, dustB], cage: [cageF, cageB], inited: true });
    syncExplodeSlider();

    stage.addEventListener('pointerdown', (e) => {
        Bearing3D.dragging = true;
        Bearing3D.lastX = e.clientX; Bearing3D.lastY = e.clientY;
        Bearing3D.velX = 0; Bearing3D.velY = 0;
        try { stage.setPointerCapture && stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', (e) => {
        if (!Bearing3D.dragging) return;
        const dx = e.clientX - Bearing3D.lastX;
        const dy = e.clientY - Bearing3D.lastY;
        Bearing3D.lastX = e.clientX; Bearing3D.lastY = e.clientY;
        const s = 0.006;
        Bearing3D.targetRY += dx * s;
        Bearing3D.targetRX += dy * s;
        Bearing3D.targetRX = Math.max(-1.1, Math.min(1.1, Bearing3D.targetRX));
        Bearing3D.velY = dx * s * 0.35;
        Bearing3D.velX = dy * s * 0.35;
    });
    const endDrag = () => { Bearing3D.dragging = false; };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('mouseenter', () => { Bearing3D.hovering = true; });
    stage.addEventListener('mouseleave', () => { Bearing3D.hovering = false; });
    stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        Bearing3D.zoomTarget = Math.max(4.2, Math.min(11, Bearing3D.zoomTarget + (e.deltaY > 0 ? 0.6 : -0.6)));
    }, { passive: false });
    stage.addEventListener('dblclick', () => {
        Bearing3D.targetRX = -0.32; Bearing3D.targetRY = 0.5;
        Bearing3D.zoomTarget = 6.4; Bearing3D.explodeTarget = 0;
        syncBearingButtons(); syncExplodeSlider();
    });

    const dirBtn = document.getElementById('bearingDirBtn');
    const pauseBtn = document.getElementById('bearingPauseBtn');
    const expBtn = document.getElementById('bearingExplodeBtn');
    const zin = document.getElementById('bearingZoomIn');
    const zout = document.getElementById('bearingZoomOut');
    if (dirBtn) dirBtn.onclick = (e) => { e.stopPropagation(); Bearing3D.direction *= -1; dirBtn.classList.toggle('on'); };
    if (pauseBtn) pauseBtn.onclick = (e) => {
        e.stopPropagation();
        Bearing3D.paused = !Bearing3D.paused;
        pauseBtn.innerHTML = Bearing3D.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        pauseBtn.classList.toggle('on', Bearing3D.paused);
    };
    if (expBtn) expBtn.onclick = (e) => {
        e.stopPropagation();
        Bearing3D.explodeTarget = Bearing3D.explodeTarget > 0.5 ? 0 : 1;
        expBtn.classList.toggle('on', Bearing3D.explodeTarget > 0.5);
        syncExplodeSlider();
    };
    if (zin) zin.onclick = (e) => { e.stopPropagation(); Bearing3D.zoomTarget = Math.max(4.2, Bearing3D.zoomTarget - 0.8); };
    if (zout) zout.onclick = (e) => { e.stopPropagation(); Bearing3D.zoomTarget = Math.min(11, Bearing3D.zoomTarget + 0.8); };
    const expRange = document.getElementById('bearingExplodeRange');
    if (expRange) expRange.oninput = () => {
        Bearing3D.explodeTarget = (parseFloat(expRange.value) || 0) / 100;
        syncBearingButtons();
    };
    /* cinematic intro: starts fully open, assembles itself */
    if (!Bearing3D.introDone) {
        Bearing3D.introDone = true;
        Bearing3D.explode = 1; Bearing3D.explodeTarget = 1;
        Bearing3D.targetRY = 0.5 + Math.PI * 1.5; Bearing3D.rotY = 0.5 - Math.PI * 0.5;
        syncExplodeSlider();
        setTimeout(() => { Bearing3D.explodeTarget = 0; syncBearingButtons(); syncExplodeSlider(); }, 1500);
    }

    new ResizeObserver(() => resizeBearing3D()).observe(stage);
    const fb = document.getElementById('bearingFallback');
    if (fb) fb.style.display = 'none';
    Bearing3D.last = performance.now();
    requestAnimationFrame(bearingLoop);
}

function syncBearingButtons() {
    const expBtn = document.getElementById('bearingExplodeBtn');
    if (expBtn) expBtn.classList.toggle('on', Bearing3D.explodeTarget > 0.5);
}

function syncExplodeSlider() {
    const r = document.getElementById('bearingExplodeRange');
    if (r) r.value = Math.round((Bearing3D.explodeTarget || 0) * 100);
}

function resizeBearing3D() {
    const stage = document.getElementById('bearingStage');
    if (!stage || !Bearing3D.renderer) return;
    const W = stage.clientWidth || 600, H = stage.clientHeight || 520;
    Bearing3D.renderer.setSize(W, H);
    Bearing3D.camera.aspect = W / H;
    Bearing3D.camera.updateProjectionMatrix();
    Bearing3D.sideX = 0;
    if (Bearing3D.bearing) Bearing3D.bearing.position.x = 0;
}

function bearingLoop(now) {
    requestAnimationFrame(bearingLoop);
    if (!Bearing3D.inited) return;
    const stage = document.getElementById('bearingStage');
    if (!stage || stage.closest('.page-section.hidden')) return;
    const dt = Math.min((now - Bearing3D.last) / 1000, 0.1) || 0.016;
    Bearing3D.last = now;

    if (!Bearing3D.dragging) {
        if (Math.abs(Bearing3D.velY) > 0.0004 || Math.abs(Bearing3D.velX) > 0.0004) {
            Bearing3D.targetRY += Bearing3D.velY;
            Bearing3D.targetRX += Bearing3D.velX;
            Bearing3D.velY *= 0.94; Bearing3D.velX *= 0.94;
        } else if (!Bearing3D.paused && !Bearing3D.hovering) {
            Bearing3D.targetRY += Bearing3D.autoSpeed * Bearing3D.direction * dt;
        }
    }
    const k = 1 - Math.pow(0.0015, dt);
    Bearing3D.rotY += (Bearing3D.targetRY - Bearing3D.rotY) * k;
    Bearing3D.rotX += (Bearing3D.targetRX - Bearing3D.rotX) * k;
    Bearing3D.bearing.rotation.y = Bearing3D.rotY;
    Bearing3D.bearing.rotation.x = Bearing3D.rotX;

    if (!Bearing3D.paused) Bearing3D.rollAngle += dt * 1.4 * Bearing3D.direction;
    const ex = Bearing3D.explode + (Bearing3D.explodeTarget - Bearing3D.explode) * Math.min(1, dt * 4);
    Bearing3D.explode = ex;
    const spread = 1.62 + ex * 0.9;
    Bearing3D.balls.forEach((b) => {
        const a = b.userData.angle + Bearing3D.rollAngle * 0.55;
        b.position.set(Math.cos(a) * spread, Math.sin(a) * spread, ex * 0.15);
        b.rotation.y += dt * 2; b.rotation.x += dt;
    });
    Bearing3D.markers.forEach((m) => {
        const a = m.userData.angle + Bearing3D.rollAngle * 0.55;
        m.position.set(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.58 + ex * 1.4);
    });
    if (Bearing3D.outer) Bearing3D.outer.position.z = ex * 1.8;
    if (Bearing3D.inner) Bearing3D.inner.position.z = -ex * 1.8;
    if (Bearing3D.seals.length >= 6) {
        Bearing3D.seals[0].position.z = 0.52 + ex * 2.7;
        Bearing3D.seals[2].position.z = 0.52 + ex * 2.7;
        Bearing3D.seals[4].position.z = 0.52 + ex * 2.7;
        Bearing3D.seals[1].position.z = -0.52 - ex * 2.7;
        Bearing3D.seals[3].position.z = -0.52 - ex * 2.7;
        Bearing3D.seals[5].position.z = -0.52 - ex * 2.7;
    }
    Bearing3D.cage.forEach((c, i) => { c.position.z = (i === 0 ? ex * 0.85 : -ex * 0.85); c.rotation.z = Bearing3D.rollAngle * 0.55; });
    if (Bearing3D.dust) Bearing3D.dust.rotation.y += dt * 0.03;

    /* ---- cinematic showroom motion ---- */
    const t = now / 1000;
    if (Bearing3D.bearing && Bearing3D.sideX !== undefined) {
        Bearing3D.bearing.position.x += (Bearing3D.sideX - Bearing3D.bearing.position.x) * Math.min(1, dt * 3);
        Bearing3D.bearing.position.y = Math.sin(t * 0.55) * 0.09;
    }
    if (Bearing3D.glowRing) {
        Bearing3D.glowRing.rotation.z += dt * 0.25;
        Bearing3D.glowRing.material.opacity = 0.38 + Math.sin(t * 1.6) * 0.14;
    }
    if (Bearing3D.orbit) Bearing3D.orbit.rotation.z -= dt * 0.12;
    if (Bearing3D.orbit2) Bearing3D.orbit2.rotation.z += dt * 0.08;
    if (Bearing3D.sweep) {
        Bearing3D.sweep.position.set(Math.cos(t * 0.7) * 6.5, 2.5 + Math.sin(t * 0.9) * 2, Math.sin(t * 0.7) * 6.5);
    }
    if (Bearing3D.sparks) {
        Bearing3D.sparks.rotation.y -= dt * 0.05;
        Bearing3D.sparks.position.y = Math.sin(t * 0.4) * 0.15;
    }
    if (Bearing3D.grid) Bearing3D.grid.material.opacity = 0.22 + Math.sin(t * 0.8) * 0.06;

    Bearing3D.zoom += (Bearing3D.zoomTarget - Bearing3D.zoom) * Math.min(1, dt * 5);
    Bearing3D.camera.position.z = Bearing3D.zoom;
    Bearing3D.camera.position.y = 0.4 + Math.sin(t * 0.5) * 0.12;
    Bearing3D.camera.lookAt(0, 0, 0);
    Bearing3D.renderer.render(Bearing3D.scene, Bearing3D.camera);
}
