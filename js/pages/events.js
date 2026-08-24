const EventsPage = {
  intervals: [],
  filter: 'all',
  render() {
    const events = AppState.events || [];
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.date || e.startDate) >= now).sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate));
    const past = events.filter(e => new Date(e.date || e.startDate) < now).sort((a, b) => new Date(b.date || b.startDate) - new Date(a.date || a.startDate));
    const nextEvent = upcoming[0];

    const eventTypes = [...new Set(events.map(e => e.type || e.category).filter(Boolean))];
    let filteredUpcoming = upcoming;
    let filteredPast = past;
    if (this.filter !== 'all') {
      filteredUpcoming = upcoming.filter(e => (e.type || e.category) === this.filter);
      filteredPast = past.filter(e => (e.type || e.category) === this.filter);
    }

    const typeColors = {
      'Workshop': 'var(--primary)',
      'Reading Session': 'var(--success)',
      'Book Fair': 'var(--warning)',
      'Guest Speaker': 'var(--info)',
      'Story Time': 'var(--danger)',
      'default': 'var(--text-tertiary)'
    };

    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('calendar', 28)} Events</h1>
          <p class="page-description">Library events, workshops, and activities</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        ${nextEvent ? `
        <div class="card" style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;margin-bottom:2rem;padding:2rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
            <div>
              <span style="opacity:0.8;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;">Next Event</span>
              <h2 style="margin:0.25rem 0 0;color:#fff;">${Utils.escapeHtml(nextEvent.title)}</h2>
              <p style="margin:0.5rem 0 0;opacity:0.85;">${Utils.formatDate(nextEvent.date || nextEvent.startDate)} ${nextEvent.time ? '&bull; ' + Utils.escapeHtml(nextEvent.time) : ''}</p>
              ${nextEvent.location ? `<p style="margin:0.25rem 0 0;opacity:0.85;">${Utils.getIcon('map-pin', 14)} ${Utils.escapeHtml(nextEvent.location)}</p>` : ''}
              ${nextEvent.type || nextEvent.category ? `<span style="display:inline-block;margin-top:0.5rem;background:rgba(255,255,255,0.2);padding:0.25rem 0.75rem;border-radius:20px;font-size:0.8rem;">${Utils.escapeHtml(nextEvent.type || nextEvent.category)}</span>` : ''}
            </div>
            <div style="text-align:center;">
              <p style="margin:0 0 0.5rem;font-size:0.85rem;opacity:0.8;">Countdown</p>
              <div id="event-countdown" style="display:flex;gap:0.75rem;"></div>
            </div>
          </div>
        </div>` : ''}

        <div class="tabs" style="margin-bottom:1.5rem;">
          <button class="tab-btn ${this.filter === 'all' ? 'active' : ''}" onclick="EventsPage.setFilter('all')">All Events</button>
          ${eventTypes.map(t => `
            <button class="tab-btn ${this.filter === t ? 'active' : ''}" onclick="EventsPage.setFilter('${t}')">${Utils.escapeHtml(t)}</button>
          `).join('')}
        </div>

        ${filteredUpcoming.length ? `
        <div class="section-header"><h2 class="section-title">${Utils.getIcon('zap', 18)} Upcoming Events</h2></div>
        <div class="grid-3" style="margin-bottom:2rem;">
          ${filteredUpcoming.map(e => {
            const typeColor = typeColors[e.type || e.category] || typeColors.default;
            return `
            <div class="card" style="overflow:hidden;">
              <div style="position:relative;height:140px;background:linear-gradient(135deg,${typeColor}22,${typeColor}11);display:flex;align-items:center;justify-content:center;">
                <span style="font-size:3rem;color:${typeColor};">${Utils.getIcon(e.icon || 'calendar', 48)}</span>
                <div style="position:absolute;top:0.75rem;left:0.75rem;background:${typeColor};color:#fff;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:600;">${new Date(e.date || e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                ${e.type || e.category ? `<span style="position:absolute;top:0.75rem;right:0.75rem;background:rgba(255,255,255,0.9);color:${typeColor};padding:0.2rem 0.6rem;border-radius:12px;font-size:0.7rem;font-weight:600;">${Utils.escapeHtml(e.type || e.category)}</span>` : ''}
              </div>
              <div class="card-body">
                <h3 style="margin:0 0 0.5rem;font-size:1rem;">${Utils.escapeHtml(e.title)}</h3>
                <p style="margin:0 0 0.5rem;color:var(--text-secondary);font-size:0.85rem;">${Utils.escapeHtml(e.description || '')}</p>
                <div style="display:flex;flex-direction:column;gap:0.35rem;margin-bottom:0.75rem;">
                  <div style="display:flex;align-items:center;gap:0.4rem;">
                    ${Utils.getIcon('calendar', 12)}
                    <span style="font-size:0.8rem;color:var(--text-secondary);">${Utils.formatDate(e.date || e.startDate)}</span>
                  </div>
                  ${e.time ? `<div style="display:flex;align-items:center;gap:0.4rem;">
                    ${Utils.getIcon('clock', 12)}
                    <span style="font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(e.time)}</span>
                  </div>` : ''}
                  ${e.location ? `<div style="display:flex;align-items:center;gap:0.4rem;">
                    ${Utils.getIcon('map-pin', 12)}
                    <span style="font-size:0.8rem;color:var(--text-secondary);">${Utils.escapeHtml(e.location)}</span>
                  </div>` : ''}
                </div>
                <button class="btn btn-primary btn-sm" style="width:100%;" onclick="EventsPage.register(${e.id || `'${e.id}'`})">Register</button>
              </div>
            </div>`;
          }).join('')}
        </div>` : `<div class="empty-state" style="padding:40px 0;"><h3>No Upcoming Events</h3><p>Check back later for new events.</p></div>`}

        ${filteredPast.length ? `
        <div class="section-header"><h2 class="section-title">${Utils.getIcon('clock', 18)} Past Events</h2></div>
        <div class="grid-3">
          ${filteredPast.map(e => `
            <div class="card" style="overflow:hidden;opacity:0.7;">
              <div style="height:100px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;">
                <span style="font-size:2rem;">${Utils.getIcon(e.icon || 'calendar', 32)}</span>
              </div>
              <div class="card-body">
                <h3 style="margin:0 0 0.25rem;font-size:0.95rem;">${Utils.escapeHtml(e.title)}</h3>
                <p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">${Utils.formatDate(e.date || e.startDate)}</p>
                ${e.type || e.category ? `<span class="badge badge-ghost" style="margin-top:0.5rem;">${Utils.escapeHtml(e.type || e.category)}</span>` : ''}
              </div>
            </div>`).join('')}
        </div>` : ''}
      </div>`;
  },
  setFilter(f) {
    this.filter = f;
    const container = document.getElementById('pageContent');
    if (container) {
      container.innerHTML = this.render();
      Router.bindLinks();
      Router.highlightNav();
    }
    this.afterRender();
  },
  afterRender() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    const events = (AppState.events || []).filter(e => new Date(e.date || e.startDate) >= new Date()).sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate));
    if (events.length) {
      const target = new Date(events[0].date || events[0].startDate);
      const updateCountdown = () => {
        const now = new Date();
        const diff = target - now;
        if (diff <= 0) return;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const el = document.getElementById('event-countdown');
        if (el) {
          el.innerHTML = `<div style="text-align:center;"><div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:0.5rem 0.75rem;min-width:50px;"><div style="font-size:1.5rem;font-weight:700;">${d}</div></div><small style="font-size:0.7rem;">Days</small></div>
            <div style="text-align:center;"><div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:0.5rem 0.75rem;min-width:50px;"><div style="font-size:1.5rem;font-weight:700;">${h}</div></div><small style="font-size:0.7rem;">Hours</small></div>
            <div style="text-align:center;"><div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:0.5rem 0.75rem;min-width:50px;"><div style="font-size:1.5rem;font-weight:700;">${m}</div></div><small style="font-size:0.7rem;">Min</small></div>
            <div style="text-align:center;"><div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:0.5rem 0.75rem;min-width:50px;"><div style="font-size:1.5rem;font-weight:700;">${s}</div></div><small style="font-size:0.7rem;">Sec</small></div>`;
        }
      };
      updateCountdown();
      this.intervals.push(setInterval(updateCountdown, 1000));
    }
  },
  register(eventId) {
    const event = (AppState.events || []).find(e => e.id === eventId);
    if (!event) { Toast.error('Event not found.'); return; }
    const userId = AppState.currentUser ? AppState.currentUser.id : null;
    if (!userId) { Toast.warning('Please log in to register for events.'); return; }
    if (!AppState.eventRegistrations) AppState.eventRegistrations = [];
    const alreadyRegistered = AppState.eventRegistrations.find(r => r.eventId === eventId && r.userId === userId);
    if (alreadyRegistered) { Toast.info('You are already registered for this event.'); return; }
    AppState.eventRegistrations.push({
      eventId: eventId,
      userId: userId,
      userName: AppState.currentUser.name,
      registeredAt: new Date().toISOString()
    });
    AppState.saveAll();
    Toast.success('Successfully registered for "' + event.title + '"!');
    if (AppState.addNotification) {
      AppState.addNotification({ type: 'event_registration', title: 'Event Registration', message: 'You have been registered for "' + event.title + '".', icon: 'calendar' });
    }
  },
  destroy() {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
};
