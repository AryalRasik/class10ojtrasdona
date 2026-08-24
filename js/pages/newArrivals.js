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
    return `
      <div class="page-header" style="background:linear-gradient(135deg,var(--success),#059669);color:#fff;">
        <div class="container">
          <h1 class="page-title" style="color:#fff;">${Utils.getIcon('sparkles', 28)} New Arrivals</h1>
          <p class="page-description" style="opacity:0.9;">Discover the latest additions to our library collection</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        ${recentYears.map(year => `
          <div class="section-header" style="margin-top:2rem;"><h2 class="section-title">${year === 'Unknown' ? 'Undated' : year} ${parseInt(year) >= currentYear ? '<span class="badge badge-success" style="margin-left:0.5rem;">New</span>' : ''}</h2></div>
          <div class="grid-4">
            ${yearGroups[year].map(book => HomePage.bookCard ? HomePage.bookCard(book) : `
              <div class="card" style="overflow:hidden;">
                <a href="#/book/${book.id}" data-nav>${Utils.getBookCover(book)}</a>
                <div class="card-body">
                  <h4 style="margin:0 0 0.25rem;"><a href="#/book/${book.id}" data-nav style="color:inherit;text-decoration:none;">${Utils.escapeHtml(book.title)}</a></h4>
                  <p style="margin:0 0 0.5rem;color:var(--text-secondary);font-size:0.85rem;">${Utils.escapeHtml(book.author)}</p>
                  <div style="display:flex;justify-content:space-between;align-items:center;">${Utils.generateStars(book.rating)}<span class="badge badge-info">${Utils.escapeHtml(book.category || '')}</span></div>
                </div>
              </div>`).join('')}
          </div>`).join('')}
        ${olderYears.length ? `
          <div class="section-header" style="margin-top:2rem;"><h2 class="section-title">Older Additions</h2></div>
          <div class="grid-4">
            ${olderYears.flatMap(y => yearGroups[y]).slice(0, 8).map(book => HomePage.bookCard ? HomePage.bookCard(book) : `
              <div class="card" style="overflow:hidden;">
                <a href="#/book/${book.id}" data-nav>${Utils.getBookCover(book)}</a>
                <div class="card-body">
                  <h4 style="margin:0 0 0.25rem;"><a href="#/book/${book.id}" data-nav style="color:inherit;text-decoration:none;">${Utils.escapeHtml(book.title)}</a></h4>
                  <p style="margin:0 0 0.5rem;color:var(--text-secondary);font-size:0.85rem;">${Utils.escapeHtml(book.author)}</p>
                </div>
              </div>`).join('')}
          </div>` : ''}
        ${books.length === 0 ? '<div class="empty-state">No new arrivals to display.</div>' : ''}
      </div>`;
  },
  afterRender() {}
};