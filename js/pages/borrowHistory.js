const BorrowHistoryPage = {
    searchQuery: '',
    filterStatus: 'all',
    sortBy: 'newest',
    dateFrom: '',
    dateTo: '',
    render() {
        let allHistory = [...AppState.borrowRequests].filter(r =>
            r.studentId === (AppState.currentUser?.id || 1) &&
            (r.status === 'returned' || r.status === 'rejected' || r.status === 'borrowed' || r.status === 'overdue')
        );

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            allHistory = allHistory.filter(r =>
                r.id.toLowerCase().includes(q) ||
                r.bookTitle.toLowerCase().includes(q)
            );
        }

        if (this.filterStatus !== 'all') {
            allHistory = allHistory.filter(r => r.status === this.filterStatus);
        }

        if (this.dateFrom) {
            const from = new Date(this.dateFrom);
            allHistory = allHistory.filter(r => new Date(r.borrowDate) >= from);
        }
        if (this.dateTo) {
            const to = new Date(this.dateTo);
            to.setHours(23, 59, 59, 999);
            allHistory = allHistory.filter(r => new Date(r.borrowDate) <= to);
        }

        switch (this.sortBy) {
            case 'newest': allHistory.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate)); break;
            case 'oldest': allHistory.sort((a, b) => new Date(a.borrowDate) - new Date(b.borrowDate)); break;
            case 'title': allHistory.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle)); break;
            case 'fine': allHistory.sort((a, b) => (b.fine || 0) - (a.fine || 0)); break;
        }

        const totalBooks = allHistory.length;
        const totalReturned = allHistory.filter(r => r.status === 'returned').length;
        const totalBorrowed = allHistory.filter(r => r.status === 'borrowed').length;
        const totalOverdue = allHistory.filter(r => r.status === 'overdue').length;
        const totalFines = allHistory.reduce((s, r) => s + (r.fine || 0), 0);

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('clock', 28)} Borrow History</h1>
          <p class="page-description">Complete record of all your borrowing activities</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:1.5rem;">
          <div class="card" style="padding:1.25rem;text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;color:var(--primary);">${totalBooks}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">Total Records</div>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;color:var(--info);">${totalBorrowed}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">Currently Borrowed</div>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;color:var(--success);">${totalReturned}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">Returned</div>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;color:var(--danger);">${totalOverdue}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">Overdue</div>
          </div>
          <div class="card" style="padding:1.25rem;text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;color:${totalFines > 0 ? 'var(--danger)' : 'var(--success)'};">Rs. ${totalFines}</div>
            <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">Total Fines</div>
          </div>
        </div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1rem 1.25rem;">
            <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end;">
              <div style="flex:1;min-width:200px;">
                <label class="form-label" style="margin-bottom:4px;">Search</label>
                <div class="books-search" style="max-width:100%;">
                  ${Utils.getIcon('search', 18)}
                  <input type="text" id="historySearch" placeholder="Search by ID or book name..." value="${this.searchQuery}">
                </div>
              </div>
              <div style="min-width:140px;">
                <label class="form-label" style="margin-bottom:4px;">Status</label>
                <select id="historyFilter" class="form-input" style="width:100%;">
                  <option value="all" ${this.filterStatus === 'all' ? 'selected' : ''}>All Status</option>
                  <option value="returned" ${this.filterStatus === 'returned' ? 'selected' : ''}>Returned</option>
                  <option value="borrowed" ${this.filterStatus === 'borrowed' ? 'selected' : ''}>Borrowed</option>
                  <option value="overdue" ${this.filterStatus === 'overdue' ? 'selected' : ''}>Overdue</option>
                </select>
              </div>
              <div style="min-width:140px;">
                <label class="form-label" style="margin-bottom:4px;">Sort By</label>
                <select id="historySort" class="form-input" style="width:100%;">
                  <option value="newest" ${this.sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
                  <option value="oldest" ${this.sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
                  <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Book Title</option>
                  <option value="fine" ${this.sortBy === 'fine' ? 'selected' : ''}>Fine Amount</option>
                </select>
              </div>
              <div style="min-width:140px;">
                <label class="form-label" style="margin-bottom:4px;">From Date</label>
                <input type="date" id="historyDateFrom" class="form-input" style="width:100%;" value="${this.dateFrom}">
              </div>
              <div style="min-width:140px;">
                <label class="form-label" style="margin-bottom:4px;">To Date</label>
                <input type="date" id="historyDateTo" class="form-input" style="width:100%;" value="${this.dateTo}">
              </div>
            </div>
          </div>
        </div>
        <div id="historyContent">${this.renderTable(allHistory)}</div>
      </div>`;
    },

    renderTable(records) {
        if (!records.length) {
            return `<div class="empty-state">${Utils.getIcon('clock',48)}<h3>No records found</h3><p>Try adjusting your search or filters.</p></div>`;
        }

        const statusMap = {
            returned: '<span class="badge badge-success">Returned</span>',
            borrowed: '<span class="badge badge-primary">Borrowed</span>',
            overdue: '<span class="badge badge-danger">Overdue</span>',
            rejected: '<span class="badge badge-danger">Rejected</span>',
            pending: '<span class="badge badge-warning">Pending</span>',
            approved: '<span class="badge badge-info">Approved</span>'
        };

        return `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr>
            <th>Borrow ID</th><th>Book</th><th>Borrow Date</th><th>Return Date</th><th>Fine</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>${records.map(r => {
            return `<tr>
                <td class="mono" style="font-size:0.8rem;">${r.id}</td>
                <td><strong>${Utils.escapeHtml(r.bookTitle)}</strong></td>
                <td>${Utils.formatDate(r.borrowDate)}</td>
                <td>${r.returnDate ? Utils.formatDate(r.returnDate) : (r.expectedReturnDate ? Utils.formatDate(r.expectedReturnDate) + ' (expected)' : 'N/A')}</td>
                <td>${r.fine > 0 ? '<span class="text-danger" style="font-weight:600;">Rs. ' + r.fine + '</span>' : '<span class="text-success">None</span>'}</td>
                <td>${statusMap[r.status] || r.status}</td>
                <td>
                    <div style="display:flex;gap:4px;">
                        <button class="btn btn-ghost btn-sm" onclick="BorrowHistoryPage.downloadReceipt('${r.id}')" title="Download Receipt">${Utils.getIcon('download', 14)}</button>
                        <button class="btn btn-ghost btn-sm" onclick="BorrowHistoryPage.printReceipt('${r.id}')" title="Print Receipt">${Utils.getIcon('printer', 14)}</button>
                    </div>
                </td>
            </tr>`;
        }).join('')}</tbody></table></div>
        <div style="padding:16px 20px;display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;color:var(--text-secondary);">
            <span>Showing ${records.length} record${records.length !== 1 ? 's' : ''}</span>
            <span>Total Fines: Rs. ${records.reduce((s, r) => s + (r.fine || 0), 0)}</span>
        </div></div>`;
    },

    downloadReceipt(requestId) {
        const r = AppState.borrowRequests.find(b => b.id === requestId);
        if (!r) return Toast.error('Record not found');

        const statusMap = { returned: 'Returned', borrowed: 'Borrowed', overdue: 'Overdue', rejected: 'Rejected', pending: 'Pending', approved: 'Approved' };
        const content = `
╔══════════════════════════════════════╗
║        LIBRARY BORROW RECEIPT        ║
╠══════════════════════════════════════╣
║ Borrow ID  : ${r.id}
║ Book       : ${r.bookTitle}
║ Borrow Date: ${Utils.formatDate(r.borrowDate)}
║ Return Date: ${r.returnDate ? Utils.formatDate(r.returnDate) : 'N/A'}
║ Status     : ${statusMap[r.status] || r.status}
║ Fine       : Rs. ${r.fine || 0}
╚══════════════════════════════════════╝`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${requestId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('Receipt downloaded');
    },

    printReceipt(requestId) {
        const r = AppState.borrowRequests.find(b => b.id === requestId);
        if (!r) return Toast.error('Record not found');

        const statusMap = { returned: 'Returned', borrowed: 'Borrowed', overdue: 'Overdue', rejected: 'Rejected', pending: 'Pending', approved: 'Approved' };
        const win = window.open('', '_blank', 'width=400,height=500');
        win.document.write(`
            <html><head><title>Receipt - ${r.id}</title>
            <style>body{font-family:monospace;padding:20px;font-size:14px;}
            h2{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;}
            .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dotted #ccc;}
            .label{font-weight:bold;} .total{font-size:18px;font-weight:bold;text-align:right;margin-top:10px;border-top:2px solid #333;padding-top:10px;}</style></head>
            <body><h2>Library Borrow Receipt</h2>
            <div class="row"><span class="label">Borrow ID:</span><span>${r.id}</span></div>
            <div class="row"><span class="label">Book:</span><span>${r.bookTitle}</span></div>
            <div class="row"><span class="label">Borrow Date:</span><span>${Utils.formatDate(r.borrowDate)}</span></div>
            <div class="row"><span class="label">Return Date:</span><span>${r.returnDate ? Utils.formatDate(r.returnDate) : 'N/A'}</span></div>
            <div class="row"><span class="label">Status:</span><span>${statusMap[r.status] || r.status}</span></div>
            <div class="row"><span class="label">Fine:</span><span>Rs. ${r.fine || 0}</span></div>
            <div class="total">Total Fine: Rs. ${r.fine || 0}</div>
            <p style="text-align:center;margin-top:20px;font-size:12px;color:#888;">Thank you for using the library</p>
            <script>window.onload=function(){window.print();}<\/script>
            </body></html>`);
        win.document.close();
    },

    afterRender() {
        const search = document.getElementById('historySearch');
        const filter = document.getElementById('historyFilter');
        const sort = document.getElementById('historySort');
        const dateFrom = document.getElementById('historyDateFrom');
        const dateTo = document.getElementById('historyDateTo');

        if (search) search.addEventListener('input', Utils.debounce((e) => {
            this.searchQuery = e.target.value;
            this.refresh();
        }, 300));

        if (filter) filter.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.refresh();
        });

        if (sort) sort.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.refresh();
        });

        if (dateFrom) dateFrom.addEventListener('change', (e) => {
            this.dateFrom = e.target.value;
            this.refresh();
        });

        if (dateTo) dateTo.addEventListener('change', (e) => {
            this.dateTo = e.target.value;
            this.refresh();
        });
    },

    refresh() {
        const content = document.getElementById('historyContent');
        if (!content) return;
        let allHistory = [...AppState.borrowRequests].filter(r =>
            r.studentId === (AppState.currentUser?.id || 1) &&
            (r.status === 'returned' || r.status === 'rejected' || r.status === 'borrowed' || r.status === 'overdue')
        );
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            allHistory = allHistory.filter(r => r.id.toLowerCase().includes(q) || r.bookTitle.toLowerCase().includes(q));
        }
        if (this.filterStatus !== 'all') allHistory = allHistory.filter(r => r.status === this.filterStatus);
        if (this.dateFrom) {
            const from = new Date(this.dateFrom);
            allHistory = allHistory.filter(r => new Date(r.borrowDate) >= from);
        }
        if (this.dateTo) {
            const to = new Date(this.dateTo);
            to.setHours(23, 59, 59, 999);
            allHistory = allHistory.filter(r => new Date(r.borrowDate) <= to);
        }
        switch (this.sortBy) {
            case 'newest': allHistory.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate)); break;
            case 'oldest': allHistory.sort((a, b) => new Date(a.borrowDate) - new Date(b.borrowDate)); break;
            case 'title': allHistory.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle)); break;
            case 'fine': allHistory.sort((a, b) => (b.fine || 0) - (a.fine || 0)); break;
        }
        content.innerHTML = this.renderTable(allHistory);
    }
};
