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
        const s = this._adminStats();

        return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getGreeting()}, ${Utils.escapeHtml((AppState.currentUser && AppState.currentUser.name) || 'Admin')}</h1>
          <p class="page-description">Library Management Dashboard <span id="dashLiveBadge">${this._liveBadge()}</span></p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="grid-3" style="margin-bottom:1.5rem;">
          <div class="stat-card"><div class="stat-icon blue">${Utils.getIcon('book-open', 24)}</div><div class="stat-info"><span class="stat-value">${s.totalBooks}</span><span class="stat-label">Total Books</span></div></div>
          <div class="stat-card"><div class="stat-icon green">${Utils.getIcon('check-circle', 24)}</div><div class="stat-info"><span class="stat-value">${s.availableBooks}</span><span class="stat-label">Available Books</span></div></div>
          <div class="stat-card"><div class="stat-icon indigo">${Utils.getIcon('book-open', 24)}</div><div class="stat-info"><span class="stat-value">${s.currentBorrowed}</span><span class="stat-label">Currently Borrowed</span></div></div>
        </div>
        <div class="grid-3" style="margin-bottom:1.5rem;">
          <div class="stat-card"><div class="stat-icon orange">${Utils.getIcon('clock', 24)}</div><div class="stat-info"><span class="stat-value">${s.pendingRequests}</span><span class="stat-label">Pending Requests</span></div></div>
          <div class="stat-card"><div class="stat-icon teal">${Utils.getIcon('check-circle', 24)}</div><div class="stat-info"><span class="stat-value">${s.approvedRequests}</span><span class="stat-label">Approved Requests</span></div></div>
          <div class="stat-card"><div class="stat-icon red">${Utils.getIcon('x-circle', 24)}</div><div class="stat-info"><span class="stat-value">${s.rejectedRequests}</span><span class="stat-label">Rejected Requests</span></div></div>
        </div>
        <div class="grid-3" style="margin-bottom:2rem;">
          <div class="stat-card"><div class="stat-icon green">${Utils.getIcon('corner-down-left', 24)}</div><div class="stat-info"><span class="stat-value">${s.returnedBooks}</span><span class="stat-label">Returned Books</span></div></div>
          <div class="stat-card"><div class="stat-icon red">${Utils.getIcon('alert-triangle', 24)}</div><div class="stat-info"><span class="stat-value">${s.overdueBooks}</span><span class="stat-label">Overdue Books</span></div></div>
          <div class="stat-card"><div class="stat-icon pink">${Utils.getIcon('users', 24)}</div><div class="stat-info"><span class="stat-value">${s.members}</span><span class="stat-label">Total Members</span>${s.pendingMembers > 0 ? `<small style="display:block;color:var(--warning);font-size:0.7rem;margin-top:2px;">${s.pendingMembers} awaiting approval</small>` : ''}</div></div>
        </div>

        <div class="card" style="margin-bottom:2rem;">
          <div class="card-header-flex">
            <h3 style="margin:0;">Pending Borrow Requests</h3>
            <span class="badge badge-warning">${s.pendingRequests} pending</span>
          </div>
          ${s.pending.length ? `
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Book</th><th>Borrow ID</th><th>Time</th><th>Actions</th></tr></thead><tbody>${s.pending.map(r => {
            const student = AppState.allProfiles.find(p => p && p.id === r.studentId);
            const avatar = (student && student.avatar) ? student.avatar : this._nameInitials(r.studentName || '?');
            return `<tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="avatar-sm" style="width:32px;height:32px;font-size:0.65rem;">${Utils.escapeHtml(avatar)}</div>
                  <span>${Utils.escapeHtml(r.studentName)}</span>
                </div>
              </td>
              <td><strong>${Utils.escapeHtml(r.bookTitle)}</strong></td>
              <td class="mono" style="font-size:0.8rem;">${Utils.escapeHtml(r.id)}</td>
              <td>${Utils.formatDate(r.borrowDate || r.requestTime)}</td>
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
              ${s.recentActivity.map(r => {
                if (r.type === 'member') {
                  return `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);align-items:center;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--info)15;color:var(--info);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('user-plus', 14)}</div>
                    <div style="flex:1;min-width:0;"><p style="margin:0;font-size:0.85rem;">${Utils.escapeHtml(r.studentName)} <small style="color:var(--text-secondary);">registered as ${Utils.escapeHtml(r.role || 'member')}</small></p><small style="color:var(--text-secondary);">${Utils.formatDate(r.time)}</small></div>
                    <span class="badge badge-info" style="font-size:0.7rem;">new member</span>
                  </div>`;
                }
                const statusColors = { pending: 'var(--warning)', approved: 'var(--info)', borrowed: 'var(--primary)', overdue: 'var(--danger)', returned: 'var(--success)', rejected: 'var(--danger)', expired: 'var(--text-tertiary)', return_requested: 'var(--primary)' };
                const color = statusColors[r.status] || 'var(--text-tertiary)';
                const icons = { pending: 'clock', approved: 'check-circle', borrowed: 'book-open', overdue: 'alert-triangle', returned: 'check-circle', rejected: 'x-circle', expired: 'x-circle', return_requested: 'repeat' };
                return `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-light);align-items:center;">
                  <div style="width:32px;height:32px;border-radius:50%;background:${color}15;color:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon(icons[r.status] || 'bell', 14)}</div>
                  <div style="flex:1;min-width:0;"><p style="margin:0;font-size:0.85rem;">${Utils.escapeHtml(r.studentName)} — ${Utils.escapeHtml(r.bookTitle)}</p><small style="color:var(--text-secondary);">${Utils.escapeHtml(r.id)} · ${Utils.formatDate(r.time)}</small></div>
                  <span class="badge badge-${r.status === 'returned' ? 'success' : r.status === 'overdue' ? 'danger' : r.status === 'pending' ? 'warning' : r.status === 'rejected' ? 'danger' : r.status === 'expired' ? 'secondary' : r.status === 'approved' ? 'info' : 'primary'}" style="font-size:0.7rem;">${r.status}</span>
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
                ${s.mostBorrowed.map((b, i) => `
                  <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < s.mostBorrowed.length - 1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
                    <span style="width:24px;height:24px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;">${i + 1}</span>
                    <div style="flex:1;min-width:0;"><p style="margin:0;font-size:0.85rem;font-weight:500;">${Utils.escapeHtml(b.title)}</p><small style="color:var(--text-secondary);">${Utils.escapeHtml(b.author)}</small></div>
                    <span class="badge badge-info" style="font-size:0.7rem;">${b._effective} borrows</span>
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

    // All admin dashboard numbers are derived HERE from the real data loaded
    // from the database (Supabase). No hardcoded values, no Math.random().
    _adminStats() {
        const connected = !!AppState.isSupabaseConnected && !!AppState.currentUser;
        // Database-accurate book counts (no local filler books) when connected.
        const dbBooks = (AppState.dbBooks && AppState.dbBooks.length) ? AppState.dbBooks : null;
        const bookSet = (connected && dbBooks) ? dbBooks : (AppState.books || []);
        const allBooks = AppState.books || [];
        const reqs = AppState.borrowRequests || [];
        const profiles = AppState.allProfiles || [];

        let students = 0, teachers = 0, members = 0, pendingMembers = 0;
        profiles.forEach(p => {
            if (!p) return;
            members++;
            if (p.role === 'student') students++;
            else if (p.role === 'teacher') teachers++;
            if (p.approved === false) pendingMembers++;
        });
        if (!connected) {
            // Offline/demo fallback to the local roster.
            const localStudents = (typeof LIBRARY_DATA !== 'undefined') ? (LIBRARY_DATA.students || []) : [];
            const localTeachers = (typeof LIBRARY_DATA !== 'undefined') ? (LIBRARY_DATA.teachers || []) : [];
            students = localStudents.length;
            teachers = localTeachers.length;
            members = students + teachers;
        }

        const pending = reqs.filter(r => r && r.status === 'pending');
        const activeBorrows = reqs.filter(r => r && (r.status === 'borrowed' || r.status === 'overdue'));
        const returned = reqs.filter(r => r && r.status === 'returned');
        const overdue = reqs.filter(r => r && r.status === 'overdue');
        const approved = reqs.filter(r => r && r.status === 'approved');
        const rejected = reqs.filter(r => r && r.status === 'rejected');

        const totalBooks = bookSet.length;
        const availableBooks = bookSet.filter(b => b && b.availableCopies > 0).length;
        const totalCopies = bookSet.reduce((sum, b) => sum + (b.totalCopies || 0), 0);

        // Borrow counts come from real borrow request records; book.borrowCount
        // is honoured too so titles never under-report.
        const borrowCountByBook = {};
        reqs.forEach(r => { if (r && r.bookId != null) borrowCountByBook[r.bookId] = (borrowCountByBook[r.bookId] || 0) + 1; });
        const mostBorrowed = [...allBooks]
            .map(b => ({ ...b, _effective: Math.max(b.borrowCount || 0, borrowCountByBook[b.id] || 0) }))
            .sort((a, b) => b._effective - a._effective)
            .slice(0, 5);

        // Recent activity = borrow lifecycle events + new member registrations.
        const recentActivity = [];
        reqs.forEach(r => {
            if (!r) return;
            recentActivity.push({
                type: 'borrow',
                id: r.id,
                studentName: r.studentName || '',
                bookTitle: r.bookTitle || '',
                status: r.status,
                role: null,
                time: r.requestTime || r.approvedAt || r.borrowDate || ''
            });
        });
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        profiles.forEach(p => {
            if (!p || p.approved === false) return;
            const created = p.createdAt ? new Date(p.createdAt).getTime() : NaN;
            if (isNaN(created) || created < cutoff) return;
            recentActivity.push({
                type: 'member',
                id: '',
                studentName: p.name || '',
                bookTitle: '',
                status: 'new',
                role: p.role || 'member',
                time: p.createdAt
            });
        });
        recentActivity.sort((a, b) => {
            const t = (x) => { const d = new Date(x.time); return isNaN(d.getTime()) ? 0 : d.getTime(); };
            return t(b) - t(a);
        });

        return {
            totalBooks,
            availableBooks,
            totalCopies,
            currentBorrowed: activeBorrows.length,
            pendingRequests: pending.length,
            pending,
            approvedRequests: approved.length,
            rejectedRequests: rejected.length,
            returnedBooks: returned.length,
            overdueBooks: overdue.length,
            members,
            students,
            teachers,
            pendingMembers,
            totalFines: reqs.reduce((sum, r) => sum + (r.fine || 0), 0),
            recentActivity: recentActivity.slice(0, 10),
            mostBorrowed,
            bookSet
        };
    },

    _nameInitials(name) {
        return String(name || '?').split(/\s+/).map(w => (w && w[0]) ? w[0].toUpperCase() : '').join('').substring(0, 2) || '??';
    },

    _monthlySeries(reqs) {
        reqs = reqs || [];
        const out = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            const count = reqs.filter(r => {
                if (!r || !r.requestTime) return false;
                const t = new Date(r.requestTime);
                return !isNaN(t.getTime()) && t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth();
            }).length;
            out.push({ label, borrowed: count });
        }
        return out;
    },

    _categoryData() {
        const s = this._adminStats();
        const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#14b8a6', '#06b6d4', '#ec4899', '#0ea5e9', '#a855f7'];
        const counts = {};
        (s.bookSet || []).forEach(b => {
            if (!b) return;
            const name = String(b.category || '').trim() || 'Uncategorized';
            counts[name] = (counts[name] || 0) + 1;
        });
        return Object.keys(counts)
            .map(name => ({ label: name, value: counts[name] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map((c, i) => ({ ...c, color: colors[i % colors.length] }));
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
        const isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
        if (isAdmin) this._renderAdminCharts();
        else this._renderMemberCharts();
        this._startLiveRefresh();
        if (Animations && Animations.initCounters) Animations.initCounters();
    },

    _renderMemberCharts() {
        const monthly = this._monthlySeries(AppState.borrowRequests || []);
        const lineCanvas = document.getElementById('dash-line-chart');
        if (lineCanvas && Charts && Charts.line) {
            Charts.line(lineCanvas, monthly.map(m => ({ label: m.label, value: m.borrowed })));
        }
    },

    _renderAdminCharts() {
        const s = this._adminStats();

        const lineCanvas = document.getElementById('dash-line-chart');
        if (lineCanvas && Charts && Charts.line) {
            const monthly = this._monthlySeries(AppState.borrowRequests || []);
            Charts.line(lineCanvas, monthly.map(m => ({ label: m.label, value: m.borrowed })));
        }

        const doughnutCanvas = document.getElementById('dash-doughnut-chart');
        if (doughnutCanvas && Charts && Charts.doughnut) {
            const activeCount = s.currentBorrowed;
            const returnedCount = s.returnedBooks;
            const overdueCount = s.overdueBooks;
            const pendingCount = s.pendingRequests;
            const rejectedCount = s.rejectedRequests;
            const hasAny = activeCount || returnedCount || overdueCount || pendingCount || rejectedCount;
            if (hasAny) {
                Charts.doughnut(doughnutCanvas, [
                    { value: activeCount, color: '#4f46e5' },
                    { value: returnedCount, color: '#22c55e' },
                    { value: overdueCount, color: '#ef4444' },
                    { value: pendingCount, color: '#f59e0b' },
                    { value: rejectedCount, color: '#94a3b8' }
                ], `${activeCount + returnedCount + overdueCount + pendingCount + rejectedCount}`);
            }
        }

        const catCanvas = document.getElementById('dash-categories-chart');
        if (catCanvas && Charts && Charts.bar) {
            const cats = this._categoryData();
            Charts.bar(catCanvas, cats.map(c => ({ label: c.label, value: c.value, color: c.color })));
        }
    },

    _modalOpen() {
        const modal = document.getElementById('modalContainer');
        return !!(modal && modal.classList.contains('active'));
    },

    // Live indicator shown next to the "Library Management Dashboard" title.
    _liveBadge() {
        if (!AppState.isSupabaseConnected) return '';
        const live = window.Realtime && typeof Realtime.isLive === 'function' && Realtime.isLive();
        if (live) {
            return `<span class="live-badge live" title="Updating instantly from the database"><span class="live-dot"></span>Live</span><span class="live-meta" id="dashLiveTime">up-to-date</span>`;
        }
        return `<span class="live-badge polling" title="Refreshing automatically every few seconds"><span class="live-dot"></span>Auto-refresh</span>`;
    },

    // Is the Admin Dashboard the page currently on screen?
    _onDashboard() {
        const hash = window.location.hash || '#/';
        return (hash.split('?')[0].split('#')[0]) === '#/dashboard';
    },

    _startLiveRefresh() {
        this._stopLiveRefresh();

        // Stop refreshing the moment the user leaves the dashboard, otherwise
        // the loop would keep re-rendering whatever page they moved to.
        if (!this._navHookBound) {
            this._navHookBound = true;
            if (window.Router && typeof Router.beforeNavigate === 'function') {
                Router.beforeNavigate((path) => {
                    if (path && path !== 'dashboard' && !path.startsWith('dashboard')) {
                        DashboardPage._stopLiveRefresh();
                    }
                });
            }
        }

        document.addEventListener('library:data-changed', this._onDataChanged = function () {
            // Ignore change events fired while we are mid-refresh (e.g. the
            // reminders/expirations that loadFromSupabase triggers), otherwise
            // every refresh would schedule another one -> refresh loop.
            if (DashboardPage._refreshing) return;
            if (DashboardPage._modalOpen()) return;
            DashboardPage._scheduleRefresh(800);
        });
        this._liveTimer = setInterval(() => {
            if (!DashboardPage._onDashboard()) { DashboardPage._stopLiveRefresh(); return; }
            if (DashboardPage._modalOpen()) return;
            DashboardPage._scheduleRefresh(0);
        }, 15000);
        // Keep the "updated X ago" clock and the Live / Auto-refresh badge in
        // sync without re-rendering the whole page.
        this._clockTimer = setInterval(() => DashboardPage._tickLiveUI(), 1000);
        this._tickLiveUI();
    },

    _tickLiveUI() {
        const badge = document.getElementById('dashLiveBadge');
        if (!badge) return;
        const live = window.Realtime && typeof Realtime.isLive === 'function' && Realtime.isLive();
        const wantLive = String(live) === badge.dataset.live;
        if (!wantLive) {
            badge.innerHTML = this._liveBadge();
            badge.dataset.live = String(live);
        }
        const t = document.getElementById('dashLiveTime');
        if (t) t.textContent = this._relativeTime(this.lastUpdatedAt);
    },

    _relativeTime(ts) {
        if (!ts) return 'up-to-date';
        const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
        if (s < 5) return 'updated just now';
        if (s < 60) return `updated ${s}s ago`;
        const m = Math.floor(s / 60);
        return `updated ${m}m ago`;
    },

    _scheduleRefresh(ms) {
        clearTimeout(this._refreshDebounce);
        this._refreshDebounce = setTimeout(() => {
            if (DashboardPage._modalOpen()) return;
            if (!DashboardPage._onDashboard()) { DashboardPage._stopLiveRefresh(); return; }
            DashboardPage.refreshLive();
        }, ms);
    },

    _stopLiveRefresh() {
        clearInterval(this._liveTimer);
        clearInterval(this._clockTimer);
        clearTimeout(this._refreshDebounce);
        this._liveTimer = this._clockTimer = this._refreshDebounce = null;
        if (this._onDataChanged) {
            document.removeEventListener('library:data-changed', this._onDataChanged);
            this._onDataChanged = null;
        }
    },

    // Pull the latest data from the database and re-render without reloading the page.
    async refreshLive() {
        if (!AppState || !AppState.isSupabaseConnected || !AppState.currentUser) return;
        if (!this._onDashboard()) { this._stopLiveRefresh(); return; }
        const market = document.getElementById('modalContainer');
        if (market && market.classList.contains('active')) return;
        if (this._refreshing) return;
        this._refreshing = true;
        try {
            await AppState.loadFromSupabase();
            this.lastUpdatedAt = Date.now();
            if (window.Realtime && typeof Realtime.markSynced === 'function') Realtime.markSynced();
            this.renderNow();
        } catch (e) {
            // Keep the current view; a later refresh will retry.
        } finally {
            this._refreshing = false;
        }
    },

    // Silent re-render of the current route (keeps URL, nav highlight, scroll).
    renderNow() {
        if (this._modalOpen()) return;
        const hash = window.location.hash || '#/dashboard';
        const content = document.getElementById('pageContent');
        if (!content) return;
        const page = Router.resolve(hash, { silent: true });
        if (page && page.render) {
            const html = page.render();
            if (html === content.innerHTML) return;
            content.innerHTML = html;
            Router.bindLinks();
            Router.highlightNav();
            if (page.afterRender && this._modalOpen() === false) page.afterRender();
        }
    },

    approveRequest(requestId) {
        const request = AppState.borrowRequests.find(x => x.id === requestId);
        if (!request) return;

        const pad = n => String(n).padStart(2, '0');
        const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const loanDays = (AppState.getLoanPeriod && AppState.getLoanPeriod()) || 14;
        const startDefault = fmt(new Date());
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + loanDays);
        const dueDefault = fmt(dueDate);

        const content = `
            <p style="color:var(--text-secondary);margin:0 0 14px">
                Approve the request for <strong>${Utils.escapeHtml(request.bookTitle)}</strong> from
                <strong>${Utils.escapeHtml(request.studentName)}</strong>. Set the loan window &mdash;
                the digital copy of the book unlocks for the student between these dates.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
                <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px">Borrow start date</label>
                    <input type="date" class="form-input" id="approveStartDate" value="${startDefault}">
                </div>
                <div>
                    <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px">Due date</label>
                    <input type="date" class="form-input" id="approveDueDate" value="${dueDefault}">
                </div>
            </div>
            <div style="font-size:0.78rem;color:var(--text-secondary)">
                ${Utils.getIcon('info', 14)} The student is notified with these dates, and reading
                access is refused automatically outside them.
            </div>`;

        Modal.show({
            title: 'Approve Borrow Request',
            content,
            size: 'sm',
            buttons: [
                { label: 'Cancel', class: 'btn-secondary' },
                {
                    label: 'Approve',
                    class: 'btn-primary',
                    onClick: async () => {
                        const start = (document.getElementById('approveStartDate') || {}).value;
                        const due = (document.getElementById('approveDueDate') || {}).value;
                        const reopen = () => setTimeout(() => DashboardPage.approveRequest(requestId), 450);

                        if (!start || !due) {
                            Toast.error('Please choose both a start date and a due date.');
                            reopen();
                            return;
                        }
                        if (due < start) {
                            Toast.error('The due date must be on or after the start date.');
                            reopen();
                            return;
                        }
                        try {
                            const ok = await AppState.approveBorrowRequest(requestId, AppState.currentUser?.name || 'Librarian', {
                                borrowDate: start,
                                dueDate: due
                            });
                            if (ok) {
                                Toast.success(`Request approved. Loan: ${start} to ${due}`);
                                setTimeout(() => Router.resolve(), 300);
                            } else {
                                Toast.error('Could not approve this request.');
                                reopen();
                            }
                        } catch (e) {
                            Toast.error(e.message || 'Could not approve this request.');
                            reopen();
                        }
                    }
                }
            ]
        });
    },

    rejectRequest(requestId) {
        const request = AppState.borrowRequests.find(x => x.id === requestId);
        if (!request) return;

        const content = `
            <p style="color:var(--text-secondary);margin:0 0 14px">
                Reject the request for <strong>${Utils.escapeHtml(request.bookTitle)}</strong> from
                <strong>${Utils.escapeHtml(request.studentName)}</strong>. The student is notified with your reason.
            </p>
            <label style="display:block;font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px">Reason (optional)</label>
            <textarea class="form-input" id="rejectReason" rows="3" placeholder="e.g. All copies are reserved for another student"></textarea>`;

        Modal.show({
            title: 'Reject Borrow Request',
            content,
            size: 'sm',
            buttons: [
                { label: 'Cancel', class: 'btn-secondary' },
                {
                    label: 'Reject',
                    class: 'btn-danger',
                    onClick: async () => {
                        const reason = ((document.getElementById('rejectReason') || {}).value || '').trim();
                        try {
                            if (await AppState.rejectBorrowRequest(requestId, reason)) {
                                Toast.warning('Request rejected. The student has been notified.');
                                setTimeout(() => Router.resolve(), 300);
                            } else {
                                Toast.error('Could not reject this request.');
                            }
                        } catch (e) {
                            Toast.error(e.message || 'Could not reject this request.');
                        }
                    }
                }
            ]
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
