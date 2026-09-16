/**
 * ==========================================================
 * MGI ERP - HRGA Expense Realization JavaScript Logic
 * ==========================================================
 */

let currentUser = null;
let currentTab = 'approved';
let realizationModal = null;
let ticketsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (currentUser.role_id !== 2 && currentUser.role_id !== 7) {
        showToast('Akses ditolak. Halaman ini khusus HRGA.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_realization', currentUser);
    renderHeader(currentUser);

    const mEl = document.getElementById('uploadRealizationModal');
    if (mEl) realizationModal = new bootstrap.Modal(mEl);

    loadRealizationTickets();

    document.getElementById('formUploadRealization').addEventListener('submit', handleUploadRealization);

    document.getElementById('searchTicket').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadRealizationTickets();
    });
});

function switchTab(tab) {
    currentTab = tab;

    document.getElementById('tabReady').classList.toggle('active', tab === 'approved');
    document.getElementById('tabPendingVerif').classList.toggle('active', tab === 'pending_verification');
    document.getElementById('tabCompleted').classList.toggle('active', tab === 'completed');

    const titleMap = {
        'approved': 'Daftar Tiket Siap Belanja & Upload Bukti',
        'pending_verification': 'Daftar Tiket Sedang Diperiksa PM',
        'completed': 'Daftar Tiket Selesai & Terverifikasi Sah'
    };
    document.getElementById('cardTitleDisplay').textContent = titleMap[tab] || 'Daftar Tiket';

    loadRealizationTickets();
}

async function loadRealizationTickets() {
    const tbody = document.getElementById('realizationTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat tiket...</td></tr>`;

    const search = document.getElementById('searchTicket').value.trim();
    let url = `/backend/api/hrga/expense-realization.php?status=${encodeURIComponent(currentTab)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            ticketsList = res.data || [];
            renderRealizationTable(ticketsList);
            updateBadgeCounters();
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat tiket: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Terjadi gangguan jaringan server.</td></tr>`;
    }
}

async function updateBadgeCounters() {
    try {
        const res = await apiGet(`/backend/api/hrga/expense-requests.php?limit=1`);
        if (res.success && res.pagination && res.pagination.stats) {
            const st = res.pagination.stats;
            document.getElementById('badgeCountReady').textContent = st.approved_count || 0;
            document.getElementById('badgeCountVerif').textContent = st.pending_verification_count || 0;
        }
    } catch (e) {
        console.error('Count update error:', e);
    }
}

function renderRealizationTable(items) {
    const tbody = document.getElementById('realizationTableBody');
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    Tidak ada tiket pada status ini.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    items.forEach(t => {
        const tr = document.createElement('tr');
        const badge = getStatusBadge(t.status);

        let actionHtml = '';
        if (t.status === 'approved') {
            actionHtml = `
                <button class="btn btn-sm btn-primary" onclick="openUploadModal(${t.id})">
                    <i class="bi bi-camera me-1"></i> Upload Foto & Nota
                </button>
            `;
        } else {
            actionHtml = `
                <div class="btn-group btn-group-sm">
                    <a href="/backend/api/hrga/expense-pdf.php?id=${t.id}" target="_blank" class="btn btn-outline-secondary" title="Cetak Voucher">
                        <i class="bi bi-printer"></i>
                    </a>
                    ${t.item_photo_path ? `<a href="/backend/${t.item_photo_path}" target="_blank" class="btn btn-outline-success" title="Lihat Foto Barang"><i class="bi bi-camera"></i></a>` : ''}
                    ${t.receipt_doc_path ? `<a href="/backend/${t.receipt_doc_path}" target="_blank" class="btn btn-outline-primary" title="Lihat Nota"><i class="bi bi-receipt"></i></a>` : ''}
                </div>
            `;
        }

        tr.innerHTML = `
            <td class="ps-4 fw-bold font-monospace text-dark">${escapeHtml(t.ticket_number)}</td>
            <td>
                <div class="fw-semibold text-dark">${escapeHtml(t.title)}</div>
                <div class="small text-muted">${t.total_items || 1} item barang</div>
            </td>
            <td><span class="badge bg-light text-dark border text-uppercase">${escapeHtml(t.category)}</span></td>
            <td>
                <span class="fw-bold text-primary font-monospace">${formatRupiah(t.estimated_amount)}</span>
                ${t.realized_amount ? `<div class="small text-success fw-bold font-monospace">Riil: ${formatRupiah(t.realized_amount)}</div>` : ''}
            </td>
            <td class="small text-muted">${t.approved_at ? new Date(t.approved_at).toLocaleString('id-ID') : '-'}</td>
            <td>${badge}</td>
            <td class="pe-4 text-end">${actionHtml}</td>
        `;

        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    const map = {
        'approved': '<span class="badge bg-info text-dark"><i class="bi bi-cart-check me-1"></i>Siap Belanja</span>',
        'pending_verification': '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Menunggu Cek PM</span>',
        'completed': '<span class="badge bg-success"><i class="bi bi-patch-check-fill me-1"></i>Selesai Sah</span>',
        'disbursed': '<span class="badge bg-success"><i class="bi bi-cash-stack me-1"></i>Telah Dicairkan</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function openUploadModal(id) {
    const ticket = ticketsList.find(t => parseInt(t.id) === parseInt(id));
    if (!ticket) return;

    document.getElementById('formUploadRealization').reset();
    document.getElementById('realizeTicketId').value = ticket.id;
    document.getElementById('displayTicketNumber').textContent = ticket.ticket_number;
    document.getElementById('displayTicketTitle').textContent = ticket.title;
    document.getElementById('displayEstimatedAmount').textContent = formatRupiah(ticket.estimated_amount);
    document.getElementById('inputRealizedAmount').value = ticket.estimated_amount;

    document.getElementById('previewPhotoBox').style.display = 'none';
    document.getElementById('imgPreviewGoods').src = '';

    // Render items checklist
    const itemsContainer = document.getElementById('displayItemsList');
    if (ticket.items && ticket.items.length > 0) {
        itemsContainer.innerHTML = ticket.items.map((it, idx) => `
            <div class="d-flex justify-content-between py-1 border-bottom">
                <span><strong>${idx + 1}. ${escapeHtml(it.item_name)}</strong> (${parseFloat(it.qty)} ${escapeHtml(it.unit)})</span>
                <span class="font-monospace text-muted">${formatRupiah(it.total_price)}</span>
            </div>
        `).join('');
    } else {
        itemsContainer.innerHTML = `<div class="text-muted small">${escapeHtml(ticket.title)} - ${formatRupiah(ticket.estimated_amount)}</div>`;
    }

    realizationModal.show();
}

function previewImage(input, previewBoxId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imgPreviewGoods').src = e.target.result;
            document.getElementById(previewBoxId).style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function handleUploadRealization(e) {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('btnSubmitRealization');
    const formData = new FormData(form);

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Mengunggah bukti...`;

    try {
        const res = await fetch('/backend/api/hrga/expense-realization.php', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message || 'Bukti barang dan nota berhasil dikirim ke PM.', 'success');
            realizationModal.hide();
            form.reset();
            switchTab('pending_verification');
        } else {
            showToast(data.message || 'Gagal mengunggah bukti belanja.', 'danger');
        }
    } catch (err) {
        showToast('Terjadi gangguan jaringan saat mengunggah.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-send me-1"></i> Kirim Bukti Barang ke PM`;
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
