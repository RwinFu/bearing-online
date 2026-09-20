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
    document.querySelectorAll('.tilt-card').forEach(card => {
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
        const scrolled = (scrollTop / docHeight) * 100;
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
