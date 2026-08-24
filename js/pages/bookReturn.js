const BookReturnPage = {
    activeTab: 'qr',
    selectedRequest: null,
    lastReceipt: null,
    searchQuery: '',
    searchResults: [],
    condition: 'good',
    damageFee: 0,
    notes: '',

    render() {
        const activeBorrows = AppState.borrowRequests.filter(r =>
            r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested'
        );
        const today = new Date().toISOString().split('T')[0];
        const todayReturns = AppState.borrowRequests.filter(r =>
            r.status === 'returned' && r.returnDate === today
        );
        const todayFines = todayReturns.reduce((s, r) => s + (r.fine || 0), 0);

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('rotate-ccw', 28)} Book Return</h1>
          <p class="page-description">Process book returns from students</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        ${!this.lastReceipt ? this.renderReturnInterface(activeBorrows) : this.renderReceipt()}
        ${this.renderRecentReturns(todayReturns, todayFines)}
      </div>`;
    },

    renderReturnInterface(activeBorrows) {
        return `
        <div class="my-books-summary" style="margin-bottom:1.5rem;">
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon blue">${Utils.getIcon('book-open', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${activeBorrows.length}</span>
              <span class="summary-stat-label">Active Borrows</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon red">${Utils.getIcon('alert-triangle', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${activeBorrows.filter(r => r.status === 'overdue').length}</span>
              <span class="summary-stat-label">Overdue Books</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon yellow">${Utils.getIcon('corner-down-left', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${activeBorrows.filter(r => r.status === 'return_requested').length}</span>
              <span class="summary-stat-label">Return Requests</span>
            </div>
          </div>
        </div>
        ${this.selectedRequest ? this.renderReturnProcessing() : this.renderTabs(activeBorrows)}`;
    },

    renderTabs(activeBorrows) {
        return `
        <div class="tabs" style="margin-bottom:1.5rem;">
          <button class="tab-btn ${this.activeTab === 'qr' ? 'active' : ''}" data-tab="qr">${Utils.getIcon('qr-code', 18)} QR Scan</button>
          <button class="tab-btn ${this.activeTab === 'barcode' ? 'active' : ''}" data-tab="barcode">${Utils.getIcon('hash', 18)} Barcode</button>
          <button class="tab-btn ${this.activeTab === 'student' ? 'active' : ''}" data-tab="student">${Utils.getIcon('users', 18)} Search by Student</button>
          <button class="tab-btn ${this.activeTab === 'book' ? 'active' : ''}" data-tab="book">${Utils.getIcon('book', 18)} Search by Book</button>
          <button class="tab-btn ${this.activeTab === 'due' ? 'active' : ''}" data-tab="due">${Utils.getIcon('calendar', 18)} Edit Due Date</button>
        </div>
        <div id="tab-content">${this.renderTabContent(activeBorrows)}</div>`;
    },

    renderTabContent(activeBorrows) {
        switch (this.activeTab) {
            case 'qr': return this.renderQRScan(activeBorrows);
            case 'barcode': return this.renderBarcodeScan(activeBorrows);
            case 'student': return this.renderStudentSearch(activeBorrows);
            case 'book': return this.renderBookSearch(activeBorrows);
            case 'due': return this.renderDueDateManager(activeBorrows);
            default: return this.renderQRScan(activeBorrows);
        }
    },

    renderDueDateManager(activeBorrows) {
        if (!activeBorrows.length) {
            return `
            <div class="card" style="padding:1.5rem;">
              <h3 style="margin:0 0 0.5rem;">${Utils.getIcon('calendar', 20)} Edit Due Dates</h3>
              <p style="color:var(--text-secondary);margin:0 0 1.5rem;">Change the return date for any active borrow to extend or shorten the loan period.</p>
              <div class="empty-state" style="padding:2rem 0;">${Utils.getIcon('book-open', 36)}<h3>No Active Borrows</h3><p>There are no active borrows to edit.</p></div>
            </div>`;
        }
        return `
        <div class="card" style="padding:1.5rem;">
          <h3 style="margin:0 0 0.5rem;">${Utils.getIcon('calendar', 20)} Edit Due Dates</h3>
          <p style="color:var(--text-secondary);margin:0 0 1.25rem;">Change the return date for any active borrow to extend or shorten the loan period. Overdue fines are recalculated automatically.</p>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Book</th><th>Student</th><th>Borrow Date</th><th>Current Due</th><th>New Due Date</th><th></th></tr>
              </thead>
              <tbody>
                ${activeBorrows.map(r => {
                    const book = AppState.books.find(b => b.id === r.bookId);
                    return `
                    <tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                          <div style="width:36px;height:50px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div>
                          <div>
                            <strong style="font-size:0.85rem;">${Utils.escapeHtml(r.bookTitle)}</strong>
                            <div style="font-size:0.75rem;color:var(--text-tertiary);font-family:var(--font-mono);">${r.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style="font-size:0.85rem;">${Utils.escapeHtml(r.studentName)}</td>
                      <td style="font-size:0.85rem;">${Utils.formatDate(r.borrowDate)}</td>
                      <td style="font-size:0.85rem;${r.status === 'overdue' ? 'color:var(--danger);font-weight:600;' : ''}">${Utils.formatDate(r.expectedReturnDate)}</td>
                      <td><input type="date" class="form-input" id="duedate-${r.id}" value="${r.expectedReturnDate}" style="max-width:160px;padding:0.45rem 0.6rem;"></td>
                      <td>
                        <button class="btn btn-sm btn-primary" onclick="BookReturnPage.saveDueDate('${r.id}')">${Utils.getIcon('save', 14)} Save</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    },

    renderQRScan(activeBorrows) {
        return `
        <div class="card" style="padding:1.5rem;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <div style="display:inline-block;padding:1rem;background:var(--bg-secondary);border-radius:12px;margin-bottom:1rem;">
              ${Utils.getIcon('qr-code', 64)}
            </div>
            <h3 style="margin:0 0 0.5rem;">Scan QR Code</h3>
            <p style="color:var(--text-secondary);margin:0;">Enter or scan the QR code from the book's borrow receipt</p>
          </div>
          <div class="form-group" style="max-width:400px;margin:0 auto;">
            <div style="position:relative;">
              <input class="form-input" id="qrInput" placeholder="Enter Borrow ID (e.g. BR-20260714-0001)" style="padding-left:2.5rem;text-align:center;font-family:var(--font-mono);font-size:0.95rem;">
              <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('qr-code', 16)}</span>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:0.75rem;" onclick="BookReturnPage.lookupByCode('qr')">
              ${Utils.getIcon('search', 16)} Look Up
            </button>
          </div>
          ${this.renderQuickPick(activeBorrows)}
        </div>`;
    },

    renderBarcodeScan(activeBorrows) {
        return `
        <div class="card" style="padding:1.5rem;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <div style="display:inline-block;padding:1rem;background:var(--bg-secondary);border-radius:12px;margin-bottom:1rem;">
              ${Utils.getIcon('hash', 64)}
            </div>
            <h3 style="margin:0 0 0.5rem;">Scan Barcode</h3>
            <p style="color:var(--text-secondary);margin:0;">Enter the barcode number from the book</p>
          </div>
          <div class="form-group" style="max-width:400px;margin:0 auto;">
            <div style="position:relative;">
              <input class="form-input" id="barcodeInput" placeholder="Enter barcode number" style="padding-left:2.5rem;text-align:center;font-family:var(--font-mono);font-size:0.95rem;">
              <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('hash', 16)}</span>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:0.75rem;" onclick="BookReturnPage.lookupByCode('barcode')">
              ${Utils.getIcon('search', 16)} Look Up
            </button>
          </div>
          ${this.renderQuickPick(activeBorrows)}
        </div>`;
    },

    renderQuickPick(activeBorrows) {
        if (!activeBorrows.length) return '';
        return `
        <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);">
          <h4 style="margin:0 0 0.75rem;font-size:0.9rem;color:var(--text-secondary);">Or select from active borrows:</h4>
          <div style="display:flex;flex-direction:column;gap:0.5rem;max-height:300px;overflow-y:auto;">
            ${activeBorrows.map(r => {
                const book = AppState.books.find(b => b.id === r.bookId);
                const now = new Date();
                const due = new Date(r.expectedReturnDate);
                const isOverdue = due < now;
                return `
                <div class="glass-card-sm" style="padding:0.75rem;display:flex;align-items:center;gap:0.75rem;cursor:pointer;transition:all 0.2s;"
                     onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'"
                     onclick="BookReturnPage.selectRequest('${r.id}')">
                  <div style="width:40px;height:56px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(r.bookTitle)}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(r.studentName)} &middot; ${r.id}</div>
                  </div>
                  <div style="text-align:right;flex-shrink:0;">
                    ${r.status === 'return_requested' ? '<span class="badge badge-warning" style="font-size:0.7rem;">Return Req</span>' : ''}
                    ${isOverdue ? '<span class="badge badge-danger" style="font-size:0.7rem;">Overdue</span>' : ''}
                    ${!isOverdue && r.status === 'borrowed' ? '<span class="badge badge-primary" style="font-size:0.7rem;">Active</span>' : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    },

    renderStudentSearch(activeBorrows) {
        return `
        <div class="card" style="padding:1.5rem;">
          <div class="form-group">
            <label class="form-label">${Utils.getIcon('users', 16)} Search Student</label>
            <div style="position:relative;">
              <input class="form-input" id="studentSearch" placeholder="Search by student name or ID..." value="${Utils.escapeHtml(this.searchQuery)}" style="padding-left:2.5rem;">
              <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
            </div>
          </div>
          <div id="studentResults">${this.renderStudentResults(activeBorrows)}</div>
        </div>`;
    },

    renderStudentResults(activeBorrows) {
        if (!this.searchQuery) {
            return `<p style="color:var(--text-secondary);text-align:center;padding:2rem 0;">Type a student name to find their borrowed books</p>`;
        }
        const q = this.searchQuery.toLowerCase();
        const students = {};
        activeBorrows.forEach(r => {
            if (r.studentName.toLowerCase().includes(q) || String(r.studentId).includes(q)) {
                if (!students[r.studentId]) students[r.studentId] = { name: r.studentName, id: r.studentId, borrows: [] };
                students[r.studentId].borrows.push(r);
            }
        });
        const entries = Object.values(students);
        if (!entries.length) {
            return `<div class="empty-state" style="padding:2rem 0;">${Utils.getIcon('users', 36)}<h3>No Students Found</h3><p>No active borrows match your search.</p></div>`;
        }
        return entries.map(s => `
        <div style="margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.85rem;">${s.name.split(' ').map(n => n[0]).join('')}</div>
            <div><strong>${Utils.escapeHtml(s.name)}</strong><br><small style="color:var(--text-secondary);">ID: ${s.id} &middot; ${s.borrows.length} active borrow${s.borrows.length > 1 ? 's' : ''}</small></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.5rem;padding-left:1rem;">
            ${s.borrows.map(r => {
                const book = AppState.books.find(b => b.id === r.bookId);
                return `
                <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;cursor:pointer;border-radius:6px;transition:background 0.2s;"
                     onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='transparent'"
                     onclick="BookReturnPage.selectRequest('${r.id}')">
                  <div style="width:30px;height:42px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:0.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(r.bookTitle)}</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">${r.id}</div>
                  </div>
                  <span style="font-size:0.75rem;color:var(--text-tertiary);">${Utils.getIcon('chevron-right', 14)}</span>
                </div>`;
            }).join('')}
          </div>
        </div>`).join('');
    },

    renderBookSearch(activeBorrows) {
        return `
        <div class="card" style="padding:1.5rem;">
          <div class="form-group">
            <label class="form-label">${Utils.getIcon('book', 16)} Search Book</label>
            <div style="position:relative;">
              <input class="form-input" id="bookSearchInput" placeholder="Search by book title, ISBN, or author..." value="${Utils.escapeHtml(this.searchQuery)}" style="padding-left:2.5rem;">
              <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
            </div>
          </div>
          <div id="bookResults">${this.renderBookResults(activeBorrows)}</div>
        </div>`;
    },

    renderBookResults(activeBorrows) {
        if (!this.searchQuery) {
            return `<p style="color:var(--text-secondary);text-align:center;padding:2rem 0;">Type a book name to find who borrowed it</p>`;
        }
        const q = this.searchQuery.toLowerCase();
        const matches = activeBorrows.filter(r =>
            r.bookTitle.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
        );
        if (!matches.length) {
            return `<div class="empty-state" style="padding:2rem 0;">${Utils.getIcon('book', 36)}<h3>No Books Found</h3><p>No active borrows match your search.</p></div>`;
        }
        return `
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          ${matches.map(r => {
            const book = AppState.books.find(b => b.id === r.bookId);
            const now = new Date();
            const due = new Date(r.expectedReturnDate);
            const isOverdue = due < now;
            return `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;cursor:pointer;border:1px solid var(--border);border-radius:8px;transition:all 0.2s;"
                 onmouseover="this.style.borderColor='var(--primary)';this.style.background='var(--bg-secondary)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'"
                 onclick="BookReturnPage.selectRequest('${r.id}')">
              <div style="width:40px;height:56px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:0.9rem;">${Utils.escapeHtml(r.bookTitle)}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);">Borrowed by: ${Utils.escapeHtml(r.studentName)}</div>
                <div style="font-size:0.75rem;color:var(--text-tertiary);">${r.id} &middot; Due: ${Utils.formatDate(r.expectedReturnDate)}</div>
              </div>
              <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:0.25rem;">
                ${r.status === 'return_requested' ? '<span class="badge badge-warning" style="font-size:0.65rem;">Return Requested</span>' : ''}
                ${isOverdue ? '<span class="badge badge-danger" style="font-size:0.65rem;">Overdue</span>' : ''}
                <span style="font-size:0.75rem;color:var(--text-tertiary);">${Utils.getIcon('chevron-right', 14)}</span>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    },

    renderReturnProcessing() {
        const r = this.selectedRequest;
        const book = AppState.books.find(b => b.id === r.bookId);
        const student = AppState.getUserById(r.studentId) || { name: r.studentName, grade: 'N/A' };
        const now = new Date();
        const due = new Date(r.expectedReturnDate);
        const isOverdue = due < now;
        const daysLate = isOverdue ? Math.ceil((now - due) / 86400000) : 0;
        const overdueFine = daysLate * 5;
        const damageFee = this.condition === 'lost' ? (this.damageFee || 500) : (this.condition === 'damaged' ? this.damageFee : 0);
        const totalFine = overdueFine + damageFee;

        return `
        <div class="card" style="padding:1.5rem;margin-bottom:1.5rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">
            <h3 style="margin:0;">${Utils.getIcon('corner-down-left', 20)} Process Return</h3>
            <button class="btn btn-outline btn-sm" onclick="BookReturnPage.cancelReturn()">${Utils.getIcon('x', 14)} Cancel</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
            <div>
              <h4 style="margin:0 0 0.75rem;font-size:0.85rem;text-transform:uppercase;color:var(--text-secondary);letter-spacing:0.05em;">${Utils.getIcon('book-open', 14)} Book Information</h4>
              <div style="display:flex;gap:1rem;padding:1rem;background:var(--bg-secondary);border-radius:8px;">
                <div style="width:70px;height:98px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div>
                <div>
                  <div style="font-weight:600;">${Utils.escapeHtml(r.bookTitle)}</div>
                  <div style="font-size:0.85rem;color:var(--text-secondary);">${book ? Utils.escapeHtml(book.author) : ''}</div>
                  <div style="font-size:0.8rem;color:var(--text-tertiary);margin-top:0.25rem;">${book ? 'ISBN: ' + Utils.escapeHtml(book.isbn || 'N/A') : ''}</div>
                </div>
              </div>
            </div>
            <div>
              <h4 style="margin:0 0 0.75rem;font-size:0.85rem;text-transform:uppercase;color:var(--text-secondary);letter-spacing:0.05em;">${Utils.getIcon('users', 14)} Student Information</h4>
              <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
                  <div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.8rem;">${student.name ? student.name.split(' ').map(n => n[0]).join('') : '?'}</div>
                  <div>
                    <div style="font-weight:600;">${Utils.escapeHtml(r.studentName)}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);">Grade ${Utils.escapeHtml(student.grade || 'N/A')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top:1.5rem;">
            <h4 style="margin:0 0 0.75rem;font-size:0.85rem;text-transform:uppercase;color:var(--text-secondary);letter-spacing:0.05em;">${Utils.getIcon('file-text', 14)} Borrow Details</h4>
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:0.75rem;">
              <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;text-align:center;">
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.25rem;">Borrow ID</div>
                <div style="font-weight:600;font-family:var(--font-mono);font-size:0.85rem;">${r.id}</div>
              </div>
              <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;text-align:center;">
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.25rem;">Borrow Date</div>
                <div style="font-weight:600;font-size:0.85rem;">${Utils.formatDate(r.borrowDate)}</div>
              </div>
              <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;text-align:center;">
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.25rem;">Due Date</div>
                <div style="font-weight:600;font-size:0.85rem;${isOverdue ? 'color:var(--danger);' : ''}">${Utils.formatDate(r.expectedReturnDate)}</div>
              </div>
              <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;text-align:center;">
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.25rem;">Days Late</div>
                <div style="font-weight:600;font-size:0.85rem;${isOverdue ? 'color:var(--danger);' : ''}">${isOverdue ? daysLate : '0'}</div>
              </div>
            </div>
          </div>

          <div style="margin-top:1.5rem;">
            <h4 style="margin:0 0 0.75rem;font-size:0.85rem;text-transform:uppercase;color:var(--text-secondary);letter-spacing:0.05em;">${Utils.getIcon('info', 14)} Condition Check</h4>
            <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="display:flex;gap:1.5rem;margin-bottom:1rem;">
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding:0.5rem 1rem;border-radius:6px;border:2px solid ${this.condition === 'good' ? 'var(--success)' : 'var(--border)'};background:${this.condition === 'good' ? 'rgba(16,185,129,0.1)' : 'transparent'};transition:all 0.2s;" onclick="BookReturnPage.setCondition('good')">
                  <input type="radio" name="condition" value="good" ${this.condition === 'good' ? 'checked' : ''} style="display:none;">
                  <span style="color:${this.condition === 'good' ? 'var(--success)' : 'var(--text-secondary)'};">${Utils.getIcon('check-circle', 18)}</span>
                  <span style="font-weight:500;">Good</span>
                </label>
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding:0.5rem 1rem;border-radius:6px;border:2px solid ${this.condition === 'damaged' ? 'var(--warning)' : 'var(--border)'};background:${this.condition === 'damaged' ? 'rgba(245,158,11,0.1)' : 'transparent'};transition:all 0.2s;" onclick="BookReturnPage.setCondition('damaged')">
                  <input type="radio" name="condition" value="damaged" ${this.condition === 'damaged' ? 'checked' : ''} style="display:none;">
                  <span style="color:${this.condition === 'damaged' ? 'var(--warning)' : 'var(--text-secondary)'};">${Utils.getIcon('alert-triangle', 18)}</span>
                  <span style="font-weight:500;">Damaged</span>
                </label>
                <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding:0.5rem 1rem;border-radius:6px;border:2px solid ${this.condition === 'lost' ? 'var(--danger)' : 'var(--border)'};background:${this.condition === 'lost' ? 'rgba(239,68,68,0.1)' : 'transparent'};transition:all 0.2s;" onclick="BookReturnPage.setCondition('lost')">
                  <input type="radio" name="condition" value="lost" ${this.condition === 'lost' ? 'checked' : ''} style="display:none;">
                  <span style="color:${this.condition === 'lost' ? 'var(--danger)' : 'var(--text-secondary)'};">${Utils.getIcon('x-circle', 18)}</span>
                  <span style="font-weight:500;">Lost</span>
                </label>
              </div>
              ${(this.condition === 'damaged' || this.condition === 'lost') ? `
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <label class="form-label" style="margin:0;white-space:nowrap;">Damage/Loss Fee (Rs.)</label>
                <input class="form-input" id="damageFeeInput" type="number" min="0" value="${damageFee}" onchange="BookReturnPage.damageFee=parseInt(this.value)||0;BookReturnPage.refreshProcessing();" style="max-width:150px;">
              </div>` : ''}
            </div>
          </div>

          <div style="margin-top:1.5rem;">
            <h4 style="margin:0 0 0.75rem;font-size:0.85rem;text-transform:uppercase;color:var(--text-secondary);letter-spacing:0.05em;">${Utils.getIcon('calculator', 14)} Fine Calculation</h4>
            <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="display:flex;flex-direction:column;gap:0.5rem;">
                <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
                  <span>Overdue Fine (${daysLate} days &times; Rs. 5/day)</span>
                  <span style="font-weight:600;${overdueFine > 0 ? 'color:var(--danger);' : ''}">Rs. ${overdueFine}</span>
                </div>
                ${damageFee > 0 ? `
                <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
                  <span>${this.condition === 'lost' ? 'Book Replacement' : 'Damage Fee'}</span>
                  <span style="font-weight:600;color:var(--danger);">Rs. ${damageFee}</span>
                </div>` : ''}
                <div style="display:flex;justify-content:space-between;padding-top:0.5rem;border-top:1px solid var(--border);font-size:1rem;">
                  <span style="font-weight:700;">Total Fine</span>
                  <span style="font-weight:700;font-size:1.15rem;${totalFine > 0 ? 'color:var(--danger);' : 'color:var(--success);'}">Rs. ${totalFine}</span>
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top:1.5rem;">
            <label class="form-label">${Utils.getIcon('edit-2', 14)} Notes (optional)</label>
            <textarea class="form-input" id="returnNotes" rows="2" placeholder="Any additional notes about this return...">${Utils.escapeHtml(this.notes)}</textarea>
          </div>

          <div style="margin-top:1.5rem;display:flex;gap:0.75rem;">
            <button class="btn btn-outline" onclick="BookReturnPage.cancelReturn()" style="flex:0;">${Utils.getIcon('x', 16)} Cancel</button>
            <button class="btn btn-primary" onclick="BookReturnPage.processReturn()" style="flex:1;">${Utils.getIcon('check-circle', 16)} Process Return</button>
          </div>
        </div>`;
    },

    renderReceipt() {
        const receipt = this.lastReceipt;
        return `
        <div class="card" style="padding:1.5rem;text-align:center;">
          <div style="display:inline-block;padding:1rem;background:rgba(16,185,129,0.1);border-radius:50%;margin-bottom:1rem;">
            ${Utils.getIcon('check-circle', 48).replace('stroke="currentColor"', 'stroke="var(--success)"')}
          </div>
          <h2 style="margin:0 0 0.5rem;color:var(--success);">Return Processed Successfully</h2>
          <p style="color:var(--text-secondary);margin:0 0 1.5rem;">The book has been returned and inventory updated.</p>
          <div id="receiptContent" style="text-align:left;max-width:600px;margin:0 auto;padding:1.5rem;border:1px solid var(--border);border-radius:8px;background:var(--bg-secondary);">
            <div style="text-align:center;margin-bottom:1rem;padding-bottom:1rem;border-bottom:2px solid var(--primary);">
              <h3 style="margin:0;color:var(--primary);">Saraswati Sec School Library</h3>
              <p style="margin:2px 0 0;font-size:0.8rem;color:var(--text-secondary);">Book Return Receipt</p>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem;">
              <div><small style="color:var(--text-tertiary);">Receipt ID</small><p style="margin:2px 0;font-family:var(--font-mono);font-weight:600;">${receipt.requestId}</p></div>
              <div><small style="color:var(--text-tertiary);">Processed At</small><p style="margin:2px 0;">${new Date(receipt.processedAt).toLocaleString()}</p></div>
              <div><small style="color:var(--text-tertiary);">Book Title</small><p style="margin:2px 0;font-weight:600;">${Utils.escapeHtml(receipt.bookTitle)}</p></div>
              <div><small style="color:var(--text-tertiary);">Student</small><p style="margin:2px 0;">${Utils.escapeHtml(receipt.studentName)}</p></div>
              <div><small style="color:var(--text-tertiary);">Borrow Date</small><p style="margin:2px 0;">${Utils.formatDate(receipt.borrowDate)}</p></div>
              <div><small style="color:var(--text-tertiary);">Due Date</small><p style="margin:2px 0;">${Utils.formatDate(receipt.expectedReturnDate)}</p></div>
              <div><small style="color:var(--text-tertiary);">Actual Return</small><p style="margin:2px 0;font-weight:600;">${Utils.formatDate(receipt.actualReturnDate)}</p></div>
              <div><small style="color:var(--text-tertiary);">Days Late</small><p style="margin:2px 0;">${receipt.daysLate || 0}</p></div>
            </div>
            <div style="padding-top:0.75rem;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:700;">Total Fine</span>
              <span style="font-weight:700;font-size:1.15rem;${receipt.totalFine > 0 ? 'color:var(--danger);' : 'color:var(--success);'}">Rs. ${receipt.totalFine || 0}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border);">
              <div style="width:120px;border-top:1px solid var(--text-primary);text-align:center;padding-top:0.5rem;font-size:0.75rem;">Librarian Signature</div>
              <div style="width:120px;border-top:1px solid var(--text-primary);text-align:center;padding-top:0.5rem;font-size:0.75rem;">Student Signature</div>
            </div>
            <div style="text-align:center;margin-top:1rem;font-size:0.7rem;color:var(--text-tertiary);">
              Library Stamp Area &middot; Saraswati Sec School Library &middot; Sanothimi, Bhaktapur, Nepal
            </div>
          </div>
          <div style="display:flex;gap:0.75rem;justify-content:center;margin-top:1.5rem;">
            <button class="btn btn-outline" onclick="BookReturnPage.printReceipt()">${Utils.getIcon('printer', 16)} Print Receipt</button>
            <button class="btn btn-primary" onclick="BookReturnPage.returnAnother()">${Utils.getIcon('rotate-ccw', 16)} Return Another</button>
          </div>
        </div>`;
    },

    renderRecentReturns(todayReturns, todayFines) {
        return `
        <div style="margin-top:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
            <h3 style="margin:0;">${Utils.getIcon('clock', 18)} Recent Returns</h3>
            <div style="display:flex;gap:1rem;font-size:0.85rem;">
              <span style="color:var(--text-secondary);">Returned today: <strong>${todayReturns.length}</strong></span>
              <span style="color:var(--text-secondary);">Fines collected: <strong style="color:${todayFines > 0 ? 'var(--danger)' : 'var(--success)'};">Rs. ${todayFines}</strong></span>
            </div>
          </div>
          <div class="card">
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Borrow ID</th>
                    <th>Book</th>
                    <th>Student</th>
                    <th>Return Date</th>
                    <th>Fine</th>
                  </tr>
                </thead>
                <tbody>
                  ${todayReturns.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:2rem;">No returns processed today</td></tr>` :
                    todayReturns.map(r => `
                    <tr>
                      <td class="mono" style="font-size:0.8rem;">${r.id}</td>
                      <td><strong>${Utils.escapeHtml(r.bookTitle)}</strong></td>
                      <td>${Utils.escapeHtml(r.studentName)}</td>
                      <td>${r.returnDate ? Utils.formatDate(r.returnDate) : 'N/A'}</td>
                      <td>${r.fine > 0 ? '<span class="text-danger" style="font-weight:600;">Rs. ' + r.fine + '</span>' : '<span class="text-success">None</span>'}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;
    },

    lookupByCode(type) {
        const input = document.getElementById(type === 'qr' ? 'qrInput' : 'barcodeInput');
        if (!input) return;
        const code = input.value.trim();
        if (!code) {
            Toast.warning('Please enter a code');
            return;
        }

        let request = AppState.borrowRequests.find(r => r.id === code && (r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested'));
        if (!request) {
            const book = AppState.books.find(b => b.isbn === code);
            if (book) {
                request = AppState.borrowRequests.find(r => r.bookId === book.id && (r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested'));
            }
        }

        if (!request) {
            Toast.error('No active borrow found for this code');
            return;
        }

        this.selectRequest(request.id);
    },

    selectRequest(requestId) {
        const r = AppState.borrowRequests.find(x => x.id === requestId);
        if (!r) {
            Toast.error('Request not found');
            return;
        }
        this.selectedRequest = r;
        this.condition = 'good';
        this.damageFee = 0;
        this.notes = '';
        this.lastReceipt = null;
        this.refresh();
    },

    cancelReturn() {
        this.selectedRequest = null;
        this.condition = 'good';
        this.damageFee = 0;
        this.notes = '';
        this.refresh();
    },

    setCondition(c) {
        this.condition = c;
        if (c === 'lost') this.damageFee = this.damageFee || 500;
        else if (c === 'damaged') this.damageFee = this.damageFee || 200;
        else this.damageFee = 0;
        this.refreshProcessing();
    },

    processReturn() {
        if (!this.selectedRequest) return;

        const notesEl = document.getElementById('returnNotes');
        if (notesEl) this.notes = notesEl.value;
        const feeEl = document.getElementById('damageFeeInput');
        if (feeEl) this.damageFee = parseInt(feeEl.value) || 0;

        const r = this.selectedRequest;
        const now = new Date();
        const due = new Date(r.expectedReturnDate);
        const isOverdue = due < now;
        const daysLate = isOverdue ? Math.ceil((now - due) / 86400000) : 0;
        const overdueFine = daysLate * 5;
        const damageFee = this.condition === 'lost' ? (this.damageFee || 500) : (this.condition === 'damaged' ? this.damageFee : 0);
        const totalFine = overdueFine + damageFee;

        let msg = `Process return of "${r.bookTitle}"?`;
        if (totalFine > 0) msg += ` Total fine: Rs. ${totalFine}`;

        Modal.confirm('Confirm Return', msg, () => {
            const result = AppState.processReturn(r.id);
            if (result && result.success) {
                const receipt = {
                    ...result.receipt,
                    condition: this.condition,
                    damageFee: damageFee,
                    overdueFine: overdueFine,
                    notes: this.notes,
                    processedBy: AppState.currentUser ? AppState.currentUser.name : 'Librarian'
                };
                receipt.totalFine = totalFine;
                this.lastReceipt = receipt;
                this.selectedRequest = null;
                this.condition = 'good';
                this.damageFee = 0;
                this.notes = '';
                Toast.success('Book returned successfully!');
                Utils.confetti();
                this.refresh();
            } else {
                Toast.error('Failed to process return');
            }
        });
    },

    returnAnother() {
        this.lastReceipt = null;
        this.selectedRequest = null;
        this.condition = 'good';
        this.damageFee = 0;
        this.notes = '';
        this.searchQuery = '';
        this.searchResults = [];
        this.refresh();
    },

    printReceipt() {
        const receipt = this.lastReceipt;
        if (!receipt) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            Toast.warning('Pop-up blocked. Please allow pop-ups to print.');
            return;
        }
        printWindow.document.write(`
        <html><head><title>Return Receipt - ${receipt.requestId}</title>
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
        <div class="header"><h1>Saraswati Sec School Library</h1><h2>Book Return Receipt</h2></div>
        <table>
            <tr><td>Receipt ID</td><td>${receipt.requestId}</td></tr>
            <tr><td>Book Title</td><td>${receipt.bookTitle}</td></tr>
            <tr><td>Student Name</td><td>${receipt.studentName}</td></tr>
            <tr><td>Student ID</td><td>STU-${String(receipt.studentId).padStart(4, '0')}</td></tr>
            <tr><td>Borrow Date</td><td>${Utils.formatDate(receipt.borrowDate)}</td></tr>
            <tr><td>Due Date</td><td>${Utils.formatDate(receipt.expectedReturnDate)}</td></tr>
            <tr><td>Actual Return</td><td>${Utils.formatDate(receipt.actualReturnDate)}</td></tr>
            <tr><td>Condition</td><td>${(receipt.condition || 'good').toUpperCase()}</td></tr>
            <tr><td>Days Late</td><td>${receipt.daysLate || 0}</td></tr>
            <tr><td>Overdue Fine</td><td>Rs. ${receipt.overdueFine || 0}</td></tr>
            ${receipt.damageFee ? `<tr><td>Damage/Loss Fee</td><td>Rs. ${receipt.damageFee}</td></tr>` : ''}
            <tr><td><strong>Total Fine</strong></td><td><strong>Rs. ${receipt.totalFine || 0}</strong></td></tr>
            ${receipt.notes ? `<tr><td>Notes</td><td>${receipt.notes}</td></tr>` : ''}
            <tr><td>Processed By</td><td>${receipt.processedBy || 'Librarian'}</td></tr>
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
        </body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    },

    saveDueDate(requestId) {
        const input = document.getElementById('duedate-' + requestId);
        if (!input) return;
        const date = input.value;
        if (!date) {
            Toast.error('Please choose a valid date');
            return;
        }
        const r = AppState.borrowRequests.find(x => x.id === requestId);
        if (!r) {
            Toast.error('Request not found');
            return;
        }
        if (date === r.expectedReturnDate) {
            Toast.info('No change — due date is already ' + Utils.formatDate(date));
            return;
        }
        Modal.confirm('Update Due Date', `Change the due date for "${r.bookTitle}" (${r.studentName}) from ${Utils.formatDate(r.expectedReturnDate)} to ${Utils.formatDate(date)}?`, () => {
            if (AppState.updateBorrowDueDate(requestId, date)) {
                Toast.success('Due date updated successfully');
                this.refresh();
            } else {
                Toast.error('Failed to update due date');
            }
        });
    },

    refreshProcessing() {
        const container = document.getElementById('pageContent');
        if (container) {
            const mainEl = container.querySelector('.container');
            if (mainEl) {
                const activeBorrows = AppState.borrowRequests.filter(r =>
                    r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested'
                );
                const interfaceEl = mainEl.querySelector('.my-books-summary');
                if (interfaceEl && this.selectedRequest) {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = this.renderReturnInterface(activeBorrows);
                    interfaceEl.parentNode.replaceChild(wrapper.firstElementChild, interfaceEl);
                }
            }
        }
        this.refresh();
    },

    switchTab(tab) {
        this.activeTab = tab;
        const content = document.getElementById('tab-content');
        if (content) {
            const activeBorrows = AppState.borrowRequests.filter(r =>
                r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested'
            );
            content.innerHTML = this.renderTabContent(activeBorrows);
        }
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        this.afterRender();
    },

    refresh() {
        Router.resolve();
    },

    afterRender() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        const qrInput = document.getElementById('qrInput');
        if (qrInput) {
            qrInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.lookupByCode('qr');
            });
            qrInput.focus();
        }

        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) {
            barcodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.lookupByCode('barcode');
            });
        }

        const studentSearch = document.getElementById('studentSearch');
        if (studentSearch) {
            studentSearch.addEventListener('input', Utils.debounce((e) => {
                this.searchQuery = e.target.value;
                const resultsEl = document.getElementById('studentResults');
                if (resultsEl) {
                    const activeBorrows = AppState.borrowRequests.filter(r =>
                        r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested'
                    );
                    resultsEl.innerHTML = this.renderStudentResults(activeBorrows);
                }
            }, 300));
        }

        const bookSearchInput = document.getElementById('bookSearchInput');
        if (bookSearchInput) {
            bookSearchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchQuery = e.target.value;
                const resultsEl = document.getElementById('bookResults');
                if (resultsEl) {
                    const activeBorrows = AppState.borrowRequests.filter(r =>
                        r.status === 'borrowed' || r.status === 'overdue' || r.status === 'return_requested'
                    );
                    resultsEl.innerHTML = this.renderBookResults(activeBorrows);
                }
            }, 300));
        }
    }
};
