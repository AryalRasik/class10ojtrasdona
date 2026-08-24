const QRCode = {
    generate(text, container, size = 128) {
        if (!container) return null;
        const wrap = document.createElement('div');
        wrap.className = 'qr-display';
        const canvas = document.createElement('canvas');
        canvas.className = 'qr-canvas';
        Utils.generateQRCode(text, canvas, size);
        wrap.appendChild(canvas);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn btn-sm btn-outline';
        downloadBtn.innerHTML = `${Utils.getIcon('download', 14)} Download QR`;
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `qr-${text.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
        wrap.appendChild(downloadBtn);

        container.appendChild(wrap);
        return canvas;
    }
};
