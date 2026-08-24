const SupportPage = {
  expandedFaq: new Set(),
  render() {
    const faqs = [
      { q: 'How do I borrow a book?', a: 'Navigate to the book detail page and click the "Borrow" button. You must be logged in and have available borrowing slots.' },
      { q: 'How many books can I borrow at once?', a: 'Students can borrow up to 3 books at a time. Teachers can borrow up to 5 books.' },
      { q: 'What is the loan period?', a: 'The standard loan period is 14 days. You can renew a book up to 2 times if no one has reserved it.' },
      { q: 'How do I reserve a book?', a: 'If a book is currently unavailable, click the "Reserve" button on its detail page. You will be notified when it becomes available.' },
      { q: 'What happens if I return a book late?', a: 'Overdue books may result in a temporary borrowing restriction. Please return books on time to avoid any issues.' },
      { q: 'Can I access digital resources?', a: 'Yes! Visit the Digital Library section to access e-books, audiobooks, and video materials.' },
      { q: 'How do I renew a book?', a: 'Go to My Books and click the "Renew" button on the book you want to extend. Renewals are subject to availability.' },
      { q: 'How do I pay a fine?', a: 'Fines can be paid at the library front desk. Once payment is confirmed, your borrowing restrictions will be lifted.' }
    ];
    const school = LIBRARY_DATA.school || {};
    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('help-circle', 28)} Support</h1>
          <p class="page-description">Get help with the library system</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('help-circle', 18)} Frequently Asked Questions</h2></div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:2.5rem;">
          ${faqs.map((faq, i) => {
            const expanded = this.expandedFaq.has(i);
            return `
              <div class="card" style="overflow:hidden;">
                <button class="btn btn-ghost" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:1rem;text-align:left;border:none;font-weight:600;" onclick="SupportPage.toggleFaq(${i})">
                  <span>${Utils.escapeHtml(faq.q)}</span>
                  <span style="transition:transform 0.2s;transform:rotate(${expanded ? '180' : '0'}deg);flex-shrink:0;margin-left:0.5rem;">${Utils.getIcon('chevron-down', 16)}</span>
                </button>
                <div style="max-height:${expanded ? '300px' : '0'};overflow:hidden;transition:max-height 0.3s;">
                  <div style="padding:0 1rem 1rem;color:var(--text-secondary);line-height:1.6;">${Utils.escapeHtml(faq.a)}</div>
                </div>
              </div>`;
          }).join('')}
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('send', 18)} Contact Us</h2></div>
        <div class="card" style="margin-bottom:2rem;">
          <div style="padding:1.5rem;">
            <div style="display:flex;flex-direction:column;gap:1.25rem;">
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('map-pin', 18)}</div>
                <div><p style="margin:0;font-weight:600;">${Utils.escapeHtml(school.address || '123 School St, Education City')}</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Address</p></div>
              </div>
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('phone', 18)}</div>
                <div><p style="margin:0;font-weight:600;">${Utils.escapeHtml(school.phone || '+1 234 567 890')}</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Phone</p></div>
              </div>
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('mail', 18)}</div>
                <div><p style="margin:0;font-weight:600;">${Utils.escapeHtml(school.email || 'library@school.edu')}</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Email</p></div>
              </div>
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;">${Utils.getIcon('clock', 18)}</div>
                <div><p style="margin:0;font-weight:600;">${Utils.escapeHtml(school.hours || 'Mon-Fri: 8:00 AM - 4:00 PM')}</p><p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">Library Hours</p></div>
              </div>
            </div>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('map', 18)} Find Us</h2></div>
        <div class="card" style="margin-bottom:2rem;">
          <div style="height:220px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
            <div style="text-align:center;color:var(--text-tertiary);">
              ${Utils.getIcon('map', 48)}
              <p style="margin:0.5rem 0 0;font-size:0.9rem;">Map View</p>
              <p style="margin:0;font-size:0.8rem;">${Utils.escapeHtml(school.address || '123 School St, Education City')}</p>
            </div>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('message-square', 18)} Send a Message</h2></div>
        <div class="card" style="margin-bottom:2rem;">
          <div style="padding:1.5rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div class="form-group"><label class="form-label">Your Name</label><input class="form-input" id="support-name" placeholder="Enter your name"></div>
              <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="support-email" type="email" placeholder="Enter your email"></div>
            </div>
            <div class="form-group"><label class="form-label">Subject</label><input class="form-input" id="support-subject" placeholder="How can we help?"></div>
            <div class="form-group"><label class="form-label">Message</label><textarea class="form-input" id="support-message" rows="4" placeholder="Write your message..."></textarea></div>
            <button class="btn btn-primary" onclick="SupportPage.sendMessage()" style="width:100%;">${Utils.getIcon('send', 16)} Send Message</button>
          </div>
        </div>

        <div class="section-header"><h2 class="section-title">${Utils.getIcon('share-2', 18)} Follow Us</h2></div>
        <div class="card">
          <div style="padding:1.5rem;">
            <p style="margin:0 0 1rem;color:var(--text-secondary);">Stay connected with us on social media for the latest updates and announcements.</p>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
              <a href="#" onclick="event.preventDefault();" style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.2rem;border-radius:var(--radius-md);background:#1877f2;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;">
                ${Utils.getIcon('facebook', 16)} Facebook
              </a>
              <a href="#" onclick="event.preventDefault();" style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.2rem;border-radius:var(--radius-md);background:#1da1f2;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;">
                ${Utils.getIcon('twitter', 16)} Twitter
              </a>
              <a href="#" onclick="event.preventDefault();" style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.2rem;border-radius:var(--radius-md);background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;">
                ${Utils.getIcon('instagram', 16)} Instagram
              </a>
              <a href="#" onclick="event.preventDefault();" style="display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1.2rem;border-radius:var(--radius-md);background:#ff0000;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;">
                ${Utils.getIcon('youtube', 16)} YouTube
              </a>
            </div>
          </div>
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
  sendMessage() {
    const name = document.getElementById('support-name');
    const email = document.getElementById('support-email');
    const subject = document.getElementById('support-subject');
    const message = document.getElementById('support-message');
    if (!name || !name.value.trim() || !email || !email.value.trim() || !message || !message.value.trim()) {
      Toast.error('Please fill in all required fields.');
      return;
    }
    const msg = {
      id: Date.now(),
      name: name.value.trim(),
      email: email.value.trim(),
      subject: subject ? subject.value.trim() : '',
      message: message.value.trim(),
      userId: AppState.currentUser ? AppState.currentUser.id : null,
      timestamp: new Date().toISOString(),
      status: 'new'
    };
    AppState.contactMessages.push(msg);
    AppState.saveAll();
    Toast.success('Your message has been sent! We will get back to you soon.');
    name.value = '';
    email.value = '';
    if (subject) subject.value = '';
    message.value = '';
  },
  afterRender() {}
};
