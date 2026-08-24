const AdminStudyMaterialsPage = {
  searchQuery: '',
  typeFilter: '',
  gradeFilter: '',

  TYPE_CONFIG: {
    'question-paper': 'Question Paper',
    'notes': 'Notes',
    'model-set': 'Model Set'
  },

  _all() {
    return AppState.getAllStudyMaterials ? AppState.getAllStudyMaterials() : (AppState.studyMaterials || []);
  },

  _filtered() {
    let items = this._all().slice();
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q)
      );
    }
    if (this.typeFilter) items = items.filter(m => m.type === this.typeFilter);
    if (this.gradeFilter) items = items.filter(m => String(m.grade) === String(this.gradeFilter));
    return items;
  },

  render() {
    const all = this._all();
    const items = this._filtered();
    const subjects = [...new Set(all.map(m => m.subject).filter(Boolean))].sort();
    const grades = [...new Set(all.map(m => m.grade).filter(Boolean))].sort((a, b) => a - b);

    return `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <div><h1 class="page-title">${Utils.getIcon('file-text', 28)} Study Materials</h1><p class="page-description">${all.length} uploaded materials</p></div>
            <button class="btn btn-primary" onclick="AdminStudyMaterialsPage.addMaterial()">${Utils.getIcon('plus', 16)} Upload Material</button>
          </div>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1rem 1.5rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;">
            <div style="flex:1;min-width:200px;position:relative;">
              <input class="form-input" placeholder="Search by title or subject..." value="${Utils.escapeHtml(this.searchQuery)}" oninput="AdminStudyMaterialsPage.onSearch(this.value)" style="padding-left:2.5rem;">
              <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
            </div>
            <select class="form-input" style="width:auto;min-width:160px;" onchange="AdminStudyMaterialsPage.onTypeFilter(this.value)">
              <option value="">All Types</option>
              ${Object.entries(this.TYPE_CONFIG).map(([v, l]) => `<option value="${v}" ${this.typeFilter === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
            <select class="form-input" style="width:auto;min-width:130px;" onchange="AdminStudyMaterialsPage.onGradeFilter(this.value)">
              <option value="">All Grades</option>
              ${grades.map(g => `<option value="${g}" ${String(this.gradeFilter) === String(g) ? 'selected' : ''}>Grade ${g}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="card">
          <div class="table-wrap"><table class="data-table">
            <thead><tr>
              <th>Title</th>
              <th>Type</th>
              <th>Grade</th>
              <th>Subject</th>
              <th>Year</th>
              <th>Downloads</th>
              <th>File</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${items.map(m => `
                <tr>
                  <td><div><strong>${Utils.escapeHtml(m.title)}</strong><br><small style="color:var(--text-secondary);">by ${Utils.escapeHtml(m.uploadedBy || 'Librarian')}</small></div></td>
                  <td><span class="badge badge-info">${this.TYPE_CONFIG[m.type] || m.type}</span></td>
                  <td>${m.grade ? 'Grade ' + Utils.escapeHtml(m.grade) : 'N/A'}</td>
                  <td style="font-size:0.85rem;">${Utils.escapeHtml(m.subject || 'N/A')}</td>
                  <td style="font-size:0.85rem;">${Utils.escapeHtml(m.year || 'N/A')}</td>
                  <td>${m.downloads || 0}</td>
                  <td>${m.pdfUrl
                    ? `<span class="badge badge-success">${Utils.getIcon('check', 12)} PDF</span>`
                    : `<span class="badge badge-warning">No file</span>`}</td>
                  <td><div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                    ${m.pdfUrl ? `<button class="btn btn-ghost btn-sm" onclick="AdminStudyMaterialsPage.viewMaterial(${m.id})" title="View">${Utils.getIcon('eye', 14)}</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="AdminStudyMaterialsPage.editMaterial(${m.id})" title="Edit">${Utils.getIcon('edit-2', 14)}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminStudyMaterialsPage.deleteMaterial(${m.id})" title="Delete" style="color:var(--danger);">${Utils.getIcon('trash-2', 14)}</button>
                  </div></td>
                </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:2rem;">No study materials found.</td></tr>'}
            </tbody>
          </table></div>
        </div>
      </div>`;
  },

  onSearch(value) {
    this.searchQuery = value;
    this.refresh();
  },

  onTypeFilter(value) {
    this.typeFilter = value;
    this.refresh();
  },

  onGradeFilter(value) {
    this.gradeFilter = value;
    this.refresh();
  },

  _form(m) {
    const subjects = [...new Set(this._all().map(x => x.subject).filter(Boolean))].sort();
    return `
      <div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="sm-title" value="${Utils.escapeHtml(m.title || '')}" placeholder="e.g. SEE Compulsory Mathematics Question Paper 2081"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Type</label>
          <select class="form-input" id="sm-type">
            <option value="question-paper" ${m.type === 'question-paper' ? 'selected' : ''}>Question Paper</option>
            <option value="notes" ${m.type === 'notes' ? 'selected' : ''}>Notes</option>
            <option value="model-set" ${m.type === 'model-set' ? 'selected' : ''}>Model Set</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Grade</label>
          <select class="form-input" id="sm-grade">
            <option value="">Any / All</option>
            ${Array.from({ length: 12 }, (_, i) => i + 1).map(g => `<option value="${g}" ${String(m.grade) === String(g) ? 'selected' : ''}>Grade ${g}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Subject</label>
          <input class="form-input" id="sm-subject" value="${Utils.escapeHtml(m.subject || '')}" placeholder="e.g. Compulsory Mathematics" list="sm-subjects">
          <datalist id="sm-subjects">${subjects.map(s => `<option value="${Utils.escapeHtml(s)}">`).join('')}</datalist>
        </div>
        <div class="form-group"><label class="form-label">Year</label><input class="form-input" id="sm-year" value="${Utils.escapeHtml(m.year || '')}" placeholder="e.g. 2082"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Exam Type</label><input class="form-input" id="sm-examtype" value="${Utils.escapeHtml(m.examType || '')}" placeholder="e.g. SEE, BLE, NEB, First Term"></div>
        <div class="form-group"><label class="form-label">Uploaded By</label><input class="form-input" id="sm-uploadedby" value="${Utils.escapeHtml(m.uploadedBy || (AppState.currentUser ? AppState.currentUser.name : 'Librarian'))}"></div>
      </div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="sm-description" rows="3" placeholder="Short description of the material">${Utils.escapeHtml(m.description || '')}</textarea></div>
      <div class="form-group">
        <label class="form-label">PDF File</label>
        <div style="display:flex;gap:1rem;align-items:flex-start;">
          <div style="flex:1;min-width:0;">
            <input type="hidden" id="sm-pdfurl" value="${Utils.escapeHtml(m.pdfUrl || '')}">
            <label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin-bottom:0.5rem;">
              ${Utils.getIcon('upload', 14)} Upload PDF
              <input type="file" id="sm-pdf-file" accept="application/pdf" style="display:none;" onchange="AdminStudyMaterialsPage.onPdfFile(this)">
            </label>
            <span id="sm-pdf-name" style="font-size:0.75rem;color:var(--text-secondary);">${m.pdfUrl ? 'PDF attached' : ''}</span>
            <div style="display:flex;gap:0.5rem;align-items:center;">
              <span style="font-size:0.75rem;color:var(--text-tertiary);flex-shrink:0;">or paste URL</span>
              <input class="form-input" id="sm-pdf-url-input" style="flex:1;padding:0.4rem 0.6rem;font-size:0.8rem;" value="${m.pdfUrl && !String(m.pdfUrl).startsWith('data:') ? Utils.escapeHtml(m.pdfUrl) : ''}" placeholder="https://... or assets/pdfs/..." oninput="AdminStudyMaterialsPage.onPdfUrl(this.value)">
            </div>
            ${m.pdfUrl ? `<button class="btn btn-ghost btn-sm" onclick="AdminStudyMaterialsPage.clearPdf()" style="margin-top:0.4rem;">${Utils.getIcon('trash-2', 13)} Remove PDF</button>` : ''}
          </div>
        </div>
      </div>`;
  },

  onPdfFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { Toast.error('Please choose a PDF file'); input.value = ''; return; }
    if (file.size > 3 * 1024 * 1024) { Toast.error('PDF must be smaller than 3MB (demo storage limit). Use a URL for larger files.'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const hidden = document.getElementById('sm-pdfurl');
      if (hidden) hidden.value = e.target.result;
      const urlInput = document.getElementById('sm-pdf-url-input');
      if (urlInput) urlInput.value = '';
      const nameEl = document.getElementById('sm-pdf-name');
      if (nameEl) nameEl.textContent = file.name + ' (embedded)';
      if (input) input.value = '';
      Toast.success('PDF attached');
    };
    reader.readAsDataURL(file);
  },

  onPdfUrl(value) {
    const hidden = document.getElementById('sm-pdfurl');
    if (hidden) hidden.value = value.trim();
  },

  clearPdf() {
    const hidden = document.getElementById('sm-pdfurl');
    if (hidden) hidden.value = '';
    const urlInput = document.getElementById('sm-pdf-url-input');
    if (urlInput) urlInput.value = '';
    const nameEl = document.getElementById('sm-pdf-name');
    if (nameEl) nameEl.textContent = '';
  },

  _gather() {
    return {
      title: document.getElementById('sm-title')?.value?.trim() || '',
      type: document.getElementById('sm-type')?.value || 'notes',
      grade: document.getElementById('sm-grade')?.value || '',
      subject: document.getElementById('sm-subject')?.value?.trim() || '',
      year: document.getElementById('sm-year')?.value?.trim() || '',
      examType: document.getElementById('sm-examtype')?.value?.trim() || '',
      uploadedBy: document.getElementById('sm-uploadedby')?.value?.trim() || 'Librarian',
      description: document.getElementById('sm-description')?.value?.trim() || '',
      pdfUrl: document.getElementById('sm-pdfurl')?.value?.trim() || ''
    };
  },

  addMaterial() {
    Modal.show({
      title: 'Upload Study Material',
      content: this._form({}),
      buttons: [
        { label: 'Upload', class: 'btn-primary', onClick: () => {
          const data = this._gather();
          if (!data.title) { Toast.error('Title is required'); return; }
          AppState.addStudyMaterial(data);
          Toast.success('Study material uploaded');
          Modal.hide();
          this.refresh();
        }},
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'lg'
    });
  },

  editMaterial(id) {
    const m = this._all().find(x => x.id === id);
    if (!m) return;
    Modal.show({
      title: 'Edit Study Material',
      content: this._form(m),
      buttons: [
        { label: 'Save Changes', class: 'btn-primary', onClick: () => {
          const data = this._gather();
          if (!data.title) { Toast.error('Title is required'); return; }
          AppState.updateStudyMaterial(id, data);
          Toast.success('Study material updated');
          Modal.hide();
          this.refresh();
        }},
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'lg'
    });
  },

  viewMaterial(id) {
    const m = this._all().find(x => x.id === id);
    if (!m) return;
    Utils.openPdfViewer(m.title, m.pdfUrl);
  },

  deleteMaterial(id) {
    const m = this._all().find(x => x.id === id);
    if (!m) return;
    Modal.confirm('Delete Study Material', `Delete "${m.title}"? This cannot be undone.`, () => {
      AppState.deleteStudyMaterial(id);
      Toast.success('Study material deleted');
      this.refresh();
    });
  },

  refresh() {
    Router.resolve();
  },

  afterRender() {}
};
