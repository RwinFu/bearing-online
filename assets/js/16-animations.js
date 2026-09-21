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
