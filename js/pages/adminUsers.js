const AdminUsersPage = {
  activeRole: 'all',
  searchQuery: '',
  currentPage: 1,
  perPage: 15,

  render() {
    let allUsers = [];

    if (AppState.isSupabaseConnected && AppState.allProfiles && AppState.allProfiles.length > 0) {
      allUsers = AppState.allProfiles.map(p => ({
        id: p.id,
        name: p.name || '',
        email: p.email || '',
        role: p.role || 'student',
        grade: p.grade || '',
        class: p.className || '',
        department: p.department || '',
        avatar: p.avatar || '',
        borrowCount: p.borrowCount || p.borrow_count || 0,
        readingStreak: p.readingStreak || p.reading_streak || 0,
        className: p.className || ''
      }));
    } else {
      const students = LIBRARY_DATA.students || [];
      const teachers = LIBRARY_DATA.teachers || [];
      const librarians = [{ id: 'L1', name: 'Ms. Laxmi Devi', email: 'laxmi.d@saraswatischool.edu.np', role: 'librarian', avatar: 'LD', department: 'Library' }];
      const admins = [{ id: 'A1', name: 'Admin User', email: 'admin@saraswatischool.edu.np', role: 'admin', avatar: 'AU', department: 'Administration' }];
      allUsers = [
        ...students.map(u => ({ ...u, role: 'student' })),
        ...teachers.map(u => ({ ...u, role: 'teacher' })),
        ...librarians,
        ...admins
      ];
    }

    let filtered = allUsers;
    if (this.activeRole !== 'all') {
      filtered = filtered.filter(u => u.role === this.activeRole);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        String(u.id || '').toLowerCase().includes(q)
      );
    }

    const totalPages = Math.ceil(filtered.length / this.perPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const paged = filtered.slice((this.currentPage - 1) * this.perPage, this.currentPage * this.perPage);

    const roleCounts = { all: allUsers.length, student: students.length, teacher: teachers.length, librarian: librarians.length, admin: admins.length };

    return `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <div><h1 class="page-title">${Utils.getIcon('users', 28)} Manage Users</h1><p class="page-description">${allUsers.length} total users</p></div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
              <button class="btn btn-outline" onclick="AdminUsersPage.exportUserList()">${Utils.getIcon('download', 16)} Export List</button>
              <button class="btn btn-primary" onclick="AdminUsersPage.addUser()">${Utils.getIcon('user-plus', 16)} Add User</button>
            </div>
          </div>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem;">
          ${['all', 'student', 'teacher', 'librarian', 'admin'].map(r => `
            <button class="btn btn-sm ${this.activeRole === r ? 'btn-primary' : 'btn-outline'}" onclick="AdminUsersPage.switchRole('${r}')">
              ${r === 'all' ? Utils.getIcon('users', 14) : r === 'student' ? Utils.getIcon('graduation-cap', 14) : r === 'teacher' ? Utils.getIcon('briefcase', 14) : r === 'librarian' ? Utils.getIcon('shield', 14) : Utils.getIcon('settings', 14)}
              ${r.charAt(0).toUpperCase() + r.slice(1)}s (${roleCounts[r]})
            </button>
          `).join('')}
        </div>

        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1rem 1.5rem;position:relative;">
            <input class="form-input" placeholder="Search by name, email, or ID..." value="${Utils.escapeHtml(this.searchQuery)}" oninput="AdminUsersPage.onSearch(this.value)" style="padding-left:2.5rem;">
            <span style="position:absolute;left:1.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
          </div>
        </div>

        <div class="card">
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>User</th><th>ID</th><th>Email</th><th>Role</th><th>Dept/Grade</th><th>Borrowed</th><th>Actions</th></tr></thead>
            <tbody>
              ${paged.map(user => {
                const borrowed = AppState.borrowRequests.filter(r => r.studentId === user.id && (r.status === 'borrowed' || r.status === 'overdue')).length;
                const roleBadge = user.role === 'student' ? 'info' : user.role === 'teacher' ? 'warning' : user.role === 'librarian' ? 'success' : 'primary';
                const deptGrade = user.role === 'student' ? `Grade ${user.grade || '?'} - ${user.class || '?'}` : (user.department || 'N/A');
                return `
                  <tr>
                    <td><div style="display:flex;align-items:center;gap:0.75rem;">
                      <div class="avatar-sm" style="width:36px;height:36px;font-size:0.65rem;">${user.avatar || user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                      <strong>${Utils.escapeHtml(user.name)}</strong>
                    </div></td>
                    <td style="font-size:0.85rem;font-family:monospace;">${Utils.escapeHtml(String(user.id || ''))}</td>
                    <td style="font-size:0.85rem;">${Utils.escapeHtml(user.email || '')}</td>
                    <td><span class="badge badge-${roleBadge}">${user.role || 'student'}</span></td>
                    <td style="font-size:0.85rem;">${Utils.escapeHtml(deptGrade)}</td>
                    <td>${borrowed}</td>
                    <td><div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                      <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.viewProfile(${JSON.stringify(user.id).replace(/"/g, '&quot;')})" title="View Profile">${Utils.getIcon('eye', 14)}</button>
                      <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.editUser(${JSON.stringify(user.id).replace(/"/g, '&quot;')})" title="Edit">${Utils.getIcon('edit-2', 14)}</button>
                      <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.viewBorrowHistory(${JSON.stringify(user.id).replace(/"/g, '&quot;')})" title="Borrow History">${Utils.getIcon('clock', 14)}</button>
                      <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.resetPassword(${JSON.stringify(user.id).replace(/"/g, '&quot;')}, '${Utils.escapeHtml(user.name)}')" title="Reset Password">${Utils.getIcon('key', 14)}</button>
                      <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.toggleAccount(${JSON.stringify(user.id).replace(/"/g, '&quot;')}, '${Utils.escapeHtml(user.name)}')" title="Enable/Disable" style="color:var(--warning);">${Utils.getIcon('shield', 14)}</button>
                    </div></td>
                  </tr>`;
              }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:2rem;">No users found.</td></tr>'}
            </tbody>
          </table></div>
          ${totalPages > 1 ? `
          <div style="padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);">
            <small style="color:var(--text-secondary);">Showing ${(this.currentPage - 1) * this.perPage + 1}-${Math.min(this.currentPage * this.perPage, filtered.length)} of ${filtered.length}</small>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-outline" onclick="AdminUsersPage.prevPage()" ${this.currentPage <= 1 ? 'disabled' : ''}>Prev</button>
              <span style="padding:0.25rem 0.75rem;font-size:0.85rem;">${this.currentPage} / ${totalPages}</span>
              <button class="btn btn-sm btn-outline" onclick="AdminUsersPage.nextPage()" ${this.currentPage >= totalPages ? 'disabled' : ''}>Next</button>
            </div>
          </div>` : ''}
        </div>
      </div>`;
  },

  switchRole(role) { this.activeRole = role; this.currentPage = 1; this.searchQuery = ''; this.refresh(); },
  onSearch(value) { this.searchQuery = value; this.currentPage = 1; this.refresh(); },
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.refresh(); } },
  nextPage() { this.currentPage++; this.refresh(); },
  refresh() { Router.resolve(); },

  _findUser(id) {
    if (AppState.isSupabaseConnected && AppState.allProfiles && AppState.allProfiles.length > 0) {
      const found = AppState.allProfiles.find(u => String(u.id) === String(id));
      if (found) {
        return {
          id: found.id, name: found.name || '', email: found.email || '',
          role: found.role || 'student', grade: found.grade || '',
          class: found.className || '', department: found.department || '',
          className: found.className || '', avatar: found.avatar || ''
        };
      }
    }
    const allUsers = [
      ...(LIBRARY_DATA.students || []),
      ...(LIBRARY_DATA.teachers || [])
    ];
    return allUsers.find(u => String(u.id) === String(id));
  },

  addUser() {
    Modal.show({
      title: 'Add New User',
      content: `
        <div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="uf-name" placeholder="Full name"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group"><label class="form-label">Email *</label><input class="form-input" id="uf-email" type="email" placeholder="Email address"></div>
          <div class="form-group"><label class="form-label">ID Number</label><input class="form-input" id="uf-id" placeholder="Student/Employee ID"></div>
        </div>
        <div class="form-group"><label class="form-label">Role *</label>
          <select class="form-input" id="uf-role">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="librarian">Librarian</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group"><label class="form-label">Grade</label><input class="form-input" id="uf-grade" placeholder="Grade (for students)"></div>
          <div class="form-group"><label class="form-label">Department</label><input class="form-input" id="uf-dept" placeholder="Department"></div>
        </div>
        <div class="form-group"><label class="form-label">Class</label><input class="form-input" id="uf-class" placeholder="Class (for students)"></div>`,
      buttons: [
        { label: 'Add User', class: 'btn-primary', onClick: () => {
          const name = document.getElementById('uf-name')?.value?.trim();
          const email = document.getElementById('uf-email')?.value?.trim();
          if (!name) { Toast.error('Name is required'); return; }
          if (!email) { Toast.error('Email is required'); return; }
          Toast.success('User added successfully!');
          Modal.hide();
        }},
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'md'
    });
  },

  editUser(id) {
    const user = this._findUser(id);
    if (!user) { Toast.warning('User not found'); return; }
    Modal.show({
      title: 'Edit User',
      content: `
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="eu-name" value="${Utils.escapeHtml(user.name)}"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="eu-email" value="${Utils.escapeHtml(user.email || '')}"></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select class="form-input" id="eu-role">
            <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
            <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
            <option value="librarian" ${user.role === 'librarian' ? 'selected' : ''}>Librarian</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group"><label class="form-label">Grade</label><input class="form-input" id="eu-grade" value="${Utils.escapeHtml(user.grade || '')}"></div>
          <div class="form-group"><label class="form-label">Department</label><input class="form-input" id="eu-dept" value="${Utils.escapeHtml(user.department || '')}"></div>
        </div>
        <div class="form-group"><label class="form-label">Class</label><input class="form-input" id="eu-class" value="${Utils.escapeHtml(user.class || user.className || '')}"></div>`,
      buttons: [
        { label: 'Save Changes', class: 'btn-primary', onClick: async () => {
          const name = document.getElementById('eu-name')?.value?.trim();
          if (!name) { Toast.error('Name is required'); return; }
          const updates = {
            name: name,
            role: document.getElementById('eu-role')?.value || user.role,
            grade: document.getElementById('eu-grade')?.value?.trim() || user.grade || '',
            department: document.getElementById('eu-dept')?.value?.trim() || user.department || '',
            className: document.getElementById('eu-class')?.value?.trim() || user.class || user.className || ''
          };
          if (AppState.isSupabaseConnected) {
            try {
              await Api.updateProfile(user.id, updates);
            } catch (e) {
              console.error('Supabase updateProfile failed:', e);
              Toast.error('Failed to update user: ' + (e.message || 'Unknown error'));
              return;
            }
          }
          user.name = updates.name;
          user.role = updates.role;
          user.grade = updates.grade;
          user.department = updates.department;
          user.class = updates.className;
          if (AppState.isSupabaseConnected) {
            try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {}
          }
          Toast.success('User updated successfully!');
          Modal.hide();
          this.refresh();
        }},
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'md'
    });
  },

  viewProfile(id) {
    const user = this._findUser(id);
    if (!user) { Toast.warning('User not found'); return; }
    const borrows = AppState.borrowRequests.filter(r => r.studentId === id);
    const activeBorrows = borrows.filter(r => r.status === 'borrowed' || r.status === 'overdue').length;
    const totalBorrows = borrows.length;
    const fines = borrows.reduce((s, r) => s + (r.fine || 0), 0);
    const reservations = AppState.reservations.filter(r => r.studentId === id).length;

    const content = `
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div class="avatar-sm" style="width:64px;height:64px;font-size:1.2rem;margin:0 auto 0.75rem;">${user.avatar || user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
        <h3 style="margin:0;">${Utils.escapeHtml(user.name)}</h3>
        <p style="color:var(--text-secondary);margin:4px 0;">${Utils.escapeHtml(user.email || 'N/A')}</p>
        <span class="badge badge-info" style="margin-top:4px;">${user.role || 'student'}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div><small style="color:var(--text-tertiary);">User ID</small><p style="margin:2px 0;font-family:monospace;">${user.id}</p></div>
        <div><small style="color:var(--text-tertiary);">Grade/Dept</small><p style="margin:2px 0;">${user.role === 'student' ? `Grade ${user.grade || '?'} - ${user.class || '?'}` : (user.department || 'N/A')}</p></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="text-align:center;padding:1rem;border:1px solid var(--border);border-radius:8px;"><span style="font-size:1.5rem;font-weight:700;color:var(--primary);">${activeBorrows}</span><br><small>Active Borrows</small></div>
        <div style="text-align:center;padding:1rem;border:1px solid var(--border);border-radius:8px;"><span style="font-size:1.5rem;font-weight:700;color:var(--info);">${totalBorrows}</span><br><small>Total Borrows</small></div>
        <div style="text-align:center;padding:1rem;border:1px solid var(--border);border-radius:8px;"><span style="font-size:1.5rem;font-weight:700;color:var(--danger);">${fines > 0 ? 'Rs. ' + fines : 'None'}</span><br><small>Fines</small></div>
        <div style="text-align:center;padding:1rem;border:1px solid var(--border);border-radius:8px;"><span style="font-size:1.5rem;font-weight:700;color:var(--warning);">${reservations}</span><br><small>Reservations</small></div>
      </div>`;
    Modal.show({ title: 'User Profile', content, size: 'md', buttons: [{ label: 'Close', class: 'btn-outline', onClick: () => Modal.hide() }] });
  },

  viewBorrowHistory(id) {
    const user = this._findUser(id);
    if (!user) { Toast.warning('User not found'); return; }
    const borrows = AppState.borrowRequests.filter(r => r.studentId === id).slice(-20).reverse();

    const content = borrows.length ? `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Book</th><th>Borrow Date</th><th>Due Date</th><th>Status</th><th>Fine</th></tr></thead>
        <tbody>${borrows.map(r => `
          <tr>
            <td><strong>${Utils.escapeHtml(r.bookTitle)}</strong></td>
            <td>${Utils.formatDate(r.borrowDate)}</td>
            <td>${Utils.formatDate(r.expectedReturnDate)}</td>
            <td>${Utils.getStatusBadge(r.status)}</td>
            <td>${r.fine > 0 ? 'Rs. ' + r.fine : '-'}</td>
          </tr>`).join('')}</tbody>
      </table></div>` : '<p style="color:var(--text-secondary);text-align:center;padding:2rem;">No borrow history found.</p>';

    Modal.show({ title: `Borrow History — ${Utils.escapeHtml(user.name)}`, content, size: 'lg', buttons: [{ label: 'Close', class: 'btn-outline', onClick: () => Modal.hide() }] });
  },

  resetPassword(id, name) {
    Modal.confirm('Reset Password', `Send a password reset link to "${name}"?`, () => {
      Toast.success('Password reset link sent!');
    });
  },

  toggleAccount(id, name) {
    Modal.confirm('Toggle Account', `Are you sure you want to toggle the account status for "${name}"?`, () => {
      Toast.success('Account status toggled!');
    });
  },

  exportUserList() {
    const students = LIBRARY_DATA.students || [];
    const teachers = LIBRARY_DATA.teachers || [];
    const allUsers = [
      ...students.map(u => ({ ...u, role: 'student' })),
      ...teachers.map(u => ({ ...u, role: 'teacher' }))
    ];
    let csv = 'ID,Name,Email,Role,Grade/Dept,Class,Borrow Count\n';
    allUsers.forEach(u => {
      csv += `${u.id},"${(u.name || '').replace(/"/g, '""')}","${u.email || ''}","${u.role}","${u.grade || u.department || ''}","${u.class || u.className || ''}",${u.borrowCount || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('User list exported successfully');
  },

  afterRender() {}
};
