const Animations = {
    initScrollReveal() {
        const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        if (!elements.length) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        elements.forEach(el => observer.observe(el));
    },

    initParallax() {
        const els = document.querySelectorAll('[data-parallax]');
        if (!els.length) return;
        window.addEventListener('scroll', Utils.throttle(() => {
            const scrollY = window.scrollY;
            els.forEach(el => {
                const speed = parseFloat(el.dataset.parallax) || 0.3;
                el.style.transform = `translateY(${scrollY * speed}px)`;
            });
        }, 16));
    },

    magneticButton(el) {
        if (!el) return;
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
            el.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            setTimeout(() => { el.style.transition = ''; }, 400);
        });
    },

    rippleEffect(el, e) {
        if (!el) return;
        el.style.position = 'relative';
        el.style.overflow = 'hidden';
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    },

    initCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.count);
                    Utils.animateCounter(entry.target, target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(el => observer.observe(el));
    },

    initTyping(element, texts, speed = 80) {
        if (!element || !texts.length) return;
        let textIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        function type() {
            const current = texts[textIndex];
            if (isDeleting) {
                element.textContent = current.substring(0, charIndex - 1);
                charIndex--;
            } else {
                element.textContent = current.substring(0, charIndex + 1);
                charIndex++;
            }
            let delay = isDeleting ? speed / 2 : speed;
            if (!isDeleting && charIndex === current.length) {
                delay = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
                delay = 500;
            }
            setTimeout(type, delay);
        }
        type();
    },

    initMagneticButtons() {
        document.querySelectorAll('.btn-primary, .fab').forEach(el => this.magneticButton(el));
    },

    initRippleButtons() {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.rippleEffect(btn, e));
        });
    }
};
