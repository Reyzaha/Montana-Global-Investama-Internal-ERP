/**
 * ==========================================================
 * MGI ERP - PM Petty Cash Monitoring JavaScript Logic
 * ==========================================================
 */

let currentUser = null;
let cachedTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (currentUser.role_id !== 6 && currentUser.role_id !== 7) {
        showToast('Akses ditolak. Halaman ini khusus Project Manager.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('pm_petty_cash', currentUser);
    renderHeader(currentUser);

    loadPettyCashMonitoring();

    document.getElementById('filterType').addEventListener('change', () => {
        filterTransactions();
    });
});

async function loadPettyCashMonitoring() {
    try {
        const res = await apiGet('/backend/api/pm/petty-cash-stats.php');
        if (res.success) {
            const d = res.data;

            // Update top metrics
            document.getElementById('currentBalanceDisplay').textContent = formatRupiah(d.current_balance);
            document.getElementById('monthOutflowDisplay').textContent = formatRupiah(d.month.outflow);
            document.getElementById('monthInflowDisplay').textContent = formatRupiah(d.month.inflow);
            document.getElementById('monthTxCount').textContent = `${d.month.tx_count} transaksi bulan ini`;

            document.getElementById('pendingExpCount').textContent = `${d.pending_expense.count} Tiket`;
            document.getElementById('pendingExpAmount').textContent = `Total: ${formatRupiah(d.pending_expense.total_amount)}`;

            // Render category breakdown
            renderCategoryBreakdown(d.category_breakdown);

            // Transactions
            cachedTransactions = d.recent_transactions || [];
            filterTransactions();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal memuat statistik petty cash.', 'danger');
    }
}

function renderCategoryBreakdown(categories) {
    const container = document.getElementById('categoryBreakdownContainer');
    if (!categories || categories.length === 0) {
        container.innerHTML = `<div class="text-muted small py-3 text-center">Belum ada data pengeluaran per kategori yang dicairkan.</div>`;
        return;
    }

    let totalAll = 0;
    categories.forEach(c => totalAll += parseFloat(c.total_amount || 0));

    let html = '<div class="row g-3">';
    categories.forEach(cat => {
        const amt = parseFloat(cat.total_amount || 0);
        const pct = totalAll > 0 ? Math.round((amt / totalAll) * 100) : 0;

        html += `
            <div class="col-md-4 col-sm-6">
                <div class="p-3 bg-light rounded border">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-uppercase small text-dark">${escapeHtml(cat.category)}</span>
                        <span class="badge bg-primary">${pct}%</span>
                    </div>
                    <div class="fs-6 fw-bold text-primary mb-2">${formatRupiah(amt)}</div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${pct}%"></div>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function filterTransactions() {
    const filter = document.getElementById('filterType').value;
    const tbody = document.getElementById('pettyCashTableBody');

    let list = cachedTransactions;
    if (filter !== 'all') {
        list = list.filter(t => t.transaction_type === filter);
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                    <i class="bi bi-inbox fs-3 d-block text-secondary mb-1"></i>
                    Tidak ada mutasi kas kecil yang tercatat.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    list.forEach(item => {
        const tr = document.createElement('tr');
        const isOut = item.transaction_type === 'outflow';
        const typeBadge = isOut
            ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-arrow-up-right me-1"></i>Kas Keluar</span>'
            : '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-arrow-down-left me-1"></i>Kas Masuk</span>';

        const nominalFormatted = (isOut ? '- ' : '+ ') + formatRupiah(item.amount);
        const ticketDisplay = item.ticket_number
            ? `<span class="badge bg-light text-dark font-monospace border">${escapeHtml(item.ticket_number)}</span>`
            : '<span class="text-muted small">-</span>';

        const proofBtn = item.proof_doc_path
            ? `<a href="/backend/${item.proof_doc_path}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark-arrow-down"></i> Bukti</a>`
            : '<span class="text-muted small">-</span>';

        tr.innerHTML = `
            <td class="ps-4 fw-bold text-muted">#${item.id}</td>
            <td class="small text-muted">${new Date(item.created_at).toLocaleString('id-ID')}</td>
            <td>${typeBadge}</td>
            <td>${ticketDisplay}</td>
            <td>
                <div class="fw-medium text-dark">${escapeHtml(item.description)}</div>
                <div class="small text-muted">Oleh: ${escapeHtml(item.creator_name || 'Admin')}</div>
            </td>
            <td>
                <span class="fw-bold ${isOut ? 'text-danger' : 'text-success'}">${nominalFormatted}</span>
            </td>
            <td class="fw-bold text-dark">${formatRupiah(item.current_balance)}</td>
            <td class="pe-4 text-end">${proofBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatRupiah(num) {
    const val = parseFloat(num) || 0;
    return 'Rp ' + val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
