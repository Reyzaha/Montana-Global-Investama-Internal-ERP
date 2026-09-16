/**
 * ==========================================================
 * MGI ERP - PM Expense Verification JavaScript Logic
 * ==========================================================
 */

let currentUser = null;
let currentTab = 'pending_verification';
let verifyModal = null;
let verificationTickets = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (currentUser.role_id !== 6 && currentUser.role_id !== 7) {
        showToast('Akses ditolak. Halaman ini khusus Project Manager.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('pm_verification', currentUser);
    renderHeader(currentUser);

    const mEl = document.getElementById('verifyGoodsModal');
    if (mEl) verifyModal = new bootstrap.Modal(mEl);

    loadVerificationTickets();

    document.getElementById('searchTicket').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadVerificationTickets();
    });
});

function switchVerifTab(tab) {
    currentTab = tab;

    document.getElementById('tabPendingVerif').classList.toggle('active', tab === 'pending_verification');
    document.getElementById('tabHistoryVerif').classList.toggle('active', tab === 'completed');

    const titleMap = {
        'pending_verification': 'Daftar Tiket Menunggu Pengecekan Fisik',
        'completed': 'Riwayat Tiket Terverifikasi & Sah'
    };
    document.getElementById('cardTitleDisplay').textContent = titleMap[tab] || 'Daftar Tiket';

    loadVerificationTickets();
}

async function loadVerificationTickets() {
    const tbody = document.getElementById('verificationTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data verifikasi...</td></tr>`;

    const search = document.getElementById('searchTicket').value.trim();
    let url = `/backend/api/pm/expense-verify.php?status=${encodeURIComponent(currentTab)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            verificationTickets = res.data || [];
            renderVerificationTable(verificationTickets);
            updateTabCounters();
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Gagal memuat data: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Terjadi gangguan jaringan server.</td></tr>`;
    }
}

async function updateTabCounters() {
    try {
        const res = await apiGet(`/backend/api/hrga/expense-requests.php?limit=1`);
        if (res.success && res.pagination && res.pagination.stats) {
            const st = res.pagination.stats;
            document.getElementById('badgePendingVerif').textContent = st.pending_verification_count || 0;
            document.getElementById('badgeHistoryVerif').textContent = st.completed_count || 0;
        }
    } catch (e) {
        console.error('Count update error:', e);
    }
}

function renderVerificationTable(items) {
    const tbody = document.getElementById('verificationTableBody');
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    Tidak ada tiket pengajuan biaya pada kategori status ini.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    items.forEach(t => {
        const tr = document.createElement('tr');
        const badge = getStatusBadge(t.status);

        const photoBadge = t.item_photo_path 
            ? `<a href="/backend/${t.item_photo_path}" target="_blank" class="badge bg-light text-success border text-decoration-none me-1"><i class="bi bi-camera"></i> Foto Barang</a>` 
            : '<span class="badge bg-light text-muted border">Tanpa Foto</span>';

        const receiptBadge = t.receipt_doc_path 
            ? `<a href="/backend/${t.receipt_doc_path}" target="_blank" class="badge bg-light text-primary border text-decoration-none"><i class="bi bi-receipt"></i> Nota</a>` 
            : '<span class="badge bg-light text-muted border">Tanpa Nota</span>';

        tr.innerHTML = `
            <td class="ps-4 fw-bold font-monospace text-dark">${escapeHtml(t.ticket_number)}</td>
            <td>
                <div class="fw-semibold text-dark">${escapeHtml(t.title)}</div>
                <div class="small text-muted"><span class="badge bg-light text-dark border text-uppercase">${escapeHtml(t.category)}</span> - ${t.items ? t.items.length : 1} item</div>
            </td>
            <td>
                <div class="small fw-semibold text-dark">${escapeHtml(t.creator_name)}</div>
                <div class="text-muted" style="font-size: 0.72rem;">${escapeHtml(t.creator_email)}</div>
            </td>
            <td><span class="fw-semibold text-muted font-monospace">${formatRupiah(t.amount)}</span></td>
            <td><span class="fw-bold text-success font-monospace">${t.realized_amount ? formatRupiah(t.realized_amount) : formatRupiah(t.amount)}</span></td>
            <td>${photoBadge} ${receiptBadge}</td>
            <td>${badge}</td>
            <td class="pe-4 text-end">
                <button class="btn btn-sm ${t.status === 'pending_verification' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="openInspectionModal(${t.id})">
                    <i class="bi bi-shield-check me-1"></i> ${t.status === 'pending_verification' ? 'Periksa Barang' : 'Detail'}
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    const map = {
        'pending_verification': '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>Perlu Dicek PM</span>',
        'completed': '<span class="badge bg-success"><i class="bi bi-patch-check-fill me-1"></i>Sah / Terverifikasi</span>',
        'disbursed': '<span class="badge bg-success"><i class="bi bi-cash-stack me-1"></i>Telah Dicairkan</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function openInspectionModal(id) {
    const t = verificationTickets.find(item => parseInt(item.id) === parseInt(id));
    if (!t) return;

    const body = document.getElementById('verifyModalBody');
    const footer = document.getElementById('verifyModalFooter');

    // Build items table
    let itemsHtml = '<div class="text-muted small">Tidak ada rincian item.</div>';
    if (t.items && t.items.length > 0) {
        itemsHtml = `
            <table class="table table-bordered table-sm mb-0">
                <thead class="table-light small">
                    <tr>
                        <th style="width: 25px;" class="text-center">No</th>
                        <th>Nama Barang</th>
                        <th class="text-center">Qty</th>
                        <th class="text-center">Satuan</th>
                        <th class="text-end">Harga</th>
                        <th class="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${t.items.map((it, idx) => `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td><strong>${escapeHtml(it.item_name)}</strong></td>
                            <td class="text-center">${parseFloat(it.qty)}</td>
                            <td class="text-center">${escapeHtml(it.unit)}</td>
                            <td class="text-end font-monospace">${formatRupiah(it.unit_price)}</td>
                            <td class="text-end font-monospace fw-semibold">${formatRupiah(it.total_price)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot class="table-light small">
                    <tr>
                        <th colspan="5" class="text-end fw-bold">Grand Total Estimasi:</th>
                        <th class="text-end text-primary font-monospace fw-bold">${formatRupiah(t.amount)}</th>
                    </tr>
                    ${t.realized_amount ? `
                        <tr>
                            <th colspan="5" class="text-end fw-bold text-success">Realisasi Belanja Riil:</th>
                            <th class="text-end text-success font-monospace fw-bold">${formatRupiah(t.realized_amount)}</th>
                        </tr>
                    ` : ''}
                </tfoot>
            </table>
        `;
    }

    // Goods photo element
    const photoHtml = t.item_photo_path ? `
        <div class="border rounded p-2 text-center bg-light">
            <a href="/backend/${t.item_photo_path}" target="_blank" title="Klik untuk perbesar">
                <img src="/backend/${t.item_photo_path}" class="img-fluid rounded border shadow-sm" style="max-height: 240px; object-fit: contain;">
            </a>
            <div class="mt-1 small text-muted"><i class="bi bi-zoom-in me-1"></i> Klik foto untuk melihat ukuran penuh</div>
        </div>
    ` : '<div class="alert alert-warning small">Belum ada foto fisik barang diunggah.</div>';

    // Receipt document element
    const receiptHtml = t.receipt_doc_path ? `
        <div class="border rounded p-2 mt-2 bg-light">
            <div class="d-flex justify-content-between align-items-center">
                <span class="small fw-semibold text-dark"><i class="bi bi-receipt me-1 text-primary"></i> Dokumen Nota / Kuitansi:</span>
                <a href="/backend/${t.receipt_doc_path}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-box-arrow-up-right me-1"></i> Buka Nota
                </a>
            </div>
            ${pregMatchImg(t.receipt_doc_path) ? `
                <div class="mt-2 text-center">
                    <img src="/backend/${t.receipt_doc_path}" class="img-fluid rounded border" style="max-height: 140px; object-fit: contain;">
                </div>
            ` : ''}
        </div>
    ` : '<div class="alert alert-warning small mt-2">Belum ada dokumen nota diunggah.</div>';

    body.innerHTML = `
        <div class="alert alert-light border d-flex justify-content-between align-items-center mb-3">
            <div>
                <span class="text-muted small d-block">Nomor Tiket:</span>
                <span class="fw-bold font-monospace fs-5 text-dark">${escapeHtml(t.ticket_number)}</span>
            </div>
            <div class="text-end">
                <span class="text-muted small d-block">Status Tiket:</span>
                ${getStatusBadge(t.status)}
            </div>
        </div>

        <div class="row g-3 mb-3">
            <div class="col-md-7">
                <div class="fw-bold text-dark fs-6 mb-1">${escapeHtml(t.title)}</div>
                <div class="small text-muted mb-2">Diajukan oleh: <strong>${escapeHtml(t.creator_name)}</strong> (HRGA)</div>

                <div class="mb-3">
                    <label class="small text-muted text-uppercase fw-bold mb-1">Rincian Item yang Disetujui PM:</label>
                    ${itemsHtml}
                </div>

                ${t.realization_notes ? `
                    <div class="p-2 border rounded bg-light mb-3">
                        <span class="small fw-bold text-dark d-block mb-1"><i class="bi bi-chat-left-text me-1 text-info"></i> Catatan Belanja HRGA:</span>
                        <div class="small text-secondary">${escapeHtml(t.realization_notes)}</div>
                    </div>
                ` : ''}

                ${t.verification_notes ? `
                    <div class="p-2 border rounded bg-info-subtle border-info-subtle mb-3">
                        <span class="small fw-bold text-primary d-block mb-1"><i class="bi bi-shield-check me-1"></i> Catatan Verifikasi PM:</span>
                        <div class="small text-dark">${escapeHtml(t.verification_notes)}</div>
                    </div>
                ` : ''}
            </div>

            <div class="col-md-5">
                <label class="small text-muted text-uppercase fw-bold mb-1"><i class="bi bi-camera me-1 text-danger"></i> Foto Fisik Barang Asli:</label>
                ${photoHtml}
                ${receiptHtml}
            </div>
        </div>

        ${t.status === 'pending_verification' ? `
            <div class="border-top pt-3">
                <label class="form-label small fw-bold text-dark">Catatan Hasil Verifikasi PM (Wajib diisi jika menolak/revisi):</label>
                <textarea id="pmVerifNotes" class="form-control" rows="2" placeholder="Tuliskan catatan verifikasi kesesuaian fisik barang..."></textarea>
            </div>
        ` : ''}
    `;

    if (t.status === 'pending_verification') {
        footer.innerHTML = `
            <div>
                <a href="/backend/api/hrga/expense-pdf.php?id=${t.id}" target="_blank" class="btn btn-outline-secondary">
                    <i class="bi bi-printer me-1"></i> Cetak Voucher
                </a>
            </div>
            <div class="d-flex gap-2">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-danger" onclick="submitVerificationDecision(${t.id}, 'reject')">
                    <i class="bi bi-x-circle me-1"></i> Tolak / Revisi Bukti
                </button>
                <button type="button" class="btn btn-success" onclick="submitVerificationDecision(${t.id}, 'approve')">
                    <i class="bi bi-check2-circle me-1"></i> ACC & Sahkan Pembelian
                </button>
            </div>
        `;
    } else {
        footer.innerHTML = `
            <div>
                <a href="/backend/api/hrga/expense-pdf.php?id=${t.id}" target="_blank" class="btn btn-outline-primary">
                    <i class="bi bi-printer me-1"></i> Cetak Voucher Sah (1 Lembar)
                </a>
            </div>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
        `;
    }

    verifyModal.show();
}

async function submitVerificationDecision(id, action) {
    const notes = document.getElementById('pmVerifNotes')?.value.trim() || '';

    if (action === 'reject' && !notes) {
        showToast('Catatan alasan revisi/penolakan fisik barang wajib diisi.', 'warning');
        return;
    }

    const confirmMsg = (action === 'approve')
        ? 'Apakah barang yang difoto dan nota sudah sesuai? Tiket akan disahkan dan otomatis tercatat mutasi pengeluaran kas di Petty Cash.'
        : 'Kembalikan tiket ini ke HRGA untuk revisi foto barang / nota?';

    if (!confirm(confirmMsg)) return;

    try {
        const res = await apiPost('/backend/api/pm/expense-verify.php', {
            id,
            action,
            notes
        });

        if (res.success) {
            showToast(res.message || 'Verifikasi berhasil diproses.', 'success');
            verifyModal.hide();
            loadVerificationTickets();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Terjadi gangguan jaringan saat memproses keputusan.', 'danger');
    }
}

function printList() {
    let url = `/backend/api/hrga/expense-list-print.php?status=${encodeURIComponent(currentTab)}`;
    window.open(url, '_blank');
}

function pregMatchImg(path) {
    if (!path) return false;
    return /\.(jpg|jpeg|png|webp)$/i.test(path);
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
