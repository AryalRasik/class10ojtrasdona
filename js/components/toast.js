const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toastContainer');
    },

    show(message, type = 'info', duration = 4000) {
        if (!this.container) this.init();
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${Utils.getIcon(icons[type] || 'info', 22)}</span>
            <span class="toast-text">${Utils.escapeHtml(message)}</span>
            <button class="toast-close">${Utils.getIcon('x-circle', 16)}</button>
        `;
        toast.querySelector('.toast-close').addEventListener('click', () => this.dismiss(toast));
        this.container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        const existing = this.container.querySelectorAll('.toast');
        if (existing.length > 5) this.dismiss(existing[0]);

        setTimeout(() => this.dismiss(toast), duration);
    },

    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    },

    success(msg, dur) { this.show(msg, 'success', dur); },
    error(msg, dur) { this.show(msg, 'error', dur); },
    warning(msg, dur) { this.show(msg, 'warning', dur); },
    info(msg, dur) { this.show(msg, 'info', dur); }
};
