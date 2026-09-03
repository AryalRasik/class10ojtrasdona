const AppState = {
    currentUser: null,
    isLoggedIn: false,
    theme: localStorage.getItem('theme') || 'light',
    currentPage: 'home',
    searchQuery: '',
    sidebarOpen: false,
    notifPanelOpen: false,
    userMenuOpen: false,
    isSupabaseConnected: false,
    isDemoMode: false,

    notifications: [],
    borrowRequests: [],
    reservations: [],
    favorites: [],
    readingProgress: {},
    recentlyViewed: [],
    readingStreak: 7,
    books: [],
    categories: [],
    announcements: [],
    events: [],
    digitalBooks: [],
    studyMaterials: [],
    settings: {},
    allProfiles: [],

    activityLogs: [],
    auditLogs: [],
    feedback: [],
    calendarEvents: [],
    faqs: [],
    contactMessages: [],
    bookImports: [],
    eventRegistrations: [],

    _sessionTimer: null,
    _sessionWarningTimer: null,
    _lastActivityTime: Date.now(),
    _sessionTimeoutMinutes: 30,
    _sessionWarningMinutes: 25,

    ROLE_PERMISSIONS: {
        student: [
            'borrow', 'reserve', 'review', 'view_own_data',
            'toggle_favorite', 'view_books', 'view_announcements'
        ],
        teacher: [
            'borrow', 'reserve', 'review', 'view_own_data',
            'toggle_favorite', 'view_books', 'view_announcements'
        ],
        librarian: [
            'borrow', 'reserve', 'review', 'view_own_data',
            'toggle_favorite', 'view_books', 'view_announcements',
            'manage_borrows', 'manage_returns', 'manage_physical_reservations',
            'view_reports', 'manage_reservations', 'process_fines',
            'manage_announcements', 'manage_events'
        ],
        admin: [
            'borrow', 'reserve', 'review', 'view_own_data',
            'toggle_favorite', 'view_books', 'view_announcements',
            'manage_borrows', 'manage_returns', 'manage_physical_reservations',
            'view_reports', 'manage_reservations', 'process_fines',
            'manage_announcements', 'manage_events',
            'manage_users', 'manage_settings', 'manage_security',
            'view_audit_logs', 'manage_books', 'import_books',
            'manage_categories', 'manage_digital_books', 'system_settings'
        ]
    },

    ROLE_CONFIG: {
        student: { borrowLimit: 3, loanPeriodDays: 14, maxRenewals: 1, maxReservations: 3 },
        teacher: { borrowLimit: 5, loanPeriodDays: 21, maxRenewals: 2, maxReservations: 5 },
        librarian: { borrowLimit: 5, loanPeriodDays: 21, maxRenewals: 2, maxReservations: 5 },
        admin: { borrowLimit: 5, loanPeriodDays: 21, maxRenewals: 2, maxReservations: 5 }
    },

    async init() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.theme = savedTheme;
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.theme = 'dark';
        }
        document.documentElement.setAttribute('data-theme', this.theme);

        let sbAvailable = false;
        try {
            if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
                SupabaseClient.init(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
                Api.init();
                sbAvailable = true;
            }
        } catch (e) {
            console.warn('Supabase init failed, using demo mode:', e);
        }

        if (sbAvailable) {
            try {
                const session = await Api.getSession();
                if (session && session.user) {
                    const profile = await Api.getProfile(session.user.id);
                    this.currentUser = Api.mapProfile(profile);
                    this.isLoggedIn = true;
                    this.isSupabaseConnected = true;
                    this.isDemoMode = false;
                    if (session.access_token) {
                        localStorage.setItem('library_currentUser', JSON.stringify(this.currentUser));
                        localStorage.setItem('library_access_token', session.access_token);
                    }
                    await this.loadFromSupabase();
                    this._startSessionManagement();
                    return;
                }
                this.isSupabaseConnected = true;
                this.isDemoMode = false;
                this._startSessionManagement();
                return;
            } catch (e) {
                console.warn('Supabase available but session load failed:', e);
                this.isSupabaseConnected = true;
                this.isDemoMode = false;
            }
        }

        this.initDemoMode();
    },

    initDemoMode() {
        this.isDemoMode = true;
        this.isSupabaseConnected = false;

        // Check for a valid token + user session before restoring
        const savedUser = localStorage.getItem('library_currentUser');
        const savedToken = localStorage.getItem('library_access_token');
        if (savedUser && savedToken) {
            try {
                this.currentUser = JSON.parse(savedUser);
                // Validate token expiry
                try {
                    const payload = JSON.parse(atob(savedToken.split('.')[1]));
                    const now = Math.floor(Date.now() / 1000);
                    if (payload.exp && payload.exp < now) {
                        // Token expired, clear session
                        localStorage.removeItem('library_currentUser');
                        localStorage.removeItem('library_access_token');
                        this.currentUser = null;
                        this.isLoggedIn = false;
                    } else {
                        this.isLoggedIn = true;
                    }
                } catch (e) {
                    // Invalid token format, clear session
                    localStorage.removeItem('library_currentUser');
                    localStorage.removeItem('library_access_token');
                    this.currentUser = null;
                    this.isLoggedIn = false;
                }
            } catch (e) {
                this.currentUser = null;
                this.isLoggedIn = false;
            }
        } else {
            this.currentUser = null;
            this.isLoggedIn = false;
        }

        this.loadFromStorage();
        if (this.borrowRequests.length === 0) {
            this.seedInitialData();
        }
        this._startSessionManagement();
    },

    setDefaultDemoUser() {
        // No default auto-login — user must authenticate
        this.currentUser = null;
        this.isLoggedIn = false;
    },

    async loadFromSupabase() {
        const safe = async (promise, fallback = []) => {
            try { return await promise; } catch (e) {
                console.warn('Supabase sub-query failed, using fallback:', e);
                return fallback;
            }
        };

        const [
            books, categories, borrowRequests, notifications, reservations,
            favorites, recentlyViewed, announcements, events,
            digitalBooks, studyMaterials, settings, allProfiles
        ] = await Promise.all([
            safe(Api.getAllBooks().then(arr => arr.map(Api.mapBook))),
            safe(Api.getAllCategories()),
            safe(Api.getAllBorrowRequests().then(arr => arr.map(Api.mapBorrowRequest))),
            safe(Api.getNotifications(this.currentUser ? this.currentUser.id : null).then(arr => arr.map(Api.mapNotification))),
            safe(Api.getReservationsByStudent(this.currentUser ? this.currentUser.id : null).then(arr => arr.map(Api.mapReservation))),
            safe(Api.getFavorites(this.currentUser ? this.currentUser.id : null).then(arr => arr.map(Api.mapFavorite))),
            safe(Api.getRecentlyViewed(this.currentUser ? this.currentUser.id : null)),
            safe(Api.getAllAnnouncements().then(arr => arr.map(Api.mapAnnouncement))),
            safe(Api.getAllEvents().then(arr => arr.map(Api.mapEvent))),
            safe(Api.getAllDigitalBooks().then(arr => arr.map(Api.mapDigitalBook))),
            safe(Api.getAllStudyMaterials().then(arr => arr.map(Api.mapStudyMaterial))),
            safe(Api.getAllSettings(), {}),
            safe((this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'librarian'))
                ? Api.getAllProfiles()
                : Promise.resolve([]))
        ]);

        this.books = books || [];
        this.categories = categories || [];
        this.notifications = notifications || [];
        this.reservations = reservations || [];
        this.favorites = (favorites || []).map(f => f && f.bookId).filter(Boolean);
        this.recentlyViewed = (recentlyViewed || []).map(rv => rv && (rv.book_id || rv.bookId)).filter(Boolean);
        this.announcements = announcements || [];
        this.events = events || [];
        this.digitalBooks = digitalBooks || [];
        this.studyMaterials = studyMaterials || [];
        this.settings = settings || {};
        this.allProfiles = allProfiles || [];
        this.lastBorrowSeq = (this.borrowRequests || []).length;

        // Merge locally-persisted borrow records (offline issues + imported records)
        // with the remote borrow_requests table, so offline data survives refresh.
        const localBorrows = this._loadLocal('library_borrowRequests');
        const remoteBorrows = borrowRequests || [];
        const remoteIds = new Set(remoteBorrows.map(r => r && r.id));
        const localOffline = Array.isArray(localBorrows)
            ? localBorrows.filter(r => r && r.isOffline && !remoteIds.has(r.id))
            : [];
        this.borrowRequests = [...remoteBorrows, ...localOffline];

        // Merge locally-persisted borrow history (processed returns)
        const localHistory = this._loadLocal('library_borrowHistory');
        if (Array.isArray(localHistory) && localHistory.length) {
            this.borrowHistory = Array.isArray(this.borrowHistory) ? this.borrowHistory : [];
            const histIds = new Set(this.borrowHistory.map(r => r && r.id));
            localHistory.forEach(r => { if (r && r.id && !histIds.has(r.id)) { this.borrowHistory.push(r); histIds.add(r.id); } });
        }

        try {
            this.offlineUsers = JSON.parse(localStorage.getItem('library_offlineUsers') || '[]');
        } catch (e) { this.offlineUsers = []; }
        if (typeof LIBRARY_DATA !== 'undefined' && LIBRARY_DATA.students && this.offlineUsers.length) {
            const ids = new Set(LIBRARY_DATA.students.map(s => String(s.id)));
            this.offlineUsers.forEach(u => { if (!ids.has(String(u.id))) LIBRARY_DATA.students.push(u); });
        }

        try { this.checkDueReminders(); } catch (e) { console.warn('checkDueReminders failed:', e); }
        try { this.autoExpireReservations(); } catch (e) { console.warn('autoExpireReservations failed:', e); }
    },

    loadFromStorage() {
        const load = (key) => {
            try {
                const val = localStorage.getItem(key);
                return val ? JSON.parse(val) : [];
            } catch (e) { return []; }
        };
        this.notifications = load('library_notifications');
        this.borrowRequests = load('library_borrowRequests');
        this.borrowHistory = load('library_borrowHistory');
        this.borrowedBooks = load('library_borrowedBooks');
        this.favorites = load('library_favorites');
        this.recentlyViewed = load('library_recentlyViewed');
        this.readingProgress = load('library_readingProgress');
        this.reservations = load('library_reservations');
        this.lastBorrowSeq = parseInt(localStorage.getItem('library_lastBorrowSeq') || '0');
        this.offlineUsers = load('library_offlineUsers');
        this.activityLogs = load('library_activityLogs');
        this.auditLogs = load('library_auditLogs');
        this.finePayments = load('library_finePayments');
        this.feedback = load('library_feedback');
        this.calendarEvents = load('library_calendarEvents');
        this.faqs = load('library_faqs');
        this.contactMessages = load('library_contactMessages');
        this.bookImports = load('library_bookImports');
        this.eventRegistrations = load('library_eventRegistrations');

        this.books = (typeof LIBRARY_DATA !== 'undefined') ? LIBRARY_DATA.books : [];
        this.categories = (typeof LIBRARY_DATA !== 'undefined') ? LIBRARY_DATA.categories : [];
        this.announcements = (typeof LIBRARY_DATA !== 'undefined') ? (LIBRARY_DATA.announcements || []) : [];
        this.events = (typeof LIBRARY_DATA !== 'undefined') ? (LIBRARY_DATA.events || []) : [];
        this.digitalBooks = load('library_digitalBooks');
        if (!this.digitalBooks.length && typeof LIBRARY_DATA !== 'undefined') {
            this.digitalBooks = (LIBRARY_DATA.digitalBooks || []).map(d => ({ ...d }));
        }
        this.studyMaterials = load('library_studyMaterials');
        if (!this.studyMaterials.length && typeof LIBRARY_DATA !== 'undefined') {
            this.studyMaterials = (LIBRARY_DATA.studyMaterials || []).map(s => ({ ...s }));
        }

        if (this.offlineUsers.length && typeof LIBRARY_DATA !== 'undefined' && LIBRARY_DATA.students) {
            const ids = new Set(LIBRARY_DATA.students.map(s => String(s.id)));
            this.offlineUsers.forEach(u => {
                if (!ids.has(String(u.id))) LIBRARY_DATA.students.push(u);
            });
        }
    },

    saveOfflineUsers() {
        try { localStorage.setItem('library_offlineUsers', JSON.stringify(this.offlineUsers || [])); } catch (e) {}
    },

    getLookupUsers() {
        const map = new Map();
        const add = (u) => {
            if (!u) return;
            const key = String(u.email || u.id || u.name || '').toLowerCase();
            if (key && !map.has(key)) map.set(key, u);
        };
        if (typeof LIBRARY_DATA !== 'undefined') {
            (LIBRARY_DATA.students || []).forEach(add);
            (LIBRARY_DATA.teachers || []).forEach(add);
        }
        (this.offlineUsers || []).forEach(add);
        if (typeof LoginPage !== 'undefined' && LoginPage.getStoredUsers) LoginPage.getStoredUsers().forEach(add);
        (this.allProfiles || []).forEach(add);
        return Array.from(map.values());
    },

    searchLookupUsers(query) {
        if (!query) return [];
        const q = String(query).toLowerCase();
        const gradeKeys = [String(q).replace(/\s*(class|grade)\s*/gi, ''), q];
        return this.getLookupUsers().filter(u => {
            if ((u.name || '').toLowerCase().includes(q)) return true;
            if ((u.email || '').toLowerCase().includes(q)) return true;
            const grade = String(u.grade || u.grade_level || '');
            const klass = String(u.class || u.className || '');
            return gradeKeys.some(k => k && (grade.includes(k) || klass.includes(k)));
        }).slice(0, 15);
    },

    _loadLocal(key) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : [];
        } catch (e) { return []; }
    },

    saveAll() {
        const save = (key, data) => {
            try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { }
        };
        save('library_notifications', this.notifications);
        save('library_digitalBooks', this.digitalBooks);
        save('library_studyMaterials', this.studyMaterials);
        save('library_borrowRequests', this.borrowRequests);
        save('library_borrowHistory', this.borrowHistory);
        save('library_borrowedBooks', this.borrowedBooks);
        save('library_favorites', this.favorites);
        save('library_recentlyViewed', this.recentlyViewed);
        save('library_readingProgress', this.readingProgress);
        save('library_reservations', this.reservations);
        save('library_activityLogs', this.activityLogs);
        save('library_auditLogs', this.auditLogs);
        save('library_finePayments', this.finePayments);
        save('library_feedback', this.feedback);
        save('library_calendarEvents', this.calendarEvents);
        save('library_faqs', this.faqs);
        save('library_contactMessages', this.contactMessages);
        save('library_bookImports', this.bookImports);
        save('library_eventRegistrations', this.eventRegistrations);
        save('library_offlineUsers', this.offlineUsers);
        localStorage.setItem('library_lastBorrowSeq', (this.lastBorrowSeq == null ? 0 : this.lastBorrowSeq).toString());
    },

    seedInitialData() {
        if (this.borrowRequests.length === 0) {
            const now = new Date();
            const seedRequests = [
                { bookId: 160, studentId: 2, borrowDate: "2026-07-14", status: "pending" },
                { bookId: 148, studentId: 1, borrowDate: "2026-07-13", status: "approved" },
                { bookId: 156, studentId: 1, borrowDate: "2026-07-10", status: "approved" },
                { bookId: 145, studentId: 1, borrowDate: "2026-06-28", status: "approved" },
                { bookId: 152, studentId: 1, borrowDate: "2026-07-05", status: "approved" },
            ];

            seedRequests.forEach((sr, idx) => {
                const seq = idx + 1;
                const d = new Date(sr.borrowDate);
                const due = new Date(d);
                due.setDate(due.getDate() + 14);
                const isOverdue = due < now;

                let status = sr.status;
                if (status === 'approved') {
                    status = isOverdue ? 'overdue' : 'borrowed';
                }

                const requestId = `BR-${sr.borrowDate.replace(/-/g, '')}-${String(seq).padStart(4, '0')}`;
                const book = this.books.find(b => b.id === sr.bookId);

                this.borrowRequests.push({
                    id: requestId,
                    bookId: sr.bookId,
                    bookTitle: book ? book.title : 'Unknown',
                    studentId: sr.studentId,
                    studentName: sr.studentId === 1 ? 'Anita Sharma' : 'Student',
                    borrowDate: sr.borrowDate,
                    expectedReturnDate: due.toISOString().split('T')[0],
                    requestTime: d.toISOString(),
                    status: status,
                    approvedBy: status !== 'pending' ? 'Ms. Laxmi Devi' : null,
                    approvedAt: status !== 'pending' ? d.toISOString() : null,
                    fine: isOverdue ? Math.ceil((now - due) / 86400000) * 5 : 0,
                    renewCount: 0,
                    renewed: false
                });
            });

            this.lastBorrowSeq = seedRequests.length;
            this.saveAll();
        }
    },

    setUser(user, token) {
        this.currentUser = user;
        this.isLoggedIn = !!user;
        if (!this.isSupabaseConnected && user) {
            localStorage.setItem('library_currentUser', JSON.stringify(user));
            // Store JWT token for session validation
            const jwt = token || this._generateDemoJWT(user);
            localStorage.setItem('library_access_token', jwt);
        }
        this._lastActivityTime = Date.now();
        this._addAuditLog('user_login', `User ${user ? user.name : 'logged out'}`);
    },

    async persistSession(user) {
        this.currentUser = user;
        this.isLoggedIn = !!user;
        localStorage.setItem('library_currentUser', JSON.stringify(user));
        try {
            const s = await Api.getSession();
            if (s && s.access_token) {
                localStorage.setItem('library_access_token', s.access_token);
            }
        } catch (e) {
            localStorage.removeItem('library_access_token');
        }
        this._lastActivityTime = Date.now();
        this._addAuditLog('user_login', `User ${user ? user.name : 'logged out'}`);
    },

    _generateDemoJWT(user) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
        }));
        const signature = btoa('demo-signature-' + user.id + '-' + Date.now());
        return `${header}.${payload}.${signature}`;
    },

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    },

    toggleTheme() {
        this.setTheme(this.theme === 'light' ? 'dark' : 'light');
    },

    generateBorrowId() {
        const now = new Date();
        const dateStr = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        this.lastBorrowSeq++;
        return `BR-${dateStr}-${String(this.lastBorrowSeq).padStart(4, '0')}`;
    },

    getExpectedReturnDate(borrowDate, days = 14) {
        const d = new Date(borrowDate);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    },

    hasPermission(permission) {
        if (!this.currentUser) return false;
        const perms = this.ROLE_PERMISSIONS[this.currentUser.role];
        return perms ? perms.includes(permission) : false;
    },

    getMaxBorrowLimit() {
        if (!this.currentUser) return 3;
        const config = this.ROLE_CONFIG[this.currentUser.role];
        return config ? config.borrowLimit : 3;
    },

    getLoanPeriod() {
        if (!this.currentUser) return 14;
        const config = this.ROLE_CONFIG[this.currentUser.role];
        return config ? config.loanPeriodDays : 14;
    },

    getMaxRenewals() {
        if (!this.currentUser) return 1;
        const config = this.ROLE_CONFIG[this.currentUser.role];
        return config ? config.maxRenewals : 1;
    },

    getMaxReservations() {
        if (!this.currentUser) return 3;
        const config = this.ROLE_CONFIG[this.currentUser.role];
        return config ? config.maxReservations : 3;
    },

    canBorrow() {
        if (!this.currentUser) return { allowed: false, reason: 'Not logged in' };
        if (!this.hasPermission('borrow')) return { allowed: false, reason: 'Insufficient permissions' };

        const userId = this.currentUser.id;
        const activeCount = this.borrowRequests.filter(r =>
            r.studentId === userId &&
            (r.status === 'borrowed' || r.status === 'overdue' || r.status === 'approved' || r.status === 'pending')
        ).length;

        if (activeCount >= this.getMaxBorrowLimit()) {
            return { allowed: false, reason: `Borrow limit reached (${this.getMaxBorrowLimit()} books)` };
        }

        const pendingFine = this.borrowRequests
            .filter(r => r.studentId === userId)
            .reduce((sum, r) => sum + (r.fine || 0), 0);
        const unpaidFine = pendingFine - this.finePayments
            .filter(p => p.studentId === userId)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        if (unpaidFine > 100) {
            return { allowed: false, reason: `Pending fines of Rs. ${unpaidFine} exceed Rs. 100 limit` };
        }

        if (this.currentUser.membershipStatus === 'suspended') {
            return { allowed: false, reason: 'Membership suspended' };
        }

        return { allowed: true, reason: '' };
    },

    canReserve() {
        if (!this.currentUser) return { allowed: false, reason: 'Not logged in' };
        if (!this.hasPermission('reserve')) return { allowed: false, reason: 'Insufficient permissions' };

        const userId = this.currentUser.id;
        const activeReservations = this.reservations.filter(r =>
            r.studentId === userId && r.status === 'waiting'
        ).length;

        if (activeReservations >= this.getMaxReservations()) {
            return { allowed: false, reason: `Reservation limit reached (${this.getMaxReservations()} max)` };
        }

        return { allowed: true, reason: '' };
    },

    canRenew(requestId) {
        if (!this.currentUser) return { allowed: false, reason: 'Not logged in' };

        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request) return { allowed: false, reason: 'Request not found' };
        if (request.status !== 'borrowed') return { allowed: false, reason: 'Book is not currently borrowed' };

        const renewCount = request.renewCount || 0;
        const maxRenewals = this.getMaxRenewals();
        if (renewCount >= maxRenewals) {
            return { allowed: false, reason: `Maximum renewals reached (${maxRenewals})` };
        }

        const queue = this.reservations.filter(r =>
            r.bookId === request.bookId && r.status === 'waiting' && r.studentId !== request.studentId
        );
        if (queue.length > 0) {
            return { allowed: false, reason: 'Cannot renew - other users are waiting for this book' };
        }

        return { allowed: true, reason: '' };
    },

    getBookReservationQueue(bookId) {
        return this.reservations
            .filter(r => r.bookId === bookId && r.status === 'waiting')
            .sort((a, b) => a.position - b.position);
    },

    getMyFines() {
        if (!this.currentUser) return { total: 0, unpaid: 0, paid: 0 };
        const userId = this.currentUser.id;
        const totalIncurred = this.borrowRequests
            .filter(r => r.studentId === userId)
            .reduce((sum, r) => sum + (r.fine || 0), 0);
        const totalPaid = this.finePayments
            .filter(p => p.studentId === userId)
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        return { total: totalIncurred, paid: totalPaid, unpaid: Math.max(0, totalIncurred - totalPaid) };
    },

    getUserById(id) {
        if (this.allProfiles && this.allProfiles.length > 0) {
            return this.allProfiles.find(p => p.id === id) || null;
        }
        if (this.borrowRequests.length > 0) {
            const found = this.borrowRequests.find(r => r.studentId === id);
            if (found) return { id: found.studentId, name: found.studentName };
        }
        if (this.currentUser && this.currentUser.id === id) return this.currentUser;
        return null;
    },

    getStudentById(id) {
        return this.getUserById(id);
    },

    createBorrowRequest(bookId) {
        const book = this.books.find(b => b.id === bookId);
        if (!book || book.availableCopies <= 0) return null;

        const user = this.currentUser;
        if (!user) return null;

        const borrowCheck = this.canBorrow();
        if (!borrowCheck.allowed) {
            this.addNotification({
                type: 'borrow_blocked',
                title: 'Borrow Request Blocked',
                message: borrowCheck.reason,
                icon: 'x-circle'
            });
            return null;
        }

        const existingBorrow = this.borrowRequests.find(r =>
            r.bookId === bookId &&
            r.studentId === user.id &&
            (r.status === 'pending' || r.status === 'approved' || r.status === 'borrowed' || r.status === 'overdue')
        );
        if (existingBorrow) {
            this.addNotification({
                type: 'borrow_blocked',
                title: 'Borrow Request Blocked',
                message: `You already have an active request or borrow for "${book.title}".`,
                icon: 'x-circle'
            });
            return null;
        }

        const today = new Date().toISOString().split('T')[0];
        const requestId = this.generateBorrowId();
        const loanPeriod = this.getLoanPeriod();
        const expectedReturn = this.getExpectedReturnDate(today, loanPeriod);

        const request = {
            id: requestId,
            bookId: bookId,
            bookTitle: book.title,
            studentId: user.id,
            studentName: user.name,
            borrowDate: today,
            expectedReturnDate: expectedReturn,
            requestTime: new Date().toISOString(),
            status: 'pending',
            approvedBy: null,
            approvedAt: null,
            fine: 0,
            renewed: false,
            renewCount: 0,
            rejectionReason: ''
        };

        this.borrowRequests.push(request);
        this._addActivityLog('borrow_request', `Requested borrow of "${book.title}"`);

        if (this.isSupabaseConnected) {
            Api.createBorrowRequest({
                id: requestId,
                book_id: bookId,
                book_title: book.title,
                student_id: user.id,
                student_name: user.name,
                borrow_date: today,
                expected_return_date: expectedReturn,
                request_time: request.requestTime,
                status: 'pending'
            }).catch(e => console.warn('Supabase save failed:', e));
        }

        this.saveAll();

        this.addNotification({
            type: 'borrow_submitted',
            title: 'Borrow Request Submitted',
            message: `Your request for "${book.title}" has been sent to the librarian for approval.`,
            icon: 'send',
            borrowRequestId: requestId
        });

        return request;
    },

    approveBorrowRequest(requestId, approvedBy) {
        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') return false;

        const book = this.books.find(b => b.id === request.bookId);
        if (!book || book.availableCopies <= 0) return false;

        request.status = 'approved';
        request.approvedBy = approvedBy || 'Librarian';
        request.approvedAt = new Date().toISOString();

        this._addAuditLog('borrow_approved', `Approved borrow request ${requestId} for "${request.bookTitle}"`);

        if (this.isSupabaseConnected) {
            Api.updateBorrowRequest(requestId, {
                status: 'approved',
                approved_by: request.approvedBy,
                approved_at: request.approvedAt
            }).catch(e => console.warn('Supabase update failed:', e));
        }

        this.addNotification({
            type: 'borrow_approved',
            title: 'Borrow Request Approved',
            message: `Your request to borrow "${request.bookTitle}" has been approved! Please pick it up from the library.`,
            icon: 'check-circle',
            borrowRequestId: requestId
        });

        this.saveAll();
        return true;
    },

    rejectBorrowRequest(requestId, reason) {
        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'pending') return false;

        request.status = 'rejected';
        request.rejectionReason = reason || 'Not specified';

        this._addAuditLog('borrow_rejected', `Rejected borrow request ${requestId}: ${reason || 'Not specified'}`);

        if (this.isSupabaseConnected) {
            Api.updateBorrowRequest(requestId, {
                status: 'rejected',
                rejection_reason: reason || 'Not specified'
            }).catch(e => console.warn('Supabase update failed:', e));
        }

        this.addNotification({
            type: 'borrow_rejected',
            title: 'Borrow Request Rejected',
            message: `Your request to borrow "${request.bookTitle}" was not approved. ${reason || ''}`,
            icon: 'x-circle',
            borrowRequestId: requestId
        });

        this.saveAll();
        return true;
    },

    markAsBorrowed(requestId) {
        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'approved') return false;

        const book = this.books.find(b => b.id === request.bookId);
        if (!book) return false;

        request.status = 'borrowed';
        book.availableCopies--;
        book.borrowCount++;

        this._addAuditLog('borrow_picked_up', `Book "${request.bookTitle}" picked up (ID: ${requestId})`);

        if (this.isSupabaseConnected) {
            Promise.all([
                Api.updateBorrowRequest(requestId, { status: 'borrowed' }),
                Api.updateBook(book.id, { available_copies: book.availableCopies, borrow_count: book.borrowCount })
            ]).catch(e => console.warn('Supabase update failed:', e));
        }

        this.addNotification({
            type: 'book_ready_pickup',
            title: 'Book Picked Up',
            message: `You have picked up "${request.bookTitle}". Please return by ${Utils.formatDate(request.expectedReturnDate)}.`,
            icon: 'book-open',
            borrowRequestId: requestId
        });

        this.saveAll();
        return true;
    },

    requestReturn(requestId) {
        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request || (request.status !== 'borrowed' && request.status !== 'overdue')) return false;

        request.status = 'return_requested';

        this._addActivityLog('return_requested', `Requested return of "${request.bookTitle}"`);

        if (this.isSupabaseConnected) {
            Api.updateBorrowRequest(requestId, { status: 'return_requested' })
                .catch(e => console.warn('Supabase update failed:', e));
        }

        this.addNotification({
            type: 'return_requested',
            title: 'Return Requested',
            message: `Your return request for "${request.bookTitle}" has been sent.`,
            icon: 'corner-down-left',
            borrowRequestId: requestId
        });

        this.saveAll();
        return true;
    },

    processReturn(requestId) {
        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request) return false;

        const book = this.books.find(b => b.id === request.bookId);
        if (book) book.availableCopies++;

        const returnDate = new Date().toISOString().split('T')[0];
        request.status = 'returned';
        request.returnDate = returnDate;

        let fine = 0;
        let daysLate = 0;
        if (new Date(returnDate) > new Date(request.expectedReturnDate)) {
            daysLate = Math.ceil((new Date(returnDate) - new Date(request.expectedReturnDate)) / 86400000);
            fine = daysLate * 5;
        }
        request.fine = (request.fine || 0) + fine;

        const receipt = {
            requestId: requestId,
            bookTitle: request.bookTitle,
            studentName: request.studentName,
            studentId: request.studentId,
            borrowDate: request.borrowDate,
            expectedReturnDate: request.expectedReturnDate,
            actualReturnDate: returnDate,
            daysLate: daysLate,
            fineAmount: fine,
            totalFine: request.fine,
            processedAt: new Date().toISOString()
        };

        this._addAuditLog('return_processed', `Return processed for "${request.bookTitle}" (ID: ${requestId}). Fine: Rs. ${fine}`);

        if (this.isSupabaseConnected) {
            Promise.all([
                Api.updateBorrowRequest(requestId, { status: 'returned', return_date: returnDate, fine: request.fine }),
                book ? Api.updateBook(book.id, { available_copies: book.availableCopies }) : Promise.resolve()
            ]).catch(e => console.warn('Supabase update failed:', e));
        }

        this.borrowHistory.push({ ...request });

        this.addNotification({
            type: 'book_returned',
            title: 'Book Returned Successfully',
            message: `"${request.bookTitle}" has been returned.${request.fine > 0 ? ` Fine: Rs. ${request.fine}` : ' No fine.'}`,
            icon: 'check-circle',
            borrowRequestId: requestId
        });

        this._fulfillReservationIfAny(request.bookId);

        this.saveAll();
        return { success: true, receipt: receipt };
    },

    renewBorrow(requestId) {
        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request || request.status !== 'borrowed') return false;

        const renewCheck = this.canRenew(requestId);
        if (!renewCheck.allowed) {
            this.addNotification({
                type: 'renew_blocked',
                title: 'Renewal Blocked',
                message: renewCheck.reason,
                icon: 'x-circle',
                borrowRequestId: requestId
            });
            return false;
        }

        request.renewCount = (request.renewCount || 0) + 1;
        request.renewed = true;
        const loanPeriod = this.getLoanPeriod();
        const newDue = new Date(request.expectedReturnDate);
        newDue.setDate(newDue.getDate() + loanPeriod);
        request.expectedReturnDate = newDue.toISOString().split('T')[0];

        this._addAuditLog('borrow_renewed', `Renewed "${request.bookTitle}" (ID: ${requestId}). New due: ${request.expectedReturnDate}`);

        if (this.isSupabaseConnected) {
            Api.updateBorrowRequest(requestId, {
                renewed: true,
                renew_count: request.renewCount,
                expected_return_date: request.expectedReturnDate
            }).catch(e => console.warn('Supabase update failed:', e));
        }

        this.addNotification({
            type: 'borrow_renewed',
            title: 'Book Renewed',
            message: `"${request.bookTitle}" due date extended to ${Utils.formatDate(request.expectedReturnDate)}.`,
            icon: 'refresh-cw',
            borrowRequestId: requestId
        });

        this.saveAll();
        return true;
    },

    updateBorrowDueDate(requestId, newDate) {
        const request = this.borrowRequests.find(r => r.id === requestId);
        if (!request) return false;
        if (!(request.status === 'borrowed' || request.status === 'overdue' || request.status === 'return_requested' || request.status === 'approved')) return false;

        const today = new Date().toISOString().split('T')[0];
        const due = new Date(newDate);
        if (isNaN(due.getTime())) return false;
        const dueStr = due.toISOString().split('T')[0];

        request.expectedReturnDate = dueStr;

        if (new Date(dueStr) < new Date(today)) {
            if (request.status === 'borrowed' || request.status === 'approved') request.status = 'overdue';
            const daysLate = Math.ceil((new Date(today) - new Date(dueStr)) / 86400000);
            request.fine = daysLate * 5;
        } else {
            if (request.status === 'overdue') request.status = 'borrowed';
            request.fine = 0;
        }

        this._addAuditLog('due_date_updated', `Updated due date for "${request.bookTitle}" (ID: ${requestId}) to ${dueStr}. Status: ${request.status}, Fine: Rs. ${request.fine}`);

        if (this.isSupabaseConnected) {
            Api.updateBorrowRequest(requestId, {
                expected_return_date: dueStr,
                status: request.status,
                fine: request.fine
            }).catch(e => console.warn('Supabase update failed:', e));
        }

        this.addNotification({
            type: 'due_date_updated',
            title: 'Due Date Updated',
            message: `Due date for "${request.bookTitle}" is now ${Utils.formatDate(dueStr)}.`,
            icon: 'calendar',
            borrowRequestId: requestId
        });

        this.saveAll();
        return true;
    },

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    },

    markAllRead() {
        this.notifications.forEach(n => n.read = true);
        if (this.isSupabaseConnected) {
            Api.markAllNotificationsRead(this.currentUser.id).catch(e => {});
        }
        this.saveAll();
    },

    markNotifRead(notifId) {
        const n = this.notifications.find(x => x.id === notifId);
        if (n) {
            n.read = true;
            if (this.isSupabaseConnected) {
                Api.markNotificationRead(notifId).catch(e => {});
            }
            this.saveAll();
        }
    },

    addNotification(notif) {
        notif.id = Date.now() + Math.random();
        notif.read = false;
        notif.time = 'Just now';
        notif.timestamp = new Date().toISOString();
        notif.userId = this.currentUser ? this.currentUser.id : null;
        this.notifications.unshift(notif);

        if (this.isSupabaseConnected && notif.userId) {
            Api.createNotification({
                user_id: notif.userId,
                type: notif.type,
                title: notif.title,
                message: notif.message,
                icon: notif.icon,
                read: false,
                time: notif.time
            }).then(created => {
                notif.id = created.id;
            }).catch(e => console.warn('Supabase notification save failed:', e));
        }

        this.saveAll();
        if (typeof Notifications !== 'undefined' && Notifications.updateBadge) {
            Notifications.updateBadge();
        }
    },

    checkDueReminders() {
        if (!Array.isArray(this.borrowRequests)) return;
        const now = new Date();
        const active = this.borrowRequests.filter(r => r.status === 'borrowed');
        active.forEach(r => {
            const due = new Date(r.expectedReturnDate);
            const daysLeft = Math.ceil((due - now) / 86400000);
            if (daysLeft <= 3 && daysLeft > 0) {
                const existing = this.notifications.find(n => n.borrowRequestId === r.id && n.type === 'due_reminder');
                if (!existing) {
                    this.addNotification({
                        type: 'due_reminder',
                        title: 'Return Reminder',
                        message: `"${r.bookTitle}" is due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Please return on time.`,
                        icon: 'clock',
                        borrowRequestId: r.id
                    });
                }
            } else if (daysLeft === 0) {
                const existing = this.notifications.find(n => n.borrowRequestId === r.id && n.type === 'due_today');
                if (!existing) {
                    this.addNotification({
                        type: 'due_today',
                        title: 'Book Due Today',
                        message: `"${r.bookTitle}" is due today. Please return it to avoid fines.`,
                        icon: 'alert-triangle',
                        borrowRequestId: r.id
                    });
                }
            } else if (daysLeft < 0 && r.status !== 'overdue') {
                r.status = 'overdue';
                r.fine = Math.abs(daysLeft) * 5;
                this.addNotification({
                    type: 'overdue',
                    title: 'Book Overdue',
                    message: `"${r.bookTitle}" is ${Math.abs(daysLeft)} days overdue. Fine: Rs. ${r.fine}.`,
                    icon: 'alert-triangle',
                    borrowRequestId: r.id
                });
            }
        });
        this.saveAll();
    },

    getMyBorrowRequests() {
        return this.borrowRequests.filter(r => r.studentId === (this.currentUser?.id || 1));
    },

    getMyActiveBorrows() {
        return this.borrowRequests.filter(r =>
            r.studentId === (this.currentUser?.id || 1) &&
            (r.status === 'borrowed' || r.status === 'overdue')
        );
    },

    getMyPendingRequests() {
        return this.borrowRequests.filter(r =>
            r.studentId === (this.currentUser?.id || 1) &&
            r.status === 'pending'
        );
    },

    getMyApprovedNotPickedUp() {
        return this.borrowRequests.filter(r =>
            r.studentId === (this.currentUser?.id || 1) &&
            r.status === 'approved'
        );
    },

    getMyReturnedBooks() {
        return this.borrowRequests.filter(r =>
            r.studentId === (this.currentUser?.id || 1) &&
            r.status === 'returned'
        );
    },

    getMyOverdueBooks() {
        return this.borrowRequests.filter(r =>
            r.studentId === (this.currentUser?.id || 1) &&
            r.status === 'overdue'
        );
    },

    getMyTotalFine() {
        return this.borrowRequests
            .filter(r => r.studentId === (this.currentUser?.id || 1))
            .reduce((sum, r) => sum + (r.fine || 0), 0);
    },

    getDueSoon(days = 3) {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() + days);
        return this.borrowRequests.filter(r =>
            r.studentId === (this.currentUser?.id || 1) &&
            r.status === 'borrowed' &&
            new Date(r.expectedReturnDate) <= cutoff &&
            new Date(r.expectedReturnDate) >= now
        );
    },

    getAllPendingRequests() {
        return (this.borrowRequests || []).filter(r => r.status === 'pending');
    },

    getAllActiveBorrows() {
        return (this.borrowRequests || []).filter(r => r.status === 'borrowed' || r.status === 'overdue');
    },

    getBookBorrowStatus(bookId) {
        const user = this.currentUser;
        if (!user) return null;
        const req = this.borrowRequests.find(r =>
            r.bookId === bookId &&
            r.studentId === user.id &&
            (r.status === 'pending' || r.status === 'approved' || r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested')
        );
        return req || null;
    },

    toggleFavorite(bookId) {
        const idx = this.favorites.indexOf(bookId);
        if (idx > -1) {
            this.favorites.splice(idx, 1);
            if (this.isSupabaseConnected) {
                Api.removeFavorite(this.currentUser.id, bookId).catch(e => {});
            }
            this.saveAll();
            return false;
        } else {
            this.favorites.push(bookId);
            if (this.isSupabaseConnected) {
                Api.addFavorite(this.currentUser.id, bookId).catch(e => {});
            }
            this.saveAll();
            return true;
        }
    },

    isFavorite(bookId) {
        return this.favorites.includes(bookId);
    },

    addRecentlyViewed(bookId) {
        this.recentlyViewed = this.recentlyViewed.filter(id => id !== bookId);
        this.recentlyViewed.unshift(bookId);
        if (this.recentlyViewed.length > 10) this.recentlyViewed.pop();
        if (this.isSupabaseConnected) {
            Api.addRecentlyViewed(this.currentUser.id, bookId).catch(e => {});
        }
        this.saveAll();
    },

    reserveBook(bookId) {
        const reserveCheck = this.canReserve();
        if (!reserveCheck.allowed) {
            this.addNotification({
                type: 'reservation_blocked',
                title: 'Reservation Blocked',
                message: reserveCheck.reason,
                icon: 'x-circle'
            });
            return false;
        }

        const existing = this.reservations.find(r =>
            r.bookId === bookId && r.studentId === (this.currentUser?.id || 1) && r.status === 'waiting'
        );
        if (existing) return false;

        const queue = this.reservations.filter(r => r.bookId === bookId && r.status === 'waiting');
        const book = this.books.find(b => b.id === bookId);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        const res = {
            id: Date.now(),
            bookId: bookId,
            bookTitle: book ? book.title : '',
            studentId: this.currentUser?.id || 1,
            studentName: this.currentUser?.name || 'Unknown',
            reservedAt: new Date().toISOString(),
            expiresAt: expiryDate.toISOString(),
            status: 'waiting',
            position: queue.length + 1,
            isPhysical: false
        };

        this.reservations.push(res);

        this._addActivityLog('reservation_created', `Reserved "${res.bookTitle}" at position ${res.position}`);

        if (this.isSupabaseConnected) {
            Api.createReservation({
                book_id: bookId,
                book_title: res.bookTitle,
                student_id: res.studentId,
                student_name: res.studentName,
                status: 'waiting'
            }).catch(e => console.warn('Supabase reservation save failed:', e));
        }

        this.addNotification({
            type: 'reservation_approved',
            title: 'Reservation Made',
            message: `Your reservation for "${res.bookTitle}" has been placed. Position in queue: ${res.position}. Expires: ${Utils.formatDate(expiryDate.toISOString().split('T')[0])}`,
            icon: 'calendar'
        });

        this.saveAll();
        return true;
    },

    cancelReservation(reservationId) {
        const reservation = this.reservations.find(r => r.id === reservationId);
        if (!reservation || reservation.status !== 'waiting') return false;

        const userId = this.currentUser?.id;
        if (reservation.studentId !== userId && !this.hasPermission('manage_reservations')) return false;

        reservation.status = 'cancelled';
        this._updateReservationPositions(reservation.bookId);

        this._addActivityLog('reservation_cancelled', `Cancelled reservation for "${reservation.bookTitle}"`);

        this.addNotification({
            type: 'reservation_cancelled',
            title: 'Reservation Cancelled',
            message: `Your reservation for "${reservation.bookTitle}" has been cancelled.`,
            icon: 'x'
        });

        this.saveAll();
        return true;
    },

    createPhysicalReservation(bookId, studentId, studentName) {
        if (!this.hasPermission('manage_physical_reservations')) return null;

        const book = this.books.find(b => b.id === bookId);
        if (!book) return null;

        const queue = this.reservations.filter(r => r.bookId === bookId && r.status === 'waiting');
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        const res = {
            id: Date.now(),
            bookId: bookId,
            bookTitle: book.title,
            studentId: studentId,
            studentName: studentName,
            reservedAt: new Date().toISOString(),
            expiresAt: expiryDate.toISOString(),
            status: 'waiting',
            position: queue.length + 1,
            isPhysical: true,
            createdBy: this.currentUser?.name || 'Librarian'
        };

        this.reservations.push(res);
        this._addAuditLog('physical_reservation', `Created physical reservation of "${book.title}" for ${studentName}`);

        this.addNotification({
            type: 'physical_reservation',
            title: 'Physical Reservation Created',
            message: `A reservation for "${book.title}" has been created for ${studentName} by the librarian.`,
            icon: 'bookmark'
        });

        this.saveAll();
        return res;
    },

    createOfflineBorrow(userDetails, bookId, borrowDays = 14, existingUser = null) {
        if (!this.hasPermission('manage_borrows')) return null;

        const book = this.books.find(b => b.id === bookId);
        if (!book) return null;
        if (book.availableCopies <= 0) return null;

        const name = (userDetails.name || '').trim();
        if (!name) return null;

        const studentId = existingUser && existingUser.id
            ? String(existingUser.id)
            : (this.isSupabaseConnected
                ? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                })
                : Date.now());

        const student = {
            id: studentId,
            name: name,
            email: userDetails.email || (existingUser ? existingUser.email : '') || `${name.toLowerCase().replace(/\s+/g, '.')}@offline.saraswatischool.edu.np`,
            grade: userDetails.grade || (existingUser ? existingUser.grade : '') || '',
            class: userDetails.className || (existingUser ? (existingUser.className || existingUser.class) : '') || '',
            role: userDetails.role || (existingUser ? existingUser.role : undefined) || 'student',
            avatar: (userDetails.name || name).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
            phone: userDetails.phone || (existingUser ? existingUser.phone : '') || '',
            borrowCount: existingUser ? (existingUser.borrowCount || 0) : 0,
            readingStreak: existingUser ? (existingUser.readingStreak || 0) : 0,
            isOffline: true
        };

        if (!this.offlineUsers.some(u => String(u.id) === String(studentId) || (u.email && student.email && String(u.email).toLowerCase() === String(student.email).toLowerCase()))) {
            this.offlineUsers.push(student);
        }
        if (typeof LIBRARY_DATA !== 'undefined' && LIBRARY_DATA.students && !LIBRARY_DATA.students.some(s => String(s.id) === String(studentId) || (s.email && student.email && String(s.email).toLowerCase() === String(student.email).toLowerCase()))) {
            LIBRARY_DATA.students.push(student);
        }
        this.saveOfflineUsers();

        const today = new Date().toISOString().split('T')[0];
        const requestId = this.generateBorrowId();
        const expectedReturn = this.getExpectedReturnDate(today, borrowDays);

        const request = {
            id: requestId,
            bookId: bookId,
            bookTitle: book.title,
            studentId: studentId,
            studentName: student.name,
            borrowDate: today,
            expectedReturnDate: expectedReturn,
            requestTime: new Date().toISOString(),
            status: 'borrowed',
            approvedBy: this.currentUser?.name || 'Librarian',
            approvedAt: new Date().toISOString(),
            fine: 0,
            renewed: false,
            renewCount: 0,
            rejectionReason: '',
            isOffline: true,
            issuedBy: this.currentUser?.name || 'Librarian'
        };

        book.availableCopies--;
        book.borrowCount++;
        this.borrowRequests.push(request);

        this._addAuditLog('offline_borrow', `Issued "${book.title}" offline to ${student.name} (ID: ${requestId}). Due: ${expectedReturn}`);

        if (this.isSupabaseConnected) {
            Promise.all([
                Api.updateBook(book.id, { available_copies: book.availableCopies, borrow_count: book.borrowCount }).catch(e => console.warn('Supabase update failed:', e)),
                Api.createBorrowRequest({
                    id: requestId,
                    book_id: bookId,
                    book_title: book.title,
                    student_id: studentId,
                    student_name: student.name,
                    borrow_date: today,
                    expected_return_date: expectedReturn,
                    request_time: request.requestTime,
                    status: 'borrowed'
                }).catch(e => console.warn('Supabase offline borrow save failed:', e))
            ]);
        }

        this.addNotification({
            type: 'offline_borrow',
            title: 'Book Issued Offline',
            message: `"${book.title}" issued to ${student.name}. Due by ${Utils.formatDate(expectedReturn)}.`,
            icon: 'book-open',
            borrowRequestId: requestId
        });

        this.saveAll();
        return request;
    },

    autoExpireReservations() {
        const now = new Date();
        let expired = false;

        this.reservations.forEach(r => {
            if (r.status === 'waiting' && r.expiresAt && new Date(r.expiresAt) < now) {
                r.status = 'expired';
                expired = true;
                this.addNotification({
                    type: 'reservation_expired',
                    title: 'Reservation Expired',
                    message: `Your reservation for "${r.bookTitle}" has expired.`,
                    icon: 'clock'
                });
            }
        });

        if (expired) {
            this.reservations.filter(r => r.status === 'waiting').forEach(r => {
                this._updateReservationPositions(r.bookId);
            });
            this.saveAll();
        }
    },

    _updateReservationPositions(bookId) {
        const queue = this.reservations
            .filter(r => r.bookId === bookId && r.status === 'waiting')
            .sort((a, b) => new Date(a.reservedAt) - new Date(b.reservedAt));
        queue.forEach((r, i) => { r.position = i + 1; });
    },

    _fulfillReservationIfAny(bookId) {
        const queue = this.reservations
            .filter(r => r.bookId === bookId && r.status === 'waiting')
            .sort((a, b) => a.position - b.position);

        if (queue.length > 0) {
            const next = queue[0];
            this.addNotification({
                type: 'reservation_available',
                title: 'Reserved Book Available',
                message: `"${next.bookTitle}" is now available for you to borrow!`,
                icon: 'check-circle'
            });
        }
    },

    getMyReservations() {
        return this.reservations.filter(r => r.studentId === (this.currentUser?.id || 1));
    },

    searchBooks(query) {
        if (!query) return this.books;
        const q = query.toLowerCase();
        return this.books.filter(b =>
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.isbn && b.isbn.includes(q)) ||
            (b.category && b.category.toLowerCase().includes(q)) ||
            (b.publisher && b.publisher.toLowerCase().includes(q))
        );
    },

    getAllStudyMaterials() {
        return this.studyMaterials || [];
    },

    searchStudyMaterials(query, filters) {
        let items = (this.studyMaterials || []).slice();
        if (query) {
            const q = query.toLowerCase();
            items = items.filter(m =>
                (m.title || '').toLowerCase().includes(q) ||
                (m.subject || '').toLowerCase().includes(q) ||
                (m.description || '').toLowerCase().includes(q)
            );
        }
        if (filters) {
            if (filters.type) items = items.filter(m => m.type === filters.type);
            if (filters.grade) items = items.filter(m => String(m.grade) === String(filters.grade));
            if (filters.subject) items = items.filter(m => m.subject === filters.subject);
            if (filters.year) items = items.filter(m => String(m.year) === String(filters.year));
        }
        return items;
    },

    addStudyMaterial(data) {
        const material = {
            id: Date.now(),
            title: (data.title || '').trim(),
            type: data.type || 'notes',
            grade: data.grade || '',
            subject: data.subject || '',
            year: data.year || '',
            examType: data.examType || '',
            pdfUrl: data.pdfUrl || '',
            description: data.description || '',
            uploadedBy: data.uploadedBy || (this.currentUser ? this.currentUser.name : 'Librarian'),
            uploadedAt: new Date().toISOString().split('T')[0],
            downloads: 0
        };
        if (!material.title) return null;
        this.studyMaterials.unshift(material);
        this._addAuditLog('study_material_uploaded', `Uploaded study material "${material.title}"`);
        if (this.isSupabaseConnected && typeof Api.createStudyMaterial === 'function') {
            Api.createStudyMaterial({
                title: material.title,
                type: material.type,
                grade: material.grade,
                subject: material.subject,
                year: material.year,
                exam_type: material.examType,
                pdf_url: material.pdfUrl,
                description: material.description,
                uploaded_by: material.uploadedBy
            }).then(created => {
                if (created && created.id) material.id = created.id;
            }).catch(e => console.warn('Supabase study material save failed:', e));
        }
        this.saveAll();
        return material;
    },

    updateStudyMaterial(id, updates) {
        const material = this.studyMaterials.find(m => m.id === id);
        if (!material) return false;
        Object.assign(material, updates);
        this._addAuditLog('study_material_updated', `Updated study material "${material.title}"`);
        if (this.isSupabaseConnected && typeof Api.updateStudyMaterial === 'function') {
            Api.updateStudyMaterial(id, {
                title: material.title,
                type: material.type,
                grade: material.grade,
                subject: material.subject,
                year: material.year,
                exam_type: material.examType,
                pdf_url: material.pdfUrl,
                description: material.description
            }).catch(e => console.warn('Supabase update failed:', e));
        }
        this.saveAll();
        return true;
    },

    deleteStudyMaterial(id) {
        const idx = this.studyMaterials.findIndex(m => m.id === id);
        if (idx === -1) return false;
        const [material] = this.studyMaterials.splice(idx, 1);
        this._addAuditLog('study_material_deleted', `Deleted study material "${material.title}"`);
        if (this.isSupabaseConnected && typeof Api.deleteStudyMaterial === 'function') {
            Api.deleteStudyMaterial(id).catch(e => console.warn('Supabase delete failed:', e));
        }
        this.saveAll();
        return true;
    },

    incrementStudyMaterialDownload(id) {
        const material = this.studyMaterials.find(m => m.id === id);
        if (!material) return false;
        material.downloads = (material.downloads || 0) + 1;
        if (this.isSupabaseConnected && typeof Api.updateStudyMaterial === 'function') {
            Api.updateStudyMaterial(id, { downloads: material.downloads }).catch(() => {});
        }
        this.saveAll();
        return true;
    },

    filterBooks(filters) {
        let books = [...this.books];
        if (filters.category) books = books.filter(b => b.category === filters.category);
        if (filters.availability) books = books.filter(b => filters.availability === 'available' ? b.availableCopies > 0 : b.availableCopies === 0);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            books = books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
        }
        if (filters.sort) {
            switch (filters.sort) {
                case 'newest': books.sort((a, b) => b.year - a.year); break;
                case 'oldest': books.sort((a, b) => a.year - b.year); break;
                case 'popular': books.sort((a, b) => b.borrowCount - a.borrowCount); break;
                case 'rating': books.sort((a, b) => b.rating - a.rating); break;
                case 'title': books.sort((a, b) => a.title.localeCompare(b.title)); break;
            }
        }
        return books;
    },

    importBookFromCDC(grade, subject) {
        if (!this.hasPermission('import_books')) return null;

        const gradeLabel = `Grade ${grade}`;
        const cdcBook = {
            id: Date.now(),
            title: `${subject} ${gradeLabel} - CDC Curriculum`,
            author: 'CDC Nepal',
            isbn: `CDC-${grade}-${subject.replace(/\s+/g, '').substring(0, 3).toUpperCase()}-${Date.now()}`,
            category: subject,
            grade: grade.toString(),
            year: new Date().getFullYear(),
            publisher: 'Curriculum Development Centre',
            totalCopies: 5,
            availableCopies: 5,
            borrowCount: 0,
            rating: 0,
            coverColor: '#2563EB',
            description: `Official CDC textbook for ${subject}, ${gradeLabel}.`,
            source: 'CDC Import',
            importedAt: new Date().toISOString(),
            importedBy: this.currentUser?.name || 'Admin'
        };

        this.books.push(cdcBook);

        this.bookImports.push({
            id: Date.now(),
            bookId: cdcBook.id,
            bookTitle: cdcBook.title,
            grade: grade,
            subject: subject,
            importedAt: cdcBook.importedAt,
            importedBy: cdcBook.importedBy,
            source: 'CDC'
        });

        this._addAuditLog('book_imported', `Imported CDC book "${cdcBook.title}"`);

        this.addNotification({
            type: 'book_imported',
            title: 'Book Imported from CDC',
            message: `"${cdcBook.title}" has been imported into the library.`,
            icon: 'download'
        });

        this.saveAll();
        return cdcBook;
    },

    _addActivityLog(type, message) {
        this.activityLogs.unshift({
            id: Date.now(),
            type: type,
            message: message,
            userId: this.currentUser?.id || null,
            userName: this.currentUser?.name || 'System',
            timestamp: new Date().toISOString()
        });
        if (this.activityLogs.length > 500) this.activityLogs.length = 500;
    },

    _addAuditLog(type, message) {
        this.auditLogs.unshift({
            id: Date.now(),
            type: type,
            message: message,
            userId: this.currentUser?.id || null,
            userName: this.currentUser?.name || 'System',
            userRole: this.currentUser?.role || 'unknown',
            timestamp: new Date().toISOString()
        });
        if (this.auditLogs.length > 1000) this.auditLogs.length = 1000;
        this.saveAll();
    },

    _startSessionManagement() {
        this._lastActivityTime = Date.now();
        this._clearSessionTimers();

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        const resetTimer = () => {
            this._lastActivityTime = Date.now();
        };
        events.forEach(evt => document.addEventListener(evt, resetTimer, { passive: true }));
        this._sessionResetHandler = resetTimer;

        this._sessionTimer = setInterval(() => {
            const elapsed = (Date.now() - this._lastActivityTime) / 60000;
            if (elapsed >= this._sessionTimeoutMinutes) {
                this._sessionExpired();
            } else if (elapsed >= this._sessionWarningMinutes && !this._sessionWarned) {
                this._sessionWarned = true;
                this.addNotification({
                    type: 'session_warning',
                    title: 'Session Expiring',
                    message: `Your session will expire in ${this._sessionTimeoutMinutes - this._sessionWarningMinutes} minutes due to inactivity.`,
                    icon: 'alert-triangle'
                });
                if (typeof Utils !== 'undefined' && Utils.toast) {
                    Utils.toast('Session will expire soon due to inactivity. Move your mouse to stay logged in.', 'warning');
                }
            }
        }, 30000);
        this._sessionWarned = false;
    },

    _clearSessionTimers() {
        if (this._sessionTimer) clearInterval(this._sessionTimer);
        this._sessionTimer = null;
        this._sessionWarned = false;
    },

    _sessionExpired() {
        this._clearSessionTimers();
        this._addAuditLog('session_expired', `Session expired for ${this.currentUser?.name || 'unknown'}`);
        this.setUser(null);
        this.isLoggedIn = false;
        localStorage.removeItem('library_currentUser');
        localStorage.removeItem('library_access_token');
        if (typeof Utils !== 'undefined' && Utils.toast) {
            Utils.toast('Session expired due to inactivity. Please log in again.', 'error');
        }
        if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
            window.location.hash = '#/login';
            window.location.reload();
        }
    }
};
