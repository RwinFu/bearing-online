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
        counter.textContent = formatNumber(target) + suffix;
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
