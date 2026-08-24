const NotificationsPage = {
    filter: 'all',

    render() {
        const all = AppState.notifications || [];
        let filtered = all;
        if (this.filter === 'unread') filtered = all.filter(n => !n.read);
        else if (this.filter === 'borrow') filtered = all.filter(n => n.type && n.type.startsWith('borrow'));
        else if (this.filter === 'due') filtered = all.filter(n => n.type === 'due_reminder' || n.type === 'due_today' || n.type === 'overdue');
        else if (this.filter === 'system') filtered = all.filter(n => n.type === 'system' || n.type === 'announcement' || n.type === 'event');
        const unread = all.filter(n => !n.read).length;

        return `
        <div class="page-header">
            <div class="container">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h1 class="page-title">${Utils.getIcon('bell', 28)} Notifications</h1>
                        <p class="page-description">${unread > 0 ? unread + ' unread notification' + (unread > 1 ? 's' : '') : 'All caught up!'}</p>
                    </div>
                    ${unread > 0 ? `<button class="btn btn-outline btn-sm" onclick="NotificationsPage.markAllRead()">${Utils.getIcon('check', 16)} Mark All Read</button>` : ''}
                </div>
            </div>
        </div>
        <div class="container" style="padding:0 1rem 2rem;">
            <div class="tabs" style="margin-bottom:1.5rem;">
                <button class="tab-btn ${this.filter === 'all' ? 'active' : ''}" onclick="NotificationsPage.setFilter('all')">All (${all.length})</button>
                <button class="tab-btn ${this.filter === 'unread' ? 'active' : ''}" onclick="NotificationsPage.setFilter('unread')">Unread (${unread})</button>
                <button class="tab-btn ${this.filter === 'borrow' ? 'active' : ''}" onclick="NotificationsPage.setFilter('borrow')">Borrow</button>
                <button class="tab-btn ${this.filter === 'due' ? 'active' : ''}" onclick="NotificationsPage.setFilter('due')">Due</button>
                <button class="tab-btn ${this.filter === 'system' ? 'active' : ''}" onclick="NotificationsPage.setFilter('system')">System</button>
            </div>
            <div id="notifications-list">
                ${filtered.length ? filtered.map(n => this.renderNotif(n)).join('') : `
                    <div class="empty-state" style="padding:80px 0;">
                        <div class="empty-state-icon" style="width:80px;height:80px;border-radius:50%;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                            ${Utils.getIcon('bell-off', 40)}
                        </div>
                        <h3>No Notifications</h3>
                        <p style="max-width:360px;margin:0.5rem auto 0;color:var(--text-secondary);">
                            ${this.filter === 'all' ? 'You\'re all caught up! No notifications at this time.' :
                              this.filter === 'unread' ? 'No unread notifications. All caught up!' :
                              this.filter === 'borrow' ? 'No borrow-related notifications.' :
                              this.filter === 'due' ? 'No due date reminders. Your books are on schedule!' :
                              'No system notifications.'}
                        </p>
                    </div>
                `}
            </div>
        </div>`;
    },

    renderNotif(n) {
        const iconMap = {
            'borrow_submitted': 'send',
            'borrow_approved': 'check-circle',
            'borrow_rejected': 'x-circle',
            'borrow_renewed': 'refresh-cw',
            'book_ready_pickup': 'book-open',
            'book_returned': 'check-circle',
            'return_requested': 'corner-down-left',
            'due_reminder': 'clock',
            'due_today': 'alert-triangle',
            'overdue': 'alert-triangle',
            'reservation_approved': 'calendar',
            'system': 'info',
            'announcement': 'megaphone',
            'event': 'calendar'
        };
        const colorMap = {
            'borrow_submitted': 'var(--info)',
            'borrow_approved': 'var(--success)',
            'borrow_rejected': 'var(--danger)',
            'borrow_renewed': 'var(--primary)',
            'book_ready_pickup': 'var(--success)',
            'book_returned': 'var(--success)',
            'return_requested': 'var(--warning)',
            'due_reminder': 'var(--warning)',
            'due_today': 'var(--danger)',
            'overdue': 'var(--danger)',
            'reservation_approved': 'var(--primary)',
            'system': 'var(--text-tertiary)',
            'announcement': 'var(--info)',
            'event': 'var(--primary)'
        };
        const icon = iconMap[n.type] || n.icon || 'bell';
        const color = colorMap[n.type] || 'var(--text-tertiary)';

        return `
        <div class="card" style="padding:1rem 1.25rem;margin-bottom:0.75rem;${n.read ? 'opacity:0.65;' : 'border-left:3px solid ' + color + ';'}transition:all 0.2s;" id="notif-${n.id}">
            <div style="display:flex;gap:12px;align-items:flex-start;">
                <div style="width:42px;height:42px;border-radius:var(--radius-md);background:${color}18;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${Utils.getIcon(icon, 20)}
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                        <h4 style="margin:0;font-size:0.9rem;font-weight:${n.read ? '500' : '700'};">${Utils.escapeHtml(n.title)}</h4>
                        ${!n.read ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;"></span>' : ''}
                    </div>
                    <p style="margin:0;font-size:0.85rem;color:var(--text-secondary);line-height:1.5;">${Utils.escapeHtml(n.message)}</p>
                    <span style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;display:block;">${n.time || 'Just now'}</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
                    ${!n.read ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();NotificationsPage.markRead(${n.id})" title="Mark as read" style="padding:4px;">${Utils.getIcon('check', 14)}</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();NotificationsPage.deleteNotif(${n.id})" title="Delete" style="padding:4px;color:var(--danger);">${Utils.getIcon('trash-2', 14)}</button>
                    ${n.borrowRequestId ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Router.go('/my-books')" title="View" style="padding:4px;">${Utils.getIcon('external-link', 14)}</button>` : ''}
                </div>
            </div>
        </div>`;
    },

    setFilter(f) {
        this.filter = f;
        const container = document.getElementById('pageContent');
        if (container) {
            container.innerHTML = this.render();
            Router.bindLinks();
            Router.highlightNav();
        }
    },

    markRead(id) {
        const notif = (AppState.notifications || []).find(n => n.id === id);
        if (notif) notif.read = true;
        const el = document.getElementById('notif-' + id);
        if (el) {
            el.style.opacity = '0.65';
            el.style.borderLeft = '';
            const dot = el.querySelector('span[style*="border-radius:50%"]');
            if (dot) dot.remove();
        }
    },

    deleteNotif(id) {
        const idx = (AppState.notifications || []).findIndex(n => n.id === id);
        if (idx > -1) {
            AppState.notifications.splice(idx, 1);
            const el = document.getElementById('notif-' + id);
            if (el) {
                el.style.transition = 'all 0.3s';
                el.style.opacity = '0';
                el.style.transform = 'translateX(20px)';
                setTimeout(() => el.remove(), 300);
            }
            Toast.success('Notification deleted');
        }
    },

    markAllRead() {
        (AppState.notifications || []).forEach(n => n.read = true);
        Toast.success('All notifications marked as read');
        this.filter = 'all';
        const container = document.getElementById('pageContent');
        if (container) {
            container.innerHTML = this.render();
            Router.bindLinks();
            Router.highlightNav();
        }
    },

    afterRender() {}
};
