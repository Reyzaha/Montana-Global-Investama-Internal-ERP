/**
 * ==========================================================
 * MGI ERP - HRGA Expense Requests (Ticketing) JavaScript Logic
 * ==========================================================
 */

let currentUser = null;
let createModal = null;
let detailModal = null;
let expensesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (currentUser.role_id !== 2 && currentUser.role_id !== 7) {
        showToast('Akses ditolak. Halaman ini khusus HRGA.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_expense', currentUser);
    renderHeader(currentUser);

    const cModalEl = document.getElementById('createExpenseModal');
    if (cModalEl) {
        createModal = new bootstrap.Modal(cModalEl);
        cModalEl.addEventListener('show.bs.modal', () => {
            // Reset and ensure at least 1 item row exists
            const tbody = document.getElementById('itemsTableBody');
            if (tbody.children.length === 0) {
                addItemRow();
            }
        });
    }

    const dModalEl = document.getElementById('expenseDetailModal');
    if (dModalEl) detailModal = new bootstrap.Modal(dModalEl);

    loadExpenseRequests();

    // Event listener: Add item row
    const btnAdd = document.getElementById('btnAddItemRow');
    if (btnAdd) btnAdd.addEventListener('click', () => addItemRow());

    // Form submit
    document.getElementById('formCreateExpense').addEventListener('submit', handleCreateExpense);

    document.getElementById('btnApplyFilter').addEventListener('click', () => {
        loadExpenseRequests();
    });

    document.getElementById('searchExpense').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadExpenseRequests();
    });
});

// Dynamic Items Row Builder
function addItemRow(name = '', qty = 1, unit = 'pcs', price = 0) {
    const tbody = document.getElementById('itemsTableBody');
    const rowId = 'item_row_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const tr = document.createElement('tr');
    tr.id = rowId;

    tr.innerHTML = `
        <td>
            <input type="text" class="form-control form-control-sm item-name" placeholder="Nama barang / uraian..." value="${escapeHtml(name)}" required>
        </td>
        <td>
            <input type="number" class="form-control form-control-sm item-qty text-center" min="0.1" step="any" value="${qty}" required oninput="calculateRowTotal('${rowId}')">
        </td>
        <td>
            <select class="form-select form-select-sm item-unit">
                <option value="pcs" ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                <option value="unit" ${unit === 'unit' ? 'selected' : ''}>unit</option>
                <option value="box" ${unit === 'box' ? 'selected' : ''}>box</option>
                <option value="rim" ${unit === 'rim' ? 'selected' : ''}>rim</option>
                <option value="pack" ${unit === 'pack' ? 'selected' : ''}>pack</option>
                <option value="roll" ${unit === 'roll' ? 'selected' : ''}>roll</option>
                <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="liter" ${unit === 'liter' ? 'selected' : ''}>liter</option>
                <option value="set" ${unit === 'set' ? 'selected' : ''}>set</option>
                <option value="lainnya" ${!['pcs','unit','box','rim','pack','roll','kg','liter','set'].includes(unit) ? 'selected' : ''}>lainnya</option>
            </select>
        </td>
        <td>
            <input type="number" class="form-control form-control-sm item-price text-end font-monospace" min="0" step="100" placeholder="0" value="${price}" required oninput="calculateRowTotal('${rowId}')">
        </td>
        <td>
            <input type="text" class="form-control form-control-sm item-total text-end font-monospace bg-light fw-bold" readonly value="Rp 0">
        </td>
        <td class="text-center">
            <button type="button" class="btn btn-sm btn-outline-danger border-0 p-1" onclick="removeItemRow('${rowId}')" title="Hapus baris">
                <i class="bi bi-x-circle fs-6"></i>
            </button>
        </td>
    `;

    tbody.appendChild(tr);
    calculateRowTotal(rowId);
}

function removeItemRow(rowId) {
    const tbody = document.getElementById('itemsTableBody');
    if (tbody.children.length <= 1) {
        showToast('Minimal harus ada 1 item barang dalam pengajuan.', 'warning');
        return;
    }
    const row = document.getElementById(rowId);
    if (row) row.remove();
    calculateGrandTotal();
}

function calculateRowTotal(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const total = qty * price;

    row.querySelector('.item-total').value = formatRupiah(total);
    calculateGrandTotal();
}

function calculateGrandTotal() {
    const tbody = document.getElementById('itemsTableBody');
    let grandTotal = 0;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(r => {
        const qty = parseFloat(r.querySelector('.item-qty')?.value) || 0;
        const price = parseFloat(r.querySelector('.item-price')?.value) || 0;
        grandTotal += (qty * price);
    });

    document.getElementById('displayGrandTotal').textContent = formatRupiah(grandTotal);
    return grandTotal;
}

async function loadExpenseRequests() {
    const tbody = document.getElementById('expenseTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data tiket...</td></tr>`;

    const status = document.getElementById('filterStatus').value;
    const category = document.getElementById('filterCategory').value;
    const search = document.getElementById('searchExpense').value.trim();

    let url = `/backend/api/hrga/expense-requests.php?page=1&limit=50&status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            expensesList = res.data || [];
            renderExpenseTable(expensesList);
            if (res.pagination && res.pagination.stats) {
                updateStats(res.pagination.stats);
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Gagal memuat tiket: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Terjadi gangguan jaringan server.</td></tr>`;
    }
}

function updateStats(stats) {
    document.getElementById('countPending').textContent = stats.pending_count || 0;
    document.getElementById('countApproved').textContent = stats.approved_count || 0;
    document.getElementById('countPendingVerif').textContent = stats.pending_verification_count || 0;
    document.getElementById('countCompleted').textContent = stats.completed_count || 0;
}

function renderExpenseTable(items) {
    const tbody = document.getElementById('expenseTableBody');
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    Belum ada tiket pengajuan biaya. Silakan klik "Buat Pengajuan Biaya" di atas.
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
            ? `<a href="/backend/${item.receipt_doc_path}" target="_blank" class="badge bg-light text-primary border text-decoration-none me-1"><i class="bi bi-receipt"></i> Nota</a>`
            : '';
        const photoBadge = item.item_photo_path
            ? `<a href="/backend/${item.item_photo_path}" target="_blank" class="badge bg-light text-success border text-decoration-none me-1"><i class="bi bi-camera"></i> Foto</a>`
            : '';

        const approverDisplay = item.approver_name 
            ? `<span class="small fw-semibold text-dark"><i class="bi bi-person-check me-1 text-primary"></i>${escapeHtml(item.approver_name)}</span>` 
            : '<span class="text-muted small">-</span>';

        tr.innerHTML = `
            <td class="ps-4 fw-bold font-monospace text-dark">${escapeHtml(item.ticket_number)}</td>
            <td>
                <div class="fw-semibold text-dark">${escapeHtml(item.title)}</div>
                <div class="small text-muted">${receiptBadge}${photoBadge} ${item.description ? escapeHtml(item.description.substring(0, 35)) + '...' : ''}</div>
            </td>
            <td><span class="badge bg-light text-dark border text-uppercase">${escapeHtml(item.category)}</span></td>
            <td><span class="badge bg-light text-primary border">${item.total_items || 1} item</span></td>
            <td>
                <span class="fw-bold text-success">${formatRupiah(item.amount)}</span>
            </td>
            <td>${badge}</td>
            <td>${approverDisplay}</td>
            <td class="pe-4 text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewExpenseDetail(${item.id})">
                        <i class="bi bi-eye"></i> Detail
                    </button>
                    <a href="/backend/api/hrga/expense-pdf.php?id=${item.id}" target="_blank" class="btn btn-outline-secondary" title="Cetak Voucher 1 Lembar">
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
        'completed': '<span class="badge bg-success"><i class="bi bi-patch-check-fill me-1"></i>Selesai / Sah</span>',
        'disbursed': '<span class="badge bg-success"><i class="bi bi-cash-stack me-1"></i>Telah Dicairkan</span>',
        'rejected': '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Ditolak PM</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

async function handleCreateExpense(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitExpense');
    const form = e.target;
    const formData = new FormData(form);

    // Extract item rows
    const tbody = document.getElementById('itemsTableBody');
    const rows = tbody.querySelectorAll('tr');
    const items = [];

    rows.forEach(r => {
        const name = r.querySelector('.item-name')?.value.trim();
        const qty = parseFloat(r.querySelector('.item-qty')?.value) || 1;
        const unit = r.querySelector('.item-unit')?.value || 'pcs';
        const unitPrice = parseFloat(r.querySelector('.item-price')?.value) || 0;

        if (name) {
            items.push({
                item_name: name,
                qty: qty,
                unit: unit,
                unit_price: unitPrice,
                notes: ''
            });
        }
    });

    if (items.length === 0) {
        showToast('Mohon masukkan minimal 1 nama barang.', 'warning');
        return;
    }

    formData.append('items', JSON.stringify(items));

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Menyimpan...`;

    try {
        const res = await fetch('/backend/api/hrga/expense-requests.php', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message || 'Tiket pengajuan biaya berhasil dikirim ke PM.', 'success');
            form.reset();
            document.getElementById('itemsTableBody').innerHTML = '';
            addItemRow();
            createModal.hide();
            loadExpenseRequests();
        } else {
            showToast(data.message || 'Gagal membuat pengajuan.', 'danger');
        }
    } catch (err) {
        showToast('Terjadi gangguan koneksi server.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-send me-1"></i> Buat Tiket & Kirim ke PM`;
    }
}

async function viewExpenseDetail(id) {
    const body = document.getElementById('expenseDetailBody');
    const footer = document.getElementById('expenseDetailFooter');

    body.innerHTML = `<div class="text-center py-4"><div class="spinner-border spinner-border-sm me-2"></div> Memuat rincian tiket...</div>`;
    detailModal.show();

    try {
        const res = await apiGet(`/backend/api/hrga/expense-requests.php?id=${id}`);
        if (!res.success) {
            body.innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
            return;
        }

        const item = res.data;

        // Render items table
        let itemsHtml = '<div class="text-muted small">Tidak ada rincian item barang terdaftar.</div>';
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
                        ${item.realized_amount ? `
                            <tr>
                                <th colspan="5" class="text-end fw-bold text-success">Realisasi Belanja Aktual:</th>
                                <th class="text-end text-success fw-bold font-monospace">${formatRupiah(item.realized_amount)}</th>
                            </tr>
                        ` : ''}
                    </tfoot>
                </table>
            `;
        }

        // Attachments
        let proofsHtml = '';
        if (item.item_photo_path) {
            proofsHtml += `
                <div class="col-md-6">
                    <div class="p-2 border rounded bg-white">
                        <div class="small fw-bold text-dark mb-1"><i class="bi bi-camera me-1 text-success"></i> Foto Fisik Barang:</div>
                        <a href="/backend/${item.item_photo_path}" target="_blank">
                            <img src="/backend/${item.item_photo_path}" class="img-fluid rounded border" style="max-height: 140px; object-fit: cover;">
                        </a>
                    </div>
                </div>
            `;
        }
        if (item.receipt_doc_path) {
            proofsHtml += `
                <div class="col-md-6">
                    <div class="p-2 border rounded bg-white">
                        <div class="small fw-bold text-dark mb-1"><i class="bi bi-receipt me-1 text-primary"></i> Dokumen Nota:</div>
                        <a href="/backend/${item.receipt_doc_path}" target="_blank" class="btn btn-sm btn-outline-primary mt-2">
                            <i class="bi bi-box-arrow-up-right me-1"></i> Buka Dokumen Nota
                        </a>
                    </div>
                </div>
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
                    <label class="small text-muted text-uppercase fw-bold">Keperluan</label>
                    <div class="fw-bold text-dark fs-6">${escapeHtml(item.title)}</div>
                </div>
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Kategori</label>
                    <div><span class="badge bg-secondary text-uppercase">${escapeHtml(item.category)}</span></div>
                </div>
            </div>

            <div class="mb-3">
                <label class="small text-muted text-uppercase fw-bold mb-1">Rincian Item Barang</label>
                ${itemsHtml}
            </div>

            ${proofsHtml ? `
                <div class="row g-2 mb-3">
                    ${proofsHtml}
                </div>
            ` : ''}

            ${item.note ? `
                <div class="mb-3">
                    <label class="small text-muted text-uppercase fw-bold text-danger">Catatan Approval PM:</label>
                    <div class="p-2 bg-danger-subtle text-danger rounded border border-danger-subtle small">${escapeHtml(item.note)}</div>
                </div>
            ` : ''}

            ${item.verification_notes ? `
                <div class="mb-3">
                    <label class="small text-muted text-uppercase fw-bold text-primary">Catatan Verifikasi Barang PM:</label>
                    <div class="p-2 bg-info-subtle text-primary rounded border border-info-subtle small">${escapeHtml(item.verification_notes)}</div>
                </div>
            ` : ''}

            ${item.status === 'approved' ? `
                <div class="alert alert-info d-flex align-items-center mb-0 py-2">
                    <i class="bi bi-camera fs-4 me-2"></i>
                    <div>
                        <strong>Tiket telah disetujui PM!</strong> Silakan belanjakan barang dan unggah foto fisik barang beserta nota di menu 
                        <a href="/frontend/pages/hrga/expense-realization.html" class="alert-link fw-bold">Realisasi & Bukti Belanja</a>.
                    </div>
                </div>
            ` : ''}
        `;

        footer.innerHTML = `
            <a href="/backend/api/hrga/expense-pdf.php?id=${item.id}" target="_blank" class="btn btn-outline-primary">
                <i class="bi bi-printer me-1"></i> Cetak Voucher (1 Lembar A4)
            </a>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
        `;

    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">Gagal mengambil rincian tiket: ${e.message}</div>`;
    }
}

function printExpenseList() {
    const status = document.getElementById('filterStatus').value;
    const category = document.getElementById('filterCategory').value;
    const search = document.getElementById('searchExpense').value.trim();

    let url = `/backend/api/hrga/expense-list-print.php?status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    window.open(url, '_blank');
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
