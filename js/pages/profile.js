const ProfilePage = {
  activeTab: 'overview',
  settingsState: {
    theme: 'light',
    notifications: true,
    emailNotifications: true,
    eventReminders: true,
    dueDateReminders: true
  },
  render(params) {
    const user = AppState.currentUser || { name: 'Guest User', role: 'student', email: 'guest@school.edu', id: '0', phone: '' };
    const borrowed = AppState.borrowedBooks || [];
    const completed = borrowed.filter(b => b.status === 'returned');
    const active = borrowed.filter(b => b.status === 'active' || b.status === 'borrowed');
    const streak = LIBRARY_DATA.readingStreaks || [];
    const userStreak = streak.find(s => s.studentId === user.id);
    const currentStreak = userStreak ? userStreak.streak : 0;
    const longestStreak = userStreak ? (userStreak.longestStreak || currentStreak) : 0;
    const achievements = LIBRARY_DATA.achievements || [];
    const favorites = AppState.favorites || [];
    const recentlyViewed = AppState.recentlyViewed || [];
    const reviews = AppState.reviews || [];
    const allBooks = AppState.books || [];
    const totalFine = active.reduce((sum, b) => sum + (b.fine || 0), 0);
    const initials = this.getInitials(user.name);
    const memberSince = user.joinDate || user.memberSince || '2024-01-15';
    const categoryCounts = {};
    completed.forEach(b => {
      const book = allBooks.find(x => x.id === b.bookId) || b;
      const cat = book.category || book.genre || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const favoriteCategory = Object.keys(categoryCounts).length ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
    const savedSettings = localStorage.getItem('library_settings');
    if (savedSettings) try { Object.assign(this.settingsState, JSON.parse(savedSettings)); } catch (e) {}
    const tabs = [
      { id: 'overview', label: 'Overview', icon: 'user' },
      { id: 'activity', label: 'Activity', icon: 'activity' },
      { id: 'settings', label: 'Settings', icon: 'settings' }
    ];
    return `
      <div style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));padding:2.5rem 0 4rem;color:#fff;">
        <div class="container" style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;">
          <div style="width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.2);border:3px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:700;flex-shrink:0;">
            ${Utils.escapeHtml(initials)}
          </div>
          <div style="flex:1;min-width:200px;">
            <h1 style="margin:0 0 0.25rem;color:#fff;font-size:1.75rem;">${Utils.escapeHtml(user.name)}</h1>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.35rem;">
              <span class="badge badge-light" style="background:rgba(255,255,255,0.2);color:#fff;text-transform:capitalize;">${Utils.escapeHtml(user.role)}</span>
              ${user.grade || user.class ? `<span style="opacity:0.85;font-size:0.9rem;">${Utils.escapeHtml(user.grade || user.class)}</span>` : ''}
              ${user.department ? `<span style="opacity:0.85;font-size:0.9rem;">Dept: ${Utils.escapeHtml(user.department)}</span>` : ''}
            </div>
            <p style="margin:0;font-size:0.85rem;opacity:0.75;">Member since ${Utils.formatDate(memberSince)}</p>
          </div>
          <button class="btn" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);" onclick="ProfilePage.editProfile()">
            ${Utils.getIcon('edit-2', 16)} Edit Profile
          </button>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="margin-top:-1.5rem;position:relative;z-index:1;">
          <div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:1.5rem;background:var(--bg-primary);border-radius:12px 12px 0 0;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            ${tabs.map(tab => `
              <button class="btn btn-ghost" style="flex:1;padding:1rem;border:none;border-radius:0;font-weight:600;color:${this.activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)'};background:${this.activeTab === tab.id ? 'var(--primary-light)' : 'transparent'};border-bottom:2px solid ${this.activeTab === tab.id ? 'var(--primary)' : 'transparent'};margin-bottom:-2px;transition:all 0.2s;" onclick="ProfilePage.switchTab('${tab.id}')">
                ${Utils.getIcon(tab.icon, 16)} ${tab.label}
              </button>
            `).join('')}
          </div>
          ${this.activeTab === 'overview' ? this.renderOverview(user, completed, active, currentStreak, longestStreak, achievements, favorites, totalFine, favoriteCategory, reviews, recentlyViewed) : ''}
          ${this.activeTab === 'activity' ? this.renderActivity(borrowed, reviews, favorites, recentlyViewed, allBooks) : ''}
          ${this.activeTab === 'settings' ? this.renderSettings(user) : ''}
        </div>
      </div>`;
  },
  renderOverview(user, completed, active, currentStreak, longestStreak, achievements, favorites, totalFine, favoriteCategory, reviews, recentlyViewed) {
    return `
      <div class="grid-2" style="margin-bottom:2rem;">
        <div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('credit-card', 18)} Membership Card</h2></div>
          <div class="card" style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;padding:1.75rem;border-radius:16px;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
            <div style="position:absolute;bottom:-30px;left:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
            <div style="position:relative;z-index:1;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.25rem;">
                <div>
                  <p style="margin:0;font-size:0.75rem;opacity:0.7;text-transform:uppercase;letter-spacing:1px;">Student ID</p>
                  <p style="margin:0.25rem 0 0;font-size:1.15rem;font-weight:700;">${Utils.escapeHtml(user.studentId || user.id || 'STU-0000')}</p>
                </div>
                <div style="width:50px;height:50px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                  ${Utils.getIcon('qr-code', 28)}
                </div>
              </div>
              <p style="margin:0;font-size:1rem;font-weight:600;">${Utils.escapeHtml(user.name)}</p>
              <p style="margin:0.15rem 0 0;font-size:0.8rem;opacity:0.75;text-transform:capitalize;">${Utils.escapeHtml(user.role)} Library Member</p>
            </div>
          </div>
        </div>
        <div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('bar-chart-2', 18)} Reading Statistics</h2></div>
          <div class="grid-2" style="margin-bottom:1rem;">
            <div class="card" style="padding:1.25rem;text-align:center;">
              <div style="font-size:1.75rem;font-weight:700;color:var(--primary);">${completed.length}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.15rem;">Books Read</div>
            </div>
            <div class="card" style="padding:1.25rem;text-align:center;">
              <div style="font-size:1.75rem;font-weight:700;color:#f59e0b;">${currentStreak}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.15rem;">Day Streak</div>
            </div>
            <div class="card" style="padding:1.25rem;text-align:center;">
              <div style="font-size:1.75rem;font-weight:700;color:#10b981;">${favoriteCategory}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.15rem;">Top Category</div>
            </div>
            <div class="card" style="padding:1.25rem;text-align:center;">
              <div style="font-size:1.75rem;font-weight:700;color:${totalFine > 0 ? '#ef4444' : '#10b981'};">$${totalFine.toFixed(2)}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.15rem;">Fine Balance</div>
            </div>
          </div>
          <div class="card" style="padding:1.25rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <p style="margin:0;font-weight:600;">Active Borrows</p>
                <p style="margin:0.2rem 0 0;font-size:0.8rem;color:var(--text-secondary);">${active.length} book${active.length !== 1 ? 's' : ''} currently borrowed</p>
              </div>
              <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);">
                ${Utils.getIcon('book-open', 22)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('award', 18)} Achievement Badges</h2></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;margin-bottom:2rem;">
        ${achievements.length ? achievements.map(a => {
          const earned = completed.length >= (a.required || 0);
          return `<div class="card" style="text-align:center;opacity:${earned ? 1 : 0.35};padding:1.25rem;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">${Utils.getIcon(a.icon || 'award', 32)}</div>
            <h4 style="margin:0 0 0.25rem;font-size:0.85rem;">${Utils.escapeHtml(a.name)}</h4>
            <p style="margin:0;font-size:0.7rem;color:var(--text-secondary);">${Utils.escapeHtml(a.description || '')}</p>
            ${earned ? '<span class="badge badge-success" style="margin-top:0.5rem;font-size:0.7rem;">Earned</span>' : '<span class="badge" style="margin-top:0.5rem;font-size:0.7rem;">Locked</span>'}
          </div>`;
        }).join('') : '<p style="color:var(--text-secondary);">No achievements available yet.</p>'}
      </div>
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('clock', 18)} Recent Activity</h2></div>
      ${borrowed.length > 0 ? `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Book</th><th>Date</th><th>Status</th></tr></thead><tbody>${borrowed.slice(-5).reverse().map(b => {
        const book = (AppState.books || []).find(x => x.id === b.bookId) || b;
        return `<tr><td style="display:flex;align-items:center;gap:0.75rem;">${Utils.getBookCover(book)}<div><strong>${Utils.escapeHtml(book.title)}</strong></div></td><td>${Utils.formatDate(b.borrowDate)}</td><td>${Utils.getStatusBadge(b.status)}</td></tr>`;
      }).join('')}</tbody></table></div></div>` : '<div class="empty-state"><p>No recent activity.</p></div>'}`;
  },
  renderActivity(borrowed, reviews, favorites, recentlyViewed, allBooks) {
    const sorted = [...borrowed].sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('book-open', 18)} Borrow History</h2></div>
      ${sorted.length ? sorted.map(b => {
        const book = allBooks.find(x => x.id === b.bookId) || b;
        return `
          <div class="card" style="padding:1rem 1.25rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:1rem;">
            <div style="width:48px;height:64px;border-radius:6px;background:var(--bg-secondary);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
              ${Utils.getBookCover(book)}
            </div>
            <div style="flex:1;min-width:0;">
              <h4 style="margin:0;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(book.title)}</h4>
              <p style="margin:0.15rem 0 0;font-size:0.8rem;color:var(--text-secondary);">Borrowed: ${Utils.formatDate(b.borrowDate)}${b.returnDate ? ' | Returned: ' + Utils.formatDate(b.returnDate) : ''}</p>
            </div>
            ${Utils.getStatusBadge(b.status)}
          </div>`;
      }).join('') : '<div class="empty-state"><p>No borrow history yet.</p></div>'}
      <div style="margin-top:2rem;">
        <div class="section-header"><h2 class="section-title">${Utils.getIcon('message-square', 18)} Reviews Written</h2></div>
        ${reviews.length ? reviews.map(r => `
          <div class="card" style="padding:1.25rem;margin-bottom:0.75rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
              <h4 style="margin:0;">${Utils.escapeHtml(r.bookTitle || 'Book Review')}</h4>
              <div style="color:#f59e0b;display:flex;gap:2px;">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
            </div>
            <p style="margin:0;font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">${Utils.escapeHtml(r.content || r.text || '')}</p>
            <p style="margin:0.5rem 0 0;font-size:0.75rem;color:var(--text-tertiary);">${Utils.formatDate(r.date)}</p>
          </div>
        `).join('') : '<div class="empty-state"><p>No reviews written yet.</p></div>'}
      </div>
      <div style="margin-top:2rem;">
        <div class="section-header"><h2 class="section-title">${Utils.getIcon('heart', 18)} Favorites</h2></div>
        ${favorites.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">${favorites.map(fav => {
          const book = allBooks.find(x => x.id === fav) || { title: 'Unknown Book' };
          return `<div class="card" style="padding:1rem;">
            <div style="width:100%;height:100px;border-radius:8px;background:var(--bg-secondary);margin-bottom:0.75rem;overflow:hidden;display:flex;align-items:center;justify-content:center;">${Utils.getBookCover(book)}</div>
            <h4 style="margin:0 0 0.25rem;font-size:0.9rem;">${Utils.escapeHtml(book.title)}</h4>
          </div>`;
        }).join('')}</div>` : '<div class="empty-state"><p>No favorites yet.</p></div>'}
      </div>
      <div style="margin-top:2rem;">
        <div class="section-header"><h2 class="section-title">${Utils.getIcon('eye', 18)} Recently Viewed</h2></div>
        ${recentlyViewed.length ? `<div style="display:flex;gap:0.75rem;overflow-x:auto;padding-bottom:0.5rem;">${recentlyViewed.slice(0, 10).map(rv => {
          const book = allBooks.find(x => x.id === rv) || { title: 'Unknown' };
          return `<div class="card" style="min-width:140px;padding:0.75rem;flex-shrink:0;">
            <div style="width:100%;height:80px;border-radius:6px;background:var(--bg-secondary);margin-bottom:0.5rem;overflow:hidden;display:flex;align-items:center;justify-content:center;">${Utils.getBookCover(book)}</div>
            <p style="margin:0;font-size:0.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(book.title)}</p>
          </div>`;
        }).join('')}</div>` : '<div class="empty-state"><p>No recently viewed books.</p></div>'}
      </div>`;
  },
  renderSettings(user) {
    return `
      <div class="grid-2">
        <div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('user', 18)} Personal Information</h2></div>
          <div class="card" style="margin-bottom:1.5rem;">
            <div style="padding:1.5rem;">
              <div class="form-group"><label class="form-label">Full Name</label><div style="display:flex;gap:0.5rem;"><input class="form-input" id="settings-name" value="${Utils.escapeHtml(user.name || '')}"><button class="btn btn-primary" onclick="ProfilePage.updateName()">${Utils.getIcon('check', 16)}</button></div></div>
              <div class="form-group"><label class="form-label">Email Address</label><div style="display:flex;gap:0.5rem;"><input class="form-input" id="settings-email" type="email" value="${Utils.escapeHtml(user.email || '')}"><button class="btn btn-primary" onclick="ProfilePage.updateEmail()">${Utils.getIcon('check', 16)}</button></div></div>
            </div>
          </div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('lock', 18)} Change Password</h2></div>
          <div class="card" style="margin-bottom:1.5rem;">
            <div style="padding:1.5rem;">
              <div class="form-group"><label class="form-label">Current Password</label><input class="form-input" id="settings-current-password" type="password" placeholder="Enter current password"></div>
              <div class="form-group"><label class="form-label">New Password</label><input class="form-input" id="settings-new-password" type="password" placeholder="Enter new password"></div>
              <div class="form-group"><label class="form-label">Confirm New Password</label><input class="form-input" id="settings-confirm-password" type="password" placeholder="Confirm new password"></div>
              <button class="btn btn-primary" onclick="ProfilePage.changePassword()" style="width:100%;">${Utils.getIcon('key', 16)} Update Password</button>
            </div>
          </div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('alert-triangle', 18)} Danger Zone</h2></div>
          <div class="card" style="border:1px solid #ef4444;">
            <div style="padding:1.5rem;">
              <h4 style="margin:0 0 0.35rem;color:#ef4444;">Delete Account</h4>
              <p style="margin:0 0 1rem;font-size:0.85rem;color:var(--text-secondary);">This action is irreversible. All your data, history, and achievements will be permanently removed.</p>
              <button class="btn btn-danger" onclick="ProfilePage.confirmDeleteAccount()">${Utils.getIcon('trash-2', 16)} Delete My Account</button>
            </div>
          </div>
        </div>
        <div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('bell', 18)} Notification Preferences</h2></div>
          <div class="card" style="margin-bottom:1.5rem;">
            <div style="padding:1.5rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
                <div><p style="margin:0;font-weight:600;">Push Notifications</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Receive push alerts for library updates</p></div>
                <label class="toggle"><input type="checkbox" ${this.settingsState.notifications ? 'checked' : ''} onchange="ProfilePage.toggleSetting('notifications', this.checked)"><span class="toggle-slider"></span></label>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
                <div><p style="margin:0;font-weight:600;">Email Notifications</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Receive email alerts for overdue books</p></div>
                <label class="toggle"><input type="checkbox" ${this.settingsState.emailNotifications ? 'checked' : ''} onchange="ProfilePage.toggleSetting('emailNotifications', this.checked)"><span class="toggle-slider"></span></label>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
                <div><p style="margin:0;font-weight:600;">Event Reminders</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Get reminders for upcoming library events</p></div>
                <label class="toggle"><input type="checkbox" ${this.settingsState.eventReminders ? 'checked' : ''} onchange="ProfilePage.toggleSetting('eventReminders', this.checked)"><span class="toggle-slider"></span></label>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;">
                <div><p style="margin:0;font-weight:600;">Due Date Reminders</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Remind me before books are due</p></div>
                <label class="toggle"><input type="checkbox" ${this.settingsState.dueDateReminders ? 'checked' : ''} onchange="ProfilePage.toggleSetting('dueDateReminders', this.checked)"><span class="toggle-slider"></span></label>
              </div>
            </div>
          </div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('palette', 18)} Theme Preference</h2></div>
          <div class="card">
            <div style="padding:1.5rem;">
              <div style="display:flex;gap:0.75rem;">
                ${['light', 'dark', 'system'].map(theme => `
                  <button class="btn ${this.settingsState.theme === theme ? 'btn-primary' : 'btn-outline'}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0.35rem;padding:1rem;" onclick="ProfilePage.setTheme('${theme}')">
                    ${Utils.getIcon(theme === 'light' ? 'sun' : theme === 'dark' ? 'moon' : 'monitor', 20)}
                    <span style="text-transform:capitalize;">${theme}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },
  getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  },
  switchTab(tabId) {
    this.activeTab = tabId;
    Router.resolve();
  },
  toggleSetting(key, value) {
    this.settingsState[key] = value;
    localStorage.setItem('library_settings', JSON.stringify(this.settingsState));
    Toast.success('Preference updated');
  },
  setTheme(theme) {
    this.settingsState.theme = theme;
    localStorage.setItem('library_settings', JSON.stringify(this.settingsState));
    if (theme !== 'system') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
    Router.resolve();
    Toast.success('Theme updated to ' + theme);
  },
  editProfile() {
    const user = AppState.currentUser || {};
    Modal.show({
      title: 'Edit Profile',
      content: `
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="edit-name" value="${Utils.escapeHtml(user.name || '')}"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="edit-email" value="${Utils.escapeHtml(user.email || '')}" type="email"></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="edit-phone" value="${Utils.escapeHtml(user.phone || '')}"></div>`,
      buttons: [
        { label: 'Save', class: 'btn-primary', onClick: async () => {
          const name = document.getElementById('edit-name')?.value?.trim();
          const email = document.getElementById('edit-email')?.value?.trim();
          const phone = document.getElementById('edit-phone')?.value?.trim();
          if (!name) { Toast.error('Name is required'); return; }
          const updates = { name: name };
          if (email) updates.email = email;
          if (phone) updates.phone = phone;
          if (AppState.isSupabaseConnected && AppState.currentUser?.id) {
            try {
              await Api.updateProfile(AppState.currentUser.id, updates);
            } catch (e) {
              console.error('Supabase updateProfile failed:', e);
              Toast.error('Failed to update profile: ' + (e.message || 'Unknown error'));
              return;
            }
          }
          Object.assign(AppState.currentUser, updates);
          AppState.saveAll();
          Toast.success('Profile updated successfully!');
          Modal.hide();
          Router.resolve();
        }},
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'md'
    });
  },
  async updateName() {
    const input = document.getElementById('settings-name');
    if (!input || !input.value.trim()) {
      Toast.error('Please enter a valid name.');
      return;
    }
    if (AppState.isSupabaseConnected && AppState.currentUser?.id) {
      try {
        await Api.updateProfile(AppState.currentUser.id, { name: input.value.trim() });
      } catch (e) {
        console.error('Supabase updateProfile failed:', e);
        Toast.error('Failed to update name: ' + (e.message || 'Unknown error'));
        return;
      }
    }
    AppState.currentUser.name = input.value.trim();
    AppState.saveAll();
    Toast.success('Name updated successfully!');
    Router.resolve();
  },
  async updateEmail() {
    const input = document.getElementById('settings-email');
    if (!input || !input.value.trim() || !input.value.includes('@')) {
      Toast.error('Please enter a valid email address.');
      return;
    }
    if (AppState.isSupabaseConnected && AppState.currentUser?.id) {
      try {
        await Api.updateProfile(AppState.currentUser.id, { email: input.value.trim() });
      } catch (e) {
        console.error('Supabase updateProfile failed:', e);
        Toast.error('Failed to update email: ' + (e.message || 'Unknown error'));
        return;
      }
    }
    AppState.currentUser.email = input.value.trim();
    AppState.saveAll();
    Toast.success('Email updated successfully!');
    Router.resolve();
  },
  async changePassword() {
    const current = document.getElementById('settings-current-password');
    const newPass = document.getElementById('settings-new-password');
    const confirm = document.getElementById('settings-confirm-password');
    if (!current || !current.value) {
      Toast.error('Please enter your current password.');
      return;
    }
    if (!newPass || !newPass.value || newPass.value.length < 6) {
      Toast.error('New password must be at least 6 characters.');
      return;
    }
    if (!confirm || newPass.value !== confirm.value) {
      Toast.error('Passwords do not match.');
      return;
    }
    if (AppState.isSupabaseConnected) {
      try {
        await Api.updatePassword(newPass.value);
      } catch (e) {
        console.error('Supabase password update failed:', e);
        Toast.error('Failed to update password: ' + (e.message || 'Unknown error'));
        return;
      }
    }
    Toast.success('Password updated successfully!');
    if (current) current.value = '';
    if (newPass) newPass.value = '';
    if (confirm) confirm.value = '';
  },
  confirmDeleteAccount() {
    Modal.show({
      title: 'Delete Account',
      content: `<p>Are you absolutely sure you want to delete your account? This action cannot be undone.</p><p style="color:#ef4444;font-weight:600;margin-top:0.5rem;">All your data, reading history, achievements, and reviews will be permanently deleted.</p>`,
      buttons: [
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() },
        { label: 'Delete Account', class: 'btn-danger', onClick: () => { Toast.success('Account deleted.'); Modal.hide(); } }
      ],
      size: 'md'
    });
  },
  afterRender() {}
};
