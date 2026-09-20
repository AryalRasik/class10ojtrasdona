const StudyMaterialsPage = {
  activeTab: 'all',
  searchQuery: '',
  gradeFilter: '',
  subjectFilter: '',

  TYPE_CONFIG: {
    'question-paper': { label: 'Question Paper', icon: 'file-text', color: '#ef4444' },
    'notes': { label: 'Notes', icon: 'book-marked', color: '#6366f1' },
    'model-set': { label: 'Model Set', icon: 'award', color: '#10b981' }
  },

  _all() {
    return AppState.getAllStudyMaterials ? AppState.getAllStudyMaterials() : (AppState.studyMaterials || []);
  },

  _filtered() {
    let items = this._all().slice();
    if (this.activeTab !== 'all') items = items.filter(m => m.type === this.activeTab);
    if (this.gradeFilter) items = items.filter(m => String(m.grade) === String(this.gradeFilter));
    if (this.subjectFilter) items = items.filter(m => m.subject === this.subjectFilter);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    }
    return items;
  },

  _initials(name) {
    return String(name || 'L')
      .split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  },

  render() {
    const all = this._all();
    const filtered = this._filtered();
    const qp = all.filter(m => m.type === 'question-paper').length;
    const notes = all.filter(m => m.type === 'notes').length;
    const ms = all.filter(m => m.type === 'model-set').length;
    const subjects = [...new Set(all.map(m => m.subject).filter(Boolean))].sort();
    const grades = [...new Set(all.map(m => m.grade).filter(Boolean))].sort((a, b) => a - b);
    const hasFilters = !!(this.activeTab !== 'all' || this.searchQuery || this.gradeFilter || this.subjectFilter);

    const stats = [
      { label: 'Materials', value: all.length, icon: 'layers', color: '#ffffff' },
      { label: 'Question Papers', value: qp, icon: 'file-text', color: '#c7d2fe' },
      { label: 'Notes', value: notes, icon: 'book-marked', color: '#a5b4fc' },
      { label: 'Model Sets', value: ms, icon: 'award', color: '#ddd6fe' }
    ];

    return `
      <style>
        .sm-hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 55%, #764ba2 100%); color: #fff; position: relative; overflow: hidden; }
        .sm-hero::before, .sm-hero::after { content: ""; position: absolute; border-radius: 50%; background: rgba(255,255,255,0.06); }
        .sm-hero::before { width: 360px; height: 360px; top: -150px; right: -90px; }
        .sm-hero::after { width: 240px; height: 240px; bottom: -130px; left: -70px; }
        .sm-hero .sm-hero-inner { position: relative; z-index: 1; }
        .sm-hero-chip { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22); color: #fff; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.35rem 0.9rem; border-radius: 50px; }
        .sm-stat { display: flex; align-items: center; gap: 0.7rem; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; padding: 0.7rem 1rem; }
        .sm-toolbar { position: sticky; top: calc(var(--nav-height, 72px) + 10px); z-index: 5; margin-bottom: 1.5rem; }
        .sm-tab-n { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 50px; background: var(--bg-tertiary); color: var(--text-secondary); font-size: 0.72rem; font-weight: 700; margin-left: 6px; }
        .tab-btn.active .sm-tab-n { background: var(--primary); color: #fff; }
        .sm-count { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; white-space: nowrap; }
        .sm-card { display: flex; flex-direction: column; overflow: hidden; }
        .sm-card .sm-cover { position: relative; min-height: 118px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .sm-card .sm-cover::after { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px); background-size: 16px 16px; opacity: 0.7; pointer-events: none; }
        .sm-card .sm-icon-tile { width: 60px; height: 60px; border-radius: 16px; background: #fff; box-shadow: 0 10px 26px rgba(15,23,42,0.18); display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; transition: transform var(--transition-fast); }
        .sm-card:hover .sm-icon-tile { transform: translateY(-3px) scale(1.04); }
        .sm-badge { position: absolute; z-index: 2; display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 50px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.02em; box-shadow: 0 3px 10px rgba(0,0,0,0.12); }
        .sm-title { margin: 0 0 0.5rem; font-size: 0.95rem; line-height: 1.4; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.66em; }
        .sm-desc { margin: 0 0 0.75rem; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .sm-footer { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding-top: 0.75rem; margin-top: 0.75rem; border-top: 1px dashed var(--border-color); font-size: 0.75rem; color: var(--text-tertiary); }
        .sm-uploader { display: inline-flex; align-items: center; gap: 0.45rem; min-width: 0; }
        .sm-uploader .avatar-sm { flex-shrink: 0; }
        .sm-uploader span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      </style>

      <div class="page-header sm-hero">
        <div class="container sm-hero-inner">
          <span class="sm-hero-chip">${Utils.getIcon('graduation-cap', 14)} Library Resources</span>
          <div style="display:flex;align-items:center;gap:1rem;margin-top:1rem;flex-wrap:wrap;">
            <div style="width:58px;height:58px;border-radius:16px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('file-text', 30)}</div>
            <div>
              <h1 class="page-title" style="color:#fff;margin:0;">Study Materials</h1>
              <p class="page-description" style="color:rgba(255,255,255,0.85);margin:0.25rem 0 0;">Question papers, notes and model sets — shared by your teachers</p>
            </div>
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:1.5rem;flex-wrap:wrap;">
            ${stats.map(s => `
              <div class="sm-stat">
                <span style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;color:${s.color};">${Utils.getIcon(s.icon, 18)}</span>
                <div>
                  <div style="font-size:1.25rem;font-weight:800;line-height:1;">${s.value}</div>
                  <div style="font-size:0.72rem;opacity:0.85;letter-spacing:0.02em;">${s.label}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="container" style="padding:2rem 1rem;">
        <div class="card sm-toolbar" style="padding:1.15rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color);">
            <div class="tabs" style="margin:0;">
              <button class="tab-btn ${this.activeTab === 'all' ? 'active' : ''}" data-tab="all">${Utils.getIcon('layers', 16)} All <span class="sm-tab-n">${all.length}</span></button>
              <button class="tab-btn ${this.activeTab === 'question-paper' ? 'active' : ''}" data-tab="question-paper">${Utils.getIcon('file-text', 16)} Question Papers <span class="sm-tab-n">${qp}</span></button>
              <button class="tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">${Utils.getIcon('book-marked', 16)} Notes <span class="sm-tab-n">${notes}</span></button>
              <button class="tab-btn ${this.activeTab === 'model-set' ? 'active' : ''}" data-tab="model-set">${Utils.getIcon('award', 16)} Model Sets <span class="sm-tab-n">${ms}</span></button>
            </div>
          </div>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;">
            <div class="books-search" style="flex:1;min-width:220px;">
              ${Utils.getIcon('search', 18)}
              <input type="text" id="sm-search" placeholder="Search by title, subject or description..." value="${Utils.escapeHtml(this.searchQuery)}">
            </div>
            <select id="sm-grade" class="form-input" style="width:auto;min-width:130px;">
              <option value="">All Grades</option>
              ${grades.map(g => `<option value="${g}" ${String(this.gradeFilter) === String(g) ? 'selected' : ''}>Grade ${g}</option>`).join('')}
            </select>
            <select id="sm-subject" class="form-input" style="width:auto;min-width:170px;">
              <option value="">All Subjects</option>
              ${subjects.map(s => `<option value="${Utils.escapeHtml(s)}" ${this.subjectFilter === s ? 'selected' : ''}>${Utils.escapeHtml(s)}</option>`).join('')}
            </select>
            <button class="btn btn-ghost btn-sm" id="sm-clear" ${hasFilters ? '' : 'disabled'} title="Clear filters">${Utils.getIcon('x', 14)} Clear</button>
            <span class="sm-count">${filtered.length} ${filtered.length === 1 ? 'material' : 'materials'}</span>
          </div>
        </div>

        <div id="sm-content">${this.renderContent(filtered)}</div>
      </div>`;
  },

  renderContent(items) {
    if (!items.length) {
      const active = this.activeTab !== 'all' ? this.TYPE_CONFIG[this.activeTab].label + 's ' : '';
      const filtering = this.searchQuery || this.gradeFilter || this.subjectFilter;
      return `
        <div class="empty-state">
          ${Utils.getIcon('file-text', 48)}
          <h3>No Study Materials Found</h3>
          <p>No ${active}available${filtering ? ' for the selected filters' : ' right now'}. Check back soon or try a different search.</p>
          ${filtering ? `<button class="btn btn-primary" onclick="StudyMaterialsPage.clearFilters()">${Utils.getIcon('x', 14)} Clear Filters</button>` : ''}
        </div>`;
    }
    return `<div class="grid-3">${items.map(m => {
      const cfg = this.TYPE_CONFIG[m.type] || this.TYPE_CONFIG['notes'];
      const downloads = m.downloads || 0;
      const uploadedBy = m.uploadedBy || 'Librarian';
      const uploadedAt = m.uploadedAt ? Utils.formatDate(m.uploadedAt) : '';
      return `
        <div class="card sm-card">
          <div class="sm-cover" style="background:linear-gradient(135deg,${cfg.color}2e,${cfg.color}14);">
            <div class="sm-icon-tile" style="color:${cfg.color};">${Utils.getIcon(cfg.icon, 30)}</div>
            <span class="sm-badge" style="top:0.75rem;right:0.75rem;background:${cfg.color};color:#fff;">${cfg.label}</span>
            ${m.grade ? `<span class="sm-badge" style="top:0.75rem;left:0.75rem;background:rgba(255,255,255,0.92);color:var(--text-primary);">Grade ${Utils.escapeHtml(m.grade)}</span>` : ''}
          </div>
          <div class="card-body" style="padding:1rem 1.15rem 1.15rem;">
            <h4 class="sm-title">${Utils.escapeHtml(m.title)}</h4>
            <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.6rem;">
              ${m.subject ? `<span class="badge badge-info">${Utils.escapeHtml(m.subject)}</span>` : ''}
              ${m.examType ? `<span class="badge badge-primary">${Utils.escapeHtml(m.examType)}</span>` : ''}
              ${m.year ? `<span class="badge badge-neutral">${Utils.escapeHtml(m.year)}</span>` : ''}
            </div>
            ${m.description ? `<p class="sm-desc">${Utils.escapeHtml(m.description)}</p>` : ''}
            <div class="sm-footer">
              <span class="sm-uploader">
                <span class="avatar-sm" style="font-size:0.6rem;">${this._initials(uploadedBy)}</span>
                <span title="${Utils.escapeHtml(uploadedBy)}">${Utils.escapeHtml(uploadedBy)}</span>
              </span>
              <span style="display:inline-flex;align-items:center;gap:0.8rem;flex-shrink:0;">
                ${uploadedAt ? `<span>${Utils.getIcon('calendar', 12)} ${uploadedAt}</span>` : ''}
                <span style="display:inline-flex;align-items:center;gap:4px;">${Utils.getIcon('download', 12)} ${downloads}</span>
              </span>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:0.9rem;">
              ${m.pdfUrl
                ? `<button class="btn btn-sm" style="flex:1;background:${cfg.color};border-color:${cfg.color};color:#fff;" onclick="StudyMaterialsPage.openPdf(${m.id})">${Utils.getIcon('eye', 14)} Read</button>`
                : `<button class="btn btn-sm" style="flex:1;" disabled title="No file uploaded">${Utils.getIcon('eye', 14)} Read</button>`}
              ${m.pdfUrl
                ? `<a class="btn btn-outline btn-sm" style="flex:1;" href="${Utils.escapeHtml(m.pdfUrl)}" download onclick="StudyMaterialsPage.countDownload(${m.id})">${Utils.getIcon('download', 14)} Download</a>`
                : `<button class="btn btn-outline btn-sm" style="flex:1;" disabled>${Utils.getIcon('download', 14)} Download</button>`}
            </div>
          </div>
        </div>`;
    }).join('')}</div>`;
  },

  openPdf(id) {
    const m = this._all().find(x => x.id === id);
    if (!m) return;
    this.countDownload(id);
    Utils.openPdfViewer(m.title, m.pdfUrl);
  },

  countDownload(id) {
    if (AppState.incrementStudyMaterialDownload) AppState.incrementStudyMaterialDownload(id);
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    this._refreshContent();
  },

  clearFilters() {
    this.activeTab = 'all';
    this.searchQuery = '';
    this.gradeFilter = '';
    this.subjectFilter = '';
    const content = document.getElementById('pageContent');
    if (content) {
      content.innerHTML = this.render();
      this.afterRender();
    }
  },

  _refreshContent() {
    const content = document.getElementById('sm-content');
    if (content) content.innerHTML = this.renderContent(this._filtered());
    const count = document.querySelector('.sm-count');
    if (count) {
      const n = this._filtered().length;
      count.textContent = n + ' ' + (n === 1 ? 'material' : 'materials');
    }
  },

  afterRender() {
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    const clear = document.getElementById('sm-clear');
    if (clear) clear.addEventListener('click', () => this.clearFilters());
    const search = document.getElementById('sm-search');
    if (search) search.addEventListener('input', Utils.debounce((e) => {
      this.searchQuery = e.target.value;
      this._refreshContent();
    }, 300));
    const grade = document.getElementById('sm-grade');
    if (grade) grade.addEventListener('change', (e) => {
      this.gradeFilter = e.target.value;
      this._refreshContent();
    });
    const subject = document.getElementById('sm-subject');
    if (subject) subject.addEventListener('change', (e) => {
      this.subjectFilter = e.target.value;
      this._refreshContent();
    });
  }
};