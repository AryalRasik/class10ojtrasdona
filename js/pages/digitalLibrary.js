const DigitalLibraryPage = {
  activeTab: 'all',
  searchQuery: '',
  playing: false,
  currentTrack: null,
  render() {
    const all = AppState.digitalBooks || [];
    let filtered = this.activeTab === 'all' ? all : all.filter(d => d.type === this.activeTab);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || (d.author || d.creator || '').toLowerCase().includes(q));
    }

    const featured = all.filter(d => d.featured);
    const ebooks = all.filter(d => d.type === 'pdf');
    const audiobooks = all.filter(d => d.type === 'audio');
    const videos = all.filter(d => d.type === 'video');

    return `
      <div class="page-header" style="background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;">
        <div class="container">
          <h1 class="page-title" style="color:#fff;">${Utils.getIcon('monitor',28)} Digital Library</h1>
          <p class="page-description" style="opacity:0.9;">Access e-books, audiobooks, videos, and study materials</p>
          <div style="display:flex;gap:2rem;margin-top:1rem;flex-wrap:wrap;">
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${ebooks.length}</div><div style="font-size:0.8rem;opacity:0.8;">E-Books</div></div>
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${audiobooks.length}</div><div style="font-size:0.8rem;opacity:0.8;">Audiobooks</div></div>
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;">${videos.length}</div><div style="font-size:0.8rem;opacity:0.8;">Videos</div></div>
          </div>
        </div>
      </div>
      <div class="container" style="padding:2rem 1rem;">

        ${featured.length ? `
        <div class="section-header"><h2 class="section-title">${Utils.getIcon('star', 18)} Featured</h2></div>
        <div style="display:flex;gap:1rem;overflow-x:auto;padding-bottom:1rem;margin-bottom:2rem;">
          ${featured.map(item => {
            const typeIcon = item.type === 'pdf' ? 'file-text' : item.type === 'audio' ? 'headphones' : 'play-circle';
            const typeColor = item.type === 'pdf' ? 'var(--danger)' : item.type === 'audio' ? 'var(--primary)' : 'var(--success)';
            return `
            <div class="card" style="min-width:280px;overflow:hidden;flex-shrink:0;">
              <div style="height:140px;background:linear-gradient(135deg,${typeColor}33,${typeColor}11);display:flex;align-items:center;justify-content:center;position:relative;">
                <span style="font-size:3rem;color:${typeColor};">${Utils.getIcon(typeIcon, 48)}</span>
                <span class="badge" style="position:absolute;top:0.75rem;right:0.75rem;background:${typeColor};color:#fff;">${item.type.toUpperCase()}</span>
                <span class="badge" style="position:absolute;top:0.75rem;left:0.75rem;background:var(--warning);color:#fff;">Featured</span>
              </div>
              <div class="card-body">
                <h4 style="margin:0 0 0.25rem;font-size:0.95rem;">${Utils.escapeHtml(item.title)}</h4>
                <p style="margin:0 0 0.5rem;color:var(--text-secondary);font-size:0.8rem;">${Utils.escapeHtml(item.author || item.creator || '')}</p>
                <div style="display:flex;gap:0.5rem;">
                  ${item.type === 'audio' ? `<button class="btn btn-primary btn-sm" onclick="DigitalLibraryPage.playAudio('${Utils.escapeHtml(item.title)}','${Utils.escapeHtml(item.author||'')}',${item.id})">${Utils.getIcon('play',14)} Play</button>` : ''}
                  ${item.type === 'pdf' ? `<button class="btn btn-primary btn-sm" onclick="DigitalLibraryPage.openPDF(${item.id})">${Utils.getIcon('book-open',14)} Read</button>` : ''}
                  ${item.type === 'video' ? `<button class="btn btn-primary btn-sm" onclick="DigitalLibraryPage.playVideo('${Utils.escapeHtml(item.title)}')">${Utils.getIcon('play',14)} Watch</button>` : ''}
                  ${item.pdfUrl ? `<a class="btn btn-outline btn-sm" href="${Utils.escapeHtml(item.pdfUrl)}" download>${Utils.getIcon('download',14)}</a>` : ''}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>` : ''}

        <div class="tabs" style="margin-bottom:1.5rem;">
          <button class="tab-btn ${this.activeTab==='all'?'active':''}" data-tab="all">All (${all.length})</button>
          <button class="tab-btn ${this.activeTab==='pdf'?'active':''}" data-tab="pdf">${Utils.getIcon('file-text',16)} E-Books (${ebooks.length})</button>
          <button class="tab-btn ${this.activeTab==='audio'?'active':''}" data-tab="audio">${Utils.getIcon('headphones',16)} Audiobooks (${audiobooks.length})</button>
          <button class="tab-btn ${this.activeTab==='video'?'active':''}" data-tab="video">${Utils.getIcon('play-circle',16)} Videos (${videos.length})</button>
        </div>

        <div style="margin-bottom:1.5rem;">
          <div class="books-search" style="max-width:400px;">
            ${Utils.getIcon('search', 18)}
            <input type="text" id="digitalSearch" placeholder="Search by title or author..." value="${this.searchQuery}">
          </div>
        </div>

        <div id="digital-content">${this.renderContent(filtered)}</div>
      </div>
      <div id="audio-player" style="display:none;position:fixed;bottom:0;left:0;right:0;background:var(--bg-primary);border-top:1px solid var(--border);padding:0.75rem 1.5rem;z-index:100;box-shadow:0 -4px 20px rgba(0,0,0,0.1);">
        <div style="display:flex;align-items:center;gap:1rem;max-width:1200px;margin:0 auto;">
          <div style="flex:1;"><p id="player-title" style="margin:0;font-weight:600;font-size:0.9rem;"></p><p id="player-artist" style="margin:0;color:var(--text-secondary);font-size:0.8rem;"></p></div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <button class="btn btn-ghost btn-sm" onclick="DigitalLibraryPage.prevTrack()">${Utils.getIcon('skip-back',18)}</button>
            <button class="btn btn-primary btn-sm" onclick="DigitalLibraryPage.togglePlay()" id="play-btn">${Utils.getIcon('play',18)}</button>
            <button class="btn btn-ghost btn-sm" onclick="DigitalLibraryPage.nextTrack()">${Utils.getIcon('skip-forward',18)}</button>
          </div>
          <div style="flex:2;"><div style="height:4px;background:var(--bg-tertiary);border-radius:2px;cursor:pointer;" onclick="DigitalLibraryPage.seek(event)"><div id="player-progress" style="height:100%;width:0%;background:var(--primary);border-radius:2px;transition:width 0.3s;"></div></div></div>
          <button class="btn btn-ghost btn-sm" onclick="DigitalLibraryPage.closePlayer()">${Utils.getIcon('x',16)}</button>
        </div>
      </div>`;
  },
  renderContent(items) {
    if (!items.length) {
      return `<div class="empty-state">${Utils.getIcon('monitor',48)}<h3>No Digital Content</h3><p>No ${this.activeTab === 'all' ? '' : this.activeTab + ' '}content available${this.searchQuery ? ' for this search' : ''}.</p></div>`;
    }
    return `<div class="grid-3">${items.map(item => {
      const typeIcon = item.type === 'pdf' ? 'file-text' : item.type === 'audio' ? 'headphones' : 'play-circle';
      const typeColor = item.type === 'pdf' ? 'var(--danger)' : item.type === 'audio' ? 'var(--primary)' : 'var(--success)';
      const progress = item.progress || 0;
      const downloads = item.downloads || Math.floor(Math.random() * 500) + 10;
      return `
        <div class="card" style="overflow:hidden;">
          <div style="position:relative;height:160px;background:linear-gradient(135deg,${typeColor}22,${typeColor}11);display:flex;align-items:center;justify-content:center;">
            <span style="font-size:3rem;color:${typeColor};">${Utils.getIcon(typeIcon, 48)}</span>
            <span class="badge" style="position:absolute;top:0.75rem;right:0.75rem;background:${typeColor};color:#fff;">${item.type.toUpperCase()}</span>
            ${item.duration ? `<span style="position:absolute;bottom:0.75rem;right:0.75rem;background:rgba(0,0,0,0.7);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">${item.duration}</span>` : ''}
            ${item.pages ? `<span style="position:absolute;bottom:0.75rem;right:0.75rem;background:rgba(0,0,0,0.7);color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">${item.pages} pages</span>` : ''}
          </div>
          <div class="card-body">
            <h4 style="margin:0 0 0.25rem;font-size:0.95rem;">${Utils.escapeHtml(item.title)}</h4>
            <p style="margin:0 0 0.5rem;color:var(--text-secondary);font-size:0.8rem;">${Utils.escapeHtml(item.author || item.creator || '')}</p>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;font-size:0.8rem;color:var(--text-tertiary);">
              <span style="display:flex;align-items:center;gap:4px;">${Utils.getIcon('download',12)} ${downloads}</span>
              ${item.pages ? `<span style="display:flex;align-items:center;gap:4px;">${Utils.getIcon('file-text',12)} ${item.pages}p</span>` : ''}
            </div>
            ${progress > 0 ? `
            <div style="margin-bottom:0.75rem;">
              <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:4px;">
                <span style="color:var(--text-secondary);">Progress</span>
                <span style="font-weight:600;">${progress}%</span>
              </div>
              <div style="height:4px;background:var(--bg-tertiary);border-radius:2px;">
                <div style="height:100%;width:${progress}%;background:var(--primary);border-radius:2px;transition:width 0.3s;"></div>
              </div>
            </div>` : ''}
            <div style="display:flex;gap:0.5rem;">
              ${item.type === 'audio' ? `<button class="btn btn-primary btn-sm" onclick="DigitalLibraryPage.playAudio('${Utils.escapeHtml(item.title)}','${Utils.escapeHtml(item.author||'')}',${item.id})">${Utils.getIcon('play',14)} Play</button>` : ''}
              ${item.type === 'pdf' ? `<button class="btn btn-primary btn-sm" onclick="DigitalLibraryPage.openPDF(${item.id})">${Utils.getIcon('book-open',14)} ${progress > 0 ? 'Continue' : 'Read'}</button>` : ''}
              ${item.type === 'video' ? `<button class="btn btn-primary btn-sm" onclick="DigitalLibraryPage.playVideo('${Utils.escapeHtml(item.title)}')">${Utils.getIcon('play',14)} Watch</button>` : ''}
              ${item.pdfUrl ? `<a class="btn btn-outline btn-sm" href="${Utils.escapeHtml(item.pdfUrl)}" download>${Utils.getIcon('download',14)}</a>` : ''}
            </div>
          </div>
        </div>`;
    }).join('')}</div>`;
  },
  switchTab(tab) {
    this.activeTab = tab;
    const all = AppState.digitalBooks || [];
    let filtered = tab === 'all' ? all : all.filter(d => d.type === tab);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || (d.author || d.creator || '').toLowerCase().includes(q));
    }
    const content = document.getElementById('digital-content');
    if (content) content.innerHTML = this.renderContent(filtered);
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  },
  playAudio(title, author, id) {
    this.currentTrack = { id, title, author };
    this.playing = true;
    const player = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const ptitle = document.getElementById('player-title');
    const partist = document.getElementById('player-artist');
    if (player) player.style.display = 'block';
    if (ptitle) ptitle.textContent = title;
    if (partist) partist.textContent = author;
    if (playBtn) playBtn.innerHTML = Utils.getIcon('pause', 18);
    let progress = 0;
    const interval = setInterval(() => {
      if (!this.playing) { clearInterval(interval); return; }
      progress += 0.5;
      const bar = document.getElementById('player-progress');
      if (bar) bar.style.width = Math.min(progress, 100) + '%';
      if (progress >= 100) { clearInterval(interval); this.playing = false; }
    }, 200);
  },
  togglePlay() {
    this.playing = !this.playing;
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.innerHTML = this.playing ? Utils.getIcon('pause', 18) : Utils.getIcon('play', 18);
  },
  nextTrack() {
    const all = (AppState.digitalBooks || []).filter(d => d.type === 'audio');
    if (!all.length || !this.currentTrack) return;
    const idx = all.findIndex(d => d.id === this.currentTrack.id);
    const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : all[0];
    if (next) this.playAudio(next.title, next.author || next.creator || '', next.id);
  },
  prevTrack() {
    const all = (AppState.digitalBooks || []).filter(d => d.type === 'audio');
    if (!all.length || !this.currentTrack) return;
    const idx = all.findIndex(d => d.id === this.currentTrack.id);
    const prev = idx > 0 ? all[idx - 1] : all[all.length - 1];
    if (prev) this.playAudio(prev.title, prev.author || prev.creator || '', prev.id);
  },
  seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const bar = document.getElementById('player-progress');
    if (bar) bar.style.width = pct + '%';
  },
  closePlayer() {
    this.playing = false;
    const player = document.getElementById('audio-player');
    if (player) player.style.display = 'none';
  },
  openPDF(id) {
    const item = (AppState.digitalBooks || []).find(d => d.id === id);
    if (!item) return;
    if (!item.pdfUrl) { Toast.warning('No PDF file attached to this item yet'); return; }
    Utils.openPdfViewer(item.title, item.pdfUrl);
  },
  playVideo(title) {
    Modal.show({ title: title, content: `<div style="text-align:center;padding:3rem;background:#000;border-radius:8px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#fff;"><div><div style="font-size:4rem;margin-bottom:1rem;">${Utils.getIcon('play-circle', 64)}</div><p>Video player would open here.</p></div></div>`, size: 'lg', buttons: [] });
  },
  afterRender() {
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    const search = document.getElementById('digitalSearch');
    if (search) search.addEventListener('input', Utils.debounce((e) => {
      this.searchQuery = e.target.value;
      this.switchTab(this.activeTab);
    }, 300));
  }
};
