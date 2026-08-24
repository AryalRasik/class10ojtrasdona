const HomePage = {
    render() {
        const isOpen = Utils.isLibraryOpen();
        const quote = LIBRARY_DATA.quotes[Math.floor(Math.random() * LIBRARY_DATA.quotes.length)];
        const featured = AppState.books[8] || AppState.books[0];
        const newArrivals = [...AppState.books].sort((a, b) => b.year - a.year).slice(0, 6);
        const popularBooks = [...AppState.books].sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 6);
        const recentBooks = AppState.recentlyViewed.map(id => AppState.books.find(b => b.id === id)).filter(Boolean).slice(0, 6);

        const returnedBooks = LIBRARY_DATA.borrowedBooks
            .filter(b => b.status === 'returned')
            .slice(-6).reverse()
            .map(r => AppState.books.find(b => b.id === r.bookId))
            .filter(Boolean);

        const stats = LIBRARY_DATA.stats;
        const school = LIBRARY_DATA.school;

        return `
        <section class="hero" style="background-image:url('assets/hero-bg.jpg');background-size:cover;background-position:center;background-repeat:no-repeat;">
            <div class="hero-bg">
                <div class="hero-floating-books">
                    <span class="hero-book float" style="top:15%;left:5%;font-size:4rem;transform:rotate(-12deg)">📚</span>
                    <span class="hero-book float-slow" style="top:60%;right:10%;font-size:3.5rem;transform:rotate(8deg)">📖</span>
                    <span class="hero-book float-reverse" style="top:30%;right:25%;font-size:3rem;transform:rotate(-5deg)">📕</span>
                    <span class="hero-book float" style="top:70%;left:20%;font-size:2.5rem;transform:rotate(15deg)">📗</span>
                    <span class="hero-book float-slow" style="top:10%;right:40%;font-size:2rem;transform:rotate(-20deg)">📘</span>
                </div>
            </div>
            <div class="hero-content">
                <div class="hero-text">
                    <div class="hero-badge reveal">
                        <span class="dot"></span>
                        <span id="heroGreeting">${Utils.getGreeting()}, ${AppState.currentUser ? AppState.currentUser.name.split(' ')[0] : 'Student'}</span>
                    </div>
                    <h1 class="hero-title reveal reveal-delay-1">
                        Discover the World<br>Through <span class="gradient-text">Books</span>
                    </h1>
                    <p class="hero-description reveal reveal-delay-2">
                        Access ${stats.totalBooks.toLocaleString()}+ books, digital resources, and a thriving reading community. Your journey to knowledge starts here.
                    </p>
                    <div class="hero-actions reveal reveal-delay-3">
                        <a href="#/books" class="btn btn-primary btn-lg" data-nav>
                            ${Utils.getIcon('search', 20)} Browse Catalog
                        </a>
                        <a href="#/digital-library" class="btn btn-outline btn-lg" data-nav>
                            ${Utils.getIcon('book-open', 20)} Digital Library
                        </a>
                    </div>
                    <div class="hero-stats reveal reveal-delay-4">
                        <div>
                            <div class="hero-stat-value" data-count="${stats.totalBooks}">0</div>
                            <div class="hero-stat-label">Total Books</div>
                        </div>
                        <div>
                            <div class="hero-stat-value" data-count="${stats.totalStudents}">0</div>
                            <div class="hero-stat-label">Students</div>
                        </div>
                        <div>
                            <div class="hero-stat-value" data-count="${stats.borrowedBooks}">0</div>
                            <div class="hero-stat-label">Active Borrows</div>
                        </div>
                    </div>
                </div>
                <div class="hero-visual reveal reveal-delay-2">
                    <div class="hero-glass-card">
                        <div class="hero-search-box">
                            ${Utils.getIcon('search', 20)}
                            <input type="text" placeholder="Search books, authors, ISBN..." id="heroSearchInput" readonly>
                        </div>
                        <div class="hero-featured">
                            <div class="hero-featured-cover">
                                ${Utils.getBookCover(featured)}
                            </div>
                            <div class="hero-featured-info">
                                <div class="featured-tag">Today's Featured</div>
                                <h4>${Utils.escapeHtml(featured.title)}</h4>
                                <p>${Utils.escapeHtml(featured.author)}</p>
                                <div style="margin-top:6px">${Utils.generateStars(featured.rating)}</div>
                            </div>
                        </div>
                        <div class="hero-quote">
                            <p>"${quote.text}"</p>
                            <cite>— ${quote.author}</cite>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px">
                            <div class="library-status-badge ${isOpen ? 'open' : 'closed'}">
                                <span class="status-dot"></span>
                                ${isOpen ? 'Library Open' : 'Library Closed'}
                            </div>
                            <span style="font-size:0.8rem;color:var(--text-tertiary)">${Utils.getCurrentDate()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <div class="ticker-wrap reveal">
            <div class="ticker-content">
                ${AppState.announcements.map(a => `<span class="ticker-item">${Utils.getIcon('info', 16)} ${Utils.escapeHtml(a.title)}</span>`).join('')}
                ${AppState.announcements.map(a => `<span class="ticker-item">${Utils.getIcon('info', 16)} ${Utils.escapeHtml(a.title)}</span>`).join('')}
            </div>
        </div>

        <section class="home-section container">
            <div class="section-header reveal">
                <div>
                    <h2 class="section-title">Quick Actions</h2>
                    <p class="section-subtitle">Jump into what you need</p>
                </div>
            </div>
            <div class="quick-access-grid">
                <a href="#/books" class="quick-access-card reveal reveal-delay-1" data-nav>
                    <div class="quick-access-icon" style="background:rgba(102,126,234,0.1);color:#667eea">
                        ${Utils.getIcon('search', 28)}
                    </div>
                    <h4>Search Books</h4>
                    <p>Browse our catalog</p>
                </a>
                <a href="#/my-books" class="quick-access-card reveal reveal-delay-2" data-nav>
                    <div class="quick-access-icon" style="background:rgba(16,185,129,0.1);color:#10b981">
                        ${Utils.getIcon('book-open', 28)}
                    </div>
                    <h4>My Books</h4>
                    <p>View borrowed books</p>
                </a>
                <a href="#/digital-library" class="quick-access-card reveal reveal-delay-3" data-nav>
                    <div class="quick-access-icon" style="background:rgba(139,92,246,0.1);color:#8b5cf6">
                        ${Utils.getIcon('download', 28)}
                    </div>
                    <h4>Digital Library</h4>
                    <p>E-books & resources</p>
                </a>
                <a href="#/events" class="quick-access-card reveal reveal-delay-4" data-nav>
                    <div class="quick-access-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">
                        ${Utils.getIcon('calendar', 28)}
                    </div>
                    <h4>Events</h4>
                    <p>Upcoming activities</p>
                </a>
                <a href="#/categories" class="quick-access-card reveal reveal-delay-4" data-nav>
                    <div class="quick-access-icon" style="background:rgba(236,72,153,0.1);color:#ec4899">
                        ${Utils.getIcon('grid', 28)}
                    </div>
                    <h4>Categories</h4>
                    <p>Find by subject</p>
                </a>
                <a href="#/support" class="quick-access-card reveal reveal-delay-4" data-nav>
                    <div class="quick-access-icon" style="background:rgba(6,182,212,0.1);color:#06b6d4">
                        ${Utils.getIcon('headphones', 28)}
                    </div>
                    <h4>Contact Librarian</h4>
                    <p>Get assistance</p>
                </a>
            </div>
        </section>

        <section class="home-section home-section-alt">
            <div class="container">
                <div class="section-header reveal">
                    <div>
                        <h2 class="section-title">New Arrivals</h2>
                        <p class="section-subtitle">Fresh additions to our collection</p>
                    </div>
                    <a href="#/new-arrivals" class="btn btn-ghost" data-nav>View All ${Utils.getIcon('chevron-right', 16)}</a>
                </div>
                <div class="book-scroll reveal">
                    ${newArrivals.map(b => this.bookCard(b)).join('')}
                </div>
            </div>
        </section>

        <section class="counter-section">
            <div class="container">
                <div class="counter-grid">
                    <div class="counter-item reveal">
                        <div class="counter-value" data-count="${stats.totalBooks}">0</div>
                        <div class="counter-label">Total Books</div>
                    </div>
                    <div class="counter-item reveal reveal-delay-1">
                        <div class="counter-value" data-count="${stats.totalStudents}">0</div>
                        <div class="counter-label">Students</div>
                    </div>
                    <div class="counter-item reveal reveal-delay-2">
                        <div class="counter-value" data-count="${stats.monthlyBorrowing}">0</div>
                        <div class="counter-label">Monthly Borrows</div>
                    </div>
                    <div class="counter-item reveal reveal-delay-3">
                        <div class="counter-value" data-count="${stats.visitorsToday}">0</div>
                        <div class="counter-label">Visitors Today</div>
                    </div>
                </div>
            </div>
        </section>

        <section class="home-section container">
            <div class="section-header reveal">
                <div>
                    <h2 class="section-title">Popular Books</h2>
                    <p class="section-subtitle">Most borrowed by our readers</p>
                </div>
                <a href="#/books?sort=popular" class="btn btn-ghost" data-nav>View All ${Utils.getIcon('chevron-right', 16)}</a>
            </div>
            <div class="book-scroll reveal">
                ${popularBooks.map(b => this.bookCard(b)).join('')}
            </div>
        </section>

        <section class="home-section home-section-alt">
            <div class="container">
                <div class="section-header reveal">
                    <div>
                        <h2 class="section-title">Browse Categories</h2>
                        <p class="section-subtitle">Find books by subject</p>
                    </div>
                    <a href="#/categories" class="btn btn-ghost" data-nav>View All ${Utils.getIcon('chevron-right', 16)}</a>
                </div>
                <div class="grid-4 reveal">
                    ${AppState.categories.slice(0, 8).map(c => `
                        <a href="#/books?category=${encodeURIComponent(c.name)}" class="category-card" data-nav>
                            <div class="category-icon" style="background:${c.color}15;color:${c.color}">
                                ${Utils.getIcon(c.icon, 28)}
                            </div>
                            <h4>${c.name}</h4>
                            <p>${c.count} books</p>
                        </a>
                    `).join('')}
                </div>
            </div>
        </section>

        ${recentBooks.length ? `
        <section class="home-section container">
            <div class="section-header reveal">
                <div>
                    <h2 class="section-title">Continue Reading</h2>
                    <p class="section-subtitle">Pick up where you left off</p>
                </div>
            </div>
            <div class="book-scroll reveal">
                ${recentBooks.map(b => this.bookCard(b, true)).join('')}
            </div>
        </section>` : ''}

        ${returnedBooks.length ? `
        <section class="home-section home-section-alt">
            <div class="container">
                <div class="section-header reveal">
                    <div>
                        <h2 class="section-title">Recently Returned</h2>
                        <p class="section-subtitle">Books back on the shelves</p>
                    </div>
                </div>
                <div class="book-scroll reveal">
                    ${returnedBooks.map(b => this.bookCard(b)).join('')}
                </div>
            </div>
        </section>` : ''}

        <section class="home-section container">
            <div class="section-header reveal">
                <div>
                    <h2 class="section-title">Upcoming Events</h2>
                    <p class="section-subtitle">Don't miss out</p>
                </div>
                <a href="#/events" class="btn btn-ghost" data-nav>View All ${Utils.getIcon('chevron-right', 16)}</a>
            </div>
            <div class="grid-3 reveal">
                ${AppState.events.slice(0, 3).map(e => {
                    const d = new Date(e.date);
                    return `
                    <div class="event-card">
                        <div class="event-card-banner" style="background:linear-gradient(135deg, #667eea, #764ba2)">
                            ${Utils.getIcon('calendar', 48)}
                            <div class="event-date-badge">
                                <span class="month">${d.toLocaleString('en', { month: 'short' })}</span>
                                <span class="day">${d.getDate()}</span>
                            </div>
                        </div>
                        <div class="event-card-body">
                            <h4>${Utils.escapeHtml(e.title)}</h4>
                            <p>${Utils.escapeHtml(e.description).substring(0, 100)}...</p>
                        </div>
                        <div class="event-card-footer">
                            <span class="event-meta">${Utils.getIcon('clock', 14)} ${e.time}</span>
                            <button class="btn btn-sm btn-primary">Register</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </section>

        <section class="home-section home-section-alt">
            <div class="container">
                <div class="section-header reveal">
                    <div>
                        <h2 class="section-title">Library Rules</h2>
                        <p class="section-subtitle">Key guidelines to follow</p>
                    </div>
                    <a href="#/rules" class="btn btn-ghost" data-nav>View All ${Utils.getIcon('chevron-right', 16)}</a>
                </div>
                <div class="grid-4 reveal">
                    ${LIBRARY_DATA.rules.slice(0, 4).map(r => `
                        <div class="card card-body" style="text-align:center;padding:24px 16px">
                            <div style="width:48px;height:48px;border-radius:var(--radius-md);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:var(--accent)">
                                ${Utils.getIcon('shield', 24)}
                            </div>
                            <h4 style="font-weight:600;margin-bottom:6px;font-size:0.95rem">${Utils.escapeHtml(r.title)}</h4>
                            <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5">${Utils.escapeHtml(r.description).substring(0, 80)}...</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>

        <section class="home-section container">
            <div class="section-header reveal">
                <div>
                    <h2 class="section-title">Announcements</h2>
                    <p class="section-subtitle">Latest updates from the library</p>
                </div>
                <a href="#/announcements" class="btn btn-ghost" data-nav>View All ${Utils.getIcon('chevron-right', 16)}</a>
            </div>
            <div class="grid-2 reveal">
                ${AppState.announcements.slice(0, 4).map(a => `
                    <div class="card card-body" style="display:flex;gap:12px;align-items:flex-start">
                        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:${a.priority === 'high' ? 'var(--danger-bg)' : a.priority === 'medium' ? 'var(--warning-bg)' : 'var(--info-bg)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${a.priority === 'high' ? 'var(--danger)' : a.priority === 'medium' ? 'var(--warning)' : 'var(--info)'}">
                            ${Utils.getIcon(a.priority === 'high' ? 'alert-triangle' : 'info', 20)}
                        </div>
                        <div>
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                                <h4 style="font-weight:600">${Utils.escapeHtml(a.title)}</h4>
                                <span class="badge badge-${a.priority === 'high' ? 'danger' : a.priority === 'medium' ? 'warning' : 'info'}" style="font-size:0.65rem">${a.priority}</span>
                            </div>
                            <p style="font-size:0.85rem;color:var(--text-secondary)">${Utils.escapeHtml(a.content)}</p>
                            <span style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px;display:block">${Utils.formatDate(a.date)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>

        <section class="home-section home-section-alt" style="padding-bottom:0">
            <div class="container">
                <div class="section-header reveal">
                    <div>
                        <h2 class="section-title">Contact the Librarian</h2>
                        <p class="section-subtitle">We're here to help</p>
                    </div>
                </div>
                <div class="grid-3 reveal" style="max-width:900px">
                    <div class="card card-body" style="text-align:center;padding:28px 20px">
                        <div style="width:48px;height:48px;border-radius:50%;background:rgba(102,126,234,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#667eea">
                            ${Utils.getIcon('phone', 22)}
                        </div>
                        <h4 style="font-weight:600;margin-bottom:4px;font-size:0.95rem">Phone</h4>
                        <p style="font-size:0.85rem;color:var(--text-secondary)">${school.phone}</p>
                    </div>
                    <div class="card card-body" style="text-align:center;padding:28px 20px">
                        <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#10b981">
                            ${Utils.getIcon('mail', 22)}
                        </div>
                        <h4 style="font-weight:600;margin-bottom:4px;font-size:0.95rem">Email</h4>
                        <p style="font-size:0.85rem;color:var(--text-secondary)">${school.email}</p>
                    </div>
                    <div class="card card-body" style="text-align:center;padding:28px 20px">
                        <div style="width:48px;height:48px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#8b5cf6">
                            ${Utils.getIcon('clock', 22)}
                        </div>
                        <h4 style="font-weight:600;margin-bottom:4px;font-size:0.95rem">Library Hours</h4>
                        <p style="font-size:0.85rem;color:var(--text-secondary)">Weekdays: ${school.hours.weekday}</p>
                        <p style="font-size:0.82rem;color:var(--text-tertiary)">Saturday: ${school.hours.saturday}</p>
                    </div>
                </div>
            </div>
        </section>

        <footer class="footer" style="background:var(--bg-primary);border-top:1px solid var(--border);padding:48px 0 24px;margin-top:40px">
            <div class="container">
                <div class="grid-4" style="margin-bottom:32px">
                    <div>
                        <h4 style="font-weight:700;margin-bottom:12px;font-size:1rem">${school.library}</h4>
                        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.6;margin-bottom:8px">${school.motto}</p>
                        <p style="font-size:0.82rem;color:var(--text-tertiary)">${Utils.getIcon('map-pin', 14)} ${school.address}</p>
                    </div>
                    <div>
                        <h4 style="font-weight:600;margin-bottom:12px;font-size:0.95rem">Quick Links</h4>
                        <div style="display:flex;flex-direction:column;gap:8px">
                            <a href="#/books" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">Browse Catalog</a>
                            <a href="#/digital-library" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">Digital Library</a>
                            <a href="#/events" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">Events</a>
                            <a href="#/categories" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">Categories</a>
                        </div>
                    </div>
                    <div>
                        <h4 style="font-weight:600;margin-bottom:12px;font-size:0.95rem">Account</h4>
                        <div style="display:flex;flex-direction:column;gap:8px">
                            <a href="#/my-books" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">My Books</a>
                            <a href="#/profile" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">Profile</a>
                            <a href="#/settings" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">Settings</a>
                            <a href="#/support" data-nav style="font-size:0.85rem;color:var(--text-secondary);text-decoration:none">Support</a>
                        </div>
                    </div>
                    <div>
                        <h4 style="font-weight:600;margin-bottom:12px;font-size:0.95rem">Contact</h4>
                        <div style="display:flex;flex-direction:column;gap:8px">
                            <span style="font-size:0.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px">${Utils.getIcon('phone', 14)} ${school.phone}</span>
                            <span style="font-size:0.85rem;color:var(--text-secondary);display:flex;align-items:center;gap:6px">${Utils.getIcon('mail', 14)} ${school.email}</span>
                            <span style="font-size:0.82rem;color:var(--text-tertiary);margin-top:4px">Weekdays: ${school.hours.weekday}</span>
                            <span style="font-size:0.82rem;color:var(--text-tertiary)">Saturday: ${school.hours.saturday}</span>
                        </div>
                    </div>
                </div>
                <div style="border-top:1px solid var(--border);padding-top:20px;text-align:center">
                    <p style="font-size:0.8rem;color:var(--text-tertiary)">&copy; ${new Date().getFullYear()} ${school.name}. All rights reserved.</p>
                </div>
            </div>
        </footer>`;
    },

    bookCard(book, showProgress = false) {
        const progress = AppState.readingProgress[book.id] || 0;
        return `
        <a href="#/book/${book.id}" class="book-card" data-nav>
            <div class="book-card-cover">
                ${Utils.getBookCover(book)}
                <span class="book-status ${book.availableCopies > 0 ? 'available' : 'borrowed'}">
                    ${book.availableCopies > 0 ? 'Available' : 'Unavailable'}
                </span>
                <div class="book-actions-overlay">
                    <button class="book-action-btn" data-tooltip="Quick View" onclick="event.preventDefault();event.stopPropagation();">
                        ${Utils.getIcon('eye', 18)}
                    </button>
                    <button class="book-action-btn" data-tooltip="Favorite" onclick="event.preventDefault();event.stopPropagation();AppState.toggleFavorite(${book.id});Toast.show('${AppState.isFavorite(book.id) ? 'Removed from' : 'Added to'} favorites','success');">
                        ${Utils.getIcon('heart', 18)}
                    </button>
                </div>
            </div>
            <div class="book-card-info">
                <div class="book-card-title">${Utils.escapeHtml(book.title)}</div>
                <div class="book-card-author">${Utils.escapeHtml(book.author)}</div>
                ${showProgress && progress > 0 ? `
                    <div style="height:4px;background:var(--bg-tertiary);border-radius:2px;margin-bottom:8px;overflow:hidden">
                        <div style="height:100%;width:${progress}%;background:var(--accent-gradient);border-radius:2px"></div>
                    </div>
                ` : ''}
                <div class="book-card-meta">
                    <div class="book-card-rating">
                        ${Utils.getIcon('star', 14)}
                        ${book.rating}
                    </div>
                    <span class="book-card-copies">${book.availableCopies}/${book.totalCopies} avail</span>
                </div>
            </div>
        </a>`;
    },

    afterRender() {
        Animations.initScrollReveal();
        Animations.initCounters();
        Animations.initMagneticButtons();
        Animations.initRippleButtons();

        const heroSearch = document.getElementById('heroSearchInput');
        if (heroSearch) {
            heroSearch.addEventListener('click', () => {
                document.getElementById('searchOverlay').classList.add('active');
                const input = document.getElementById('overlaySearch');
                if (input) { input.focus(); input.value = ''; }
            });
        }
    }
};
