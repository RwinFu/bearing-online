/* ===== 05-bearing-3d.js — مدل سه‌بعدی بلبرینگ (Three.js) ===== */
/* ===== 3D BEARING (About page — Globe-style motion, bearing model) ===== */
const Bearing3D = {
    inited: false, renderer: null, scene: null, camera: null,
    bearing: null, balls: [], cage: [], seals: [], dust: null, markers: [],
    outer: null, inner: null,
    targetRX: -0.32, targetRY: 0.5, rotX: -0.32, rotY: 0.5,
    velX: 0, velY: 0, dragging: false, lastX: 0, lastY: 0,
    hovering: false, autoSpeed: 0.18, direction: 1, paused: false,
    explode: 0, explodeTarget: 0, zoom: 10, zoomTarget: 10, view: 'open', onScreen: true, time: 0,
    raf: 0, last: 0, rollAngle: 0, introDone: false
};

function ensureBearing3D() {
    const stage = document.getElementById('bearingStage');
    if (!stage || Bearing3D.failed) return;
    const fb = document.getElementById('bearingFallback');
    if (typeof THREE === 'undefined') {
        if (fb) { fb.style.display = 'flex'; }
        showBearingFallback();
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
            showBearingFallback();
            return;
        }
    } else if (!Bearing3D.failed) {
        resizeBearing3D();
        updateBearingVisibility();
    }
}

function initBearing3D() {
    const stage = document.getElementById('bearingViewport');
    if (!stage || Bearing3D.inited) return;
    const W = stage.clientWidth || 600, H = stage.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2));
    if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
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
        const s = 128;
        function face(draw) {
            const c = document.createElement('canvas'); c.width = c.height = s;
            const x = c.getContext('2d');
            x.fillStyle = '#1c2738'; x.fillRect(0, 0, s, s); x.scale(2, 2); draw(x); return c;
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
    const steel = new THREE.MeshStandardMaterial({ color: 0xd6dce6, metalness: 1.0, roughness: 0.2, envMap: studioEnv, envMapIntensity: 1.25 });
    const steelRace = new THREE.MeshStandardMaterial({ color: 0xb9c2d2, metalness: 1.0, roughness: 0.16, envMap: studioEnv, envMapIntensity: 1.35 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.06, envMap: studioEnv, envMapIntensity: 1.5 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xcba453, metalness: 1.0, roughness: 0.38, envMap: studioEnv, envMapIntensity: 1.0 });
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
        const txt = '6205 · 25×52×15 · BEARING ONLINE · ';
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
        [2.13, -0.75], [2.49, -0.75], [2.60, -0.64], [2.60, 0.64],
        [2.49, 0.75], [2.13, 0.75], [2.10, 0.58], [2.10, 0.32],
        [2.15, 0.16], [2.18, 0], [2.15, -0.16], [2.10, -0.32], [2.10, -0.58], [2.13, -0.75]
    ];
    const outer = new THREE.Group();
    outer.add(lathe(outerProfile, steel));
    const outerGrooveRing = new THREE.Mesh(new THREE.TorusGeometry(2.16, 0.025, 14, 140), steelRace);
    outer.add(outerGrooveRing);
    bearing.add(outer);

    /* ---- inner ring: lathed with groove + chamfers ---- */
    const innerProfile = [
        [1.25, -0.64], [1.34, -0.75], [1.57, -0.75], [1.62, -0.60],
        [1.62, -0.32], [1.56, -0.16], [1.53, 0], [1.56, 0.16],
        [1.62, 0.32], [1.62, 0.60], [1.57, 0.75], [1.34, 0.75], [1.25, 0.64], [1.25, -0.64]
    ];
    const inner = new THREE.Group();
    inner.add(lathe(innerProfile, steel));
    const innerGrooveRing = new THREE.Mesh(new THREE.TorusGeometry(1.54, 0.025, 12, 120), steelRace);
    inner.add(innerGrooveRing);
    bearing.add(inner);

    /* ---- rubber seals: front etched, steel insert lips ---- */
    const sealGeo = new THREE.RingGeometry(1.61, 2.14, 96);
    const sealMarked = new THREE.MeshStandardMaterial({ map: makeSealMarking(), metalness: 0.05, roughness: 0.62, side: THREE.DoubleSide });
    const sealF = new THREE.Mesh(sealGeo, sealMarked);
    sealF.position.z = 0.52;
    const sealB = new THREE.Mesh(sealGeo, rubber);
    sealB.position.z = -0.52; sealB.rotation.y = Math.PI;
    const insertGeo = new THREE.TorusGeometry(2.14, 0.025, 10, 120);
    const steelInsert = new THREE.MeshStandardMaterial({ color: 0x6d7789, metalness: 1.0, roughness: 0.35, envMap: studioEnv, envMapIntensity: 1.0 });
    const lipF = new THREE.Mesh(insertGeo, steelInsert);
    lipF.position.z = 0.52;
    const lipB = new THREE.Mesh(insertGeo, lipF.material); lipB.position.z = -0.52;
    const dustLipGeo = new THREE.TorusGeometry(1.62, 0.025, 8, 110);
    const dustF = new THREE.Mesh(dustLipGeo, rubber); dustF.position.z = 0.52;
    const dustB = new THREE.Mesh(dustLipGeo, rubber); dustB.position.z = -0.52;
    bearing.add(sealF); bearing.add(sealB); bearing.add(lipF); bearing.add(lipB); bearing.add(dustF); bearing.add(dustB);

    /* ---- riveted brass cage: side rings + pillars + rivet heads ---- */
    const cageF = new THREE.Group(), cageB = new THREE.Group();
    const cageRingGeo = new THREE.TorusGeometry(1.85, 0.045, 8, 96);
    const cageSide = new THREE.MeshStandardMaterial({ color: 0xcba453, metalness: 1.0, roughness: 0.4, envMap: studioEnv, envMapIntensity: 1.0, side: THREE.DoubleSide });
    const cf = new THREE.Mesh(cageRingGeo, cageSide); cf.position.z = 0.26; cageF.add(cf);
    const cb = new THREE.Mesh(cageRingGeo, cageSide); cb.position.z = -0.26; cageB.add(cb);
    const pillarGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.52, 12);
    const rivetGeo = new THREE.SphereGeometry(0.095, 14, 14);
    const N = 9;
    for (let i = 0; i < N; i++) {
        const a = ((i + 0.5) / N) * Math.PI * 2;
        const px = Math.cos(a) * 1.85, py = Math.sin(a) * 1.85;
        const pillar = new THREE.Mesh(pillarGeo, brass);
        pillar.rotation.x = Math.PI / 2; pillar.position.set(px, py, 0);
        cageF.add(pillar);
        const rF = new THREE.Mesh(rivetGeo, brassDark); rF.position.set(px, py, 0.28); cageF.add(rF);
        const rB = new THREE.Mesh(rivetGeo, brassDark); rB.position.set(px, py, -0.28); cageB.add(rB);
    }
    bearing.add(cageF); bearing.add(cageB);

    /* ---- chrome balls ---- */
    const balls = [];
    const ballGeo = new THREE.SphereGeometry(0.30, 32, 24);
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
        mk.visible = false; markers.push(mk); bearing.add(mk);
    });

    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 70;
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
    const sparkCount = 36;
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
    Bearing3D.paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setBearingView('open');

    stage.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        stage.focus({ preventScroll: true });
        wakeBearing3D();
        Bearing3D.dragging = true;
        Bearing3D.lastX = e.clientX; Bearing3D.lastY = e.clientY;
        Bearing3D.velX = 0; Bearing3D.velY = 0;
        try { stage.setPointerCapture && stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener('pointermove', (e) => {
        if (!Bearing3D.dragging) return;
        wakeBearing3D();
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
    const endDrag = () => { Bearing3D.dragging = false; wakeBearing3D(); };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('lostpointercapture', endDrag);
    stage.addEventListener('mouseenter', () => { Bearing3D.hovering = true; });
    stage.addEventListener('mouseleave', () => { Bearing3D.hovering = false; });
    // Never trap the page's normal scroll gesture inside the viewer.
    stage.addEventListener('dblclick', resetBearingView);
    stage.addEventListener('keydown', event => {
        const moves = { ArrowLeft: [0, -0.15], ArrowRight: [0, 0.15], ArrowUp: [-0.15, 0], ArrowDown: [0.15, 0] };
        if (moves[event.key]) {
            event.preventDefault();
            Bearing3D.targetRX = Math.max(-1.1, Math.min(1.1, Bearing3D.targetRX + moves[event.key][0]));
            Bearing3D.targetRY += moves[event.key][1];
        } else if (['+', '=', '-'].includes(event.key)) {
            event.preventDefault();
            Bearing3D.zoomTarget = Math.max(7, Math.min(15, Bearing3D.zoomTarget + (event.key === '-' ? 0.8 : -0.8)));
        } else if (event.key === 'Home') { event.preventDefault(); resetBearingView(); }
        else return;
        wakeBearing3D();
    });
    renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        Bearing3D.failed = true;
        cancelAnimationFrame(Bearing3D.raf);
        Bearing3D.raf = 0;
        showBearingFallback();
    });

    const dirBtn = document.getElementById('bearingDirBtn');
    const pauseBtn = document.getElementById('bearingPauseBtn');
    const expBtn = document.getElementById('bearingExplodeBtn');
    const zin = document.getElementById('bearingZoomIn');
    const zout = document.getElementById('bearingZoomOut');
    if (dirBtn) dirBtn.onclick = (e) => { e.stopPropagation(); Bearing3D.direction *= -1; dirBtn.classList.toggle('on'); wakeBearing3D(); };
    if (pauseBtn) pauseBtn.onclick = (e) => {
        e.stopPropagation();
        Bearing3D.paused = !Bearing3D.paused;
        pauseBtn.innerHTML = Bearing3D.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        syncBearingButtons();
        wakeBearing3D();
    };
    if (expBtn) expBtn.onclick = (e) => {
        e.stopPropagation();
        setBearingView(Bearing3D.explodeTarget > 0.5 ? 'open' : 'exploded');
    };
    if (zin) zin.onclick = (e) => { e.stopPropagation(); Bearing3D.zoomTarget = Math.max(7, Bearing3D.zoomTarget - 0.8); wakeBearing3D(); };
    if (zout) zout.onclick = (e) => { e.stopPropagation(); Bearing3D.zoomTarget = Math.min(15, Bearing3D.zoomTarget + 0.8); wakeBearing3D(); };
    document.getElementById('bearingResetBtn').onclick = resetBearingView;
    const expRange = document.getElementById('bearingExplodeRange');
    if (expRange) expRange.oninput = () => {
        Bearing3D.explodeTarget = (parseFloat(expRange.value) || 0) / 100;
        Bearing3D.view = Bearing3D.explodeTarget > 0 ? 'exploded' : 'open';
        Bearing3D.seals.forEach(seal => seal.visible = Bearing3D.explodeTarget > 0);
        syncBearingButtons();
        syncExplodeSlider();
        wakeBearing3D();
    };
    // A calm open view shows the raceways immediately; no timer overrides user input.
    syncBearingButtons();
    new IntersectionObserver(entries => {
        Bearing3D.onScreen = entries[0].isIntersecting;
        updateBearingVisibility();
    }, { rootMargin: '80px' }).observe(stage);
    document.addEventListener('visibilitychange', updateBearingVisibility);
    new ResizeObserver(() => resizeBearing3D()).observe(stage);
    const fb = document.getElementById('bearingFallback');
    if (fb) fb.style.display = 'none';
    Bearing3D.last = performance.now();
    wakeBearing3D();
}

function showBearingFallback() {
    document.getElementById('bearingFallback').style.display = 'flex';
    document.getElementById('bearingStage').classList.add('is-fallback');
    document.querySelectorAll('.bearing-controls button, .bearing-presets button, #bearingExplodeRange').forEach(control => { control.disabled = true; });
}

function setBearingView(view) {
    if (!Bearing3D.inited || Bearing3D.failed) return;
    Bearing3D.view = view;
    Bearing3D.explodeTarget = view === 'exploded' ? 1 : 0;
    Bearing3D.seals.forEach(seal => { seal.visible = view !== 'open'; });
    Bearing3D.targetRX = -0.25;
    Bearing3D.targetRY = view === 'exploded' ? 0.85 : 0.42;
    Bearing3D.velX = Bearing3D.velY = 0;
    syncBearingButtons(); syncExplodeSlider(); wakeBearing3D();
}

function resetBearingView() {
    Bearing3D.zoomTarget = 10;
    setBearingView('open');
}

function syncBearingButtons() {
    const expBtn = document.getElementById('bearingExplodeBtn');
    if (expBtn) {
        expBtn.classList.toggle('on', Bearing3D.explodeTarget > 0.5);
        expBtn.setAttribute('aria-pressed', String(Bearing3D.explodeTarget > 0.5));
    }
    const pause = document.getElementById('bearingPauseBtn');
    if (pause) {
        pause.innerHTML = Bearing3D.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        pause.classList.toggle('on', Bearing3D.paused);
        pause.setAttribute('aria-pressed', String(Bearing3D.paused));
    }
    document.querySelectorAll('[data-bearing-view]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.bearingView === Bearing3D.view));
    });
}

function syncExplodeSlider() {
    const value = Math.round((Bearing3D.explodeTarget || 0) * 100);
    const r = document.getElementById('bearingExplodeRange');
    if (r) r.value = value;
    document.getElementById('bearingExplodeValue').textContent = value + '%';
}

function bearingIsVisible() {
    return Bearing3D.inited && !Bearing3D.failed && Bearing3D.onScreen && !document.hidden && !document.getElementById('page-about').classList.contains('hidden');
}

function wakeBearing3D() {
    if (!Bearing3D.raf && bearingIsVisible()) {
        Bearing3D.last = performance.now();
        Bearing3D.raf = requestAnimationFrame(bearingLoop);
    }
}

function updateBearingVisibility() {
    document.body.classList.toggle('bearing-viewer-active', bearingIsVisible());
    if (!bearingIsVisible()) {
        cancelAnimationFrame(Bearing3D.raf);
        Bearing3D.raf = 0;
    } else wakeBearing3D();
}

function resizeBearing3D() {
    const stage = document.getElementById('bearingViewport');
    if (!stage || !Bearing3D.renderer) return;
    const W = stage.clientWidth || 600, H = stage.clientHeight || 520;
    Bearing3D.renderer.setSize(W, H);
    Bearing3D.camera.aspect = W / H;
    Bearing3D.camera.updateProjectionMatrix();
    Bearing3D.sideX = 0;
    if (Bearing3D.bearing) Bearing3D.bearing.position.x = 0;
    wakeBearing3D();
}

function bearingLoop(now) {
    Bearing3D.raf = 0;
    if (!bearingIsVisible()) return;
    const stage = document.getElementById('bearingStage');
    if (!stage || stage.closest('.page-section.hidden')) return;
    const dt = Math.min((now - Bearing3D.last) / 1000, 0.1) || 0.016;
    Bearing3D.last = now;

    if (!Bearing3D.dragging) {
        Bearing3D.targetRX = Math.max(-1.1, Math.min(1.1, Bearing3D.targetRX));
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
    const spread = 1.85 + ex * 0.55;
    Bearing3D.balls.forEach((b) => {
        const a = b.userData.angle + Bearing3D.rollAngle * 0.55;
        b.position.set(Math.cos(a) * spread, Math.sin(a) * spread, ex * 0.15);
        if (!Bearing3D.paused) { b.rotation.y += dt * 2; b.rotation.x += dt; }
    });
    Bearing3D.markers.forEach((m) => {
        const a = m.userData.angle + Bearing3D.rollAngle * 0.55;
        m.position.set(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0.58 + ex * 1.4);
    });
    if (Bearing3D.outer) Bearing3D.outer.position.z = ex * 1.8;
    if (Bearing3D.inner) Bearing3D.inner.position.z = -ex * 1.8;
    if (Bearing3D.seals.length >= 6) {
        Bearing3D.seals[0].position.z = 0.70 + ex * 2.7;
        Bearing3D.seals[2].position.z = 0.70 + ex * 2.7;
        Bearing3D.seals[4].position.z = 0.70 + ex * 2.7;
        Bearing3D.seals[1].position.z = -0.70 - ex * 2.7;
        Bearing3D.seals[3].position.z = -0.70 - ex * 2.7;
        Bearing3D.seals[5].position.z = -0.70 - ex * 2.7;
    }
    Bearing3D.cage.forEach((c, i) => { c.position.z = (i === 0 ? ex * 0.85 : -ex * 0.85); c.rotation.z = Bearing3D.rollAngle * 0.55; });
    if (Bearing3D.dust && !Bearing3D.paused) Bearing3D.dust.rotation.y += dt * 0.03;

    /* ---- cinematic showroom motion ---- */
    if (!Bearing3D.paused) Bearing3D.time += dt;
    const t = Bearing3D.time;
    if (Bearing3D.bearing && Bearing3D.sideX !== undefined) {
        Bearing3D.bearing.position.x += (Bearing3D.sideX - Bearing3D.bearing.position.x) * Math.min(1, dt * 3);
        Bearing3D.bearing.position.y = Math.sin(t * 0.55) * 0.09;
    }
    if (Bearing3D.glowRing) {
        Bearing3D.glowRing.rotation.z = t * 0.25;
        Bearing3D.glowRing.material.opacity = 0.38 + Math.sin(t * 1.6) * 0.14;
    }
    if (Bearing3D.orbit) Bearing3D.orbit.rotation.z = -t * 0.12;
    if (Bearing3D.orbit2) Bearing3D.orbit2.rotation.z = t * 0.08;
    if (Bearing3D.sweep) {
        Bearing3D.sweep.position.set(Math.cos(t * 0.7) * 6.5, 2.5 + Math.sin(t * 0.9) * 2, Math.sin(t * 0.7) * 6.5);
    }
    if (Bearing3D.sparks) {
        Bearing3D.sparks.rotation.y = -t * 0.05;
        Bearing3D.sparks.position.y = Math.sin(t * 0.4) * 0.15;
    }
    if (Bearing3D.grid) Bearing3D.grid.material.opacity = 0.22 + Math.sin(t * 0.8) * 0.06;

    Bearing3D.zoom += (Bearing3D.zoomTarget - Bearing3D.zoom) * Math.min(1, dt * 5);
    // Fit the entire assembly to both portrait and landscape canvases, including explode depth.
    const fit = (3.2 + ex * 1.65) / Math.tan(THREE.MathUtils.degToRad(21)) / Math.min(1, Bearing3D.camera.aspect);
    Bearing3D.camera.position.z = fit * Bearing3D.zoom / 10;
    Bearing3D.camera.position.y = 0.4 + Math.sin(t * 0.5) * 0.12;
    Bearing3D.camera.lookAt(0, 0, 0);
    Bearing3D.renderer.render(Bearing3D.scene, Bearing3D.camera);
    const settling = Math.abs(Bearing3D.rotX - Bearing3D.targetRX) + Math.abs(Bearing3D.rotY - Bearing3D.targetRY) +
        Math.abs(Bearing3D.explode - Bearing3D.explodeTarget) + Math.abs(Bearing3D.zoom - Bearing3D.zoomTarget) > 0.001;
    if (!Bearing3D.paused || Bearing3D.dragging || settling) Bearing3D.raf = requestAnimationFrame(bearingLoop);
}
