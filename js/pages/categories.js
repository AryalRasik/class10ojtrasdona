const CategoriesPage = {
  render() {
    const categories = AppState.categories || [];
    const icons = ['book-open', 'flask', 'globe', 'palette', 'code', 'landmark', 'book', 'music', 'calculator', 'heart', 'feather', 'cpu'];
    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('grid', 28)} Categories</h1>
          <p class="page-description">Browse books by category</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;">
        <div class="grid-4">
          ${categories.map((cat, i) => {
            const name = typeof cat === 'string' ? cat : cat.name || cat.title || '';
            const count = typeof cat === 'object' ? (cat.count || cat.bookCount || 0) : 0;
            const icon = typeof cat === 'object' && cat.icon ? cat.icon : icons[i % icons.length];
            return `
              <div class="card" style="cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;overflow:hidden;" onclick="CategoriesPage.selectCategory('${Utils.escapeHtml(name)}')" onmouseenter="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)'" onmouseleave="this.style.transform='';this.style.boxShadow=''">
                <div style="height:120px;background:linear-gradient(135deg,var(--primary-light),var(--bg-tertiary));display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:2.5rem;color:var(--primary);">${Utils.getIcon(icon, 40)}</span>
                </div>
                <div class="card-body" style="text-align:center;">
                  <h3 style="margin:0 0 0.25rem;">${Utils.escapeHtml(name)}</h3>
                  <p style="margin:0;color:var(--text-secondary);font-size:0.85rem;">${count ? count + ' books' : 'Browse'}</p>
                </div>
              </div>`;
          }).join('') || '<div class="empty-state" style="grid-column:1/-1;">No categories available.</div>'}
        </div>
      </div>`;
  },
  selectCategory(name) {
    window.location.hash = '#/books?category=' + encodeURIComponent(name);
  },
  afterRender() {}
};