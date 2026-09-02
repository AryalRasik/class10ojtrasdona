const DashboardPage = {
    render() {
        const role = AppState.currentUser ? AppState.currentUser.role : 'student';
        const isAdmin = role === 'admin' || role === 'librarian';
        const isStudent = role === 'student';
        const isTeacher = role === 'teacher';

        if (isAdmin) return this.renderAdminDashboard();
        if (isTeacher) return this.renderTeacherDashboard();
        return this.renderStudentDashboard();
    },

    renderAdminDashboard() {
        const stats = LIBRARY_DATA.stats || {};
        const pending = AppState.getAllPendingRequests();
        const active = AppState.getAllActiveBorrows();
        const allReturned = (AppState.borrowRequests || []).filter(r => r.status === 'returned');
        const allOverdue = (AppState.borrowRequests || []).filter(r => r.status === 'overdue');
        const totalFines = (AppState.borrowRequests || []).reduce((s, r) => s + (r.fine || 0), 0);
        const recentBorrows = [...(AppState.borrowRequests || [])].slice(-10).reverse();
        const reservations = (AppState.reservations || []).filter(r => r.status === 'waiting');
        const studentCount = (LIBRARY_DATA.students || []).length;
        const teacherCount = (LIBRARY_DATA.teachers || []).length;
        const totalBooks = (AppState.books || []).length;
        const mostBorrowed = [...(AppState.books || [])].sort((a, b) => (b.borrowCount || 0) - (a.borrowCount || 0)).slice(0, 5);
        const categories = LIBRARY_DATA.categories || [];

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getGreeting()}, ${Utils.escapeHtml((AppState.currentUser && AppState.currentUser.name) || 'Admin')}</h1>
          <p class="page-description">Library Management Dashboard</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="grid-3" style="margin-bottom:1.5rem;">
          <div class="stat-card"><div class="stat-icon blue">${Utils.getIcon('book-open', 24)}</div><div class="stat-info"><span class="stat-value">${totalBooks}</span><span class="stat-label">Total Books</span></div></div>
          <div class="stat-card"><div class="stat-icon indigo">${Utils.getIcon('book-open', 24)}</div><div class="stat-info"><span class="stat-value">${active.length}</span><span class="stat-label">Currently Borrowed</span></div></div>
          <div class="stat-card"><div class="stat-icon orange">${Utils.getIcon('clock', 24)}</div><div class="stat-info"><span class="stat-value">${pending.length}</span><span class="stat-label">Pending Requests</span></div></div>
        </div>
        <div class="grid-3" style="margin-bottom:1.5rem;">
          <div class="stat-card"><div class="stat-icon green">${Utils.getIcon('check-circle', 24)}</div><div class="stat-info"><span class="stat-value">${allReturned.length}</span><span class="stat-label">Books Returned</span></div></div>
          <div class="stat-card"><div class="stat-icon red">${Utils.getIcon('alert-triangle', 24)}</div><div class="stat-info"><span class="stat-value">${allOverdue.length}</span><span class="stat-label">Overdue</span></div></div>
          <div class="stat-card"><div class="stat-icon pink">${Utils.getIcon('users', 24)}</div><div class="stat-info"><span class="stat-value">${studentCount}</span><span class="stat-label">Students</span></div></div>
        </div>
        <div class="grid-3" style="margin-bottom:2rem;">
          <div class="stat-card"><div class="stat-icon teal">${Utils.getIcon('briefcase', 24)}</div><div class="stat-info"><span class="stat-value">${teacherCount}</span><span class="stat-label">Teachers</span></div></div>
          <div class="stat-card"><div class="stat-icon yellow">${Utils.getIcon('bookmark', 24)}</div><div class="stat-info"><span class="stat-value">${reservations.length}</span><span class="stat-label">Reservations</span></div></div>
          <div class="stat-card"><div class="stat-icon red">${Utils.getIcon('alert-circle', 24)}</div><div class="stat-info"><span class="stat-value">${totalFines > 0 ? 'Rs. ' + totalFines : 'None'}</span><span class="stat-label">Total Fines</span></div></div>
        </div>

        <div class="card" style="margin-bottom:2rem;">
          <div class="card-header-flex">
            <h3 style="margin:0;">Pending Borrow Requests</h3>
            <span class="badge badge-warning">${pending.length} pending</span>
          </div>
          ${pending.length ? `
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Book</th><th>Borrow ID</th><th>Time</th><th>Actions</th></tr></thead><tbody>${pending.map(r => {
            const student = LIBRARY_DATA.students.find(s => s.id === r.studentId);
            return `<tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="avatar-sm" style="width:32px;height:32px;font-size:0.65rem;">${student ? student.avatar : '??'}</div>
                  <span>${Utils.escapeHtml(r.studentName)}</span>
                </div>
              </td>
              <td><strong>${Utils.escapeHtml(r.bookTitle)}</strong></td>
              <td class="mono" style="font-size:0.8rem;">${r.id}</td>
              <td>${Utils.formatDate(r.borrowDate)}</td>
              <td>
                <div style="display:flex;gap:4px;">
                  <button class="btn btn-success btn-sm" onclick="DashboardPage.approveRequest('${r.id}')">Approve</button>
                  <button class="btn btn-danger btn-sm" onclick="DashboardPage.rejectRequest('${r.id}')">Reject</button>
                  <button class="btn btn-ghost btn-sm" onclick="DashboardPage.viewRequestDetails('${r.id}')">Details</button>
                </div>
              </td>
            </tr>`;
          }).join('')}</tbody></table></div>` : '<div style="padding:32px;text-align:center;color:var(--text-secondary);">No pending requests</div>'}
        </div>

        <div class="grid-2" style="margin-bottom:2rem;">
          <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Monthly Borrows</h3><canvas id="dash-line-chart" height="220"></canvas></div>
          <div class="card" style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Book Status</h3><canvas id="dash-doughnut-chart" height="220"></canvas></div>
        </div>

        <div class="grid-2" style="margin-bottom:2rem;">
          <div class="card">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
              <h3 style="margin:0;">Recent Activity</h3>
            </div>
            <div style="padding:1rem 1.5rem;">
              ${recentBorrows.map(r => {
                const statusColors = { pending: 'var(--warning)', approved: 'var(--info)', borrowed: 'var(--primary)', overdue: 'var(--danger)', returned: 'var(--success)', rejected: 'var(--danger)' };
                const color = statusColors[r.status] || 'var(--text-tertiary)';
                const icons = { pending: 'clock', approved: 'check-circle', borrowed: 'book-open', overdue: 'alert-triangle', returned: 'check-circle', rejected: 'x-circle' };
                return `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);align-items:center;">
                  <div style="width:32px;height:32px;border-radius:50%;background:${color}15;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon(icons[r.status] || 'bell', 14)}</div>
                  <div style="flex:1;min-width:0;"><p style="margin:0;font-size:0.85rem;">${Utils.escapeHtml(r.studentName)} — ${Utils.escapeHtml(r.bookTitle)}</p><small style="color:var(--text-secondary);">${r.id} · ${Utils.formatDate(r.borrowDate)}</small></div>
                  <span class="badge badge-${r.status === 'returned' ? 'success' : r.status === 'overdue' ? 'danger' : r.status === 'pending' ? 'warning' : r.status === 'rejected' ? 'danger' : 'primary'}" style="font-size:0.7rem;">${r.status}</span>
                  ${(r.status === 'borrowed' || r.status === 'overdue') ? `<button class="btn btn-success btn-sm" onclick="DashboardPage.markReturned('${r.id}')" title="Confirm returned">${Utils.getIcon('corner-down-left', 13)} Returned</button>` : ''}
                </div>`;
              }).join('') || '<p style="color:var(--text-secondary);text-align:center;padding:1rem;">No recent activity</p>'}
            </div>
          </div>
          <div>
            <div class="card" style="margin-bottom:1rem;">
              <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Quick Actions</h3></div>
              <div style="padding:1rem 1.5rem;">
                <a href="#/admin/offline-issue" data-nav class="btn btn-primary" style="justify-content:center;width:100%;margin-bottom:0.75rem;padding:0.7rem;">${Utils.getIcon('book-plus', 17)} Offline Book Issue</a>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                  <a href="#/admin/books" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('plus', 16)} Add Book</a>
                  <a href="#/admin/users" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('user-plus', 16)} Add User</a>
                  <a href="#/admin/reports" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('bar-chart', 16)} Reports</a>
                  <a href="#/physical-reservation" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('bookmark', 16)} Reserve</a>
                  <a href="#/book-return" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('rotate-ccw', 16)} Returns</a>
                  <a href="#/admin/settings" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('settings', 16)} Settings</a>
                </div>
              </div>
            </div>
            <div class="card">
              <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Most Borrowed Books</h3></div>
              <div style="padding:0.5rem 1.5rem;">
                ${mostBorrowed.map((b, i) => `
                  <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < mostBorrowed.length - 1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
                    <span style="width:24px;height:24px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;">${i + 1}</span>
                    <div style="flex:1;min-width:0;"><p style="margin:0;font-size:0.85rem;font-weight:500;">${Utils.escapeHtml(b.title)}</p><small style="color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</small></div>
                    <span class="badge badge-info" style="font-size:0.7rem;">${b.borrowCount || 0} borrows</span>
                  </div>
                `).join('') || '<p style="color:var(--text-secondary);text-align:center;padding:1rem;">No data</p>'}
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:2rem;">
          <div style="padding:1.5rem;"><h3 style="margin:0 0 1rem;">Popular Categories</h3><canvas id="dash-categories-chart" height="200"></canvas></div>
        </div>
      </div>`;
    },

    renderStudentDashboard() {
        const user = AppState.currentUser;
        const myActive = AppState.getMyActiveBorrows();
        const myPending = AppState.getMyPendingRequests();
        const fines = AppState.getMyTotalFine();
        const streak = AppState.readingStreak || user.readingStreak || 0;
        const dueSoon = AppState.getDueSoon(3);
        const maxBorrow = AppState.getMaxBorrowLimit();
        const loanPeriod = AppState.getLoanPeriod();

        const userFavCategories = [];
        myActive.forEach(r => {
            const book = AppState.books.find(b => b.id === r.bookId);
            if (book && book.category && !userFavCategories.includes(book.category)) userFavCategories.push(book.category);
        });
        const recommendations = AppState.books.filter(b =>
            b.availableCopies > 0 &&
            (userFavCategories.length === 0 || userFavCategories.includes(b.category)) &&
            !myActive.find(r => r.bookId === b.id)
        ).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getGreeting()}, ${Utils.escapeHtml(user ? user.name : 'Student')}!</h1>
          <p class="page-description">Welcome to your library dashboard</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="grid-4" style="margin-bottom:2rem;">
          <div class="stat-card"><div class="stat-icon blue">${Utils.getIcon('book-open', 24)}</div><div class="stat-info"><span class="stat-value">${myActive.length} / ${maxBorrow}</span><span class="stat-label">Active Borrows</span></div></div>
          <div class="stat-card"><div class="stat-icon orange">${Utils.getIcon('clock', 24)}</div><div class="stat-info"><span class="stat-value">${myPending.length}</span><span class="stat-label">Pending Requests</span></div></div>
          <div class="stat-card"><div class="stat-icon red">${Utils.getIcon('alert-circle', 24)}</div><div class="stat-info"><span class="stat-value">${fines > 0 ? 'Rs. ' + fines : 'None'}</span><span class="stat-label">Fine Balance</span></div></div>
          <div class="stat-card"><div class="stat-icon green">${Utils.getIcon('flame', 24)}</div><div class="stat-info"><span class="stat-value">${streak}</span><span class="stat-label">Reading Streak</span></div></div>
        </div>

        ${dueSoon.length > 0 ? `
        <div class="card" style="margin-bottom:2rem;border-left:4px solid var(--warning);">
          <div style="padding:1rem 1.5rem;">
            <h3 style="margin:0 0 0.75rem;color:var(--warning);">${Utils.getIcon('alert-triangle', 18)} Due Soon (${dueSoon.length} book${dueSoon.length > 1 ? 's' : ''})</h3>
            ${dueSoon.map(r => {
              const due = new Date(r.expectedReturnDate);
              const now = new Date();
              const daysLeft = Math.ceil((due - now) / 86400000);
              return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                <div style="flex:1;"><strong>${Utils.escapeHtml(r.bookTitle)}</strong><br><small style="color:var(--text-secondary);">Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — ${Utils.formatDate(r.expectedReturnDate)}</small></div>
                <a href="#/my-books" data-nav class="btn btn-sm btn-outline">View</a>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        ${myActive.length > 0 ? `
        <div class="card" style="margin-bottom:2rem;">
          <div class="card-header-flex">
            <h3 style="margin:0;">Currently Borrowed</h3>
            <a href="#/my-books" data-nav class="btn btn-sm btn-outline">View All</a>
          </div>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Book</th><th>Borrowed</th><th>Due Date</th><th>Status</th></tr></thead><tbody>
            ${myActive.map(r => {
              const book = AppState.books.find(b => b.id === r.bookId);
              const due = new Date(r.expectedReturnDate);
              const now = new Date();
              const daysLeft = Math.ceil((due - now) / 86400000);
              const statusBadge = r.status === 'overdue' ? '<span class="badge badge-danger">Overdue</span>' : daysLeft <= 3 ? `<span class="badge badge-warning">${daysLeft}d left</span>` : '<span class="badge badge-primary">Active</span>';
              return `<tr>
                <td><div style="display:flex;align-items:center;gap:0.75rem;"><div style="width:36px;height:50px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div><strong>${Utils.escapeHtml(r.bookTitle)}</strong></div></td>
                <td>${Utils.formatDate(r.borrowDate)}</td>
                <td>${Utils.formatDate(r.expectedReturnDate)}</td>
                <td>${statusBadge}</td>
              </tr>`;
            }).join('')}
          </tbody></table></div>
        </div>` : `
        <div class="card" style="margin-bottom:2rem;text-align:center;padding:3rem;">
          <div style="color:var(--text-secondary);">${Utils.getIcon('book-open', 48)}</div>
          <h3 style="margin:1rem 0 0.5rem;">No Active Borrows</h3>
          <p style="color:var(--text-secondary);margin:0 0 1rem;">You haven't borrowed any books yet.</p>
          <a href="#/books" data-nav class="btn btn-primary">${Utils.getIcon('search', 16)} Browse Books</a>
        </div>`}

        ${recommendations.length > 0 ? `
        <div class="card" style="margin-bottom:2rem;">
          <div class="card-header-flex">
            <h3 style="margin:0;">Recommended For You</h3>
            <a href="#/books" data-nav class="btn btn-sm btn-outline">Browse All</a>
          </div>
          <div style="padding:1rem 1.5rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">
            ${recommendations.map(b => `
              <a href="#/book/${b.id}" data-nav style="text-decoration:none;color:inherit;">
                <div style="border:1px solid var(--border);border-radius:8px;padding:1rem;text-align:center;">
                  <div style="width:60px;height:84px;margin:0 auto 0.75rem;">${Utils.getBookCover(b)}</div>
                  <strong style="font-size:0.85rem;">${Utils.escapeHtml(b.title)}</strong><br>
                  <small style="color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</small><br>
                  <span style="color:var(--warning);font-size:0.8rem;">${Utils.getIcon('star', 12)} ${(b.rating || 0).toFixed(1)}</span>
                </div>
              </a>
            `).join('')}
          </div>
        </div>` : ''}

        <div class="grid-2">
          <div class="card">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Quick Actions</h3></div>
            <div style="padding:1rem 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              <a href="#/books" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('search', 16)} Browse Books</a>
              <a href="#/my-books" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('bookmark', 16)} My Books</a>
              <a href="#/borrow-history" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('clock', 16)} History</a>
              <a href="#/reservations" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('calendar', 16)} Reservations</a>
              <a href="#/digital-library" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('download', 16)} Digital Library</a>
              <a href="#/profile" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('user', 16)} Profile</a>
            </div>
          </div>
          <div class="card">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">My Borrow Info</h3></div>
            <div style="padding:1.5rem;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div><small style="color:var(--text-tertiary);">Borrow Limit</small><p style="margin:2px 0;font-weight:600;">${maxBorrow} books</p></div>
                <div><small style="color:var(--text-tertiary);">Loan Period</small><p style="margin:2px 0;font-weight:600;">${loanPeriod} days</p></div>
                <div><small style="color:var(--text-tertiary);">Active Borrows</small><p style="margin:2px 0;font-weight:600;">${myActive.length}</p></div>
                <div><small style="color:var(--text-tertiary);">Reading Streak</small><p style="margin:2px 0;font-weight:600;">${streak} days</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    },

    renderTeacherDashboard() {
        const user = AppState.currentUser;
        const myActive = AppState.getMyActiveBorrows();
        const myPending = AppState.getMyPendingRequests();
        const fines = AppState.getMyTotalFine();
        const streak = AppState.readingStreak || user.readingStreak || 0;
        const dueSoon = AppState.getDueSoon(3);
        const maxBorrow = AppState.getMaxBorrowLimit();
        const loanPeriod = AppState.getLoanPeriod();
        const department = user.department || 'General';

        const deptBooks = AppState.books.filter(b => {
            if (!department || department === 'General') return true;
            const cat = (b.category || '').toLowerCase();
            const dept = department.toLowerCase();
            return cat.includes(dept) || (dept === 'science' && (cat.includes('science') || cat.includes('natural'))) || (dept === 'english' && cat.includes('english')) || (dept === 'nepali' && cat.includes('nepali')) || (dept === 'mathematics' && cat.includes('math'));
        }).slice(0, 5);

        const myActiveFull = myActive.map(r => {
            const book = AppState.books.find(b => b.id === r.bookId);
            return { ...r, book };
        });

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getGreeting()}, ${Utils.escapeHtml(user ? user.name : 'Teacher')}!</h1>
          <p class="page-description">Department: ${Utils.escapeHtml(department)}</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="grid-4" style="margin-bottom:2rem;">
          <div class="stat-card"><div class="stat-icon blue">${Utils.getIcon('book-open', 24)}</div><div class="stat-info"><span class="stat-value">${myActive.length} / ${maxBorrow}</span><span class="stat-label">Active Borrows</span></div></div>
          <div class="stat-card"><div class="stat-icon orange">${Utils.getIcon('clock', 24)}</div><div class="stat-info"><span class="stat-value">${myPending.length}</span><span class="stat-label">Pending Requests</span></div></div>
          <div class="stat-card"><div class="stat-icon red">${Utils.getIcon('alert-circle', 24)}</div><div class="stat-info"><span class="stat-value">${fines > 0 ? 'Rs. ' + fines : 'None'}</span><span class="stat-label">Fine Balance</span></div></div>
          <div class="stat-card"><div class="stat-icon green">${Utils.getIcon('flame', 24)}</div><div class="stat-info"><span class="stat-value">${streak}</span><span class="stat-label">Reading Streak</span></div></div>
        </div>

        ${dueSoon.length > 0 ? `
        <div class="card" style="margin-bottom:2rem;border-left:4px solid var(--warning);">
          <div style="padding:1rem 1.5rem;">
            <h3 style="margin:0 0 0.75rem;color:var(--warning);">${Utils.getIcon('alert-triangle', 18)} Due Soon (${dueSoon.length})</h3>
            ${dueSoon.map(r => {
              const due = new Date(r.expectedReturnDate);
              const now = new Date();
              const daysLeft = Math.ceil((due - now) / 86400000);
              return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
                <div style="flex:1;"><strong>${Utils.escapeHtml(r.bookTitle)}</strong><br><small style="color:var(--text-secondary);">Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</small></div>
                <a href="#/my-books" data-nav class="btn btn-sm btn-outline">View</a>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        ${myActiveFull.length > 0 ? `
        <div class="card" style="margin-bottom:2rem;">
          <div class="card-header-flex">
            <h3 style="margin:0;">Currently Borrowed</h3>
            <a href="#/my-books" data-nav class="btn btn-sm btn-outline">View All</a>
          </div>
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Book</th><th>Borrowed</th><th>Due Date</th><th>Status</th></tr></thead><tbody>
            ${myActiveFull.map(r => {
              const due = new Date(r.expectedReturnDate);
              const now = new Date();
              const daysLeft = Math.ceil((due - now) / 86400000);
              const statusBadge = r.status === 'overdue' ? '<span class="badge badge-danger">Overdue</span>' : daysLeft <= 3 ? `<span class="badge badge-warning">${daysLeft}d left</span>` : '<span class="badge badge-primary">Active</span>';
              return `<tr>
                <td><div style="display:flex;align-items:center;gap:0.75rem;">${r.book ? `<div style="width:36px;height:50px;flex-shrink:0;">${Utils.getBookCover(r.book)}</div>` : ''}<strong>${Utils.escapeHtml(r.bookTitle)}</strong></div></td>
                <td>${Utils.formatDate(r.borrowDate)}</td>
                <td>${Utils.formatDate(r.expectedReturnDate)}</td>
                <td>${statusBadge}</td>
              </tr>`;
            }).join('')}
          </tbody></table></div>
        </div>` : `
        <div class="card" style="margin-bottom:2rem;text-align:center;padding:3rem;">
          <div style="color:var(--text-secondary);">${Utils.getIcon('book-open', 48)}</div>
          <h3 style="margin:1rem 0 0.5rem;">No Active Borrows</h3>
          <p style="color:var(--text-secondary);margin:0 0 1rem;">You haven't borrowed any books yet.</p>
          <a href="#/books" data-nav class="btn btn-primary">${Utils.getIcon('search', 16)} Browse Books</a>
        </div>`}

        ${deptBooks.length > 0 ? `
        <div class="card" style="margin-bottom:2rem;">
          <div class="card-header-flex">
            <h3 style="margin:0;">${Utils.escapeHtml(department)} Books</h3>
            <a href="#/books" data-nav class="btn btn-sm btn-outline">Browse All</a>
          </div>
          <div style="padding:1rem 1.5rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">
            ${deptBooks.map(b => `
              <a href="#/book/${b.id}" data-nav style="text-decoration:none;color:inherit;">
                <div style="border:1px solid var(--border);border-radius:8px;padding:1rem;text-align:center;">
                  <div style="width:60px;height:84px;margin:0 auto 0.75rem;">${Utils.getBookCover(b)}</div>
                  <strong style="font-size:0.85rem;">${Utils.escapeHtml(b.title)}</strong><br>
                  <small style="color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</small><br>
                  <span class="badge badge-${b.availableCopies > 0 ? 'success' : 'danger'}" style="margin-top:4px;">${b.availableCopies > 0 ? 'Available' : 'Unavailable'}</span>
                </div>
              </a>
            `).join('')}
          </div>
        </div>` : ''}

        <div class="grid-2">
          <div class="card">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">Quick Actions</h3></div>
            <div style="padding:1rem 1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              <a href="#/books" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('search', 16)} Browse Books</a>
              <a href="#/my-books" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('bookmark', 16)} My Books</a>
              <a href="#/borrow-history" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('clock', 16)} History</a>
              <a href="#/reservations" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('calendar', 16)} Reservations</a>
              <a href="#/digital-library" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('download', 16)} Digital Library</a>
              <a href="#/profile" data-nav class="btn btn-outline" style="justify-content:center;">${Utils.getIcon('user', 16)} Profile</a>
            </div>
          </div>
          <div class="card">
            <div style="padding:1rem 1.5rem;border-bottom:1px solid var(--border);"><h3 style="margin:0;">My Borrow Info</h3></div>
            <div style="padding:1.5rem;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div><small style="color:var(--text-tertiary);">Borrow Limit</small><p style="margin:2px 0;font-weight:600;">${maxBorrow} books</p></div>
                <div><small style="color:var(--text-tertiary);">Loan Period</small><p style="margin:2px 0;font-weight:600;">${loanPeriod} days</p></div>
                <div><small style="color:var(--text-tertiary);">Active Borrows</small><p style="margin:2px 0;font-weight:600;">${myActive.length}</p></div>
                <div><small style="color:var(--text-tertiary);">Department</small><p style="margin:2px 0;font-weight:600;">${Utils.escapeHtml(department)}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    },

    afterRender() {
        const monthly = LIBRARY_DATA.monthlyStats || [];
        const lineCanvas = document.getElementById('dash-line-chart');
        if (lineCanvas && Charts && Charts.line) {
            Charts.line(lineCanvas, monthly.map(m => ({ label: m.month, value: m.borrowed || m.booksRead || 0 })));
        }
        const doughnutCanvas = document.getElementById('dash-doughnut-chart');
        if (doughnutCanvas && Charts && Charts.doughnut) {
            const activeCount = AppState.getAllActiveBorrows().length;
            const returnedCount = AppState.borrowRequests.filter(r => r.status === 'returned').length;
            const overdueCount = AppState.borrowRequests.filter(r => r.status === 'overdue').length;
            const pendingCount = AppState.getAllPendingRequests().length;
            Charts.doughnut(doughnutCanvas, [
                { value: activeCount || 1, color: '#4f46e5' },
                { value: returnedCount || 1, color: '#22c55e' },
                { value: overdueCount || 1, color: '#ef4444' },
                { value: pendingCount || 1, color: '#f59e0b' }
            ], `${AppState.borrowRequests.length}`);
        }
        const catCanvas = document.getElementById('dash-categories-chart');
        if (catCanvas && Charts && Charts.bar) {
            const cats = LIBRARY_DATA.categories || [];
            const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#14b8a6', '#06b6d4', '#ec4899', '#0ea5e9', '#a855f7'];
            Charts.bar(catCanvas, cats.map((c, i) => ({ label: c.name || c, value: c.count || c.borrowCount || Math.floor(Math.random() * 30) + 5, color: colors[i % colors.length] })));
        }
        if (Animations && Animations.initCounters) Animations.initCounters();
    },

    approveRequest(requestId) {
        Modal.confirm('Approve Request', 'Approve this borrow request? The student will be notified.', () => {
            if (AppState.approveBorrowRequest(requestId, AppState.currentUser?.name || 'Librarian')) {
                Toast.success('Request approved!');
                setTimeout(() => Router.resolve(), 300);
            }
        });
    },

    rejectRequest(requestId) {
        Modal.confirm('Reject Request', 'Reject this borrow request?', () => {
            if (AppState.rejectBorrowRequest(requestId)) {
                Toast.warning('Request rejected.');
                setTimeout(() => Router.resolve(), 300);
            }
        });
    },

    viewRequestDetails(requestId) {
        const r = AppState.borrowRequests.find(x => x.id === requestId);
        if (!r) return;
        const book = AppState.books.find(b => b.id === r.bookId);
        const content = `
            <div style="display:flex;gap:16px;margin-bottom:16px;">
                <div style="width:80px;min-height:110px;flex-shrink:0;">${book ? Utils.getBookCover(book) : ''}</div>
                <div>
                    <h3 style="margin:0 0 4px;">${Utils.escapeHtml(r.bookTitle)}</h3>
                    <p style="color:var(--text-secondary);margin:0;">by ${book ? Utils.escapeHtml(book.author) : 'Unknown'}</p>
                    <span class="badge badge-warning" style="margin-top:8px;">${r.status}</span>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><small style="color:var(--text-tertiary);">Borrow ID</small><p style="font-family:var(--font-mono);margin:2px 0;">${r.id}</p></div>
                <div><small style="color:var(--text-tertiary);">Student</small><p style="margin:2px 0;">${Utils.escapeHtml(r.studentName)}</p></div>
                <div><small style="color:var(--text-tertiary);">Borrow Date</small><p style="margin:2px 0;">${Utils.formatDate(r.borrowDate)}</p></div>
                <div><small style="color:var(--text-tertiary);">Expected Return</small><p style="margin:2px 0;">${Utils.formatDate(r.expectedReturnDate)}</p></div>
            </div>`;
        Modal.show({ title: 'Request Details', content, size: 'md', buttons: [{ label: 'Close', class: 'btn-secondary' }] });
    },

    markReturned(requestId) {
        const r = AppState.borrowRequests.find(x => x.id === requestId);
        if (!r) return;
        Modal.confirm('Confirm Return', `Mark "${r.bookTitle}" as returned?`, () => {
            if (AppState.processReturn(requestId)) {
                Toast.success(`"${r.bookTitle}" marked as returned`);
                Router.resolve();
            }
        });
    }
};
