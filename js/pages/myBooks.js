const MyBooksPage = {
    activeTab: 'active',

    render() {
        const active = AppState.getMyActiveBorrows();
        const pending = AppState.getMyPendingRequests();
        const approved = AppState.getMyApprovedNotPickedUp();
        const returnRequested = AppState.borrowRequests.filter(r =>
            r.studentId === (AppState.currentUser?.id || 1) && r.status === 'return_requested'
        );
        const history = AppState.getMyReturnedBooks();
        const fines = AppState.getMyTotalFine();
        const now = new Date();
        const booksThisMonth = active.filter(r => {
            const d = new Date(r.borrowDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length + history.filter(r => {
            const d = new Date(r.borrowDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">My Books</h1>
          <p class="page-description">Track your borrows, requests, and reading history</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="my-books-summary">
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon blue">${Utils.getIcon('book-open', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${active.length}</span>
              <span class="summary-stat-label">Active Borrows</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon yellow">${Utils.getIcon('clock', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${pending.length + approved.length}</span>
              <span class="summary-stat-label">Pending Requests</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon red">${Utils.getIcon('alert-triangle', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${fines > 0 ? 'Rs. ' + fines : 'None'}</span>
              <span class="summary-stat-label">Fine Balance</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon green">${Utils.getIcon('book-opened', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${booksThisMonth}</span>
              <span class="summary-stat-label">Read This Month</span>
            </div>
          </div>
        </div>

        <div class="tabs" style="margin-bottom:2rem;">
          <button class="tab-btn ${this.activeTab === 'active' ? 'active' : ''}" data-tab="active">${Utils.getIcon('book-open', 18)} Active (${active.length})</button>
          <button class="tab-btn ${this.activeTab === 'pending' ? 'active' : ''}" data-tab="pending">${Utils.getIcon('clock', 18)} Pending (${pending.length})</button>
          <button class="tab-btn ${this.activeTab === 'approved' ? 'active' : ''}" data-tab="approved">${Utils.getIcon('check-circle', 18)} Approved (${approved.length})</button>
          <button class="tab-btn ${this.activeTab === 'returnRequested' ? 'active' : ''}" data-tab="returnRequested">${Utils.getIcon('corner-down-left', 18)} Return Requested (${returnRequested.length})</button>
          <button class="tab-btn ${this.activeTab === 'history' ? 'active' : ''}" data-tab="history">${Utils.getIcon('file-text', 18)} History (${history.length})</button>
        </div>
        <div id="tab-content">${this.renderTabContent()}</div>
      </div>`;
    },

    renderTabContent() {
        switch (this.activeTab) {
            case 'active': return this.renderActive();
            case 'pending': return this.renderPending();
            case 'approved': return this.renderApproved();
            case 'returnRequested': return this.renderReturnRequested();
            case 'history': return this.renderHistory();
            default: return this.renderActive();
        }
    },

    renderActive() {
        const active = AppState.getMyActiveBorrows();
        if (!active.length) {
            return `<div class="empty-state">${Utils.getIcon('book-open', 48)}<h3>No Active Borrows</h3><p>You haven't borrowed any books yet.</p><a href="#/books" class="btn btn-primary" data-nav>Browse Books</a></div>`;
        }
        return `<div class="borrow-cards-grid">${active.map(r => this.renderBorrowCard(r)).join('')}</div>`;
    },

    renderPending() {
        const pending = AppState.getMyPendingRequests();
        if (!pending.length) {
            return `<div class="empty-state">${Utils.getIcon('clock', 48)}<h3>No Pending Requests</h3><p>You have no pending borrow requests awaiting approval.</p><a href="#/books" class="btn btn-primary" data-nav>Browse Books</a></div>`;
        }
        return `<div class="borrow-cards-grid">${pending.map(r => this.renderPendingCard(r)).join('')}</div>`;
    },

    renderApproved() {
        const approved = AppState.getMyApprovedNotPickedUp();
        if (!approved.length) {
            return `<div class="empty-state">${Utils.getIcon('check-circle', 48)}<h3>No Approved Books</h3><p>You have no approved books waiting for pickup.</p></div>`;
        }
        return `<div class="borrow-cards-grid">${approved.map(r => this.renderApprovedCard(r)).join('')}</div>`;
    },

    renderReturnRequested() {
        const returnReq = AppState.borrowRequests.filter(r =>
            r.studentId === (AppState.currentUser?.id || 1) && r.status === 'return_requested'
        );
        if (!returnReq.length) {
            return `<div class="empty-state">${Utils.getIcon('corner-down-left', 48)}<h3>No Return Requests</h3><p>You have no books awaiting return processing.</p></div>`;
        }
        return `<div class="borrow-cards-grid">${returnReq.map(r => this.renderReturnRequestedCard(r)).join('')}</div>`;
    },

    renderBorrowCard(request) {
        const book = AppState.books.find(b => b.id === request.bookId);
        const now = new Date();
        const due = new Date(request.expectedReturnDate);
        const daysLeft = Math.ceil((due - now) / 86400000);
        const isOverdue = daysLeft < 0;
        const total = 14;
        const progress = Math.max(0, Math.min(100, ((total - Math.max(0, daysLeft)) / total) * 100));
        let barColor = 'var(--success)';
        if (daysLeft >= 0 && daysLeft <= 7) barColor = 'var(--warning)';
        if (daysLeft < 0) barColor = 'var(--danger)';

        let countdownClass = 'safe';
        let countdownLabel = `${daysLeft} Days Remaining`;
        if (isOverdue) {
            countdownClass = 'danger';
            countdownLabel = `${Math.abs(daysLeft)} Days Overdue`;
        } else if (daysLeft <= 7) {
            countdownClass = 'warning';
            countdownLabel = `${daysLeft} Days Remaining`;
        }

        const canRenewResult = AppState.canRenew(request.id);
        const canRenewBook = canRenewResult.allowed;

        return `
        <div class="borrow-card glass-card ${isOverdue ? 'overdue' : ''}">
            <div class="borrow-card-header">
                <div class="borrow-card-cover">${book ? Utils.getBookCover(book) : ''}</div>
                <div class="borrow-card-info">
                    <h3 class="borrow-card-title">${book ? Utils.escapeHtml(book.title) : Utils.escapeHtml(request.bookTitle)}</h3>
                    <p class="borrow-card-author">${book ? Utils.escapeHtml(book.author) : ''}</p>
                    <div class="borrow-card-badges">
                        <span class="badge ${isOverdue ? 'badge-danger' : daysLeft <= 7 ? 'badge-warning' : 'badge-primary'}">
                            ${isOverdue ? 'Overdue' : daysLeft <= 7 ? 'Due Soon' : 'Active'}
                        </span>
                        <span class="badge badge-info">${request.id}</span>
                    </div>
                </div>
            </div>
            <div class="borrow-card-body">
                <div class="borrow-card-dates">
                    <div class="date-item">
                        <span class="date-label">Borrow Date</span>
                        <span class="date-value">${Utils.formatDate(request.borrowDate)}</span>
                    </div>
                    <div class="date-item">
                        <span class="date-label">Due Date</span>
                        <span class="date-value ${isOverdue ? 'text-danger' : daysLeft <= 7 ? 'text-warning' : ''}">${Utils.formatDate(request.expectedReturnDate)}</span>
                    </div>
                </div>
                <div class="countdown-section">
                    <span class="countdown-text ${countdownClass}">${countdownLabel}</span>
                    <div class="countdown-progress">
                        <div class="countdown-progress-bar" style="width:${progress}%;background:${barColor}"></div>
                    </div>
                </div>
                ${isOverdue ? `<p style="color:var(--danger);font-size:0.8rem;margin:6px 0 0;font-weight:600;">Fine: Rs. ${request.fine || 0}</p>` : ''}
                ${request.renewCount > 0 ? `<p style="margin:6px 0 0;"><span class="badge badge-info">Renewed (${request.renewCount}/${AppState.getMaxRenewals()})</span></p>` : ''}
            </div>
            <div class="borrow-card-actions">
                <button class="btn btn-outline btn-sm" onclick="MyBooksPage.viewDetails('${request.id}')">${Utils.getIcon('eye', 14)} Details</button>
                <button class="btn btn-outline btn-sm" onclick="MyBooksPage.downloadReceipt('${request.id}')">${Utils.getIcon('download', 14)} Receipt</button>
                <button class="btn btn-outline btn-sm" onclick="MyBooksPage.printReceipt('${request.id}')">${Utils.getIcon('printer', 14)} Print</button>
                ${canRenewBook
                    ? `<button class="btn btn-outline btn-sm" onclick="MyBooksPage.renewBook('${request.id}')">${Utils.getIcon('refresh-cw', 14)} Renew</button>`
                    : `<button class="btn btn-outline btn-sm" disabled title="${canRenewResult.reason || 'Cannot renew'}">${Utils.getIcon('refresh-cw', 14)} Renew</button>`
                }
                <button class="btn btn-danger btn-sm" onclick="MyBooksPage.requestReturn('${request.id}')">${Utils.getIcon('corner-down-left', 14)} Return Request</button>
            </div>
        </div>`;
    },

    renderPendingCard(request) {
        const book = AppState.books.find(b => b.id === request.bookId);
        const timelineSteps = [
            { label: 'Request Submitted', done: true },
            { label: 'Waiting for Approval', active: true },
            { label: 'Ready for Pickup', done: false },
            { label: 'Borrowed', done: false },
            { label: 'Returned', done: false }
        ];

        return `
        <div class="borrow-card glass-card pending-card">
            <div class="borrow-card-header">
                <div class="borrow-card-cover">${book ? Utils.getBookCover(book) : ''}</div>
                <div class="borrow-card-info">
                    <h3 class="borrow-card-title">${book ? Utils.escapeHtml(book.title) : Utils.escapeHtml(request.bookTitle)}</h3>
                    <p class="borrow-card-author">${book ? Utils.escapeHtml(book.author) : ''}</p>
                    <div class="borrow-card-badges">
                        <span class="badge badge-warning">Pending Approval</span>
                        <span class="badge badge-info">${request.id}</span>
                    </div>
                </div>
            </div>
            <div class="borrow-card-body">
                <div class="borrow-card-dates">
                    <div class="date-item">
                        <span class="date-label">Requested</span>
                        <span class="date-value">${Utils.formatDate(request.borrowDate)}</span>
                    </div>
                    <div class="date-item">
                        <span class="date-label">Expected Return</span>
                        <span class="date-value">${Utils.formatDate(request.expectedReturnDate)}</span>
                    </div>
                </div>
                <div class="mini-timeline">
                    ${timelineSteps.map(s => `
                        <div class="mini-timeline-item ${s.done ? 'done' : s.active ? 'active' : ''}">
                            <div class="mini-timeline-dot"></div>
                            <span>${s.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="borrow-card-actions">
                <button class="btn btn-outline btn-sm" onclick="MyBooksPage.viewDetails('${request.id}')">${Utils.getIcon('eye', 14)} Details</button>
            </div>
        </div>`;
    },

    renderApprovedCard(request) {
        const book = AppState.books.find(b => b.id === request.bookId);

        return `
        <div class="borrow-card glass-card">
            <div class="borrow-card-header">
                <div class="borrow-card-cover">${book ? Utils.getBookCover(book) : ''}</div>
                <div class="borrow-card-info">
                    <h3 class="borrow-card-title">${book ? Utils.escapeHtml(book.title) : Utils.escapeHtml(request.bookTitle)}</h3>
                    <p class="borrow-card-author">${book ? Utils.escapeHtml(book.author) : ''}</p>
                    <div class="borrow-card-badges">
                        <span class="badge badge-success">Approved</span>
                        <span class="badge badge-info">${request.id}</span>
                    </div>
                </div>
            </div>
            <div class="borrow-card-body">
                <div class="borrow-card-dates">
                    <div class="date-item">
                        <span class="date-label">Approved Date</span>
                        <span class="date-value">${Utils.formatDate(request.approvedAt || request.borrowDate)}</span>
                    </div>
                    <div class="date-item">
                        <span class="date-label">Expected Return</span>
                        <span class="date-value">${Utils.formatDate(request.expectedReturnDate)}</span>
                    </div>
                </div>
                <div class="pickup-notice">
                    <span class="pickup-icon">${Utils.getIcon('map-pin', 16)}</span>
                    <span>Pick up from <strong>Library Front Desk</strong></span>
                </div>
            </div>
            <div class="borrow-card-actions">
                <button class="btn btn-outline btn-sm" onclick="MyBooksPage.viewDetails('${request.id}')">${Utils.getIcon('eye', 14)} Details</button>
                <button class="btn btn-primary btn-sm" onclick="MyBooksPage.confirmPickup('${request.id}')">${Utils.getIcon('check-circle', 14)} Confirm Pickup</button>
            </div>
        </div>`;
    },

    renderReturnRequestedCard(request) {
        const book = AppState.books.find(b => b.id === request.bookId);

        return `
        <div class="borrow-card glass-card">
            <div class="borrow-card-header">
                <div class="borrow-card-cover">${book ? Utils.getBookCover(book) : ''}</div>
                <div class="borrow-card-info">
                    <h3 class="borrow-card-title">${book ? Utils.escapeHtml(book.title) : Utils.escapeHtml(request.bookTitle)}</h3>
                    <p class="borrow-card-author">${book ? Utils.escapeHtml(book.author) : ''}</p>
                    <div class="borrow-card-badges">
                        <span class="badge badge-warning">Return Requested</span>
                        <span class="badge badge-info">${request.id}</span>
                    </div>
                </div>
            </div>
            <div class="borrow-card-body">
                <div class="borrow-card-dates">
                    <div class="date-item">
                        <span class="date-label">Borrow Date</span>
                        <span class="date-value">${Utils.formatDate(request.borrowDate)}</span>
                    </div>
                    <div class="date-item">
                        <span class="date-label">Due Date</span>
                        <span class="date-value">${Utils.formatDate(request.expectedReturnDate)}</span>
                    </div>
                </div>
                <div class="pickup-notice">
                    <span class="pickup-icon">${Utils.getIcon('clock', 16)}</span>
                    <span>Waiting for librarian to process return</span>
                </div>
            </div>
            <div class="borrow-card-actions">
                <button class="btn btn-outline btn-sm" onclick="MyBooksPage.viewDetails('${request.id}')">${Utils.getIcon('eye', 14)} Details</button>
                <button class="btn btn-outline btn-sm" onclick="MyBooksPage.downloadReceipt('${request.id}')">${Utils.getIcon('download', 14)} Receipt</button>
            </div>
        </div>`;
    },

    renderHistory() {
        const history = AppState.getMyReturnedBooks();
        if (!history.length) {
            return `<div class="empty-state">${Utils.getIcon('file-text', 48)}<h3>No Borrow History</h3><p>Your borrowing history will appear here.</p></div>`;
        }
        return `
        <div class="card">
            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Borrow ID</th>
                            <th>Book</th>
                            <th>Borrowed</th>
                            <th>Returned</th>
                            <th>Fine</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(r => {
                            return `<tr>
                                <td class="mono" style="font-size:0.8rem">${r.id}</td>
                                <td><strong>${Utils.escapeHtml(r.bookTitle)}</strong></td>
                                <td>${Utils.formatDate(r.borrowDate)}</td>
                                <td>${r.returnDate ? Utils.formatDate(r.returnDate) : 'N/A'}</td>
                                <td>${r.fine > 0 ? '<span class="text-danger">Rs. ' + r.fine + '</span>' : '<span class="text-success">None</span>'}</td>
                                <td>${Utils.getStatusBadge('returned')}</td>
                                <td style="white-space:nowrap;">
                                    <button class="btn btn-ghost btn-sm" onclick="MyBooksPage.downloadReceipt('${r.id}')" title="Download Receipt">${Utils.getIcon('download', 14)}</button>
                                    <button class="btn btn-ghost btn-sm" onclick="MyBooksPage.printReceipt('${r.id}')" title="Print Receipt">${Utils.getIcon('printer', 14)}</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    switchTab(tab) {
        this.activeTab = tab;
        const content = document.getElementById('tab-content');
        if (content) content.innerHTML = this.renderTabContent();
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    },

    viewDetails(requestId) {
        const r = AppState.borrowRequests.find(x => x.id === requestId);
        if (!r) return;
        const book = AppState.books.find(b => b.id === r.bookId);
        const content = `
            <div style="display:flex;gap:16px;margin-bottom:16px;">
                <div style="width:80px;min-height:110px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div>
                <div>
                    <h3 style="margin:0 0 4px;">${Utils.escapeHtml(r.bookTitle)}</h3>
                    <p style="color:var(--text-secondary);margin:0;">by ${book ? Utils.escapeHtml(book.author) : 'Unknown'}</p>
                    <span class="badge ${r.status === 'overdue' ? 'badge-danger' : r.status === 'borrowed' ? 'badge-primary' : r.status === 'approved' ? 'badge-success' : r.status === 'return_requested' ? 'badge-warning' : 'badge-warning'}" style="margin-top:8px;">${r.status.replace('_', ' ')}</span>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><small style="color:var(--text-tertiary);">Borrow ID</small><p style="font-family:var(--font-mono);margin:2px 0;">${r.id}</p></div>
                <div><small style="color:var(--text-tertiary);">Student</small><p style="margin:2px 0;">${Utils.escapeHtml(r.studentName)}</p></div>
                <div><small style="color:var(--text-tertiary);">Borrow Date</small><p style="margin:2px 0;">${Utils.formatDate(r.borrowDate)}</p></div>
                <div><small style="color:var(--text-tertiary);">Expected Return</small><p style="margin:2px 0;">${Utils.formatDate(r.expectedReturnDate)}</p></div>
                <div><small style="color:var(--text-tertiary);">Renewed</small><p style="margin:2px 0;">${r.renewCount > 0 ? `Yes (${r.renewCount}/${AppState.getMaxRenewals()})` : 'No'}</p></div>
                <div><small style="color:var(--text-tertiary);">Fine</small><p style="margin:2px 0;">${r.fine > 0 ? '<span class="text-danger">Rs. ' + r.fine + '</span>' : '<span class="text-success">None</span>'}</p></div>
                ${r.returnDate ? `<div><small style="color:var(--text-tertiary);">Return Date</small><p style="margin:2px 0;">${Utils.formatDate(r.returnDate)}</p></div>` : ''}
                ${r.rejectionReason ? `<div><small style="color:var(--text-tertiary);">Rejection Reason</small><p style="margin:2px 0;color:var(--danger);">${Utils.escapeHtml(r.rejectionReason)}</p></div>` : ''}
            </div>`;
        Modal.show({ title: 'Borrow Details', content, size: 'md', buttons: [{ label: 'Close', class: 'btn-secondary' }] });
    },

    downloadReceipt(requestId) {
        const request = AppState.borrowRequests.find(r => r.id === requestId);
        if (!request) return;
        const book = AppState.books.find(b => b.id === request.bookId);

        const receiptContent = `
        <html><head><title>Borrow Receipt - ${request.id}</title>
        <style>
            body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333;}
            .header{text-align:center;margin-bottom:24px;border-bottom:2px solid #667eea;padding-bottom:16px;}
            h1{font-size:18px;margin:0;color:#667eea;}h2{font-size:14px;font-weight:400;margin:4px 0 0;color:#666;}
            table{width:100%;border-collapse:collapse;margin:16px 0;}
            td{padding:8px 0;border-bottom:1px dashed #ddd;font-size:13px;}
            td:first-child{font-weight:600;width:160px;color:#555;}
            .footer{text-align:center;margin-top:24px;padding-top:16px;border-top:2px solid #667eea;font-size:11px;color:#999;}
            .sig-line{display:inline-block;width:160px;border-top:1px solid #333;margin-top:40px;padding-top:4px;font-size:11px;}
        </style></head><body>
        <div class="header"><h1>Saraswati Sec School Library</h1><h2>Borrow Receipt</h2></div>
        <table>
            <tr><td>Borrow ID</td><td>${request.id}</td></tr>
            <tr><td>Student Name</td><td>${request.studentName}</td></tr>
            <tr><td>Student ID</td><td>STU-${String(request.studentId).padStart(4, '0')}</td></tr>
            <tr><td>Book Title</td><td>${request.bookTitle}</td></tr>
            ${book ? `<tr><td>ISBN</td><td>${book.isbn}</td></tr>` : ''}
            <tr><td>Borrow Date</td><td>${Utils.formatDate(request.borrowDate)}</td></tr>
            <tr><td>Expected Return</td><td>${Utils.formatDate(request.expectedReturnDate)}</td></tr>
            ${request.returnDate ? `<tr><td>Actual Return</td><td>${Utils.formatDate(request.returnDate)}</td></tr>` : ''}
            <tr><td>Status</td><td>${request.status.toUpperCase()}</td></tr>
            <tr><td>Fine</td><td>${request.fine > 0 ? 'Rs. ' + request.fine : 'None'}</td></tr>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:40px;">
            <div class="sig-line">Librarian Signature</div>
            <div class="sig-line">Student Signature</div>
        </div>
        <div class="footer">
            <p>Library Stamp Area</p>
            <p>Saraswati Sec School Library | Sanothimi, Bhaktapur, Nepal | +977-01-6634373</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        </body></html>`;

        const blob = new Blob([receiptContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `borrow-receipt-${request.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('Receipt downloaded!');
    },

    printReceipt(requestId) {
        const request = AppState.borrowRequests.find(r => r.id === requestId);
        if (!request) return;
        const book = AppState.books.find(b => b.id === request.bookId);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.warning('Pop-up blocked. Please allow pop-ups to print.');
            return;
        }
        printWindow.document.write(`
        <html><head><title>Print Receipt - ${request.id}</title>
        <style>
            body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333;}
            .header{text-align:center;margin-bottom:24px;border-bottom:2px solid #667eea;padding-bottom:16px;}
            h1{font-size:18px;margin:0;color:#667eea;}h2{font-size:14px;font-weight:400;margin:4px 0 0;color:#666;}
            table{width:100%;border-collapse:collapse;margin:16px 0;}
            td{padding:8px 0;border-bottom:1px dashed #ddd;font-size:13px;}
            td:first-child{font-weight:600;width:160px;color:#555;}
            .footer{text-align:center;margin-top:24px;padding-top:16px;border-top:2px solid #667eea;font-size:11px;color:#999;}
            .sig-line{display:inline-block;width:160px;border-top:1px solid #333;margin-top:40px;padding-top:4px;font-size:11px;}
        </style></head><body>
        <div class="header"><h1>Saraswati Sec School Library</h1><h2>Borrow Receipt</h2></div>
        <table>
            <tr><td>Borrow ID</td><td>${request.id}</td></tr>
            <tr><td>Student Name</td><td>${request.studentName}</td></tr>
            <tr><td>Book Title</td><td>${request.bookTitle}</td></tr>
            <tr><td>Borrow Date</td><td>${Utils.formatDate(request.borrowDate)}</td></tr>
            <tr><td>Expected Return</td><td>${Utils.formatDate(request.expectedReturnDate)}</td></tr>
            <tr><td>Fine</td><td>${request.fine > 0 ? 'Rs. ' + request.fine : 'None'}</td></tr>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:40px;">
            <div class="sig-line">Librarian Signature</div>
            <div class="sig-line">Student Signature</div>
        </div>
        </body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    },

    renewBook(requestId) {
        const renewCheck = AppState.canRenew(requestId);
        if (!renewCheck.allowed) {
            Toast.warning(renewCheck.reason || 'Cannot renew this book.');
            return;
        }
        Modal.confirm('Renew Book', 'Are you sure you want to renew this book? The due date will be extended by the loan period.', () => {
            if (AppState.renewBorrow(requestId)) {
                Toast.success('Book renewed! Due date extended.');
                this.switchTab(this.activeTab);
            } else {
                Toast.error('Failed to renew book.');
            }
        });
    },

    requestReturn(requestId) {
        Modal.confirm('Return Book', 'Are you sure you want to request a return for this book? The librarian will process it.', () => {
            if (AppState.requestReturn(requestId)) {
                Toast.success('Return request submitted!');
                this.switchTab(this.activeTab);
            }
        });
    },

    confirmPickup(requestId) {
        Modal.confirm('Confirm Pickup', 'Have you picked up this book from the library?', () => {
            if (AppState.markAsBorrowed(requestId)) {
                Toast.success('Book picked up! Happy reading.');
                this.switchTab('active');
            }
        });
    },

    afterRender() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }
};
