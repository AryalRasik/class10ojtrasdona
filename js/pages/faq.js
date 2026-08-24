const FAQPage = {
  expandedItems: new Set(),
  activeCategory: 'all',
  searchQuery: '',

  faqData: [
    { q: 'How do I borrow a book?', a: 'Navigate to the book detail page and click the "Borrow" button. You must be logged in and have available borrowing slots. Your request will be sent to the librarian for approval. Once approved, pick up the book from the library counter.', category: 'Borrowing' },
    { q: 'What is the borrowing limit?', a: 'Students can borrow up to 3 books at a time. Teachers can borrow up to 5 books. Librarians and admins can also borrow up to 5 books. These limits are set to ensure fair access for all members.', category: 'Borrowing' },
    { q: 'How do I reserve a book?', a: 'If a book is currently unavailable (all copies borrowed), click the "Reserve" button on its detail page. You will be placed in a queue and notified when the book becomes available. Reservations expire after 7 days if not picked up.', category: 'Reservations' },
    { q: 'What happens if I return a book late?', a: 'A fine of Rs. 5 per day is charged for overdue books. If fines exceed Rs. 100, you will be unable to borrow new books until they are paid. Overdue books that are more than 30 days late may result in membership suspension.', category: 'Fines' },
    { q: 'Can I renew a borrowed book?', a: 'Yes, you can renew a borrowed book up to 1 time (students) or 2 times (teachers/staff), provided no one else has reserved it. Renewals extend the loan period by the standard borrowing period (14 days for students, 21 days for teachers).', category: 'Borrowing' },
    { q: 'How do I access digital books?', a: 'Visit the Digital Library section from the sidebar or home page. You can browse and read PDF textbooks, e-books, and other digital resources directly in your browser. Digital resources are available for personal use only.', category: 'Digital Library' },
    { q: 'How do I reset my password?', a: 'Go to Settings > Account > Change Password. If you are unable to log in, contact the librarian or administrator who can reset your password. For Supabase accounts, use the "Forgot Password" link on the login page.', category: 'Account' },
    { q: 'What are the library hours?', a: 'Weekdays (Sunday - Friday): 7:00 AM - 5:00 PM. Saturday: 9:00 AM - 2:00 PM. The library is closed on major public holidays. Extended hours may be available during exam periods.', category: 'General' },
    { q: 'How do I contact the librarian?', a: 'You can reach the librarian via phone at +977-01-6634373, email at library@saraswatischool.edu.np, or visit the Support page to send a message directly. You can also use the feedback form for suggestions.', category: 'General' },
    { q: 'Can teachers borrow more books?', a: 'Yes, teachers have a higher borrowing limit of 5 books (vs. 3 for students) and a longer loan period of 21 days (vs. 14 days for students). Teachers can also renew books up to 2 times.', category: 'Borrowing' }
  ],

  render() {
    const categories = ['all', 'General', 'Borrowing', 'Reservations', 'Digital Library', 'Account', 'Fines'];
    const filtered = this.getFilteredFaqs();
    const school = LIBRARY_DATA.school || {};

    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('help-circle', 28)} Frequently Asked Questions</h1>
          <p class="page-description">Find answers to common questions about the library</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="max-width:800px;margin:0 auto;">
          <div class="form-group" style="margin-bottom:1.5rem;">
            <div style="position:relative;">
              <span style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);color:var(--text-tertiary);">${Utils.getIcon('search', 18)}</span>
              <input class="form-input" id="faq-search" type="text" placeholder="Search questions..." value="${Utils.escapeHtml(this.searchQuery)}" oninput="FAQPage.onSearch(this.value)" style="padding-left:2.75rem;">
            </div>
          </div>

          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem;">
            ${categories.map(cat => `
              <button class="btn ${this.activeCategory === cat ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="FAQPage.setCategory('${cat}')">
                ${cat === 'all' ? 'All' : cat}
              </button>
            `).join('')}
          </div>

          <div style="display:flex;flex-direction:column;gap:0.5rem;">
            ${filtered.length ? filtered.map((faq, i) => {
              const origIndex = this.faqData.indexOf(faq);
              const expanded = this.expandedItems.has(origIndex);
              const catColor = this.getCategoryColor(faq.category);
              return `
                <div class="card" style="overflow:hidden;">
                  <button class="btn btn-ghost" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;text-align:left;border:none;font-weight:600;" onclick="FAQPage.toggle(${origIndex})">
                    <span style="display:flex;align-items:center;gap:0.75rem;flex:1;">
                      <span class="badge badge-${catColor}" style="font-size:0.65rem;flex-shrink:0;">${Utils.escapeHtml(faq.category)}</span>
                      <span>${Utils.escapeHtml(faq.q)}</span>
                    </span>
                    <span style="transition:transform 0.2s;transform:rotate(${expanded ? '180' : '0'}deg);flex-shrink:0;margin-left:0.5rem;">${Utils.getIcon('chevron-down', 16)}</span>
                  </button>
                  <div style="max-height:${expanded ? '500px' : '0'};overflow:hidden;transition:max-height 0.3s ease;">
                    <div style="padding:0 1.25rem 1.25rem;color:var(--text-secondary);line-height:1.7;border-top:1px solid var(--border);margin-top:0;">
                      <p style="padding-top:1rem;margin:0;">${Utils.escapeHtml(faq.a)}</p>
                    </div>
                  </div>
                </div>`;
            }).join('') : `
              <div class="empty-state">
                ${Utils.getIcon('search', 48)}
                <h3>No Results Found</h3>
                <p>Try a different search term or category.</p>
              </div>`}
          </div>

          <div class="card" style="margin-top:2rem;text-align:center;background:var(--primary-light);border:1px solid var(--primary);">
            <div style="padding:2rem;">
              <h3 style="margin:0 0 0.5rem;">Still have questions?</h3>
              <p style="margin:0 0 1rem;color:var(--text-secondary);">Can't find what you're looking for? Contact our librarian for personalized help.</p>
              <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
                <a href="#/support" class="btn btn-primary" data-nav>${Utils.getIcon('headphones', 16)} Contact Librarian</a>
                <a href="#/feedback" class="btn btn-outline" data-nav>${Utils.getIcon('message-square', 16)} Send Feedback</a>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  getFilteredFaqs() {
    let faqs = [...this.faqData];
    if (this.activeCategory !== 'all') {
      faqs = faqs.filter(f => f.category === this.activeCategory);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      faqs = faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
    }
    return faqs;
  },

  toggle(index) {
    if (this.expandedItems.has(index)) {
      this.expandedItems.delete(index);
    } else {
      this.expandedItems.add(index);
    }
    Router.resolve();
  },

  setCategory(cat) {
    this.activeCategory = cat;
    Router.resolve();
  },

  onSearch(value) {
    this.searchQuery = value;
    Router.resolve();
  },

  getCategoryColor(category) {
    const colors = {
      'General': 'info',
      'Borrowing': 'success',
      'Reservations': 'warning',
      'Digital Library': 'primary',
      'Account': 'danger',
      'Fines': 'danger'
    };
    return colors[category] || 'info';
  },

  afterRender() {}
};
