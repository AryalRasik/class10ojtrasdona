const OfflineIssuePage = {
    currentStep: 1,
    userDetails: { name: '', email: '', grade: '', className: '', phone: '', role: 'student' },
    selectedBook: null,
    bookSearchQuery: '',
    bookSearchResults: [],
    borrowPeriod: 14,
    returnDate: '',
    notes: '',
    lastIssued: null,
    userSearchQuery: '',
    selectedUser: null,

    render() {
        const isLibrarian = AppState.currentUser && (AppState.currentUser.role === 'librarian' || AppState.currentUser.role === 'admin');
        if (!isLibrarian) {
            return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Access Restricted</h1>
          <p class="page-description">This page is only available for librarians.</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="empty-state">${Utils.getIcon('shield', 48)}<h3>Librarian Access Required</h3><p>Offline book issue is a librarian-only feature.</p></div>
      </div>`;
        }

        const offlineBorrows = (AppState.borrowRequests || []).filter(r => r.isOffline);
        const activeOffline = offlineBorrows.filter(r => r.status === 'borrowed' || r.status === 'overdue');

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('book-open', 28)} Offline Book Issue</h1>
          <p class="page-description">Issue books to users who visit the library without using the app</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        ${this.lastIssued ? this.renderSuccess() : ''}
        <div class="my-books-summary" style="margin-bottom:1.5rem;">
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon blue">${Utils.getIcon('book-open', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${offlineBorrows.length}</span>
              <span class="summary-stat-label">Offline Issues</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon yellow">${Utils.getIcon('clock', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${activeOffline.length}</span>
              <span class="summary-stat-label">Currently Out</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon green">${Utils.getIcon('users', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${AppState.offlineUsers.length}</span>
              <span class="summary-stat-label">Offline Members</span>
            </div>
          </div>
        </div>

        <div id="issue-wizard">
          <div style="margin-bottom:2rem;">
            ${this.renderSteps()}
          </div>
          <div id="step-content">${this.renderStepContent()}</div>
        </div>

        <div style="margin-top:2rem;">
          <h3 style="margin-bottom:1rem;">${Utils.getIcon('clock', 20)} Recent Offline Issues</h3>
          ${this.renderRecentOffline(offlineBorrows)}
        </div>
      </div>`;
    },

    renderSuccess() {
        const i = this.lastIssued;
        return `
        <div class="card" style="padding:1.5rem;margin-bottom:1.5rem;border-left:4px solid var(--success);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;border-radius:50%;background:rgba(16,185,129,0.1);color:var(--success);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('check-circle', 24)}</div>
            <div style="flex:1;">
              <h3 style="margin:0;color:var(--success);">Book Issued Offline</h3>
              <p style="margin:2px 0 0;font-size:0.85rem;color:var(--text-secondary);">"${Utils.escapeHtml(i.bookTitle)}" issued to ${Utils.escapeHtml(i.studentName)}. Due by ${Utils.formatDate(i.expectedReturnDate)}.</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="OfflineIssuePage.resetForm()">${Utils.getIcon('plus', 14)} New Issue</button>
          </div>
        </div>`;
    },

    renderSteps() {
        const steps = [
            { num: 1, label: 'User Details', icon: 'users' },
            { num: 2, label: 'Select Book', icon: 'book-open' },
            { num: 3, label: 'Confirm & Issue', icon: 'check-circle' }
        ];

        return `<div style="display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:1.5rem;">
      ${steps.map((s, i) => {
            const isActive = this.currentStep === s.num;
            const isCompleted = this.currentStep > s.num;
            const color = isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--text-tertiary)';
            return `
          ${i > 0 ? `<div style="flex:1;height:2px;background:${isCompleted ? 'var(--success)' : 'var(--border)'};max-width:80px;"></div>` : ''}
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:90px;">
            <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--bg-tertiary)'};color:${isActive || isCompleted ? '#fff' : 'var(--text-tertiary)'};transition:all 0.2s;">
              ${isCompleted ? Utils.getIcon('check', 18) : Utils.getIcon(s.icon, 18)}
            </div>
            <span style="font-size:0.75rem;font-weight:${isActive ? '600' : '400'};color:${color};text-align:center;">${s.label}</span>
          </div>`;
        }).join('')}
    </div>`;
    },

    renderStepContent() {
        switch (this.currentStep) {
            case 1: return this.renderStep1();
            case 2: return this.renderStep2();
            case 3: return this.renderStep3();
            default: return this.renderStep1();
        }
    },

    renderStep1() {
        const d = this.userDetails;
        const existing = !!this.selectedUser;
        return `
      <div class="card">
        <div class="card-header-flex">
          <h3 style="margin:0;">${Utils.getIcon('users', 20)} Step 1: User Details</h3>
          ${existing
            ? '<span class="badge badge-success">Existing Member</span>'
            : '<span class="badge badge-info">Walk-in User</span>'}
        </div>
        <div style="padding:1.25rem 1.5rem 0;">
          <label class="form-label">Find Existing Member (optional) ${Utils.getIcon('search', 13)}</label>
          <input class="form-input" id="oi-user-search" placeholder="Search imported students / members by name, email, grade or class..." value="${Utils.escapeHtml(this.userSearchQuery)}" oninput="OfflineIssuePage.onUserSearch(this.value)" autocomplete="off">
          <div id="oi-user-results"></div>
          ${existing ? `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0.6rem 0.9rem;margin-top:0.5rem;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;">
              <span style="font-size:0.85rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.getIcon('check-circle', 14)} <strong>${Utils.escapeHtml(this.selectedUser.name || '')}</strong>${this.selectedUser.email ? ' <span style="color:var(--text-secondary);">· ' + Utils.escapeHtml(this.selectedUser.email) + '</span>' : ''}</span>
              <button class="btn btn-ghost btn-sm" onclick="OfflineIssuePage.clearUserSelection()" title="Choose a different member">${Utils.getIcon('x', 13)} Change</button>
            </div>` : ''}
        </div>
        <div style="padding:0 1.5rem 1.5rem;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
            <div class="form-group">
              <label class="form-label">Full Name *</label>
              <input class="form-input" id="oi-name" placeholder="e.g. Hari Adhikari" value="${Utils.escapeHtml(d.name)}">
            </div>
            <div class="form-group">
              <label class="form-label">Email (optional)</label>
              <input class="form-input" id="oi-email" type="email" placeholder="Email address" value="${Utils.escapeHtml(d.email)}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
              <label class="form-label">Grade (for students)</label>
              <input class="form-input" id="oi-grade" placeholder="e.g. 9" value="${Utils.escapeHtml(d.grade)}">
            </div>
            <div class="form-group">
              <label class="form-label">Class</label>
              <input class="form-input" id="oi-class" placeholder="e.g. A" value="${Utils.escapeHtml(d.className)}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input class="form-input" id="oi-phone" placeholder="Contact number" value="${Utils.escapeHtml(d.phone)}">
            </div>
            <div class="form-group">
              <label class="form-label">Role</label>
              <select class="form-input" id="oi-role">
                <option value="student" ${d.role === 'student' ? 'selected' : ''}>Student</option>
                <option value="teacher" ${d.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                <option value="librarian" ${d.role === 'librarian' ? 'selected' : ''}>Staff</option>
              </select>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:0.5rem;">
            <button class="btn btn-primary" onclick="OfflineIssuePage.goToStep(2)">Next: Select Book ${Utils.getIcon('arrow-right', 16)}</button>
          </div>
        </div>
      </div>`;
    },

    renderStep2() {
        let resultsHtml = '';
        if (this.bookSearchQuery && this.bookSearchResults.length > 0) {
            resultsHtml = `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1rem;margin-top:0.75rem;max-height:400px;overflow-y:auto;">
            ${this.bookSearchResults.map(b => {
                const isAvailable = b.availableCopies > 0;
                return `
              <div style="display:flex;gap:12px;padding:1rem;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s;${isAvailable ? '' : 'opacity:0.6;'}"
                   onmouseenter="this.style.borderColor='var(--primary)';this.style.background='var(--bg-secondary)'" onmouseleave="this.style.borderColor='var(--border)';this.style.background=''"
                   onclick="${isAvailable ? `OfflineIssuePage.selectBook(${b.id})` : ''}">
                <div style="width:60px;min-height:80px;flex-shrink:0;font-size:0;">${Utils.getBookCover(b)}</div>
                <div style="flex:1;min-width:0;">
                  <strong style="font-size:0.9rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(b.title)}</strong>
                  <p style="margin:2px 0;font-size:0.8rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(b.author)}</p>
                  <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;">
                    <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">${isAvailable ? b.availableCopies + ' avail' : 'None'}</span>
                    <span class="badge badge-info">${Utils.escapeHtml(b.shelf || 'N/A')}</span>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>`;
        } else if (this.bookSearchQuery && this.bookSearchResults.length === 0) {
            resultsHtml = `<div class="card" style="margin-top:0.75rem;padding:1.5rem;text-align:center;color:var(--text-secondary);">No books found matching "${Utils.escapeHtml(this.bookSearchQuery)}"</div>`;
        }

        const selectedHtml = this.selectedBook ? this.renderSelectedBookCard() : '';

        return `
      <div class="card">
        <div class="card-header-flex">
          <h3 style="margin:0;">${Utils.getIcon('book-open', 20)} Step 2: Select Book</h3>
          ${this.selectedBook ? '<span class="badge badge-success">Selected</span>' : '<span class="badge badge-warning">Not Selected</span>'}
        </div>
        <div style="padding:0 1.5rem 1.5rem;">
          <div style="position:relative;margin-bottom:0.5rem;">
            <input class="form-input" id="oi-book-search" placeholder="Search by Title, Author, ISBN, or Shelf..." value="${Utils.escapeHtml(this.bookSearchQuery)}" oninput="OfflineIssuePage.onBookSearch(this.value)" style="padding-left:2.5rem;">
            <span style="position:absolute;left:1.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
          </div>
          ${resultsHtml}
        </div>
      </div>
      ${selectedHtml}
      <div style="display:flex;justify-content:space-between;margin-top:1rem;">
        <button class="btn btn-outline" onclick="OfflineIssuePage.goToStep(1)">${Utils.getIcon('arrow-left', 16)} Back</button>
        ${this.selectedBook ? `<button class="btn btn-primary" onclick="OfflineIssuePage.goToStep(3)">Next: Confirm & Issue ${Utils.getIcon('arrow-right', 16)}</button>` : ''}
      </div>`;
    },

    renderSelectedBookCard() {
        const b = this.selectedBook;
        const isAvailable = b.availableCopies > 0;

        return `
      <div class="card glass-card" style="margin-top:1rem;border-left:3px solid ${isAvailable ? 'var(--success)' : 'var(--danger)'};">
        <div style="padding:1.25rem;">
          <div style="display:flex;gap:16px;">
            <div style="width:80px;min-height:110px;flex-shrink:0;font-size:0;">${Utils.getBookCover(b)}</div>
            <div style="flex:1;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                <div>
                  <h3 style="margin:0;font-size:1.1rem;">${Utils.escapeHtml(b.title)}</h3>
                  <p style="margin:2px 0;font-size:0.85rem;color:var(--text-secondary);">by ${Utils.escapeHtml(b.author)}</p>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="OfflineIssuePage.clearBook()" title="Change book">${Utils.getIcon('x', 14)} Change</button>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;margin-top:12px;">
                <div style="text-align:center;padding:0.5rem;background:var(--bg-secondary);border-radius:6px;">
                  <div style="font-size:0.95rem;font-weight:700;color:${isAvailable ? 'var(--success)' : 'var(--danger)'};">${b.availableCopies}/${b.totalCopies}</div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);">Copies</div>
                </div>
                <div style="text-align:center;padding:0.5rem;background:var(--bg-secondary);border-radius:6px;">
                  <div style="font-size:0.95rem;font-weight:700;color:var(--primary);">${Utils.escapeHtml(b.shelf || 'N/A')}</div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);">Shelf</div>
                </div>
                <div style="text-align:center;padding:0.5rem;background:var(--bg-secondary);border-radius:6px;">
                  <div style="font-size:0.95rem;font-weight:700;color:var(--info);">${Utils.escapeHtml(b.rack || 'N/A')}</div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);">Rack</div>
                </div>
              </div>
              ${!isAvailable ? `<p style="color:var(--danger);font-size:0.8rem;margin:8px 0 0;font-weight:600;">No copies available to issue.</p>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    },

    renderStep3() {
        const b = this.selectedBook;
        const returnDate = this.returnDate || this.getDefaultReturnDate();
        const name = this.userDetails.name;

        return `
      <div class="card">
        <div class="card-header-flex">
          <h3 style="margin:0;">${Utils.getIcon('check-circle', 20)} Step 3: Confirm & Issue</h3>
        </div>
        <div style="padding:0 1.5rem 1.5rem;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="color:var(--primary);">${Utils.getIcon('user', 16)}</span>
                <strong style="font-size:0.85rem;">User</strong>
              </div>
              <div style="font-weight:600;">${Utils.escapeHtml(name || '—')}</div>
              ${this.userDetails.grade ? `<div style="font-size:0.8rem;color:var(--text-secondary);">Grade ${Utils.escapeHtml(this.userDetails.grade)} - ${Utils.escapeHtml(this.userDetails.className || '?')}</div>` : ''}
              ${this.userDetails.phone ? `<div style="font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(this.userDetails.phone)}</div>` : ''}
            </div>
            <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="color:var(--primary);">${Utils.getIcon('book-open', 16)}</span>
                <strong style="font-size:0.85rem;">Book</strong>
              </div>
              <div style="display:flex;gap:8px;">
                <div style="width:40px;min-height:55px;flex-shrink:0;font-size:0;">${Utils.getBookCover(b)}</div>
                <div>
                  <div style="font-weight:600;font-size:0.9rem;">${Utils.escapeHtml(b.title)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</div>
                </div>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div class="form-group">
              <label class="form-label">Borrow Period (Days)</label>
              <select class="form-input" id="oi-period" onchange="OfflineIssuePage.onPeriodChange(this.value)">
                <option value="7" ${this.borrowPeriod === 7 ? 'selected' : ''}>7 days</option>
                <option value="14" ${this.borrowPeriod === 14 ? 'selected' : ''}>14 days (Default)</option>
                <option value="21" ${this.borrowPeriod === 21 ? 'selected' : ''}>21 days</option>
                <option value="30" ${this.borrowPeriod === 30 ? 'selected' : ''}>30 days</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Return Date *</label>
              <input type="date" class="form-input" id="oi-return-date" value="${returnDate}" onchange="OfflineIssuePage.returnDate=this.value">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes (Optional)</label>
            <textarea class="form-input" id="oi-notes" rows="2" placeholder="Any additional notes about this issue..." oninput="OfflineIssuePage.notes=this.value" style="resize:vertical;">${Utils.escapeHtml(this.notes)}</textarea>
          </div>

          <div style="display:flex;gap:8px;padding:0.75rem 1rem;background:var(--bg-secondary);border-radius:8px;margin-bottom:1.5rem;">
            <span style="color:var(--primary);">${Utils.getIcon('info', 16)}</span>
            <span style="font-size:0.85rem;color:var(--text-secondary);">The book will be marked as borrowed immediately and the user will be added to the library records with the details above.</span>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:1rem;">
        <button class="btn btn-outline" onclick="OfflineIssuePage.goToStep(2)">${Utils.getIcon('arrow-left', 16)} Back</button>
        <button class="btn btn-primary" onclick="OfflineIssuePage.confirmIssue()" ${b.availableCopies <= 0 ? 'disabled' : ''}>
          ${Utils.getIcon('check-circle', 16)} Issue Book Offline
        </button>
      </div>`;
    },

    renderRecentOffline(offlineBorrows) {
        const list = offlineBorrows.slice(-10).reverse();

        if (!list.length) {
            return `<div class="empty-state">${Utils.getIcon('book-open', 48)}<h3>No Offline Issues</h3><p>Books issued offline by librarians will appear here.</p></div>`;
        }

        return `
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>User</th>
                <th>Issued By</th>
                <th>Borrow Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(r => {
                const book = AppState.books.find(b => b.id === r.bookId);
                const statusBadge = r.status === 'borrowed'
                    ? '<span class="badge badge-primary">Borrowed</span>'
                    : r.status === 'overdue'
                        ? '<span class="badge badge-danger">Overdue</span>'
                        : '<span class="badge badge-success">Returned</span>';
                return `<tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:36px;min-height:50px;flex-shrink:0;font-size:0;">${book ? Utils.getBookCover(book) : ''}</div>
                      <div>
                        <strong>${Utils.escapeHtml(r.bookTitle)}</strong>
                        <p style="margin:0;font-size:0.75rem;color:var(--text-secondary);font-family:var(--font-mono);">${r.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>${Utils.escapeHtml(r.studentName)}</td>
                  <td>${Utils.escapeHtml(r.issuedBy || 'N/A')}</td>
                  <td>${Utils.formatDate(r.borrowDate)}</td>
                  <td>${Utils.formatDate(r.expectedReturnDate)}</td>
                  <td>${statusBadge}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    },

    getDefaultReturnDate() {
        const d = new Date();
        d.setDate(d.getDate() + this.borrowPeriod);
        return d.toISOString().split('T')[0];
    },

    searchBooks(query) {
        if (!query) return [];
        const q = query.toLowerCase();
        return (AppState.books || []).filter(b =>
            (b.title || '').toLowerCase().includes(q) ||
            (b.author || '').toLowerCase().includes(q) ||
            (b.isbn || '').toLowerCase().includes(q) ||
            (b.shelf || '').toLowerCase().includes(q)
        );
    },

    onBookSearch(value) {
        this.bookSearchQuery = value;
        this.bookSearchResults = this.searchBooks(value);
        const content = document.getElementById('step-content');
        if (content) content.innerHTML = this.renderStep2();
    },

    selectBook(id) {
        const found = (AppState.books || []).find(b => b.id === id);
        if (found) {
            this.selectedBook = found;
            this.bookSearchQuery = '';
            this.bookSearchResults = [];
            const content = document.getElementById('step-content');
            if (content) content.innerHTML = this.renderStep2();
        }
    },

    clearBook() {
        this.selectedBook = null;
        const content = document.getElementById('step-content');
        if (content) content.innerHTML = this.renderStep2();
    },

    onPeriodChange(value) {
        this.borrowPeriod = parseInt(value) || 14;
        this.returnDate = this.getDefaultReturnDate();
        const input = document.getElementById('oi-return-date');
        if (input) input.value = this.returnDate;
    },

    captureUserDetails() {
        const nameEl = document.getElementById('oi-name');
        if (nameEl) this.userDetails.name = nameEl.value.trim();
        const emailEl = document.getElementById('oi-email');
        if (emailEl) this.userDetails.email = emailEl.value.trim();
        const gradeEl = document.getElementById('oi-grade');
        if (gradeEl) this.userDetails.grade = gradeEl.value.trim();
        const classEl = document.getElementById('oi-class');
        if (classEl) this.userDetails.className = classEl.value.trim();
        const phoneEl = document.getElementById('oi-phone');
        if (phoneEl) this.userDetails.phone = phoneEl.value.trim();
        const roleEl = document.getElementById('oi-role');
        if (roleEl) this.userDetails.role = roleEl.value;
    },

    onUserSearch(value) {
        this.userSearchQuery = value;
        const results = this.userSearchQuery.trim()
            ? (AppState.searchLookupUsers ? AppState.searchLookupUsers(this.userSearchQuery) : [])
            : [];
        const box = document.getElementById('oi-user-results');
        if (box) box.innerHTML = this._renderUserResults(results);
    },

    _renderUserResults(results) {
        if (!results.length) {
            return `<div style="margin-top:0.5rem;padding:0.75rem;border:1px solid var(--border);border-radius:8px;font-size:0.85rem;color:var(--text-secondary);">No members found. Type a new name below to add a walk-in user.</div>`;
        }
        return `<div style="margin-top:0.5rem;border:1px solid var(--border);border-radius:8px;overflow:hidden;max-height:260px;overflow-y:auto;">
            ${results.map(u => `
              <div onclick="OfflineIssuePage.selectUser('${String(u.id || u.email || u.name || '').replace(/'/g, "\\'")}')" style="display:flex;align-items:center;gap:10px;padding:0.6rem 0.9rem;cursor:pointer;border-bottom:1px solid var(--border);background:var(--bg-primary);" onmouseenter="this.style.background='var(--bg-secondary)'" onmouseleave="this.style.background='var(--bg-primary)'">
                <div class="avatar-sm" style="width:30px;height:30px;font-size:0.6rem;">${Utils.escapeHtml(u.avatar || (u.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2))}</div>
                <div style="flex:1;min-width:0;">
                  <strong style="font-size:0.85rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escapeHtml(u.name || '')}</strong>
                  <span style="font-size:0.75rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;">${Utils.escapeHtml(u.email || '')}${u.grade || u.class || u.className ? ' · ' + Utils.escapeHtml((u.grade || '') + ' ' + (u.class || u.className || '')) : ''}</span>
                </div>
                <span class="badge ${u.role === 'student' ? 'badge-info' : u.role === 'teacher' ? 'badge-warning' : 'badge-primary'}">${Utils.escapeHtml(u.role || 'student')}</span>
              </div>`).join('')}
          </div>`;
    },

    selectUser(key) {
        const found = (AppState.getLookupUsers ? AppState.getLookupUsers() : []).find(u => String(u.id || '') === key || String(u.email || '') === key || String(u.name || '') === key);
        if (!found) return;
        this.selectedUser = found;
        this.userSearchQuery = '';
        this.userDetails = {
            name: found.name || '',
            email: found.email || '',
            grade: found.grade || found.grade_level || '',
            className: found.class || found.className || '',
            phone: found.phone || '',
            role: found.role || 'student'
        };
        const input = document.getElementById('oi-user-search');
        if (input) input.value = '';
        const box = document.getElementById('oi-user-results');
        if (box) box.innerHTML = '';
        this.rerenderStep1();
    },

    clearUserSelection() {
        this.selectedUser = null;
        this.userSearchQuery = '';
        this.rerenderStep1();
    },

    rerenderStep1() {
        const content = document.getElementById('step-content');
        if (content) content.innerHTML = this.renderStepContent();
        this.afterStepRender();
    },

    goToStep(step) {
        if (step === 2 || step === 3) this.captureUserDetails();

        if (step === 2 && !this.userDetails.name) {
            Toast.warning('Please enter the user\'s full name first.');
            return;
        }
        if (step === 3 && !this.selectedBook) {
            Toast.warning('Please select a book.');
            return;
        }
        this.currentStep = step;
        const wizard = document.getElementById('issue-wizard');
        if (wizard) {
            wizard.innerHTML = `
          <div style="margin-bottom:2rem;">
            ${this.renderSteps()}
          </div>
          <div id="step-content">${this.renderStepContent()}</div>`;
        }
        this.afterStepRender();
    },

    confirmIssue() {
        this.captureUserDetails();

        const notesEl = document.getElementById('oi-notes');
        if (notesEl) this.notes = notesEl.value;

        const returnInput = document.getElementById('oi-return-date');
        let returnDate = returnInput ? returnInput.value : this.returnDate;
        if (!returnDate) returnDate = this.getDefaultReturnDate();
        if (!returnDate || isNaN(new Date(returnDate).getTime())) {
            Toast.error('Please choose a valid return date');
            return;
        }

        const b = this.selectedBook;
        const name = this.userDetails.name;

        if (!name) {
            Toast.error('Please enter the user\'s full name');
            return;
        }
        if (b.availableCopies <= 0) {
            Toast.error('No available copies of this book');
            return;
        }

        const dueDiff = Math.round((new Date(returnDate) - new Date()) / 86400000);
        const period = Math.max(1, Math.round((new Date(returnDate) - new Date()) / 86400000));

        Modal.show({
            title: 'Confirm Offline Issue',
            content: `
              <p style="color:var(--text-secondary);margin:0 0 1rem;">Please confirm issuing this book to a walk-in user:</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
                  <small style="color:var(--text-tertiary);">User</small>
                  <p style="margin:2px 0 0;font-weight:600;">${Utils.escapeHtml(name)}</p>
                  ${this.userDetails.grade ? `<p style="margin:2px 0;font-size:0.8rem;color:var(--text-secondary);">Grade ${Utils.escapeHtml(this.userDetails.grade)} - ${Utils.escapeHtml(this.userDetails.className || '?')}</p>` : ''}
                </div>
                <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
                  <small style="color:var(--text-tertiary);">Book</small>
                  <p style="margin:2px 0 0;font-weight:600;">${Utils.escapeHtml(b.title)}</p>
                  <p style="margin:2px 0;font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</p>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
                  <small style="color:var(--text-tertiary);">Return Date</small>
                  <p style="margin:2px 0 0;font-weight:600;">${Utils.formatDate(returnDate)}</p>
                </div>
                <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
                  <small style="color:var(--text-tertiary);">Loan Period</small>
                  <p style="margin:2px 0 0;font-weight:600;">${dueDiff >= 0 ? dueDiff + ' days' : 'Invalid date'}</p>
                </div>
              </div>
              ${this.notes ? `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;margin-bottom:0.5rem;">
                <small style="color:var(--text-tertiary);">Notes</small>
                <p style="margin:2px 0 0;font-size:0.85rem;">${Utils.escapeHtml(this.notes)}</p>
              </div>` : ''}`,
            size: 'md',
            buttons: [
                { label: 'Cancel', class: 'btn-secondary' },
                { label: 'Confirm Issue', class: 'btn-primary', onClick: () => this.issueBook(returnDate) }
            ]
        });
    },

    issueBook(returnDate) {
        const userDetails = { ...this.userDetails };
        const result = AppState.createOfflineBorrow(userDetails, this.selectedBook.id, Math.max(1, this.borrowPeriod), this.selectedUser);

        if (result) {
            result.expectedReturnDate = returnDate;
            if (result.expectedReturnDate) AppState.updateBorrowDueDate(result.id, returnDate);
            Modal.hide();
            this.lastIssued = result;
            this.resetForm();
            Router.resolve();
            Toast.success(`Book issued offline to "${this.userDetails.name}"`);
        } else {
            Toast.error('Failed to issue the book. Please try again.');
        }
    },

    resetForm() {
        this.currentStep = 1;
        this.userDetails = { name: '', email: '', grade: '', className: '', phone: '', role: 'student' };
        this.selectedBook = null;
        this.bookSearchQuery = '';
        this.bookSearchResults = [];
        this.borrowPeriod = 14;
        this.returnDate = '';
        this.notes = '';
        this.userSearchQuery = '';
        this.selectedUser = null;
    },

    afterStepRender() {
        const bookInput = document.getElementById('oi-book-search');
        if (bookInput) bookInput.focus();
    },

    afterRender() {
        const nameInput = document.getElementById('oi-name');
        if (nameInput) nameInput.focus();
    }
};
