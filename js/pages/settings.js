const SettingsPage = {
  settings: {
    theme: 'light',
    notifications: true,
    emailNotifications: true,
    dueReminders: true,
    announcements: true,
    language: 'en',
    fontSize: 'medium',
    privacyShareData: false,
    privacyActivityLog: true
  },
  render() {
    const saved = localStorage.getItem('library_settings');
    if (saved) try { Object.assign(this.settings, JSON.parse(saved)); } catch (e) {}
    const user = AppState.currentUser || {};
    const hours = [
      { day: 'Monday - Friday', hours: '8:00 AM - 4:00 PM' },
      { day: 'Saturday', hours: '9:00 AM - 1:00 PM' },
      { day: 'Sunday', hours: 'Closed' }
    ];
    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('settings', 28)} Settings</h1>
          <p class="page-description">Customize your library experience</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;max-width:800px;margin:0 auto;">

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('user', 18)} Account Settings</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1.5rem;">
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;padding-bottom:1.25rem;border-bottom:1px solid var(--border);">
              <div style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;">${(user.name || 'U').charAt(0).toUpperCase()}</div>
              <div>
                <p style="margin:0;font-weight:700;font-size:1.05rem;">${Utils.escapeHtml(user.name || 'User')}</p>
                <p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">${Utils.escapeHtml(user.email || 'user@school.edu')}</p>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input class="form-input" id="setting-name" value="${Utils.escapeHtml(user.name || '')}" placeholder="Enter your name">
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input class="form-input" id="setting-email" type="email" value="${Utils.escapeHtml(user.email || '')}" placeholder="Enter your email">
            </div>
            <button class="btn btn-primary btn-sm" onclick="SettingsPage.saveAccount()" style="margin-top:0.5rem;">${Utils.getIcon('save', 16)} Save Changes</button>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('bell', 18)} Notification Preferences</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1.5rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
              <div><p style="margin:0;font-weight:600;">Push Notifications</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Receive in-app notifications</p></div>
              <label class="toggle"><input type="checkbox" ${this.settings.notifications ? 'checked' : ''} onchange="SettingsPage.updateSetting('notifications', this.checked)"><span class="toggle-slider"></span></label>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
              <div><p style="margin:0;font-weight:600;">Email Notifications</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Receive email alerts for overdue books</p></div>
              <label class="toggle"><input type="checkbox" ${this.settings.emailNotifications ? 'checked' : ''} onchange="SettingsPage.updateSetting('emailNotifications', this.checked)"><span class="toggle-slider"></span></label>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
              <div><p style="margin:0;font-weight:600;">Due Reminders</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Get reminders before books are due</p></div>
              <label class="toggle"><input type="checkbox" ${this.settings.dueReminders ? 'checked' : ''} onchange="SettingsPage.updateSetting('dueReminders', this.checked)"><span class="toggle-slider"></span></label>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;">
              <div><p style="margin:0;font-weight:600;">Announcements</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Receive library announcements and news</p></div>
              <label class="toggle"><input type="checkbox" ${this.settings.announcements ? 'checked' : ''} onchange="SettingsPage.updateSetting('announcements', this.checked)"><span class="toggle-slider"></span></label>
            </div>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('palette', 18)} Appearance</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1.5rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
              <div><p style="margin:0;font-weight:600;">Theme</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Choose your preferred theme</p></div>
              <select class="form-input" style="width:auto;" id="setting-theme" onchange="SettingsPage.updateSetting('theme', this.value)">
                <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="system" ${this.settings.theme === 'system' ? 'selected' : ''}>System</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;">
              <div><p style="margin:0;font-weight:600;">Font Size</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Adjust the text size</p></div>
              <select class="form-input" style="width:auto;" id="setting-fontsize" onchange="SettingsPage.updateSetting('fontSize', this.value)">
                <option value="small" ${this.settings.fontSize === 'small' ? 'selected' : ''}>Small</option>
                <option value="medium" ${this.settings.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="large" ${this.settings.fontSize === 'large' ? 'selected' : ''}>Large</option>
              </select>
            </div>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('globe', 18)} Language</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1.5rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;">
              <div><p style="margin:0;font-weight:600;">Preferred Language</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Select your preferred language</p></div>
              <select class="form-input" style="width:auto;" id="setting-language" onchange="SettingsPage.updateSetting('language', this.value)">
                <option value="en" ${this.settings.language === 'en' ? 'selected' : ''}>English</option>
                <option value="es" ${this.settings.language === 'es' ? 'selected' : ''}>Spanish</option>
                <option value="fr" ${this.settings.language === 'fr' ? 'selected' : ''}>French</option>
                <option value="ur" ${this.settings.language === 'ur' ? 'selected' : ''}>Urdu</option>
              </select>
            </div>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('shield', 18)} Privacy Settings</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1.5rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
              <div><p style="margin:0;font-weight:600;">Share Reading Activity</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Allow others to see your reading activity</p></div>
              <label class="toggle"><input type="checkbox" ${this.settings.privacyShareData ? 'checked' : ''} onchange="SettingsPage.updateSetting('privacyShareData', this.checked)"><span class="toggle-slider"></span></label>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;">
              <div><p style="margin:0;font-weight:600;">Activity Log</p><p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Keep a log of your library activity</p></div>
              <label class="toggle"><input type="checkbox" ${this.settings.privacyActivityLog ? 'checked' : ''} onchange="SettingsPage.updateSetting('privacyActivityLog', this.checked)"><span class="toggle-slider"></span></label>
            </div>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('monitor', 18)} Session Management</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1.5rem;">
            <div class="card" style="background:var(--bg-secondary);padding:1rem;margin-bottom:1rem;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  ${Utils.getIcon('monitor', 20)}
                  <div>
                    <p style="margin:0;font-weight:600;font-size:0.9rem;">Current Session</p>
                    <p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">This device - Active now</p>
                  </div>
                </div>
                <span class="badge badge-success">Active</span>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.logoutAll()" style="width:100%;">${Utils.getIcon('log-out', 16)} Logout All Other Sessions</button>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('clock', 18)} Library Hours</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div class="table-wrap"><table class="data-table"><thead><tr><th>Day</th><th>Hours</th></tr></thead><tbody>${hours.map(h => `<tr><td style="font-weight:600;">${Utils.escapeHtml(h.day)}</td><td>${Utils.escapeHtml(h.hours)}</td></tr>`).join('')}</tbody></table></div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('database', 18)} Data Management</h2></div>
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1.5rem;display:flex;gap:1rem;flex-wrap:wrap;">
            <button class="btn btn-outline" onclick="SettingsPage.exportData()">${Utils.getIcon('download', 16)} Export Data</button>
            <button class="btn btn-outline" onclick="SettingsPage.importData()">${Utils.getIcon('upload', 16)} Import Data</button>
            <button class="btn btn-outline" onclick="SettingsPage.clearData()">${Utils.getIcon('trash-2', 16)} Clear Local Data</button>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title" style="color:var(--danger);">${Utils.getIcon('alert-triangle', 18)} Danger Zone</h2></div>
        <div class="card" style="border:1px solid var(--danger);margin-bottom:2rem;">
          <div style="padding:1.5rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
              <div>
                <p style="margin:0;font-weight:600;">Delete Account</p>
                <p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">Permanently delete your account and all associated data. This action cannot be undone.</p>
              </div>
              <button class="btn btn-danger btn-sm" onclick="SettingsPage.deleteAccount()">${Utils.getIcon('trash-2', 16)} Delete Account</button>
            </div>
          </div>
        </div>
      </div>`;
  },
  updateSetting(key, value) {
    this.settings[key] = value;
    localStorage.setItem('library_settings', JSON.stringify(this.settings));
    if (key === 'theme') {
      if (value === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', value);
      }
    }
    Toast.success('Setting updated');
  },
  saveAccount() {
    const name = document.getElementById('setting-name');
    const email = document.getElementById('setting-email');
    if (name && name.value.trim() && AppState.currentUser) {
      AppState.currentUser.name = name.value.trim();
    }
    if (email && email.value.trim() && AppState.currentUser) {
      AppState.currentUser.email = email.value.trim();
    }
    Toast.success('Account updated successfully');
  },
  logoutAll() {
    Modal.confirm('Logout All Sessions', 'This will log you out from all other devices. Continue?', () => {
      Toast.success('All other sessions have been logged out');
    });
  },
  deleteAccount() {
    Modal.confirm('Delete Account', 'This will permanently delete your account and all data. This action cannot be undone. Are you sure?', () => {
      Toast.success('Account deletion requested');
    });
  },
  exportData() {
    const data = JSON.stringify({
      settings: this.settings,
      favorites: AppState.favorites,
      borrowRequests: AppState.borrowRequests,
      borrowHistory: AppState.borrowHistory,
      reservations: AppState.reservations,
      notifications: AppState.notifications,
      finePayments: AppState.finePayments,
      recentlyViewed: AppState.recentlyViewed
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'library-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Data exported successfully');
  },
  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.settings) {
            Object.assign(this.settings, data.settings);
            localStorage.setItem('library_settings', JSON.stringify(this.settings));
          }
          if (data.favorites) {
            AppState.favorites = data.favorites;
            localStorage.setItem('library_favorites', JSON.stringify(AppState.favorites));
          }
          if (data.borrowRequests) {
            AppState.borrowRequests = data.borrowRequests;
            localStorage.setItem('library_borrowRequests', JSON.stringify(AppState.borrowRequests));
          }
          if (data.reservations) {
            AppState.reservations = data.reservations;
            localStorage.setItem('library_reservations', JSON.stringify(AppState.reservations));
          }
          if (data.notifications) {
            AppState.notifications = data.notifications;
            localStorage.setItem('library_notifications', JSON.stringify(AppState.notifications));
          }
          if (data.borrowHistory) {
            AppState.borrowHistory = data.borrowHistory;
            localStorage.setItem('library_borrowHistory', JSON.stringify(AppState.borrowHistory));
          }
          if (data.finePayments) {
            AppState.finePayments = data.finePayments;
            localStorage.setItem('library_finePayments', JSON.stringify(AppState.finePayments));
          }
          if (data.recentlyViewed) {
            AppState.recentlyViewed = data.recentlyViewed;
            localStorage.setItem('library_recentlyViewed', JSON.stringify(AppState.recentlyViewed));
          }
          Toast.success('Data imported successfully. Please refresh the page to see all changes.');
        } catch (err) {
          Toast.error('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },
  clearData() {
    Modal.confirm('Clear Data', 'This will clear all local data. Are you sure?', () => {
      localStorage.removeItem('library_settings');
      Toast.success('Local data cleared');
    });
  },
  afterRender() {}
};
