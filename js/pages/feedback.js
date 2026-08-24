const FeedbackPage = {
  selectedRating: 0,
  submitted: false,

  render() {
    const user = AppState.currentUser;
    const isAdmin = user && (user.role === 'admin' || user.role === 'librarian');
    const allFeedback = AppState.feedback || [];

    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('message-square', 28)} Feedback & Suggestions</h1>
          <p class="page-description">Help us improve the library experience</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        ${this.submitted ? `
        <div class="card" style="background:var(--success-bg);border:1px solid var(--success);margin-bottom:2rem;padding:2rem;text-align:center;">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--success);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
            ${Utils.getIcon('check-circle', 32)}
          </div>
          <h3 style="margin:0 0 0.5rem;color:var(--success);">Thank You!</h3>
          <p style="margin:0;color:var(--text-secondary);">Your feedback has been submitted successfully. We appreciate your input!</p>
          <button class="btn btn-primary" style="margin-top:1.5rem;" onclick="FeedbackPage.resetForm()">Submit Another Feedback</button>
        </div>` : `
        <div class="grid-2">
          <div>
            <div class="section-header"><h2 class="section-title">${Utils.getIcon('edit-3', 18)} Submit Feedback</h2></div>
            <div class="card">
              <div style="padding:1.5rem;">
                <div class="form-group">
                  <label class="form-label">Subject</label>
                  <select class="form-input" id="feedback-subject">
                    <option value="General Feedback">General Feedback</option>
                    <option value="Book Suggestion">Book Suggestion</option>
                    <option value="Service Quality">Service Quality</option>
                    <option value="Facility">Facility</option>
                    <option value="Website">Website</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Rating</label>
                  <div id="feedback-stars" style="display:flex;gap:0.25rem;">
                    ${[1, 2, 3, 4, 5].map(star => `
                      <button type="button" class="btn btn-ghost" style="padding:0.25rem;font-size:1.5rem;color:${star <= this.selectedRating ? '#f59e0b' : 'var(--text-tertiary)'};background:none;border:none;cursor:pointer;" onclick="FeedbackPage.setRating(${star})">
                        ${star <= this.selectedRating ? Utils.getIcon('star', 28) : Utils.getIcon('star', 28)}
                      </button>
                    `).join('')}
                    <span style="font-size:0.85rem;color:var(--text-secondary);align-self:center;margin-left:0.5rem;">${this.selectedRating > 0 ? this.selectedRating + '/5' : 'Select a rating'}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Message <span style="color:var(--danger)">*</span></label>
                  <textarea class="form-input" id="feedback-message" rows="5" placeholder="Tell us what you think, suggest improvements, or report an issue..." minlength="10"></textarea>
                  <p style="font-size:0.75rem;color:var(--text-tertiary);margin-top:0.25rem;">Minimum 10 characters</p>
                </div>
                <div class="form-group">
                  <label class="form-label">Name</label>
                  <input class="form-input" id="feedback-name" placeholder="Your name" value="${user ? Utils.escapeHtml(user.name) : ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input class="form-input" id="feedback-email" type="email" placeholder="Your email" value="${user ? Utils.escapeHtml(user.email) : ''}">
                </div>
                <button class="btn btn-primary" style="width:100%;" onclick="FeedbackPage.submit()">${Utils.getIcon('send', 16)} Submit Feedback</button>
              </div>
            </div>
          </div>
          <div>
            <div class="section-header"><h2 class="section-title">${Utils.getIcon('info', 18)} Why Your Feedback Matters</h2></div>
            <div class="card" style="margin-bottom:1.5rem;">
              <div style="padding:1.5rem;color:var(--text-secondary);line-height:1.7;">
                <p style="margin:0 0 1rem;">Your feedback helps us improve our collection, services, and facilities. Every suggestion is reviewed by our library team.</p>
                <div style="display:flex;flex-direction:column;gap:0.75rem;">
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('book-open', 16)}</div>
                    <span>Suggest new books and resources</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('settings', 16)}</div>
                    <span>Report issues with the website</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('star', 16)}</div>
                    <span>Rate our service quality</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:32px;height:32px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('home', 16)}</div>
                    <span>Suggest facility improvements</span>
                  </div>
                </div>
              </div>
            </div>
            ${isAdmin && allFeedback.length ? `
            <div class="section-header"><h2 class="section-title">${Utils.getIcon('list', 18)} Recent Feedback</h2></div>
            <div style="display:flex;flex-direction:column;gap:0.75rem;">
              ${allFeedback.slice(0, 10).map(f => `
                <div class="card" style="overflow:hidden;">
                  <div style="display:flex;border-left:4px solid var(--primary);">
                    <div style="flex:1;padding:1rem 1.25rem;">
                      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap;">
                        <span class="badge badge-info">${Utils.escapeHtml(f.subject)}</span>
                        <span style="display:flex;color:#f59e0b;">${[1,2,3,4,5].map(s => `<span style="font-size:0.7rem;">${s <= f.rating ? '★' : '☆'}</span>`).join('')}</span>
                        <span style="font-size:0.8rem;color:var(--text-tertiary);margin-left:auto;">${Utils.formatDate(f.date)}</span>
                      </div>
                      <p style="margin:0 0 0.5rem;font-size:0.9rem;line-height:1.5;">${Utils.escapeHtml(f.message)}</p>
                      <p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">— ${Utils.escapeHtml(f.name || 'Anonymous')}${f.email ? ' (' + Utils.escapeHtml(f.email) + ')' : ''}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>` : ''}
          </div>
        </div>`}
      </div>`;
  },

  setRating(star) {
    this.selectedRating = star;
    Router.resolve();
  },

  submit() {
    const subjectEl = document.getElementById('feedback-subject');
    const messageEl = document.getElementById('feedback-message');
    const nameEl = document.getElementById('feedback-name');
    const emailEl = document.getElementById('feedback-email');

    const subject = subjectEl ? subjectEl.value : 'General Feedback';
    const message = messageEl ? messageEl.value.trim() : '';
    const name = nameEl ? nameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';

    if (!message || message.length < 10) {
      Toast.error('Please enter a message (minimum 10 characters).');
      return;
    }

    if (this.selectedRating === 0) {
      Toast.error('Please select a rating.');
      return;
    }

    const feedbackEntry = {
      id: Date.now(),
      subject: subject,
      rating: this.selectedRating,
      message: message,
      name: name || 'Anonymous',
      email: email || '',
      date: new Date().toISOString(),
      userId: AppState.currentUser ? AppState.currentUser.id : null
    };

    AppState.feedback.unshift(feedbackEntry);
    AppState.saveAll();

    this.submitted = true;
    Toast.success('Feedback submitted! Thank you for your input.');
    Router.resolve();
  },

  resetForm() {
    this.selectedRating = 0;
    this.submitted = false;
    Router.resolve();
  },

  afterRender() {}
};
