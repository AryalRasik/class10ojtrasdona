const DeveloperPage = {
    render() {
        const u = AppState.currentUser || {};
        const DP = typeof AppState.DEVELOPER_PROFILE !== 'undefined' ? AppState.DEVELOPER_PROFILE : {};
        const stats = typeof AppState.getDashboardStats === 'function' ? AppState.getDashboardStats() : {};
        const mode = AppState.isDemoMode ? { label: 'Offline Demo', icon: 'save', color: '#f59e0b' } : (AppState.isSupabaseConnected ? { label: 'Supabase Live', icon: 'globe', color: '#10b981' } : { label: 'Unknown', icon: 'alert-circle', color: '#ef4444' });
        const lsBytes = this._localStorageBytes();
        const lsKeys = this._localStorageKeys().length;

        const totals = [
            { label: 'Total Books', value: stats.totalBooks || 0, icon: 'book-open' },
            { label: 'Available', value: stats.availableBooks || 0, icon: 'check' },
            { label: 'Students', value: stats.totalStudents || 0, icon: 'users' },
            { label: 'Active Borrows', value: stats.activeBorrows || 0, icon: 'bar-chart' },
            { label: 'Monthly Borrowing', value: stats.monthlyBorrowing || 0, icon: 'zap' },
            { label: 'Total Borrows', value: stats.totalBorrows || 0, icon: 'layers' }
        ];

        return `
            <div class="page-header" style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:3rem 0;color:#fff;">
                <div class="container" style="text-align:center;">
                    <span style="display:inline-flex;align-items:center;gap:0.5rem;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);color:#fff;font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:0.35rem 0.9rem;border-radius:50px;margin-bottom:1rem;">
                        ${Utils.getIcon('shield', 14)} Owner Only — Hidden From All Users
                    </span>
                    <h1 class="page-title" style="color:#fff;margin-bottom:0.5rem;">${Utils.getIcon('cpu', 28)} Developer Console</h1>
                    <p class="page-description" style="color:rgba(255,255,255,0.85);">Saraswati Secondary School Library — Class 10 & 11 Project · Created by Rasik Aryal</p>
                </div>
            </div>
            <div class="container" style="padding:0 1rem 2rem;max-width:1100px;margin:0 auto;">

                <div class="card" style="display:flex;gap:1.25rem;align-items:center;padding:1.5rem;margin-top:1.25rem;">
                    <img src="assets/developer-avatar.jpg" alt="${Utils.escapeHtml(u.name || DP.name || 'Owner')}" style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <h2 style="margin:0 0 0.25rem;font-size:1.1rem;">${Utils.escapeHtml(u.name || DP.name || 'Site Owner')}</h2>
                        <p style="margin:0 0 0.35rem;font-size:0.83rem;color:var(--text-secondary);">${Utils.escapeHtml(u.email || DP.email || 'Sign in to see your account')}</p>
                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                            <span style="background:var(--primary-light);color:var(--primary);font-size:0.72rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:50px;">Developer Access</span>
                            <span style="background:var(--bg-tertiary);color:var(--text-secondary);font-size:0.72rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:50px;">${Utils.escapeHtml(u.role || 'guest')}</span>
                            <span style="background:var(--bg-tertiary);color:var(--text-secondary);font-size:0.72rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:50px;">ID: ${Utils.escapeHtml(String(u.id ?? '—'))}</span>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="display:inline-flex;align-items:center;gap:0.4rem;background:${mode.color}1a;color:${mode.color};font-weight:700;font-size:0.8rem;padding:0.35rem 0.8rem;border-radius:50px;">${Utils.getIcon(mode.icon, 14)} ${mode.label}</div>
                    </div>
                </div>

                <div class="card" style="padding:1.25rem;margin-top:1.25rem;">
                    <h3 style="margin:0 0 1rem;font-size:0.95rem;display:flex;align-items:center;gap:0.5rem;">${Utils.getIcon('user', 16)} About the Developer</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;">
                        ${this._aboutCard('Name', DP.name)}
                        ${this._aboutCard('Address', DP.address)}
                        ${this._aboutCard('Age', DP.age != null ? DP.age + ' years' : null)}
                        ${this._aboutCard('School', DP.school)}
                        ${this._aboutCard('Project', 'Library Management System')}
                        ${this._aboutCard('Course', (DP.projectClasses || []).join(' & '))}
                        ${this._aboutCard('Email', DP.email)}
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;margin-top:1.25rem;">
                    ${totals.map(t => `
                        <div class="card" style="padding:1rem;display:flex;align-items:center;gap:0.75rem;">
                            <div style="width:42px;height:42px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon(t.icon, 20)}</div>
                            <div>
                                <p style="margin:0;font-size:1.25rem;font-weight:800;line-height:1;">${t.value}</p>
                                <p style="margin:0;font-size:0.75rem;color:var(--text-secondary);">${Utils.escapeHtml(t.label)}</p>
                            </div>
                        </div>`).join('')}
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem;margin-top:1.25rem;">
                    <div class="card" style="padding:1.25rem;">
                        <h3 style="margin:0 0 1rem;font-size:0.95rem;display:flex;align-items:center;gap:0.5rem;">${Utils.getIcon('settings', 16)} Environment</h3>
                        <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.83rem;">
                            ${this._row('Mode', mode.label)}
                            ${this._row('Supabase', AppState.isSupabaseConnected ? '<span style="color:var(--success,#10b981);font-weight:600;">Connected</span>' : '<span style="color:var(--text-secondary);">Off</span>')}
                            ${this._row('Endpoint', (window.SUPABASE_URL || '—').replace('https://', ''))}
                            ${this._row('Theme', AppState.theme)}
                            ${this._row('Browser', Utils.escapeHtml(this._ua()))}
                            ${this._row('Locale', Utils.escapeHtml(navigator.language || '—'))}
                        </div>
                    </div>

                    <div class="card" style="padding:1.25rem;">
                        <h3 style="margin:0 0 1rem;font-size:0.95rem;display:flex;align-items:center;gap:0.5rem;">${Utils.getIcon('database', 16)} Storage</h3>
                        <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.83rem;">
                            ${this._row('LocalStorage', this._formatBytes(lsBytes))}
                            ${this._row('Stored keys', String(lsKeys))}
                            ${this._row('Session keys', String(localStorage.length - lsKeys))}
                            ${this._row('Cached books', String((AppState.books || []).length))}
                            ${this._row('Categories', String((AppState.categories || []).length))}
                            ${this._row('Profiles', String((AppState.allProfiles || []).length))}
                        </div>
                    </div>
                </div>

                <div style="margin-top:1.25rem;">
                    <div class="card" style="padding:1.25rem;">
                        <h3 style="margin:0 0 1rem;font-size:0.95rem;display:flex;align-items:center;gap:0.5rem;">${Utils.getIcon('zap', 16)} Developer Tools</h3>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.6rem;">
                            <button class="btn btn-primary" onclick="DeveloperPage.exportSnapshot()">${Utils.getIcon('download', 15)} Export Snapshot</button>
                            <button class="btn btn-outline" onclick="DeveloperPage.copyDiagnostics()">${Utils.getIcon('file-text', 15)} Copy Diagnostics</button>
                            <button class="btn btn-outline" onclick="DeveloperPage.resyncData()">${Utils.getIcon('refresh-cw', 15)} Re-sync Catalog</button>
                            <button class="btn btn-ghost" onclick="DeveloperPage.resetLocalCache()" style="color:var(--danger,#ef4444);">${Utils.getIcon('trash-2', 15)} Reset Local Cache</button>
                        </div>
                        <p style="margin:0.9rem 0 0;font-size:0.78rem;color:var(--text-secondary);">Snapshot exports all live data as JSON. Reset clears this browser's offline cache and reloads fresh data — Supabase data is untouched.</p>
                    </div>
                </div>

                <div class="card" style="padding:1.25rem;margin-top:1.25rem;">
                    <h3 style="margin:0 0 0.75rem;font-size:0.95rem;display:flex;align-items:center;gap:0.5rem;">${Utils.getIcon('info', 16)} Access Control</h3>
                    <p style="margin:0;font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">This page is <strong>hidden</strong> — it has no menu entry and any direct URL attempt shows a fake "Page Not Found" error. It only opens through the secret trigger: click the navbar logo <strong>5 times</strong>. This works on any device, signed in or not.</p>
                </div>
            </div>`;
    },

    _row(label, value) {
        return `<div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;padding:0.35rem 0;border-bottom:1px dashed var(--bg-tertiary,#eceef3);"><span style="color:var(--text-secondary);">${Utils.escapeHtml(label)}</span><span style="font-weight:600;text-align:right;word-break:break-all;">${value}</span></div>`;
    },

    _aboutCard(label, value) {
        if (!value) value = '—';
        return `
            <div style="background:var(--bg-secondary);border-radius:10px;padding:0.85rem 1rem;">
                <p style="margin:0 0 0.2rem;font-size:0.72rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-secondary);">${Utils.escapeHtml(label)}</p>
                <p style="margin:0;font-size:0.92rem;font-weight:600;">${Utils.escapeHtml(value)}</p>
            </div>`;
    },

    _ownerEmail() {
        return typeof AppState.DEVELOPER_EMAIL !== 'undefined' ? AppState.DEVELOPER_EMAIL : '—';
    },

    _localStorageKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && /^library_/.test(k)) keys.push(k);
        }
        keys.sort();
        return keys;
    },

    _localStorageBytes() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            total += (localStorage.getItem(k) || '').length * 2;
        }
        return total;
    },

    _formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },

    _ua() {
        const ua = navigator.userAgent;
        const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/?\s*([\d.]+)/);
        return m ? (m[1] + ' ' + m[2]) : 'Unknown';
    },

    _diagnostics() {
        const u = AppState.currentUser || {};
        const stats = typeof AppState.getDashboardStats === 'function' ? AppState.getDashboardStats() : {};
        return [
            `Saraswati Sec School Library — Developer Diagnostics`,
            `Generated: ${new Date().toISOString()}`,
            ``,
            `User: ${u.name || '—'} (${u.email || 'no email'}) · role=${u.role || '—'} · id=${u.id ?? '—'}`,
            `Mode: ${AppState.isDemoMode ? 'offline-demo' : (AppState.isSupabaseConnected ? 'supabase-live' : 'unknown')}`,
            `Supabase connected: ${AppState.isSupabaseConnected}`,
            `Supabase URL: ${window.SUPABASE_URL || '—'}`,
            `Theme: ${AppState.theme} · Locale: ${navigator.language || '—'}`,
            `UA: ${navigator.userAgent}`,
            ``,
            `Catalog: ${stats.totalBooks || 0} books / ${stats.availableBooks || 0} available`,
            `Students: ${stats.totalStudents || 0} · Active borrows: ${stats.activeBorrows || 0} · Monthly: ${stats.monthlyBorrowing || 0} · All time: ${stats.totalBorrows || 0}`,
            `LocalStorage: ${this._localStorageKeys().length} keys / ${this._formatBytes(this._localStorageBytes())}`,
            `Reservations: ${(AppState.reservations || []).length} · Notifications: ${(AppState.notifications || []).length}`
        ].join('\n');
    },

    exportSnapshot() {
        try {
            const data = {
                exportedAt: new Date().toISOString(),
                exportedBy: AppState.currentUser ? AppState.currentUser.email : null,
                stats: typeof AppState.getDashboardStats === 'function' ? AppState.getDashboardStats() : {},
                books: AppState.books,
                categories: AppState.categories,
                borrowRequests: AppState.borrowRequests,
                reservations: AppState.reservations,
                notifications: AppState.notifications,
                announcements: AppState.announcements,
                events: AppState.events,
                digitalBooks: AppState.digitalBooks,
                studyMaterials: AppState.studyMaterials,
                feedback: AppState.feedback,
                faqs: AppState.faqs,
                offlineUsers: AppState.offlineUsers || []
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'library-snapshot-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            Toast.success('Snapshot exported');
        } catch (e) {
            Toast.error('Export failed: ' + e.message);
        }
    },

    copyDiagnostics() {
        const text = this._diagnostics();
        const done = () => Toast.success('Diagnostics copied to clipboard');
        const fail = () => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) { Toast.error('Could not copy diagnostics'); }
            ta.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fail);
        } else {
            fail();
        }
    },

    async resyncData() {
        Toast.info('Re-syncing catalog...');
        try {
            await AppState.init();
            Toast.success('Catalog re-synced');
        } catch (e) {
            console.warn('resync failed, demo fallback:', e);
            try { AppState.initDemoMode(); } catch (err) {}
            Toast.warning('Re-sync failed — switched to offline data');
        }
        Router.resolve();
    },

    resetLocalCache() {
        Modal.confirm('Reset Local Cache', 'This clears all offline app data stored in this browser (session, notifications, borrows, etc.). Supabase / server data is NOT affected. Continue?', () => {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
            keys.forEach(k => { if (k && /^library_/.test(k)) localStorage.removeItem(k); });
            Toast.success('Local cache cleared. Reloading...');
            setTimeout(() => window.location.reload(), 600);
        });
    },

    afterRender() {}
};