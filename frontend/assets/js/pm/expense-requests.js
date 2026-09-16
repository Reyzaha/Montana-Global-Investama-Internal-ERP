/**
 * ==========================================================
 * MGI ERP - PM Expense Requests Approval JavaScript Logic
 * ==========================================================
 */

let currentUser = null;
let currentTab = 'pending_pm';
let currentExpenseModal = null;
let expensesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (currentUser.role_id !== 6 && currentUser.role_id !== 7) {
        showToast('Akses ditolak. Halaman ini khusus Project Manager.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('pm_expense', currentUser);
    renderHeader(currentUser);

    const modalEl = document.getElementById('expenseDetailModal');
    if (modalEl) {
        currentExpenseModal = new bootstrap.Modal(modalEl);
    }

    loadExpenseRequests();

    document.getElementById('btnApplyFilter').addEventListener('click', () => {
        loadExpenseRequests();
    });

    document.getElementById('searchExpense').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadExpenseRequests();
    });
});

function switchPmTab(tab) {
    currentTab = tab;

    document.getElementById('tabPmPending').classList.toggle('active', tab === 'pending_pm');
    document.getElementById('tabPmApproved').classList.toggle('active', tab === 'approved_history');
    document.getElementById('tabPmRejected').classList.toggle('active', tab === 'rejected');

    const titleMap = {
        'pending_pm': 'Daftar Tiket Menunggu Review PM',
        'approved_history': 'Riwayat Tiket yang Telah Disetujui (Approved)',
        'rejected': 'Riwayat Tiket yang Ditolak (Rejected)'
    };
    document.getElementById('tableHeaderTitle').textContent = titleMap[tab] || 'Daftar Tiket';

    loadExpenseRequests();
}

async function loadExpenseRequests() {
    const tbody = document.getElementById('expenseTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data tiket...</td></tr>`;

    const category = document.getElementById('filterCategory').value;
    const search = document.getElementById('searchExpense').value.trim();

    let statusParam = currentTab;
    if (currentTab === 'approved_history') {
        // Will filter client-side or fetch all then filter
        statusParam = 'all';
    }

    let url = `/backend/api/hrga/expense-requests.php?page=1&limit=100&status=${encodeURIComponent(statusParam)}&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            let list = res.data || [];

            if (currentTab === 'approved_history') {
                list = list.filter(e => ['approved', 'pending_verification', 'completed', 'disbursed'].includes(e.status));
            } else if (currentTab === 'pending_pm') {
                list = list.filter(e => e.status === 'pending_pm');
            } else if (currentTab === 'rejected') {
                list = list.filter(e => e.status === 'rejected');
            }

            expensesList = list;
            renderExpenseTable(expensesList);

            if (res.pagination && res.pagination.stats) {
                updateStats(res.pagination.stats);
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Terjadi kesalahan koneksi server.</td></tr>`;
    }
}

function updateStats(stats) {
    document.getElementById('countPending').textContent = stats.pending_count || 0;
    document.getElementById('badgePmPending').textContent = stats.pending_count || 0;

    const approvedTotal = (parseInt(stats.approved_count || 0) + parseInt(stats.pending_verification_count || 0) + parseInt(stats.completed_count || 0));
    document.getElementById('countApproved').textContent = approvedTotal;
    document.getElementById('badgePmApproved').textContent = approvedTotal;

    document.getElementById('countVerif').textContent = stats.pending_verification_count || 0;

    document.getElementById('countRejected').textContent = stats.rejected_count || 0;
    document.getElementById('badgePmRejected').textContent = stats.rejected_count || 0;

    // Calculate pending amount
    let pendingAmount = 0;
    expensesList.forEach(e => {
        if (e.status === 'pending_pm') pendingAmount += parseFloat(e.amount || 0);
    });
    document.getElementById('amountPending').textContent = 'Total: ' + formatRupiah(pendingAmount);
}

function renderExpenseTable(items) {
    const tbody = document.getElementById('expenseTableBody');
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    Tidak ada tiket pengajuan biaya pada kategori / status ini.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    items.forEach(item => {
        const tr = document.createElement('tr');
        const badge = getExpenseStatusBadge(item.status);
        const receiptBadge = item.receipt_doc_path
            ? `<a href="/backend/${item.receipt_doc_path}" target="_blank" class="badge bg-light text-primary border text-decoration-none me-1"><i class="bi bi-file-earmark-arrow-down"></i> Bukti</a>`
            : '';

        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark font-monospace">${escapeHtml(item.ticket_number)}</td>
            <td>
                <div class="fw-semibold text-dark">${escapeHtml(item.title)}</div>
                <div class="small text-muted">${receiptBadge} <span class="badge bg-light text-secondary border">${item.total_items || 1} item</span></div>
            </td>
            <td><span class="badge bg-light text-dark border text-uppercase">${escapeHtml(item.category)}</span></td>
            <td>
                <span class="fw-bold text-success font-monospace">${formatRupiah(item.amount)}</span>
                ${item.realized_amount ? `<div class="small text-muted font-monospace">Riil: ${formatRupiah(item.realized_amount)}</div>` : ''}
            </td>
            <td>
                <div class="small fw-semibold text-dark">${escapeHtml(item.creator_name)}</div>
                <div class="text-muted" style="font-size: 0.75rem;">${new Date(item.created_at).toLocaleDateString('id-ID')}</div>
            </td>
            <td>${badge}</td>
            <td class="pe-4 text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn ${item.status === 'pending_pm' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="viewExpenseDetail(${item.id})">
                        <i class="bi bi-search me-1"></i> ${item.status === 'pending_pm' ? 'Review' : 'Detail'}
                    </button>
                    <a href="/backend/api/hrga/expense-pdf.php?id=${item.id}" target="_blank" class="btn btn-outline-info" title="Lihat Voucher 1 Lembar">
                        <i class="bi bi-printer"></i>
                    </a>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getExpenseStatusBadge(status) {
    const map = {
        'pending_pm': '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>Menunggu Review PM</span>',
        'approved': '<span class="badge bg-info text-dark"><i class="bi bi-cart-check me-1"></i>Disetujui PM (Siap Belanja)</span>',
        'pending_verification': '<span class="badge bg-primary"><i class="bi bi-camera me-1"></i>Menunggu Cek Barang</span>',
        'completed': '<span class="badge bg-success"><i class="bi bi-patch-check-fill me-1"></i>Selesai Sah</span>',
        'disbursed': '<span class="badge bg-success"><i class="bi bi-cash-stack me-1"></i>Telah Dicairkan</span>',
        'rejected': '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Ditolak PM</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

async function viewExpenseDetail(id) {
    const body = document.getElementById('expenseDetailBody');
    const footer = document.getElementById('expenseDetailFooter');

    body.innerHTML = `<div class="text-center py-4"><div class="spinner-border spinner-border-sm me-2"></div> Memuat rincian tiket...</div>`;
    currentExpenseModal.show();

    try {
        const res = await apiGet(`/backend/api/hrga/expense-requests.php?id=${id}`);
        if (!res.success) {
            body.innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
            return;
        }

        const item = res.data;

        // Items table
        let itemsHtml = '<div class="text-muted small">Tidak ada rincian item barang.</div>';
        if (item.items && item.items.length > 0) {
            itemsHtml = `
                <table class="table table-bordered table-sm mb-0">
                    <thead class="table-light small">
                        <tr>
                            <th style="width: 30px;" class="text-center">No</th>
                            <th>Nama Barang</th>
                            <th class="text-center">Qty</th>
                            <th class="text-center">Satuan</th>
                            <th class="text-end">Harga Satuan</th>
                            <th class="text-end">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${item.items.map((it, idx) => `
                            <tr>
                                <td class="text-center">${idx + 1}</td>
                                <td><strong>${escapeHtml(it.item_name)}</strong></td>
                                <td class="text-center">${parseFloat(it.qty)}</td>
                                <td class="text-center">${escapeHtml(it.unit)}</td>
                                <td class="text-end font-monospace">${formatRupiah(it.unit_price)}</td>
                                <td class="text-end font-monospace fw-bold">${formatRupiah(it.total_price)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="table-light">
                        <tr>
                            <th colspan="5" class="text-end fw-bold">Grand Total Estimasi:</th>
                            <th class="text-end text-primary fw-bold font-monospace">${formatRupiah(item.amount)}</th>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        body.innerHTML = `
            <div class="alert alert-light border d-flex justify-content-between align-items-center mb-3">
                <div>
                    <span class="text-muted small d-block">Nomor Tiket:</span>
                    <span class="fw-bold font-monospace fs-5 text-dark">${escapeHtml(item.ticket_number)}</span>
                </div>
                <div>
                    ${getExpenseStatusBadge(item.status)}
                </div>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Keperluan / Judul</label>
                    <div class="fw-bold text-dark fs-6">${escapeHtml(item.title)}</div>
                </div>
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Kategori Biaya</label>
                    <div><span class="badge bg-secondary text-uppercase">${escapeHtml(item.category)}</span></div>
                </div>
            </div>

            <div class="mb-3">
                <label class="small text-muted text-uppercase fw-bold mb-1">Daftar Rincian Item Barang</label>
                ${itemsHtml}
            </div>

            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Diajukan Oleh</label>
                    <div class="fw-semibold text-dark">${escapeHtml(item.creator_name)} (${escapeHtml(item.creator_email)})</div>
                    <div class="small text-muted">Tanggal: ${new Date(item.created_at).toLocaleString('id-ID')}</div>
                </div>
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Keterangan Tambahan</label>
                    <div class="text-secondary small">${nl2br(escapeHtml(item.description || '-'))}</div>
                </div>
            </div>

            ${item.note ? `
                <div class="mb-3">
                    <label class="small text-muted text-uppercase fw-bold text-danger">Catatan Review PM:</label>
                    <div class="p-2 bg-danger-subtle text-danger rounded border border-danger-subtle small">${escapeHtml(item.note)}</div>
                </div>
            ` : ''}
        `;

        if (item.status === 'pending_pm') {
            footer.innerHTML = `
                <div class="w-100 mb-2">
                    <label class="form-label small fw-bold text-dark">Catatan Review PM (Wajib jika menolak):</label>
                    <textarea id="expenseActionNote" class="form-control" rows="2" placeholder="Tuliskan catatan approval atau alasan penolakan..."></textarea>
                </div>
                <div class="w-100 d-flex justify-content-between align-items-center">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Tutup</button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-danger" onclick="submitExpenseApproval(${item.id}, 'reject')">
                            <i class="bi bi-x-circle me-1"></i> Tolak Pengajuan
                        </button>
                        <button class="btn btn-success" onclick="submitExpenseApproval(${item.id}, 'approve')">
                            <i class="bi bi-check2-circle me-1"></i> Approve Estimasi
                        </button>
                    </div>
                </div>
            `;
        } else {
            footer.innerHTML = `
                <div class="w-100 d-flex justify-content-between align-items-center">
                    <a href="/backend/api/hrga/expense-pdf.php?id=${item.id}" target="_blank" class="btn btn-outline-primary">
                        <i class="bi bi-printer me-1"></i> Cetak Voucher (1 Lembar)
                    </a>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                </div>
            `;
        }

    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">Gagal memuat rincian tiket.</div>`;
    }
}

async function submitExpenseApproval(id, action) {
    const note = document.getElementById('expenseActionNote').value.trim();
    if (action === 'reject' && !note) {
        showToast('Catatan alasan penolakan wajib diisi.', 'warning');
        return;
    }

    const confirmMsg = (action === 'approve')
        ? 'Setujui estimasi pengajuan biaya ini? HRGA selanjutnya akan membelanjakan barang dan memfoto bukti barang.'
        : 'Yakin ingin menolak pengajuan biaya ini?';

    if (!confirm(confirmMsg)) return;

    try {
        const res = await apiPost(`/backend/api/pm/expense-approve.php?id=${id}`, {
            action,
            note
        });

        if (res.success) {
            showToast(res.message || 'Keputusan berhasil disimpan.', 'success');
            currentExpenseModal.hide();
            loadExpenseRequests();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Terjadi gangguan jaringan saat memproses keputusan.', 'danger');
    }
}

function printExpenseList() {
    const category = document.getElementById('filterCategory').value;
    const search = document.getElementById('searchExpense').value.trim();

    let statusParam = currentTab;
    let url = `/backend/api/hrga/expense-list-print.php?status=${encodeURIComponent(statusParam)}&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    window.open(url, '_blank');
}

function formatRupiah(num) {
    const val = parseFloat(num) || 0;
    return 'Rp ' + val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function nl2br(str) {
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2');
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
