const AnnouncementsPage = {
  filter: 'all',
  showCreateForm: false,
  render() {
    const announcements = AppState.announcements || [];
    let filtered = announcements;
    if (this.filter !== 'all') {
      filtered = announcements.filter(a => a.priority === this.filter);
    }
    const highCount = announcements.filter(a => a.priority === 'high' || a.priority === 'urgent').length;
    const mediumCount = announcements.filter(a => a.priority === 'medium').length;
    const normalCount = announcements.filter(a => !a.priority || a.priority === 'normal' || a.priority === 'low').length;
    const isAdmin = AppState.currentUser && (AppState.currentUser.role === 'admin' || AppState.currentUser.role === 'librarian');

    return `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <h1 class="page-title">${Utils.getIcon('megaphone', 28)} Announcements</h1>
              <p class="page-description">Stay updated with the latest library news and announcements</p>
            </div>
            ${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="AnnouncementsPage.toggleCreateForm()">${Utils.getIcon('plus', 16)} New Announcement</button>` : ''}
          </div>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">

        ${isAdmin && this.showCreateForm ? `
        <div class="card" style="margin-bottom:1.5rem;border:2px solid var(--primary);">
          <div style="padding:1.5rem;">
            <h3 style="margin:0 0 1rem;">${Utils.getIcon('plus', 18)} Create Announcement</h3>
            <div class="form-group">
              <label class="form-label">Title</label>
              <input class="form-input" id="ann-title" placeholder="Announcement title">
            </div>
            <div class="form-group">
              <label class="form-label">Priority</label>
              <select class="form-input" id="ann-priority" style="width:100%;">
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Content</label>
              <textarea class="form-input" id="ann-content" rows="4" placeholder="Write the announcement content..."></textarea>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-primary btn-sm" onclick="AnnouncementsPage.createAnnouncement()">${Utils.getIcon('send', 16)} Publish</button>
              <button class="btn btn-ghost btn-sm" onclick="AnnouncementsPage.toggleCreateForm()">Cancel</button>
            </div>
          </div>
        </div>` : ''}

        <div class="tabs" style="margin-bottom:1.5rem;">
          <button class="tab-btn ${this.filter === 'all' ? 'active' : ''}" onclick="AnnouncementsPage.setFilter('all')">All (${announcements.length})</button>
          <button class="tab-btn ${this.filter === 'high' ? 'active' : ''}" onclick="AnnouncementsPage.setFilter('high')">${Utils.getIcon('alert-circle', 14)} High (${highCount})</button>
          <button class="tab-btn ${this.filter === 'medium' ? 'active' : ''}" onclick="AnnouncementsPage.setFilter('medium')">${Utils.getIcon('alert-triangle', 14)} Medium (${mediumCount})</button>
          <button class="tab-btn ${this.filter === 'normal' ? 'active' : ''}" onclick="AnnouncementsPage.setFilter('normal')">${Utils.getIcon('info', 14)} Normal (${normalCount})</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:1rem;">
          ${filtered.length ? filtered.map(a => this.renderAnnouncement(a)).join('') : `
            <div class="empty-state" style="padding:60px 0;">
              <div style="width:80px;height:80px;border-radius:50%;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                ${Utils.getIcon('megaphone', 40)}
              </div>
              <h3>No Announcements</h3>
              <p style="max-width:360px;margin:0.5rem auto 0;color:var(--text-secondary);">
                ${this.filter !== 'all' ? 'No announcements match this priority filter.' : 'There are no announcements at this time.'}
              </p>
            </div>
          `}
        </div>
      </div>`;
  },
  renderAnnouncement(a) {
    const priorityClass = a.priority === 'high' || a.priority === 'urgent' ? 'danger' : a.priority === 'medium' ? 'warning' : 'info';
    const priorityColor = a.priority === 'high' || a.priority === 'urgent' ? 'var(--danger)' : a.priority === 'medium' ? 'var(--warning)' : 'var(--info)';
    const priorityIcon = a.priority === 'high' || a.priority === 'urgent' ? 'alert-circle' : a.priority === 'medium' ? 'alert-triangle' : 'info';
    return `
      <div class="card" style="overflow:hidden;">
        <div style="display:flex;border-left:4px solid ${priorityColor};">
          <div style="flex:1;padding:1.5rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;flex-wrap:wrap;">
              <span class="badge badge-${priorityClass}" style="display:flex;align-items:center;gap:4px;">${Utils.getIcon(priorityIcon, 12)} ${Utils.escapeHtml(a.priority || 'normal')}</span>
              <span style="font-size:0.85rem;color:var(--text-secondary);">${Utils.getIcon('calendar', 14)} ${Utils.formatDate(a.date || a.createdAt)}</span>
            </div>
            <h3 style="margin:0 0 0.5rem;">${Utils.escapeHtml(a.title)}</h3>
            <p style="margin:0;color:var(--text-secondary);line-height:1.6;">${Utils.escapeHtml(a.content || a.message || a.description || '')}</p>
            ${a.author ? `<p style="margin:0.75rem 0 0;font-size:0.85rem;color:var(--text-secondary);">— ${Utils.escapeHtml(a.author)}</p>` : ''}
          </div>
        </div>
      </div>`;
  },
  setFilter(f) {
    this.filter = f;
    const container = document.getElementById('pageContent');
    if (container) {
      container.innerHTML = this.render();
      Router.bindLinks();
      Router.highlightNav();
    }
  },
  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    const container = document.getElementById('pageContent');
    if (container) {
      container.innerHTML = this.render();
      Router.bindLinks();
      Router.highlightNav();
    }
  },
  async createAnnouncement() {
    const title = document.getElementById('ann-title');
    const content = document.getElementById('ann-content');
    const priority = document.getElementById('ann-priority');
    if (!title || !title.value.trim() || !content || !content.value.trim()) {
      Toast.error('Please fill in all fields');
      return;
    }
    if (!AppState.announcements) AppState.announcements = [];

    const newAnnouncement = {
      title: title.value.trim(),
      content: content.value.trim(),
      priority: priority ? priority.value : 'normal',
      date: new Date().toISOString(),
      author: AppState.currentUser ? AppState.currentUser.name : 'Admin'
    };

    if (AppState.isSupabaseConnected) {
      try {
        const created = await Api.createAnnouncement({
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          priority: newAnnouncement.priority,
          date: newAnnouncement.date,
          author: newAnnouncement.author
        });
        AppState.announcements.unshift(Api.mapAnnouncement(created));
      } catch (e) {
        console.error('Supabase createAnnouncement failed:', e);
        Toast.error('Failed to publish announcement: ' + (e.message || 'Unknown error'));
        return;
      }
    } else {
      newAnnouncement.id = Date.now();
      AppState.announcements.unshift(newAnnouncement);
    }

    Toast.success('Announcement published');
    this.showCreateForm = false;
    const container = document.getElementById('pageContent');
    if (container) {
      container.innerHTML = this.render();
      Router.bindLinks();
      Router.highlightNav();
    }
  },
  afterRender() {}
};
