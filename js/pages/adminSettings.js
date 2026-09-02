const AdminSettingsPage = {
  activeSection: 'library',
  config: {
    libraryName: 'Saraswati Sec School Library',
    libraryMotto: 'Knowledge is Power',
    academicYear: '2082-2083',
    libraryAddress: 'Sanothimi, Bhaktapur, Nepal',
    libraryPhone: '+977-01-6634373',
    libraryEmail: 'library@saraswatischool.edu.np',
    maxBorrowStudent: 3,
    maxBorrowTeacher: 5,
    loanPeriod: 14,
    loanPeriodTeacher: 21,
    maxRenewals: 2,
    maxRenewalsTeacher: 2,
    finePerDay: 5,
    maxFineLimit: 100,
    openWeekday: '07:00',
    closeWeekday: '17:00',
    openSaturday: '09:00',
    closeSaturday: '14:00',
    maxReservations: 3,
    maxReservationsTeacher: 5,
    reservationExpiry: 7,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: ''
  },

  render() {
    if (AppState.isSupabaseConnected && AppState.settings && Object.keys(AppState.settings).length > 0) {
      for (const [key, value] of Object.entries(AppState.settings)) {
        if (key in this.config) this.config[key] = value;
      }
    } else {
      const saved = localStorage.getItem('admin_settings');
      if (saved) try { Object.assign(this.config, JSON.parse(saved)); } catch (e) {}
    }

    const sections = [
      { id: 'library', label: 'Library Info', icon: 'building' },
      { id: 'borrowing', label: 'Borrowing Rules', icon: 'book-open' },
      { id: 'hours', label: 'Library Hours', icon: 'clock' },
      { id: 'reservations', label: 'Reservations', icon: 'bookmark' },
      { id: 'security', label: 'Security', icon: 'shield' },
      { id: 'email', label: 'Email', icon: 'mail' },
      { id: 'backup', label: 'Backup & System', icon: 'database' }
    ];

    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('settings', 28)} System Settings</h1>
          <p class="page-description">Configure library system settings</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem;">
          ${sections.map(s => `
            <button class="btn btn-sm ${this.activeSection === s.id ? 'btn-primary' : 'btn-outline'}" onclick="AdminSettingsPage.switchSection('${s.id}')">
              ${Utils.getIcon(s.icon, 14)} ${s.label}
            </button>
          `).join('')}
        </div>

        <div style="max-width:800px;">
          ${this.renderSection()}
        </div>
      </div>`;
  },

  renderSection() {
    switch (this.activeSection) {
      case 'library': return this.renderLibraryInfo();
      case 'borrowing': return this.renderBorrowingRules();
      case 'hours': return this.renderLibraryHours();
      case 'reservations': return this.renderReservationSettings();
      case 'security': return this.renderSecuritySettings();
      case 'email': return this.renderEmailSettings();
      case 'backup': return this.renderBackupSystem();
      default: return this.renderLibraryInfo();
    }
  },

  renderLibraryInfo() {
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('building', 18)} Library Information</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <div class="form-group"><label class="form-label">Library Name</label><input class="form-input" id="set-libname" value="${Utils.escapeHtml(this.config.libraryName)}"></div>
          <div class="form-group"><label class="form-label">Motto</label><input class="form-input" id="set-motto" value="${Utils.escapeHtml(this.config.libraryMotto)}"></div>
          <div class="form-group"><label class="form-label">Academic Year</label><input class="form-input" id="set-year" value="${Utils.escapeHtml(this.config.academicYear)}"></div>
          <div class="form-group"><label class="form-label">Address</label><input class="form-input" id="set-address" value="${Utils.escapeHtml(this.config.libraryAddress)}"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="set-phone" value="${Utils.escapeHtml(this.config.libraryPhone)}"></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="set-email" type="email" value="${Utils.escapeHtml(this.config.libraryEmail)}"></div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="AdminSettingsPage.save()">${Utils.getIcon('save', 16)} Save Settings</button>`;
  },

  renderBorrowingRules() {
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('book-open', 18)} Borrowing Rules</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <h4 style="margin:0 0 1rem;color:var(--primary);">Student Rules</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div class="form-group"><label class="form-label">Max Books</label><input class="form-input" id="set-maxstudent" type="number" value="${this.config.maxBorrowStudent}" min="1"></div>
            <div class="form-group"><label class="form-label">Loan Period (days)</label><input class="form-input" id="set-loanperiod" type="number" value="${this.config.loanPeriod}" min="1"></div>
            <div class="form-group"><label class="form-label">Max Renewals</label><input class="form-input" id="set-maxrenewals" type="number" value="${this.config.maxRenewals}" min="0"></div>
            <div class="form-group"><label class="form-label">Max Reservations</label><input class="form-input" id="set-maxres" type="number" value="${this.config.maxReservations}" min="0"></div>
          </div>
          <h4 style="margin:0 0 1rem;color:var(--primary);">Teacher Rules</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div class="form-group"><label class="form-label">Max Books</label><input class="form-input" id="set-maxteacher" type="number" value="${this.config.maxBorrowTeacher}" min="1"></div>
            <div class="form-group"><label class="form-label">Loan Period (days)</label><input class="form-input" id="set-loanperiodt" type="number" value="${this.config.loanPeriodTeacher}" min="1"></div>
            <div class="form-group"><label class="form-label">Max Renewals</label><input class="form-input" id="set-maxrenewalst" type="number" value="${this.config.maxRenewalsTeacher}" min="0"></div>
            <div class="form-group"><label class="form-label">Max Reservations</label><input class="form-input" id="set-maxrest" type="number" value="${this.config.maxReservationsTeacher}" min="0"></div>
          </div>
          <h4 style="margin:0 0 1rem;color:var(--primary);">Fine Settings</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">Fine Per Day (Rs.)</label><input class="form-input" id="set-fineperday" type="number" value="${this.config.finePerDay}" min="0"></div>
            <div class="form-group"><label class="form-label">Max Fine Limit (Rs.)</label><input class="form-input" id="set-maxfine" type="number" value="${this.config.maxFineLimit}" min="0"></div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="AdminSettingsPage.save()">${Utils.getIcon('save', 16)} Save Settings</button>`;
  },

  renderLibraryHours() {
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('clock', 18)} Library Hours</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <h4 style="margin:0 0 0.75rem;">Weekdays (Sunday - Friday)</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
            <div class="form-group"><label class="form-label">Opening Time</label><input class="form-input" id="set-openwd" type="time" value="${this.config.openWeekday}"></div>
            <div class="form-group"><label class="form-label">Closing Time</label><input class="form-input" id="set-closewd" type="time" value="${this.config.closeWeekday}"></div>
          </div>
          <h4 style="margin:0 0 0.75rem;">Saturday</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">Opening Time</label><input class="form-input" id="set-opensat" type="time" value="${this.config.openSaturday}"></div>
            <div class="form-group"><label class="form-label">Closing Time</label><input class="form-input" id="set-closesat" type="time" value="${this.config.closeSaturday}"></div>
          </div>
          <div style="margin-top:1rem;padding:0.75rem 1rem;background:var(--bg-secondary);border-radius:8px;">
            <small style="color:var(--text-secondary);">Library Status: ${Utils.isLibraryOpen() ? '<span style="color:var(--success);font-weight:600;">Open Now</span>' : '<span style="color:var(--danger);font-weight:600;">Closed</span>'}</small>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="AdminSettingsPage.save()">${Utils.getIcon('save', 16)} Save Settings</button>`;
  },

  renderReservationSettings() {
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('bookmark', 18)} Reservation Settings</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">Max Reservations (Student)</label><input class="form-input" id="set-maxres2" type="number" value="${this.config.maxReservations}" min="0"></div>
            <div class="form-group"><label class="form-label">Max Reservations (Teacher)</label><input class="form-input" id="set-maxrest2" type="number" value="${this.config.maxReservationsTeacher}" min="0"></div>
            <div class="form-group"><label class="form-label">Reservation Expiry (days)</label><input class="form-input" id="set-resexpiry" type="number" value="${this.config.reservationExpiry}" min="1"></div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="AdminSettingsPage.save()">${Utils.getIcon('save', 16)} Save Settings</button>`;
  },

  renderSecuritySettings() {
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('shield', 18)} Security Settings</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">Session Timeout (minutes)</label><input class="form-input" id="set-sesstimeout" type="number" value="${this.config.sessionTimeout}" min="5"></div>
            <div class="form-group"><label class="form-label">Max Login Attempts</label><input class="form-input" id="set-maxlogin" type="number" value="${this.config.maxLoginAttempts}" min="3"></div>
            <div class="form-group"><label class="form-label">Lockout Duration (minutes)</label><input class="form-input" id="set-lockout" type="number" value="${this.config.lockoutDuration}" min="5"></div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="AdminSettingsPage.save()">${Utils.getIcon('save', 16)} Save Settings</button>`;
  },

  renderEmailSettings() {
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('mail', 18)} Email Settings</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;margin-bottom:1rem;">
            <small style="color:var(--text-secondary);">Configure SMTP settings for sending email notifications. Currently email notifications are handled through the notification system.</small>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="form-group"><label class="form-label">SMTP Host</label><input class="form-input" id="set-smtphost" value="${Utils.escapeHtml(this.config.smtpHost)}" placeholder="smtp.gmail.com"></div>
            <div class="form-group"><label class="form-label">SMTP Port</label><input class="form-input" id="set-smtpport" value="${Utils.escapeHtml(this.config.smtpPort)}" placeholder="587"></div>
            <div class="form-group"><label class="form-label">SMTP Username</label><input class="form-input" id="set-smtpuser" value="${Utils.escapeHtml(this.config.smtpUser)}" placeholder="your@email.com"></div>
            <div class="form-group"><label class="form-label">SMTP Password</label><input class="form-input" id="set-smtppass" type="password" value="${Utils.escapeHtml(this.config.smtpPass)}" placeholder="App password"></div>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="AdminSettingsPage.save()">${Utils.getIcon('save', 16)} Save Settings</button>`;
  },

  renderBackupSystem() {
    return `
      <div class="section-header"><h2 class="section-title">${Utils.getIcon('database', 18)} Backup & Restore</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem;">
            <button class="btn btn-outline" onclick="AdminSettingsPage.backup()">${Utils.getIcon('download', 16)} Backup All Data</button>
            <button class="btn btn-outline" onclick="AdminSettingsPage.restore()">${Utils.getIcon('upload', 16)} Restore from Backup</button>
            <button class="btn btn-outline" onclick="AdminSettingsPage.exportSettings()">${Utils.getIcon('file-text', 16)} Export Settings</button>
          </div>
        </div>
      </div>

      <div class="section-header"><h2 class="section-title">${Utils.getIcon('shield', 18)} Factory Reset</h2></div>
      <div class="card" style="margin-bottom:1.5rem;border-left:4px solid var(--danger);">
        <div style="padding:1.5rem;">
          <h4 style="margin:0 0 0.5rem;color:var(--danger);">Danger Zone</h4>
          <p style="color:var(--text-secondary);margin:0 0 1rem;">This will delete ALL library data including books, borrows, users, and settings. This action cannot be undone.</p>
          <button class="btn btn-danger" onclick="AdminSettingsPage.factoryReset()">${Utils.getIcon('alert-triangle', 16)} Factory Reset</button>
        </div>
      </div>

      <div class="section-header"><h2 class="section-title">${Utils.getIcon('check-circle', 18)} Database Health</h2></div>
      <div class="card" style="margin-bottom:1.5rem;">
        <div style="padding:1.5rem;">
          <button class="btn btn-outline" onclick="AdminSettingsPage.checkHealth()" style="margin-bottom:1rem;">${Utils.getIcon('refresh-cw', 16)} Run Health Check</button>
          <div id="health-results" style="display:none;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;"><small style="color:var(--text-tertiary);">Books</small><p style="margin:2px 0;font-weight:600;" id="health-books">-</p></div>
              <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;"><small style="color:var(--text-tertiary);">Borrow Requests</small><p style="margin:2px 0;font-weight:600;" id="health-borrows">-</p></div>
              <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;"><small style="color:var(--text-tertiary);">Notifications</small><p style="margin:2px 0;font-weight:600;" id="health-notifs">-</p></div>
              <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;"><small style="color:var(--text-tertiary);">Reservations</small><p style="margin:2px 0;font-weight:600;" id="health-res">-</p></div>
              <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;"><small style="color:var(--text-tertiary);">Storage Used</small><p style="margin:2px 0;font-weight:600;" id="health-storage">-</p></div>
              <div style="padding:1rem;border:1px solid var(--border);border-radius:8px;"><small style="color:var(--text-tertiary);">Overall Status</small><p style="margin:2px 0;font-weight:600;" id="health-status">-</p></div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:1rem;margin-bottom:2rem;">
        <button class="btn btn-primary" onclick="AdminSettingsPage.save()">${Utils.getIcon('save', 16)} Save All Settings</button>
        <button class="btn btn-outline" onclick="AdminSettingsPage.resetDefaults()">${Utils.getIcon('rotate-ccw', 16)} Reset Defaults</button>
      </div>`;
  },

  switchSection(id) { this.activeSection = id; this.refresh(); },
  refresh() { Router.resolve(); },

  async save() {
    this.config.libraryName = document.getElementById('set-libname')?.value || this.config.libraryName;
    this.config.libraryMotto = document.getElementById('set-motto')?.value || this.config.libraryMotto;
    this.config.academicYear = document.getElementById('set-year')?.value || this.config.academicYear;
    this.config.libraryAddress = document.getElementById('set-address')?.value || this.config.libraryAddress;
    this.config.libraryPhone = document.getElementById('set-phone')?.value || this.config.libraryPhone;
    this.config.libraryEmail = document.getElementById('set-email')?.value || this.config.libraryEmail;
    this.config.maxBorrowStudent = parseInt(document.getElementById('set-maxstudent')?.value) || 3;
    this.config.maxBorrowTeacher = parseInt(document.getElementById('set-maxteacher')?.value) || 5;
    this.config.loanPeriod = parseInt(document.getElementById('set-loanperiod')?.value) || 14;
    this.config.loanPeriodTeacher = parseInt(document.getElementById('set-loanperiodt')?.value) || 21;
    this.config.maxRenewals = parseInt(document.getElementById('set-maxrenewals')?.value) || 2;
    this.config.maxRenewalsTeacher = parseInt(document.getElementById('set-maxrenewalst')?.value) || 2;
    this.config.maxReservations = parseInt(document.getElementById('set-maxres')?.value) || parseInt(document.getElementById('set-maxres2')?.value) || this.config.maxReservations;
    this.config.maxReservationsTeacher = parseInt(document.getElementById('set-maxrest')?.value) || parseInt(document.getElementById('set-maxrest2')?.value) || this.config.maxReservationsTeacher;
    this.config.finePerDay = parseInt(document.getElementById('set-fineperday')?.value) || 5;
    this.config.maxFineLimit = parseInt(document.getElementById('set-maxfine')?.value) || 100;
    this.config.openWeekday = document.getElementById('set-openwd')?.value || '07:00';
    this.config.closeWeekday = document.getElementById('set-closewd')?.value || '17:00';
    this.config.openSaturday = document.getElementById('set-opensat')?.value || '09:00';
    this.config.closeSaturday = document.getElementById('set-closesat')?.value || '14:00';
    this.config.reservationExpiry = parseInt(document.getElementById('set-resexpiry')?.value) || 7;
    this.config.sessionTimeout = parseInt(document.getElementById('set-sesstimeout')?.value) || 30;
    this.config.maxLoginAttempts = parseInt(document.getElementById('set-maxlogin')?.value) || 5;
    this.config.lockoutDuration = parseInt(document.getElementById('set-lockout')?.value) || 15;
    this.config.smtpHost = document.getElementById('set-smtphost')?.value || '';
    this.config.smtpPort = document.getElementById('set-smtpport')?.value || '587';
    this.config.smtpUser = document.getElementById('set-smtpuser')?.value || '';
    this.config.smtpPass = document.getElementById('set-smtppass')?.value || '';

    if (AppState.isSupabaseConnected) {
      try {
        const settingsToSave = {};
        for (const [key, value] of Object.entries(this.config)) {
          settingsToSave[key] = value;
          try {
            await Api.setSetting(key, value);
          } catch (e) {
            console.warn(`Supabase save setting "${key}" failed, continuing:`, e);
          }
        }
        AppState.settings = settingsToSave;
      } catch (e) {
        console.error('Supabase save settings failed:', e);
      }
    }

    localStorage.setItem('admin_settings', JSON.stringify(this.config));

    if (AppState.ROLE_CONFIG && AppState.ROLE_CONFIG.student) {
      AppState.ROLE_CONFIG.student.maxBorrow = this.config.maxBorrowStudent;
      AppState.ROLE_CONFIG.student.loanPeriod = this.config.loanPeriod;
      AppState.ROLE_CONFIG.student.maxRenewals = this.config.maxRenewals;
      AppState.ROLE_CONFIG.student.maxReservations = this.config.maxReservations;
      AppState.ROLE_CONFIG.student.finePerDay = this.config.finePerDay;
      AppState.ROLE_CONFIG.student.maxFineLimit = this.config.maxFineLimit;
    }
    if (AppState.ROLE_CONFIG && AppState.ROLE_CONFIG.teacher) {
      AppState.ROLE_CONFIG.teacher.maxBorrow = this.config.maxBorrowTeacher;
      AppState.ROLE_CONFIG.teacher.loanPeriod = this.config.loanPeriodTeacher;
      AppState.ROLE_CONFIG.teacher.maxRenewals = this.config.maxRenewalsTeacher;
      AppState.ROLE_CONFIG.teacher.maxReservations = this.config.maxReservationsTeacher;
      AppState.ROLE_CONFIG.teacher.finePerDay = this.config.finePerDay;
      AppState.ROLE_CONFIG.teacher.maxFineLimit = this.config.maxFineLimit;
    }

    Toast.success('Settings saved successfully');
  },

  resetDefaults() {
    Modal.confirm('Reset Defaults', 'Reset all settings to default values?', () => {
      localStorage.removeItem('admin_settings');
      Toast.success('Settings reset to defaults');
      this.config = {
        libraryName: 'Saraswati Sec School Library', libraryMotto: 'Knowledge is Power',
        academicYear: '2082-2083', libraryAddress: 'Sanothimi, Bhaktapur, Nepal',
        libraryPhone: '+977-01-6634373', libraryEmail: 'library@saraswatischool.edu.np',
        maxBorrowStudent: 3, maxBorrowTeacher: 5, loanPeriod: 14, loanPeriodTeacher: 21,
        maxRenewals: 2, maxRenewalsTeacher: 2, finePerDay: 5, maxFineLimit: 100,
        openWeekday: '07:00', closeWeekday: '17:00', openSaturday: '09:00', closeSaturday: '14:00',
        maxReservations: 3, maxReservationsTeacher: 5, reservationExpiry: 7,
        sessionTimeout: 30, maxLoginAttempts: 5, lockoutDuration: 15,
        smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: ''
      };
      Router.resolve();
    });
  },

  backup() {
    const data = JSON.stringify({
      config: this.config,
      books: AppState.books || [],
      borrowRequests: AppState.borrowRequests || [],
      notifications: AppState.notifications || [],
      reservations: AppState.reservations || [],
      favorites: AppState.favorites || [],
      recentlyViewed: AppState.recentlyViewed || [],
      activityLogs: AppState.activityLogs || [],
      auditLogs: AppState.auditLogs || [],
      finePayments: AppState.finePayments || [],
      timestamp: new Date().toISOString()
    }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Backup created successfully');
  },

  restore() {
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
          if (data.config) Object.assign(this.config, data.config);
          if (data.books) AppState.books = data.books;
          if (data.borrowRequests) AppState.borrowRequests = data.borrowRequests;
          if (data.notifications) AppState.notifications = data.notifications;
          if (data.reservations) AppState.reservations = data.reservations;
          if (data.favorites) AppState.favorites = data.favorites;
          if (data.recentlyViewed) AppState.recentlyViewed = data.recentlyViewed;
          if (data.activityLogs) AppState.activityLogs = data.activityLogs;
          if (data.auditLogs) AppState.auditLogs = data.auditLogs;
          if (data.finePayments) AppState.finePayments = data.finePayments;
          localStorage.setItem('admin_settings', JSON.stringify(this.config));
          AppState.saveAll();
          Toast.success('Data restored successfully');
          Router.resolve();
        } catch (err) {
          Toast.error('Invalid backup file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  exportSettings() {
    const data = JSON.stringify(this.config, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `library-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Settings exported');
  },

  factoryReset() {
    Modal.confirm('Factory Reset', 'This will delete ALL library data including books, borrows, users, and settings. This action cannot be undone! Are you absolutely sure?', () => {
      localStorage.clear();
      Toast.success('System reset complete. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    });
  },

  checkHealth() {
    const el = document.getElementById('health-results');
    if (el) el.style.display = 'block';
    const booksCount = (AppState.books || []).length;
    const borrowsCount = AppState.borrowRequests.length;
    const notifsCount = AppState.notifications.length;
    const resCount = AppState.reservations.length;
    let storageUsed = '0 KB';
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('library_')) {
          total += localStorage.getItem(key).length * 2;
        }
      }
      if (total > 1048576) storageUsed = (total / 1048576).toFixed(2) + ' MB';
      else if (total > 1024) storageUsed = (total / 1024).toFixed(1) + ' KB';
      else storageUsed = total + ' B';
    } catch (e) {}
    const orphanBorrows = AppState.borrowRequests.filter(r => !r.bookTitle && !r.studentName).length;

    const setEl = (id, text, color) => { const e = document.getElementById(id); if (e) { e.textContent = text; if (color) e.style.color = color; } };
    setEl('health-books', `${booksCount} books`, 'var(--success)');
    setEl('health-borrows', `${borrowsCount} requests`, borrowsCount > 0 ? 'var(--success)' : 'var(--warning)');
    setEl('health-notifs', `${notifsCount} notifications`, 'var(--success)');
    setEl('health-res', `${resCount} reservations`, 'var(--success)');
    setEl('health-storage', storageUsed, 'var(--info)');
    setEl('health-status', orphanBorrows > 0 ? `Warning: ${orphanBorrows} orphan records` : 'Healthy', orphanBorrows > 0 ? 'var(--warning)' : 'var(--success)');
    Toast.success('Health check complete');
  },

  afterRender() {}
};
