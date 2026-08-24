const StudyMaterialsPage = {
  activeTab: 'all',
  searchQuery: '',
  gradeFilter: '',
  subjectFilter: '',

  TYPE_CONFIG: {
    'question-paper': { label: 'Question Paper', icon: 'file-text', color: 'var(--danger)' },
    'notes': { label: 'Notes', icon: 'book-marked', color: 'var(--primary)' },
    'model-set': { label: 'Model Set', icon: 'award', color: 'var(--success)' }
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

  render() {
    const all = this._all();
    const filtered = this._filtered();
    const qp = all.filter(m => m.type === 'question-paper').length;
    const notes = all.filter(m => m.type === 'notes').length;
    const ms = all.filter(m => m.type === 'model-set').length;
    const subjects = [...new Set(all.map(m => m.subject).filter(Boolean))].sort();
    const grades = [...new Set(all.map(m => m.grade).filter(Boolean))].sort((a, b) => a - b);

    return `
      <div class="page-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);color:#fff;">
        <div class="container">
          <h1 class="page-title" style="color:#fff;">${Utils.getIcon('file-text', 28)} Study Materials</h1>
          <p class="page-description" style="opacity:0.9;">Question papers, notes, and model sets shared by teachers</p>
          <div style="display:flex;gap:2rem;margin-top:1rem;flex-wrap:wrap;">
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${all.length}</div><div style="font-size:0.8rem;opacity:0.8;">Total</div></div>
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${qp}</div><div style="font-size:0.8rem;opacity:0.8;">Question Papers</div></div>
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${notes}</div><div style="font-size:0.8rem;opacity:0.8;">Notes</div></div>
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${ms}</div><div style="font-size:0.8rem;opacity:0.8;">Model Sets</div></div>
          </div>
        </div>
      </div>
      <div class="container" style="padding:2rem 1rem;">

        <div class="tabs" style="margin-bottom:1.25rem;">
          <button class="tab-btn ${this.activeTab === 'all' ? 'active' : ''}" data-tab="all">All (${all.length})</button>
          <button class="tab-btn ${this.activeTab === 'question-paper' ? 'active' : ''}" data-tab="question-paper">${Utils.getIcon('file-text', 16)} Question Papers (${qp})</button>
          <button class="tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">${Utils.getIcon('book-marked', 16)} Notes (${notes})</button>
          <button class="tab-btn ${this.activeTab === 'model-set' ? 'active' : ''}" data-tab="model-set">${Utils.getIcon('award', 16)} Model Sets (${ms})</button>
        </div>

        <div style="margin-bottom:1.5rem;">
          <div class="books-search" style="max-width:100%;display:flex;gap:0.75rem;flex-wrap:wrap;">
            <div style="position:relative;flex:1;min-width:220px;">
              ${Utils.getIcon('search', 18)}
              <input type="text" id="sm-search" placeholder="Search by title, subject, or description..." value="${Utils.escapeHtml(this.searchQuery)}" style="padding-left:2.5rem;">
            </div>
            <select id="sm-grade" class="form-input" style="width:auto;min-width:130px;">
              <option value="">All Grades</option>
              ${grades.map(g => `<option value="${g}" ${String(this.gradeFilter) === String(g) ? 'selected' : ''}>Grade ${g}</option>`).join('')}
            </select>
            <select id="sm-subject" class="form-input" style="width:auto;min-width:170px;">
              <option value="">All Subjects</option>
              ${subjects.map(s => `<option value="${Utils.escapeHtml(s)}" ${this.subjectFilter === s ? 'selected' : ''}>${Utils.escapeHtml(s)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="sm-content">${this.renderContent(filtered)}</div>
      </div>`;
  },

  renderContent(items) {
    if (!items.length) {
      return `<div class="empty-state">${Utils.getIcon('file-text', 48)}<h3>No Study Materials Found</h3><p>No ${this.activeTab === 'all' ? '' : this.TYPE_CONFIG[this.activeTab].label + 's '}available${this.searchQuery || this.gradeFilter || this.subjectFilter ? ' for the selected filters' : ''}.</p></div>`;
    }
    return `<div class="grid-3">${items.map(m => {
      const cfg = this.TYPE_CONFIG[m.type] || this.TYPE_CONFIG['notes'];
      const downloads = m.downloads || 0;
      return `
        <div class="card" style="overflow:hidden;">
          <div style="position:relative;height:120px;background:linear-gradient(135deg,${cfg.color}22,${cfg.color}11);display:flex;align-items:center;justify-content:center;">
            <span style="font-size:2.6rem;color:${cfg.color};">${Utils.getIcon(cfg.icon, 44)}</span>
            <span class="badge" style="position:absolute;top:0.75rem;right:0.75rem;background:${cfg.color};color:#fff;">${cfg.label}</span>
            ${m.grade ? `<span class="badge" style="position:absolute;top:0.75rem;left:0.75rem;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);">Grade ${Utils.escapeHtml(m.grade)}</span>` : ''}
          </div>
          <div class="card-body">
            <h4 style="margin:0 0 0.25rem;font-size:0.95rem;line-height:1.35;">${Utils.escapeHtml(m.title)}</h4>
            <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.5rem;">
              ${m.subject ? `<span class="badge badge-info">${Utils.escapeHtml(m.subject)}</span>` : ''}
              ${m.examType ? `<span class="badge badge-primary">${Utils.escapeHtml(m.examType)}</span>` : ''}
              ${m.year ? `<span class="badge">${Utils.escapeHtml(m.year)}</span>` : ''}
            </div>
            ${m.description ? `<p style="margin:0 0 0.5rem;color:var(--text-secondary);font-size:0.8rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${Utils.escapeHtml(m.description)}</p>` : ''}
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;font-size:0.78rem;color:var(--text-tertiary);">
              <span>${Utils.getIcon('user', 12)} ${Utils.escapeHtml(m.uploadedBy || 'Librarian')}</span>
              <span style="display:flex;align-items:center;gap:4px;">${Utils.getIcon('download', 12)} ${downloads}</span>
            </div>
            <div style="display:flex;gap:0.5rem;">
              ${m.pdfUrl
                ? `<button class="btn btn-primary btn-sm" onclick="StudyMaterialsPage.openPdf(${m.id})">${Utils.getIcon('eye', 14)} Read</button>`
                : `<button class="btn btn-primary btn-sm" disabled title="No file uploaded">${Utils.getIcon('eye', 14)} Read</button>`}
              ${m.pdfUrl
                ? `<a class="btn btn-outline btn-sm" href="${Utils.escapeHtml(m.pdfUrl)}" download onclick="StudyMaterialsPage.countDownload(${m.id})">${Utils.getIcon('download', 14)} Download</a>`
                : `<button class="btn btn-outline btn-sm" disabled>${Utils.getIcon('download', 14)} Download</button>`}
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
    this._refreshContent();
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  },

  _refreshContent() {
    const content = document.getElementById('sm-content');
    if (content) content.innerHTML = this.renderContent(this._filtered());
  },

  afterRender() {
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
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
