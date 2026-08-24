const ReservationsPage = {
    activeTab: 'active',

    render() {
        const myReservations = AppState.getMyReservations ? AppState.getMyReservations() : [];
        const active = myReservations.filter(r => r.status === 'waiting');
        const past = myReservations.filter(r => r.status === 'completed' || r.status === 'expired' || r.status === 'cancelled');
        const isLibrarian = AppState.currentUser && (AppState.currentUser.role === 'librarian' || AppState.currentUser.role === 'admin');
        const physical = isLibrarian ? (AppState.reservations || []).filter(r => r.isPhysical) : [];
        const booksAvailable = (AppState.books || []).filter(b => b.availableCopies && b.availableCopies > 0).length;

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Reservations</h1>
          <p class="page-description">Manage your book reservations</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="my-books-summary">
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon blue">${Utils.getIcon('bookmark', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${active.length}</span>
              <span class="summary-stat-label">Active Reservations</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon green">${Utils.getIcon('check-circle', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${booksAvailable}</span>
              <span class="summary-stat-label">Available for Pickup</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon yellow">${Utils.getIcon('clock', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${past.length}</span>
              <span class="summary-stat-label">Past Reservations</span>
            </div>
          </div>
          ${isLibrarian ? `
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon purple">${Utils.getIcon('layers', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${physical.length}</span>
              <span class="summary-stat-label">Physical Reservations</span>
            </div>
          </div>` : ''}
        </div>

        <div class="tabs" style="margin-bottom:2rem;">
          <button class="tab-btn ${this.activeTab === 'active' ? 'active' : ''}" data-tab="active">${Utils.getIcon('bookmark', 18)} Active (${active.length})</button>
          <button class="tab-btn ${this.activeTab === 'past' ? 'active' : ''}" data-tab="past">${Utils.getIcon('file-text', 18)} Past (${past.length})</button>
          ${isLibrarian ? `<button class="tab-btn ${this.activeTab === 'physical' ? 'active' : ''}" data-tab="physical">${Utils.getIcon('layers', 18)} Physical (${physical.length})</button>` : ''}
        </div>
        <div id="tab-content">${this.renderTabContent()}</div>
      </div>`;
    },

    renderTabContent() {
        switch (this.activeTab) {
            case 'active': return this.renderActive();
            case 'past': return this.renderPast();
            case 'physical': return this.renderPhysical();
            default: return this.renderActive();
        }
    },

    renderActive() {
        const myReservations = AppState.getMyReservations ? AppState.getMyReservations() : [];
        const active = myReservations.filter(r => r.status === 'waiting');

        if (!active.length) {
            return `<div class="empty-state">${Utils.getIcon('bookmark-off', 48)}<h3>No Active Reservations</h3><p>You don't have any active reservations. Browse books to make a reservation.</p><a href="#/books" class="btn btn-primary" data-nav>Browse Books</a></div>`;
        }

        return `<div class="borrow-cards-grid">${active.map(r => this.renderActiveCard(r)).join('')}</div>`;
    },

    renderPast() {
        const myReservations = AppState.getMyReservations ? AppState.getMyReservations() : [];
        const past = myReservations.filter(r => r.status === 'completed' || r.status === 'expired' || r.status === 'cancelled');

        if (!past.length) {
            return `<div class="empty-state">${Utils.getIcon('file-text', 48)}<h3>No Past Reservations</h3><p>Your completed, expired, or cancelled reservations will appear here.</p></div>`;
        }

        return `
        <div class="card">
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Book</th>
                            <th>Reserved Date</th>
                            <th>Position</th>
                            <th>Expiry Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${past.map(r => {
                            const book = (AppState.books || []).find(b => b.id === r.bookId);
                            const statusBadge = r.status === 'completed'
                                ? '<span class="badge badge-success">Completed</span>'
                                : r.status === 'cancelled'
                                    ? '<span class="badge badge-danger">Cancelled</span>'
                                    : '<span class="badge badge-warning">Expired</span>';
                            return `<tr>
                                <td>
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <div style="width:40px;min-height:55px;flex-shrink:0;font-size:0;">${book ? Utils.getBookCover(book) : ''}</div>
                                        <div>
                                            <strong>${Utils.escapeHtml(r.bookTitle || (book ? book.title : 'Unknown'))}</strong>
                                            ${book ? `<p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(book.author)}</p>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>${Utils.formatDate(r.reservedAt || r.date)}</td>
                                <td>#${r.position || '-'}</td>
                                <td>${r.expiresAt ? Utils.formatDate(r.expiresAt) : 'N/A'}</td>
                                <td>${statusBadge}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    renderPhysical() {
        const isLibrarian = AppState.currentUser && (AppState.currentUser.role === 'librarian' || AppState.currentUser.role === 'admin');
        if (!isLibrarian) {
            return `<div class="empty-state">${Utils.getIcon('shield', 48)}<h3>Access Restricted</h3><p>This tab is only available for librarians.</p></div>`;
        }

        const physical = (AppState.reservations || []).filter(r => r.isPhysical);

        if (!physical.length) {
            return `<div class="empty-state">${Utils.getIcon('layers', 48)}<h3>No Physical Reservations</h3><p>No librarian-created physical reservations exist.</p></div>`;
        }

        return `
        <div class="card">
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Book</th>
                            <th>Student</th>
                            <th>Created By</th>
                            <th>Date</th>
                            <th>Position</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${physical.map(r => {
                            const book = (AppState.books || []).find(b => b.id === r.bookId);
                            const statusBadge = r.status === 'waiting'
                                ? '<span class="badge badge-warning">Waiting</span>'
                                : r.status === 'completed'
                                    ? '<span class="badge badge-success">Completed</span>'
                                    : r.status === 'cancelled'
                                        ? '<span class="badge badge-danger">Cancelled</span>'
                                        : '<span class="badge badge-warning">Expired</span>';
                            return `<tr>
                                <td><strong>${Utils.escapeHtml(r.bookTitle || (book ? book.title : 'Unknown'))}</strong></td>
                                <td>${Utils.escapeHtml(r.studentName || 'N/A')}</td>
                                <td>${Utils.escapeHtml(r.createdBy || 'N/A')}</td>
                                <td>${Utils.formatDate(r.reservedAt || r.date)}</td>
                                <td>#${r.position || '-'}</td>
                                <td>${statusBadge}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    renderActiveCard(reservation) {
        const book = (AppState.books || []).find(b => b.id === reservation.bookId);
        const queue = AppState.getBookReservationQueue ? AppState.getBookReservationQueue(reservation.bookId) : [];
        const totalInQueue = queue.length || (reservation.position || 1);
        const position = reservation.position || 1;
        const expiryDate = reservation.expiresAt ? new Date(reservation.expiresAt) : null;
        const isExpiringSoon = expiryDate && (expiryDate - new Date()) < 2 * 86400000;

        const estimatedAvailable = book && book.availableCopies === 0
            ? `${queue.length > 0 ? queue.length + 1 : 1} in queue`
            : 'Available now';

        return `
        <div class="borrow-card glass-card">
            <div class="borrow-card-header">
                <div class="borrow-card-cover">${book ? Utils.getBookCover(book) : ''}</div>
                <div class="borrow-card-info">
                    <h3 class="borrow-card-title">${book ? Utils.escapeHtml(book.title) : Utils.escapeHtml(reservation.bookTitle)}</h3>
                    <p class="borrow-card-author">${book ? Utils.escapeHtml(book.author) : ''}</p>
                    <div class="borrow-card-badges">
                        <span class="badge badge-info">Position ${position} of ${totalInQueue}</span>
                        <span class="badge badge-warning">Waiting</span>
                    </div>
                </div>
            </div>
            <div class="borrow-card-body">
                <div class="borrow-card-dates">
                    <div class="date-item">
                        <span class="date-label">Reserved Date</span>
                        <span class="date-value">${Utils.formatDate(reservation.reservedAt || reservation.date)}</span>
                    </div>
                    <div class="date-item">
                        <span class="date-label">Expiry Date</span>
                        <span class="date-value ${isExpiringSoon ? 'text-warning' : ''}">${expiryDate ? Utils.formatDate(expiryDate.toISOString()) : 'N/A'}</span>
                    </div>
                </div>
                <div class="pickup-notice">
                    <span class="pickup-icon">${Utils.getIcon('info', 16)}</span>
                    <span>Expected availability: <strong>${estimatedAvailable}</strong></span>
                </div>
                ${isExpiringSoon ? `<p style="color:var(--warning);font-size:0.8rem;margin:6px 0 0;font-weight:600;">Expiring soon!</p>` : ''}
            </div>
            <div class="borrow-card-actions">
                <button class="btn btn-danger btn-sm" onclick="ReservationsPage.cancelReservation(${reservation.id})">${Utils.getIcon('x', 14)} Cancel Reservation</button>
            </div>
        </div>`;
    },

    cancelReservation(id) {
        Modal.confirm('Cancel Reservation', 'Are you sure you want to cancel this reservation? This action cannot be undone.', () => {
            if (AppState.cancelReservation) {
                AppState.cancelReservation(id);
            } else if (AppState.reservations) {
                const idx = AppState.reservations.findIndex(r => r.id == id);
                if (idx > -1) {
                    AppState.reservations[idx].status = 'cancelled';
                    AppState._updateReservationPositions && AppState._updateReservationPositions(AppState.reservations[idx].bookId);
                    AppState.saveAll && AppState.saveAll();
                }
            }
            Toast.success('Reservation cancelled');
            this.switchTab(this.activeTab);
        });
    },

    reserveBook(bookId) {
        const reserveCheck = AppState.canReserve ? AppState.canReserve() : { allowed: true };
        if (!reserveCheck.allowed) {
            Toast.warning(reserveCheck.reason || 'Cannot make reservation.');
            return;
        }
        if (AppState.reserveBook) {
            AppState.reserveBook(bookId);
            Toast.success('Book reserved successfully!');
            this.switchTab('active');
        }
    },

    switchTab(tab) {
        this.activeTab = tab;
        const content = document.getElementById('tab-content');
        if (content) content.innerHTML = this.renderTabContent();
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    },

    afterRender() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }
};
