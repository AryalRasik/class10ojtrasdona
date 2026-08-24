const HelpPage = {
  expandedFaq: new Set(),
  render() {
    const school = LIBRARY_DATA.school || {};
    const quickLinks = [
      { icon: 'book-open', title: 'Getting Started', desc: 'Learn how to use the library system', action: 'HelpPage.navigateHelp("getting-started")' },
      { icon: 'book', title: 'Borrowing Books', desc: 'How to borrow and return books', action: 'HelpPage.navigateHelp("borrowing")' },
      { icon: 'monitor', title: 'Digital Library', desc: 'Access e-books and digital resources', action: 'HelpPage.navigateHelp("digital")' },
      { icon: 'user', title: 'Account & Profile', desc: 'Manage your account settings', action: 'HelpPage.navigateHelp("account")' },
      { icon: 'dollar-sign', title: 'Fines & Payments', desc: 'Understand fines and how to pay', action: 'HelpPage.navigateHelp("fines")' },
      { icon: 'headphones', title: 'Contact Support', desc: 'Get in touch with our team', action: 'HelpPage.navigateHelp("contact")' }
    ];
    const articles = [
      { icon: 'book-open', title: 'How to borrow a book', desc: 'Step-by-step guide to borrowing your first book from the library collection.' },
      { icon: 'bookmark', title: 'How to reserve a book', desc: 'Learn how to place a reservation on a book that is currently checked out.' },
      { icon: 'alert-circle', title: 'Understanding library fines', desc: 'Everything you need to know about overdue fines, grace periods, and fee waivers.' },
      { icon: 'monitor', title: 'Using the digital library', desc: 'Access our collection of e-books, audiobooks, and online educational resources.' },
      { icon: 'settings', title: 'Managing your account', desc: 'Update your profile, change your password, and manage notification preferences.' },
      { icon: 'shield', title: 'Library rules and policies', desc: 'Review the borrowing limits, conduct rules, and resource usage policies.' }
    ];
    const faqs = [
      { q: 'How do I borrow a book?', a: 'Navigate to the book detail page and click the "Borrow" button. You must be logged in and have available borrowing slots. Students can borrow up to 3 books, and teachers up to 5.' },
      { q: 'What is the loan period?', a: 'The standard loan period is 14 days. You can renew a book up to 2 times if no one else has reserved it.' },
      { q: 'How do I reserve a book?', a: 'If a book is currently unavailable, click the "Reserve" button on its detail page. You will receive a notification when it becomes available for pickup.' },
      { q: 'What happens if I return a book late?', a: 'Overdue books may result in fines or temporary borrowing restrictions. Please return books on time to avoid any issues.' },
      { q: 'Can I access digital resources from home?', a: 'Yes! The Digital Library is accessible 24/7 from any device with an internet connection. Simply log in with your library credentials.' },
      { q: 'How do I update my profile information?', a: 'Go to your Profile page and click "Edit Profile" to update your name, email, phone, and other personal details.' },
      { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page, or visit Account Settings in your profile to change your password manually.' },
      { q: 'Who do I contact for technical issues?', a: 'For any technical problems, reach out via the contact form below, email us at the support address, or call during library hours.' }
    ];
    return `
      <div class="page-header" style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));padding:3rem 0;color:#fff;">
        <div class="container" style="text-align:center;">
          <h1 class="page-title" style="color:#fff;margin-bottom:0.5rem;">${Utils.getIcon('help-circle', 28)} Help Center</h1>
          <p class="page-description" style="color:rgba(255,255,255,0.85);">Find answers, learn how to use the library, and get the support you need</p>
          <div style="max-width:550px;margin:1.5rem auto 0;position:relative;">
            <input class="form-input" id="help-search" placeholder="How can we help you?" style="padding:0.875rem 1rem 0.875rem 3rem;border-radius:50px;border:none;font-size:1rem;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
            <span style="position:absolute;left:1.1rem;top:50%;transform:translateY(-50%);color:var(--text-secondary);">${Utils.getIcon('search', 20)}</span>
          </div>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;max-width:1100px;margin:0 auto;">
        <div style="margin-top:2rem;">
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('grid', 18)} Quick Links</h2></div>
          <div class="grid-3" style="margin-bottom:2.5rem;">
            ${quickLinks.map(link => `
              <div class="card" style="padding:1.5rem;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;" onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'" onmouseleave="this.style.transform='';this.style.boxShadow=''" onclick="${link.action}">
                <div style="width:48px;height:48px;border-radius:12px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);margin-bottom:1rem;">
                  ${Utils.getIcon(link.icon, 24)}
                </div>
                <h3 style="margin:0 0 0.35rem;font-size:1rem;">${Utils.escapeHtml(link.title)}</h3>
                <p style="margin:0;font-size:0.85rem;color:var(--text-secondary);">${Utils.escapeHtml(link.desc)}</p>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('file-text', 18)} Popular Articles</h2></div>
          <div class="grid-2" style="margin-bottom:2.5rem;">
            ${articles.map(article => `
              <div class="card" style="padding:1.25rem;display:flex;gap:1rem;align-items:flex-start;cursor:pointer;transition:background 0.2s;" onmouseenter="this.style.background='var(--bg-hover)'" onmouseleave="this.style.background=''" onclick="HelpPage.openArticle('${Utils.escapeHtml(article.title)}')">
                <div style="width:40px;height:40px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">
                  ${Utils.getIcon(article.icon, 20)}
                </div>
                <div>
                  <h4 style="margin:0 0 0.25rem;font-size:0.95rem;">${Utils.escapeHtml(article.title)}</h4>
                  <p style="margin:0;font-size:0.83rem;color:var(--text-secondary);line-height:1.5;">${Utils.escapeHtml(article.desc)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="section-header"><h2 class="section-title">${Utils.getIcon('help-circle', 18)} Frequently Asked Questions</h2></div>
          <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:2.5rem;max-width:800px;">
            ${faqs.map((faq, i) => {
              const expanded = this.expandedFaq.has(i);
              return `
                <div class="card" style="overflow:hidden;">
                  <button class="btn btn-ghost" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;text-align:left;border:none;font-weight:600;" onclick="HelpPage.toggleFaq(${i})">
                    <span style="display:flex;align-items:center;gap:0.75rem;">
                      <span style="width:28px;height:28px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;">${i + 1}</span>
                      ${Utils.escapeHtml(faq.q)}
                    </span>
                    <span style="transition:transform 0.2s;transform:rotate(${expanded ? '180' : '0'}deg);flex-shrink:0;">${Utils.getIcon('chevron-down', 16)}</span>
                  </button>
                  <div style="max-height:${expanded ? '300px' : '0'};overflow:hidden;transition:max-height 0.3s;">
                    <div style="padding:0 1.25rem 1.25rem 3.5rem;color:var(--text-secondary);line-height:1.6;">${Utils.escapeHtml(faq.a)}</div>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
        <div class="grid-2">
          <div>
            <div class="section-header"><h2 class="section-title">${Utils.getIcon('phone', 18)} Contact Support</h2></div>
            <div class="card" style="margin-bottom:1.5rem;">
              <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <div style="width:42px;height:42px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('phone', 18)}</div>
                  <div><p style="margin:0;font-weight:600;">${Utils.escapeHtml(school.phone || '+1 234 567 890')}</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Phone Support</p></div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <div style="width:42px;height:42px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('mail', 18)}</div>
                  <div><p style="margin:0;font-weight:600;">${Utils.escapeHtml(school.email || 'support@library.edu')}</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Email Support</p></div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <div style="width:42px;height:42px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('map-pin', 18)}</div>
                  <div><p style="margin:0;font-weight:600;">${Utils.escapeHtml(school.address || '123 School St, Education City')}</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Visit Us</p></div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <div style="width:42px;height:42px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('clock', 18)}</div>
                  <div><p style="margin:0;font-weight:600;">Mon-Fri: 8:00 AM - 4:00 PM</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Support Hours</p></div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div class="section-header"><h2 class="section-title">${Utils.getIcon('message-square', 18)} Send Us Feedback</h2></div>
            <div class="card">
              <div style="padding:1.5rem;">
                <div class="form-group"><label class="form-label">Your Name</label><input class="form-input" id="feedback-name" placeholder="Enter your name"></div>
                <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="feedback-email" type="email" placeholder="Enter your email"></div>
                <div class="form-group"><label class="form-label">Subject</label>
                  <select class="form-input" id="feedback-subject">
                    <option value="">Select a topic</option>
                    <option value="general">General Question</option>
                    <option value="technical">Technical Issue</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>
                <div class="form-group"><label class="form-label">Message</label><textarea class="form-input" id="feedback-message" rows="4" placeholder="How can we help you?"></textarea></div>
                <button class="btn btn-primary" onclick="HelpPage.submitFeedback()" style="width:100%;">${Utils.getIcon('send', 16)} Submit Feedback</button>
              </div>
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-top:2rem;padding:1.5rem;background:var(--bg-secondary);border-radius:12px;">
          <p style="margin:0 0 0.5rem;color:var(--text-secondary);">Can't find what you're looking for?</p>
          <button class="btn btn-outline" onclick="Router.navigate('support')">${Utils.getIcon('external-link', 16)} Visit Full Support Page</button>
        </div>
      </div>`;
  },
  toggleFaq(index) {
    if (this.expandedFaq.has(index)) {
      this.expandedFaq.delete(index);
    } else {
      this.expandedFaq.add(index);
    }
    Router.resolve();
  },
  navigateHelp(topic) {
    const topicGuides = {
      'getting-started': { title: 'Getting Started', content: `<p>Welcome to the Saraswati Sec School Library Management System! Here's how to get started:</p><ol style="padding-left:1.5rem;line-height:2;"><li><strong>Browse Books</strong> - Visit the <a href="#/books" data-nav>Browse Books</a> page to search our collection.</li><li><strong>Borrow a Book</strong> - Click on any book and press the "Borrow" button. You'll be notified when your request is approved.</li><li><strong>Digital Library</strong> - Access e-books and audiobooks from the <a href="#/digital-library" data-nav>Digital Library</a>.</li><li><strong>Track Your Borrows</strong> - Visit <a href="#/my-books" data-nav>My Books</a> to see all your active borrows and due dates.</li><li><strong>Notifications</strong> - Stay updated with <a href="#/notifications" data-nav>notifications</a> about your requests.</li></ol>` },
      'borrowing': { title: 'Borrowing Books', content: `<p>Follow these steps to borrow a book:</p><ol style="padding-left:1.5rem;line-height:2;"><li>Navigate to the <a href="#/books" data-nav>Books</a> page and find the book you want.</li><li>Click on the book to view its details and availability.</li><li>Click the <strong>"Borrow"</strong> button (you must be logged in).</li><li>Wait for librarian approval - you'll receive a notification.</li><li>Pick up the book from the library once approved.</li><li>Return it before the due date to avoid fines.</li></ol><p><strong>Loan periods:</strong> Students - 14 days | Teachers - 21 days<br><strong>Borrow limits:</strong> Students - 3 books | Teachers - 5 books</p>` },
      'digital': { title: 'Digital Library', content: `<p>The Digital Library provides 24/7 access to:</p><ul style="padding-left:1.5rem;line-height:2;"><li><strong>E-Books (PDF)</strong> - Read textbooks and reference materials online.</li><li><strong>Audiobooks</strong> - Listen to audio versions of popular books.</li><li><strong>Videos</strong> - Watch educational videos and recorded lectures.</li></ul><p>Simply log in with your library credentials and start browsing at the <a href="#/digital-library" data-nav>Digital Library</a> page.</p>` },
      'account': { title: 'Account & Profile', content: `<p>Manage your account settings:</p><ul style="padding-left:1.5rem;line-height:2;"><li><strong>Profile</strong> - Update your personal information at <a href="#/profile" data-nav>Profile</a>.</li><li><strong>Settings</strong> - Customize notifications, theme, and language at <a href="#/settings" data-nav>Settings</a>.</li><li><strong>Reading History</strong> - View your past borrows at <a href="#/borrow-history" data-nav>Borrow History</a>.</li></ul><p><strong>Password Reset:</strong> Contact the librarian if you need to reset your password.</p>` },
      'fines': { title: 'Fines & Payments', content: `<p><strong>Overdue Fines:</strong></p><ul style="padding-left:1.5rem;line-height:2;"><li>Fine rate: Rs. 5 per day for overdue books.</li><li>Fines accumulate automatically after the due date.</li><li>You cannot borrow new books if your unpaid fines exceed Rs. 100.</li></ul><p><strong>Grace Period:</strong> A 1-day grace period may apply for first-time overdue books.</p><p><strong>Paying Fines:</strong> Visit the library counter to pay any outstanding fines. Payments will be recorded automatically.</p>` },
      'contact': { title: 'Contact Support', content: `<p>Need help? Reach us through:</p><ul style="padding-left:1.5rem;line-height:2;"><li><strong>Phone:</strong> During library hours (Mon-Fri: 8 AM - 4 PM)</li><li><strong>Email:</strong> Use the feedback form below</li><li><strong>In Person:</strong> Visit the library front desk</li><li><strong>FAQ:</strong> Check the FAQ section above for quick answers</li></ul>` }
    };
    const guide = topicGuides[topic];
    if (guide) {
      Modal.show({ title: guide.title, content: guide.content, size: 'md', buttons: [{ label: 'Close', class: 'btn-primary' }] });
      Router.bindLinks();
    } else {
      Toast.info('Guide not found for: ' + topic);
    }
  },
  openArticle(title) {
    const articleContent = {
      'How to borrow a book': 'Go to the Books page, click on any available book, and press the "Borrow" button. You\'ll receive a notification when the librarian approves your request. Pick up the book from the library within 3 days of approval.',
      'How to reserve a book': 'If a book is currently checked out, click "Reserve" on its detail page. You\'ll be added to the queue and notified when it becomes available.',
      'Understanding library fines': 'Overdue fines are Rs. 5/day per book. Unpaid fines above Rs. 100 will block new borrows. Visit the library counter to settle fines.',
      'Using the digital library': 'Access e-books, audiobooks, and videos from the Digital Library page. Works 24/7 from any device with internet.',
      'Managing your account': 'Update your profile, change notification preferences, and manage your theme from the Settings page.',
      'Library rules and policies': 'Students can borrow up to 3 books for 14 days. Teachers can borrow 5 books for 21 days. Renewals are allowed if no one else has reserved the book.'
    };
    const content = articleContent[title] || 'This article is being prepared. Please check back later.';
    Modal.show({ title, content: `<p style="line-height:1.7;color:var(--text-secondary);">${Utils.escapeHtml(content)}</p>`, size: 'md', buttons: [{ label: 'Close', class: 'btn-primary' }] });
  },
  submitFeedback() {
    const name = document.getElementById('feedback-name');
    const email = document.getElementById('feedback-email');
    const subject = document.getElementById('feedback-subject');
    const message = document.getElementById('feedback-message');
    if (!name || !name.value.trim() || !email || !email.value.trim() || !subject || !subject.value || !message || !message.value.trim()) {
      Toast.error('Please fill in all fields.');
      return;
    }
    const feedbackEntry = {
      id: Date.now(),
      name: name.value.trim(),
      email: email.value.trim(),
      subject: subject.value,
      message: message.value.trim(),
      userId: AppState.currentUser ? AppState.currentUser.id : null,
      timestamp: new Date().toISOString(),
      status: 'new'
    };
    AppState.contactMessages.push(feedbackEntry);
    AppState.saveAll();
    Toast.success('Thank you! Your feedback has been submitted.');
    name.value = '';
    email.value = '';
    subject.value = '';
    message.value = '';
  },
  afterRender() {
    const searchInput = document.getElementById('help-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
          const text = card.textContent.toLowerCase();
          card.style.display = !query || text.includes(query) ? '' : 'none';
        });
      });
    }
  }
};
