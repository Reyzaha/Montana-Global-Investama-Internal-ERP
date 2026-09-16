/**
 * ==========================================================
 * MGI ERP - PM Permit Approval JavaScript Logic
 * ==========================================================
 */

let currentUser = null;
let currentPermitModal = null;
let permitsList = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    // Must be PM (6) or Admin (7)
    if (currentUser.role_id !== 6 && currentUser.role_id !== 7) {
        showToast('Akses ditolak. Halaman ini khusus Project Manager.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('pm_permits', currentUser);
    renderHeader(currentUser);

    const modalEl = document.getElementById('permitDetailModal');
    if (modalEl) {
        currentPermitModal = new bootstrap.Modal(modalEl);
    }

    loadPermits();

    document.getElementById('btnApplyFilter').addEventListener('click', () => {
        loadPermits();
    });

    document.getElementById('searchPermit').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadPermits();
    });
});

async function loadPermits() {
    const tbody = document.getElementById('permitTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data permit...</td></tr>`;

    const status = document.getElementById('filterStatus').value;
    const search = document.getElementById('searchPermit').value.trim();

    let url = `/backend/api/pm/permits.php?page=1&limit=50&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            permitsList = res.data || [];
            renderPermitTable(permitsList);
            updateSummaryCounters();
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat permit: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Terjadi gangguan koneksi server.</td></tr>`;
    }
}

async function updateSummaryCounters() {
    try {
        // Fetch all permits without status filter to calculate counts accurately
        const res = await apiGet(`/backend/api/pm/permits.php?status=all&limit=200`);
        if (res.success) {
            let pendingPm = 0, approved = 0, rejected = 0;
            res.data.forEach(p => {
                if (p.status === 'pending_pm') pendingPm++;
                if (p.status === 'approved') approved++;
                if (p.status === 'rejected') rejected++;
            });
            document.getElementById('countPendingPm').textContent = pendingPm;
            document.getElementById('countApproved').textContent = approved;
            document.getElementById('countRejected').textContent = rejected;
            document.getElementById('countTotal').textContent = res.data.length;
        }
    } catch (e) {
        console.error('Count update error:', e);
    }
}

function renderPermitTable(items) {
    const tbody = document.getElementById('permitTableBody');
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                    Tidak ada data permit pada status yang dipilih.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    items.forEach(p => {
        const tr = document.createElement('tr');
        const badge = getStatusBadge(p.status);
        const attachmentBadge = p.attachment_path 
            ? `<a href="/backend/${p.attachment_path}" target="_blank" class="badge bg-light text-primary border me-1 text-decoration-none"><i class="bi bi-paperclip"></i> Lampiran</a>` 
            : '';

        const hrgaNote = p.hrga_approval_note 
            ? `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check2"></i> "${escapeHtml(p.hrga_approval_note)}"</span>` 
            : '<span class="text-muted small">-</span>';

        tr.innerHTML = `
            <td class="ps-4 fw-bold text-muted">#${p.id}</td>
            <td>
                <div class="fw-semibold text-dark">${escapeHtml(p.employee_name)}</div>
                <div class="small text-muted">${escapeHtml(p.employee_email)}</div>
            </td>
            <td>
                <span class="fw-medium">${escapeHtml(p.permit_type_name)}</span>
                <div class="mt-1">${attachmentBadge}</div>
            </td>
            <td>
                <div class="small"><i class="bi bi-calendar-event me-1 text-primary"></i> ${p.start_date} <i class="bi bi-arrow-right mx-1"></i> ${p.end_date}</div>
            </td>
            <td>${badge}</td>
            <td class="small">${hrgaNote}</td>
            <td class="pe-4 text-end">
                <button class="btn btn-sm ${p.status === 'pending_pm' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="viewPermitDetail(${p.id})">
                    <i class="bi bi-search me-1"></i> Review
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    const map = {
        'pending_hrga': '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Menunggu HRGA</span>',
        'pending_pm': '<span class="badge bg-info text-dark"><i class="bi bi-clock-history me-1"></i>Menunggu PM</span>',
        'approved': '<span class="badge bg-success"><i class="bi bi-patch-check-fill me-1"></i>Disetujui Sah</span>',
        'rejected': '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Ditolak</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

async function viewPermitDetail(id) {
    const body = document.getElementById('permitDetailBody');
    const footer = document.getElementById('permitDetailFooter');

    body.innerHTML = `<div class="text-center py-4"><div class="spinner-border spinner-border-sm me-2"></div> Memuat rincian permit...</div>`;
    footer.innerHTML = '';
    currentPermitModal.show();

    try {
        const res = await apiGet(`/backend/api/hrga/permits-detail.php?id=${id}`);
        if (!res.success) {
            body.innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
            return;
        }

        const p = res.data;

        let attachmentsHtml = '<div class="text-muted small">Tidak ada dokumen lampiran.</div>';
        if (p.attachments && p.attachments.length > 0) {
            attachmentsHtml = p.attachments.map(att => `
                <div class="d-flex align-items-center justify-content-between p-2 mb-2 bg-white border rounded">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-file-earmark-pdf fs-4 text-danger me-2"></i>
                        <div>
                            <div class="small fw-semibold text-dark">${escapeHtml(att.original_name)}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">${Math.round(att.file_size / 1024)} KB</div>
                        </div>
                    </div>
                    <a href="/backend/${att.file_path}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-eye me-1"></i> Lihat Dokumen
                    </a>
                </div>
            `).join('');
        }

        let historyHtml = '<div class="text-muted small">Belum ada catatan review.</div>';
        if (p.approvals && p.approvals.length > 0) {
            historyHtml = p.approvals.map(app => `
                <div class="border-start border-3 ${app.status === 'approved' ? 'border-success' : 'border-danger'} ps-3 mb-3">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold small text-dark">${escapeHtml(app.approver_name || 'Approver')} (${app.approver_role})</span>
                        <span class="small text-muted">${new Date(app.approved_at).toLocaleString('id-ID')}</span>
                    </div>
                    <div class="mt-1">
                        <span class="badge ${app.status === 'approved' ? 'bg-success' : 'bg-danger'}">${app.status.toUpperCase()}</span>
                        <span class="small ms-2 text-secondary">"${escapeHtml(app.note || 'Tanpa catatan')}"</span>
                    </div>
                </div>
            `).join('');
        }

        body.innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Nama Karyawan</label>
                    <div class="fw-bold text-dark fs-6">${escapeHtml(p.employee_name || p.employee_email)}</div>
                    <div class="small text-muted">${escapeHtml(p.employee_email)}</div>
                </div>
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Jenis Izin / Permit</label>
                    <div class="fw-bold text-primary fs-6">${escapeHtml(p.permit_type_name)}</div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Rentang Tanggal</label>
                    <div class="fw-semibold text-dark"><i class="bi bi-calendar3 me-1 text-primary"></i> ${p.start_date} s/d ${p.end_date}</div>
                </div>
                <div class="col-md-6">
                    <label class="small text-muted text-uppercase fw-bold">Status Saat Ini</label>
                    <div>${getStatusBadge(p.status)}</div>
                </div>
            </div>

            <div class="mb-4">
                <label class="small text-muted text-uppercase fw-bold">Alasan / Keterangan Karyawan</label>
                <div class="p-3 bg-light rounded border text-secondary small">${escapeHtml(p.description)}</div>
            </div>

            <div class="mb-4">
                <label class="small text-muted text-uppercase fw-bold">Dokumen Lampiran</label>
                <div class="mt-1">${attachmentsHtml}</div>
            </div>

            <div>
                <label class="small text-muted text-uppercase fw-bold mb-2">Riwayat Persetujuan</label>
                <div class="p-3 bg-light rounded border">${historyHtml}</div>
            </div>
        `;

        if (p.status === 'pending_pm') {
            footer.innerHTML = `
                <div class="w-100 mb-2">
                    <label class="form-label small fw-bold text-dark">Catatan Project Manager (Opsional jika ACC, Wajib jika Tolak):</label>
                    <textarea id="pmActionNote" class="form-control" rows="2" placeholder="Tuliskan catatan atau alasan..."></textarea>
                </div>
                <div class="w-100 d-flex justify-content-between align-items-center">
                    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Tutup</button>
                    <div class="d-flex gap-2">
                        <button class="btn btn-danger" onclick="submitPmDecision(${p.id}, 'reject')">
                            <i class="bi bi-x-circle me-1"></i> Tolak Permit
                        </button>
                        <button class="btn btn-success" onclick="submitPmDecision(${p.id}, 'approve')">
                            <i class="bi bi-check2-all me-1"></i> ACC Sah Permit
                        </button>
                    </div>
                </div>
            `;
        } else {
            footer.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>`;
        }

    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">Gagal mengambil detail permit.</div>`;
    }
}

async function submitPmDecision(id, action) {
    const note = document.getElementById('pmActionNote').value.trim();
    if (action === 'reject' && !note) {
        showToast('Harap cantumkan alasan penolakan pada kolom catatan.', 'warning');
        return;
    }

    const confirmMsg = (action === 'approve') 
        ? 'Apakah Anda yakin ingin mengesahkan (ACC SAH) pengajuan permit ini?' 
        : 'Apakah Anda yakin ingin menolak pengajuan permit ini?';

    if (!confirm(confirmMsg)) return;

    const endpoint = (action === 'approve')
        ? `/backend/api/hrga/permits-approve.php?id=${id}`
        : `/backend/api/hrga/permits-reject.php?id=${id}`;

    try {
        const res = await apiPost(endpoint, { note });
        if (res.success) {
            showToast(res.message || 'Keputusan berhasil disimpan.', 'success');
            currentPermitModal.hide();
            loadPermits();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Terjadi kesalahan jaringan saat memproses.', 'danger');
    }
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
