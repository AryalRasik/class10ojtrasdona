const AdminBooksPage = {
  searchQuery: '',
  categoryFilter: '',
  statusFilter: '',
  currentPage: 1,
  perPage: 15,
  sortField: 'title',
  sortDir: 'asc',

  render() {
    const books = AppState.books || [];
    let filtered = [...books];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.isbn || '').toLowerCase().includes(q) ||
        (b.publisher || '').toLowerCase().includes(q)
      );
    }
    if (this.categoryFilter) {
      filtered = filtered.filter(b => (b.category || '') === this.categoryFilter);
    }
    if (this.statusFilter === 'available') {
      filtered = filtered.filter(b => b.availableCopies > 0);
    } else if (this.statusFilter === 'unavailable') {
      filtered = filtered.filter(b => b.availableCopies === 0);
    } else if (this.statusFilter === 'overdue') {
      const overdueIds = AppState.borrowRequests.filter(r => r.status === 'overdue').map(r => r.bookId);
      filtered = filtered.filter(b => overdueIds.includes(b.id));
    }

    filtered.sort((a, b) => {
      let av = a[this.sortField] || '', bv = b[this.sortField] || '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (this.sortDir === 'asc') return av > bv ? 1 : av < bv ? -1 : 0;
      return av < bv ? 1 : av > bv ? -1 : 0;
    });

    const totalPages = Math.ceil(filtered.length / this.perPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const paged = filtered.slice((this.currentPage - 1) * this.perPage, this.currentPage * this.perPage);
    const categories = [...new Set(books.map(b => b.category).filter(Boolean))].sort();

    return `
      <div class="page-header">
        <div class="container">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
            <div><h1 class="page-title">${Utils.getIcon('book', 28)} Manage Books</h1><p class="page-description">${books.length} books in library</p></div>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
              <button class="btn btn-outline" onclick="AdminBooksPage.bulkImport()">${Utils.getIcon('upload', 16)} Bulk Import</button>
              <button class="btn btn-outline" onclick="AdminBooksPage.bulkExportCSV()">${Utils.getIcon('download', 16)} Export CSV</button>
              <button class="btn btn-outline" onclick="AdminBooksPage.importCDC()">${Utils.getIcon('book-dashed', 16)} Import CDC</button>
              <button class="btn btn-primary" onclick="AdminBooksPage.addBook()">${Utils.getIcon('plus', 16)} Add Book</button>
            </div>
          </div>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="card" style="margin-bottom:1.5rem;">
          <div style="padding:1rem 1.5rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;">
            <div style="flex:1;min-width:200px;position:relative;">
              <input class="form-input" placeholder="Search by title, author, ISBN, publisher..." value="${Utils.escapeHtml(this.searchQuery)}" oninput="AdminBooksPage.onSearch(this.value)" style="padding-left:2.5rem;">
              <span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 16)}</span>
            </div>
            <select class="form-input" style="width:auto;min-width:160px;" onchange="AdminBooksPage.onCategoryFilter(this.value)">
              <option value="">All Categories</option>
              ${categories.map(c => `<option value="${Utils.escapeHtml(c)}" ${this.categoryFilter === c ? 'selected' : ''}>${Utils.escapeHtml(c)}</option>`).join('')}
            </select>
            <select class="form-input" style="width:auto;min-width:140px;" onchange="AdminBooksPage.onStatusFilter(this.value)">
              <option value="">All Status</option>
              <option value="available" ${this.statusFilter === 'available' ? 'selected' : ''}>Available</option>
              <option value="unavailable" ${this.statusFilter === 'unavailable' ? 'selected' : ''}>Unavailable</option>
              <option value="overdue" ${this.statusFilter === 'overdue' ? 'selected' : ''}>Overdue</option>
            </select>
          </div>
        </div>
        <div class="card">
          <div class="table-wrap"><table class="data-table">
            <thead><tr>
              <th style="cursor:pointer;" onclick="AdminBooksPage.sort('title')">Book ${this.sortField === 'title' ? (this.sortDir === 'asc' ? '&#9650;' : '&#9660;') : ''}</th>
              <th>ISBN</th>
              <th style="cursor:pointer;" onclick="AdminBooksPage.sort('category')">Category ${this.sortField === 'category' ? (this.sortDir === 'asc' ? '&#9650;' : '&#9660;') : ''}</th>
              <th>Rating</th>
              <th style="cursor:pointer;" onclick="AdminBooksPage.sort('availableCopies')">Available ${this.sortField === 'availableCopies' ? (this.sortDir === 'asc' ? '&#9650;' : '&#9660;') : ''}</th>
              <th>Shelf</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${paged.map(book => `
                <tr>
                  <td><div style="display:flex;align-items:center;gap:0.75rem;"><div style="width:40px;height:56px;flex-shrink:0;">${Utils.getBookCover(book)}</div><div><strong>${Utils.escapeHtml(book.title)}</strong><br><small style="color:var(--text-secondary);">${Utils.escapeHtml(book.author)}</small></div></div></td>
                  <td style="font-size:0.85rem;font-family:monospace;">${Utils.escapeHtml(book.isbn || 'N/A')}</td>
                  <td><span class="badge badge-info">${Utils.escapeHtml(book.category || '')}</span></td>
                  <td><span style="color:var(--warning);">${Utils.getIcon('star', 14)} ${(book.rating || 0).toFixed(1)}</span></td>
                  <td><span class="badge badge-${book.availableCopies > 0 ? 'success' : 'danger'}">${book.availableCopies || 0} / ${book.totalCopies || 0}</span></td>
                  <td style="font-size:0.85rem;">${Utils.escapeHtml(book.shelf || 'N/A')}</td>
                  <td><div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                    <button class="btn btn-ghost btn-sm" onclick="AdminBooksPage.viewBook(${book.id})" title="View">${Utils.getIcon('eye', 14)}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminBooksPage.editBook(${book.id})" title="Edit">${Utils.getIcon('edit-2', 14)}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminBooksPage.generateQR(${book.id})" title="QR Code">${Utils.getIcon('qr-code', 14)}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminBooksPage.generateBarcode(${book.id})" title="Barcode">${Utils.getIcon('hash', 14)}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminBooksPage.deleteBook(${book.id})" title="Delete" style="color:var(--danger);">${Utils.getIcon('trash-2', 14)}</button>
                  </div></td>
                </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:2rem;">No books found.</td></tr>'}
            </tbody>
          </table></div>
          ${totalPages > 1 ? `
          <div style="padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);">
            <small style="color:var(--text-secondary);">Showing ${(this.currentPage - 1) * this.perPage + 1}-${Math.min(this.currentPage * this.perPage, filtered.length)} of ${filtered.length}</small>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn btn-sm btn-outline" onclick="AdminBooksPage.prevPage()" ${this.currentPage <= 1 ? 'disabled' : ''}>Prev</button>
              <span style="padding:0.25rem 0.75rem;font-size:0.85rem;">${this.currentPage} / ${totalPages}</span>
              <button class="btn btn-sm btn-outline" onclick="AdminBooksPage.nextPage()" ${this.currentPage >= totalPages ? 'disabled' : ''}>Next</button>
            </div>
          </div>` : ''}
        </div>
      </div>`;
  },

  onSearch(value) { this.searchQuery = value; this.currentPage = 1; this.refresh(); },
  onCategoryFilter(value) { this.categoryFilter = value; this.currentPage = 1; this.refresh(); },
  onStatusFilter(value) { this.statusFilter = value; this.currentPage = 1; this.refresh(); },
  sort(field) {
    if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDir = 'asc'; }
    this.refresh();
  },
  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.refresh(); } },
  nextPage() { this.currentPage++; this.refresh(); },
  refresh() { Router.resolve(); },

  _bookForm(book) {
    const isEdit = !!book;
    const b = book || {};
    return `
      <div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="bf-title" value="${Utils.escapeHtml(b.title || '')}" placeholder="Book title"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Author *</label><input class="form-input" id="bf-author" value="${Utils.escapeHtml(b.author || '')}" placeholder="Author name"></div>
        <div class="form-group"><label class="form-label">ISBN</label><input class="form-input" id="bf-isbn" value="${Utils.escapeHtml(b.isbn || '')}" placeholder="ISBN number"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Category</label><input class="form-input" id="bf-category" value="${Utils.escapeHtml(b.category || '')}" placeholder="Category"></div>
        <div class="form-group"><label class="form-label">Subject</label><input class="form-input" id="bf-subject" value="${Utils.escapeHtml(b.subject || '')}" placeholder="Subject"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Publisher</label><input class="form-input" id="bf-publisher" value="${Utils.escapeHtml(b.publisher || '')}" placeholder="Publisher"></div>
        <div class="form-group"><label class="form-label">Year</label><input class="form-input" id="bf-year" type="number" value="${b.year || new Date().getFullYear()}" min="1900"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Language</label><input class="form-input" id="bf-language" value="${Utils.escapeHtml(b.language || 'English')}" placeholder="Language"></div>
        <div class="form-group"><label class="form-label">Grade</label><input class="form-input" id="bf-grade" value="${Utils.escapeHtml(b.grade || '')}" placeholder="Grade level"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Total Copies</label><input class="form-input" id="bf-copies" type="number" value="${b.totalCopies || 1}" min="1"></div>
        <div class="form-group"><label class="form-label">Available Copies</label><input class="form-input" id="bf-available" type="number" value="${b.availableCopies || b.totalCopies || 1}" min="0"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label class="form-label">Shelf</label><input class="form-input" id="bf-shelf" value="${Utils.escapeHtml(b.shelf || '')}" placeholder="e.g. CDC-G9"></div>
        <div class="form-group"><label class="form-label">Rack</label><input class="form-input" id="bf-rack" type="number" value="${b.rack || ''}" min="1" placeholder="Rack number"></div>
      </div>
      <div class="form-group"><label class="form-label">Pages</label><input class="form-input" id="bf-pages" type="number" value="${b.pages || ''}" min="1"></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="bf-description" rows="3" placeholder="Book description">${Utils.escapeHtml(b.description || '')}</textarea></div>
      <div class="form-group">
        <label class="form-label">Book Cover</label>
        <div style="display:flex;gap:1rem;align-items:flex-start;">
          <div id="cover-preview" style="width:88px;height:120px;border:1px dashed var(--border);border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);flex-shrink:0;">
            ${b.cover ? `<img src="${Utils.escapeHtml(b.cover)}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:0.7rem;color:var(--text-tertiary);text-align:center;padding:4px;">No cover</span>'}
          </div>
          <div style="flex:1;min-width:0;">
            <input type="hidden" id="bf-cover" value="${Utils.escapeHtml(b.cover || '')}">
            <label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin-bottom:0.5rem;">
              ${Utils.getIcon('upload', 14)} Upload Image
              <input type="file" id="bf-cover-file" accept="image/*" style="display:none;" onchange="AdminBooksPage.onCoverFile(this)">
            </label>
            <span id="cover-file-name" style="font-size:0.75rem;color:var(--text-secondary);"></span>
            <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
              <span style="font-size:0.75rem;color:var(--text-tertiary);flex-shrink:0;">or paste URL</span>
              <input class="form-input" id="bf-cover-url" style="flex:1;padding:0.4rem 0.6rem;font-size:0.8rem;" value="${b.cover && !String(b.cover).startsWith('data:') ? Utils.escapeHtml(b.cover) : ''}" placeholder="https://... or assets/covers/..." oninput="AdminBooksPage.onCoverUrl(this.value)">
            </div>
            ${b.cover ? `<button class="btn btn-ghost btn-sm" onclick="AdminBooksPage.clearCover()">${Utils.getIcon('trash-2', 13)} Remove cover</button>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  _gatherBookData() {
    return {
      title: document.getElementById('bf-title')?.value?.trim() || '',
      author: document.getElementById('bf-author')?.value?.trim() || '',
      isbn: document.getElementById('bf-isbn')?.value?.trim() || '',
      category: document.getElementById('bf-category')?.value?.trim() || '',
      subject: document.getElementById('bf-subject')?.value?.trim() || '',
      publisher: document.getElementById('bf-publisher')?.value?.trim() || '',
      year: parseInt(document.getElementById('bf-year')?.value) || new Date().getFullYear(),
      language: document.getElementById('bf-language')?.value?.trim() || 'English',
      grade: document.getElementById('bf-grade')?.value?.trim() || '',
      totalCopies: parseInt(document.getElementById('bf-copies')?.value) || 1,
      availableCopies: parseInt(document.getElementById('bf-available')?.value) || 0,
      shelf: document.getElementById('bf-shelf')?.value?.trim() || '',
      rack: parseInt(document.getElementById('bf-rack')?.value) || 0,
      pages: parseInt(document.getElementById('bf-pages')?.value) || 0,
      description: document.getElementById('bf-description')?.value?.trim() || '',
      cover: document.getElementById('bf-cover')?.value?.trim() || '',
    };
  },

  onCoverFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { Toast.error('Please choose an image file'); input.value = ''; return; }
    if (file.size > 5 * 1024 * 1024) { Toast.error('Image must be smaller than 5MB'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (e) => this._applyCover(e.target.result, file.name, input);
    reader.readAsDataURL(file);
  },

  _applyCover(dataUrl, name, input) {
    const img = new Image();
    img.onload = () => {
      const MAX_W = 400;
      const scale = Math.min(1, MAX_W / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.8);
      const hidden = document.getElementById('bf-cover');
      if (hidden) hidden.value = compressed;
      const urlInput = document.getElementById('bf-cover-url');
      if (urlInput) urlInput.value = '';
      const nameEl = document.getElementById('cover-file-name');
      if (nameEl) nameEl.textContent = name || 'Image selected';
      this._renderCoverPreview(compressed);
      if (input) input.value = '';
      Toast.success('Cover image added');
    };
    img.onerror = () => { Toast.error('Could not read this image'); if (input) input.value = ''; };
    img.src = dataUrl;
  },

  onCoverUrl(value) {
    const v = value.trim();
    const hidden = document.getElementById('bf-cover');
    if (hidden) hidden.value = v;
    if (v) this._renderCoverPreview(v);
  },

  clearCover() {
    const hidden = document.getElementById('bf-cover');
    if (hidden) hidden.value = '';
    const urlInput = document.getElementById('bf-cover-url');
    if (urlInput) urlInput.value = '';
    const nameEl = document.getElementById('cover-file-name');
    if (nameEl) nameEl.textContent = '';
    this._renderCoverPreview('');
  },

  _renderCoverPreview(src) {
    const preview = document.getElementById('cover-preview');
    if (!preview) return;
    preview.innerHTML = src
      ? `<img src="${Utils.escapeHtml(src)}" style="width:100%;height:100%;object-fit:cover;">`
      : '<span style="font-size:0.7rem;color:var(--text-tertiary);text-align:center;padding:4px;">No cover</span>';
  },

  addBook() {
    Modal.show({
      title: 'Add New Book',
      content: this._bookForm(null),
      buttons: [
        { label: 'Add Book', class: 'btn-primary', onClick: async () => {
          const data = this._gatherBookData();
          if (!data.title) { Toast.error('Title is required'); return; }
          if (!data.author) { Toast.error('Author is required'); return; }
          data.borrowCount = 0;
          data.rating = 0;
          data.reviews = [];
          data.status = data.availableCopies > 0 ? 'available' : 'unavailable';
          if (AppState.isSupabaseConnected) {
            try {
              const dbData = {
                title: data.title, author: data.author, isbn: data.isbn,
                category: data.category, subject: data.subject, publisher: data.publisher,
                year: data.year, language: data.language, grade: data.grade,
                total_copies: data.totalCopies, available_copies: data.availableCopies,
                shelf: data.shelf, rack: String(data.rack || ''), pages: data.pages,
                description: data.description, cover: data.cover, status: data.status,
                borrow_count: 0, rating: 0
              };
              const created = await Api.createBook(dbData);
              const mapped = Api.mapBook(created);
              AppState.books.push(mapped);
            } catch (e) {
              console.error('Supabase addBook failed:', e);
              Toast.error('Failed to add book: ' + (e.message || 'Unknown error'));
              return;
            }
          } else {
            data.id = Date.now();
            AppState.books.push(data);
          }
          AppState.saveAll();
          Toast.success('Book added successfully!');
          Modal.hide();
          this.refresh();
        }},
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'lg'
    });
  },

  editBook(id) {
    const book = (AppState.books || []).find(b => b.id === id);
    if (!book) return;
    Modal.show({
      title: 'Edit Book',
      content: this._bookForm(book),
      buttons: [
        { label: 'Save Changes', class: 'btn-primary', onClick: async () => {
          const data = this._gatherBookData();
          if (!data.title) { Toast.error('Title is required'); return; }
          if (AppState.isSupabaseConnected) {
            try {
              const dbData = {
                title: data.title, author: data.author, isbn: data.isbn,
                category: data.category, subject: data.subject, publisher: data.publisher,
                year: data.year, language: data.language, grade: data.grade,
                total_copies: data.totalCopies, available_copies: data.availableCopies,
                shelf: data.shelf, rack: String(data.rack || ''), pages: data.pages,
                description: data.description, cover: data.cover,
                status: data.availableCopies > 0 ? 'available' : 'unavailable'
              };
              const updated = await Api.updateBook(id, dbData);
              const mapped = Api.mapBook(updated);
              Object.assign(book, mapped);
            } catch (e) {
              console.error('Supabase updateBook failed:', e);
              Toast.error('Failed to update book: ' + (e.message || 'Unknown error'));
              return;
            }
          } else {
            Object.assign(book, data);
            book.status = book.availableCopies > 0 ? 'available' : 'unavailable';
          }
          AppState.saveAll();
          Toast.success('Book updated successfully!');
          Modal.hide();
          this.refresh();
        }},
        { label: 'Cancel', class: 'btn-outline', onClick: () => Modal.hide() }
      ],
      size: 'lg'
    });
  },

  viewBook(id) {
    const book = (AppState.books || []).find(b => b.id === id);
    if (!book) return;
    const borrows = AppState.borrowRequests.filter(r => r.bookId === id);
    const content = `
      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="width:100px;min-height:140px;flex-shrink:0;">${Utils.getBookCover(book)}</div>
        <div>
          <h3 style="margin:0 0 4px;">${Utils.escapeHtml(book.title)}</h3>
          <p style="color:var(--text-secondary);margin:0;">by ${Utils.escapeHtml(book.author)}</p>
          <div style="margin-top:8px;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <span class="badge badge-info">${Utils.escapeHtml(book.category || 'N/A')}</span>
            <span class="badge badge-${book.availableCopies > 0 ? 'success' : 'danger'}">${book.availableCopies} available</span>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div><small style="color:var(--text-tertiary);">ISBN</small><p style="margin:2px 0;font-family:monospace;">${Utils.escapeHtml(book.isbn || 'N/A')}</p></div>
        <div><small style="color:var(--text-tertiary);">Publisher</small><p style="margin:2px 0;">${Utils.escapeHtml(book.publisher || 'N/A')}</p></div>
        <div><small style="color:var(--text-tertiary);">Year</small><p style="margin:2px 0;">${book.year || 'N/A'}</p></div>
        <div><small style="color:var(--text-tertiary);">Language</small><p style="margin:2px 0;">${Utils.escapeHtml(book.language || 'N/A')}</p></div>
        <div><small style="color:var(--text-tertiary);">Shelf</small><p style="margin:2px 0;">${Utils.escapeHtml(book.shelf || 'N/A')}</p></div>
        <div><small style="color:var(--text-tertiary);">Rack</small><p style="margin:2px 0;">${book.rack || 'N/A'}</p></div>
        <div><small style="color:var(--text-tertiary);">Pages</small><p style="margin:2px 0;">${book.pages || 'N/A'}</p></div>
        <div><small style="color:var(--text-tertiary);">Borrow Count</small><p style="margin:2px 0;">${book.borrowCount || 0}</p></div>
        <div><small style="color:var(--text-tertiary);">Rating</small><p style="margin:2px 0;color:var(--warning);">${Utils.getIcon('star', 14)} ${(book.rating || 0).toFixed(1)}</p></div>
        <div><small style="color:var(--text-tertiary);">Total Copies</small><p style="margin:2px 0;">${book.totalCopies || 0}</p></div>
      </div>
      ${book.description ? `<div style="margin-bottom:12px;"><small style="color:var(--text-tertiary);">Description</small><p style="margin:4px 0;font-size:0.9rem;">${Utils.escapeHtml(book.description)}</p></div>` : ''}
      <div style="margin-bottom:12px;"><small style="color:var(--text-tertiary);">Total Borrows</small><p style="margin:2px 0;">${borrows.length} requests (${borrows.filter(r => r.status === 'returned').length} returned)</p></div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;">
        <div style="flex:1;text-align:center;padding:0.5rem;border:1px solid var(--border);border-radius:8px;"><canvas id="modal-qr" style="display:block;margin:0 auto;"></canvas><small>QR Code</small></div>
        <div style="flex:1;text-align:center;padding:0.5rem;border:1px solid var(--border);border-radius:8px;"><canvas id="modal-barcode" style="display:block;margin:0 auto;"></canvas><small>Barcode</small></div>
      </div>`;
    Modal.show({
      title: 'Book Details',
      content,
      size: 'lg',
      buttons: [
        { label: 'Edit', class: 'btn-primary', onClick: () => { Modal.hide(); setTimeout(() => this.editBook(id), 100); } },
        { label: 'Close', class: 'btn-outline', onClick: () => Modal.hide() }
      ]
    });
    setTimeout(() => {
      const qrCanvas = document.getElementById('modal-qr');
      if (qrCanvas) Utils.generateQRCode(book.isbn || `BOOK-${book.id}`, qrCanvas, 120);
      const barcodeCanvas = document.getElementById('modal-barcode');
      if (barcodeCanvas) Utils.generateBarcode(book.isbn || `BOOK-${book.id}`, barcodeCanvas, 180, 50);
    }, 100);
  },

  generateQR(id) {
    const book = (AppState.books || []).find(b => b.id === id);
    if (!book) return;
    const content = `
      <div style="text-align:center;padding:1rem;">
        <canvas id="gen-qr" style="display:block;margin:0 auto 1rem;"></canvas>
        <p style="font-weight:600;">${Utils.escapeHtml(book.title)}</p>
        <small style="color:var(--text-secondary);">${Utils.escapeHtml(book.isbn || 'N/A')}</small>
      </div>`;
    Modal.show({ title: 'QR Code', content, size: 'sm', buttons: [{ label: 'Close', class: 'btn-outline', onClick: () => Modal.hide() }] });
    setTimeout(() => {
      const c = document.getElementById('gen-qr');
      if (c) Utils.generateQRCode(book.isbn || `BOOK-${book.id}`, c, 200);
    }, 100);
  },

  generateBarcode(id) {
    const book = (AppState.books || []).find(b => b.id === id);
    if (!book) return;
    const content = `
      <div style="text-align:center;padding:1rem;">
        <canvas id="gen-barcode" style="display:block;margin:0 auto 1rem;"></canvas>
        <p style="font-weight:600;">${Utils.escapeHtml(book.title)}</p>
        <small style="color:var(--text-secondary);">${Utils.escapeHtml(book.isbn || 'N/A')}</small>
      </div>`;
    Modal.show({ title: 'Barcode', content, size: 'sm', buttons: [{ label: 'Close', class: 'btn-outline', onClick: () => Modal.hide() }] });
    setTimeout(() => {
      const c = document.getElementById('gen-barcode');
      if (c) Utils.generateBarcode(book.isbn || `BOOK-${book.id}`, c, 300, 80);
    }, 100);
  },

  deleteBook(id) {
    const book = (AppState.books || []).find(b => b.id === id);
    Modal.confirm('Delete Book', `Are you sure you want to delete "${book ? book.title : ''}"? This action cannot be undone.`, async () => {
      if (AppState.isSupabaseConnected) {
        try {
          await Api.deleteBook(id);
        } catch (e) {
          console.error('Supabase deleteBook failed:', e);
          Toast.error('Failed to delete book: ' + (e.message || 'Unknown error'));
          return;
        }
      }
      AppState.books = AppState.books.filter(b => b.id !== id);
      AppState.saveAll();
      Toast.success('Book deleted');
      this.refresh();
    });
  },

  bulkImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (Array.isArray(data)) {
            let count = 0;
            data.forEach(item => {
              if (item.title && item.author) {
                item.id = Date.now() + count;
                item.borrowCount = 0;
                item.rating = 0;
                item.reviews = [];
                item.totalCopies = item.totalCopies || 1;
                item.availableCopies = item.availableCopies || item.totalCopies;
                item.status = 'available';
                AppState.books.push(item);
                count++;
              }
            });
            AppState.saveAll();
            Toast.success(`Imported ${count} books successfully!`);
            this.refresh();
          } else {
            Toast.error('Invalid file format. Expected JSON array.');
          }
        } catch (err) {
          Toast.error('Failed to parse file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  bulkExportCSV() {
    const books = AppState.books || [];
    let csv = 'Title,Author,ISBN,Category,Subject,Publisher,Year,Language,Grade,Total Copies,Available Copies,Shelf,Rack,Pages,Rating,Borrow Count\n';
    books.forEach(b => {
      csv += `"${(b.title || '').replace(/"/g, '""')}","${(b.author || '').replace(/"/g, '""')}","${b.isbn || ''}","${b.category || ''}","${b.subject || ''}","${b.publisher || ''}",${b.year || ''},"${b.language || ''}","${b.grade || ''}",${b.totalCopies || 0},${b.availableCopies || 0},"${b.shelf || ''}",${b.rack || 0},${b.pages || 0},${b.rating || 0},${b.borrowCount || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `books-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('CSV exported successfully');
  },

  importCDC() {
    Modal.show({
      title: 'Import CDC Books',
      content: `<p style="color:var(--text-secondary);margin-bottom:1rem;">Select a CDC grade level to import books from:</p>
        <div style="display:flex;flex-direction:column;gap:0.5rem;">${(LIBRARY_DATA.cdcGrades || []).map(g => `
          <button class="btn btn-outline" onclick="AdminBooksPage._importCDCGrade('${g}')">${Utils.getIcon('download', 14)} Import Grade ${Utils.escapeHtml(g)}</button>`).join('')}</div>`,
      buttons: [],
      size: 'md'
    });
  },

  _importCDCGrade(grade) {
    const subjects = LIBRARY_DATA.cdcSubjects || ['Nepali', 'English', 'Mathematics', 'Science', 'Social Studies'];
    let count = 0;
    subjects.forEach(subj => {
      const existing = AppState.books.find(b => b.title.includes(`${subj} Class ${grade}`));
      if (!existing) {
        const result = AppState.importBookFromCDC(grade, subj);
        if (result) count++;
      }
    });
    Toast.success(`Imported ${count} Grade ${grade} books!`);
    Modal.hide();
    this.refresh();
  },

  afterRender() {}
};
