// Real-time data layer.
//
// Keeps live views (the Admin Dashboard above all) in sync with the database
// the moment a row changes, instead of waiting for the 15s polling fallback.
//
// Two transports are combined and both funnel into the existing
// `library:data-changed` event that DashboardPage already listens to:
//
//   1. postgres_changes — Supabase pushes an event for every INSERT / UPDATE /
//      DELETE on the watched tables. This also covers changes made from
//      another device or straight from the Supabase dashboard. It only fires
//      once `supabase/realtime.sql` has been run in the SQL editor.
//   2. broadcast — every client announces its own writes on a shared channel,
//      so other open tabs/devices refresh instantly with zero database
//      configuration (covers the gap until the SQL above has been applied).
//
// Everything here is best-effort: if Realtime is unavailable the dashboard
// simply falls back to its polling timer.
window.Realtime = {
    TABLES: [
        'books', 'categories', 'borrow_requests', 'reservations',
        'profiles', 'notifications', 'announcements', 'events',
        'digital_books', 'study_materials', 'settings'
    ],
    CHANNEL_NAME: 'library-data',
    EVENT_NAME: 'data-changed',
    MAX_RETRIES: 5,

    channel: null,
    // idle | connecting | live | polling | error
    status: 'idle',
    lastChangeAt: 0,
    lastSyncAt: 0,

    _debounceTimer: null,
    _announceTimer: null,
    _retryTimer: null,
    _retries: 0,

    isLive() {
        return this.status === 'live';
    },

    _client() {
        try {
            if (window.SupabaseClient && typeof SupabaseClient.get === 'function') {
                return SupabaseClient.get();
            }
        } catch (e) { /* supabase.js not loaded */ }
        return null;
    },

    // Safe to call as often as possible — it only starts one channel.
    start() {
        const client = this._client();
        if (!client) return false;          // demo / offline mode
        if (this.channel) return true;      // already running

        this.status = 'connecting';
        clearTimeout(this._retryTimer);

        let ch;
        try {
            ch = client.channel(this.CHANNEL_NAME, { config: { broadcast: { self: false } } });

            this.TABLES.forEach(table => {
                try {
                    ch.on('postgres_changes', { event: '*', schema: 'public', table },
                        () => this._onChange('db:' + table));
                } catch (e) {
                    console.warn('Realtime: could not watch table ' + table, e);
                }
            });

            ch.on('broadcast', { event: this.EVENT_NAME }, () => this._onChange('peer'));

            ch.subscribe((state) => {
                if (state === 'SUBSCRIBED') {
                    this.status = 'live';
                    this._retries = 0;
                } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
                    this.status = 'polling';
                    this._scheduleRetry();
                } else if (state === 'CLOSED') {
                    this.status = this._retries < this.MAX_RETRIES ? 'polling' : 'error';
                }
            });
        } catch (e) {
            console.warn('Realtime start failed, falling back to polling:', e);
            this.status = 'polling';
            this.channel = null;
            return false;
        }

        this.channel = ch;
        return true;
    },

    stop() {
        clearTimeout(this._retryTimer);
        clearTimeout(this._debounceTimer);
        clearTimeout(this._announceTimer);
        this._retryTimer = this._debounceTimer = this._announceTimer = null;
        const client = this._client();
        if (this.channel && client && typeof client.removeChannel === 'function') {
            try { client.removeChannel(this.channel); } catch (e) { /* already gone */ }
        }
        this.channel = null;
        this.status = 'idle';
    },

    _scheduleRetry() {
        if (this._retries >= this.MAX_RETRIES) {
            this.status = 'error';
            return;
        }
        this._retries++;
        clearTimeout(this._retryTimer);
        const delay = Math.min(3000 * this._retries, 15000);
        this._retryTimer = setTimeout(() => {
            this.stop();
            this.start();
        }, delay);
    },

    // A change arrived from the database or from another client: tell every
    // live view (debounced so bursts collapse into one refresh).
    _onChange(source) {
        this.lastChangeAt = Date.now();
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            try {
                window.dispatchEvent(new CustomEvent('library:data-changed', {
                    detail: { source: source || 'unknown', at: Date.now() }
                }));
            } catch (e) { /* storage/unload edge case */ }
        }, 400);
    },

    // Called from AppState.saveAll() after a local write so that every other
    // open tab/device refreshes immediately, without waiting for a database
    // row event.
    announce() {
        if (!this.channel || this.status !== 'live') return;
        clearTimeout(this._announceTimer);
        this._announceTimer = setTimeout(() => {
            try {
                const sent = this.channel.send({
                    type: 'broadcast',
                    event: this.EVENT_NAME,
                    payload: {
                        at: Date.now(),
                        user: (typeof AppState !== 'undefined' && AppState.currentUser && AppState.currentUser.id) || null
                    }
                });
                if (sent && typeof sent.catch === 'function') sent.catch(() => { });
            } catch (e) { /* channel closing */ }
        }, 200);
    },

    markSynced() {
        this.lastSyncAt = Date.now();
    }
};
