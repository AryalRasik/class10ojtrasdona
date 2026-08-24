const AdminImportPage = {
  state: {
    stats: {
      missingCovers: 0,
      missingDescriptions: 0,
      missingPdfs: 0,
      lastImportDate: null,
    },
    booksNeedingData: [],
    selectedBooks: new Set(),
    scanResults: [],
    importHistory: [],
    importProgress: { active: false, current: 0, total: 0, message: "" },
    manualGrade: "",
    manualSubject: "",
  },

  render() {
    return `
      <div class="admin-import-page">
        ${this.renderHeader()}
        ${this.renderStatusDashboard()}
        ${this.renderAutoImportSection()}
        ${this.renderManualImportSection()}
        ${this.renderImportHistory()}
        ${this.renderCDCSourceInfo()}
      </div>
    `;
  },

  renderHeader() {
    return `
      <div class="page-header">
        <h1>Import Book Data</h1>
        <p class="description">Automatically fetch book information from CDC website</p>
      </div>
    `;
  },

  renderStatusDashboard() {
    const { stats } = this.state;
    return `
      <div class="status-dashboard">
        <div class="dashboard-cards">
          <div class="stat-card warning">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <div class="stat-content">
              <span class="stat-value" id="missing-covers">${stats.missingCovers}</span>
              <span class="stat-label">Books Missing Covers</span>
            </div>
          </div>
          <div class="stat-card info">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
            </div>
            <div class="stat-content">
              <span class="stat-value" id="missing-descriptions">${stats.missingDescriptions}</span>
              <span class="stat-label">Books Missing Descriptions</span>
            </div>
          </div>
          <div class="stat-card danger">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="stat-content">
              <span class="stat-value" id="missing-pdfs">${stats.missingPdfs}</span>
              <span class="stat-label">Books Missing PDFs</span>
            </div>
          </div>
          <div class="stat-card neutral">
            <div class="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="stat-content">
              <span class="stat-value" id="last-import-date">${stats.lastImportDate || "Never"}</span>
              <span class="stat-label">Last Import Date</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderAutoImportSection() {
    const { scanResults, selectedBooks, importProgress } = this.state;
    return `
      <div class="auto-import-section">
        <div class="section-header">
          <h2>Auto-Import</h2>
          <button class="btn btn-primary" id="scan-database-btn" onclick="AdminImportPage.scanDatabase()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            Scan Database
          </button>
        </div>

        ${importProgress.active ? this.renderProgressBar(importProgress) : ""}

        ${scanResults.length > 0 ? `
          <div class="scan-results">
            <div class="results-header">
              <span class="results-count">${scanResults.length} books need data</span>
              <div class="results-actions">
                <button class="btn btn-secondary" onclick="AdminImportPage.selectAllBooks()">Select All</button>
                <button class="btn btn-danger" onclick="AdminImportPage.deselectAllBooks()">Deselect All</button>
                <button class="btn btn-primary" onclick="AdminImportPage.importSelected()" ${selectedBooks.size === 0 ? "disabled" : ""}>
                  Import Selected (${selectedBooks.size})
                </button>
                <button class="btn btn-success" onclick="AdminImportPage.importAll()">
                  Import All
                </button>
              </div>
            </div>
            <div class="results-table-wrapper">
              <table class="results-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" id="select-all-checkbox" onchange="AdminImportPage.toggleSelectAll(this.checked)" /></th>
                    <th>Title</th>
                    <th>Grade</th>
                    <th>Subject</th>
                    <th>Missing Data</th>
                  </tr>
                </thead>
                <tbody>
                  ${scanResults.map((book, index) => this.renderBookRow(book, index)).join("")}
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <p>Click "Scan Database" to find books that need data</p>
          </div>
        `}
      </div>
    `;
  },

  renderBookRow(book, index) {
    const { selectedBooks } = this.state;
    const isSelected = selectedBooks.has(index);
    const missing = [];
    if (book.missingCover) missing.push('<span class="badge badge-warning">Cover</span>');
    if (book.missingDescription) missing.push('<span class="badge badge-info">Description</span>');
    if (book.missingPdf) missing.push('<span class="badge badge-danger">PDF</span>');

    return `
      <tr class="${isSelected ? "selected" : ""}">
        <td><input type="checkbox" ${isSelected ? "checked" : ""} onchange="AdminImportPage.toggleBookSelection(${index}, this.checked)" /></td>
        <td class="book-title">${this.escapeHtml(book.title)}</td>
        <td>${book.grade}</td>
        <td>${book.subject}</td>
        <td class="missing-data">${missing.join(" ")}</td>
      </tr>
    `;
  },

  renderProgressBar(progress) {
    const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
    return `
      <div class="progress-section">
        <div class="progress-info">
          <span class="progress-message">${this.escapeHtml(progress.message)}</span>
          <span class="progress-count">${progress.current}/${progress.total}</span>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar" style="width: ${percentage}%"></div>
        </div>
        <span class="progress-percentage">${percentage}%</span>
      </div>
    `;
  },

  renderManualImportSection() {
    const { manualGrade, manualSubject } = this.state;
    const grades = Array.from({ length: 12 }, (_, i) => i + 1);
    const subjects = ["Nepali", "English", "Math", "Science", "Social Studies", "Health & Physical Education", "Occupational Studies", "Moral Education"];

    return `
      <div class="manual-import-section">
        <div class="section-header">
          <h2>Manual Import</h2>
        </div>
        <div class="manual-form">
          <div class="form-row">
            <div class="form-group">
              <label for="grade-selector">Grade</label>
              <select id="grade-selector" class="form-control" onchange="AdminImportPage.updateManualGrade(this.value)">
                <option value="">Select Grade</option>
                ${grades.map(g => `<option value="${g}" ${manualGrade === String(g) ? "selected" : ""}>Grade ${g}</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="subject-selector">Subject</label>
              <select id="subject-selector" class="form-control" onchange="AdminImportPage.updateManualSubject(this.value)">
                <option value="">Select Subject</option>
                ${subjects.map(s => `<option value="${s}" ${manualSubject === s ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </div>
          </div>

          <button class="btn btn-primary" onclick="AdminImportPage.previewManualImport()" ${!manualGrade || !manualSubject ? "disabled" : ""}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Import from CDC
          </button>

          <div id="manual-preview" class="manual-preview"></div>
        </div>
      </div>
    `;
  },

  renderImportHistory() {
    const { importHistory } = this.state;
    return `
      <div class="import-history-section">
        <div class="section-header">
          <h2>Import History</h2>
        </div>
        ${importHistory.length > 0 ? `
          <table class="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Books Imported</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${importHistory.map(entry => this.renderHistoryRow(entry)).join("")}
            </tbody>
          </table>
        ` : `
          <div class="empty-state small">
            <p>No import history yet</p>
          </div>
        `}
      </div>
    `;
  },

  renderHistoryRow(entry) {
    const statusClass = entry.status === "success" ? "badge-success" : entry.status === "partial" ? "badge-warning" : "badge-danger";
    return `
      <tr>
        <td>${entry.date}</td>
        <td>${entry.booksImported}</td>
        <td><span class="badge ${statusClass}">${entry.status}</span></td>
        <td class="log-details">${this.escapeHtml(entry.details)}</td>
      </tr>
    `;
  },

  renderCDCSourceInfo() {
    return `
      <div class="cdc-source-info">
        <div class="section-header">
          <h2>CDC Source Info</h2>
        </div>
        <div class="source-details">
          <div class="source-row">
            <span class="source-label">Primary Source:</span>
            <a href="https://moecdc.gov.np" target="_blank" rel="noopener noreferrer">https://moecdc.gov.np</a>
          </div>
          <div class="source-row">
            <span class="source-label">Priority:</span>
            <span class="priority-chain">CDC → Local DB → Manual Upload</span>
          </div>
          <div class="source-row">
            <span class="source-label">Note:</span>
            <span>Only publicly available educational materials</span>
          </div>
        </div>
      </div>
    `;
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  async init() {
    await this.loadStats();
    this.render();
  },

  async loadStats() {
    try {
      if (typeof API !== "undefined" && API.get) {
        const stats = await API.get("/api/admin/import/stats");
        if (stats) {
          this.state.stats = { ...this.state.stats, ...stats };
        }
      }
    } catch (e) {
      console.warn("Could not load import stats:", e);
    }
  },

  async scanDatabase() {
    const btn = document.getElementById("scan-database-btn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Scanning...';
    }

    try {
      if (typeof API !== "undefined" && API.get) {
        const results = await API.get("/api/admin/import/scan");
        if (results && Array.isArray(results)) {
          this.state.scanResults = results;
          this.state.selectedBooks.clear();
        }
      } else {
        this.state.scanResults = this.getMockScanResults();
        this.state.selectedBooks.clear();
      }
      this.refreshScanResults();
    } catch (e) {
      console.error("Scan failed:", e);
      alert("Scan failed. Please try again.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> Scan Database';
      }
    }
  },

  getMockScanResults() {
    return [
      { title: "Science Grade 7", grade: "7", subject: "Science", missingCover: true, missingDescription: false, missingPdf: true },
      { title: "English Grade 5", grade: "5", subject: "English", missingCover: false, missingDescription: true, missingPdf: false },
      { title: "Math Grade 9", grade: "9", subject: "Math", missingCover: true, missingDescription: true, missingPdf: true },
      { title: "Nepali Grade 3", grade: "3", subject: "Nepali", missingCover: true, missingDescription: false, missingPdf: false },
    ];
  },

  refreshScanResults() {
    const section = document.querySelector(".auto-import-section");
    if (section) {
      section.outerHTML = this.renderAutoImportSection();
    }
    document.getElementById("missing-covers").textContent = this.state.stats.missingCovers;
    document.getElementById("missing-descriptions").textContent = this.state.stats.missingDescriptions;
    document.getElementById("missing-pdfs").textContent = this.state.stats.missingPdfs;
  },

  toggleBookSelection(index, checked) {
    if (checked) {
      this.state.selectedBooks.add(index);
    } else {
      this.state.selectedBooks.delete(index);
    }
    this.updateImportButtons();
    this.updateTableRow(index, checked);
  },

  toggleSelectAll(checked) {
    if (checked) {
      this.state.scanResults.forEach((_, i) => this.state.selectedBooks.add(i));
    } else {
      this.state.selectedBooks.clear();
    }
    this.updateImportButtons();
    document.querySelectorAll(".results-table tbody tr").forEach((row, i) => {
      const checkbox = row.querySelector("input[type='checkbox']");
      if (checkbox) checkbox.checked = checked;
      row.classList.toggle("selected", checked);
    });
  },

  updateTableRow(index, selected) {
    const rows = document.querySelectorAll(".results-table tbody tr");
    if (rows[index]) {
      rows[index].classList.toggle("selected", selected);
    }
  },

  updateImportButtons() {
    const selectedBtn = document.querySelector('.results-actions .btn-primary');
    if (selectedBtn) {
      const count = this.state.selectedBooks.size;
      selectedBtn.textContent = `Import Selected (${count})`;
      selectedBtn.disabled = count === 0;
    }
  },

  selectAllBooks() {
    this.state.scanResults.forEach((_, i) => this.state.selectedBooks.add(i));
    this.updateImportButtons();
    document.querySelectorAll(".results-table tbody tr").forEach(row => {
      row.classList.add("selected");
      const checkbox = row.querySelector("input[type='checkbox']");
      if (checkbox) checkbox.checked = true;
    });
  },

  deselectAllBooks() {
    this.state.selectedBooks.clear();
    this.updateImportButtons();
    document.querySelectorAll(".results-table tbody tr").forEach(row => {
      row.classList.remove("selected");
      const checkbox = row.querySelector("input[type='checkbox']");
      if (checkbox) checkbox.checked = false;
    });
  },

  async importSelected() {
    const indices = Array.from(this.state.selectedBooks);
    const books = indices.map(i => this.state.scanResults[i]);
    await this.runImport(books);
  },

  async importAll() {
    await this.runImport([...this.state.scanResults]);
  },

  async runImport(books) {
    if (books.length === 0) return;
    if (!confirm(`Import data for ${books.length} book(s)?`)) return;

    this.state.importProgress = { active: true, current: 0, total: books.length, message: "Starting import..." };
    this.render();

    for (let i = 0; i < books.length; i++) {
      this.state.importProgress.current = i + 1;
      this.state.importProgress.message = `Importing: ${books[i].title}`;
      this.render();

      try {
        if (typeof API !== "undefined" && API.post) {
          await API.post("/api/admin/import/book", { book: books[i] });
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        console.error(`Failed to import ${books[i].title}:`, e);
      }
    }

    this.state.importProgress = { active: false, current: 0, total: 0, message: "" };
    this.state.stats.lastImportDate = new Date().toLocaleDateString();
    this.state.stats.missingCovers = Math.max(0, this.state.stats.missingCovers - books.filter(b => b.missingCover).length);
    this.state.stats.missingDescriptions = Math.max(0, this.state.stats.missingDescriptions - books.filter(b => b.missingDescription).length);
    this.state.stats.missingPdfs = Math.max(0, this.state.stats.missingPdfs - books.filter(b => b.missingPdf).length);

    this.state.importHistory.unshift({
      date: new Date().toLocaleString(),
      booksImported: books.length,
      status: "success",
      details: `Imported ${books.length} books from CDC`,
    });

    this.state.scanResults = this.state.scanResults.filter(book => !books.includes(book));
    this.state.selectedBooks.clear();

    this.render();
  },

  updateManualGrade(value) {
    this.state.manualGrade = value;
    this.render();
  },

  updateManualSubject(value) {
    this.state.manualSubject = value;
    this.render();
  },

  async previewManualImport() {
    const { manualGrade, manualSubject } = this.state;
    if (!manualGrade || !manualSubject) return;

    const previewEl = document.getElementById("manual-preview");
    if (!previewEl) return;

    previewEl.innerHTML = '<div class="loading-indicator"><span class="spinner"></span> Checking CDC for available data...</div>';

    try {
      let previewData;
      if (typeof API !== "undefined" && API.get) {
        previewData = await API.get(`/api/admin/import/preview?grade=${manualGrade}&subject=${encodeURIComponent(manualSubject)}`);
      } else {
        previewData = this.getMockPreview(manualGrade, manualSubject);
      }

      previewEl.innerHTML = `
        <div class="preview-content">
          <h3>Available Data for Grade ${manualGrade} - ${this.escapeHtml(manualSubject)}</h3>
          <div class="preview-items">
            <div class="preview-item">
              <span class="preview-label">Books Found:</span>
              <span class="preview-value">${previewData.booksFound || 0}</span>
            </div>
            <div class="preview-item">
              <span class="preview-label">Covers Available:</span>
              <span class="preview-value">${previewData.coversAvailable || 0}</span>
            </div>
            <div class="preview-item">
              <span class="preview-label">Descriptions Available:</span>
              <span class="preview-value">${previewData.descriptionsAvailable || 0}</span>
            </div>
            <div class="preview-item">
              <span class="preview-label">PDFs Available:</span>
              <span class="preview-value">${previewData.pdfsAvailable || 0}</span>
            </div>
          </div>
          <button class="btn btn-success" onclick="AdminImportPage.confirmManualImport()">
            Confirm Import
          </button>
        </div>
      `;
    } catch (e) {
      previewEl.innerHTML = '<div class="error-message">Failed to fetch preview data. Please try again.</div>';
    }
  },

  getMockPreview(grade, subject) {
    return { booksFound: 3, coversAvailable: 2, descriptionsAvailable: 3, pdfsAvailable: 1 };
  },

  async confirmManualImport() {
    const { manualGrade, manualSubject } = this.state;
    if (!confirm(`Import Grade ${manualGrade} ${manualSubject} from CDC?`)) return;

    this.state.importProgress = { active: true, current: 0, total: 1, message: `Importing Grade ${manualGrade} ${manualSubject}...` };
    this.render();

    try {
      if (typeof API !== "undefined" && API.post) {
        await API.post("/api/admin/import/manual", { grade: manualGrade, subject: manualSubject });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.state.stats.lastImportDate = new Date().toLocaleDateString();
      this.state.importHistory.unshift({
        date: new Date().toLocaleString(),
        booksImported: 1,
        status: "success",
        details: `Manual import: Grade ${manualGrade} ${manualSubject}`,
      });

      this.state.importProgress = { active: false, current: 0, total: 0, message: "" };
      this.state.manualGrade = "";
      this.state.manualSubject = "";
      this.render();
      alert("Import completed successfully!");
    } catch (e) {
      this.state.importProgress = { active: false, current: 0, total: 0, message: "" };
      this.render();
      alert("Import failed. Please try again.");
    }
  },
};
