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

function initCursor() {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring || !window.matchMedia('(hover: hover)').matches) return;
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%) rotate(45deg)`;
    });

    function animate() {
        ringX = mouseX;
        ringY = mouseY;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
    }
    animate();

    document.addEventListener('mouseover', (e) => {
        if (e.target.closest('a, button, .card-hover, .tilt-card, input, select, label')) ring.classList.add('hovering');
        if (e.target.closest('input, textarea, select')) ring.classList.add('scanning');
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('a, button, .card-hover, .tilt-card, input, select, label')) ring.classList.remove('hovering');
        if (e.target.closest('input, textarea, select')) ring.classList.remove('scanning');
    });
}

function initTypingPlaceholder() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const enTexts = ['6205', 'SKF-6205', 'bearing 25x52x15', 'LM12UU', 'ROTEX 28', 'PL60-5'];
    const faTexts = ['۶۲۰۵', 'SKF-6205', 'بلبرینگ 25x52x15', 'LM12UU', 'یاتاقان UCP 205', 'کوپلینگ رینگ اسپن'];
    let textIndex = 0, charIndex = 0, deleting = false;

    function type() {
        const list = AppState.language === 'fa' ? faTexts : enTexts;
        const current = list[textIndex];
        if (!deleting) {
            input.setAttribute('placeholder', current.substring(0, charIndex + 1));
            charIndex++;
            if (charIndex === current.length) {
                deleting = true;
                setTimeout(type, 1200);
                return;
            }
        } else {
            input.setAttribute('placeholder', current.substring(0, charIndex - 1));
            charIndex--;
            if (charIndex === 0) {
                deleting = false;
                textIndex = (textIndex + 1) % list.length;
            }
        }
        setTimeout(type, deleting ? 50 : 120);
    }
    type();
}

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
        let width = 0, height = 0, dpr = 1, last = 0, sweep = 0;
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
            if (!width && !resize()) return;
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
            glow.addColorStop(1, 'rgba(19,72,200,.05)');
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

            // Three drifting handles and their construction triangle.
            const spread = isHero ? Math.min(66, width * .09) : Math.min(23, width * .16);
            const drift = reduced ? 0 : Math.sin(now / 760) * (isHero ? 4 : 1.5);
            const points = [
                [pointer.x - spread, pointer.y + spread * .34 + drift],
                [pointer.x + spread * .83, pointer.y - spread * .42 - drift],
                [pointer.x + spread * .58, pointer.y + spread * .55 + drift * .5]
            ];
            ctx.strokeStyle = isHero ? 'rgba(19,72,200,.48)' : 'rgba(19,72,200,.42)';
            ctx.lineWidth = 1;
            ctx.setLineDash(isHero ? [4, 5] : [2, 3]);
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.lineTo(points[1][0], points[1][1]);
            ctx.lineTo(points[2][0], points[2][1]);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
            points.forEach((p, index) => {
                const size = isHero ? 7 : 3.5;
                ctx.strokeRect(p[0] - size, p[1] - size, size * 2, size * 2);
                if (isHero && width > 520) {
                    ctx.fillStyle = 'rgba(11,37,96,.58)';
                    ctx.font = '9px Inter, monospace';
                    ctx.direction = 'ltr';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${Math.round(p[0] / width * 100)}, ${Math.round(p[1] / height * 100)}`, p[0] + 10, p[1] - 8 - index * 2);
                }
            });
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
        const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
        if (resizeObserver) resizeObserver.observe(host);
        else window.addEventListener('resize', resize, { passive: true });
        resize();
        instances.push({ draw, resize, resizeObserver });
    }

    document.querySelectorAll('[data-vector-title]').forEach(el => create(el, true));
    document.querySelectorAll('[data-vector-wordmark]').forEach(el => create(el, false));
    if (!instances.length) return;

    let raf = 0;
    function frame(now) {
        if (!document.hidden) instances.forEach(instance => instance.draw(now));
        raf = requestAnimationFrame(frame);
    }
    const langObserver = new MutationObserver(() => instances.forEach(instance => instance.resize()));
    langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => instances.forEach(instance => instance.resize()));
    raf = requestAnimationFrame(frame);
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
// gold dotted contour, a radial glow that follows the pointer (or an ambient
// sweep when idle) and an always-on construction triangle that rides the
// glow across the whole page (hovered block if any, else the nearest one).
// The DOM text stays in the tree (readable without JS); it is only faded out
// while the layer is live. No canvas / reduced-motion / jsdom → plain text.
// -----------------------------------------------------------------------------
function initPageVectorLayer() {
    if (/jsdom/i.test(navigator.userAgent || '') || !window.HTMLCanvasElement) return;
    const canvas = document.getElementById('page-vector-canvas');
    const page = document.getElementById('page-home');
    if (!canvas || !page) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
    };

    document.querySelectorAll('#page-home [data-vector-page]').forEach(el => {
        S.items.push({ el, off: null, rows: [], text: '', size: 16, line: 20, pad: 12, w: 0, h: 0, font: '', align: 'center' });
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
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
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
        S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Reveal animations (stagger/reveal) fade the DOM cards; mirror that
    // opacity on the canvas copy so both fade together.
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

    function drawHandles(x, y, now, item) {
        const c = S.ctx;
        const spread = Math.min(26, Math.max(10, item.size * 0.5));
        const drift = Math.sin(now / 760) * 2;
        const pts = [
            [x - spread, y + spread * 0.34 + drift],
            [x + spread * 0.83, y - spread * 0.42 - drift],
            [x + spread * 0.58, y + spread * 0.55 + drift * 0.5]
        ];
        c.save();
        c.strokeStyle = 'rgba(19,72,200,0.48)';
        c.lineWidth = 1;
        c.setLineDash([4, 5]);
        c.beginPath();
        c.moveTo(pts[0][0], pts[0][1]);
        c.lineTo(pts[1][0], pts[1][1]);
        c.lineTo(pts[2][0], pts[2][1]);
        c.closePath();
        c.stroke();
        c.setLineDash([]);
        const s = Math.max(3.5, Math.min(6.5, item.size * 0.16));
        pts.forEach(p => c.strokeRect(p[0] - s, p[1] - s, s * 2, s * 2));
        c.restore();
    }

    function frame(now) {
        S.raf = requestAnimationFrame(frame);
        const dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 0.016;
        S.last = now;
        if (document.hidden || !S.page.offsetWidth) return;
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

        // The construction triangle is always on: it sits on the hovered text
        // while the pointer is over one, otherwise it rides the glow point on
        // the nearest visible block — so the vector rig roams the whole first
        // page even when idle (and on touch devices, which have no hover).
        let active = null;
        let nearest = null, nearestDist = Infinity;
        for (const item of S.items) {
            const rect = item.el.getBoundingClientRect();
            if (!rect.width || !rect.height) continue;
            if (rect.bottom < -item.pad || rect.top > S.vh + item.pad || rect.right < -item.pad || rect.left > S.vw + item.pad) continue;
            const alpha = effectiveAlpha(item.el);
            if (alpha <= 0.02) continue;
            const ox = rect.left - item.pad, oy = rect.top - item.pad;

            c.save();
            c.globalAlpha = alpha;
            if (item.off) c.drawImage(item.off, ox, oy, item.w + item.pad * 2, item.h + item.pad * 2);

            const reach = Math.max(48, Math.min(130, item.size * 3.1));
            const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            if (Math.hypot(gx - cx, gy - cy) < reach + Math.max(rect.width, rect.height) * 0.6) {
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

            if (S.pointer.active &&
                gx >= rect.left - 14 && gx <= rect.right + 14 &&
                gy >= rect.top - 14 && gy <= rect.bottom + 14) {
                active = { item, x: gx, y: gy };
            } else {
                const dd = Math.hypot(gx - cx, gy - cy);
                if (dd < nearestDist) { nearestDist = dd; nearest = { item, rect }; }
            }
        }
        if (!active && nearest) {
            // Clamp the roaming anchor onto the nearest block so the triangle
            // always reads as a handle on live text, never floating in empty space.
            const r = nearest.rect;
            active = {
                item: nearest.item,
                x: Math.max(r.left, Math.min(gx, r.right)),
                y: Math.max(r.top, Math.min(gy, r.bottom))
            };
        }
        if (active) drawHandles(active.x, active.y, now, active.item);
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
    S.raf = requestAnimationFrame(frame);
}
