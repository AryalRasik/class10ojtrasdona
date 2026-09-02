const AdminUsersPage = {
  activeRole: 'all',
  searchQuery: '',
  currentPage: 1,
  perPage: 15,
  selectedUsers: new Set(),

  render() {
    const allUsers = this._getAllUsers();
    const filtered = this._filteredUsers();

    const totalPages = Math.ceil(filtered.length / this.perPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const paged = filtered.slice((this.currentPage - 1) * this.perPage, this.currentPage * this.perPage);

    const pendingCount = allUsers.filter(u => u.approved === false).length;
    const roleCounts = { all: allUsers.length, student: allUsers.filter(u => u.role === 'student').length, teacher: allUsers.filter(u => u.role === 'teacher').length, librarian: allUsers.filter(u => u.role === 'librarian').length, admin: allUsers.filter(u => u.role === 'admin').length, pending: pendingCount };

    return `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <div><h1 class="page-title">${Utils.getIcon('users', 28)} Manage Users</h1><p class="page-description">${allUsers.length} total users</p></div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
              <button class="btn btn-outline" onclick="AdminUsersPage.exportUserList()">${Utils.getIcon('download', 16)} Export List</button>
              <button class="btn btn-outline" onclick="AdminUsersPage.showImportModal()">${Utils.getIcon('upload', 16)} Bulk Import</button>
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
          <button class="btn btn-sm ${this.activeRole === 'pending' ? 'btn-warning' : 'btn-outline'}" onclick="AdminUsersPage.switchRole('pending')" style="${pendingCount > 0 ? 'border-color:var(--warning);color:var(--warning);' : ''}">
            ${Utils.getIcon('clock', 14)} Pending (${pendingCount})
          </button>
        </div>

        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1rem 1.5rem;position:relative;">
            <input class="form-input" placeholder="Search by name, email, or ID..." value="${Utils.escapeHtml(this.searchQuery)}" oninput="AdminUsersPage.onSearch(this.value)" style="padding-left:2.5rem;">
            <span style="position:absolute;left:1.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
          </div>
        </div>

        <div class="card">
          <div id="bulk-action-bar" style="display:none;padding:0.75rem 1.5rem;border-bottom:1px solid var(--border-color);align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
            <div style="font-size:0.9rem;"><strong id="bulk-count-label">0</strong> selected</div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <button class="btn btn-sm btn-outline" onclick="AdminUsersPage.bulkApprove()">${Utils.getIcon('check', 14)} Approve</button>
              <button class="btn btn-sm btn-outline" onclick="AdminUsersPage.bulkReject()" style="color:var(--danger);border-color:var(--danger);">${Utils.getIcon('x', 14)} Reject</button>
              <button class="btn btn-sm btn-danger" onclick="AdminUsersPage.bulkDelete()">${Utils.getIcon('trash', 14)} Delete</button>
              <button class="btn btn-sm btn-ghost" onclick="AdminUsersPage.clearSelection()">Clear</button>
            </div>
          </div>
          <div class="table-wrap"><table class="data-table">
            <thead><tr>
              <th style="width:36px;"><input type="checkbox" id="select-all-checkbox" onchange="AdminUsersPage.toggleSelectAll(this.checked, event)"></th>
              <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${paged.map(user => {
                const roleBadge = user.role === 'student' ? 'info' : user.role === 'teacher' ? 'warning' : user.role === 'librarian' ? 'success' : 'primary';
                const isPending = user.approved === false;
                const isSelected = this.selectedUsers.has(String(user.id));
                return `
                  <tr style="${isPending ? 'background:rgba(245,158,11,0.05);' : ''}${isSelected ? 'background:rgba(102,126,234,0.07);' : ''}">
                    <td><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="AdminUsersPage.toggleSelect('${String(user.id).replace(/'/g, "\\'")}', this.checked)"></td>
                    <td><div style="display:flex;align-items:center;gap:0.75rem;">
                      <div class="avatar-sm" style="width:36px;height:36px;font-size:0.65rem;">${user.avatar || user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                      <strong>${Utils.escapeHtml(user.name)}</strong>
                    </div></td>
                    <td style="font-size:0.85rem;">${Utils.escapeHtml(user.email || '')}</td>
                    <td><span class="badge badge-${roleBadge}">${user.role || 'student'}</span></td>
                    <td>${isPending
                      ? '<span class="badge badge-warning" style="background:rgba(245,158,11,0.15);color:var(--warning);">Pending</span>'
                      : '<span class="badge badge-success" style="background:rgba(16,185,129,0.15);color:var(--success);">Approved</span>'
                    }</td>
                    <td><div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                      ${isPending ? `
                        <button class="btn btn-sm" style="background:var(--success);color:#fff;padding:4px 10px;" onclick="AdminUsersPage.approveUser(${JSON.stringify(user.id).replace(/"/g, '&quot;')}, '${Utils.escapeHtml(user.name)}')" title="Approve">${Utils.getIcon('check', 14)} Approve</button>
                        <button class="btn btn-sm" style="background:var(--danger);color:#fff;padding:4px 10px;" onclick="AdminUsersPage.rejectUser(${JSON.stringify(user.id).replace(/"/g, '&quot;')}, '${Utils.escapeHtml(user.name)}')" title="Reject">${Utils.getIcon('x', 14)} Reject</button>
                      ` : `
                        <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.viewProfile(${JSON.stringify(user.id).replace(/"/g, '&quot;')})" title="View Profile">${Utils.getIcon('eye', 14)}</button>
                        <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.editUser(${JSON.stringify(user.id).replace(/"/g, '&quot;')})" title="Edit">${Utils.getIcon('edit-2', 14)}</button>
                        <button class="btn btn-ghost btn-sm" onclick="AdminUsersPage.viewBorrowHistory(${JSON.stringify(user.id).replace(/"/g, '&quot;')})" title="Borrow History">${Utils.getIcon('clock', 14)}</button>
                        <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="AdminUsersPage.deleteLibrarian(${JSON.stringify(user.id).replace(/"/g, '&quot;')}, '${Utils.escapeHtml(user.name)}')" title="Delete Account">${Utils.getIcon('trash', 14)}</button>
                      `}
                    </div></td>
                  </tr>`;
              }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:2rem;">No users found.</td></tr>'}
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

  // ── Bulk selection ───────────────────────────────────────
  _selectedIds() {
    const ids = new Set();
    this.selectedUsers.forEach(id => ids.add(String(id)));
    return ids;
  },

  toggleSelect(id, checked) {
    const key = String(id);
    if (checked) this.selectedUsers.add(key);
    else this.selectedUsers.delete(key);
    this.updateBulkBar();
  },

  toggleSelectAll(checked) {
    const filtered = this._filteredUsers();
    if (checked) {
      filtered.forEach(u => this.selectedUsers.add(String(u.id)));
    } else {
      this.selectedUsers.clear();
    }
    this.updateBulkBar();
  },

  clearSelection() {
    this.selectedUsers.clear();
    this.refresh();
  },

  updateBulkBar() {
    const bar = document.getElementById('bulk-action-bar');
    const label = document.getElementById('bulk-count-label');
    if (bar) bar.style.display = this.selectedUsers.size > 0 ? 'flex' : 'none';
    if (label) label.textContent = this.selectedUsers.size;
    const allCheck = document.getElementById('select-all-checkbox');
    if (allCheck) {
      const filtered = this._filteredUsers();
      allCheck.checked = filtered.length > 0 && filtered.every(u => this.selectedUsers.has(String(u.id)));
    }
  },

  _getAllUsers() {
    let allUsers = [];
    if (AppState.isSupabaseConnected && AppState.allProfiles && AppState.allProfiles.length > 0) {
      allUsers = AppState.allProfiles.map(p => ({
        id: p.id,
        name: p.name || '',
        email: p.email || '',
        role: p.role || 'student',
        grade: p.grade || '',
        department: p.department || '',
        avatar: p.avatar || '',
        className: p.className || '',
        approved: p.approved !== false
      }));
    } else {
      const students = LIBRARY_DATA.students || [];
      const teachers = LIBRARY_DATA.teachers || [];
      const librarians = [{ id: 'L1', name: 'Ms. Laxmi Devi', email: 'laxmi.d@saraswatischool.edu.np', role: 'librarian', avatar: 'LD', department: 'Library', approved: true }];
      const admins = [{ id: 'A1', name: 'Admin User', email: 'admin@saraswatischool.edu.np', role: 'admin', avatar: 'AU', department: 'Administration', approved: true }];
      allUsers = [
        ...students.map(u => ({ ...u, role: 'student', approved: u.approved !== false })),
        ...teachers.map(u => ({ ...u, role: 'teacher', approved: u.approved !== false })),
        ...librarians,
        ...admins
      ];
    }
    return allUsers;
  },

  _filteredUsers() {
    let filtered = this._getAllUsers();
    if (this.activeRole === 'pending') {
      filtered = filtered.filter(u => u.approved === false);
    } else if (this.activeRole !== 'all') {
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
    return filtered;
  },

  _selectedUserObjects() {
    const idSet = this._selectedIds();
    return this._getAllUsers().filter(u => idSet.has(String(u.id)));
  },

  bulkApprove() {
    const users = this._selectedUserObjects();
    if (users.length === 0) return;
    Modal.confirm('Bulk Approve', `Approve ${users.length} pending user(s)?`, async () => {
      let ok = 0, fail = 0;
      for (const u of users) {
        try {
          if (AppState.isSupabaseConnected) {
            await Api.approveUser(u.id);
          } else {
            const storedUsers = LoginPage.getStoredUsers();
            const found = storedUsers.find(x => String(x.id) === String(u.id));
            if (found) { found.approved = true; localStorage.setItem('library_users', JSON.stringify(storedUsers)); }
          }
          ok++;
        } catch (e) { fail++; }
      }
      if (AppState.isSupabaseConnected) { try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {} }
      this.selectedUsers.clear();
      this.refresh();
      Toast.success(`Approved ${ok} user(s)${fail ? `, ${fail} failed` : ''}`);
    });
  },

  bulkReject() {
    const users = this._selectedUserObjects();
    if (users.length === 0) return;
    const cannotDeleteOwn = users.some(u => AppState.currentUser && String(AppState.currentUser.id) === String(u.id));
    const msg = `Reject and delete ${users.length} selected user(s)?` + (cannotDeleteOwn ? ' Note: your own account is excluded.' : '') + ' This permanently removes their accounts.';
    Modal.confirm('Bulk Reject', msg, async () => {
      let ok = 0, fail = 0;
      for (const u of users) {
        if (AppState.currentUser && String(AppState.currentUser.id) === String(u.id)) continue;
        try {
          if (AppState.isSupabaseConnected) {
            await Api.rejectUser(u.id);
          } else {
            const storedUsers = LoginPage.getStoredUsers();
            localStorage.setItem('library_users', JSON.stringify(storedUsers.filter(x => String(x.id) !== String(u.id))));
          }
          ok++;
        } catch (e) { fail++; }
      }
      if (AppState.isSupabaseConnected) { try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {} }
      this.selectedUsers.clear();
      this.refresh();
      Toast.success(`Rejected ${ok} user(s)${fail ? `, ${fail} failed` : ''}`);
    });
  },

  bulkDelete() {
    const users = this._selectedUserObjects();
    if (users.length === 0) return;
    const cannotDeleteOwn = users.some(u => AppState.currentUser && String(AppState.currentUser.id) === String(u.id));
    const msg = `Permanently delete ${users.length} selected user(s)?` + (cannotDeleteOwn ? ' Note: your own account is excluded.' : '') + ' This removes their sign-in, borrow history and reservations.';
    Modal.confirm('Bulk Delete', msg, async () => {
      let ok = 0, fail = 0;
      for (const u of users) {
        if (AppState.currentUser && String(AppState.currentUser.id) === String(u.id)) continue;
        try {
          if (AppState.isSupabaseConnected) {
            await Api.deleteUser(u.id);
          } else {
            const storedUsers = LoginPage.getStoredUsers();
            localStorage.setItem('library_users', JSON.stringify(storedUsers.filter(x => String(x.id) !== String(u.id))));
          }
          ok++;
        } catch (e) { fail++; }
      }
      if (AppState.isSupabaseConnected) { try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {} }
      this.selectedUsers.clear();
      this.refresh();
      Toast.success(`Deleted ${ok} user(s)${fail ? `, ${fail} failed` : ''}`);
    });
  },

  async approveUser(id, name) {
    if (AppState.isSupabaseConnected) {
      try {
        await Api.approveUser(id);
        await this._notifyUserApproved(id, name);
      } catch (e) {
        Toast.error('Failed to approve user: ' + (e.message || 'Unknown error'));
        return;
      }
      try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {}
    } else {
      const storedUsers = LoginPage.getStoredUsers();
      const u = storedUsers.find(x => String(x.id) === String(id));
      if (u) {
        u.approved = true;
        localStorage.setItem('library_users', JSON.stringify(storedUsers));
      }
    }
    Toast.success(`${name} has been approved and can now sign in.`);
    this.refresh();
  },

  async rejectUser(id, name) {
    Modal.confirm('Reject Registration', `Are you sure you want to reject "${name}"? This will delete their account.`, async () => {
      if (AppState.isSupabaseConnected) {
        try {
          await Api.rejectUser(id);
          try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {}
        } catch (e) {
          Toast.error('Failed to reject user: ' + (e.message || 'Unknown error'));
          return;
        }
      } else {
        const storedUsers = LoginPage.getStoredUsers();
        localStorage.setItem('library_users', JSON.stringify(storedUsers.filter(x => String(x.id) !== String(id))));
      }
      this.selectedUsers.delete(String(id));
      Toast.success(`${name} has been rejected.`);
      this.refresh();
    });
  },

  async _notifyUserApproved(userId, name) {
    try {
      const profile = await Api.getProfile(userId);
      const email = profile.email || '';
      await Api.createNotification({
        user_id: userId,
        type: 'success',
        title: 'Registration Approved',
        message: `Your account has been approved by the library. You can now sign in.`,
        icon: 'check-circle',
        read: false,
        time: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to notify approved user:', e);
    }
  },

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
          <select class="form-input" id="uf-role" onchange="AdminUsersPage.onAddRoleChange()">
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
        <div class="form-group"><label class="form-label">Class</label><input class="form-input" id="uf-class" placeholder="Class (for students)"></div>
        <div class="form-group">
          <label class="form-label">Password * <small style="color:var(--text-tertiary);font-weight:400;">(min 8 chars, upper+lower+number)</small></label>
          <input class="form-input" id="uf-password" type="password" placeholder="Set account password">
        </div>`,
      buttons: [
        { label: 'Add User', class: 'btn-primary', onClick: () => this._createUser() },
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'md'
    });
  },

  onAddRoleChange() {
    const role = document.getElementById('uf-role')?.value;
    const depEl = document.getElementById('uf-dept');
    const classEl = document.getElementById('uf-class');
    const gradeEl = document.getElementById('uf-grade');
    if (depEl) depEl.placeholder = role === 'student' ? 'Department' : (role === 'librarian' ? 'Library Department' : 'Department');
    if (gradeEl) gradeEl.placeholder = role === 'student' ? 'Grade (for students)' : 'Grade';
  },

  async _createUser() {
    const name = document.getElementById('uf-name')?.value?.trim();
    const email = document.getElementById('uf-email')?.value?.trim();
    const id = document.getElementById('uf-id')?.value?.trim();
    const role = document.getElementById('uf-role')?.value || 'student';
    const grade = document.getElementById('uf-grade')?.value?.trim() || '';
    const dept = document.getElementById('uf-dept')?.value?.trim() || '';
    const className = document.getElementById('uf-class')?.value?.trim() || '';
    const password = document.getElementById('uf-password')?.value || '';

    if (!name) { Toast.error('Name is required'); return; }
    if (!email) { Toast.error('Email is required'); return; }
    if (!password) { Toast.error('Password is required'); return; }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      Toast.error('Password must be at least 8 characters with uppercase, lowercase and a number');
      return;
    }

    if (AppState.isSupabaseConnected) {
      try {
        if (role === 'librarian' || role === 'admin') {
          await Api.addLibrarian({ email, password, name, role, department: role === 'admin' ? 'Administration' : dept });
        } else {
          const { data } = await Api.signUp(email, password, { name, role, user_id: id, ...(role === 'student' ? { grade } : { department: dept }) });
          if (data && data.user) {
            await Api.approveUser(data.user.id);
          }
        }
        try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {}
        Toast.success(`${role} account created successfully.`);
        Modal.hide();
        this.refresh();
      } catch (e) {
        Toast.error('Failed to create user: ' + (e.message || 'Unknown error'));
      }
    } else {
      const storedUsers = LoginPage.getStoredUsers();
      if (storedUsers.find(u => u.email === email)) { Toast.error('Email already registered'); return; }
      const newUser = { name, email, role, approved: true, grade, department: dept, className, password, id: id || Date.now().toString(), createdAt: new Date().toISOString(), borrowCount: 0, readingStreak: 0 };
      storedUsers.push(newUser);
      localStorage.setItem('library_users', JSON.stringify(storedUsers));
      Toast.success(`${role} account created successfully.`);
      Modal.hide();
      this.refresh();
    }
  },

  async deleteLibrarian(id, name) {
    if (AppState.currentUser && String(AppState.currentUser.id) === String(id)) {
      Toast.error('You cannot delete your own account.');
      return;
    }
    Modal.confirm('Delete Account', `Are you sure you want to permanently delete "${name}"? This cannot be undone and will also remove their sign-in, borrow history and reservations.`, async () => {
      try {
        if (AppState.isSupabaseConnected) {
          await Api.deleteUser(id);
          try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {}
        } else {
          const storedUsers = LoginPage.getStoredUsers();
          localStorage.setItem('library_users', JSON.stringify(storedUsers.filter(u => String(u.id) !== String(id))));
        }
        this.selectedUsers.delete(String(id));
        Toast.success(`${name} has been deleted.`);
        this.refresh();
      } catch (e) {
        Toast.error('Failed to delete user: ' + (e.message || 'Unknown error'));
      }
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

  // ── Bulk Import ──────────────────────────────────────────
  importState: { file: null, headers: [], data: [], mapping: {}, preview: [] },

  showImportModal() {
    this.importState = { file: null, headers: [], data: [], mapping: {}, preview: [] };
    Modal.show({
      title: 'Bulk Import Users',
      content: this._renderImportStep1(),
      buttons: [],
      size: 'lg'
    });
  },

  _renderImportStep1() {
    return `
      <div id="import-step1">
        <p style="color:var(--text-secondary);margin-bottom:1rem;">Upload a CSV or Excel (.xlsx) file with user data. Expected columns: <strong>Name, Email, Role</strong> (required). Optional: ID, Grade, Department, Class, Password.</p>
        <div id="import-dropzone" style="border:2px dashed var(--border-color);border-radius:12px;padding:2.5rem;text-align:center;cursor:pointer;transition:all 0.2s;" onclick="document.getElementById('import-file-input').click()" ondragover="event.preventDefault();this.style.borderColor='var(--accent-primary)';this.style.background='var(--bg-hover)'" ondragleave="this.style.borderColor='var(--border-color)';this.style.background=''" ondrop="event.preventDefault();this.style.borderColor='var(--border-color)';this.style.background='';AdminUsersPage.handleImportFile(event.dataTransfer.files[0])">
          <div style="color:var(--text-tertiary);margin-bottom:0.5rem;">${Utils.getIcon('upload', 40)}</div>
          <p style="font-weight:600;margin-bottom:0.25rem;">Click or drag file here</p>
          <p style="font-size:0.8rem;color:var(--text-tertiary);">Supports CSV, XLSX (max 5000 rows)</p>
        </div>
        <input type="file" id="import-file-input" accept=".csv,.xlsx,.xls" style="display:none" onchange="AdminUsersPage.handleImportFile(this.files[0])">
        <div id="import-preview-area" style="margin-top:1rem;"></div>
        <div style="margin-top:1rem;padding:0.75rem 1rem;background:var(--bg-tertiary);border-radius:8px;">
          <p style="font-size:0.8rem;color:var(--text-secondary);margin:0;"><strong>Template format:</strong> Name, Email, Role (student/teacher/librarian/admin), ID (optional), Grade (optional), Department (optional), Class (optional), Password (optional - auto-generated if blank)</p>
        </div>
      </div>`;
  },

  handleImportFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      Toast.error('Please upload a CSV or Excel file');
      return;
    }
    this.importState.file = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let workbook;
        if (ext === 'csv') {
          const text = e.target.result;
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          const data = new Uint8Array(e.target.result);
          workbook = XLSX.read(data, { type: 'array' });
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length === 0) {
          Toast.warning('File is empty or has no data rows');
          return;
        }
        const headers = Object.keys(json[0]);
        this.importState.headers = headers;
        this.importState.data = json.slice(0, 5000);
        this.importState.mapping = this._autoMapColumns(headers);
        this._renderImportStep2();
      } catch (err) {
        console.error('File parse error:', err);
        Toast.error('Failed to parse file. Please check the format.');
      }
    };
    if (ext === 'csv') reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  },

  _autoMapColumns(headers) {
    const mapping = {};
    const lower = headers.map(h => h.toLowerCase().trim());
    const find = (terms) => {
      const idx = lower.findIndex(h => terms.some(t => h === t || h.includes(t)));
      return idx >= 0 ? headers[idx] : '';
    };
    mapping.name    = find(['name', 'full name', 'student name', 'user name', 'nama']);
    mapping.email   = find(['email', 'e-mail', 'mail', 'email address']);
    mapping.role    = find(['role', 'type', 'user type', 'position']);
    mapping.id      = find(['id', 'user id', 'student id', 'roll', 'roll no', 'employee id']);
    mapping.grade   = find(['grade', 'class grade', 'section']);
    mapping.dept    = find(['department', 'dept', 'faculty']);
    mapping.className = find(['class', 'section', 'room', 'className']);
    mapping.password = find(['password', 'pass', 'pwd']);
    return mapping;
  },

  _renderImportStep2() {
    const { headers, mapping, data } = this.importState;
    const fields = [
      { key: 'name', label: 'Name *', required: true },
      { key: 'email', label: 'Email *', required: true },
      { key: 'role', label: 'Role *', required: true },
      { key: 'id', label: 'ID', required: false },
      { key: 'grade', label: 'Grade', required: false },
      { key: 'dept', label: 'Department', required: false },
      { key: 'className', label: 'Class', required: false },
      { key: 'password', label: 'Password', required: false }
    ];

    const mappingHtml = fields.map(f => `
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
        <label style="min-width:110px;font-size:0.85rem;font-weight:600;${f.required ? 'color:var(--text-primary);' : 'color:var(--text-secondary);'}">${f.label}</label>
        <select class="form-input" id="imap-${f.key}" style="flex:1;" onchange="AdminUsersPage.importState.mapping['${f.key}']=this.value">
          <option value="">-- Skip --</option>
          ${headers.map(h => `<option value="${h}" ${mapping[f.key] === h ? 'selected' : ''}>${h}</option>`).join('')}
        </select>
      </div>`).join('');

    const previewRows = data.slice(0, 5);
    const previewHtml = previewRows.length > 0 ? `
      <div style="overflow-x:auto;margin-top:1rem;">
        <table class="data-table" style="font-size:0.8rem;">
          <thead><tr>${headers.map(h => `<th>${Utils.escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>${previewRows.map(row => `<tr>${headers.map(h => `<td>${Utils.escapeHtml(String(row[h] || '').substring(0, 40))}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      <p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:0.5rem;">Showing first 5 of ${data.length} rows</p>` : '';

    document.getElementById('import-step1').innerHTML = `
      <div id="import-step2">
        <p style="color:var(--text-secondary);margin-bottom:1rem;">Map columns from <strong>${Utils.escapeHtml(this.importState.file.name)}</strong> (${data.length} rows found)</p>
        <div style="margin-bottom:1rem;">
          ${mappingHtml}
        </div>
        <div style="margin-bottom:1rem;">
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:0.35rem;">Default Role (if not mapped)</label>
          <select class="form-input" id="imap-default-role" style="max-width:220px;">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="librarian">Librarian</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style="margin-bottom:1rem;">
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:0.35rem;">Auto-approve accounts?</label>
          <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
            <input type="checkbox" id="imap-auto-approve" checked style="width:16px;height:16px;">
            <span style="font-size:0.85rem;">Yes, skip approval and activate immediately</span>
          </label>
        </div>
        <h4 style="margin:1rem 0 0.5rem;font-size:0.9rem;">Preview</h4>
        ${previewHtml}
        <div id="import-result-area" style="margin-top:1rem;"></div>
        <div style="display:flex;gap:0.75rem;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-color);">
          <button class="btn btn-outline" onclick="Modal.hide()">Cancel</button>
          <button class="btn btn-primary" id="import-run-btn" onclick="AdminUsersPage.runImport()">${Utils.getIcon('upload', 16)} Import ${data.length} Users</button>
        </div>
      </div>`;
  },

  async runImport() {
    const { data, mapping } = this.importState;
    const defaultRole = document.getElementById('imap-default-role')?.value || 'student';
    const autoApprove = document.getElementById('imap-auto-approve')?.checked !== false;
    const runBtn = document.getElementById('import-run-btn');
    if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;"></span> Importing...'; }
    const resultArea = document.getElementById('import-result-area');

    const existingUsers = AppState.isSupabaseConnected && AppState.allProfiles
      ? AppState.allProfiles
      : (LoginPage.getStoredUsers ? LoginPage.getStoredUsers() : []);

    const existingEmails = new Set(existingUsers.map(u => (u.email || '').toLowerCase()));
    const existingIds = new Set(existingUsers.filter(u => u.id).map(u => String(u.id)));

    let imported = 0, skipped = 0, failed = 0, errors = [], importedMembers = [];

    for (const row of data) {
      const name  = mapping.name ? String(row[mapping.name] || '').trim() : '';
      const email = mapping.email ? String(row[mapping.email] || '').trim().toLowerCase() : '';
      const roleRaw = mapping.role ? String(row[mapping.role] || '').trim().toLowerCase() : defaultRole;
      const role  = ['student','teacher','librarian','admin'].includes(roleRaw) ? roleRaw : defaultRole;
      const userId  = mapping.id ? String(row[mapping.id] || '').trim() : '';
      const grade   = mapping.grade ? String(row[mapping.grade] || '').trim() : '';
      const dept    = mapping.dept ? String(row[mapping.dept] || '').trim() : '';
      const phone   = mapping.phone ? String(row[mapping.phone] || '').trim() : '';
      const className = mapping.className ? String(row[mapping.className] || '').trim() : '';
      const password = mapping.password ? String(row[mapping.password] || '').trim() : '';

      if (!name || !email) { skipped++; continue; }
      if (existingEmails.has(email)) { skipped++; continue; }
      if (userId && existingIds.has(userId)) { skipped++; continue; }

      const generatedPassword = password || (name.substring(0, 4).replace(/\s/g, '') + '12345678');

      try {
        if (AppState.isSupabaseConnected) {
          if (role === 'librarian' || role === 'admin') {
            await Api.addLibrarian({ email, password: generatedPassword, name, role, department: dept || 'Library' });
          } else {
            const result = await Api.signUp(email, generatedPassword, {
              name, role, user_id: userId || undefined,
              ...(role === 'student' ? { grade } : { department: dept })
            });
            if (result && result.user && autoApprove) {
              try { await Api.approveUser(result.user.id); } catch (e) {}
            }
          }
        } else {
          const storedUsers = LoginPage.getStoredUsers ? LoginPage.getStoredUsers() : [];
          storedUsers.push({
            id: userId || Date.now().toString() + Math.random().toString(36).substring(2, 6),
            name, email, role, approved: autoApprove,
            grade, department: dept, className,
            password: generatedPassword,
            createdAt: new Date().toISOString(),
            borrowCount: 0, readingStreak: 0
          });
          localStorage.setItem('library_users', JSON.stringify(storedUsers));
        }
        existingEmails.add(email);
        if (userId) existingIds.add(userId);
        imported++;
        importedMembers.push({
          id: userId || (AppState.isSupabaseConnected
            ? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })
            : Date.now().toString() + Math.random().toString(36).substring(2, 6)),
          name, email, grade, class: className,
          role: role === 'teacher' ? 'teacher' : 'student',
          phone, avatar: name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          borrowCount: 0, readingStreak: 0, isOffline: true
        });
      } catch (e) {
        failed++;
        if (errors.length < 5) errors.push(`${name}: ${e.message || 'Unknown error'}`);
      }
    }

    if (AppState.isSupabaseConnected) {
      try { AppState.allProfiles = await Api.getAllProfiles(); } catch (e) {}
    }

    if (importedMembers.length) {
      const offlinePool = Array.isArray(AppState.offlineUsers) ? AppState.offlineUsers : [];
      const seenEmails = new Set(offlinePool.map(u => (u.email || '').toLowerCase()));
      const seenIds = new Set(offlinePool.map(u => String(u.id)));
      importedMembers.forEach(u => {
        const emailKey = (u.email || '').toLowerCase();
        if (emailKey && seenEmails.has(emailKey)) return;
        if (u.id && seenIds.has(String(u.id))) return;
        offlinePool.push(u);
        if (emailKey) seenEmails.add(emailKey);
        if (u.id) seenIds.add(String(u.id));
      });
      AppState.offlineUsers = offlinePool;
      try { localStorage.setItem('library_offlineUsers', JSON.stringify(offlinePool)); } catch (e) {}
      if (typeof LIBRARY_DATA !== 'undefined' && LIBRARY_DATA.students) {
        importedMembers.forEach(u => {
          if (!LIBRARY_DATA.students.some(s => s.email && u.email && String(s.email).toLowerCase() === String(u.email).toLowerCase())) {
            LIBRARY_DATA.students.push(u);
          }
        });
      }
    }

    if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = `${Utils.getIcon('upload', 16)} Import Done`; }
    if (resultArea) {
      resultArea.innerHTML = `
        <div style="padding:1rem;border-radius:8px;background:var(--bg-tertiary);">
          <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:${errors.length ? '0.75rem' : '0'};">
            <span style="font-size:0.9rem;"><strong style="color:var(--success);">${imported}</strong> imported</span>
            <span style="font-size:0.9rem;"><strong style="color:var(--warning);">${skipped}</strong> skipped (duplicates or empty)</span>
            ${failed ? `<span style="font-size:0.9rem;"><strong style="color:var(--danger);">${failed}</strong> failed</span>` : ''}
          </div>
          ${errors.length ? `<div style="font-size:0.8rem;color:var(--danger);">${errors.map(e => `<div>- ${Utils.escapeHtml(e)}</div>`).join('')}</div>` : ''}
        </div>`;
    }
    Toast.success(`Import complete: ${imported} added, ${skipped} skipped${failed ? `, ${failed} failed` : ''}`);
  },

  afterRender() {
    this.updateBulkBar();
  }
};
