const Notifications = {
    panel: null,
    isOpen: false,

    init() {
        const btn = document.getElementById('notificationBtn');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        document.addEventListener('click', (e) => {
            if (this.panel && !this.panel.contains(e.target)) this.hide();
        });
        this.updateBadge();
        AppState.checkDueReminders();
    },

    toggle() {
        if (this.isOpen) this.hide(); else this.show();
    },

    show() {
        this.isOpen = true;
        if (this.panel) this.panel.remove();
        this.panel = document.createElement('div');
        this.panel.className = 'notif-panel open';
        this.render();
        document.body.appendChild(this.panel);
    },

    hide() {
        this.isOpen = false;
        if (this.panel) {
            this.panel.classList.remove('open');
            setTimeout(() => { if (this.panel) { this.panel.remove(); this.panel = null; } }, 300);
        }
    },

    render() {
        if (!this.panel) return;
        const unread = AppState.getUnreadCount();
        const iconColorMap = {
            'check-circle': '#10b981',
            'clock': '#f59e0b',
            'book-plus': '#3b82f6',
            'book-open': '#667eea',
            'calendar': '#8b5cf6',
            'alert-triangle': '#ef4444',
            'x-circle': '#ef4444',
            'send': '#3b82f6',
            'refresh-cw': '#10b981',
            'corner-down-left': '#f59e0b'
        };

        const typeLabels = {
            'borrow_submitted': 'Borrow Request',
            'borrow_approved': 'Approved',
            'borrow_rejected': 'Rejected',
            'book_ready_pickup': 'Pickup Ready',
            'due_reminder': 'Reminder',
            'due_today': 'Due Today',
            'overdue': 'Overdue',
            'book_returned': 'Returned',
            'borrow_renewed': 'Renewed',
            'return_requested': 'Return Request',
            'reservation_approved': 'Reservation',
            'new_book': 'New Book',
            'event': 'Event',
            'fine': 'Fine'
        };

        let html = `
            <div class="notif-panel-header">
                <h3>Notifications ${unread > 0 ? `<span style="color:var(--accent-primary);font-size:0.8rem;font-weight:500">(${unread} new)</span>` : ''}</h3>
                <div style="display:flex;gap:4px;">
                    ${unread > 0 ? '<button class="btn btn-sm btn-ghost" id="markAllRead">Mark all read</button>' : ''}
                    <button class="btn btn-sm btn-ghost" id="closeNotifPanel" title="Close">${Utils.getIcon('x-circle', 16)}</button>
                </div>
            </div>
            <div class="notif-list">
        `;
        if (AppState.notifications.length === 0) {
            html += '<div class="empty-state" style="padding:32px"><p>No notifications yet</p></div>';
        }
        AppState.notifications.slice(0, 50).forEach(n => {
            const color = iconColorMap[n.icon] || '#667eea';
            const typeLabel = typeLabels[n.type] || '';
            html += `
                <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
                    <div class="notif-item-icon" style="background:${color}15;color:${color}">
                        ${Utils.getIcon(n.icon || 'bell', 18)}
                    </div>
                    <div class="notif-item-content">
                        <div class="notif-item-text">
                            <strong>${Utils.escapeHtml(n.title)}</strong>
                            ${typeLabel ? `<span class="notif-type-tag" style="background:${color}15;color:${color};font-size:0.65rem;padding:1px 6px;border-radius:10px;margin-left:4px;">${typeLabel}</span>` : ''}
                        </div>
                        <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:2px;">${Utils.escapeHtml(n.message)}</div>
                        <div class="notif-item-time">${n.time}</div>
                    </div>
                    ${!n.read ? '<div class="notif-item-dot"></div>' : ''}
                </div>
            `;
        });
        html += '</div>';
        this.panel.innerHTML = html;

        this.panel.querySelectorAll('.notif-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseFloat(el.dataset.notifId);
                AppState.markNotifRead(id);
                this.render();
                this.updateBadge();
            });
        });

        const markBtn = this.panel.querySelector('#markAllRead');
        if (markBtn) markBtn.addEventListener('click', () => {
            AppState.markAllRead();
            this.render();
            this.updateBadge();
        });

        const closeBtn = this.panel.querySelector('#closeNotifPanel');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
    },

    updateBadge() {
        const badge = document.getElementById('notifBadge');
        if (!badge) return;
        const count = AppState.getUnreadCount();
        badge.textContent = count > 0 ? count : '';
        badge.dataset.count = count;
        if (count > 0) {
            badge.classList.add('badge-animate');
            setTimeout(() => badge.classList.remove('badge-animate'), 400);
        }
    }
};
