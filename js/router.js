const Router = {
    routes: [],
    currentRoute: null,
    _beforeNavigateCallbacks: [],

    add(path, handler) {
        this.routes.push({ path, handler });
    },

    beforeNavigate(callback) {
        if (typeof callback === 'function') {
            this._beforeNavigateCallbacks.push(callback);
        }
    },

    init() {
        window.addEventListener('hashchange', () => this.resolve());
        this.resolve();
    },

    resolve() {
        const hash = window.location.hash || '#/';
        const full = hash.substring(1);
        const [pathPart, queryPart] = full.split('?');
        const query = {};
        if (queryPart) new URLSearchParams(queryPart).forEach((v, k) => { query[k] = v; });

        let matched = null;
        let params = { ...query };

        for (const route of this.routes) {
            const routeSegs = route.path.split('/');
            const pathSegs = pathPart.split('/');
            if (routeSegs.length !== pathSegs.length) continue;
            let ok = true;
            const p = { ...query };
            for (let i = 0; i < routeSegs.length; i++) {
                if (routeSegs[i].startsWith(':')) {
                    p[routeSegs[i].slice(1)] = decodeURIComponent(pathSegs[i]);
                } else if (routeSegs[i] !== pathSegs[i]) {
                    ok = false;
                    break;
                }
            }
            if (ok) { matched = route; params = p; break; }
        }

        if (!matched) {
            matched = { handler: { render: () => `<div class="container"><div class="error-page"><div class="error-code">404</div><h2>Page Not Found</h2><p>The page you're looking for doesn't exist or has been moved.</p><a href="#/" class="btn btn-primary" data-nav>Go Home</a></div></div>`, afterRender: () => {} } };
            params = {};
        }

        for (const cb of this._beforeNavigateCallbacks) {
            try {
                if (cb(pathPart) === false) return;
            } catch (e) { console.warn('beforeNavigate callback error:', e); }
        }

        this.currentRoute = matched;
        this.render(matched.handler, params);
    },

    async render(handler, params) {
        const container = document.getElementById('pageContent');
        if (!container) return;
        container.classList.add('transitioning');
        setTimeout(async () => {
            try {
                const html = await handler.render(params);
                container.innerHTML = html;
            } catch (e) {
                console.warn('Page render error:', e);
                container.innerHTML = `<div class="container"><div class="error-page"><div class="error-code">!</div><h2>Something went wrong</h2><p>${Utils.escapeHtml(e.message || 'Unknown error')}</p><a href="#/" class="btn btn-primary" data-nav>Go Home</a></div></div>`;
            }
            container.classList.remove('transitioning');
            try {
                if (handler.afterRender) {
                    const result = handler.afterRender(params);
                    if (result && typeof result.then === 'function') await result;
                }
            } catch (e) { console.warn('afterRender error:', e); }
            this.bindLinks();
            this.highlightNav();
            this.closeSidebarIfOpen();
        }, 200);
    },

    bindLinks() {
        document.querySelectorAll('[data-nav]').forEach(el => {
            if (el._bound) return;
            el._bound = true;
            el.addEventListener('click', (e) => {
                const href = el.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    window.location.hash = href.substring(1);
                }
            });
        });
    },

    highlightNav() {
        const hash = window.location.hash || '#/';
        const path = hash.substring(2);
        const page = path.replace(/\//g, '-') || 'home';
        document.querySelectorAll('.sidebar-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });
        const firstSegment = path.split('/')[0] || 'home';
        document.querySelectorAll('.bottom-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.page === firstSegment);
        });
    },

    closeSidebarIfOpen() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        const hb = document.getElementById('hamburgerBtn');
        if (sb) sb.classList.remove('open');
        if (ov) ov.classList.remove('visible');
        if (hb) hb.classList.remove('active');
    },

    go(path) {
        window.location.hash = path;
    },

    navigate(path) {
        this.go(path);
    }
};
