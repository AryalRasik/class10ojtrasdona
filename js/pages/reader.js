// Secure in-site PDF reader.
//
// The bytes never come from a public Storage URL: they are fetched from
// GET /api/books/:id/pdf with the reader's Supabase token, and the server
// only answers when canReadBook() says this user holds an approved, in-date
// borrow for this book. The reader therefore always asks the server first
// (/access), shows WHY access is refused when it is, and only then loads
// pdf.js (served locally from /vendor/pdfjs) to render the document.
const ReaderPage = {
    bookId: null,
    pdfDoc: null,
    pageNum: 1,
    total: 0,
    scale: 1.4,
    renderTask: null,
    renderToken: 0,
    textCache: {},
    searchTerm: '',
    searchMatches: [],
    matchIndex: -1,
    access: null,
    _keyHandler: null,
    _leaveHandler: null,
    _pdfjsPromise: null,

    render(params) {
        const bookId = parseInt(params.id, 10);
        const book = AppState.books.find(b => b.id === bookId);
        const title = book ? book.title : 'Book';
        const backHref = `#/book/${bookId}`;

        return `
        <style>
            #readerShell {
                position: fixed; inset: 0; z-index: 900;
                display: flex; flex-direction: column;
                background: var(--bg-primary, #0f1115); color: var(--text-primary, #e5e7eb);
            }
            .reader-toolbar {
                display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
                padding: 10px 14px; border-bottom: 1px solid var(--border-light, rgba(255,255,255,.08));
                background: var(--bg-card, #161a22);
            }
            .reader-toolbar .tb-group { display: flex; align-items: center; gap: 6px; }
            .reader-toolbar .tb-spacer { flex: 1; }
            .tb-btn {
                display: inline-flex; align-items: center; justify-content: center; gap: 6px;
                min-width: 34px; height: 34px; padding: 0 9px;
                border: 1px solid var(--border-light, rgba(255,255,255,.12));
                border-radius: 8px; background: transparent; color: inherit;
                font-size: 0.9rem; font-weight: 600; cursor: pointer; line-height: 1;
                transition: background .15s ease, border-color .15s ease;
            }
            .tb-btn:hover:not(:disabled) { background: rgba(99,102,241,.15); border-color: var(--primary, #6366f1); }
            .tb-btn:disabled { opacity: .4; cursor: not-allowed; }
            .tb-input {
                width: 54px; height: 34px; text-align: center;
                border: 1px solid var(--border-light, rgba(255,255,255,.12));
                border-radius: 8px; background: transparent; color: inherit;
                font-size: 0.9rem; font-weight: 600;
            }
            .reader-toolbar .tb-title { display: flex; flex-direction: column; min-width: 120px; max-width: 320px; }
            .reader-toolbar .tb-title strong { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .reader-toolbar .tb-title span { font-size: 0.72rem; color: var(--text-secondary, #9ca3af); }
            .tb-total { font-size: 0.85rem; color: var(--text-secondary, #9ca3af); font-weight: 600; }
            .tb-search {
                display: flex; align-items: center; gap: 6px;
                border: 1px solid var(--border-light, rgba(255,255,255,.12));
                border-radius: 8px; padding: 0 6px; height: 34px;
            }
            .tb-search input {
                border: none; outline: none; background: transparent; color: inherit;
                width: 150px; font-size: 0.85rem;
            }
            .tb-search .tb-count { font-size: 0.72rem; color: var(--text-secondary, #9ca3af); white-space: nowrap; }
            .tb-search .tb-btn { min-width: 26px; width: 26px; height: 26px; padding: 0; border: none; }
            .reader-stage {
                position: relative; flex: 1; overflow: auto;
                display: flex; justify-content: center; align-items: flex-start;
                padding: 20px; background: var(--bg-secondary, #0b0d11);
            }
            .reader-canvas-wrap { position: relative; display: inline-block; box-shadow: 0 10px 40px rgba(0,0,0,.45); }
            #readerCanvas { display: block; background: #fff; border-radius: 2px; }
            .reader-marks { position: absolute; inset: 0; pointer-events: none; }
            .reader-marks .rmark {
                position: absolute; background: rgba(250, 204, 21, .45);
                border-radius: 3px; mix-blend-mode: multiply;
            }
            .reader-overlay {
                position: absolute; inset: 0; display: none;
                align-items: center; justify-content: center; padding: 24px;
                background: var(--bg-secondary, #0b0d11); z-index: 5;
            }
            .reader-overlay.active { display: flex; }
            .reader-panel {
                max-width: 560px; width: 100%; text-align: center;
                background: var(--bg-card, #161a22);
                border: 1px solid var(--border-light, rgba(255,255,255,.1));
                border-radius: 16px; padding: 32px 28px;
            }
            .reader-panel .rp-icon { color: var(--text-secondary, #9ca3af); margin-bottom: 10px; }
            .reader-panel h3 { margin: 0 0 8px; font-size: 1.15rem; }
            .reader-panel p { margin: 0 0 18px; color: var(--text-secondary, #9ca3af); font-size: 0.92rem; line-height: 1.55; }
            .reader-panel .rp-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
            .reader-panel .rp-badge { display: inline-block; margin-bottom: 12px; }
            .reader-footer {
                display: flex; align-items: center; justify-content: space-between; gap: 12px;
                padding: 8px 14px; border-top: 1px solid var(--border-light, rgba(255,255,255,.08));
                background: var(--bg-card, #161a22);
                font-size: 0.8rem; color: var(--text-secondary, #9ca3af);
            }
            .reader-spinner {
                width: 38px; height: 38px; margin: 0 auto 14px;
                border: 3px solid rgba(99,102,241,.25); border-top-color: var(--primary, #6366f1);
                border-radius: 50%; animation: readerSpin .8s linear infinite;
            }
            @keyframes readerSpin { to { transform: rotate(360deg); } }
            @media (max-width: 860px) {
                .reader-toolbar { gap: 8px; padding: 8px 10px; }
                .reader-toolbar .tb-title { max-width: 160px; }
                .tb-search input { width: 90px; }
                .tb-hide-sm { display: none !important; }
                .reader-stage { padding: 10px; }
            }
        </style>

        <div class="reader-shell" id="readerShell">
            <div class="reader-toolbar">
                <div class="tb-group">
                    <a href="${backHref}" class="tb-btn" data-nav title="Back to book">${Utils.getIcon('arrow-left', 16)}</a>
                    <div class="tb-title">
                        <strong id="readerBookTitle">${Utils.escapeHtml(title)}</strong>
                        <span id="readerStatus">Checking access&hellip;</span>
                    </div>
                </div>

                <div class="tb-group" id="readerPageControls">
                    <button class="tb-btn" id="rPrev" title="Previous page" disabled><span style="transform:scaleX(-1);display:inline-flex">${Utils.getIcon('chevron-right', 16)}</span></button>
                    <input class="tb-input" id="rPage" value="1" inputmode="numeric" aria-label="Page number" disabled>
                    <span class="tb-total" id="rTotal">/ &ndash;</span>
                    <button class="tb-btn" id="rNext" title="Next page" disabled>${Utils.getIcon('chevron-right', 16)}</button>
                    <span class="tb-btn tb-hide-sm" style="pointer-events:none;border:none" id="rZoomLabel">140%</span>
                    <button class="tb-btn" id="rZoomOut" title="Zoom out" disabled>&minus;</button>
                    <button class="tb-btn" id="rZoomIn" title="Zoom in" disabled>+</button>
                    <button class="tb-btn tb-hide-sm" id="rFit" title="Fit width" disabled>Fit width</button>
                </div>

                <div class="tb-spacer"></div>

                <div class="tb-group">
                    <div class="tb-search">
                        ${Utils.getIcon('search', 14)}
                        <input id="rSearch" placeholder="Search in this book" disabled aria-label="Search in this book">
                        <span class="tb-count" id="rSearchCount"></span>
                        <button class="tb-btn" id="rSearchPrev" title="Previous match" disabled>&lsaquo;</button>
                        <button class="tb-btn" id="rSearchNext" title="Next match" disabled>&rsaquo;</button>
                    </div>
                    <button class="tb-btn tb-hide-sm" id="rFull" title="Full screen">Full screen</button>
                    <a href="${backHref}" class="tb-btn" data-nav title="Close reader">${Utils.getIcon('x', 16)}</a>
                </div>
            </div>

            <div class="reader-stage" id="readerStage">
                <div class="reader-canvas-wrap" id="readerWrap" style="display:none">
                    <canvas id="readerCanvas"></canvas>
                    <div class="reader-marks" id="readerMarks"></div>
                </div>
                <div class="reader-overlay active" id="readerOverlay"></div>
            </div>

            <div class="reader-footer">
                <span id="readerPageInfo">Page &ndash; / &ndash;</span>
                <span id="readerAccessInfo"></span>
            </div>
        </div>`;
    },

    afterRender(params) {
        this.boot(parseInt(params.id, 10));
    },

    // ── boot / access ─────────────────────────────────────
    async boot(bookId) {
        this.bookId = bookId;
        this.pdfDoc = null;
        this.textCache = {};
        this.searchMatches = [];
        this.searchTerm = '';
        this.matchIndex = -1;

        this._teardown();
        this._leaveHandler = () => this._teardown();
        window.addEventListener('hashchange', this._leaveHandler);
        this._keyHandler = (e) => this._onKey(e);
        document.addEventListener('keydown', this._keyHandler);

        this._bindControls();

        const book = AppState.books.find(b => b.id === bookId);
        if (!book) {
            return this._panel('error', {
                icon: 'search',
                title: 'Book not found',
                message: 'This book may have been removed.',
                actions: [{ label: 'Browse Books', href: '#/books', primary: true }]
            });
        }

        if (!AppState.currentUser) {
            return this._panel('denied', {
                icon: 'lock',
                badge: 'Sign in required',
                title: 'Sign in to read',
                message: 'Reading a book requires a signed-in library account and an approved borrow request.',
                actions: [{ label: 'Sign in', href: '#/login', primary: true }, { label: 'Back to Book', href: `#/book/${bookId}` }]
            });
        }

        this._panel('loading', { message: 'Checking reading access&hellip;' });

        // Server decides - the browser never assumes it is allowed.
        const access = await Api.getBookPdfAccess(bookId);
        this.access = access;
        if (!access.canRead) return this._renderDenied(bookId, access);

        this._panel('loading', { message: 'Opening the PDF&hellip;' });
        try {
            const blob = await Api.fetchBookPdfBlob(bookId);
            const buffer = await blob.arrayBuffer();
            const pdfjsLib = await this._loadPdfJs();
            this.pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            this.total = this.pdfDoc.numPages;

            document.getElementById('readerWrap').style.display = '';
            document.getElementById('rTotal').textContent = `/ ${this.total}`;
            document.getElementById('readerOverlay').classList.remove('active');
            this._enableControls(true);

            const due = access.dueDate || access.startDate;
            const statusText = access.status === 'staff'
                ? 'Staff preview'
                : (due ? `Reading access open until ${due}` : 'Reading access open');
            document.getElementById('readerStatus').textContent = statusText;
            document.getElementById('readerAccessInfo').textContent = access.message || '';
            document.getElementById('readerPageInfo').textContent = `Page 1 / ${this.total}`;

            await this.fitWidth();
        } catch (e) {
            console.error('PDF open failed:', e);
            if (e && e.code === 'external' && e.externalUrl) {
                document.getElementById('readerStatus').textContent = 'External copy';
                return this._panel('external', {
                    icon: 'external-link',
                    badge: 'Approved',
                    title: 'This copy lives outside the library',
                    message: 'Your borrow is approved. This PDF is hosted by the original publisher, so it opens in a new tab instead of the secure reader.',
                    actions: [
                        { label: 'Open PDF in new tab', href: e.externalUrl, primary: true, external: true },
                        { label: 'Back to Book', href: `#/book/${bookId}` }
                    ]
                });
            }
            this._panel('error', {
                icon: 'alert-triangle',
                title: 'Could not open the PDF',
                message: (e && e.message) ? e.message : 'The document failed to load. Please try again.',
                actions: [{ label: 'Back to Book', href: `#/book/${bookId}` }]
            });
        }
    },

    _renderDenied(bookId, access) {
        const labels = {
            pending: 'Pending approval',
            rejected: 'Request rejected',
            expired: 'Access expired',
            returned: 'Book returned',
            no_request: 'Not requested yet',
            no_pdf: 'No digital copy',
            not_started: 'Not started yet',
            signed_out: 'Sign in required',
            error: 'Error',
            offline: 'Offline',
            unconfigured: 'Unavailable'
        };
        const actions = [];
        if (access.status === 'signed_out') actions.push({ label: 'Sign in', href: '#/login', primary: true });
        else actions.push({ label: 'Back to Book', href: `#/book/${bookId}`, primary: true });
        actions.push({ label: 'Browse Books', href: '#/books' });

        document.getElementById('readerStatus').textContent = labels[access.status] || 'Access denied';
        const info = document.getElementById('readerAccessInfo');
        if (info) info.textContent = access.message || '';

        this._panel('denied', {
            icon: 'lock',
            badge: labels[access.status] || 'Access denied',
            title: 'You cannot read this book yet',
            message: access.message || 'You do not have permission to read this book.',
            actions
        });
    },

    // ── overlay panels (loading / denied / error) ─────────
    _panel(kind, opts) {
        const overlay = document.getElementById('readerOverlay');
        if (!overlay) return;
        const o = opts || {};
        if (kind === 'loading') {
            overlay.innerHTML = `<div class="reader-panel"><div class="reader-spinner"></div><p>${o.message || 'Loading&hellip;'}</p></div>`;
        } else {
            const actions = (o.actions || []).map(a => {
                if (!a.href) return `<button class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" data-action="${a.action || ''}">${Utils.escapeHtml(a.label)}</button>`;
                if (a.external) return `<a href="${a.href}" target="_blank" rel="noopener noreferrer" class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}">${Utils.escapeHtml(a.label)}</a>`;
                return `<a href="${a.href}" class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" data-nav>${Utils.escapeHtml(a.label)}</a>`;
            }).join('');
            overlay.innerHTML = `
                <div class="reader-panel">
                    <div class="rp-icon">${Utils.getIcon(o.icon || 'info', 44)}</div>
                    ${o.badge ? `<span class="badge ${kind === 'denied' ? 'badge-warning' : kind === 'external' ? 'badge-success' : 'badge-danger'} rp-badge">${Utils.escapeHtml(o.badge)}</span>` : ''}
                    <h3>${Utils.escapeHtml(o.title || '')}</h3>
                    <p>${o.message || ''}</p>
                    <div class="rp-actions">${actions}</div>
                </div>`;
        }
        overlay.classList.add('active');
        const wrap = document.getElementById('readerWrap');
        if (wrap && kind !== 'loading') wrap.style.display = 'none';
        if (wrap && kind === 'loading') wrap.style.display = 'none';
    },

    // ── pdf.js loading (local vendor copy, never a CDN) ───
    _loadPdfJs() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (this._pdfjsPromise) return this._pdfjsPromise;
        this._pdfjsPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/vendor/pdfjs/pdf.min.js';
            script.onload = () => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
                    resolve(window.pdfjsLib);
                } else {
                    reject(new Error('The PDF reader library did not initialise.'));
                }
            };
            script.onerror = () => reject(new Error('Could not load the PDF reader library.'));
            document.head.appendChild(script);
        });
        return this._pdfjsPromise;
    },

    // ── controls ──────────────────────────────────────────
    _enableControls(on) {
        ['rPrev', 'rNext', 'rZoomIn', 'rZoomOut', 'rFit', 'rSearchNext', 'rSearchPrev'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !on;
        });
        ['rPage', 'rSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !on;
        });
    },

    _bindControls() {
        const on = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };
        on('rPrev', () => this.renderPage(this.pageNum - 1));
        on('rNext', () => this.renderPage(this.pageNum + 1));
        on('rZoomIn', () => this.setScale(this.scale * 1.2));
        on('rZoomOut', () => this.setScale(this.scale / 1.2));
        on('rFit', () => this.fitWidth());
        on('rFull', () => this.toggleFullscreen());
        on('rSearchNext', () => this._gotoMatch(this.matchIndex + 1));
        on('rSearchPrev', () => this._gotoMatch(this.matchIndex - 1));

        const pageInput = document.getElementById('rPage');
        if (pageInput) {
            pageInput.addEventListener('change', () => {
                const n = parseInt(pageInput.value, 10);
                if (Number.isInteger(n)) this.renderPage(n); else pageInput.value = this.pageNum;
            });
            pageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') pageInput.blur(); });
        }

        const search = document.getElementById('rSearch');
        if (search) {
            search.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._runSearch(search.value, e.shiftKey ? 'prev' : 'next');
                } else if (e.key === 'Escape') {
                    search.value = '';
                    this._runSearch('', 1);
                }
            });
            search.addEventListener('input', () => {
                if (!search.value.trim()) this._runSearch('', 1);
            });
        }

        document.addEventListener('fullscreenchange', () => {
            const btn = document.getElementById('rFull');
            if (btn) btn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
        });
    },

    _onKey(e) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
        if (!this.pdfDoc) return;

        switch (e.key) {
            case 'ArrowLeft':
            case 'PageUp':
                e.preventDefault(); this.renderPage(this.pageNum - 1); break;
            case 'ArrowRight':
            case 'PageDown':
            case ' ':
                e.preventDefault(); this.renderPage(this.pageNum + 1); break;
            case '+':
            case '=':
                e.preventDefault(); this.setScale(this.scale * 1.2); break;
            case '-':
            case '_':
                e.preventDefault(); this.setScale(this.scale / 1.2); break;
            case 'f':
            case 'F':
                e.preventDefault(); this.toggleFullscreen(); break;
            case '/': {
                e.preventDefault();
                const s = document.getElementById('rSearch');
                if (s) s.focus();
                break;
            }
            default: break;
        }
    },

    _teardown() {
        window.removeEventListener('hashchange', this._leaveHandler);
        document.removeEventListener('keydown', this._keyHandler);
        if (this.renderTask) { try { this.renderTask.cancel(); } catch (e) { /* noop */ } this.renderTask = null; }
    },

    // ── rendering ─────────────────────────────────────────
    async renderPage(num) {
        if (!this.pdfDoc) return;
        const token = ++this.renderToken;
        const target = Math.min(Math.max(1, num | 0), this.total);
        this.pageNum = target;

        if (this.renderTask) { try { this.renderTask.cancel(); } catch (e) { /* noop */ } this.renderTask = null; }

        const page = await this.pdfDoc.getPage(target);
        if (token !== this.renderToken) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: this.scale * dpr });
        const canvas = document.getElementById('readerCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        this.renderTask = page.render({ canvasContext: ctx, viewport });
        try {
            await this.renderTask.promise;
        } catch (err) {
            if (err && err.name === 'RenderingCancelledException') return;
            console.warn('Page render failed:', err);
            return;
        }
        if (token !== this.renderToken) return;
        this.renderTask = null;

        this._syncPageUI();
        await this._applyHighlights();
    },

    async setScale(scale) {
        this.scale = Math.min(4, Math.max(0.4, scale));
        const label = document.getElementById('rZoomLabel');
        if (label) label.textContent = `${Math.round(this.scale * 100)}%`;
        await this.renderPage(this.pageNum);
    },

    async fitWidth() {
        if (!this.pdfDoc) return;
        try {
            const page = await this.pdfDoc.getPage(1);
            const base = page.getViewport({ scale: 1 });
            const stage = document.getElementById('readerStage');
            const avail = (stage ? stage.clientWidth : 900) - 48;
            const scale = avail / base.width;
            const label = document.getElementById('rZoomLabel');
            this.scale = Math.min(4, Math.max(0.4, scale));
            if (label) label.textContent = `${Math.round(this.scale * 100)}%`;
        } catch (e) { /* fall back to current scale */ }
        await this.renderPage(this.pageNum);
    },

    toggleFullscreen() {
        const shell = document.getElementById('readerShell');
        if (!shell) return;
        try {
            if (!document.fullscreenElement) shell.requestFullscreen();
            else document.exitFullscreen();
        } catch (e) { /* not supported */ }
    },

    _syncPageUI() {
        const pageInfo = document.getElementById('readerPageInfo');
        if (pageInfo) pageInfo.textContent = `Page ${this.pageNum} / ${this.total || '–'}`;
        const input = document.getElementById('rPage');
        if (input && document.activeElement !== input) input.value = this.pageNum;
        const prev = document.getElementById('rPrev');
        const next = document.getElementById('rNext');
        if (prev) prev.disabled = this.pageNum <= 1;
        if (next) next.disabled = this.pageNum >= this.total;
    },

    // ── search ────────────────────────────────────────────
    async _pageItems(pageNum) {
        if (this.textCache[pageNum]) return this.textCache[pageNum];
        const page = await this.pdfDoc.getPage(pageNum);
        const content = await page.getTextContent();
        this.textCache[pageNum] = content.items || [];
        return this.textCache[pageNum];
    },

    async _runSearch(term, mode) {
        const countEl = document.getElementById('rSearchCount');
        this.searchTerm = (term || '').trim();
        if (!this.pdfDoc || !this.searchTerm) {
            this.searchMatches = [];
            this.matchIndex = -1;
            this._lastNeedle = '';
            if (countEl) countEl.textContent = '';
            const marks = document.getElementById('readerMarks');
            if (marks) marks.innerHTML = '';
            return;
        }

        const needle = this.searchTerm.toLowerCase();
        if (this._lastNeedle !== needle || !this.searchMatches.length) {
            this._lastNeedle = needle;
            if (countEl) countEl.textContent = 'Searching…';
            const matches = [];
            for (let p = 1; p <= this.total; p++) {
                const items = await this._pageItems(p);
                let count = 0;
                for (const item of items) {
                    const hay = (item.str || '').toLowerCase();
                    if (!hay) continue;
                    let i = hay.indexOf(needle);
                    while (i >= 0) { count++; i = hay.indexOf(needle, i + needle.length); }
                }
                if (count) matches.push({ page: p, count });
            }
            this.searchMatches = matches;
            this.matchIndex = 0;
        } else if (mode === 'next') {
            this.matchIndex = (this.matchIndex + 1) % this.searchMatches.length;
        } else if (mode === 'prev') {
            this.matchIndex = (this.matchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
        }

        if (!this.searchMatches.length) {
            this.matchIndex = -1;
            if (countEl) countEl.textContent = 'No matches';
            return;
        }

        const match = this.searchMatches[this.matchIndex];
        if (countEl) countEl.textContent = `${this.matchIndex + 1}/${this.searchMatches.length} · p.${match.page}`;
        if (match.page !== this.pageNum) await this.renderPage(match.page);
        else await this._applyHighlights();
    },

    async _gotoMatch(index) {
        if (!this.searchMatches.length) return;
        this.matchIndex = (index + this.searchMatches.length) % this.searchMatches.length;
        const match = this.searchMatches[this.matchIndex];
        const countEl = document.getElementById('rSearchCount');
        if (countEl) countEl.textContent = `${this.matchIndex + 1}/${this.searchMatches.length} · p.${match.page}`;
        if (match.page !== this.pageNum) await this.renderPage(match.page);
        else await this._applyHighlights();
    },

    // Highlights every occurrence of the search term on the current page by
    // mapping pdf.js text items through the same viewport used for the canvas.
    async _applyHighlights() {
        const marks = document.getElementById('readerMarks');
        if (!marks) return;
        marks.innerHTML = '';
        if (!this.searchTerm || !this.pdfDoc) return;
        const match = this.searchMatches.find(m => m.page === this.pageNum);
        if (!match) return;

        try {
            const pdfjsLib = window.pdfjsLib;
            const page = await this.pdfDoc.getPage(this.pageNum);
            const content = await page.getTextContent();
            const viewport = page.getViewport({ scale: this.scale });
            const needle = this.searchTerm.toLowerCase();
            const html = [];

            content.items.forEach(item => {
                const str = item.str || '';
                if (!str || str.toLowerCase().indexOf(needle) < 0) return;
                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                const height = Math.hypot(tx[2], tx[3]) || 10;
                const boxWidth = (item.width || 0) * viewport.scale;
                const left = tx[4];
                const top = tx[5] - height;
                const lower = str.toLowerCase();
                let i = lower.indexOf(needle);
                while (i >= 0) {
                    const x = left + (boxWidth * i) / str.length;
                    const w = Math.max(6, (boxWidth * needle.length) / str.length);
                    html.push(`<div class="rmark" style="left:${x.toFixed(1)}px;top:${top.toFixed(1)}px;width:${w.toFixed(1)}px;height:${(height * 1.1).toFixed(1)}px"></div>`);
                    i = lower.indexOf(needle, i + needle.length);
                }
            });
            marks.innerHTML = html.join('');
        } catch (e) {
            console.warn('Highlight failed:', e);
        }
    }
};
