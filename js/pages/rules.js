const RulesPage = {
  expandedItems: new Set(),
  render() {
    const rules = LIBRARY_DATA.rules || [];
    return `
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">${Utils.getIcon('shield', 28)} Library Rules</h1>
          <p class="page-description">Please follow these rules to maintain a pleasant reading environment</p>
        </div>
      </div>
      <div class="container" style="padding:0 1rem 2rem;max-width:800px;margin:0 auto;">
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          ${rules.map((rule, i) => {
            const title = typeof rule === 'string' ? `Rule ${i + 1}` : rule.title || rule.name || `Rule ${i + 1}`;
            const desc = typeof rule === 'string' ? rule : rule.description || rule.content || rule.text || '';
            const expanded = this.expandedItems.has(i);
            return `
              <div class="card" style="overflow:hidden;">
                <button class="btn btn-ghost" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;text-align:left;border:none;font-size:1rem;font-weight:600;color:var(--text-primary);" onclick="RulesPage.toggle(${i})">
                  <span style="display:flex;align-items:center;gap:0.75rem;">
                    <span style="width:28px;height:28px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;">${i + 1}</span>
                    ${Utils.escapeHtml(title)}
                  </span>
                  <span style="transition:transform 0.2s;transform:rotate(${expanded ? '180' : '0'}deg);">${Utils.getIcon('chevron-down', 18)}</span>
                </button>
                <div style="max-height:${expanded ? '500px' : '0'};overflow:hidden;transition:max-height 0.3s ease;">
                  <div style="padding:0 1.5rem 1.5rem;color:var(--text-secondary);line-height:1.7;">
                    ${Utils.escapeHtml(desc)}
                  </div>
                </div>
              </div>`;
          }).join('') || '<div class="empty-state">No rules defined.</div>'}
        </div>
      </div>`;
  },
  toggle(index) {
    if (this.expandedItems.has(index)) {
      this.expandedItems.delete(index);
    } else {
      this.expandedItems.add(index);
    }
    Router.resolve();
  },
  afterRender() {}
};