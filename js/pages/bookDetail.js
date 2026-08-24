const BookDetailPage = {
    render(params) {
        const bookId = parseInt(params.id);
        const book = AppState.books.find(b => b.id === bookId);

        if (!book) {
            return `<div class="container">
                <div class="empty-state" style="padding:80px 0">
                    <div class="empty-state-icon">${Utils.getIcon('search', 80)}</div>
                    <h3>Book not found</h3>
                    <p>The book you're looking for doesn't exist or may have been removed.</p>
                    <a href="#/books" class="btn btn-primary" data-nav>${Utils.getIcon('arrow-left', 18)} Browse Books</a>
                </div>
            </div>`;
        }

        AppState.addRecentlyViewed(bookId);

        const isFav = AppState.isFavorite(bookId);
        const reviews = book.reviews || [];
        const avgRating = reviews.length > 0
            ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
            : (book.rating || 4.5).toFixed(1);
        const similar = AppState.books.filter(b =>
            (b.category === book.category || b.subject === book.subject) && b.id !== bookId
        ).slice(0, 6);
        const avail = book.availableCopies > 0;
        const borrowStatus = AppState.getBookBorrowStatus(bookId);
        const borrowedCount = book.totalCopies - book.availableCopies;
        const reservedCount = book.reservedCopies || 0;
        const hasDigital = book.hasDigital || book.digitalUrl || false;
        const hasPdf = book.pdfUrl || book.hasPdf || false;

        const bookStatus = !avail && borrowedCount === book.totalCopies
            ? 'Borrowed'
            : book.status === 'lost' ? 'Lost'
            : book.status === 'damaged' ? 'Damaged'
            : avail ? 'Available' : 'Unavailable';

        const statusClass = bookStatus === 'Available' ? 'success'
            : bookStatus === 'Borrowed' ? 'warning'
            : bookStatus === 'Lost' || bookStatus === 'Damaged' ? 'danger'
            : 'info';

        let reservationQueue = [];
        if (AppState.reservations) {
            reservationQueue = AppState.reservations.filter(r =>
                r.bookId === bookId && (r.status === 'queued' || r.status === 'pending')
            );
        }

        let borrowButtonHtml = '';
        if (borrowStatus) {
            switch (borrowStatus.status) {
                case 'pending':
                    borrowButtonHtml = `<div class="borrow-status-display pending">
                        <div class="borrow-status-icon">${Utils.getIcon('clock', 22)}</div>
                        <div>
                            <span class="borrow-status-label">Pending Approval</span>
                            <span class="borrow-status-sub">Request ID: ${borrowStatus.id}</span>
                        </div>
                    </div>`;
                    break;
                case 'approved':
                    borrowButtonHtml = `<div class="borrow-status-display approved">
                        <div class="borrow-status-icon">${Utils.getIcon('check-circle', 22)}</div>
                        <div>
                            <span class="borrow-status-label">Approved — Ready for Pickup</span>
                            <span class="borrow-status-sub">Pick up from Library Front Desk</span>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="BookDetailPage.markPickedUp('${borrowStatus.id}')">Confirm Pickup</button>
                    </div>`;
                    break;
                case 'borrowed':
                case 'overdue':
                    const due = new Date(borrowStatus.expectedReturnDate);
                    const now = new Date();
                    const daysLeft = Math.ceil((due - now) / 86400000);
                    const isOverdue = daysLeft < 0;
                    borrowButtonHtml = `<div class="borrow-status-display active">
                        <div class="borrow-status-icon ${isOverdue ? 'overdue' : ''}">${Utils.getIcon('book-open', 22)}</div>
                        <div>
                            <span class="borrow-status-label">Currently Borrowed</span>
                            <span class="borrow-status-sub ${isOverdue ? 'text-danger' : ''}">${isOverdue ? Math.abs(daysLeft) + ' days overdue' : daysLeft + ' days remaining'} · Due: ${Utils.formatDate(borrowStatus.expectedReturnDate)}</span>
                        </div>
                    </div>`;
                    break;
                case 'return_requested':
                    borrowButtonHtml = `<div class="borrow-status-display return-requested">
                        <div class="borrow-status-icon">${Utils.getIcon('refresh-cw', 22)}</div>
                        <div>
                            <span class="borrow-status-label">Return Requested</span>
                            <span class="borrow-status-sub">Waiting for librarian to process</span>
                        </div>
                    </div>`;
                    break;
                case 'rejected':
                    borrowButtonHtml = `<button class="btn btn-primary" id="borrowBtn">${Utils.getIcon('book-open', 18)} Borrow Book</button>`;
                    break;
                default:
                    borrowButtonHtml = avail
                        ? `<button class="btn btn-primary" id="borrowBtn">${Utils.getIcon('book-open', 18)} Borrow Book</button>`
                        : `<button class="btn btn-secondary" id="reserveBtn">${Utils.getIcon('calendar', 18)} Reserve</button>`;
            }
        } else if (avail) {
            borrowButtonHtml = `<button class="btn btn-primary" id="borrowBtn">${Utils.getIcon('book-open', 18)} Borrow Book</button>`;
        } else {
            borrowButtonHtml = `<button class="btn btn-secondary" id="reserveBtn">${Utils.getIcon('calendar', 18)} Reserve</button>`;
        }

        const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

        return `
        <div class="container book-detail">

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:8px">
                <a href="#/books" class="btn btn-ghost" data-nav>${Utils.getIcon('arrow-left', 18)} Back to Books</a>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-ghost btn-sm" id="shareBtn" title="Share">${Utils.getIcon('share-2', 18)}</button>
                    <button class="btn btn-ghost btn-sm ${isFav ? 'btn-primary' : ''}" id="favBtn" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${Utils.getIcon('heart', 18)} ${isFav ? 'Favorited' : 'Favorite'}</button>
                </div>
            </div>

            <div class="book-detail-header reveal">
                <div class="book-detail-cover">
                    ${Utils.getBookCover(book)}
                    <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
                        ${hasPdf ? `<a href="${book.pdfUrl || '#'}" class="btn btn-outline btn-sm" target="_blank" id="downloadPdfBtn">${Utils.getIcon('download', 16)} Download PDF</a>` : ''}
                        ${hasDigital ? `<a href="${book.digitalUrl || '#'}" class="btn btn-outline btn-sm" target="_blank" id="readOnlineBtn">${Utils.getIcon('monitor', 16)} Read Online</a>` : ''}
                    </div>
                </div>

                <div class="book-detail-info">
                    ${book.grade ? '<span class="badge badge-info" style="margin-bottom:8px">CDC Nepal Textbook</span>' : ''}

                    <h1 style="font-size:1.8rem;font-weight:800;margin:0 0 4px 0;line-height:1.2">${Utils.escapeHtml(book.title)}</h1>
                    <p class="book-detail-author" style="font-size:1.05rem;margin:0 0 12px 0">by ${Utils.escapeHtml(book.author)}</p>

                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
                        <span style="font-size:1.6rem;font-weight:700;color:var(--warning)">${avgRating}</span>
                        <span>${Utils.generateStars(parseFloat(avgRating))}</span>
                        <span style="font-size:0.85rem;color:var(--text-secondary)">(${reviews.length} review${reviews.length !== 1 ? 's' : ''})</span>
                    </div>

                    <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:${statusClass === 'success' ? 'rgba(16,185,129,0.1)' : statusClass === 'warning' ? 'rgba(245,158,11,0.1)' : statusClass === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'};margin-bottom:20px">
                        <span style="width:8px;height:8px;border-radius:50%;background:${statusClass === 'success' ? 'var(--success)' : statusClass === 'warning' ? 'var(--warning)' : statusClass === 'danger' ? 'var(--danger)' : 'var(--info)'}"></span>
                        <span style="font-size:0.85rem;font-weight:600;color:${statusClass === 'success' ? 'var(--success)' : statusClass === 'warning' ? 'var(--warning)' : statusClass === 'danger' ? 'var(--danger)' : 'var(--info)'}">${bookStatus}</span>
                    </div>

                    <div class="book-detail-meta" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:20px">
                        ${book.isbn ? `<div class="book-meta-item">${Utils.getIcon('hash', 16)} ISBN: ${Utils.escapeHtml(book.isbn)}</div>` : ''}
                        ${book.publisher ? `<div class="book-meta-item">${Utils.getIcon('building', 16)} ${Utils.escapeHtml(book.publisher)}</div>` : ''}
                        ${book.edition ? `<div class="book-meta-item">${Utils.getIcon('layers', 16)} Edition: ${Utils.escapeHtml(book.edition)}</div>` : ''}
                        ${book.language ? `<div class="book-meta-item">${Utils.getIcon('globe', 16)} ${Utils.escapeHtml(book.language)}</div>` : ''}
                        ${book.category ? `<div class="book-meta-item">${Utils.getIcon('tag', 16)} ${Utils.escapeHtml(book.category)}</div>` : ''}
                        ${book.grade ? `<div class="book-meta-item">${Utils.getIcon('graduation-cap', 16)} Class/Grade ${Utils.escapeHtml(book.grade)}</div>` : ''}
                        ${book.subject ? `<div class="book-meta-item">${Utils.getIcon('book-open', 16)} ${Utils.escapeHtml(book.subject)}</div>` : ''}
                        ${book.pages ? `<div class="book-meta-item">${Utils.getIcon('file-text', 16)} ${book.pages} pages</div>` : ''}
                        ${book.year ? `<div class="book-meta-item">${Utils.getIcon('calendar', 16)} Published ${book.year}</div>` : ''}
                        ${book.shelf ? `<div class="book-meta-item">${Utils.getIcon('grid', 16)} Shelf: ${Utils.escapeHtml(String(book.shelf))}</div>` : ''}
                        ${book.rack ? `<div class="book-meta-item">${Utils.getIcon('server', 16)} Rack: ${Utils.escapeHtml(String(book.rack))}</div>` : ''}
                    </div>

                    <div class="book-detail-actions" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px">
                        ${borrowButtonHtml}
                        ${!borrowStatus && !avail ? `<button class="btn btn-secondary" id="reserveBtn">${Utils.getIcon('calendar', 18)} Reserve</button>` : ''}
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:32px 0" class="reveal">
                <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:800;color:var(--success)">${book.availableCopies || 0}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Available Copies</div>
                </div>
                <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:800;color:var(--text-primary)">${book.totalCopies || 0}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Total Copies</div>
                </div>
                <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:800;color:var(--warning)">${borrowedCount}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Borrowed</div>
                </div>
                <div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:12px;padding:16px;text-align:center">
                    <div style="font-size:1.4rem;font-weight:800;color:var(--info)">${reservedCount}</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">Reserved</div>
                </div>
            </div>

            <div class="book-detail-tabs reveal">
                <div class="tabs" id="detailTabs">
                    <button class="tab-btn active" data-tab="description">Description</button>
                    <button class="tab-btn" data-tab="reviews">Reviews (${reviews.length})</button>
                    <button class="tab-btn" data-tab="qr">QR Code</button>
                    <button class="tab-btn" data-tab="barcode">Barcode</button>
                </div>
                <div class="tab-content" id="tabContent">

                    <div id="tab-description">
                        <h3 style="font-weight:700;margin-bottom:12px">About this book</h3>
                        <p style="color:var(--text-secondary);line-height:1.8;white-space:pre-wrap">${Utils.escapeHtml(book.description || 'No description available for this book.')}</p>
                    </div>

                    <div id="tab-reviews" style="display:none">
                        <div style="display:flex;align-items:center;gap:16px;padding:20px;background:var(--bg-secondary);border-radius:12px;margin-bottom:24px;flex-wrap:wrap">
                            <div style="text-align:center;min-width:80px">
                                <div style="font-size:2.4rem;font-weight:800;line-height:1">${avgRating}</div>
                                <div style="margin:6px 0">${Utils.generateStars(parseFloat(avgRating))}</div>
                                <div style="font-size:0.8rem;color:var(--text-secondary)">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
                            </div>
                            <div style="flex:1;min-width:200px">
                                ${[5,4,3,2,1].map(star => {
                                    const count = reviews.filter(r => r.rating === star).length;
                                    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                                    return `<div style="display:flex;align-items:center;gap:8px;margin:3px 0">
                                        <span style="font-size:0.8rem;width:12px;text-align:right;color:var(--text-secondary)">${star}</span>
                                        <span style="color:var(--warning)">${Utils.getIcon('star', 12)}</span>
                                        <div style="flex:1;height:8px;background:var(--border-light);border-radius:4px;overflow:hidden">
                                            <div style="height:100%;width:${pct}%;background:var(--warning);border-radius:4px;transition:width 0.3s"></div>
                                        </div>
                                        <span style="font-size:0.8rem;width:30px;color:var(--text-tertiary)">${count}</span>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>

                        ${reviews.length ? reviews.map(r => `
                            <div style="padding:16px 0;border-bottom:1px solid var(--border-light)">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                                    <div class="user-avatar" style="width:36px;height:36px;font-size:0.75rem;min-width:36px">${r.user.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                                    <div style="flex:1">
                                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                                            <strong style="font-size:0.9rem">${Utils.escapeHtml(r.user)}</strong>
                                            <span style="font-size:0.75rem;color:var(--text-tertiary)">${Utils.formatDate(r.date)}</span>
                                        </div>
                                        <div style="margin-top:2px">${Utils.generateStars(r.rating)}</div>
                                    </div>
                                </div>
                                <p style="font-size:0.9rem;color:var(--text-secondary);margin-left:46px;line-height:1.6">${Utils.escapeHtml(r.text)}</p>
                            </div>
                        `).join('') : '<p style="color:var(--text-tertiary);padding:24px 0;text-align:center">No reviews yet. Be the first to review this book!</p>'}

                        <div style="margin-top:24px;padding:20px;background:var(--bg-secondary);border-radius:12px" id="reviewFormWrapper">
                            <h4 style="font-weight:700;margin-bottom:16px">${Utils.getIcon('edit', 18)} Write a Review</h4>
                            <div style="margin-bottom:16px">
                                <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:8px">Your Rating</label>
                                <div id="starRatingInput" style="display:flex;gap:4px;cursor:pointer">
                                    ${[1,2,3,4,5].map(s => `<span class="star-input" data-star="${s}" style="font-size:1.6rem;color:var(--border-light);transition:color 0.15s">${Utils.getIcon('star', 24)}</span>`).join('')}
                                    <span id="ratingLabel" style="font-size:0.85rem;color:var(--text-secondary);margin-left:8px"></span>
                                </div>
                            </div>
                            <div style="margin-bottom:16px">
                                <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:8px">Your Review</label>
                                <textarea id="reviewComment" rows="4" placeholder="Share your thoughts about this book..." style="width:100%;padding:12px;border:1px solid var(--border-light);border-radius:8px;resize:vertical;font-family:inherit;font-size:0.9rem;background:var(--bg-primary);color:var(--text-primary)"></textarea>
                            </div>
                            <button class="btn btn-primary" id="submitReviewBtn">${Utils.getIcon('send', 16)} Submit Review</button>
                        </div>
                    </div>

                    <div id="tab-qr" style="display:none;padding:24px 0;text-align:center">
                        <h3 style="font-weight:700;margin-bottom:8px">QR Code</h3>
                        <p style="color:var(--text-tertiary);margin-bottom:20px">Scan this QR code to quickly access this book's details</p>
                        <div id="qrContainer" style="display:inline-block;padding:16px;background:white;border-radius:12px;border:1px solid var(--border-light)"></div>
                        <p style="margin-top:12px;font-size:0.85rem;color:var(--text-tertiary);font-family:var(--font-mono)">BOOK-${String(book.id).padStart(4, '0')}</p>
                    </div>

                    <div id="tab-barcode" style="display:none;padding:24px 0;text-align:center">
                        <h3 style="font-weight:700;margin-bottom:8px">Barcode</h3>
                        <p style="color:var(--text-tertiary);margin-bottom:20px">Library barcode for scanning and inventory management</p>
                        <div id="barcodeContainer" style="display:inline-block;padding:16px;background:white;border-radius:12px;border:1px solid var(--border-light)"></div>
                        <p style="margin-top:12px;font-size:0.85rem;color:var(--text-tertiary);font-family:var(--font-mono)">LIB-${String(book.id).padStart(6, '0')}</p>
                    </div>

                </div>
            </div>

            ${reservationQueue.length > 0 ? `
                <div class="reveal" style="margin-top:32px;padding:20px;background:var(--bg-card);border:1px solid var(--border-light);border-radius:12px">
                    <h3 style="font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px">${Utils.getIcon('users', 20)} Reservation Queue</h3>
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">${reservationQueue.length} people waiting for this book</p>
                    <div style="display:flex;flex-direction:column;gap:8px">
                        ${reservationQueue.slice(0, 5).map((r, i) => {
                            const isCurrentUser = AppState.currentUser && r.userId === AppState.currentUser.id;
                            return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;background:${isCurrentUser ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)'};border:1px solid ${isCurrentUser ? 'var(--info)' : 'transparent'}">
                                <span style="font-size:0.85rem;font-weight:700;color:var(--text-secondary);min-width:28px">#${i + 1}</span>
                                <div class="user-avatar" style="width:30px;height:30px;font-size:0.65rem;min-width:30px">${(r.userName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                                <span style="font-size:0.85rem;flex:1">${Utils.escapeHtml(r.userName || 'User')} ${isCurrentUser ? '<span style="font-size:0.75rem;color:var(--info);font-weight:600">(You)</span>' : ''}</span>
                                <span style="font-size:0.8rem;color:var(--text-tertiary)">${Utils.formatDate(r.date || r.createdAt)}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            ${similar.length ? `
                <div class="reveal" style="margin-top:40px">
                    <h3 style="font-weight:700;margin-bottom:16px">${book.subject ? 'Related Textbooks' : 'Similar Books'}</h3>
                    <div class="book-scroll">${similar.map(b => HomePage.bookCard(b)).join('')}</div>
                </div>
            ` : ''}

            ${AppState.recentlyViewed && AppState.recentlyViewed.length > 1 ? `
                <div class="reveal" style="margin-top:40px;margin-bottom:40px">
                    <h3 style="font-weight:700;margin-bottom:16px">Recently Viewed</h3>
                    <div class="book-scroll">${AppState.recentlyViewed
                        .filter(id => id !== bookId)
                        .slice(0, 6)
                        .map(id => AppState.books.find(b => b.id === id))
                        .filter(Boolean)
                        .map(b => HomePage.bookCard(b)).join('')}</div>
                </div>
            ` : '<div style="margin-bottom:40px"></div>'}

        </div>`;
    },

    afterRender() {
        document.querySelectorAll('#detailTabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#detailTabs .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                ['description', 'reviews', 'qr', 'barcode'].forEach(t => {
                    const el = document.getElementById('tab-' + t);
                    if (el) el.style.display = t === tab ? 'block' : 'none';
                });
                if (tab === 'qr') {
                    const container = document.getElementById('qrContainer');
                    if (container && !container.hasChildNodes()) {
                        const id = parseInt(window.location.hash.split('/').pop());
                        if (typeof QRCode !== 'undefined') {
                            QRCode.generate('BOOK-' + String(id).padStart(4, '0'), container, 160);
                        }
                    }
                }
                if (tab === 'barcode') {
                    const container = document.getElementById('barcodeContainer');
                    if (container && !container.hasChildNodes()) {
                        const id = parseInt(window.location.hash.split('/').pop());
                        if (typeof BarcodeGen !== 'undefined') {
                            BarcodeGen.generate('LIB-' + String(id).padStart(6, '0'), container);
                        }
                    }
                }
            });
        });

        const borrowBtn = document.getElementById('borrowBtn');
        if (borrowBtn) {
            borrowBtn.addEventListener('click', () => {
                const id = parseInt(window.location.hash.split('/').pop());
                BookDetailPage.showBorrowModal(id);
            });
        }

        const reserveBtn = document.getElementById('reserveBtn');
        if (reserveBtn) {
            reserveBtn.addEventListener('click', () => {
                const id = parseInt(window.location.hash.split('/').pop());
                if (AppState.reserveBook(id)) {
                    Toast.success('Reservation placed successfully!');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    Toast.warning('You already have a reservation for this book.');
                }
            });
        }

        const favBtn = document.getElementById('favBtn');
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                const id = parseInt(window.location.hash.split('/').pop());
                const added = AppState.toggleFavorite(id);
                Toast.show(added ? 'Added to favorites' : 'Removed from favorites', 'success');
                favBtn.innerHTML = `${Utils.getIcon('heart', 18)} ${added ? 'Favorited' : 'Favorite'}`;
                favBtn.classList.toggle('btn-primary', added);
            });
        }

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const title = document.querySelector('.book-detail-info h1')?.textContent || 'Book';
                if (navigator.share) {
                    navigator.share({ title: title, url: window.location.href });
                } else {
                    navigator.clipboard.writeText(window.location.href);
                    Toast.success('Link copied to clipboard!');
                }
            });
        }

        const starInput = document.getElementById('starRatingInput');
        if (starInput) {
            let selectedRating = 0;
            const stars = starInput.querySelectorAll('.star-input');
            const ratingLabel = document.getElementById('ratingLabel');
            const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

            const updateStars = (rating) => {
                stars.forEach(star => {
                    const s = parseInt(star.dataset.star);
                    star.style.color = s <= rating ? 'var(--warning)' : 'var(--border-light)';
                });
                if (ratingLabel) {
                    ratingLabel.textContent = rating > 0 ? labels[rating] : '';
                }
            };

            stars.forEach(star => {
                star.addEventListener('mouseenter', () => {
                    updateStars(parseInt(star.dataset.star));
                });
                star.addEventListener('click', () => {
                    selectedRating = parseInt(star.dataset.star);
                    updateStars(selectedRating);
                    starInput.dataset.selected = selectedRating;
                });
            });

            starInput.addEventListener('mouseleave', () => {
                updateStars(selectedRating);
            });
        }

        const submitReviewBtn = document.getElementById('submitReviewBtn');
        if (submitReviewBtn) {
            submitReviewBtn.addEventListener('click', () => {
                const starInput = document.getElementById('starRatingInput');
                const rating = parseInt(starInput?.dataset?.selected || 0);
                const comment = document.getElementById('reviewComment')?.value?.trim();

                if (!rating || rating < 1 || rating > 5) {
                    Toast.warning('Please select a rating.');
                    return;
                }
                if (!comment) {
                    Toast.warning('Please write a review comment.');
                    return;
                }

                const id = parseInt(window.location.hash.split('/').pop());
                const book = AppState.books.find(b => b.id === id);
                if (!book) return;

                const user = AppState.currentUser;
                const review = {
                    user: user ? (user.name || user.username || 'Anonymous') : 'Anonymous',
                    rating: rating,
                    text: comment,
                    date: new Date().toISOString().split('T')[0]
                };

                if (!book.reviews) book.reviews = [];
                book.reviews.push(review);

                if (typeof Storage !== 'undefined') {
                    try {
                        localStorage.setItem('library_books', JSON.stringify(AppState.books));
                    } catch (e) { /* storage full */ }
                }

                Toast.success('Review submitted!');
                setTimeout(() => window.location.reload(), 800);
            });
        }

        Animations.initScrollReveal();
    },

    showBorrowModal(bookId) {
        const book = AppState.books.find(b => b.id === bookId);
        if (!book) return;

        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 14);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        const user = AppState.currentUser;
        const activeBorrows = AppState.borrows
            ? AppState.borrows.filter(b => b.userId === (user && user.id) && (b.status === 'borrowed' || b.status === 'approved' || b.status === 'pending')).length
            : 0;

        const content = `
        <div class="borrow-modal-content">
            <div class="borrow-modal-book">
                <div class="borrow-modal-cover">${Utils.getBookCover(book)}</div>
                <div class="borrow-modal-info">
                    <h3>${Utils.escapeHtml(book.title)}</h3>
                    <p class="borrow-modal-author">by ${Utils.escapeHtml(book.author)}</p>
                </div>
            </div>
            <div class="borrow-modal-details">
                <div class="borrow-detail-row">
                    <span class="borrow-detail-label">${Utils.getIcon('hash', 16)} ISBN</span>
                    <span class="borrow-detail-value">${Utils.escapeHtml(book.isbn || 'N/A')}</span>
                </div>
                <div class="borrow-detail-row">
                    <span class="borrow-detail-label">${Utils.getIcon('tag', 16)} Category</span>
                    <span class="borrow-detail-value">${Utils.escapeHtml(book.category || 'General')}</span>
                </div>
                <div class="borrow-detail-row">
                    <span class="borrow-detail-label">${Utils.getIcon('database', 16)} Available Copies</span>
                    <span class="borrow-detail-value">${book.availableCopies} of ${book.totalCopies}</span>
                </div>
                <div class="borrow-detail-row">
                    <span class="borrow-detail-label">${Utils.getIcon('clock', 16)} Borrow Duration</span>
                    <span class="borrow-detail-value">14 days</span>
                </div>
                <div class="borrow-detail-row">
                    <span class="borrow-detail-label">${Utils.getIcon('calendar', 16)} Expected Return</span>
                    <span class="borrow-detail-value">${Utils.formatDate(dueDateStr)}</span>
                </div>
                <div class="borrow-detail-row">
                    <span class="borrow-detail-label">${Utils.getIcon('map-pin', 16)} Pickup Location</span>
                    <span class="borrow-detail-value">Library Front Desk</span>
                </div>
                <div class="borrow-detail-row">
                    <span class="borrow-detail-label">${Utils.getIcon('layers', 16)} Current Borrows</span>
                    <span class="borrow-detail-value">${activeBorrows} / 3</span>
                </div>
            </div>
            ${activeBorrows >= 3 ? `<div style="padding:12px 16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;margin-top:12px">
                <p style="font-size:0.85rem;color:var(--danger);font-weight:600">${Utils.getIcon('alert-triangle', 16)} You've reached the maximum borrow limit (3 books). Please return a book first.</p>
            </div>` : ''}
            <div class="borrow-rules-box">
                <h4>${Utils.getIcon('shield', 16)} Borrow Rules</h4>
                <ul>
                    <li>Maximum 3 books at a time</li>
                    <li>Return within 14 days to avoid fines</li>
                    <li>Late fee: Rs. 5 per day</li>
                    <li>Handle books with care</li>
                    <li>Renewal allowed once if no reservation exists</li>
                </ul>
            </div>
        </div>`;

        Modal.show({
            title: 'Borrow Book',
            content: content,
            size: 'md',
            buttons: [
                { label: 'Cancel', class: 'btn-secondary' },
                {
                    label: 'Submit Borrow Request',
                    class: 'btn-primary',
                    disabled: activeBorrows >= 3,
                    onClick: () => {
                        const request = AppState.createBorrowRequest(bookId);
                        if (request) {
                            Utils.confetti();
                            Toast.success('Borrow request submitted!');
                            setTimeout(() => {
                                Router.go('/borrow-success/' + request.id);
                            }, 600);
                        } else {
                            Toast.error('Unable to submit borrow request. No copies available.');
                        }
                    }
                }
            ]
        });
    },

    markPickedUp(requestId) {
        if (AppState.markAsBorrowed(requestId)) {
            Toast.success('Book picked up! Happy reading.');
            setTimeout(() => window.location.reload(), 1000);
        }
    }
};