const Charts = {
    bar(canvas, data) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;
        const maxVal = Math.max(...data.map(d => d.value)) * 1.15;
        const barW = (chartW / data.length) * 0.6;
        const gap = (chartW / data.length) * 0.4;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#a8a8c8' : '#4a4a6a';
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

        let progress = 0;
        const animate = () => {
            progress = Math.min(progress + 0.04, 1);
            ctx.clearRect(0, 0, w, h);

            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (chartH / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(w - padding.right, y);
                ctx.stroke();
                ctx.fillStyle = textColor;
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(Math.round(maxVal - (maxVal / 5) * i), padding.left - 8, y + 4);
            }

            data.forEach((d, i) => {
                const x = padding.left + (chartW / data.length) * i + gap / 2;
                const barH = (d.value / maxVal) * chartH * progress;
                const y = padding.top + chartH - barH;

                const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
                grad.addColorStop(0, d.color || '#667eea');
                grad.addColorStop(1, (d.color || '#667eea') + '66');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
                ctx.fill();

                ctx.fillStyle = textColor;
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(d.label, x + barW / 2, padding.top + chartH + 20);

                if (progress > 0.8) {
                    ctx.fillStyle = isDark ? '#e8e8f0' : '#1a1a2e';
                    ctx.font = 'bold 11px Inter, sans-serif';
                    ctx.fillText(d.value, x + barW / 2, y - 6);
                }
            });

            if (progress < 1) requestAnimationFrame(animate);
        };
        animate();
    },

    line(canvas, data) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;
        const maxVal = Math.max(...data.map(d => d.value)) * 1.15;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#a8a8c8' : '#4a4a6a';
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

        let progress = 0;
        const animate = () => {
            progress = Math.min(progress + 0.03, 1);
            ctx.clearRect(0, 0, w, h);

            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (chartH / 5) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(w - padding.right, y);
                ctx.stroke();
                ctx.fillStyle = textColor;
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(Math.round(maxVal - (maxVal / 5) * i), padding.left - 8, y + 4);
            }

            const points = data.map((d, i) => ({
                x: padding.left + (chartW / (data.length - 1)) * i,
                y: padding.top + chartH - (d.value / maxVal) * chartH
            }));

            const visibleCount = Math.floor(points.length * progress);
            const visiblePoints = points.slice(0, visibleCount + 1);

            if (visiblePoints.length > 1) {
                const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
                grad.addColorStop(0, 'rgba(102,126,234,0.2)');
                grad.addColorStop(1, 'rgba(102,126,234,0)');
                ctx.beginPath();
                ctx.moveTo(visiblePoints[0].x, padding.top + chartH);
                visiblePoints.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, padding.top + chartH);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
                for (let i = 1; i < visiblePoints.length; i++) {
                    const cp1x = (visiblePoints[i - 1].x + visiblePoints[i].x) / 2;
                    const cp1y = visiblePoints[i - 1].y;
                    const cp2x = (visiblePoints[i - 1].x + visiblePoints[i].x) / 2;
                    const cp2y = visiblePoints[i].y;
                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, visiblePoints[i].x, visiblePoints[i].y);
                }
                ctx.strokeStyle = '#667eea';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            visiblePoints.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#667eea';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            });

            data.forEach((d, i) => {
                const x = padding.left + (chartW / (data.length - 1)) * i;
                ctx.fillStyle = textColor;
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(d.label, x, padding.top + chartH + 20);
            });

            if (progress < 1) requestAnimationFrame(animate);
        };
        animate();
    },

    doughnut(canvas, data, centerText = '') {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;
        const cx = w / 2, cy = h / 2;
        const outerR = Math.min(w, h) / 2 - 10;
        const innerR = outerR * 0.65;
        const total = data.reduce((s, d) => s + d.value, 0);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e8e8f0' : '#1a1a2e';

        let progress = 0;
        const animate = () => {
            progress = Math.min(progress + 0.03, 1);
            ctx.clearRect(0, 0, w, h);
            let startAngle = -Math.PI / 2;

            data.forEach(d => {
                const sliceAngle = (d.value / total) * Math.PI * 2 * progress;
                ctx.beginPath();
                ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
                ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
                ctx.closePath();
                ctx.fillStyle = d.color;
                ctx.fill();
                startAngle += sliceAngle;
            });

            if (progress > 0.5) {
                ctx.fillStyle = textColor;
                ctx.font = 'bold 22px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(centerText || total.toLocaleString(), cx, cy - 6);
                ctx.font = '12px Inter, sans-serif';
                ctx.fillStyle = isDark ? '#a8a8c8' : '#4a4a6a';
                ctx.fillText('Total', cx, cy + 16);
            }

            if (progress < 1) requestAnimationFrame(animate);
        };
        animate();
    },

    progress(canvas, percentage, color = '#667eea') {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const w = rect.width, h = rect.height;
        const cx = w / 2, cy = h / 2;
        const radius = Math.min(w, h) / 2 - 6;
        const lineWidth = 6;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        let progress = 0;
        const animate = () => {
            progress = Math.min(progress + 0.03, 1);
            ctx.clearRect(0, 0, w, h);

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            const currentAngle = (percentage / 100) * Math.PI * 2 * progress;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + currentAngle);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.fillStyle = isDark ? '#e8e8f0' : '#1a1a2e';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(percentage * progress) + '%', cx, cy);

            if (progress < 1) requestAnimationFrame(animate);
        };
        animate();
    }
};
