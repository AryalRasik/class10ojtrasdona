const PhysicalReservationPage = {
    currentStep: 1,
    selectedStudent: null,
    selectedBook: null,
    studentSearchQuery: '',
    bookSearchQuery: '',
    borrowPeriod: 14,
    notes: '',
    studentSearchResults: [],
    bookSearchResults: [],

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
        <div class="empty-state">${Utils.getIcon('shield', 48)}<h3>Librarian Access Required</h3><p>Physical reservation creation is a librarian-only feature.</p></div>
      </div>`;
        }

        const physical = (AppState.reservations || []).filter(r => r.isPhysical);

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('layers', 28)} Physical Reservation</h1>
          <p class="page-description">Create reservations for students visiting the library</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="my-books-summary">
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon blue">${Utils.getIcon('layers', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${physical.length}</span>
              <span class="summary-stat-label">Total Physical</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon yellow">${Utils.getIcon('clock', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${physical.filter(r => r.status === 'waiting').length}</span>
              <span class="summary-stat-label">Waiting</span>
            </div>
          </div>
          <div class="summary-stat-card glass-card-sm">
            <div class="summary-stat-icon green">${Utils.getIcon('check-circle', 22)}</div>
            <div class="summary-stat-info">
              <span class="summary-stat-value">${physical.filter(r => r.status === 'completed').length}</span>
              <span class="summary-stat-label">Completed</span>
            </div>
          </div>
        </div>

        <div id="reservation-wizard">
          <div style="margin-bottom:2rem;">
            ${this.renderSteps()}
          </div>
          <div id="step-content">${this.renderStepContent()}</div>
        </div>

        <div style="margin-top:2rem;">
          <h3 style="margin-bottom:1rem;">${Utils.getIcon('clock', 20)} Recent Physical Reservations</h3>
          ${this.renderRecentPhysical()}
        </div>
      </div>`;
    },

    renderSteps() {
        const steps = [
            { num: 1, label: 'Search Student', icon: 'users' },
            { num: 2, label: 'Search Book', icon: 'book-open' },
            { num: 3, label: 'Confirm Reservation', icon: 'check-circle' }
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
        let resultsHtml = '';
        if (this.studentSearchQuery && this.studentSearchResults.length > 0) {
            resultsHtml = `
          <div class="card" style="margin-top:0.75rem;max-height:300px;overflow-y:auto;">
            ${this.studentSearchResults.map(s => `
              <div style="display:flex;align-items:center;gap:12px;padding:0.75rem 1rem;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s;"
                   onmouseenter="this.style.background='var(--bg-secondary)'" onmouseleave="this.style.background=''"
                   onclick="PhysicalReservationPage.selectStudent(${s.id})">
                <div class="avatar-sm" style="width:36px;height:36px;font-size:0.65rem;">${s.avatar || s.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                <div style="flex:1;">
                  <strong style="font-size:0.9rem;">${Utils.escapeHtml(s.name)}</strong>
                  <p style="margin:2px 0;font-size:0.8rem;color:var(--text-secondary);">Grade ${s.grade || '?'} - ${s.class || '?'} | ${Utils.escapeHtml(s.email || '')}</p>
                </div>
                <span style="font-size:0.75rem;color:var(--text-tertiary);font-family:monospace;">ID: ${s.id}</span>
              </div>
            `).join('')}
          </div>`;
        } else if (this.studentSearchQuery && this.studentSearchResults.length === 0) {
            resultsHtml = `<div class="card" style="margin-top:0.75rem;padding:1.5rem;text-align:center;color:var(--text-secondary);">No students found matching "${Utils.escapeHtml(this.studentSearchQuery)}"</div>`;
        }

        const selectedHtml = this.selectedStudent ? this.renderSelectedStudentCard() : '';

        return `
      <div class="card">
        <div class="card-header-flex">
          <h3 style="margin:0;">${Utils.getIcon('users', 20)} Step 1: Search Student</h3>
          ${this.selectedStudent ? '<span class="badge badge-success">Selected</span>' : '<span class="badge badge-warning">Not Selected</span>'}
        </div>
        <div style="padding:0 1.5rem 1.5rem;">
          <div style="position:relative;margin-bottom:0.5rem;">
            <input class="form-input" id="student-search" placeholder="Search by Student ID, Name, or Email..." value="${Utils.escapeHtml(this.studentSearchQuery)}" oninput="PhysicalReservationPage.onStudentSearch(this.value)" style="padding-left:2.5rem;">
            <span style="position:absolute;left:1.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
          </div>
          ${resultsHtml}
        </div>
      </div>
      ${selectedHtml}
      ${this.selectedStudent ? `
      <div style="display:flex;justify-content:flex-end;margin-top:1rem;">
        <button class="btn btn-primary" onclick="PhysicalReservationPage.goToStep(2)">Next: Search Book ${Utils.getIcon('arrow-right', 16)}</button>
      </div>` : ''}`;
    },

    renderSelectedStudentCard() {
        const s = this.selectedStudent;
        const activeBorrows = (AppState.borrowRequests || []).filter(r =>
            r.studentId === s.id && (r.status === 'borrowed' || r.status === 'overdue')
        ).length;
        const totalFine = (AppState.borrowRequests || [])
            .filter(r => r.studentId === s.id)
            .reduce((sum, r) => sum + (r.fine || 0), 0);
        const unpaidFine = totalFine - (AppState.finePayments || [])
            .filter(p => p.studentId === s.id)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        return `
      <div class="card glass-card" style="margin-top:1rem;border-left:3px solid var(--primary);">
        <div style="padding:1.25rem;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div class="avatar-sm" style="width:48px;height:48px;font-size:1rem;">${s.avatar || s.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
            <div style="flex:1;">
              <h3 style="margin:0;font-size:1.1rem;">${Utils.escapeHtml(s.name)}</h3>
              <p style="margin:2px 0;font-size:0.85rem;color:var(--text-secondary);">${Utils.escapeHtml(s.email || '')}</p>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="PhysicalReservationPage.clearStudent()" title="Change student">${Utils.getIcon('x', 14)} Change</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;">
            <div style="text-align:center;padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="font-size:1.1rem;font-weight:700;color:var(--primary);">Grade ${s.grade || '?'}</div>
              <div style="font-size:0.75rem;color:var(--text-secondary);">Grade</div>
            </div>
            <div style="text-align:center;padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="font-size:1.1rem;font-weight:700;color:var(--info);">${s.class || '?'}</div>
              <div style="font-size:0.75rem;color:var(--text-secondary);">Class</div>
            </div>
            <div style="text-align:center;padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="font-size:1.1rem;font-weight:700;color:var(--warning);">${activeBorrows}</div>
              <div style="font-size:0.75rem;color:var(--text-secondary);">Active Borrows</div>
            </div>
            <div style="text-align:center;padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="font-size:1.1rem;font-weight:700;color:${unpaidFine > 0 ? 'var(--danger)' : 'var(--success)'};">${unpaidFine > 0 ? 'Rs. ' + unpaidFine : 'None'}</div>
              <div style="font-size:0.75rem;color:var(--text-secondary);">Fine Balance</div>
            </div>
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
                   onclick="${isAvailable ? `PhysicalReservationPage.selectBook(${b.id})` : ''}">
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
          <h3 style="margin:0;">${Utils.getIcon('book-open', 20)} Step 2: Search Book</h3>
          ${this.selectedBook ? '<span class="badge badge-success">Selected</span>' : '<span class="badge badge-warning">Not Selected</span>'}
        </div>
        <div style="padding:0 1.5rem 1.5rem;">
          <div style="position:relative;margin-bottom:0.5rem;">
            <input class="form-input" id="book-search" placeholder="Search by Title, Author, ISBN, or Shelf Number..." value="${Utils.escapeHtml(this.bookSearchQuery)}" oninput="PhysicalReservationPage.onBookSearch(this.value)" style="padding-left:2.5rem;">
            <span style="position:absolute;left:1.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
          </div>
          ${resultsHtml}
        </div>
      </div>
      ${selectedHtml}
      <div style="display:flex;justify-content:space-between;margin-top:1rem;">
        <button class="btn btn-outline" onclick="PhysicalReservationPage.goToStep(1)">${Utils.getIcon('arrow-left', 16)} Back</button>
        ${this.selectedBook ? `<button class="btn btn-primary" onclick="PhysicalReservationPage.goToStep(3)">Next: Confirm ${Utils.getIcon('arrow-right', 16)}</button>` : ''}
      </div>`;
    },

    renderSelectedBookCard() {
        const b = this.selectedBook;
        const isAvailable = b.availableCopies > 0;
        const queue = AppState.reservations.filter(r => r.bookId === b.id && r.status === 'waiting');

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
                <button class="btn btn-ghost btn-sm" onclick="PhysicalReservationPage.clearBook()" title="Change book">${Utils.getIcon('x', 14)} Change</button>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;margin-top:12px;">
                <div style="text-align:center;padding:0.5rem;background:var(--bg-secondary);border-radius:6px;">
                  <div style="font-size:0.95rem;font-weight:700;color:${isAvailable ? 'var(--success)' : 'var(--danger)'};">${b.availableCopies}/${b.totalCopies}</div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);">Copies</div>
                </div>
                <div style="text-align:center;padding:0.5rem;background:var(--bg-secondary);border-radius:6px;">
                  <div style="font-size:0.95rem;font-weight:700;color:var(--primary);">${Utils.escapeHtml(b.shelf || 'N/A')}</div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);">Shelf</div>
                </div>
                <div style="text-align:center;padding:0.5rem;background:var(--bg-secondary);border-radius:6px;">
                  <div style="font-size:0.95rem;font-weight:700;color:var(--info);">${b.rack || 'N/A'}</div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);">Rack</div>
                </div>
                <div style="text-align:center;padding:0.5rem;background:var(--bg-secondary);border-radius:6px;">
                  <div style="font-size:0.95rem;font-weight:700;color:var(--warning);">${queue.length}</div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);">In Queue</div>
                </div>
              </div>
              ${!isAvailable ? `<p style="color:var(--danger);font-size:0.8rem;margin:8px 0 0;font-weight:600;">No copies available. Reservation will be queued.</p>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    },

    renderStep3() {
        const s = this.selectedStudent;
        const b = this.selectedBook;
        const expectedReturn = new Date();
        expectedReturn.setDate(expectedReturn.getDate() + this.borrowPeriod);

        return `
      <div class="card">
        <div class="card-header-flex">
          <h3 style="margin:0;">${Utils.getIcon('check-circle', 20)} Step 3: Confirm Reservation</h3>
        </div>
        <div style="padding:0 1.5rem 1.5rem;">
          <h4 style="margin:0 0 1rem;color:var(--text-secondary);font-weight:500;">Reservation Summary</h4>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span style="color:var(--primary);">${Utils.getIcon('user', 16)}</span>
                <strong style="font-size:0.85rem;">Student</strong>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="avatar-sm" style="width:32px;height:32px;font-size:0.6rem;">${s.avatar || s.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                <div>
                  <div style="font-weight:600;">${Utils.escapeHtml(s.name)}</div>
                  <div style="font-size:0.8rem;color:var(--text-secondary);">Grade ${s.grade || '?'} - ${s.class || '?'}</div>
                </div>
              </div>
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
              <select class="form-input" id="borrow-period" onchange="PhysicalReservationPage.onPeriodChange(this.value)">
                <option value="7" ${this.borrowPeriod === 7 ? 'selected' : ''}>7 days</option>
                <option value="14" ${this.borrowPeriod === 14 ? 'selected' : ''}>14 days (Default - Students)</option>
                <option value="21" ${this.borrowPeriod === 21 ? 'selected' : ''}>21 days (Default - Teachers)</option>
                <option value="30" ${this.borrowPeriod === 30 ? 'selected' : ''}>30 days</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Return Date</label>
              <input class="form-input" value="${Utils.formatDate(expectedReturn.toISOString())}" disabled>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes (Optional)</label>
            <textarea class="form-input" id="reservation-notes" rows="3" placeholder="Add any notes about this reservation..." oninput="PhysicalReservationPage.notes=this.value" style="resize:vertical;">${Utils.escapeHtml(this.notes)}</textarea>
          </div>

          <div style="display:flex;gap:8px;padding:0.75rem 1rem;background:var(--bg-secondary);border-radius:8px;margin-bottom:1rem;">
            <span style="color:var(--primary);">${Utils.getIcon('info', 16)}</span>
            <span style="font-size:0.85rem;color:var(--text-secondary);">This reservation will be created on behalf of the student by the librarian. The student does not need to log in.</span>
          </div>

          <div style="display:flex;gap:8px;padding:0.75rem 1rem;background:var(--bg-secondary);border-radius:8px;margin-bottom:1.5rem;">
            <span style="color:var(--primary);">${Utils.getIcon('shield', 16)}</span>
            <span style="font-size:0.85rem;color:var(--text-secondary);">Created by: <strong>${Utils.escapeHtml(AppState.currentUser?.name || 'Librarian')}</strong></span>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:1rem;">
        <button class="btn btn-outline" onclick="PhysicalReservationPage.goToStep(2)">${Utils.getIcon('arrow-left', 16)} Back</button>
        <button class="btn btn-primary" onclick="PhysicalReservationPage.confirmCreate()" ${b.availableCopies <= 0 ? 'title="Book will be queued when available"' : ''}>
          ${Utils.getIcon('check-circle', 16)} Create Reservation
        </button>
      </div>`;
    },

    renderRecentPhysical() {
        const physical = (AppState.reservations || []).filter(r => r.isPhysical).slice(-10).reverse();

        if (!physical.length) {
            return `<div class="empty-state">${Utils.getIcon('layers', 48)}<h3>No Physical Reservations</h3><p>Physical reservations created by librarians will appear here.</p></div>`;
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
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="width:36px;min-height:50px;flex-shrink:0;font-size:0;">${book ? Utils.getBookCover(book) : ''}</div>
                      <div>
                        <strong>${Utils.escapeHtml(r.bookTitle || (book ? book.title : 'Unknown'))}</strong>
                        ${book ? `<p style="margin:0;font-size:0.75rem;color:var(--text-secondary);">${Utils.escapeHtml(book.author)}</p>` : ''}
                      </div>
                    </div>
                  </td>
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

    searchStudents(query) {
        if (!query) return [];
        const q = query.toLowerCase();
        const students = LIBRARY_DATA.students || [];
        const teachers = LIBRARY_DATA.teachers || [];
        const allUsers = [
            ...students.map(u => ({ ...u, role: 'student' })),
            ...teachers.map(u => ({ ...u, role: 'teacher' }))
        ];
        return allUsers.filter(u =>
            (u.name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            String(u.id || '').includes(q)
        );
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

    onStudentSearch(value) {
        this.studentSearchQuery = value;
        this.studentSearchResults = this.searchStudents(value);
        const content = document.getElementById('step-content');
        if (content) content.innerHTML = this.renderStep1();
    },

    onBookSearch(value) {
        this.bookSearchQuery = value;
        this.bookSearchResults = this.searchBooks(value);
        const content = document.getElementById('step-content');
        if (content) content.innerHTML = this.renderStep2();
    },

    selectStudent(id) {
        const students = LIBRARY_DATA.students || [];
        const teachers = LIBRARY_DATA.teachers || [];
        const allUsers = [
            ...students.map(u => ({ ...u, role: 'student' })),
            ...teachers.map(u => ({ ...u, role: 'teacher' }))
        ];
        const found = allUsers.find(u => u.id === id);
        if (found) {
            this.selectedStudent = found;
            this.studentSearchQuery = '';
            this.studentSearchResults = [];
            const content = document.getElementById('step-content');
            if (content) content.innerHTML = this.renderStep1();
        }
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

    clearStudent() {
        this.selectedStudent = null;
        const content = document.getElementById('step-content');
        if (content) content.innerHTML = this.renderStep1();
    },

    clearBook() {
        this.selectedBook = null;
        const content = document.getElementById('step-content');
        if (content) content.innerHTML = this.renderStep2();
    },

    onPeriodChange(value) {
        this.borrowPeriod = parseInt(value) || 14;
    },

    goToStep(step) {
        if (step === 2 && !this.selectedStudent) {
            Toast.warning('Please select a student first.');
            return;
        }
        if (step === 3 && (!this.selectedStudent || !this.selectedBook)) {
            Toast.warning('Please select both a student and a book.');
            return;
        }
        this.currentStep = step;
        const wizard = document.getElementById('reservation-wizard');
        if (wizard) {
            wizard.innerHTML = `
          <div style="margin-bottom:2rem;">
            ${this.renderSteps()}
          </div>
          <div id="step-content">${this.renderStepContent()}</div>`;
        }
    },

    confirmCreate() {
        if (!this.selectedStudent || !this.selectedBook) {
            Toast.warning('Please select both a student and a book.');
            return;
        }

        const s = this.selectedStudent;
        const b = this.selectedBook;
        const isAvailable = b.availableCopies > 0;
        const expectedReturn = new Date();
        expectedReturn.setDate(expectedReturn.getDate() + this.borrowPeriod);

        const content = `
      <div style="margin-bottom:1rem;">
        <p style="color:var(--text-secondary);margin:0 0 1rem;">Please confirm the following physical reservation details:</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
          <small style="color:var(--text-tertiary);">Student</small>
          <p style="margin:2px 0 0;font-weight:600;">${Utils.escapeHtml(s.name)}</p>
          <p style="margin:2px 0;font-size:0.8rem;color:var(--text-secondary);">Grade ${s.grade || '?'} - ${s.class || '?'}</p>
        </div>
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
          <small style="color:var(--text-tertiary);">Book</small>
          <p style="margin:2px 0 0;font-weight:600;">${Utils.escapeHtml(b.title)}</p>
          <p style="margin:2px 0;font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
          <small style="color:var(--text-tertiary);">Borrow Period</small>
          <p style="margin:2px 0 0;font-weight:600;">${this.borrowPeriod} days</p>
        </div>
        <div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;">
          <small style="color:var(--text-tertiary);">Expected Return</small>
          <p style="margin:2px 0 0;font-weight:600;">${Utils.formatDate(expectedReturn.toISOString())}</p>
        </div>
      </div>
      ${!isAvailable ? `<div style="padding:0.75rem;background:var(--warning);color:#000;border-radius:8px;font-size:0.85rem;margin-bottom:1rem;">
        <strong>Note:</strong> This book currently has no available copies. The reservation will be queued and the student will be notified when it becomes available.
      </div>` : ''}
      ${this.notes ? `<div style="padding:0.75rem;background:var(--bg-secondary);border-radius:8px;margin-bottom:0.5rem;">
        <small style="color:var(--text-tertiary);">Notes</small>
        <p style="margin:2px 0 0;font-size:0.85rem;">${Utils.escapeHtml(this.notes)}</p>
      </div>` : ''}`;

        Modal.show({
            title: 'Confirm Physical Reservation',
            content,
            size: 'md',
            buttons: [
                { label: 'Cancel', class: 'btn-secondary' },
                { label: 'Create Reservation', class: 'btn-primary', onClick: () => this.createReservation() }
            ]
        });
    },

    createReservation() {
        if (!this.selectedStudent || !this.selectedBook) {
            Toast.error('Missing student or book selection.');
            return;
        }

        const result = AppState.createPhysicalReservation(
            this.selectedBook.id,
            this.selectedStudent.id,
            this.selectedStudent.name
        );

        if (result) {
            Modal.hide();
            Toast.success(`Physical reservation created for "${this.selectedBook.title}" (Student: ${this.selectedStudent.name})`);
            this.resetForm();
            Router.resolve();
        } else {
            Toast.error('Failed to create reservation. Please try again.');
        }
    },

    resetForm() {
        this.currentStep = 1;
        this.selectedStudent = null;
        this.selectedBook = null;
        this.studentSearchQuery = '';
        this.bookSearchQuery = '';
        this.studentSearchResults = [];
        this.bookSearchResults = [];
        this.borrowPeriod = 14;
        this.notes = '';
    },

    afterRender() {
        const studentInput = document.getElementById('student-search');
        if (studentInput) {
            studentInput.focus();
        }
    }
};
