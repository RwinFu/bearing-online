/* ===== 16-animations.js — موتور انیمیشن ===== */
// =============================================
// ANIMATION ENGINE
// =============================================
let revealObserver;
function initRevealObserver() {
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed', 'in-view');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal, .stagger').forEach(el => {
        revealObserver.observe(el);
    });
}

function animateCounters() {
    document.querySelectorAll('.counter').forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const suffix = counter.getAttribute('data-suffix') || '';
        const duration = 2000;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { counter.textContent = formatNumber(target) + suffix; return; }
        const startTime = performance.now();

        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            counter.textContent = current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(update);
            else counter.textContent = target.toLocaleString() + suffix;
        }
        requestAnimationFrame(update);
    });
}

function initTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.tilt-card').forEach(card => {
        if (card.dataset.tiltBound) return;
        card.dataset.tiltBound = '1';
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -8;
            const rotateY = ((x - centerX) / centerX) * 8;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)';
        });
    });
}

function initMagnetic() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.magnetic').forEach(btn => {
        if (btn.dataset.mag) return;
        btn.dataset.mag = '1';
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

function initRipple() {
    document.querySelectorAll('.btn-primary, .btn-accent').forEach(btn => {
        if (btn.dataset.rippled) return;
        btn.dataset.rippled = '1';
        btn.classList.add('ripple');
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            ripple.classList.add('ripple-dot');
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

function initScrollEffects() {
    const progress = document.getElementById('scroll-progress');
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrolled = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
        progress.style.width = scrolled + '%';
        if (scrollTop > 400) backToTop.classList.add('visible');
        else backToTop.classList.remove('visible');
    }, { passive: true });
}

/* The custom-cursor layer (`#cursor-dot` / `#cursor-ring`) and the typing
   placeholder used to live here. Both were already switched off in 17-init.js —
   the site keeps the native pointer and a stable search hint — but their markup,
   CSS and JS kept shipping. The leftovers were not harmless: the desktop-only
   rule `body { cursor: none }` hid the real mouse pointer while the replacement
   cursor could never move (initCursor() was never called), leaving visitors with
   no visible pointer at all. Removed together, so the native cursor is back. */

function initHeaderScroll() {
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }, { passive: true });
}

function initParallax() {
    const hero = document.querySelector('#page-home .hero-bright') || document.querySelector('.gradient-hero');
    if (!hero) return;
    const orbs = hero.querySelectorAll('.orb');
    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        orbs.forEach((orb, i) => {
            const depth = (i + 1) * 30;
            orb.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
        });
    });
}

function initSpotlight() {
    document.querySelectorAll('.spotlight').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        });
    });
}

function initHeadingLine() {
    document.querySelectorAll('.heading-line').forEach(line => {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(en => { if (en.isIntersecting) line.classList.add('grow'); });
        }, { threshold: 0.5 });
        obs.observe(line);
    });
}

// -----------------------------------------------------------------------------
// Interactive vector wordmark (framework-free adaptation for this static site)
// -----------------------------------------------------------------------------
function initVectorWordmarks() {
    // jsdom intentionally has no canvas renderer. Keeping the semantic fallback
    // there also lets the smoke suite exercise the no-canvas path without noise.
    if (/jsdom/i.test(navigator.userAgent || '') || !window.HTMLCanvasElement) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instances = [];

    function create(host, isHero) {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        host.appendChild(canvas);

        const pointer = { x: -80, y: 0, tx: -80, ty: 0, active: false };
        let width = 0, height = 0, dpr = 1, last = 0, sweep = 0, lastMeasure = 0;
        let lines = [], fontSize = 20, lineHeight = 25, fontFamily = 'Vazirmatn, Inter, sans-serif';
        let fontWeight = '900';

        function currentText() {
            const lang = document.documentElement.lang === 'en' ? 'en' : 'fa';
            if (isHero) {
                const heading = host.querySelector('h2');
                return heading ? heading.textContent.trim() : '';
            }
            return host.getAttribute('data-text-' + lang) || host.getAttribute('data-text-fa') || '';
        }

        function fitLines(text, maxWidth) {
            const words = text.split(/\s+/).filter(Boolean);
            if (!words.length) return [''];
            const output = [];
            let line = words[0];
            for (let i = 1; i < words.length; i++) {
                const trial = line + ' ' + words[i];
                if (ctx.measureText(trial).width <= maxWidth || output.length >= 1) line = trial;
                else { output.push(line); line = words[i]; }
            }
            output.push(line);
            return output;
        }

        function resize() {
            const rect = host.getBoundingClientRect();
            width = Math.round(rect.width);
            height = Math.round(rect.height);
            if (width < 2 || height < 2) return false;
            dpr = Math.min(2, window.devicePixelRatio || 1);
            const bw = Math.max(1, Math.round(width * dpr));
            const bh = Math.max(1, Math.round(height * dpr));
            if (canvas.width !== bw || canvas.height !== bh) {
                canvas.width = bw;
                canvas.height = bh;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            if (isHero) {
                const heading = host.querySelector('h2');
                const style = getComputedStyle(heading);
                fontFamily = style.fontFamily || fontFamily;
                fontWeight = style.fontWeight || '800';
                fontSize = parseFloat(style.fontSize) || 48;
                lineHeight = Math.max(fontSize * 1.28, parseFloat(style.lineHeight) || 0);
            } else {
                fontFamily = document.documentElement.lang === 'fa' ? 'Vazirmatn, Inter, sans-serif' : 'Inter, sans-serif';
                fontWeight = '900';
                fontSize = Math.max(13, Math.min(22, height * .42));
                lineHeight = fontSize * 1.1;
            }
            lastMeasure = 0;
            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
            lines = fitLines(currentText(), width - (isHero ? 34 : 8));
            if (!isHero) lines = [currentText()];
            host.classList.add('vector-ready');
            return true;
        }

        function textRows(draw) {
            const total = lines.length * lineHeight;
            const firstY = (height - total) / 2 + lineHeight * .79;
            lines.forEach((line, index) => draw(line, width / 2, firstY + index * lineHeight));
        }

        function draw(now) {
            // A host with no measurable box (collapsed container, hidden footer
            // column, …) used to re-measure on every single frame — a forced
            // layout 60 times a second for something that is not even visible.
            // Retry at most once a second; the ResizeObserver covers the moment
            // the host actually gains a size.
            if (!width) {
                if (now - lastMeasure < 1000) return;
                lastMeasure = now;
                if (!resize()) return;
            }
            const dt = last ? Math.min(.05, (now - last) / 1000) : 0;
            last = now;
            if (!pointer.active && !reduced) {
                sweep = (sweep + dt * (isHero ? 115 : 48)) % (width + 180);
                pointer.tx = sweep - 90;
                pointer.ty = height * (isHero ? .48 : .5);
            } else if (reduced) {
                pointer.tx = width * .52;
                pointer.ty = height * .5;
            }
            const ease = Math.min(1, dt * 12 || 1);
            pointer.x += (pointer.tx - pointer.x) * ease;
            pointer.y += (pointer.ty - pointer.y) * ease;

            ctx.clearRect(0, 0, width, height);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.direction = document.documentElement.lang === 'en' ? 'ltr' : 'rtl';
            ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

            // Soft blueprint body, matching the shader's blurred/sharp channels.
            ctx.save();
            ctx.filter = `blur(${isHero ? 2.2 : 1.1}px)`;
            ctx.fillStyle = isHero ? 'rgba(11,37,96,.24)' : 'rgba(11,37,96,.28)';
            textRows((text, x, y) => ctx.fillText(text, x, y));
            ctx.restore();

            const reach = Math.max(36, isHero ? Math.min(285, width * .28) : width * .7);
            const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, reach);
            glow.addColorStop(0, isHero ? '#0b2560' : '#0b2560');
            glow.addColorStop(.52, isHero ? '#1348c8' : '#17409f');
            glow.addColorStop(1, isHero ? 'rgba(11,37,96,.72)' : 'rgba(19,72,200,.05)');
            ctx.fillStyle = glow;
            ctx.shadowColor = isHero ? 'rgba(19,72,200,.22)' : 'rgba(232,168,29,.18)';
            ctx.shadowBlur = isHero ? 13 : 5;
            textRows((text, x, y) => ctx.fillText(text, x, y));
            ctx.shadowBlur = 0;

            // Dotted vector contour from the green atlas channel in the reference.
            ctx.strokeStyle = isHero ? 'rgba(232,168,29,.72)' : 'rgba(232,168,29,.74)';
            ctx.lineWidth = isHero ? 1.15 : .75;
            ctx.setLineDash([1, Math.max(3, fontSize * .095)]);
            textRows((text, x, y) => ctx.strokeText(text, x, y));
            ctx.setLineDash([]);

            // The drift handles + construction triangle stay on the first-page
            // hero title only; header/footer wordmarks keep just the glow so
            // the mark never gets a triangle over it on other pages.
            if (isHero) {
                const spread = Math.min(66, width * .09);
                const drift = reduced ? 0 : Math.sin(now / 760) * 4;
                const points = [
                    [pointer.x - spread, pointer.y + spread * .34 + drift],
                    [pointer.x + spread * .83, pointer.y - spread * .42 - drift],
                    [pointer.x + spread * .58, pointer.y + spread * .55 + drift * .5]
                ];
                ctx.strokeStyle = 'rgba(19,72,200,.48)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 5]);
                ctx.beginPath();
                ctx.moveTo(points[0][0], points[0][1]);
                ctx.lineTo(points[1][0], points[1][1]);
                ctx.lineTo(points[2][0], points[2][1]);
                ctx.closePath();
                ctx.stroke();
                ctx.setLineDash([]);
                points.forEach((p, index) => {
                    const size = 7;
                    ctx.strokeRect(p[0] - size, p[1] - size, size * 2, size * 2);
                    if (width > 520) {
                        ctx.fillStyle = 'rgba(11,37,96,.58)';
                        ctx.font = '9px Inter, monospace';
                        ctx.direction = 'ltr';
                        ctx.textAlign = 'left';
                        ctx.fillText(`${Math.round(p[0] / width * 100)}, ${Math.round(p[1] / height * 100)}`, p[0] + 10, p[1] - 8 - index * 2);
                    }
                });
            }
            ctx.restore();
        }

        function move(event) {
            const rect = host.getBoundingClientRect();
            pointer.active = true;
            pointer.tx = event.clientX - rect.left;
            pointer.ty = event.clientY - rect.top;
        }
        host.addEventListener('pointermove', move, { passive: true });
        host.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });
        const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => { needsPaint = true; resize(); }) : null;
        if (resizeObserver) resizeObserver.observe(host);
        else window.addEventListener('resize', () => { needsPaint = true; resize(); }, { passive: true });
        resize();
        instances.push({ draw, resize, resizeObserver });
    }

    // The hero headline canvas relies on a hovering pointer for its glow; on
    // touch / small screens it only produced a faint blurred copy that hid the
    // real title, so keep the DOM <h2> there.
    const touchLike = window.matchMedia && (window.matchMedia('(hover: none), (pointer: coarse)').matches || window.matchMedia('(max-width: 1023px)').matches);
    if (!touchLike) document.querySelectorAll('[data-vector-title]').forEach(el => create(el, true));
    document.querySelectorAll('[data-vector-wordmark]').forEach(el => create(el, false));
    if (!instances.length) return;

    // The wordmark canvases sit in the header and footer, so they are on screen
    // for the whole session. The loop therefore parks on tab-hide / page-hide
    // instead — and keeps a handle to its frame so it can actually be stopped,
    // which the previous version could not do (the id was assigned but unused).
    let raf = 0;
    let running = false;
    // Under `prefers-reduced-motion: reduce` the sweep is frozen and the glow
    // never follows the pointer, so consecutive frames are pixel-identical.
    // Painting them anyway kept a 60 fps canvas loop alive for the whole
    // session on a page that was not visibly animating. Instead: paint once,
    // then park the loop and repaint only when something real changes
    // (host resize, language switch, webfont arrival, tab return).
    let needsPaint = true;
    function frame(now) {
        if (!running) return;
        instances.forEach(instance => instance.draw(now));
        if (reduced && !needsPaint) { running = false; raf = 0; return; }
        needsPaint = false;
        raf = requestAnimationFrame(frame);
    }
    function start() {
        if (running || document.hidden) return;
        running = true;
        needsPaint = true;
        instances.forEach(instance => { instance.resize(); });
        raf = requestAnimationFrame(frame);
    }
    function stop() {
        running = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    const langObserver = new MutationObserver(() => { needsPaint = true; instances.forEach(instance => instance.resize()); });
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { needsPaint = true; instances.forEach(instance => instance.resize()); });
    start();
    // Exposed so the browser suite can assert the layer really stops.
    window.VectorWordmarks = { start, stop, get running() { return running; }, get raf() { return raf; }, instances };
}

// Pointer-driven engineering glow used by the metrics panel below the hero.
function initEngineeringPanels() {
    document.querySelectorAll('[data-engineering-panel]').forEach(panel => {
        panel.addEventListener('pointermove', event => {
            const rect = panel.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            panel.style.setProperty('--vx', `${event.clientX - rect.left}px`);
            panel.style.setProperty('--vy', `${event.clientY - rect.top}px`);
        }, { passive: true });
        panel.addEventListener('pointerleave', () => {
            panel.style.setProperty('--vx', '50%');
            panel.style.setProperty('--vy', '45%');
        }, { passive: true });
    });
}

// -----------------------------------------------------------------------------
// Full-page vector motion layer (first page) — spreads the hero wordmark
// motion across every [data-vector-page] text block: soft blueprint body,
// gold dotted contour and a radial glow that follows the pointer (or an ambient
// sweep when idle). The construction triangle that used to ride the glow was
// removed so it never covers the written words outside the hero; the hero
// wordmark itself keeps its small handles. The DOM text stays in the tree
// (readable without JS); it is only faded out while the layer is live.
// No canvas / reduced-motion / jsdom → plain text.
// -----------------------------------------------------------------------------
function initPageVectorLayer() {
    if (/jsdom/i.test(navigator.userAgent || '') || !window.HTMLCanvasElement) return;
    const canvas = document.getElementById('page-vector-canvas');
    const page = document.getElementById('page-home');
    if (!canvas || !page) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Touch / small screens: the pointer glow never fires and the mobile
    // viewport height changes with the URL bar, so keep the real DOM text.
    if (window.matchMedia && (window.matchMedia('(hover: none), (pointer: coarse)').matches || window.matchMedia('(max-width: 1023px)').matches)) {
        canvas.style.display = 'none';
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const S = {
        canvas, ctx, page,
        items: [],
        vw: 0, vh: 0, dpr: 1,
        pointer: { x: -1e4, y: -1e4, active: false },
        idleT: 0,
        last: 0,
        raf: 0,
        tick: 0,
        // The loop parks itself unless the home page is on screen in a visible tab.
        running: false,
        onScreen: true,
        // Diagnostic: layout/style reads performed since load. The frame loop is
        // expected to add none — only rebuilds and slowTick() may read.
        forcedReads: 0,
    };

    // Each item caches everything the frame loop needs. Nothing in the loop is
    // allowed to read layout or computed style: those reads invalidate the
    // browser's layout/style caches and were costing ~800 forced layouts and
    // ~1000 forced style recalcs per second on an idle page.
    //   docTop/docLeft : position in document space, refreshed on rebuild
    //   alpha          : cached opacity, refreshed by slowTick()
    const PAGE_HIDDEN = () => S.page.classList.contains('hidden');
    document.querySelectorAll('#page-home [data-vector-page]').forEach(el => {
        S.items.push({ el, off: null, rows: [], text: '', size: 16, line: 20, pad: 12, w: 0, h: 0, font: '', align: 'center',
            docTop: 0, docLeft: 0, alpha: 1, alphaSettled: false });
    });
    if (!S.items.length) { canvas.style.display = 'none'; return; }

    const isEn = () => document.documentElement.lang === 'en';

    function wrapLines(c, text, maxWidth) {
        const words = text.split(/ +/).filter(Boolean);
        if (!words.length) return [''];
        const out = [];
        let line = words[0];
        for (let i = 1; i < words.length; i++) {
            const trial = line + ' ' + words[i];
            if (c.measureText(trial).width <= maxWidth) line = trial;
            else { out.push(line); line = words[i]; }
        }
        out.push(line);
        return out;
    }

    // Pre-render the static blueprint layers (soft body + dotted contour) once
    // per item; the frame loop only blits them plus the live glow.
    function rebuildItem(item) {
        const el = item.el;
        if (!el.isConnected) return;
        // Rebuild is the only place that may read layout. It runs on resize,
        // language change, font load and content mutation — not per frame.
        const rect = el.getBoundingClientRect();
        S.forcedReads += 2; // one layout read + the getComputedStyle below
        if (!rect.width || !rect.height) return;
        item.docTop = rect.top + window.scrollY;
        item.docLeft = rect.left + window.scrollX;
        item.alphaSettled = false;
        item.stableTicks = 0;
        S.alphaAllSettled = false;
        const cs = getComputedStyle(el);
        const size = parseFloat(cs.fontSize) || 16;
        const family = cs.fontFamily || 'Vazirmatn, Inter, sans-serif';
        const weight = cs.fontWeight || '700';
        let line = parseFloat(cs.lineHeight);
        if (!line || line < size * 1.02) line = size * 1.35;
        const w = Math.ceil(rect.width);
        const h = Math.ceil(rect.height);
        const pad = Math.ceil(size * 0.85) + 10;
        const font = `${weight} ${size}px ${family}`;
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        const align = cs.textAlign === 'right' ? 'right' : cs.textAlign === 'left' ? 'left' : 'center';

        item.size = size; item.line = line; item.pad = pad; item.w = w; item.h = h;
        item.text = text; item.font = font; item.align = align;

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const off = document.createElement('canvas');
        off.width = Math.max(1, Math.ceil((w + pad * 2) * dpr));
        off.height = Math.max(1, Math.ceil((h + pad * 2) * dpr));
        const c = off.getContext('2d');
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.textBaseline = 'alphabetic';
        c.direction = isEn() ? 'ltr' : 'rtl';
        c.textAlign = align;
        c.font = font;
        const rows = wrapLines(c, text, w);
        item.rows = [];
        let y = (h - rows.length * line) / 2 + line * 0.78;
        rows.forEach(row => {
            const x = align === 'left' ? pad : align === 'right' ? pad + w : pad + w / 2;
            item.rows.push([row, x, pad + y]);
            y += line;
        });

        c.save();
        try { c.filter = 'blur(2.1px)'; } catch (err) { /* canvas filters unsupported */ }
        c.fillStyle = 'rgba(11,37,96,0.13)';
        item.rows.forEach(r => c.fillText(r[0], r[1], r[2]));
        c.restore();
        c.fillStyle = 'rgba(11,37,96,0.82)';
        item.rows.forEach(r => c.fillText(r[0], r[1], r[2]));
        c.strokeStyle = 'rgba(232,168,29,0.55)';
        c.lineWidth = 1;
        c.setLineDash([1.5, 3]);
        item.rows.forEach(r => c.strokeText(r[0], r[1], r[2]));
        c.setLineDash([]);
        item.off = off;
    }

    function rebuildAll() { S.items.forEach(rebuildItem); }

    function ensureSize() {
        const vw = window.innerWidth, vh = window.innerHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (S.vw === vw && S.vh === vh && S.dpr === dpr) return;
        S.vw = vw; S.vh = vh; S.dpr = dpr;
        S.canvas.width = Math.max(1, Math.round(vw * dpr));
        S.canvas.height = Math.max(1, Math.round(vh * dpr));
        // Pin the CSS box to the same pixel size; 100vw/100vh would include
        // the scrollbar / collapsed browser chrome and stretch the drawing.
        S.canvas.style.width = vw + 'px';
        S.canvas.style.height = vh + 'px';
        S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Reveal animations (stagger/reveal) fade the DOM cards; mirror that
    // opacity on the canvas copy so both fade together. Called only from
    // slowTick(), never from the frame loop.
    function effectiveAlpha(el) {
        let alpha = 1, node = el;
        for (let i = 0; i < 4 && node && node !== document.body; i++) {
            const v = parseFloat(getComputedStyle(node).opacity);
            if (!isFinite(v)) return 0;
            alpha *= v;
            node = node.parentElement;
        }
        return alpha;
    }

    // Opacity only changes while a reveal transition runs, so sampling it a few
    // times a second is visually identical to sampling it 60 times a second.
    // Once every item has settled the sampling stops entirely.
    function slowTick() {
        if (S.alphaAllSettled) return;
        let allSettled = true;
        for (const item of S.items) {
            if (item.alphaSettled) continue;
            S.forcedReads++;
            const next = effectiveAlpha(item.el);
            // A reveal transition is over once the sampled value stops moving.
            // Four consecutive equal samples at 4 Hz ≈ 1 s of stability.
            if (Math.abs(next - item.alpha) <= 0.01) item.stableTicks = (item.stableTicks || 0) + 1;
            else item.stableTicks = 0;
            item.alpha = next;
            if (item.stableTicks >= 4) item.alphaSettled = true;
            else allSettled = false;
        }
        S.alphaAllSettled = allSettled;
    }

    // Reveal animations restart on scroll, so re-arm the sampler then. Sampling
    // a handful of times a second during scrolling is cheap; doing it every
    // frame for the whole session was not.
    let rearmTimer = 0;
    window.addEventListener('scroll', () => {
        clearTimeout(rearmTimer);
        rearmTimer = setTimeout(() => {
            S.alphaAllSettled = false;
            S.items.forEach(item => { item.alphaSettled = false; item.stableTicks = 0; });
        }, 120);
    }, { passive: true });

    function frame(now) {
        // Bail out *before* scheduling the next frame, so stopLoop() really
        // stops it — otherwise the handle would stay non-zero and the loop
        // could never be restarted.
        if (!S.running || document.hidden) { S.raf = 0; return; }
        S.raf = requestAnimationFrame(frame);
        const dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 0.016;
        S.last = now;
        if (++S.tick % 15 === 0) slowTick();
        ensureSize();
        const c = S.ctx;
        c.clearRect(0, 0, S.vw, S.vh);

        let gx, gy;
        if (S.pointer.active) { gx = S.pointer.x; gy = S.pointer.y; }
        else {
            // Ambient sweep roams the whole first page (not just the heroes'
            // band) so the glow — and the construction triangle riding it —
            // travel across every section while the page is idle.
            S.idleT += dt;
            gx = (S.idleT * 85) % (S.vw + 280) - 140;
            gy = S.vh * (0.5 + 0.38 * Math.sin(S.idleT / 6.5));
        }

        // (The roaming construction triangle was removed per request: it stayed
        // pinned over all first-page headlines and hid the written words. Only
        // the live wordmark keeps its handles, on the first page alone.)
        // Cached document positions minus the current scroll offset. Reading
        // scrollX/scrollY is served from the compositor's cached values and does
        // not invalidate layout, unlike getBoundingClientRect().
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const scrollX = window.scrollX || window.pageXOffset || 0;
        for (const item of S.items) {
            if (!item.w || !item.h) continue;
            const left = item.docLeft - scrollX;
            const top = item.docTop - scrollY;
            if (top + item.h < -item.pad || top > S.vh + item.pad || left + item.w < -item.pad || left > S.vw + item.pad) continue;
            const alpha = item.alpha;
            if (alpha <= 0.02) continue;
            const ox = left - item.pad, oy = top - item.pad;

            c.save();
            c.globalAlpha = alpha;
            if (item.off) c.drawImage(item.off, ox, oy, item.w + item.pad * 2, item.h + item.pad * 2);

            const reach = Math.max(48, Math.min(130, item.size * 3.1));
            const cx = left + item.w / 2, cy = top + item.h / 2;
            if (Math.hypot(gx - cx, gy - cy) < reach + Math.max(item.w, item.h) * 0.6) {
                const glow = c.createRadialGradient(gx, gy, 0, gx, gy, reach);
                glow.addColorStop(0, 'rgba(47,107,255,0.95)');
                glow.addColorStop(0.55, 'rgba(19,72,200,0.5)');
                glow.addColorStop(1, 'rgba(19,72,200,0)');
                c.fillStyle = glow;
                c.shadowColor = 'rgba(19,72,200,0.35)';
                c.shadowBlur = 12;
                c.textBaseline = 'alphabetic';
                c.direction = isEn() ? 'ltr' : 'rtl';
                c.font = item.font;
                c.textAlign = item.align;
                item.rows.forEach(r => c.fillText(r[0], ox + r[1], oy + r[2]));
                c.shadowBlur = 0;
            }
            c.restore();
        }
    }

    // Pointer tracking across the whole first page (canvas is click-through).
    let idleTimer = 0;
    S.page.addEventListener('pointermove', e => {
        S.pointer.x = e.clientX; S.pointer.y = e.clientY; S.pointer.active = true;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { S.pointer.active = false; }, 2600);
    }, { passive: true });

    // Rebuild static layers when content, language, fonts or layout change.
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(rebuildAll, 160);
    }, { passive: true });
    new MutationObserver(rebuildAll).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    S.items.forEach(item => {
        new MutationObserver(() => rebuildItem(item))
            .observe(item.el, { childList: true, characterData: true, subtree: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuildAll).catch(() => {});

    rebuildAll();
    S.page.classList.add('vector-page-live');

    // Resized into the mobile range → hand the text back to the DOM.
    const narrow = window.matchMedia('(max-width: 1023px)');
    const onNarrow = () => {
        if (narrow.matches) {
            stopLoop();
            S.page.classList.remove('vector-page-live');
            S.canvas.style.display = 'none';
        } else if (!S.raf) {
            S.canvas.style.display = '';
            rebuildAll();
            S.page.classList.add('vector-page-live');
            syncRunState();
        }
    };
    if (narrow.addEventListener) narrow.addEventListener('change', onNarrow);

    // ---- loop lifecycle -----------------------------------------------------
    // The layer only has to run while the home page is the visible page and its
    // content is actually in view; otherwise it burns a full frame budget for
    // pixels nobody can see.
    function startLoop() {
        if (S.raf || narrow.matches) return;
        S.running = true;
        S.last = 0;
        S.tick = 0;
        S.raf = requestAnimationFrame(frame);
    }
    function stopLoop() {
        S.running = false;
        if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    }
    function syncRunState() {
        const shouldRun = S.onScreen && !document.hidden && !PAGE_HIDDEN();
        if (shouldRun) startLoop(); else stopLoop();
        S.canvas.style.visibility = shouldRun ? '' : 'hidden';
    }

    document.addEventListener('visibilitychange', syncRunState);
    // `hidden` class toggling on the page section does not fire an event, so the
    // observer below doubles as the "which page is active" signal.
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            S.onScreen = entries.some(e => e.isIntersecting);
            if (S.onScreen) { rebuildAll(); }
            syncRunState();
        }, { threshold: 0 }).observe(S.page);
    }
    // showPage() swaps the `hidden` class on .page-section; watch for it.
    if ('MutationObserver' in window) {
        new MutationObserver(syncRunState).observe(S.page, { attributes: true, attributeFilter: ['class'] });
    }
    syncRunState();
    window.addEventListener('pagehide', stopLoop);
    window.addEventListener('beforeunload', stopLoop);
    // Exposed so the browser suite can assert the layer parks itself.
    window.VectorPageLayer = {
        start: startLoop,
        stop: stopLoop,
        get running() { return S.running; },
        get raf() { return S.raf; },
        get ticks() { return S.tick; },
        get items() { return S.items.length; },
        get forcedReads() { return S.forcedReads; },
        // Per-item sampler state, so the suite can prove the sampler parks.
        get alphaState() {
            return {
                allSettled: S.alphaAllSettled,
                pending: S.items.filter(i => !i.alphaSettled).length,
                alphas: S.items.map(i => Number(i.alpha.toFixed(3)))
            };
        }
    };
}
