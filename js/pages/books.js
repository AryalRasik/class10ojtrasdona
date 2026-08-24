const BooksPage = {
    searchQuery: '',
    categoryFilter: '',
    gradeFilter: '',
    subjectFilter: '',
    authorFilter: '',
    publisherFilter: '',
    languageFilter: '',
    availabilityFilter: '',
    sortOption: 'popular',
    currentPage: 1,
    perPage: 12,
    isLoading: true,
    filtersOpen: false,

    render(params = {}) {
        this.categoryFilter = params.category || '';
        this.sortOption = params.sort || 'popular';
        this.searchQuery = params.search || '';
        this.availabilityFilter = params.availability || '';
        this.currentPage = 1;
        this.isLoading = true;

        const allBooks = AppState.books;
        const categories = [...new Set(allBooks.map(b => b.category))].sort();
        const subjects = [...new Set(allBooks.map(b => b.subject).filter(Boolean))].sort();
        const authors = [...new Set(allBooks.map(b => b.author))].sort();
        const publishers = [...new Set(allBooks.map(b => b.publisher).filter(Boolean))].sort();
        const languages = [...new Set(allBooks.map(b => b.language).filter(Boolean))].sort();
        const grades = [...new Set(allBooks.map(b => b.grade).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b));

        return `
        <div class="container books-page">
            <div class="page-header reveal">
                <h1 class="page-title">Book Catalog</h1>
                <p class="page-description">Browse our collection of ${allBooks.length} books across ${categories.length} categories</p>
            </div>

            <div class="books-toolbar reveal">
                <div class="books-search">
                    ${Utils.getIcon('search', 18)}
                    <input type="text" id="booksSearchInput" placeholder="Search by title, author, ISBN, publisher..." value="${Utils.escapeHtml(this.searchQuery)}">
                </div>
                <div class="books-filters" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <select class="form-input" id="booksSortFilter" style="width:auto;min-width:160px">
                        <option value="popular" ${this.sortOption === 'popular' ? 'selected' : ''}>Most Popular</option>
                        <option value="newest" ${this.sortOption === 'newest' ? 'selected' : ''}>Newest First</option>
                        <option value="oldest" ${this.sortOption === 'oldest' ? 'selected' : ''}>Oldest First</option>
                        <option value="title-az" ${this.sortOption === 'title-az' ? 'selected' : ''}>Title A-Z</option>
                        <option value="title-za" ${this.sortOption === 'title-za' ? 'selected' : ''}>Title Z-A</option>
                        <option value="rating" ${this.sortOption === 'rating' ? 'selected' : ''}>Highest Rated</option>
                        <option value="recent" ${this.sortOption === 'recent' ? 'selected' : ''}>Recently Added</option>
                    </select>
                    <button class="filter-chip ${this.availabilityFilter === 'available' ? 'active' : ''}" id="filterAvailable">
                        ${Utils.getIcon('check-circle', 14)} Available Now
                    </button>
                    <button class="filter-chip" id="toggleFiltersBtn">
                        ${Utils.getIcon('filter', 14)} Filters ${this.getActiveFilterCount() > 0 ? `<span style="background:var(--accent-primary);color:#fff;border-radius:50%;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700">${this.getActiveFilterCount()}</span>` : ''}
                    </button>
                </div>
            </div>

            <div id="filterPanel" class="reveal" style="display:${this.getActiveFilterCount() > 0 ? 'block' : 'none'}">
                <div class="card" style="padding:20px;margin-bottom:20px">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px">
                        <div class="form-group" style="margin:0">
                            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">${Utils.getIcon('layers', 14)} Category</label>
                            <select class="form-input" id="filterCategory" style="width:100%">
                                <option value="">All Categories</option>
                                ${categories.map(c => `<option value="${c}" ${this.categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0">
                            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">${Utils.getIcon('graduation-cap', 14)} Grade/Class</label>
                            <select class="form-input" id="filterGrade" style="width:100%">
                                <option value="">All Grades</option>
                                ${grades.map(g => `<option value="${g}" ${this.gradeFilter === g ? 'selected' : ''}>Class ${g}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0">
                            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">${Utils.getIcon('book-open', 14)} Subject</label>
                            <select class="form-input" id="filterSubject" style="width:100%">
                                <option value="">All Subjects</option>
                                ${subjects.map(s => `<option value="${s}" ${this.subjectFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0">
                            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">${Utils.getIcon('user', 14)} Author</label>
                            <select class="form-input" id="filterAuthor" style="width:100%">
                                <option value="">All Authors</option>
                                ${authors.map(a => `<option value="${a}" ${this.authorFilter === a ? 'selected' : ''}>${a}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0">
                            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">${Utils.getIcon('building', 14)} Publisher</label>
                            <select class="form-input" id="filterPublisher" style="width:100%">
                                <option value="">All Publishers</option>
                                ${publishers.map(p => `<option value="${p}" ${this.publisherFilter === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0">
                            <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;display:block">${Utils.getIcon('languages', 14)} Language</label>
                            <select class="form-input" id="filterLanguage" style="width:100%">
                                <option value="">All Languages</option>
                                ${languages.map(l => `<option value="${l}" ${this.languageFilter === l ? 'selected' : ''}>${l}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    ${this.getActiveFilterCount() > 0 ? `
                        <div style="margin-top:14px;display:flex;align-items:center;gap:8px">
                            <button class="btn btn-sm btn-ghost" id="clearAllFilters" style="color:var(--danger)">${Utils.getIcon('x', 14)} Clear All Filters</button>
                            <span style="font-size:0.8rem;color:var(--text-tertiary)">${this.getActiveFilterCount()} filter${this.getActiveFilterCount() > 1 ? 's' : ''} active</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div id="booksResultsInfo" style="margin-bottom:16px;font-size:0.9rem;color:var(--text-tertiary);display:flex;align-items:center;justify-content:space-between">
                <span>Loading books...</span>
                <div id="activeFilterBadges" style="display:flex;gap:6px;flex-wrap:wrap"></div>
            </div>

            <div id="booksGrid" class="books-grid">
                ${this.renderSkeletons(12)}
            </div>

            <div class="pagination reveal" id="booksPagination"></div>
        </div>`;
    },

    getActiveFilterCount() {
        let count = 0;
        if (this.categoryFilter) count++;
        if (this.gradeFilter) count++;
        if (this.subjectFilter) count++;
        if (this.authorFilter) count++;
        if (this.publisherFilter) count++;
        if (this.languageFilter) count++;
        if (this.availabilityFilter) count++;
        return count;
    },

    renderSkeletons(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
            <div class="book-card" style="pointer-events:none">
                <div class="book-card-cover">
                    <div class="skeleton" style="width:100%;height:100%;aspect-ratio:3/4"></div>
                </div>
                <div class="book-card-info">
                    <div class="skeleton" style="height:16px;width:80%;margin-bottom:6px"></div>
                    <div class="skeleton" style="height:12px;width:50%;margin-bottom:10px"></div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div class="skeleton" style="height:14px;width:60px"></div>
                        <div class="skeleton" style="height:14px;width:50px"></div>
                    </div>
                </div>
            </div>`;
        }
        return html;
    },

    getFilteredBooks() {
        let books = [...AppState.books];

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            books = books.filter(b =>
                b.title.toLowerCase().includes(q) ||
                b.author.toLowerCase().includes(q) ||
                (b.isbn && b.isbn.toLowerCase().includes(q)) ||
                (b.publisher && b.publisher.toLowerCase().includes(q)) ||
                (b.subject && b.subject.toLowerCase().includes(q)) ||
                (b.category && b.category.toLowerCase().includes(q))
            );
        }

        if (this.categoryFilter) books = books.filter(b => b.category === this.categoryFilter);
        if (this.gradeFilter) books = books.filter(b => b.grade === this.gradeFilter);
        if (this.subjectFilter) books = books.filter(b => b.subject === this.subjectFilter);
        if (this.authorFilter) books = books.filter(b => b.author === this.authorFilter);
        if (this.publisherFilter) books = books.filter(b => b.publisher === this.publisherFilter);
        if (this.languageFilter) books = books.filter(b => b.language === this.languageFilter);
        if (this.availabilityFilter === 'available') books = books.filter(b => b.availableCopies > 0);
        if (this.availabilityFilter === 'unavailable') books = books.filter(b => b.availableCopies === 0);

        switch (this.sortOption) {
            case 'newest': books.sort((a, b) => b.year - a.year || b.id - a.id); break;
            case 'oldest': books.sort((a, b) => a.year - b.year || a.id - b.id); break;
            case 'title-az': books.sort((a, b) => a.title.localeCompare(b.title)); break;
            case 'title-za': books.sort((a, b) => b.title.localeCompare(a.title)); break;
            case 'popular': books.sort((a, b) => b.borrowCount - a.borrowCount); break;
            case 'rating': books.sort((a, b) => b.rating - a.rating || b.borrowCount - a.borrowCount); break;
            case 'recent': books.sort((a, b) => b.id - a.id); break;
            default: books.sort((a, b) => b.borrowCount - a.borrowCount);
        }

        return books;
    },

    renderBookCard(book) {
        const isFav = AppState.isFavorite(book.id);
        const isAvailable = book.availableCopies > 0;
        const borrowStatus = AppState.getBookBorrowStatus(book.id);
        const hasActiveBorrow = borrowStatus && (borrowStatus.status === 'pending' || borrowStatus.status === 'approved' || borrowStatus.status === 'borrowed' || borrowStatus.status === 'overdue' || borrowStatus.status === 'return_requested');

        let actionBtn = '';
        if (hasActiveBorrow) {
            const statusLabels = { pending: 'Pending', approved: 'Approved', borrowed: 'Borrowed', overdue: 'Overdue', return_requested: 'Return Req.' };
            actionBtn = `<button class="btn btn-sm" disabled style="opacity:0.7;cursor:default;font-size:0.72rem;padding:5px 10px">${Utils.getIcon('clock', 12)} ${statusLabels[borrowStatus.status]}</button>`;
        } else if (isAvailable) {
            actionBtn = `<button class="btn btn-sm btn-primary" data-borrow="${book.id}" style="font-size:0.72rem;padding:5px 10px" onclick="event.preventDefault();event.stopPropagation();BooksPage.handleBorrow(${book.id})">${Utils.getIcon('book-open', 12)} Borrow</button>`;
        } else {
            actionBtn = `<button class="btn btn-sm btn-secondary" data-reserve="${book.id}" style="font-size:0.72rem;padding:5px 10px" onclick="event.preventDefault();event.stopPropagation();BooksPage.handleReserve(${book.id})">${Utils.getIcon('calendar', 12)} Reserve</button>`;
        }

        return `
        <div class="book-card" onclick="window.location.hash='/book/${book.id}'">
            <div class="book-card-cover">
                ${Utils.getBookCover(book)}
                <span class="book-status ${isAvailable ? 'available' : 'borrowed'}">
                    ${isAvailable ? 'Available' : 'Unavailable'}
                </span>
                <div class="book-actions-overlay">
                    <button class="book-action-btn" data-tooltip="View Details" onclick="event.preventDefault();event.stopPropagation();window.location.hash='/book/${book.id}'">
                        ${Utils.getIcon('eye', 18)}
                    </button>
                    <button class="book-action-btn" data-tooltip="${isFav ? 'Remove Favorite' : 'Add Favorite'}" onclick="event.preventDefault();event.stopPropagation();BooksPage.handleToggleFavorite(${book.id})" style="${isFav ? 'color:#ef4444' : ''}">
                        ${isFav ? Utils.getIcon('heart', 18) : Utils.getIcon('heart', 18)}
                    </button>
                    <button class="book-action-btn" data-tooltip="Share" onclick="event.preventDefault();event.stopPropagation();BooksPage.handleShare(${book.id})">
                        ${Utils.getIcon('share', 18)}
                    </button>
                </div>
            </div>
            <div class="book-card-info">
                ${book.grade ? `<span class="badge badge-info" style="font-size:0.6rem;padding:2px 7px;margin-bottom:6px;display:inline-block">Class ${book.grade}</span>` : ''}
                <div class="book-card-title" title="${Utils.escapeHtml(book.title)}">${Utils.escapeHtml(book.title)}</div>
                <div class="book-card-author">${Utils.escapeHtml(book.author)}</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
                    <span class="badge" style="font-size:0.6rem;padding:2px 7px;background:var(--bg-tertiary);color:var(--text-secondary)">${Utils.escapeHtml(book.category)}</span>
                    ${book.language ? `<span class="badge" style="font-size:0.6rem;padding:2px 7px;background:var(--bg-tertiary);color:var(--text-secondary)">${Utils.escapeHtml(book.language)}</span>` : ''}
                </div>
                <div class="book-card-meta">
                    <div class="book-card-rating">
                        ${Utils.getIcon('star', 14)}
                        ${book.rating.toFixed(1)}
                    </div>
                    <span class="book-card-copies">${book.availableCopies}/${book.totalCopies}</span>
                </div>
                <div style="margin-top:10px;display:flex;align-items:center;gap:6px">
                    ${actionBtn}
                    <button class="btn btn-sm btn-ghost" style="padding:5px 8px;min-width:auto" onclick="event.preventDefault();event.stopPropagation();BooksPage.handleToggleFavorite(${book.id})" data-tooltip="${isFav ? 'Unfavorite' : 'Favorite'}">
                        <span style="color:${isFav ? '#ef4444' : 'var(--text-tertiary)'}">${Utils.getIcon('heart', 14)}</span>
                    </button>
                    <button class="btn btn-sm btn-ghost" style="padding:5px 8px;min-width:auto" onclick="event.preventDefault();event.stopPropagation();BooksPage.handleShare(${book.id})" data-tooltip="Share">
                        ${Utils.getIcon('share', 14)}
                    </button>
                </div>
            </div>
        </div>`;
    },

    renderBookGrid(books) {
        const grid = document.getElementById('booksGrid');
        if (!grid) return;

        if (books.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <div class="empty-state-icon">${Utils.getIcon('book-dashed', 80)}</div>
                    <h3>No books found</h3>
                    <p>Try adjusting your search or filter criteria to find what you're looking for.</p>
                    <button class="btn btn-primary" onclick="BooksPage.clearAllFilters()">${Utils.getIcon('rotate-ccw', 16)} Reset Filters</button>
                </div>`;
            grid.className = '';
            return;
        }

        grid.className = 'books-grid';
        const start = (this.currentPage - 1) * this.perPage;
        const pageBooks = books.slice(start, start + this.perPage);
        grid.innerHTML = pageBooks.map(b => this.renderBookCard(b)).join('');
    },

    renderResultsInfo(totalBooks) {
        const info = document.getElementById('booksResultsInfo');
        if (!info) return;

        const start = totalBooks > 0 ? (this.currentPage - 1) * this.perPage + 1 : 0;
        const end = Math.min(this.currentPage * this.perPage, totalBooks);

        let html = `<span>Showing <strong>${start}–${end}</strong> of <strong>${totalBooks}</strong> book${totalBooks !== 1 ? 's' : ''}</span>`;

        const badges = [];
        if (this.categoryFilter) badges.push(this.categoryFilter);
        if (this.gradeFilter) badges.push('Class ' + this.gradeFilter);
        if (this.subjectFilter) badges.push(this.subjectFilter);
        if (this.authorFilter) badges.push(this.authorFilter);
        if (this.publisherFilter) badges.push(this.publisherFilter);
        if (this.languageFilter) badges.push(this.languageFilter);
        if (this.availabilityFilter === 'available') badges.push('Available');
        if (this.availabilityFilter === 'unavailable') badges.push('Unavailable');
        if (this.searchQuery) badges.push('"' + this.searchQuery + '"');

        info.innerHTML = html;
    },

    renderPagination(totalBooks) {
        const container = document.getElementById('booksPagination');
        if (!container) return;

        const totalPages = Math.ceil(totalBooks / this.perPage);
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        html += `<button class="page-btn" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="BooksPage.goToPage(${this.currentPage - 1})">${Utils.getIcon('arrow-left', 18)}</button>`;

        const pages = this.getPageNumbers(this.currentPage, totalPages);
        for (const p of pages) {
            if (p === '...') {
                html += `<span style="padding:0 6px;color:var(--text-tertiary)">...</span>`;
            } else {
                html += `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="BooksPage.goToPage(${p})">${p}</button>`;
            }
        }

        html += `<button class="page-btn" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="BooksPage.goToPage(${this.currentPage + 1})">${Utils.getIcon('arrow-right', 18)}</button>`;

        container.innerHTML = html;
    },

    getPageNumbers(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

        const pages = [];
        if (current <= 4) {
            for (let i = 1; i <= 5; i++) pages.push(i);
            pages.push('...', total);
        } else if (current >= total - 3) {
            pages.push(1, '...');
            for (let i = total - 4; i <= total; i++) pages.push(i);
        } else {
            pages.push(1, '...', current - 1, current, current + 1, '...', total);
        }
        return pages;
    },

    goToPage(page) {
        const books = this.getFilteredBooks();
        const totalPages = Math.ceil(books.length / this.perPage);
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.refreshView();
        window.scrollTo({ top: 300, behavior: 'smooth' });
    },

    refreshView() {
        const books = this.getFilteredBooks();
        this.renderBookGrid(books);
        this.renderResultsInfo(books.length);
        this.renderPagination(books.length);
        this.updateActiveFilterBadges();
    },

    updateActiveFilterBadges() {
        const container = document.getElementById('activeFilterBadges');
        if (!container) return;

        const badges = [];
        if (this.categoryFilter) badges.push({ label: this.categoryFilter, clear: () => { this.categoryFilter = ''; document.getElementById('filterCategory').value = ''; } });
        if (this.gradeFilter) badges.push({ label: 'Class ' + this.gradeFilter, clear: () => { this.gradeFilter = ''; document.getElementById('filterGrade').value = ''; } });
        if (this.subjectFilter) badges.push({ label: this.subjectFilter, clear: () => { this.subjectFilter = ''; document.getElementById('filterSubject').value = ''; } });
        if (this.authorFilter) badges.push({ label: this.authorFilter, clear: () => { this.authorFilter = ''; document.getElementById('filterAuthor').value = ''; } });
        if (this.publisherFilter) badges.push({ label: this.publisherFilter, clear: () => { this.publisherFilter = ''; document.getElementById('filterPublisher').value = ''; } });
        if (this.languageFilter) badges.push({ label: this.languageFilter, clear: () => { this.languageFilter = ''; document.getElementById('filterLanguage').value = ''; } });

        container.innerHTML = badges.map((b, i) =>
            `<span class="filter-chip active" style="padding:4px 10px;font-size:0.7rem;cursor:pointer" onclick="BooksPage.clearFilter(${i})">${Utils.escapeHtml(b.label)} ${Utils.getIcon('x', 10)}</span>`
        ).join('');

        this._filterBadgeClearFns = badges.map(b => b.clear);
    },

    clearFilter(index) {
        if (this._filterBadgeClearFns && this._filterBadgeClearFns[index]) {
            this._filterBadgeClearFns[index]();
        }
        this.currentPage = 1;
        this.refreshView();
    },

    clearAllFilters() {
        this.searchQuery = '';
        this.categoryFilter = '';
        this.gradeFilter = '';
        this.subjectFilter = '';
        this.authorFilter = '';
        this.publisherFilter = '';
        this.languageFilter = '';
        this.availabilityFilter = '';
        this.sortOption = 'popular';
        this.currentPage = 1;

        const searchInput = document.getElementById('booksSearchInput');
        if (searchInput) searchInput.value = '';

        document.querySelectorAll('#filterPanel select').forEach(sel => sel.value = '');
        const sortSel = document.getElementById('booksSortFilter');
        if (sortSel) sortSel.value = 'popular';

        const availBtn = document.getElementById('filterAvailable');
        if (availBtn) availBtn.classList.remove('active');

        this.refreshView();
    },

    handleBorrow(bookId) {
        if (!AppState.isLoggedIn) {
            Toast.show('Please log in to borrow books', 'warning');
            return;
        }

        const book = AppState.books.find(b => b.id === bookId);
        if (!book || book.availableCopies <= 0) {
            Toast.show('This book is currently unavailable', 'error');
            return;
        }

        const existing = AppState.getBookBorrowStatus(bookId);
        if (existing) {
            Toast.show('You already have an active request for this book', 'warning');
            return;
        }

        const activeBorrows = AppState.getMyActiveBorrows();
        if (activeBorrows.length >= 3) {
            Toast.show('You can only have 3 active borrows at a time', 'warning');
            return;
        }

        const request = AppState.createBorrowRequest(bookId);
        if (request) {
            Toast.show(`Borrow request submitted for "${book.title}"`, 'success');
            this.refreshView();
        } else {
            Toast.show('Failed to create borrow request', 'error');
        }
    },

    handleReserve(bookId) {
        if (!AppState.isLoggedIn) {
            Toast.show('Please log in to reserve books', 'warning');
            return;
        }

        const book = AppState.books.find(b => b.id === bookId);
        if (!book) return;

        const result = AppState.reserveBook(bookId);
        if (result) {
            Toast.show(`Reservation placed for "${book.title}"`, 'success');
        } else {
            Toast.show('You already have a reservation for this book', 'warning');
        }
    },

    handleToggleFavorite(bookId) {
        if (!AppState.isLoggedIn) {
            Toast.show('Please log in to manage favorites', 'warning');
            return;
        }

        const added = AppState.toggleFavorite(bookId);
        Toast.show(added ? 'Added to favorites' : 'Removed from favorites', 'success');
        this.refreshView();
    },

    handleShare(bookId) {
        const book = AppState.books.find(b => b.id === bookId);
        if (!book) return;

        const url = window.location.origin + window.location.pathname + '#/book/' + book.id;
        const text = `Check out "${book.title}" by ${book.author} in our library catalog!`;

        if (navigator.share) {
            navigator.share({ title: book.title, text: text, url: url }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                Toast.show('Book link copied to clipboard', 'success');
            }).catch(() => {
                Toast.show('Could not copy link', 'error');
            });
        } else {
            Toast.show('Share not supported in this browser', 'info');
        }
    },

    afterRender() {
        const searchInput = document.getElementById('booksSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.refreshView();
            }, 300));
            searchInput.focus();
        }

        const sortFilter = document.getElementById('booksSortFilter');
        if (sortFilter) sortFilter.addEventListener('change', (e) => {
            this.sortOption = e.target.value;
            this.currentPage = 1;
            this.refreshView();
        });

        const availFilter = document.getElementById('filterAvailable');
        if (availFilter) availFilter.addEventListener('click', () => {
            if (this.availabilityFilter === 'available') {
                this.availabilityFilter = '';
                availFilter.classList.remove('active');
            } else {
                this.availabilityFilter = 'available';
                availFilter.classList.add('active');
            }
            this.currentPage = 1;
            this.refreshView();
        });

        const toggleBtn = document.getElementById('toggleFiltersBtn');
        const filterPanel = document.getElementById('filterPanel');
        if (toggleBtn && filterPanel) {
            toggleBtn.addEventListener('click', () => {
                this.filtersOpen = this.filtersOpen ? false : (this.getActiveFilterCount() > 0 ? true : !this.filtersOpen);
                if (this.filtersOpen || this.getActiveFilterCount() > 0) {
                    filterPanel.style.display = 'block';
                    this.filtersOpen = true;
                } else {
                    filterPanel.style.display = filterPanel.style.display === 'none' ? 'block' : 'none';
                    this.filtersOpen = filterPanel.style.display === 'block';
                }
                toggleBtn.classList.toggle('active', this.filtersOpen);
            });
        }

        const filterSelects = [
            { id: 'filterCategory', prop: 'categoryFilter' },
            { id: 'filterGrade', prop: 'gradeFilter' },
            { id: 'filterSubject', prop: 'subjectFilter' },
            { id: 'filterAuthor', prop: 'authorFilter' },
            { id: 'filterPublisher', prop: 'publisherFilter' },
            { id: 'filterLanguage', prop: 'languageFilter' }
        ];

        filterSelects.forEach(({ id, prop }) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', (e) => {
                this[prop] = e.target.value;
                this.currentPage = 1;
                this.refreshView();
            });
        });

        const clearAllBtn = document.getElementById('clearAllFilters');
        if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearAllFilters());

        setTimeout(() => {
            this.isLoading = false;
            this.refreshView();
        }, 300);

        Animations.initScrollReveal();
    }
};
