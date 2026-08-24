const BarcodeGen = {
    generate(text, container) {
        if (!container) return null;
        const wrap = document.createElement('div');
        wrap.className = 'barcode-display';
        const canvas = document.createElement('canvas');
        Utils.generateBarcode(text, canvas, 240, 70);
        wrap.appendChild(canvas);

        const label = document.createElement('p');
        label.style.cssText = 'font-size:0.75rem;color:var(--text-tertiary);font-family:var(--font-mono);';
        label.textContent = text;
        wrap.appendChild(label);

        container.appendChild(wrap);
        return canvas;
    }
};
