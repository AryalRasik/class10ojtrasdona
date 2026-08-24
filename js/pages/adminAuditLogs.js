const AdminAuditLogsPage = {
  state: {
    activeTab: "activity",
    securityOverview: {
      totalLoginsToday: 0,
      failedLogins: 0,
      lockedAccounts: 0,
      activeSessions: 0,
    },
    activityLogs: [],
    auditLogs: [],
    loginHistory: [],
    filters: {
      activity: { actionType: "", dateFrom: "", dateTo: "", search: "" },
      audit: { severity: "" },
      login: {},
    },
  },

  render() {
    return `
      <div class="admin-audit-logs-page">
        ${this.renderHeader()}
        ${this.renderSecurityOverview()}
        ${this.renderTabs()}
        ${this.renderTabContent()}
      </div>
    `;
  },

  renderHeader() {
    return `
      <div class="page-header">
        <h1>Security & Audit Logs</h1>
        <p class="description">Monitor system activity, security events, and user access</p>
      </div>
    `;
  },

  renderSecurityOverview() {
    const { securityOverview } = this.state;
    return `
      <div class="security-overview">
        <div class="overview-cards">
          <div class="overview-card">
            <div class="card-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            </div>
            <div class="card-content">
              <span class="card-value" id="total-logins-today">${securityOverview.totalLoginsToday}</span>
              <span class="card-label">Total Logins Today</span>
            </div>
          </div>
          <div class="overview-card">
            <div class="card-icon red">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <div class="card-content">
              <span class="card-value" id="failed-logins">${securityOverview.failedLogins}</span>
              <span class="card-label">Failed Login Attempts</span>
            </div>
          </div>
          <div class="overview-card">
            <div class="card-icon orange">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div class="card-content">
              <span class="card-value" id="locked-accounts">${securityOverview.lockedAccounts}</span>
              <span class="card-label">Locked Accounts</span>
            </div>
          </div>
          <div class="overview-card">
            <div class="card-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div class="card-content">
              <span class="card-value" id="active-sessions">${securityOverview.activeSessions}</span>
              <span class="card-label">Active Sessions</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderTabs() {
    const { activeTab } = this.state;
    return `
      <div class="log-tabs">
        <button class="tab-btn ${activeTab === "activity" ? "active" : ""}" onclick="AdminAuditLogsPage.switchTab('activity')">
          Activity Logs
        </button>
        <button class="tab-btn ${activeTab === "audit" ? "active" : ""}" onclick="AdminAuditLogsPage.switchTab('audit')">
          Audit Logs
        </button>
        <button class="tab-btn ${activeTab === "login" ? "active" : ""}" onclick="AdminAuditLogsPage.switchTab('login')">
          Login History
        </button>
      </div>
    `;
  },

  renderTabContent() {
    const { activeTab } = this.state;
    switch (activeTab) {
      case "activity": return this.renderActivityLogs();
      case "audit": return this.renderAuditLogs();
      case "login": return this.renderLoginHistory();
      default: return "";
    }
  },

  renderActivityLogs() {
    const { activityLogs, filters } = this.state;
    const { actionType, dateFrom, dateTo, search } = filters.activity;
    const actionTypes = ["Create", "Read", "Update", "Delete", "Login", "Logout", "Export", "Import"];

    const filtered = activityLogs.filter(log => {
      if (actionType && log.action !== actionType) return false;
      if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.timestamp) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const s = search.toLowerCase();
        return (log.user && log.user.toLowerCase().includes(s)) ||
               (log.action && log.action.toLowerCase().includes(s)) ||
               (log.details && log.details.toLowerCase().includes(s));
      }
      return true;
    });

    return `
      <div class="tab-content activity-logs-tab">
        <div class="filters-bar">
          <div class="filter-group">
            <label>Action Type</label>
            <select class="form-control" onchange="AdminAuditLogsPage.setActivityFilter('actionType', this.value)">
              <option value="">All Actions</option>
              ${actionTypes.map(a => `<option value="${a}" ${actionType === a ? "selected" : ""}>${a}</option>`).join("")}
            </select>
          </div>
          <div class="filter-group">
            <label>From</label>
            <input type="date" class="form-control" value="${dateFrom}" onchange="AdminAuditLogsPage.setActivityFilter('dateFrom', this.value)" />
          </div>
          <div class="filter-group">
            <label>To</label>
            <input type="date" class="form-control" value="${dateTo}" onchange="AdminAuditLogsPage.setActivityFilter('dateTo', this.value)" />
          </div>
          <div class="filter-group search">
            <label>Search</label>
            <input type="text" class="form-control" placeholder="Search by user or action..." value="${this.escapeHtml(search)}" oninput="AdminAuditLogsPage.setActivityFilter('search', this.value)" />
          </div>
        </div>

        <div class="logs-table-wrapper">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length > 0 ? filtered.map(log => this.renderActivityRow(log)).join("") : `
                <tr><td colspan="5" class="empty-row">No activity logs found</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderActivityRow(log) {
    return `
      <tr>
        <td class="timestamp">${this.escapeHtml(log.timestamp)}</td>
        <td class="user">${this.escapeHtml(log.user)}</td>
        <td><span class="action-badge action-${(log.action || "").toLowerCase()}">${this.escapeHtml(log.action)}</span></td>
        <td class="details">${this.escapeHtml(log.details)}</td>
        <td class="ip">${this.escapeHtml(log.ip)}</td>
      </tr>
    `;
  },

  renderAuditLogs() {
    const { auditLogs, filters } = this.state;
    const { severity } = filters.audit;
    const severities = ["info", "warning", "danger"];

    const filtered = auditLogs.filter(log => {
      if (severity && log.severity !== severity) return false;
      return true;
    });

    return `
      <div class="tab-content audit-logs-tab">
        <div class="filters-bar">
          <div class="filter-group">
            <label>Severity</label>
            <select class="form-control" onchange="AdminAuditLogsPage.setAuditFilter('severity', this.value)">
              <option value="">All Severities</option>
              ${severities.map(s => `<option value="${s}" ${severity === s ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="logs-table-wrapper">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length > 0 ? filtered.map(log => this.renderAuditRow(log)).join("") : `
                <tr><td colspan="6" class="empty-row">No audit logs found</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderAuditRow(log) {
    return `
      <tr>
        <td class="timestamp">${this.escapeHtml(log.timestamp)}</td>
        <td class="user">${this.escapeHtml(log.user)}</td>
        <td>${this.escapeHtml(log.action)}</td>
        <td class="details">${this.escapeHtml(log.details)}</td>
        <td class="ip">${this.escapeHtml(log.ip)}</td>
        <td><span class="severity-badge severity-${log.severity}">${log.severity}</span></td>
      </tr>
    `;
  },

  renderLoginHistory() {
    const { loginHistory } = this.state;

    return `
      <div class="tab-content login-history-tab">
        <div class="logs-table-wrapper">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Email</th>
                <th>IP</th>
                <th>User Agent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${loginHistory.length > 0 ? loginHistory.map(entry => this.renderLoginRow(entry)).join("") : `
                <tr><td colspan="6" class="empty-row">No login history found</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderLoginRow(entry) {
    const isFailed = !entry.success;
    const isLockout = entry.isLockout;
    let rowClass = "";
    if (isLockout) rowClass = "row-lockout";
    else if (isFailed) rowClass = "row-failed";

    return `
      <tr class="${rowClass}">
        <td class="timestamp">${this.escapeHtml(entry.timestamp)}</td>
        <td class="user">${this.escapeHtml(entry.user)}</td>
        <td>${this.escapeHtml(entry.email)}</td>
        <td class="ip">${this.escapeHtml(entry.ip)}</td>
        <td class="user-agent">${this.escapeHtml(entry.userAgent)}</td>
        <td>
          ${isLockout
            ? '<span class="status-badge status-lockout">Lockout</span>'
            : entry.success
              ? '<span class="status-badge status-success">Success</span>'
              : '<span class="status-badge status-failure">Failed</span>'
          }
        </td>
      </tr>
    `;
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  async init() {
    await this.loadData();
    this.render();
  },

  async loadData() {
    try {
      if (typeof API !== "undefined" && API.get) {
        const [overview, activity, audit, logins] = await Promise.all([
          API.get("/api/admin/security/overview").catch(() => null),
          API.get("/api/admin/logs/activity").catch(() => []),
          API.get("/api/admin/logs/audit").catch(() => []),
          API.get("/api/admin/logs/login-history").catch(() => []),
        ]);
        if (overview) this.state.securityOverview = { ...this.state.securityOverview, ...overview };
        if (activity && Array.isArray(activity)) this.state.activityLogs = activity;
        if (audit && Array.isArray(audit)) this.state.auditLogs = audit;
        if (logins && Array.isArray(logins)) this.state.loginHistory = logins;
      } else {
        this.loadMockData();
      }
    } catch (e) {
      console.warn("Could not load logs from API, using mock data:", e);
      this.loadMockData();
    }
  },

  loadMockData() {
    this.state.securityOverview = {
      totalLoginsToday: 47,
      failedLogins: 3,
      lockedAccounts: 1,
      activeSessions: 12,
    };

    this.state.activityLogs = [
      { timestamp: "2026-07-18 09:15:22", user: "admin@library.com", action: "Login", details: "Successful login", ip: "192.168.1.100" },
      { timestamp: "2026-07-18 09:20:01", user: "admin@library.com", action: "Create", details: "Added new book: Science Grade 7", ip: "192.168.1.100" },
      { timestamp: "2026-07-18 09:30:45", user: "librarian@library.com", action: "Update", details: "Updated book metadata: Math Grade 5", ip: "192.168.1.101" },
      { timestamp: "2026-07-18 10:05:12", user: "admin@library.com", action: "Delete", details: "Removed duplicate entry: English Grade 3", ip: "192.168.1.100" },
      { timestamp: "2026-07-18 10:30:00", user: "librarian@library.com", action: "Export", details: "Exported book catalog (150 books)", ip: "192.168.1.101" },
      { timestamp: "2026-07-18 11:15:33", user: "admin@library.com", action: "Import", details: "Imported 25 books from CDC", ip: "192.168.1.100" },
    ];

    this.state.auditLogs = [
      { timestamp: "2026-07-18 09:15:22", user: "admin@library.com", action: "User Login", details: "Successful authentication", ip: "192.168.1.100", severity: "info" },
      { timestamp: "2026-07-18 09:18:05", user: "unknown@test.com", action: "Failed Login", details: "Invalid password - attempt 1 of 5", ip: "203.0.113.50", severity: "warning" },
      { timestamp: "2026-07-18 09:18:30", user: "unknown@test.com", action: "Failed Login", details: "Invalid password - attempt 2 of 5", ip: "203.0.113.50", severity: "warning" },
      { timestamp: "2026-07-18 09:19:01", user: "unknown@test.com", action: "Account Locked", details: "Account locked after 5 failed attempts", ip: "203.0.113.50", severity: "danger" },
      { timestamp: "2026-07-18 09:30:45", user: "librarian@library.com", action: "Data Modification", details: "Updated book metadata", ip: "192.168.1.101", severity: "info" },
      { timestamp: "2026-07-18 10:05:12", user: "admin@library.com", action: "Data Deletion", details: "Removed duplicate entry", ip: "192.168.1.100", severity: "warning" },
    ];

    this.state.loginHistory = [
      { timestamp: "2026-07-18 09:15:22", user: "Admin User", email: "admin@library.com", ip: "192.168.1.100", userAgent: "Chrome/120.0 Windows 10", success: true, isLockout: false },
      { timestamp: "2026-07-18 09:18:05", user: "Unknown", email: "unknown@test.com", ip: "203.0.113.50", userAgent: "Firefox/121.0 Linux", success: false, isLockout: false },
      { timestamp: "2026-07-18 09:18:30", user: "Unknown", email: "unknown@test.com", ip: "203.0.113.50", userAgent: "Firefox/121.0 Linux", success: false, isLockout: false },
      { timestamp: "2026-07-18 09:19:01", user: "Unknown", email: "unknown@test.com", ip: "203.0.113.50", userAgent: "Firefox/121.0 Linux", success: false, isLockout: true },
      { timestamp: "2026-07-18 09:25:10", user: "Librarian", email: "librarian@library.com", ip: "192.168.1.101", userAgent: "Chrome/120.0 Windows 11", success: true, isLockout: false },
      { timestamp: "2026-07-18 10:00:00", user: "Admin User", email: "admin@library.com", ip: "192.168.1.100", userAgent: "Chrome/120.0 Windows 10", success: true, isLockout: false },
    ];
  },

  switchTab(tab) {
    this.state.activeTab = tab;
    this.render();
  },

  setActivityFilter(key, value) {
    this.state.filters.activity[key] = value;
    this.render();
  },

  setAuditFilter(key, value) {
    this.state.filters.audit[key] = value;
    this.render();
  },
};
