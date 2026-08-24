const Modal = {
    container: null,

    init() {
        this.container = document.getElementById('modalContainer');
    },

    show({ title = '', content = '', buttons = [], size = 'md', onClose = null }) {
        if (!this.container) this.init();
        const sizeClass = size === 'sm' ? 'max-width:400px' : size === 'lg' ? 'max-width:700px' : size === 'xl' ? 'max-width:1100px' : '';
        let btnsHtml = buttons.map(b =>
            `<button class="btn ${b.class || 'btn-secondary'} modal-action-btn">${Utils.escapeHtml(b.label)}</button>`
        ).join('');

        this.container.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal" style="${sizeClass}">
                <div class="modal-header">
                    <h3 class="modal-title">${Utils.escapeHtml(title)}</h3>
                    <button class="modal-close">${Utils.getIcon('x-circle', 20)}</button>
                </div>
                <div class="modal-body">${content}</div>
                ${buttons.length ? `<div class="modal-footer">${btnsHtml}</div>` : ''}
            </div>
        `;
        this.container.classList.add('active');

        this.container.querySelector('.modal-close').addEventListener('click', () => this.hide());
        this.container.querySelector('.modal-backdrop').addEventListener('click', () => this.hide());

        const actionBtns = this.container.querySelectorAll('.modal-action-btn');
        actionBtns.forEach((btn, i) => {
            btn.addEventListener('click', () => {
                if (buttons[i] && buttons[i].onClick) buttons[i].onClick();
                this.hide();
            });
        });

        this._onClose = onClose;
        document.addEventListener('keydown', this._escHandler);
    },

    _escHandler(e) {
        if (e.key === 'Escape') Modal.hide();
    },

    hide() {
        if (!this.container) return;
        this.container.classList.remove('active');
        document.removeEventListener('keydown', this._escHandler);
        if (this._onClose) this._onClose();
        setTimeout(() => { if (this.container) this.container.innerHTML = ''; }, 400);
    },

    confirm(title, message, onConfirm) {
        this.show({
            title,
            content: `<p style="color:var(--text-secondary)">${Utils.escapeHtml(message)}</p>`,
            size: 'sm',
            buttons: [
                { label: 'Cancel', class: 'btn-secondary' },
                { label: 'Confirm', class: 'btn-primary', onClick: onConfirm }
            ]
        });
    }
};
