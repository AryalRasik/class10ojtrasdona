const CalendarPage = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedDate: null,

  defaultEvents: [
    { title: 'Dashain Holiday', start: '2026-10-10', end: '2026-10-23', color: '#ef4444', type: 'holiday' },
    { title: 'Tihar Holiday', start: '2026-11-05', end: '2026-11-09', color: '#f59e0b', type: 'holiday' },
    { title: 'Winter Vacation', start: '2026-12-24', end: '2027-01-04', color: '#3b82f6', type: 'vacation' },
    { title: 'Summer Vacation', start: '2026-06-01', end: '2026-07-14', color: '#10b981', type: 'vacation' },
    { title: 'Mid-term Exam Period', start: '2026-09-15', end: '2026-09-25', color: '#8b5cf6', type: 'exam' },
    { title: 'Pre-board Exam', start: '2026-11-15', end: '2026-11-30', color: '#8b5cf6', type: 'exam' },
    { title: 'SEE Exam Preparation', start: '2026-12-01', end: '2026-12-15', color: '#8b5cf6', type: 'exam' },
    { title: 'Library Week', start: '2026-09-07', end: '2026-09-13', color: '#06b6d4', type: 'library' },
    { title: 'Annual Book Fair', start: '2026-07-21', end: '2026-07-21', color: '#ec4899', type: 'event' },
    { title: 'Creative Writing Workshop', start: '2026-07-25', end: '2026-07-25', color: '#ec4899', type: 'event' },
    { title: 'SEE Preparation Seminar', start: '2026-08-01', end: '2026-08-01', color: '#ec4899', type: 'event' },
    { title: 'Reading Competition', start: '2026-08-05', end: '2026-08-05', color: '#ec4899', type: 'event' },
    { title: 'Teacher\'s Day', start: '2026-10-05', end: '2026-10-05', color: '#f59e0b', type: 'holiday' },
    { title: 'Democracy Day', start: '2026-09-19', end: '2026-09-19', color: '#f59e0b', type: 'holiday' },
    { title: 'Constitution Day', start: '2026-09-20', end: '2026-09-20', color: '#f59e0b', type: 'holiday' }
  ],

  render() {
    const allEvents = this.getAllEvents();
    const todayEvents = this.getEventsForDate(new Date().toISOString().split('T')[0]);
    const upcoming = this.getUpcomingEvents();
    const days = this.getCalendarDays();

    const monthName = new Date(this.currentYear, this.currentMonth).toLocaleString('en-US', { month: 'long' });

    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('calendar', 28)} Library Calendar</h1>
          <p class="page-description">View events, holidays, and library schedule</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="display:grid;grid-template-columns:1fr 340px;gap:1.5rem;align-items:start;">
          <div>
            <div class="card" style="overflow:hidden;">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--border);">
                <button class="btn btn-ghost btn-sm" onclick="CalendarPage.prevMonth()">${Utils.getIcon('chevron-left', 18)}</button>
                <h3 style="margin:0;font-size:1.1rem;font-weight:700;">${monthName} ${this.currentYear}</h3>
                <button class="btn btn-ghost btn-sm" onclick="CalendarPage.nextMonth()">${Utils.getIcon('chevron-right', 18)}</button>
              </div>
              <div style="padding:1rem;">
                <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:0.5rem;">
                  ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `
                    <div style="font-size:0.75rem;font-weight:600;color:var(--text-tertiary);padding:0.5rem 0;text-transform:uppercase;">${d}</div>
                  `).join('')}
                </div>
                <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
                  ${days.map(day => {
                    if (!day) return '<div></div>';
                    const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const today = new Date().toISOString().split('T')[0];
                    const isToday = dateStr === today;
                    const isSelected = dateStr === this.selectedDate;
                    const events = this.getEventsForDate(dateStr);
                    const hasEvents = events.length > 0;
                    const dayOfWeek = new Date(this.currentYear, this.currentMonth, day).getDay();
                    const isSunday = dayOfWeek === 0;

                    return `
                      <button class="btn btn-ghost" style="position:relative;padding:0.5rem 0.25rem;border-radius:var(--radius-sm);min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;${isToday ? 'background:var(--primary);color:#fff;' : isSelected ? 'background:var(--primary-light);color:var(--primary);' : isSunday ? 'color:var(--danger);' : ''}" onclick="CalendarPage.selectDate('${dateStr}')">
                        <span style="font-size:0.85rem;font-weight:${isToday || isSelected ? '700' : '500'};">${day}</span>
                        ${hasEvents ? `<div style="display:flex;gap:2px;">${events.slice(0, 3).map(e => `<span style="width:4px;height:4px;border-radius:50%;background:${e.color};display:block;"></span>`).join('')}</div>` : ''}
                      </button>`;
                  }).join('')}
                </div>
              </div>
            </div>

            ${this.selectedDate ? `
            <div class="card" style="margin-top:1rem;">
              <div style="padding:1.25rem;">
                <h4 style="margin:0 0 0.75rem;font-weight:700;">${Utils.getIcon('calendar', 16)} Events on ${new Date(this.selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                ${this.getEventsForDate(this.selectedDate).length ? this.getEventsForDate(this.selectedDate).map(e => `
                  <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border);">
                    <span style="width:10px;height:10px;border-radius:50%;background:${e.color};flex-shrink:0;"></span>
                    <div style="flex:1;">
                      <p style="margin:0;font-weight:600;font-size:0.9rem;">${Utils.escapeHtml(e.title)}</p>
                      <p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">${e.start !== e.end ? Utils.formatDate(e.start) + ' - ' + Utils.formatDate(e.end) : Utils.formatDate(e.start)}</p>
                    </div>
                    <span class="badge badge-${e.type === 'holiday' ? 'danger' : e.type === 'vacation' ? 'info' : e.type === 'exam' ? 'warning' : e.type === 'library' ? 'success' : 'primary'}" style="font-size:0.65rem;">${e.type}</span>
                  </div>
                `).join('') : '<p style="color:var(--text-secondary);font-size:0.9rem;margin:0;">No events on this date.</p>'}
              </div>
            </div>` : ''}

            <div class="section-header" style="margin-top:1.5rem;"><h2 class="section-title">${Utils.getIcon('palmtree', 18)} Holiday Schedule</h2></div>
            <div class="grid-2" style="gap:0.75rem;">
              ${this.defaultEvents.filter(e => e.type === 'holiday' || e.type === 'vacation').map(e => `
                <div class="card" style="overflow:hidden;">
                  <div style="display:flex;border-left:4px solid ${e.color};">
                    <div style="flex:1;padding:1rem 1.25rem;">
                      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">
                        <span class="badge badge-${e.type === 'holiday' ? 'danger' : 'info'}" style="font-size:0.65rem;">${e.type}</span>
                      </div>
                      <h4 style="margin:0 0 0.25rem;font-size:0.95rem;">${Utils.escapeHtml(e.title)}</h4>
                      <p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">${Utils.formatDate(e.start)}${e.start !== e.end ? ' - ' + Utils.formatDate(e.end) : ''}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div>
            <div class="card" style="margin-bottom:1rem;">
              <div style="padding:1.25rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                  <h4 style="margin:0;font-weight:700;">${Utils.getIcon('sun', 16)} Today's Events</h4>
                  <button class="btn btn-ghost btn-sm" onclick="CalendarPage.goToToday()">Today</button>
                </div>
                ${todayEvents.length ? todayEvents.map(e => `
                  <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border);">
                    <span style="width:8px;height:8px;border-radius:50%;background:${e.color};flex-shrink:0;"></span>
                    <div>
                      <p style="margin:0;font-weight:600;font-size:0.9rem;">${Utils.escapeHtml(e.title)}</p>
                      <p style="margin:0;font-size:0.8rem;color:var(--text-secondary);">${e.type}</p>
                    </div>
                  </div>
                `).join('') : '<p style="color:var(--text-secondary);font-size:0.85rem;margin:0;">No events today.</p>'}
              </div>
            </div>

            <div class="card" style="margin-bottom:1rem;">
              <div style="padding:1.25rem;">
                <h4 style="margin:0 0 0.75rem;font-weight:700;">${Utils.getIcon('clock', 16)} Upcoming Events</h4>
                ${upcoming.length ? upcoming.map(e => `
                  <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--border);">
                    <span style="width:8px;height:8px;border-radius:50%;background:${e.color};flex-shrink:0;"></span>
                    <div style="flex:1;">
                      <p style="margin:0;font-weight:600;font-size:0.85rem;">${Utils.escapeHtml(e.title)}</p>
                      <p style="margin:0;font-size:0.75rem;color:var(--text-secondary);">${Utils.formatDate(e.start)}</p>
                    </div>
                  </div>
                `).join('') : '<p style="color:var(--text-secondary);font-size:0.85rem;margin:0;">No upcoming events.</p>'}
              </div>
            </div>

            <div class="card">
              <div style="padding:1.25rem;">
                <h4 style="margin:0 0 0.75rem;font-weight:700;">${Utils.getIcon('tag', 16)} Legend</h4>
                <div style="display:flex;flex-direction:column;gap:0.5rem;">
                  <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;"><span style="width:10px;height:10px;border-radius:50%;background:#ef4444;"></span> Holiday</div>
                  <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;"><span style="width:10px;height:10px;border-radius:50%;background:#3b82f6;"></span> Vacation</div>
                  <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;"><span style="width:10px;height:10px;border-radius:50%;background:#8b5cf6;"></span> Exam Period</div>
                  <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;"><span style="width:10px;height:10px;border-radius:50%;background:#06b6d4;"></span> Library Event</div>
                  <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;"><span style="width:10px;height:10px;border-radius:50%;background:#ec4899;"></span> Activity</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  getAllEvents() {
    const appEvents = (AppState.events || []).map(e => ({
      title: e.title,
      start: (e.date || e.startDate || '').split('T')[0],
      end: (e.endDate || e.date || e.startDate || '').split('T')[0],
      color: '#ec4899',
      type: 'event'
    }));
    return [...this.defaultEvents, ...appEvents].filter(e => e.start);
  },

  getEventsForDate(dateStr) {
    return this.getAllEvents().filter(e => dateStr >= e.start && dateStr <= e.end);
  },

  getUpcomingEvents() {
    const today = new Date().toISOString().split('T')[0];
    return this.getAllEvents()
      .filter(e => e.end >= today)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 6);
  },

  getCalendarDays() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  },

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.selectedDate = null;
    Router.resolve();
  },

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.selectedDate = null;
    Router.resolve();
  },

  selectDate(dateStr) {
    this.selectedDate = this.selectedDate === dateStr ? null : dateStr;
    Router.resolve();
  },

  goToToday() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.selectedDate = now.toISOString().split('T')[0];
    Router.resolve();
  },

  afterRender() {}
};
