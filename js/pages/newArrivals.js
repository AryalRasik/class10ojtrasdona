const NewArrivalsPage = {
  render() {
    const books = (AppState.books || []).slice().sort((a, b) => {
      const ya = parseInt(a.year || a.publishYear || 0);
      const yb = parseInt(b.year || b.publishYear || 0);
      return yb - ya;
    });
    const yearGroups = {};
    books.forEach(b => {
      const year = b.year || b.publishYear || 'Unknown';
      if (!yearGroups[year]) yearGroups[year] = [];
      yearGroups[year].push(b);
    });
    const sortedYears = Object.keys(yearGroups).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(b) - parseInt(a);
    });
    const currentYear = new Date().getFullYear();
    const recentYears = sortedYears.filter(y => y === 'Unknown' || parseInt(y) >= currentYear - 2);
    const olderYears = sortedYears.filter(y => y !== 'Unknown' && parseInt(y) < currentYear - 2);
    const olderBooks = olderYears.flatMap(y => yearGroups[y]).slice(0, 8);
    const recentCount = recentYears.reduce((n, y) => n + yearGroups[y].length, 0);
    const thisYearCount = books.filter(b => parseInt(b.year || b.publishYear || 0) === currentYear).length;

    return `
      <style>
        .na-hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 55%, #764ba2 100%); color: #fff; position: relative; overflow: hidden; }
        .na-hero::before, .na-hero::after { content: ""; position: absolute; border-radius: 50%; background: rgba(255,255,255,0.06); }
        .na-hero::before { width: 360px; height: 360px; top: -150px; right: -90px; }
        .na-hero::after { width: 240px; height: 240px; bottom: -130px; left: -70px; }
        .na-hero .na-hero-inner { position: relative; z-index: 1; }
        .na-hero-chip { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22); color: #fff; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.35rem 0.9rem; border-radius: 50px; }
        .na-stat { display: flex; align-items: center; gap: 0.7rem; background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; padding: 0.7rem 1rem; }
        .na-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin: 2.25rem 0 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); }
        .na-head h2 { margin: 0; font-size: 1.15rem; display: flex; align-items: center; gap: 0.6rem; }
        .na-head .na-year-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
        .na-count-pill { display: inline-flex; align-items: center; gap: 6px; background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.75rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 50px; white-space: nowrap; }
      </style>

      <div class="page-header na-hero">
        <div class="container na-hero-inner">
          <span class="na-hero-chip">${Utils.getIcon('trending-up', 14)} Fresh on the Shelves</span>
          <div style="display:flex;align-items:center;gap:1rem;margin-top:1rem;flex-wrap:wrap;">
            <div style="width:58px;height:58px;border-radius:16px;background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.getIcon('book-open', 30)}</div>
            <div>
              <h1 class="page-title" style="color:#fff;margin:0;">New Arrivals</h1>
              <p class="page-description" style="opacity:0.85;margin:0.25rem 0 0;">Discover the latest additions to our library collection</p>
            </div>
          </div>
          <div style="display:flex;gap:0.75rem;margin-top:1.5rem;flex-wrap:wrap;">
            <div class="na-stat">
              <span style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;color:#c7d2fe;">${Utils.getIcon('layers', 18)}</span>
              <div>
                <div style="font-size:1.25rem;font-weight:800;line-height:1;">${recentCount}</div>
                <div style="font-size:0.72rem;opacity:0.85;">Recent Additions</div>
              </div>
            </div>
            <div class="na-stat">
              <span style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;color:#a5b4fc;">${Utils.getIcon('calendar', 18)}</span>
              <div>
                <div style="font-size:1.25rem;font-weight:800;line-height:1;">${thisYearCount}</div>
                <div style="font-size:0.72rem;opacity:0.85;">Added in ${currentYear}</div>
              </div>
            </div>
            <div class="na-stat">
              <span style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;color:#ddd6fe;">${Utils.getIcon('clock', 18)}</span>
              <div>
                <div style="font-size:1.25rem;font-weight:800;line-height:1;">${olderBooks.length}</div>
                <div style="font-size:0.72rem;opacity:0.85;">Older Additions</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="container" style="padding:0 1rem 2rem;">
        ${recentYears.map((year, idx) => `
          <div class="na-head">
            <h2 class="section-title"><span class="na-year-dot" style="background:${idx === 0 ? 'var(--primary)' : 'var(--success)'};"></span>${year === 'Unknown' ? 'Undated' : year}${parseInt(year) >= currentYear ? '<span class="badge badge-success" style="margin-left:0.4rem;">New</span>' : ''}</h2>
            <span class="na-count-pill">${Utils.getIcon('book-open', 12)} ${yearGroups[year].length} ${yearGroups[year].length === 1 ? 'book' : 'books'}</span>
          </div>
          <div class="grid-4">
            ${yearGroups[year].map(book => HomePage.bookCard(book)).join('')}
          </div>`).join('')}
        ${olderYears.length ? `
          <div class="na-head">
            <h2 class="section-title"><span class="na-year-dot" style="background:var(--text-tertiary);"></span>Older Additions</h2>
            <span class="na-count-pill">${Utils.getIcon('clock', 12)} First 8 shown</span>
          </div>
          <div class="grid-4">
            ${olderBooks.map(book => HomePage.bookCard(book)).join('')}
          </div>` : ''}
        ${books.length === 0 ? `
          <div class="empty-state">
            ${Utils.getIcon('book-open', 48)}
            <h3>No New Arrivals Yet</h3>
            <p>New books will appear here as soon as they are added to the library collection.</p>
            <a href="#/books" class="btn btn-primary" data-nav>${Utils.getIcon('search', 14)} Browse Library</a>
          </div>` : ''}
      </div>`;
  },
  afterRender() {}
};