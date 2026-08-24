const TopRatedPage = {
  render() {
    const books = (AppState.books || []).slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const medals = ['🥇', '🥈', '🥉'];
    return `
      <div class="page-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;">
        <div class="container">
          <h1 class="page-title" style="color:#fff;">${Utils.getIcon('star', 28)} Top Rated Books</h1>
          <p class="page-description" style="opacity:0.9;">Our highest rated books based on user reviews</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div style="display:flex;flex-direction:column;gap:1rem;margin-top:1rem;">
          ${books.map((book, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            return `
              <div class="card" style="overflow:hidden;${isTop3 ? 'border:2px solid var(--warning);' : ''}">
                <div style="display:flex;align-items:center;gap:1.25rem;padding:1.25rem 1.5rem;">
                  <div style="width:48px;text-align:center;flex-shrink:0;">
                    ${isTop3 ? `<span style="font-size:2rem;">${medals[rank - 1]}</span>` : `<span style="width:40px;height:40px;border-radius:50%;background:var(--bg-tertiary);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;color:var(--text-secondary);">${rank}</span>`}
                  </div>
                  <div style="width:60px;height:84px;flex-shrink:0;">
                    <a href="#/book/${book.id}" data-nav>${Utils.getBookCover(book)}</a>
                  </div>
                  <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                      <h3 style="margin:0;font-size:1.05rem;"><a href="#/book/${book.id}" data-nav style="color:inherit;text-decoration:none;">${Utils.escapeHtml(book.title)}</a></h3>
                      ${isTop3 ? `<span class="badge badge-warning">Top ${rank}</span>` : ''}
                    </div>
                    <p style="margin:0.15rem 0 0.5rem;color:var(--text-secondary);font-size:0.9rem;">${Utils.escapeHtml(book.author)}</p>
                    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                      ${Utils.generateStars(book.rating)}
                      <span style="font-weight:700;color:var(--warning);">${(book.rating || 0).toFixed(1)}</span>
                      <span style="font-size:0.8rem;color:var(--text-secondary);">(${book.reviews || book.reviewCount || 0} reviews)</span>
                      <span class="badge badge-info">${Utils.escapeHtml(book.category || '')}</span>
                    </div>
                  </div>
                  <a href="#/book/${book.id}" data-nav class="btn btn-outline btn-sm" style="flex-shrink:0;">View</a>
                </div>
              </div>`;
          }).join('') || '<div class="empty-state">No rated books available.</div>'}
        </div>
      </div>`;
  },
  afterRender() {}
};