const BorrowSuccessPage = {
    render(params) {
        const requestId = params.id;
        const request = AppState.borrowRequests.find(r => r.id === requestId);
        if (!request) {
            return `<div class="container"><div class="empty-state" style="padding:80px 0"><div class="empty-state-icon">${Utils.getIcon('search', 80)}</div><h3>Request not found</h3><p>The borrow request could not be found.</p><a href="#/books" class="btn btn-primary" data-nav>Browse Books</a></div></div>`;
        }

        const book = AppState.books.find(b => b.id === request.bookId);

        return `
        <div class="container" style="max-width:680px;padding:40px 24px 80px;">
            <div class="success-page fade-in-up">
                <div class="success-checkmark-container">
                    <div class="success-circle">
                        <svg class="success-checkmark" viewBox="0 0 52 52">
                            <circle class="success-checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                            <path class="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                    </div>
                </div>
                <h1 class="success-title">Borrow Request Submitted Successfully</h1>
                <p class="success-subtitle">Your request has been sent to the librarian.</p>

                <div class="success-status-badge pending">
                    <span class="status-dot-pending"></span> Pending Approval
                </div>

                <div class="receipt-card glass-card">
                    <div class="receipt-header-section">
                        <div class="receipt-logo">
                            <svg viewBox="0 0 40 40" width="40" height="40">
                                <defs><linearGradient id="receiptGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="100%" style="stop-color:#764ba2"/></linearGradient></defs>
                                <rect x="4" y="8" width="7" height="24" rx="1.5" fill="url(#receiptGrad)" opacity="0.9"/>
                                <rect x="13" y="5" width="7" height="27" rx="1.5" fill="url(#receiptGrad)" opacity="0.7"/>
                                <rect x="22" y="9" width="7" height="23" rx="1.5" fill="url(#receiptGrad)" opacity="0.8"/>
                                <rect x="31" y="6" width="7" height="26" rx="1.5" fill="url(#receiptGrad)" opacity="0.6"/>
                            </svg>
                            <div>
                                <h3>Saraswati Sec School Library</h3>
                                <p>Borrow Receipt</p>
                            </div>
                        </div>
                    </div>
                    <div class="receipt-divider"></div>
                    <div class="receipt-body">
                        <div class="receipt-row"><span>Borrow ID</span><span class="mono">${request.id}</span></div>
                        <div class="receipt-row"><span>Student</span><span>${Utils.escapeHtml(request.studentName)}</span></div>
                        <div class="receipt-row"><span>Student ID</span><span class="mono">STU-${String(request.studentId).padStart(4, '0')}</span></div>
                        <div class="receipt-divider-thin"></div>
                        <div class="receipt-row"><span>Book</span><span>${Utils.escapeHtml(request.bookTitle)}</span></div>
                        ${book ? `<div class="receipt-row"><span>ISBN</span><span class="mono">${book.isbn}</span></div>` : ''}
                        <div class="receipt-divider-thin"></div>
                        <div class="receipt-row"><span>Borrow Date</span><span>${Utils.formatDate(request.borrowDate)}</span></div>
                        <div class="receipt-row"><span>Expected Return</span><span>${Utils.formatDate(request.expectedReturnDate)}</span></div>
                        <div class="receipt-row"><span>Pickup Location</span><span>Library Front Desk</span></div>
                        <div class="receipt-row"><span>Status</span><span class="badge badge-warning">Pending Approval</span></div>
                        <div class="receipt-row"><span>Fine</span><span>None</span></div>
                    </div>
                    <div class="receipt-footer-section">
                        <div class="receipt-qr"><canvas id="receiptQR"></canvas><span>Scan to verify</span></div>
                    </div>
                </div>

                <div class="success-timeline" style="margin-top:24px;">
                    <h3 style="font-weight:700;margin-bottom:16px;font-size:0.95rem;">Status Timeline</h3>
                    <div class="timeline">
                        <div class="timeline-item completed">
                            <div class="timeline-dot">${Utils.getIcon('check', 14)}</div>
                            <div class="timeline-content">
                                <span class="timeline-title">Request Submitted</span>
                                <span class="timeline-time">${Utils.formatDate(request.borrowDate)}</span>
                            </div>
                        </div>
                        <div class="timeline-item active">
                            <div class="timeline-dot pending-pulse"></div>
                            <div class="timeline-content">
                                <span class="timeline-title">Waiting for Librarian Approval</span>
                                <span class="timeline-time">In progress</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-title">Ready for Pickup</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-title">Borrowed</span>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <span class="timeline-title">Returned</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="success-actions">
                    <button class="btn btn-outline" onclick="BorrowSuccessPage.downloadReceipt('${request.id}')">${Utils.getIcon('download', 16)} Download Receipt</button>
                    <button class="btn btn-outline" onclick="window.print()">${Utils.getIcon('printer', 16)} Print Receipt</button>
                    <a href="#/books" class="btn btn-primary" data-nav>${Utils.getIcon('book-open', 16)} Borrow Another Book</a>
                    <a href="#/" class="btn btn-ghost" data-nav>Go to Dashboard</a>
                    <a href="#/my-books" class="btn btn-ghost" data-nav>View My Borrowed Books</a>
                </div>
            </div>
        </div>`;
    },

    afterRender() {
        const canvas = document.getElementById('receiptQR');
        if (canvas) {
            const requestId = window.location.hash.split('/').pop();
            Utils.generateQRCode(`BORROW-${requestId}`, canvas, 100);
        }
        Utils.confetti();
    },

    downloadReceipt(requestId) {
        const request = AppState.borrowRequests.find(r => r.id === requestId);
        if (!request) return;
        const book = AppState.books.find(b => b.id === request.bookId);

        const receiptContent = `
        <html><head><title>Borrow Receipt - ${request.id}</title>
        <style>
            body{font-family:'Segoe UI',sans-serif;padding:40px;color:#333;}
            .header{text-align:center;margin-bottom:24px;border-bottom:2px solid #667eea;padding-bottom:16px;}
            h1{font-size:18px;margin:0;color:#667eea;}h2{font-size:14px;font-weight:400;margin:4px 0 0;color:#666;}
            table{width:100%;border-collapse:collapse;margin:16px 0;}
            td{padding:8px 0;border-bottom:1px dashed #ddd;font-size:13px;}
            td:first-child{font-weight:600;width:160px;color:#555;}
            .footer{text-align:center;margin-top:24px;padding-top:16px;border-top:2px solid #667eea;font-size:11px;color:#999;}
            .sig-line{display:inline-block;width:160px;border-top:1px solid #333;margin-top:40px;padding-top:4px;font-size:11px;}
        </style></head><body>
        <div class="header"><h1>Saraswati Sec School Library</h1><h2>Borrow Receipt</h2></div>
        <table>
            <tr><td>Borrow ID</td><td>${request.id}</td></tr>
            <tr><td>Student Name</td><td>${request.studentName}</td></tr>
            <tr><td>Student ID</td><td>STU-${String(request.studentId).padStart(4, '0')}</td></tr>
            <tr><td>Book Title</td><td>${request.bookTitle}</td></tr>
            ${book ? `<tr><td>ISBN</td><td>${book.isbn}</td></tr>` : ''}
            <tr><td>Borrow Date</td><td>${Utils.formatDate(request.borrowDate)}</td></tr>
            <tr><td>Expected Return</td><td>${Utils.formatDate(request.expectedReturnDate)}</td></tr>
            <tr><td>Pickup Location</td><td>Library Front Desk</td></tr>
            <tr><td>Status</td><td>${request.status.toUpperCase()}</td></tr>
            <tr><td>Fine</td><td>${request.fine > 0 ? 'Rs. ' + request.fine : 'None'}</td></tr>
        </table>
        <div style="display:flex;justify-content:space-between;margin-top:40px;">
            <div class="sig-line">Librarian Signature</div>
            <div class="sig-line">Student Signature</div>
        </div>
        <div class="footer">
            <p>Library Stamp Area</p>
            <p>Saraswati Sec School Library | Sanothimi, Bhaktapur, Nepal | +977-01-6634373</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        </body></html>`;

        const blob = new Blob([receiptContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `borrow-receipt-${request.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
        Toast.success('Receipt downloaded!');
    }
};
