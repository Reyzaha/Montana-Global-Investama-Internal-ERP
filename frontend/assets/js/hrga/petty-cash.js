/**
 * ==========================================================
 * MGI ERP - HRGA Petty Cash Ledger JavaScript Logic
 * ==========================================================
 */

let currentUser = null;
let txModal = null;
let transactionsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (currentUser.role_id !== 2 && currentUser.role_id !== 7) {
        showToast('Akses ditolak. Halaman ini khusus HRGA.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_petty_cash', currentUser);
    renderHeader(currentUser);

    const mEl = document.getElementById('transactionModal');
    if (mEl) txModal = new bootstrap.Modal(mEl);

    loadPettyCashData();

    document.getElementById('formTransaction').addEventListener('submit', handleSaveTransaction);

    document.getElementById('btnFilterLedger').addEventListener('click', () => {
        loadPettyCashData();
    });

    document.getElementById('searchLedger').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadPettyCashData();
    });
});

async function loadPettyCashData() {
    const tbody = document.getElementById('pettyCashTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat buku kas kecil...</td></tr>`;

    const type = document.getElementById('filterType').value;
    const search = document.getElementById('searchLedger').value.trim();

    let url = `/backend/api/hrga/petty-cash.php?page=1&limit=50&type=${encodeURIComponent(type)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            transactionsList = res.data || [];
            renderLedgerTable(transactionsList);

            if (res.pagination) {
                document.getElementById('currentBalanceDisplay').textContent = formatRupiah(res.pagination.current_balance);
                if (res.pagination.stats) {
                    document.getElementById('totalInflowDisplay').textContent = formatRupiah(res.pagination.stats.total_inflow);
                    document.getElementById('totalOutflowDisplay').textContent = formatRupiah(res.pagination.stats.total_outflow);
                }

                // Render pending disbursements
                renderPendingDisbursements(res.pagination.pending_disbursement || []);
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Gagal memuat kas kecil: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Terjadi gangguan koneksi server.</td></tr>`;
    }
}

function renderPendingDisbursements(items) {
    const section = document.getElementById('sectionPendingDisbursement');
    const tbody = document.getElementById('pendingDisbursementTableBody');
    document.getElementById('pendingDisburseCount').textContent = `${items.length} Tiket`;

    if (!items || items.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    tbody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold font-monospace text-dark">${escapeHtml(item.ticket_number)}</td>
            <td class="fw-semibold text-dark">${escapeHtml(item.title)}</td>
            <td><span class="badge bg-light text-dark border text-uppercase">${escapeHtml(item.category)}</span></td>
            <td class="fw-bold text-success">${formatRupiah(item.amount)}</td>
            <td class="small text-muted">${new Date(item.approved_at).toLocaleString('id-ID')}</td>
            <td class="pe-4 text-end">
                <button class="btn btn-sm btn-success" onclick="disburseExpenseTicket(${item.id}, '${escapeHtml(item.ticket_number)}', ${item.amount}, '${escapeHtml(item.title)}')">
                    <i class="bi bi-cash-stack me-1"></i> Cairkan Sekarang
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLedgerTable(items) {
    const tbody = document.getElementById('pettyCashTableBody');
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    Belum ada transaksi pada mutasi kas kecil.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    items.forEach(item => {
        const tr = document.createElement('tr');
        const isOut = item.transaction_type === 'outflow';
        const typeBadge = isOut
            ? '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-arrow-up-right me-1"></i>Kas Keluar</span>'
            : '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-arrow-down-left me-1"></i>Kas Masuk</span>';

        const nominalFormatted = (isOut ? '- ' : '+ ') + formatRupiah(item.amount);
        const ticketDisplay = item.ticket_number
            ? `<a href="/frontend/pages/hrga/expense-requests.html" class="badge bg-light text-primary font-monospace border text-decoration-none">${escapeHtml(item.ticket_number)}</a>`
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
                <div class="small text-muted">Petugas: ${escapeHtml(item.creator_name)}</div>
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

function openTransactionModal(type = 'outflow') {
    const form = document.getElementById('formTransaction');
    form.reset();

    document.getElementById('inputTxType').value = type;
    document.getElementById('inputExpenseId').value = '';
    document.getElementById('alertLinkedTicket').style.display = 'none';

    const titleEl = document.getElementById('transactionModalTitle');
    const submitBtn = document.getElementById('btnSubmitTx');

    if (type === 'inflow') {
        titleEl.innerHTML = `<i class="bi bi-plus-circle text-success me-2"></i>Top Up / Tambah Saldo Kas Kecil`;
        submitBtn.className = 'btn btn-success';
        submitBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Simpan Kas Masuk`;
    } else {
        titleEl.innerHTML = `<i class="bi bi-dash-circle text-danger me-2"></i>Catat Kas Keluar Operasional`;
        submitBtn.className = 'btn btn-danger';
        submitBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Simpan Kas Keluar`;
    }

    txModal.show();
}

function disburseExpenseTicket(expenseId, ticketNumber, amount, title) {
    const form = document.getElementById('formTransaction');
    form.reset();

    document.getElementById('inputTxType').value = 'outflow';
    document.getElementById('inputExpenseId').value = expenseId;
    document.getElementById('inputAmount').value = amount;
    document.getElementById('inputDescription').value = `Pencairan tiket ${ticketNumber}: ${title}`;

    const alertEl = document.getElementById('alertLinkedTicket');
    alertEl.style.display = 'block';
    document.getElementById('displayLinkedTicket').textContent = `${ticketNumber} - ${title}`;

    const titleEl = document.getElementById('transactionModalTitle');
    titleEl.innerHTML = `<i class="bi bi-cash-coin text-primary me-2"></i>Pencairan Tiket Pengajuan Biaya`;

    const submitBtn = document.getElementById('btnSubmitTx');
    submitBtn.className = 'btn btn-primary';
    submitBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Konfirmasi Pencairan Dana`;

    txModal.show();
}

async function handleSaveTransaction(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitTx');
    const form = e.target;
    const formData = new FormData(form);

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Menyimpan...`;

    try {
        const res = await fetch('/backend/api/hrga/petty-cash.php', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message || 'Transaksi kas berhasil dicatat.', 'success');
            txModal.hide();
            form.reset();
            loadPettyCashData();
        } else {
            showToast(data.message || 'Gagal menyimpan transaksi kas.', 'danger');
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Simpan Transaksi`;
    }
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
