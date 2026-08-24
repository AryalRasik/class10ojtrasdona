const AdminReportsPage = {
  activeReport: 'overview',
  dateFrom: '',
  dateTo: '',

  render() {
    const stats = LIBRARY_DATA.stats || {};
    const monthly = LIBRARY_DATA.monthlyStats || [];
    const reports = [
      { id: 'overview', label: 'Overview', icon: 'bar-chart-2' },
      { id: 'borrow', label: 'Borrow Report', icon: 'book-open' },
      { id: 'reservation', label: 'Reservation Report', icon: 'bookmark' },
      { id: 'inventory', label: 'Inventory Report', icon: 'package' },
      { id: 'fine', label: 'Fine Report', icon: 'alert-circle' },
      { id: 'popular', label: 'Popular Books', icon: 'star' },
      { id: 'student', label: 'Student Report', icon: 'graduation-cap' },
      { id: 'teacher', label: 'Teacher Report', icon: 'briefcase' }
    ];

    return `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <div><h1 class="page-title">${Utils.getIcon('bar-chart-2', 28)} Reports</h1><p class="page-description">Library analytics and report generation</p></div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
              <button class="btn btn-outline" onclick="AdminReportsPage.exportPDF()">${Utils.getIcon('printer', 16)} Export PDF</button>
              <button class="btn btn-outline" onclick="AdminReportsPage.exportCSV()">${Utils.getIcon('download', 16)} Export CSV</button>
              <button class="btn btn-outline" onclick="AdminReportsPage.exportExcel()">${Utils.getIcon('file-text', 16)} Export Excel</button>
            </div>
          </div>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem;">
          ${reports.map(r => `
            <button class="btn btn-sm ${this.activeReport === r.id ? 'btn-primary' : 'btn-outline'}" onclick="AdminReportsPage.switchReport('${r.id}')">
              ${Utils.getIcon(r.icon, 14)} ${r.label}
            </button>
          `).join('')}
        </div>

        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1rem 1.5rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;">
            <label class="form-label" style="margin:0;white-space:nowrap;">Date Range:</label>
            <input class="form-input" type="date" value="${this.dateFrom}" onchange="AdminReportsPage.dateFrom=this.value;AdminReportsPage.refresh();" style="width:auto;">
            <span style="color:var(--text-secondary);">to</span>
            <input class="form-input" type="date" value="${this.dateTo}" onchange="AdminReportsPage.dateTo=this.value;AdminReportsPage.refresh();" style="width:auto;">
            <button class="btn btn-sm btn-outline" onclick="AdminReportsPage.dateFrom='';AdminReportsPage.dateTo='';AdminReportsPage.refresh();">Clear</button>
          </div>
        </div>

        ${this.renderReportContent()}
      </div>`;
  },

  renderReportContent() {
    switch (this.activeReport) {
      case 'overview': return this.renderOverview();
      case 'borrow': return this.renderBorrowReport();
      case 'reservation': return this.renderReservationReport();
      case 'inventory': return this.renderInventoryReport();
      case 'fine': return this.renderFineReport();
      case 'popular': return this.renderPopularReport();
      case 'student': return this.renderStudentReport();
      case 'teacher': return this.renderTeacherReport();
      default: return this.renderOverview();
    }
  },

  renderOverview() {
    const stats = LIBRARY_DATA.stats || {};
    const monthly = LIBRARY_DATA.monthlyStats || [];
    const totalBorrows = AppState.borrowRequests.length;
    const totalReturned = AppState.borrowRequests.filter(r => r.status === 'returned').length;
    const totalOverdue = AppState.borrowRequests.filter(r => r.status === 'overdue').length;
    const totalPending = AppState.borrowRequests.filter(r => r.status === 'pending').length;
    const totalFines = AppState.borrowRequests.reduce((s, r) => s + (r.fine || 0), 0);
    const totalBooks = (AppState.books || []).length;

    return `
      <div class="grid-4" style="margin-bottom:2rem;">
        <div class="stat-card"><div class="stat-icon" style="background:var(--primary-light);color:var(--primary);">${Utils.getIcon('trending-up', 24)}</div><div class="stat-info"><span class="stat-value">${totalBorrows}</span><span class="stat-label">Total Borrows</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--success-light);color:var(--success);">${Utils.getIcon('check-circle', 24)}</div><div class="stat-info"><span class="stat-value">${totalReturned}</span><span class="stat-label">Total Returns</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--warning-light);color:var(--warning);">${Utils.getIcon('clock', 24)}</div><div class="stat-info"><span class="stat-value">${totalPending}</span><span class="stat-label">Pending</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--danger-light);color:var(--danger);">${Utils.getIcon('alert-circle', 24)}</div><div class="stat-info"><span class="stat-value">${totalOverdue}</span><span class="stat-label">Overdue</span></div></div>
      </div>
      <div class="grid-2" style="margin-bottom:2rem;">
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Borrowing Trends</h3><canvas id="report-borrow-trend" height="250"></canvas></div>
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Category Popularity</h3><canvas id="report-category-chart" height="250"></canvas></div>
      </div>
      <div class="grid-2" style="margin-bottom:2rem;">
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Book Status Overview</h3><canvas id="report-status-chart" height="250"></canvas></div>
        <div class="card" style="padding:1.5rem;">
          <h3 style="margin:0 0 1rem;">Summary</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;text-align:center;"><span style="font-size:1.25rem;font-weight:700;color:var(--primary);">${totalBooks}</span><br><small>Total Books</small></div>
            <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;text-align:center;"><span style="font-size:1.25rem;font-weight:700;color:var(--success);">${stats.availableBooks || 0}</span><br><small>Available</small></div>
            <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;text-align:center;"><span style="font-size:1.25rem;font-weight:700;color:var(--danger);">${totalFines > 0 ? 'Rs. ' + totalFines : 'None'}</span><br><small>Total Fines</small></div>
            <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;text-align:center;"><span style="font-size:1.25rem;font-weight:700;color:var(--warning);">${stats.visitorsToday || 0}</span><br><small>Visitors Today</small></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Monthly Summary</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Month</th><th>Borrowed</th><th>Returned</th><th>Overdue</th><th>New Members</th></tr></thead>
          <tbody>${monthly.map(m => `<tr><td style="font-weight:600;">${Utils.escapeHtml(m.month || '')}</td><td>${m.borrowed || 0}</td><td>${m.returned || 0}</td><td><span style="color:${(m.overdue || 0) > 5 ? 'var(--danger)' : 'inherit'};">${m.overdue || 0}</span></td><td>${m.newMembers || m.newStudents || 0}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">No data available</td></tr>'}</tbody>
        </table></div>
      </div>`;
  },

  renderBorrowReport() {
    const borrows = this._filterByDate(AppState.borrowRequests);
    return `
      <div class="card" style="margin-bottom:2rem;">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Borrow Report</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Borrow ID</th><th>Student</th><th>Book</th><th>Date</th><th>Due Date</th><th>Status</th><th>Fine</th></tr></thead>
          <tbody>${borrows.slice(-50).reverse().map(r => `
            <tr>
              <td class="mono" style="font-size:0.8rem;">${r.id}</td>
              <td>${Utils.escapeHtml(r.studentName)}</td>
              <td>${Utils.escapeHtml(r.bookTitle)}</td>
              <td>${Utils.formatDate(r.borrowDate)}</td>
              <td>${Utils.formatDate(r.expectedReturnDate)}</td>
              <td>${Utils.getStatusBadge(r.status)}</td>
              <td>${r.fine > 0 ? 'Rs. ' + r.fine : '-'}</td>
            </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);">No data</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="grid-2">
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Borrows by Status</h3><canvas id="report-borrow-status" height="250"></canvas></div>
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Borrows Over Time</h3><canvas id="report-borrow-over-time" height="250"></canvas></div>
      </div>`;
  },

  renderReservationReport() {
    const reservations = AppState.reservations || [];
    return `
      <div class="card" style="margin-bottom:2rem;">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Reservation Report</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Book</th><th>Student</th><th>Date</th><th>Position</th><th>Status</th></tr></thead>
          <tbody>${reservations.map(r => `
            <tr>
              <td><strong>${Utils.escapeHtml(r.bookTitle)}</strong></td>
              <td>${Utils.escapeHtml(r.studentName)}</td>
              <td>${Utils.formatDate(r.reservedAt ? new Date(r.reservedAt).toISOString().split('T')[0] : '')}</td>
              <td>${r.position || '-'}</td>
              <td>${Utils.getStatusBadge(r.status === 'waiting' ? 'waiting' : r.status === 'cancelled' ? 'overdue' : r.status === 'expired' ? 'overdue' : 'available')}</td>
            </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">No reservations</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Reservations by Status</h3><canvas id="report-res-status" height="200"></canvas></div>`;
  },

  renderInventoryReport() {
    const books = AppState.books || [];
    const categories = LIBRARY_DATA.categories || [];
    const totalCopies = books.reduce((s, b) => s + (b.totalCopies || 0), 0);
    const availableCopies = books.reduce((s, b) => s + (b.availableCopies || 0), 0);
    const avgRating = books.length ? (books.reduce((s, b) => s + (b.rating || 0), 0) / books.length).toFixed(1) : '0.0';

    return `
      <div class="grid-4" style="margin-bottom:2rem;">
        <div class="stat-card"><div class="stat-icon blue">${Utils.getIcon('book', 24)}</div><div class="stat-info"><span class="stat-value">${books.length}</span><span class="stat-label">Total Titles</span></div></div>
        <div class="stat-card"><div class="stat-icon green">${Utils.getIcon('package', 24)}</div><div class="stat-info"><span class="stat-value">${totalCopies}</span><span class="stat-label">Total Copies</span></div></div>
        <div class="stat-card"><div class="stat-icon teal">${Utils.getIcon('check-circle', 24)}</div><div class="stat-info"><span class="stat-value">${availableCopies}</span><span class="stat-label">Available</span></div></div>
        <div class="stat-card"><div class="stat-icon orange">${Utils.getIcon('star', 24)}</div><div class="stat-info"><span class="stat-value">${avgRating}</span><span class="stat-label">Avg Rating</span></div></div>
      </div>
      <div class="grid-2" style="margin-bottom:2rem;">
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Inventory by Category</h3><canvas id="report-inventory-cat" height="250"></canvas></div>
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Availability</h3><canvas id="report-inventory-avail" height="250"></canvas></div>
      </div>
      <div class="card">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Category Breakdown</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Category</th><th>Titles</th><th>Total Copies</th><th>Available</th><th>Utilization</th></tr></thead>
          <tbody>${categories.map(c => {
            const catBooks = books.filter(b => b.category === c.name);
            const catTotal = catBooks.reduce((s, b) => s + (b.totalCopies || 0), 0);
            const catAvail = catBooks.reduce((s, b) => s + (b.availableCopies || 0), 0);
            const util = catTotal > 0 ? Math.round((catTotal - catAvail) / catTotal * 100) : 0;
            return `<tr>
              <td><span class="badge badge-info">${Utils.escapeHtml(c.name)}</span></td>
              <td>${catBooks.length}</td>
              <td>${catTotal}</td>
              <td>${catAvail}</td>
              <td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden;"><div style="width:${util}%;height:100%;background:${util > 80 ? 'var(--danger)' : util > 50 ? 'var(--warning)' : 'var(--success)'};border-radius:3px;"></div></div><small>${util}%</small></div></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
  },

  renderFineReport() {
    const allWithFines = AppState.borrowRequests.filter(r => r.fine > 0);
    const totalFines = allWithFines.reduce((s, r) => s + r.fine, 0);
    const paidFines = AppState.finePayments.reduce((s, p) => s + (p.amount || 0), 0);

    return `
      <div class="grid-3" style="margin-bottom:2rem;">
        <div class="stat-card"><div class="stat-icon red">${Utils.getIcon('alert-circle', 24)}</div><div class="stat-info"><span class="stat-value">Rs. ${totalFines}</span><span class="stat-label">Total Fines</span></div></div>
        <div class="stat-card"><div class="stat-icon green">${Utils.getIcon('check-circle', 24)}</div><div class="stat-info"><span class="stat-value">Rs. ${paidFines}</span><span class="stat-label">Fines Paid</span></div></div>
        <div class="stat-card"><div class="stat-icon orange">${Utils.getIcon('clock', 24)}</div><div class="stat-info"><span class="stat-value">Rs. ${totalFines - paidFines}</span><span class="stat-label">Outstanding</span></div></div>
      </div>
      <div class="card">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Fine Details</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Student</th><th>Book</th><th>Borrow ID</th><th>Fine Amount</th><th>Days Late</th><th>Status</th></tr></thead>
          <tbody>${allWithFines.slice(-30).reverse().map(r => {
            const daysLate = Math.ceil((new Date(r.returnDate || new Date()) - new Date(r.expectedReturnDate)) / 86400000);
            return `<tr>
              <td>${Utils.escapeHtml(r.studentName)}</td>
              <td>${Utils.escapeHtml(r.bookTitle)}</td>
              <td class="mono" style="font-size:0.8rem;">${r.id}</td>
              <td style="font-weight:600;color:var(--danger);">Rs. ${r.fine}</td>
              <td>${Math.max(0, daysLate)} days</td>
              <td>${r.status === 'returned' ? '<span class="badge badge-success">Returned</span>' : '<span class="badge badge-danger">Outstanding</span>'}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">No fines recorded</td></tr>'}</tbody>
        </table></div>
      </div>`;
  },

  renderPopularReport() {
    const popular = [...(AppState.books || [])].sort((a, b) => (b.borrowCount || 0) - (a.borrowCount || 0)).slice(0, 20);

    return `
      <div class="grid-2" style="margin-bottom:2rem;">
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Most Borrowed</h3><canvas id="report-popular-borrow" height="300"></canvas></div>
        <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Top Rated</h3><canvas id="report-popular-rated" height="300"></canvas></div>
      </div>
      <div class="card">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Most Borrowed Books</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>#</th><th>Book</th><th>Category</th><th>Rating</th><th>Borrows</th><th>Available</th></tr></thead>
          <tbody>${popular.map((b, i) => `
            <tr>
              <td style="font-weight:700;color:var(--primary);">${i + 1}</td>
              <td><strong>${Utils.escapeHtml(b.title)}</strong><br><small style="color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</small></td>
              <td><span class="badge badge-info">${Utils.escapeHtml(b.category || '')}</span></td>
              <td><span style="color:var(--warning);">${Utils.getIcon('star', 14)} ${(b.rating || 0).toFixed(1)}</span></td>
              <td style="font-weight:600;">${b.borrowCount || 0}</td>
              <td><span class="badge badge-${b.availableCopies > 0 ? 'success' : 'danger'}">${b.availableCopies || 0}</span></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  },

  renderStudentReport() {
    const students = LIBRARY_DATA.students || [];
    const studentBorrows = students.map(s => {
      const borrows = AppState.borrowRequests.filter(r => r.studentId === s.id);
      const active = borrows.filter(r => r.status === 'borrowed' || r.status === 'overdue').length;
      const total = borrows.length;
      const fines = borrows.reduce((sum, r) => sum + (r.fine || 0), 0);
      return { ...s, active, total, fines };
    }).sort((a, b) => b.total - a.total);

    return `
      <div class="card" style="margin-bottom:2rem;">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Student Activity Report</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Student</th><th>Grade</th><th>Total Borrows</th><th>Active</th><th>Fines</th><th>Reading Streak</th></tr></thead>
          <tbody>${studentBorrows.map(s => `
            <tr>
              <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar-sm" style="width:32px;height:32px;font-size:0.65rem;">${s.avatar}</div><strong>${Utils.escapeHtml(s.name)}</strong></div></td>
              <td>${Utils.escapeHtml(s.grade || '?')}</td>
              <td>${s.total}</td>
              <td><span class="badge badge-${s.active > 0 ? 'primary' : 'success'}">${s.active}</span></td>
              <td>${s.fines > 0 ? '<span style="color:var(--danger);">Rs. ' + s.fines + '</span>' : '-'}</td>
              <td><span style="color:var(--warning);">${Utils.getIcon('flame', 14)} ${s.readingStreak || 0} days</span></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
      <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Top Readers</h3><canvas id="report-student-top" height="200"></canvas></div>`;
  },

  renderTeacherReport() {
    const teachers = LIBRARY_DATA.teachers || [];
    const teacherBorrows = teachers.map(t => {
      const borrows = AppState.borrowRequests.filter(r => r.studentId === t.id);
      const active = borrows.filter(r => r.status === 'borrowed' || r.status === 'overdue').length;
      const total = borrows.length;
      return { ...t, active, total };
    }).sort((a, b) => b.total - a.total);

    return `
      <div class="card" style="margin-bottom:2rem;">
        <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Teacher Activity Report</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Teacher</th><th>Department</th><th>Total Borrows</th><th>Active</th></tr></thead>
          <tbody>${teacherBorrows.map(t => `
            <tr>
              <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar-sm" style="width:32px;height:32px;font-size:0.65rem;">${t.avatar}</div><strong>${Utils.escapeHtml(t.name)}</strong></div></td>
              <td>${Utils.escapeHtml(t.department || 'N/A')}</td>
              <td>${t.total}</td>
              <td><span class="badge badge-${t.active > 0 ? 'primary' : 'success'}">${t.active}</span></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
      <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Borrows by Department</h3><canvas id="report-teacher-dept" height="200"></canvas></div>`;
  },

  _filterByDate(arr) {
    if (!this.dateFrom && !this.dateTo) return arr;
    return arr.filter(r => {
      const d = r.borrowDate || r.requestTime;
      if (!d) return true;
      const date = d.length > 10 ? d.substring(0, 10) : d;
      if (this.dateFrom && date < this.dateFrom) return false;
      if (this.dateTo && date > this.dateTo) return false;
      return true;
    });
  },

  switchReport(id) { this.activeReport = id; this.refresh(); },
  refresh() { Router.resolve(); },

  afterRender() {
    const monthly = LIBRARY_DATA.monthlyStats || [];
    const borrowCanvas = document.getElementById('report-borrow-trend');
    if (borrowCanvas && Charts && Charts.line) {
      Charts.line(borrowCanvas, monthly.map(m => ({ label: m.month, value: m.borrowed || 0 })));
    }
    const catCanvas = document.getElementById('report-category-chart');
    if (catCanvas && Charts && Charts.bar) {
      const cats = LIBRARY_DATA.categories || [];
      const colors = ['#4f46e5','#22c55e','#ef4444','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#a855f7','#0ea5e9'];
      Charts.bar(catCanvas, cats.map((c, i) => ({ label: c.name || c, value: c.borrowCount || c.count || Math.floor(Math.random() * 40) + 5, color: colors[i % 10] })));
    }
    const statusCanvas = document.getElementById('report-status-chart');
    if (statusCanvas && Charts && Charts.doughnut) {
      const stats = LIBRARY_DATA.stats || {};
      Charts.doughnut(statusCanvas, [
        { value: stats.availableBooks || 200, color: '#22c55e' },
        { value: stats.borrowedBooks || 80, color: '#4f46e5' },
        { value: stats.overdueBooks || 12, color: '#ef4444' },
        { value: stats.reservedBooks || 8, color: '#f59e0b' }
      ], '');
    }
    const borrowStatusCanvas = document.getElementById('report-borrow-status');
    if (borrowStatusCanvas && Charts && Charts.doughnut) {
      const borrows = this._filterByDate(AppState.borrowRequests);
      const byStatus = {};
      borrows.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      const statusColors = { pending: '#f59e0b', approved: '#06b6d4', borrowed: '#4f46e5', overdue: '#ef4444', returned: '#22c55e', rejected: '#6b7280' };
      Charts.doughnut(borrowStatusCanvas, Object.entries(byStatus).map(([k, v]) => ({ value: v, color: statusColors[k] || '#8b5cf6' })), '');
    }
    const borrowTimeCanvas = document.getElementById('report-borrow-over-time');
    if (borrowTimeCanvas && Charts && Charts.line) {
      Charts.line(borrowTimeCanvas, monthly.map(m => ({ label: m.month, value: m.borrowed || 0 })));
    }
    const popularBorrowCanvas = document.getElementById('report-popular-borrow');
    if (popularBorrowCanvas && Charts && Charts.bar) {
      const popular = [...(AppState.books || [])].sort((a, b) => (b.borrowCount || 0) - (a.borrowCount || 0)).slice(0, 10);
      Charts.bar(popularBorrowCanvas, popular.map((b, i) => ({ label: b.title.substring(0, 20), value: b.borrowCount || 0, color: ['#4f46e5','#22c55e','#ef4444','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#a855f7','#0ea5e9'][i % 10] })));
    }
    const popularRatedCanvas = document.getElementById('report-popular-rated');
    if (popularRatedCanvas && Charts && Charts.bar) {
      const topRated = [...(AppState.books || [])].filter(b => b.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 10);
      Charts.bar(popularRatedCanvas, topRated.map((b, i) => ({ label: b.title.substring(0, 20), value: b.rating || 0, color: '#f59e0b' })));
    }
    const invCatCanvas = document.getElementById('report-inventory-cat');
    if (invCatCanvas && Charts && Charts.bar) {
      const cats = LIBRARY_DATA.categories || [];
      const books = AppState.books || [];
      const colors = ['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#14b8a6','#06b6d4','#ec4899','#0ea5e9','#a855f7'];
      Charts.bar(invCatCanvas, cats.map((c, i) => ({ label: c.name, value: books.filter(b => b.category === c.name).reduce((s, b) => s + (b.totalCopies || 0), 0), color: colors[i % 10] })));
    }
    const invAvailCanvas = document.getElementById('report-inventory-avail');
    if (invAvailCanvas && Charts && Charts.doughnut) {
      const books = AppState.books || [];
      const avail = books.reduce((s, b) => s + (b.availableCopies || 0), 0);
      const borrowed = books.reduce((s, b) => s + (b.totalCopies || 0), 0) - avail;
      Charts.doughnut(invAvailCanvas, [{ value: avail || 1, color: '#22c55e' }, { value: borrowed || 1, color: '#4f46e5' }], '');
    }
    const studentTopCanvas = document.getElementById('report-student-top');
    if (studentTopCanvas && Charts && Charts.bar) {
      const students = LIBRARY_DATA.students || [];
      const top = students.sort((a, b) => (b.borrowCount || 0) - (a.borrowCount || 0)).slice(0, 8);
      Charts.bar(studentTopCanvas, top.map((s, i) => ({ label: s.name.split(' ')[0], value: s.borrowCount || 0, color: ['#4f46e5','#22c55e','#ef4444','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6'][i % 8] })));
    }
    const teacherDeptCanvas = document.getElementById('report-teacher-dept');
    if (teacherDeptCanvas && Charts && Charts.bar) {
      const teachers = LIBRARY_DATA.teachers || [];
      const depts = {};
      teachers.forEach(t => { depts[t.department] = (depts[t.department] || 0) + 1; });
      const colors = ['#4f46e5','#22c55e','#ef4444','#f59e0b','#8b5cf6'];
      Charts.bar(teacherDeptCanvas, Object.entries(depts).map(([k, v], i) => ({ label: k, value: v, color: colors[i % 5] })));
    }
    const resStatusCanvas = document.getElementById('report-res-status');
    if (resStatusCanvas && Charts && Charts.doughnut) {
      const reservations = AppState.reservations || [];
      const byStatus = {};
      reservations.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });
      Charts.doughnut(resStatusCanvas, Object.entries(byStatus).map(([k, v]) => ({ value: v, color: k === 'waiting' ? '#f59e0b' : k === 'cancelled' ? '#ef4444' : '#22c55e' })), '');
    }
  },

  exportPDF() {
    window.print();
    Toast.success('PDF export opened');
  },

  exportCSV() {
    const monthly = LIBRARY_DATA.monthlyStats || [];
    let csv = 'Month,Borrowed,Returned,Overdue,New Members\n';
    monthly.forEach(m => { csv += `${m.month || ''},${m.borrowed || 0},${m.returned || 0},${m.overdue || 0},${m.newMembers || m.newStudents || 0}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('CSV exported successfully');
  },

  exportExcel() {
    const monthly = LIBRARY_DATA.monthlyStats || [];
    let csv = 'Month,Borrowed,Returned,Overdue,New Members\n';
    monthly.forEach(m => { csv += `${m.month || ''},${m.borrowed || 0},${m.returned || 0},${m.overdue || 0},${m.newMembers || m.newStudents || 0}\n`; });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library-report-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Excel exported successfully');
  }
};
