const App = {
    _loaderTimeout: null,
    _safetyTimeout: null,
    _sessionTimer: null,
    _sessionWarningTimer: null,
    _sessionTimeoutMinutes: 30,
    _sessionWarningMinutes: 25,

    async init() {
        this.showLoading();

        try {
            await AppState.init();
        } catch (e) {
            console.warn('AppState.init() failed, using demo fallback:', e);
            AppState.initDemoMode();
        }

        try { this.registerRoutes(); } catch (e) { console.warn('registerRoutes failed:', e); }
        try { this.setupTheme(); } catch (e) { console.warn('setupTheme failed:', e); }
        try { this.setupNavbar(); } catch (e) { console.warn('setupNavbar failed:', e); }
        try { this.setupSidebar(); } catch (e) { console.warn('setupSidebar failed:', e); }
        try { this.setupSearch(); } catch (e) { console.warn('setupSearch failed:', e); }
        try { this.setupUserMenu(); } catch (e) { console.warn('setupUserMenu failed:', e); }
        try { this.setupRouteGuards(); } catch (e) { console.warn('setupRouteGuards failed:', e); }
        try { this.setupSessionTimeout(); } catch (e) { console.warn('setupSessionTimeout failed:', e); }
        try { Notifications.init(); } catch (e) { console.warn('Notifications.init() failed:', e); }

        if (this._safetyTimeout) clearTimeout(this._safetyTimeout);

        this.hideLoading();
        try { Router.init(); } catch (e) { console.warn('Router.init() failed:', e); }
        try { this.updateUserInfo(); } catch (e) { console.warn('updateUserInfo failed:', e); }
        try { this.buildSidebar(); } catch (e) { console.warn('buildSidebar failed:', e); }
        try { this.buildFAB(); } catch (e) { console.warn('buildFAB failed:', e); }
        try { this.updateNavbarRole(); } catch (e) { console.warn('updateNavbarRole failed:', e); }

        if (!AppState.isLoggedIn) {
            const protectedPages = ['profile','settings','notifications','feedback','dashboard','admin-books','admin-users','admin-reports','admin-settings','admin-audit-logs','admin-import','admin-study-materials'];
            const currentHash = window.location.hash.replace('#/', '') || '';
            const currentRoute = '/' + (currentHash.split('?')[0].split('/')[0]);
            const pathWithoutAdmin = currentHash.startsWith('admin/') ? '/admin/' + currentHash.split('/').slice(1).join('/') : currentRoute;

            const isProtected = protectedPages.some(p => pathWithoutAdmin.includes(p) || currentRoute === '/' + p);
            if (isProtected) {
                Router.go('/login');
                Toast.warning('Please sign in to access this page');
            }
        }
    },

    registerRoutes() {
        Router.add('/', HomePage);
        Router.add('/books', BooksPage);
        Router.add('/book/:id', BookDetailPage);
        Router.add('/my-books', MyBooksPage);
        Router.add('/digital-library', DigitalLibraryPage);
        Router.add('/study-materials', StudyMaterialsPage);
        Router.add('/profile', ProfilePage);
        Router.add('/dashboard', DashboardPage);
        Router.add('/announcements', AnnouncementsPage);
        Router.add('/events', EventsPage);
        Router.add('/categories', CategoriesPage);
        Router.add('/rules', RulesPage);
        Router.add('/support', SupportPage);
        Router.add('/settings', SettingsPage);
        Router.add('/notifications', NotificationsPage);
        Router.add('/login', LoginPage);
        Router.add('/new-arrivals', NewArrivalsPage);
        Router.add('/top-rated', TopRatedPage);
        Router.add('/feedback', FeedbackPage);
        Router.add('/faq', FAQPage);
        Router.add('/calendar', CalendarPage);
        Router.add('/help', HelpPage);
        Router.add('/admin/books', AdminBooksPage);
        Router.add('/admin/users', AdminUsersPage);
        Router.add('/admin/reports', AdminReportsPage);
        Router.add('/admin/settings', AdminSettingsPage);
        Router.add('/admin/audit-logs', AdminAuditLogsPage);
        Router.add('/admin/import', AdminImportPage);
        Router.add('/admin/study-materials', AdminStudyMaterialsPage);
    },

    setupRouteGuards() {
        const protectedRoutes = [
            '/profile', '/settings', '/notifications', '/feedback',
            '/dashboard', '/admin/books', '/admin/users', '/admin/reports',
            '/admin/settings', '/admin/audit-logs', '/admin/import',
            '/admin/study-materials'
        ];
        const adminRoutes = [
            '/admin/books', '/admin/users', '/admin/reports',
            '/admin/settings', '/admin/audit-logs', '/admin/import',
            '/admin/study-materials'
        ];
        const dashboardRoute = '/dashboard';

        if (Router && typeof Router.beforeNavigate === 'function') {
            Router.beforeNavigate((path) => {
                const cleanPath = path.split('?')[0].split('#')[0];

                if (protectedRoutes.includes(cleanPath)) {
                    // Verify JWT token is valid and not expired
                    const token = localStorage.getItem('library_access_token');
                    const userStr = localStorage.getItem('library_currentUser');
                    let user = null;

                    try { user = JSON.parse(userStr); } catch (e) { user = null; }

                    // Block if no token OR no valid user OR token expired
                    if (!token || !user || !AppState.isLoggedIn) {
                        Toast.warning('Please sign in to access this page');
                        Router.go('/login');
                        return false;
                    }

                    // Validate token expiry from JWT payload
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const now = Math.floor(Date.now() / 1000);
                        if (payload.exp && payload.exp < now) {
                            Toast.error('Session expired. Please sign in again.');
                            AppState.currentUser = null;
                            AppState.isLoggedIn = false;
                            localStorage.removeItem('library_currentUser');
                            localStorage.removeItem('library_access_token');
                            Router.go('/login');
                            return false;
                        }
                    } catch (e) {
                        // If token can't be decoded, block access
                        Toast.error('Invalid session. Please sign in again.');
                        AppState.currentUser = null;
                        AppState.isLoggedIn = false;
                        localStorage.removeItem('library_currentUser');
                        localStorage.removeItem('library_access_token');
                        Router.go('/login');
                        return false;
                    }
                }

                if (adminRoutes.includes(cleanPath) && AppState.isLoggedIn) {
                    const role = AppState.currentUser ? AppState.currentUser.role : '';
                    if (role !== 'admin' && role !== 'librarian') {
                        Toast.error('Access Denied: Admin privileges required');
                        Router.go('/');
                        return false;
                    }
                }

                if (cleanPath === dashboardRoute && AppState.isLoggedIn) {
                    const role = AppState.currentUser ? AppState.currentUser.role : '';
                    if (role !== 'admin' && role !== 'librarian' && role !== 'teacher') {
                        Toast.error('Access Denied: Staff privileges required');
                        Router.go('/');
                        return false;
                    }
                }

                return true;
            });
        }
    },

    setupSessionTimeout() {
        this._resetSessionTimer();

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(evt => {
            document.addEventListener(evt, Utils.throttle(() => {
                if (AppState.isLoggedIn) this._resetSessionTimer();
            }, 1000), { passive: true });
        });
    },

    _resetSessionTimer() {
        if (this._sessionTimer) clearTimeout(this._sessionTimer);
        if (this._sessionWarningTimer) clearTimeout(this._sessionWarningTimer);

        if (!AppState.isLoggedIn) return;

        const warningMs = this._sessionWarningMinutes * 60 * 1000;
        const logoutMs = this._sessionTimeoutMinutes * 60 * 1000;

        this._sessionWarningTimer = setTimeout(() => {
            this._showSessionWarning();
        }, warningMs);

        this._sessionTimer = setTimeout(() => {
            this._autoLogout();
        }, logoutMs);
    },

    _showSessionWarning() {
        const remaining = this._sessionTimeoutMinutes - this._sessionWarningMinutes;
        Modal.show({
            title: 'Session Expiring',
            content: `<p>Your session will expire in <strong>${remaining} minutes</strong> due to inactivity.</p><p>Move your mouse or press any key to stay signed in.</p>`,
            confirmText: 'Stay Signed In',
            cancelText: 'Sign Out Now',
            onConfirm: () => {
                this._resetSessionTimer();
                Toast.info('Session extended');
            },
            onCancel: () => {
                this._autoLogout();
            }
        });
    },

    async _autoLogout() {
        if (this._sessionTimer) clearTimeout(this._sessionTimer);
        if (this._sessionWarningTimer) clearTimeout(this._sessionWarningTimer);

        if (AppState.isSupabaseConnected) {
            try { await Api.signOut(); } catch (e) { }
        }
        AppState.currentUser = null;
        AppState.isLoggedIn = false;
        localStorage.removeItem('library_currentUser');
        localStorage.removeItem('library_access_token');
        Toast.warning('Session expired. Please sign in again.');
        Router.go('/login');
        App.updateUserInfo();
        App.buildSidebar();
    },

    showLoading() {
        const bar = document.getElementById('loaderProgress');
        const text = document.getElementById('loaderText');
        const msgs = ['Connecting to server...', 'Loading catalog...', 'Preparing interface...', 'Almost ready...'];
        let i = 0;
        const iv = setInterval(() => {
            if (i < msgs.length) {
                if (text) text.textContent = msgs[i];
                if (bar) bar.style.width = ((i + 1) / msgs.length * 100) + '%';
                i++;
            } else clearInterval(iv);
        }, 350);
    },

    hideLoading() {
        const s = document.getElementById('loading-screen');
        if (s) s.classList.add('hidden');
    },

    setupTheme() {
        const btn = document.getElementById('themeToggle');
        if (btn) btn.addEventListener('click', () => {
            AppState.toggleTheme();
            Toast.info('Switched to ' + AppState.theme + ' mode');
        });
    },

    setupNavbar() {
        window.addEventListener('scroll', Utils.throttle(() => {
            const nb = document.getElementById('navbar');
            const fab = document.getElementById('fabBtn');
            if (nb) nb.classList.toggle('scrolled', window.scrollY > 50);
            if (fab) fab.classList.toggle('visible', window.scrollY > 400);
        }, 50));
    },

    updateNavbarRole() {
        const adminLink = document.getElementById('adminPanelLink');
        if (adminLink) {
            const role = AppState.currentUser ? AppState.currentUser.role : '';
            adminLink.style.display = (role === 'admin' || role === 'librarian') ? '' : 'none';
        }

        const notifBadge = document.getElementById('notifBadge');
        if (notifBadge) {
            if (!AppState.isLoggedIn) {
                notifBadge.style.display = 'none';
            } else {
                try {
                    const count = typeof Notifications !== 'undefined' && Notifications.getUnreadCount
                        ? Notifications.getUnreadCount() : 0;
                    notifBadge.textContent = count || '';
                    notifBadge.style.display = count ? '' : 'none';
                } catch (e) { }
            }
        }
    },

    setupSidebar() {
        const hb = document.getElementById('hamburgerBtn');
        const ov = document.getElementById('sidebarOverlay');
        const cl = document.getElementById('sidebarClose');
        if (hb) hb.addEventListener('click', () => this.toggleSidebar());
        if (ov) ov.addEventListener('click', () => this.closeSidebar());
        if (cl) cl.addEventListener('click', () => this.closeSidebar());
    },

    toggleSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        const hb = document.getElementById('hamburgerBtn');
        const open = sb && sb.classList.contains('open');
        if (open) this.closeSidebar();
        else {
            if (sb) sb.classList.add('open');
            if (ov) ov.classList.add('visible');
            if (hb) hb.classList.add('active');
        }
    },

    closeSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebarOverlay');
        const hb = document.getElementById('hamburgerBtn');
        if (sb) sb.classList.remove('open');
        if (ov) ov.classList.remove('visible');
        if (hb) hb.classList.remove('active');
    },

    setupSearch() {
        const overlay = document.getElementById('searchOverlay');
        const input = document.getElementById('overlaySearch');
        const results = document.getElementById('searchResults');
        const mobile = document.getElementById('searchToggleMobile');
        const global = document.getElementById('globalSearch');

        const open = () => {
            if (overlay) overlay.classList.add('active');
            if (input) { input.value = ''; input.focus(); }
            if (results) results.innerHTML = '<div class="search-empty">Type to search books, authors, and more...</div>';
        };
        const close = () => { if (overlay) overlay.classList.remove('active'); };

        if (mobile) mobile.addEventListener('click', open);
        if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        if (global) global.addEventListener('focus', open);

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
            if (e.key === 'Escape') close();
        });

        if (input) {
            input.addEventListener('input', Utils.debounce((e) => {
                const q = e.target.value.trim();
                if (!q) { results.innerHTML = '<div class="search-empty">Type to search books, authors, and more...</div>'; return; }
                const all = AppState.searchBooks(q);
                if (!all.length) { results.innerHTML = '<div class="search-empty">No results found</div>'; return; }
                results.innerHTML = all.slice(0, 8).map(b => `
                    <a href="#/book/${b.id}" class="search-result-item" data-nav>
                        <div class="result-cover" style="width:40px;height:56px;border-radius:4px;background:var(--bg-tertiary);flex-shrink:0;display:flex;align-items:center;justify-content:center">
                            <span style="font-size:0.7rem">${Utils.getIcon('book', 16)}</span>
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-title">${Utils.escapeHtml(b.title)}</div>
                            <div class="search-result-meta">${Utils.escapeHtml(b.author)} · ${b.category || b.subject || ''}</div>
                        </div>
                    </a>
                `).join('');
                Router.bindLinks();
            }, 250));
        }
    },

    setupUserMenu() {
        const btn = document.getElementById('userMenuBtn');
        const userDiv = document.querySelector('.nav-user');
        const logout = document.getElementById('logoutBtn');

        if (btn && userDiv) {
            btn.addEventListener('click', (e) => { e.stopPropagation(); userDiv.classList.toggle('open'); });
            document.addEventListener('click', (e) => { if (!userDiv.contains(e.target)) userDiv.classList.remove('open'); });
        }

        if (logout) {
            logout.addEventListener('click', async () => {
                Modal.confirm('Sign Out', 'Are you sure you want to sign out?', async () => {
                    if (this._sessionTimer) clearTimeout(this._sessionTimer);
                    if (this._sessionWarningTimer) clearTimeout(this._sessionWarningTimer);

                    if (AppState.isSupabaseConnected) {
                        try { await Api.signOut(); } catch (e) { }
                    }
                    AppState.currentUser = null;
                    AppState.isLoggedIn = false;
                    localStorage.removeItem('library_currentUser');
                    localStorage.removeItem('library_access_token');
                    Toast.info('Signed out successfully');
                    Router.go('/login');
                    App.updateUserInfo();
                    App.buildSidebar();
                });
            });
        }

        this._buildUserMenuItems();
    },

    _buildUserMenuItems() {
        const menu = document.getElementById('userMenuDropdown');
        if (!menu) return;
        const role = AppState.currentUser ? AppState.currentUser.role : 'student';
        let items = '';

        if (role === 'student' || role === 'teacher') {
            items += `<a href="#/profile" class="dropdown-item" data-nav>${Utils.getIcon('user', 16)} My Profile</a>`;
            items += `<a href="#/digital-library" class="dropdown-item" data-nav>${Utils.getIcon('download', 16)} Digital Library</a>`;
            items += `<a href="#/study-materials" class="dropdown-item" data-nav>${Utils.getIcon('file-text', 16)} Study Materials</a>`;
        }
        if (role === 'student') {
            items += `<a href="#/profile" class="dropdown-item" data-nav>${Utils.getIcon('credit-card', 16)} Membership Card</a>`;
        }
        if (role === 'librarian' || role === 'admin') {
            items += `<a href="#/dashboard" class="dropdown-item" data-nav>${Utils.getIcon('bar-chart', 16)} Dashboard</a>`;
            items += `<a href="#/admin/books" class="dropdown-item" data-nav>${Utils.getIcon('book-open', 16)} Manage Books</a>`;
        }
        if (role === 'admin') {
            items += `<a href="#/admin/users" class="dropdown-item" data-nav>${Utils.getIcon('users', 16)} Manage Users</a>`;
            items += `<a href="#/admin/audit-logs" class="dropdown-item" data-nav>${Utils.getIcon('file-text', 16)} Audit Logs</a>`;
        }

        items += `<div class="dropdown-divider"></div>`;
        items += `<a href="#/settings" class="dropdown-item" data-nav>${Utils.getIcon('settings', 16)} Settings</a>`;

        const existing = menu.querySelector('.dropdown-items');
        if (existing) existing.insertAdjacentHTML('afterbegin', items);
        else menu.insertAdjacentHTML('afterbegin', items);
    },

    setDefaultUser() {
        // Auth required — no default user auto-login
        // Unauthenticated users stay logged out until they sign in with valid credentials
    },

    updateUserInfo() {
        const u = AppState.currentUser;
        const navUser = document.querySelector('.nav-user');
        const loginBtn = document.getElementById('navLoginBtn');

        if (!u) {
            // Not logged in — hide user menu, show login button
            if (navUser) navUser.style.display = 'none';
            if (loginBtn) loginBtn.style.display = '';
            return;
        }

        // Logged in — show user menu, hide login button
        if (navUser) navUser.style.display = '';
        if (loginBtn) loginBtn.style.display = 'none';

        const avatarText = u.avatar || u.name.split(' ').map(n => n[0]).join('');
        ['navAvatar', 'dropAvatar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = avatarText;
        });
        ['navUserName', 'dropName'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = u.name;
        });
        const role = document.getElementById('dropRole');
        if (role) role.textContent = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Student';

        try { this.updateNavbarRole(); } catch (e) { }
    },

    buildSidebar() {
        const nav = document.getElementById('sidebarNav');
        if (!nav) return;
        const isLoggedIn = AppState.isLoggedIn;
        const role = AppState.currentUser ? AppState.currentUser.role : '';

        if (!isLoggedIn) {
            // Not logged in — show minimal sidebar with sign-in link
            nav.innerHTML = `
                <div class="sidebar-nav-label">Main</div>
                <a href="#/" class="sidebar-nav-item" data-page="home" data-nav>${Utils.getIcon('book-open', 20)} Home</a>
                <a href="#/books" class="sidebar-nav-item" data-page="books" data-nav>${Utils.getIcon('search', 20)} Browse Books</a>
                <a href="#/categories" class="sidebar-nav-item" data-page="categories" data-nav>${Utils.getIcon('layers', 20)} Categories</a>
                <a href="#/digital-library" class="sidebar-nav-item" data-page="digital-library" data-nav>${Utils.getIcon('download', 20)} Digital Library</a>
                <div class="sidebar-nav-divider"></div>
                <div class="sidebar-nav-label">Community</div>
                <a href="#/announcements" class="sidebar-nav-item" data-page="announcements" data-nav>${Utils.getIcon('info', 20)} Announcements</a>
                <a href="#/events" class="sidebar-nav-item" data-page="events" data-nav>${Utils.getIcon('calendar', 20)} Events</a>
                <a href="#/rules" class="sidebar-nav-item" data-page="rules" data-nav>${Utils.getIcon('shield', 20)} Library Rules</a>
                <a href="#/support" class="sidebar-nav-item" data-page="support" data-nav>${Utils.getIcon('phone', 20)} Support</a>
                <div class="sidebar-nav-divider"></div>
                <a href="#/login" class="sidebar-nav-item" data-page="login" data-nav style="color:var(--primary);font-weight:600;">${Utils.getIcon('log-in', 20)} Sign In</a>
            `;
            nav.querySelectorAll('.sidebar-nav-item').forEach(el => el.addEventListener('click', () => this.closeSidebar()));
            return;
        }

        let notifCount = 0;
        try {
            notifCount = typeof Notifications !== 'undefined' && Notifications.getUnreadCount
                ? Notifications.getUnreadCount() : 0;
        } catch (e) { }

        const sections = [
            { label: 'Main', items: [
                { page: 'home', icon: 'book-open', label: 'Home', href: '#/' },
                { page: 'books', icon: 'search', label: 'Browse Books', href: '#/books' },
                { page: 'categories', icon: 'layers', label: 'Categories', href: '#/categories' },
                { page: 'digital-library', icon: 'download', label: 'Digital Library', href: '#/digital-library' },
                { page: 'study-materials', icon: 'file-text', label: 'Study Materials', href: '#/study-materials' },
            ]},
            { label: 'Personal', items: [
                { page: 'new-arrivals', icon: 'zap', label: 'New Arrivals', href: '#/new-arrivals' },
                { page: 'top-rated', icon: 'award', label: 'Top Rated', href: '#/top-rated' },
            ]},
            { label: 'Community', items: [
                { page: 'announcements', icon: 'info', label: 'Announcements', href: '#/announcements', badge: notifCount || '' },
                { page: 'events', icon: 'calendar', label: 'Events', href: '#/events' },
                { page: 'rules', icon: 'shield', label: 'Library Rules', href: '#/rules' },
                { page: 'support', icon: 'phone', label: 'Support', href: '#/support' },
            ]}
        ];

        if (role === 'teacher') {
            sections[1].items.splice(0, 0,
                { page: 'dashboard', icon: 'bar-chart', label: 'Teacher Dashboard', href: '#/dashboard' }
            );
        }

        if (role === 'librarian' || role === 'admin') {
            sections.push({ label: 'Management', items: [
                { page: 'dashboard', icon: 'bar-chart', label: 'Dashboard', href: '#/dashboard' },
                { page: 'admin-books', icon: 'book-open', label: 'Manage Books', href: '#/admin/books' },
                { page: 'admin-study-materials', icon: 'file-text', label: 'Study Materials', href: '#/admin/study-materials' },
                { page: 'admin-users', icon: 'users', label: 'Manage Users', href: '#/admin/users' },
                { page: 'admin-reports', icon: 'file-text', label: 'Reports', href: '#/admin/reports' },
            ]});
        }

        if (role === 'admin') {
            sections.push({ label: 'Security', items: [
                { page: 'admin-settings', icon: 'settings', label: 'System Settings', href: '#/admin/settings' },
                { page: 'admin-audit-logs', icon: 'file-text', label: 'Audit Logs', href: '#/admin/audit-logs' },
                { page: 'admin-import', icon: 'upload', label: 'Import Data', href: '#/admin/import' },
            ]});
        }

        let html = '';
        sections.forEach(s => {
            html += `<div class="sidebar-nav-label">${s.label}</div>`;
            s.items.forEach(item => {
                html += `<a href="${item.href}" class="sidebar-nav-item" data-page="${item.page}" data-nav>${Utils.getIcon(item.icon, 20)} ${item.label}${item.badge ? `<span class="sidebar-badge">${item.badge}</span>` : ''}</a>`;
            });
            html += '<div class="sidebar-nav-divider"></div>';
        });

        html += `<a href="#/profile" class="sidebar-nav-item" data-page="profile" data-nav>${Utils.getIcon('users', 20)} Profile</a>`;
        html += `<a href="#/settings" class="sidebar-nav-item" data-page="settings" data-nav>${Utils.getIcon('settings', 20)} Settings</a>`;

        nav.innerHTML = html;
        nav.querySelectorAll('.sidebar-nav-item').forEach(el => el.addEventListener('click', () => this.closeSidebar()));
    },

    buildFAB() {
        const fab = document.getElementById('fabBtn');
        if (!fab) return;
        const role = AppState.currentUser ? AppState.currentUser.role : 'student';
        let actions = [];

        if (role === 'student' || role === 'teacher') {
            actions = [
                { label: 'Browse Books', icon: 'search', href: '#/books' },
                { label: 'Digital Library', icon: 'download', href: '#/digital-library' },
            ];
        } else if (role === 'librarian') {
            actions = [
                { label: 'Add Book', icon: 'plus', href: '#/admin/books' },
                { label: 'Upload Study Material', icon: 'upload', href: '#/admin/study-materials' },
                { label: 'Quick Reports', icon: 'bar-chart', href: '#/admin/reports' },
            ];
        } else if (role === 'admin') {
            actions = [
                { label: 'Add Book', icon: 'plus', href: '#/admin/books' },
                { label: 'Upload Study Material', icon: 'upload', href: '#/admin/study-materials' },
                { label: 'Quick Reports', icon: 'bar-chart', href: '#/admin/reports' },
            ];
        }

        let html = '<div class="fab-actions">';
        actions.forEach(a => {
            html += `<a href="${a.href}" class="fab-action" data-nav title="${a.label}">${Utils.getIcon(a.icon, 18)}</a>`;
        });
        html += '</div>';
        html += `<button class="fab-main" id="fabMainBtn">${Utils.getIcon('plus', 24)}</button>`;

        fab.innerHTML = html;

        const mainBtn = fab.querySelector('#fabMainBtn');
        if (mainBtn) {
            mainBtn.addEventListener('click', () => fab.classList.toggle('open'));
        }
        fab.querySelectorAll('.fab-action').forEach(el => el.addEventListener('click', () => fab.classList.remove('open')));
        if (Router.bindLinks) Router.bindLinks(fab);
    }
};

window.onerror = function(msg, src, line, col, err) {
    console.error('Global error:', msg, src, 'line', line);
    const s = document.getElementById('loading-screen');
    if (s && !s.classList.contains('hidden')) {
        const text = s.querySelector('.loader-text');
        if (text) text.textContent = 'Loading complete (some features may be limited)';
        s.classList.add('hidden');
    }
    return false;
};
window.onunhandledrejection = function(e) {
    console.error('Unhandled promise rejection:', e.reason);
};

document.addEventListener('DOMContentLoaded', () => {
    App._safetyTimeout = setTimeout(() => {
        const s = document.getElementById('loading-screen');
        if (s && !s.classList.contains('hidden')) {
            const text = s.querySelector('.loader-text');
            if (text) text.textContent = 'Loading complete (some features may be limited)';
            s.classList.add('hidden');
        }
    }, 5000);
    App.init();
});
