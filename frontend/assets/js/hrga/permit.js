let currentUser = null;
let permitDetailModal = null;
let modalMainType = null;
let modalSubType = null;

let mainTypesCache = [];
let subTypesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    // Must be HRGA (2), PM (6), or Admin (7)
    if (![2, 6, 7].includes(parseInt(currentUser.role_id))) {
        showToast('Unauthorized role.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_permit', currentUser);
    renderHeader(currentUser);

    // Initialize Bootstrap Modals
    permitDetailModal = new bootstrap.Modal(document.getElementById('permitDetailModal'));
    modalMainType = new bootstrap.Modal(document.getElementById('modalMainType'));
    modalSubType = new bootstrap.Modal(document.getElementById('modalSubType'));

    // If PM (role 6), hide management tabs and keep only requests tab
    if (currentUser.role_id === 6) {
        document.getElementById('tab-main-types-pill').parentElement.style.display = 'none';
        document.getElementById('tab-sub-types-pill').parentElement.style.display = 'none';
    }

    // Load initial data
    loadPermits();
    loadMainTypes();
    loadSubTypes();

    // Event listeners for Tab 1 (Permit Requests)
    document.getElementById('btnApplyFilter').addEventListener('click', loadPermits);
    document.getElementById('filterStatus').addEventListener('change', loadPermits);

    // Event listeners for Tab 3 (Sub-types filters)
    document.getElementById('filterSubCategory').addEventListener('change', loadSubTypes);
    document.getElementById('filterSubStatus').addEventListener('change', loadSubTypes);

    // Setup Form Handlers
    setupMainTypeFormHandler();
    setupSubTypeFormHandler();
});

// ==========================================================
// TAB 1: PERMIT REQUESTS & APPROVAL
// ==========================================================

async function loadPermits() {
    const tbody = document.getElementById('permitTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat pengajuan permit...</td></tr>`;

    const status = document.getElementById('filterStatus').value;
    let url = `/backend/api/hrga/permits.php?page=1&limit=50`;
    if (status) url += `&status=${status}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            renderPermits(res.data);
            updateSummaryCounts(res.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat permit: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Kendala koneksi server.</td></tr>`;
    }
}

function updateSummaryCounts(data) {
    let p_hrga = 0, p_pm = 0, app = 0, rej = 0;
    data.forEach(p => {
        if (p.status === 'pending_hrga') p_hrga++;
        if (p.status === 'pending_pm') p_pm++;
        if (p.status === 'approved') app++;
        if (p.status === 'rejected') rej++;
    });
    
    document.getElementById('countPendingHrga').textContent = p_hrga;
    document.getElementById('countPendingPm').textContent = p_pm;
    document.getElementById('countApproved').textContent = app;
    document.getElementById('countRejected').textContent = rej;
}

function renderPermits(data) {
    const tbody = document.getElementById('permitTableBody');
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada permohonan permit.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    data.forEach(p => {
        const tr = document.createElement('tr');
        
        const badge = getStatusBadge(p.status);
        const hasAttachment = parseInt(p.has_attachment) > 0;
        const isSakit = (p.permit_type_code === 'sakit') || (p.permit_type_name && p.permit_type_name.toLowerCase().includes('sakit'));
        const isSakitTanpaSurat = isSakit && (!hasAttachment || (p.permit_sub_type_name && p.permit_sub_type_name.toLowerCase().includes('tanpa surat')));

        let attachmentBadge = hasAttachment 
            ? `<span class="badge bg-success-subtle text-success border border-success"><i class="bi bi-paperclip me-1"></i>Ada Bukti Berkas</span>`
            : `<span class="badge bg-danger-subtle text-danger border border-danger fw-semibold"><i class="bi bi-exclamation-octagon-fill me-1"></i>Tanpa Berkas</span>`;

        if (isSakitTanpaSurat) {
            attachmentBadge += `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning fw-bold d-block mt-1"><i class="bi bi-exclamation-triangle-fill text-warning me-1"></i>Sakit Tanpa Surat Dokter</span>`;
        }

        let typeDisplay = `<span class="fw-semibold text-dark">${p.permit_type_name}</span>`;
        if (p.permit_sub_type_name) {
            let subText = p.permit_sub_type_name;
            if (p.permit_time) {
                subText += ` - Pkl ${p.permit_time.substring(0, 5)} WIB`;
            }
            typeDisplay += ` <small class="text-primary fw-normal d-block">(${subText})</small>`;
        }

        const employeeDisplay = p.employee_name 
            ? `<div><span class="fw-semibold text-dark">${p.employee_name}</span><div class="text-muted small">${p.employee_email}</div></div>`
            : `<span>${p.employee_email}</span>`;

        tr.innerHTML = `
            <td class="ps-4 fw-semibold text-muted">#${p.id}</td>
            <td>${employeeDisplay}</td>
            <td>
                <div>${typeDisplay}</div>
                <div class="mt-1">${attachmentBadge}</div>
            </td>
            <td>
                <div class="small"><i class="bi bi-calendar-event me-1 text-muted"></i> ${p.start_date} s/d ${p.end_date}</div>
            </td>
            <td>${badge}</td>
            <td class="small text-muted">${new Date(p.created_at).toLocaleString('id-ID')}</td>
            <td class="pe-4 text-end">
                <button class="btn btn-sm btn-outline-primary" onclick="viewPermit(${p.id})">
                    <i class="bi bi-eye me-1"></i> Review
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    const map = {
        'pending_hrga': '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>Pending HRGA</span>',
        'pending_pm': '<span class="badge bg-info text-dark"><i class="bi bi-clock me-1"></i>Pending PM</span>',
        'approved': '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Approved</span>',
        'rejected': '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Rejected</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

async function viewPermit(id) {
    const body = document.getElementById('permitDetailBody');
    const footer = document.getElementById('permitDetailFooter');
    
    body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
    footer.innerHTML = '';
    permitDetailModal.show();

    try {
        const res = await apiGet(`/backend/api/hrga/permits-detail.php?id=${id}`);
        if (!res.success) {
            body.innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
            return;
        }

        const p = res.data;
        let attachmentsHtml = '';
        if (p.attachments && p.attachments.length > 0) {
            attachmentsHtml = p.attachments.map(a => `
                <a href="/backend/${a.file_path}" target="_blank" class="badge bg-light text-dark border p-2 text-decoration-none me-2">
                    <i class="bi bi-file-earmark-text text-primary me-1"></i> ${a.original_name}
                </a>
            `).join('');
        } else {
            attachmentsHtml = `
                <div class="alert alert-danger d-flex align-items-center mb-0 py-2 border-danger">
                    <i class="bi bi-exclamation-triangle-fill text-danger fs-5 me-2 flex-shrink-0"></i>
                    <div class="small">
                        <strong class="text-danger">Catatan Lampiran:</strong> Pemohon <span class="fw-bold text-decoration-underline">tidak mengunggah foto / surat bukti</span> pada pengajuan izin ini.
                    </div>
                </div>
            `;
        }

        let typeDisplay = p.permit_type_name;
        if (p.permit_sub_type_name) {
            typeDisplay += ` <span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-normal ms-1">${p.permit_sub_type_name}</span>`;
        }

        const isSakit = (p.permit_type_code === 'sakit') || (p.permit_type_name && p.permit_type_name.toLowerCase().includes('sakit'));
        const hasAttachment = (p.attachments && p.attachments.length > 0) || p.has_attachment;
        const isSakitTanpaSurat = isSakit && (!hasAttachment || (p.permit_sub_type_name && p.permit_sub_type_name.toLowerCase().includes('tanpa surat')));

        let sakitNoticeHtml = '';
        if (isSakitTanpaSurat) {
            sakitNoticeHtml = `
                <div class="alert alert-warning border border-warning d-flex align-items-center mb-3 p-3 rounded-3 shadow-sm">
                    <i class="bi bi-exclamation-triangle-fill text-warning fs-3 me-3 flex-shrink-0"></i>
                    <div>
                        <div class="fw-bold text-dark">Catatan Khusus HRGA & Approver:</div>
                        <div class="small text-dark mt-1">
                            Karyawan mengajukan <strong>Izin Sakit TANPA melampirkan Surat Keterangan Dokter</strong> dari RS/Klinik. Mohon periksa deskripsi pengajuan dan berikan catatan sebelum persetujuan/penolakan.
                        </div>
                    </div>
                </div>
            `;
        }

        let timeRowHtml = '';
        if (p.permit_time) {
            const timeFormatted = p.permit_time.substring(0, 5);
            timeRowHtml = `
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Jam Terlambat / Pulang Cepat</div>
                    <div class="fw-bold text-primary"><i class="bi bi-clock-fill me-1"></i>Pkl ${timeFormatted} WIB</div>
                </div>
            `;
        }

        let historyHtml = '';
        if (p.history.length > 0) {
            historyHtml = p.history.map(h => `
                <div class="mb-2 pb-2 border-bottom">
                    <div class="d-flex justify-content-between">
                        <span class="fw-semibold small">${h.approver_role} (${h.approver_email})</span>
                        <span class="small text-muted">${new Date(h.approved_at).toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                        ${h.status === 'approved' ? '<span class="badge bg-success small">Approved</span>' : '<span class="badge bg-danger small">Rejected</span>'}
                        ${h.note ? `<span class="small ms-2 text-muted fst-italic">"${h.note}"</span>` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            historyHtml = '<span class="text-muted small">Belum ada riwayat approval.</span>';
        }

        body.innerHTML = `
            ${sakitNoticeHtml}

            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Employee</div>
                    <div class="fw-semibold">${p.employee_name || p.employee_email}</div>
                    <div class="small text-muted">${p.employee_email}</div>
                </div>
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Permit Type</div>
                    <div>${typeDisplay}</div>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Duration</div>
                    <div>${p.start_date} <i class="bi bi-arrow-right mx-1"></i> ${p.end_date}</div>
                </div>
                ${timeRowHtml}
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Status</div>
                    <div>${getStatusBadge(p.status)}</div>
                </div>
            </div>

            <div class="mb-4">
                <div class="small text-muted text-uppercase fw-bold mb-1">Description / Reason</div>
                <div class="bg-light p-3 rounded small">${p.description}</div>
            </div>

            <div class="mb-4">
                <div class="small text-muted text-uppercase fw-bold mb-2">Attachments</div>
                <div>${attachmentsHtml}</div>
            </div>

            <div>
                <div class="small text-muted text-uppercase fw-bold mb-2">Approval History</div>
                <div class="bg-light p-3 rounded">${historyHtml}</div>
            </div>
        `;

        // Render Action Buttons based on role and status
        if (
            (currentUser.role_id === 2 && p.status === 'pending_hrga') ||
            (currentUser.role_id === 6 && p.status === 'pending_pm') ||
            (currentUser.role_id === 7 && ['pending_hrga', 'pending_pm'].includes(p.status))
        ) {
            footer.innerHTML = `
                <div class="w-100 mb-3">
                    <label class="form-label small fw-bold">Catatan Approval / Alasan Penolakan</label>
                    <textarea id="actionNote" class="form-control" rows="2" placeholder="Tuliskan catatan..."></textarea>
                </div>
                <div class="w-100 d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-danger" onclick="handleAction(${p.id}, 'reject')">Tolak (Reject)</button>
                    <button class="btn btn-success" onclick="handleAction(${p.id}, 'approve')">Setujui (Approve)</button>
                </div>
            `;
        } else {
            footer.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>`;
        }

    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">Terjadi kesalahan teknis saat memuat detail permit.</div>`;
    }
}

async function handleAction(id, action) {
    const note = document.getElementById('actionNote').value;
    if (action === 'reject' && !note.trim()) {
        showToast('Wajib memberikan alasan saat menolak pengajuan permit.', 'warning');
        return;
    }

    const endpoint = action === 'approve' ? `/backend/api/hrga/permits-approve.php?id=${id}` : `/backend/api/hrga/permits-reject.php?id=${id}`;
    
    if (!confirm(`Apakah Anda yakin ingin memproses ${action.toUpperCase()} untuk permohonan permit ini?`)) return;

    try {
        const res = await apiPost(endpoint, { note });
        if (res.success) {
            showToast(`Permit berhasil di-${action}.`, 'success');
            permitDetailModal.hide();
            loadPermits();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal memproses aksi.', 'danger');
    }
}

// ==========================================================
// TAB 2: CRUD 3 LABEL UTAMA (IZIN, SAKIT, CUTI)
// ==========================================================

async function loadMainTypes() {
    const tbody = document.getElementById('mainTypeTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data label utama...</td></tr>`;

    try {
        const res = await apiGet('/backend/api/hrga/permit-types.php?status=all');
        if (res.success && res.data) {
            mainTypesCache = res.data;
            renderMainTypes(res.data);
            populateMainTypeSelectOptions(res.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">${res.message || 'Gagal memuat kategori'}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">Kendala koneksi memuat label utama.</td></tr>`;
    }
}

function renderMainTypes(items) {
    const tbody = document.getElementById('mainTypeTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada label utama permit terdaftar.</td></tr>`;
        return;
    }

    items.forEach((item, index) => {
        const tr = document.createElement('tr');

        // Badge styling for 3 main labels
        let badgeColor = 'bg-secondary';
        const code = (item.code || '').toLowerCase();
        if (code === 'izin') badgeColor = 'bg-info text-dark';
        else if (code === 'sakit') badgeColor = 'bg-warning text-dark';
        else if (code === 'cuti') badgeColor = 'bg-success';
        else badgeColor = 'bg-primary';

        const attachBadge = item.requires_attachment 
            ? `<span class="badge bg-danger-subtle text-danger border border-danger"><i class="bi bi-paperclip me-1"></i>Wajib</span>`
            : `<span class="badge bg-light text-muted border">Opsional</span>`;

        const isActive = item.is_active;
        const activeSwitch = `
            <div class="form-check form-switch d-inline-block">
                <input class="form-check-input" type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleMainTypeStatus(${item.id}, this.checked)">
            </div>
        `;

        tr.innerHTML = `
            <td class="ps-4 fw-semibold text-muted">${index + 1}</td>
            <td><code>${item.code}</code></td>
            <td>
                <span class="badge ${badgeColor} px-2 py-1 fs-6">${item.name}</span>
            </td>
            <td><small class="text-muted">${item.description || '-'}</small></td>
            <td>${attachBadge}</td>
            <td><span class="badge bg-light text-dark border">${item.total_sub_types || 0} sub-jenis</span></td>
            <td><span class="badge bg-light text-muted border">${item.total_permits || 0} pengajuan</span></td>
            <td>${activeSwitch}</td>
            <td class="pe-4 text-end text-nowrap">
                <button class="btn btn-outline-primary btn-sm py-0 px-2 me-1" onclick="openEditMainTypeModal(${item.id})" title="Edit Label Utama">
                    <i class="bi bi-pencil me-1"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="deleteMainType(${item.id}, '${escapeHtml(item.name)}')" title="Hapus Label Utama">
                    <i class="bi bi-trash me-1"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openCreateMainTypeModal = function() {
    document.getElementById('modalMainTypeTitle').innerHTML = '<i class="bi bi-tag-fill text-primary me-2"></i>Tambah Label Utama Baru';
    document.getElementById('mainTypeId').value = '';
    document.getElementById('formMainType').reset();
    document.getElementById('mainTypeRequiresAttachment').checked = false;
    modalMainType.show();
};

window.openEditMainTypeModal = function(id) {
    const item = mainTypesCache.find(x => x.id == id);
    if (!item) return;

    document.getElementById('modalMainTypeTitle').innerHTML = '<i class="bi bi-tag-fill text-primary me-2"></i>Edit Label Utama';
    document.getElementById('mainTypeId').value = item.id;
    document.getElementById('mainTypeName').value = item.name;
    document.getElementById('mainTypeCode').value = item.code;
    document.getElementById('mainTypeDescription').value = item.description || '';
    document.getElementById('mainTypeRequiresAttachment').checked = item.requires_attachment;

    modalMainType.show();
};

function setupMainTypeFormHandler() {
    const form = document.getElementById('formMainType');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveMainType');
        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...`;

        const id = document.getElementById('mainTypeId').value;
        const payload = {
            action: id ? 'update' : 'create',
            id: id ? parseInt(id) : null,
            name: document.getElementById('mainTypeName').value.trim(),
            code: document.getElementById('mainTypeCode').value.trim(),
            description: document.getElementById('mainTypeDescription').value.trim(),
            requires_attachment: document.getElementById('mainTypeRequiresAttachment').checked ? 1 : 0
        };

        try {
            const res = await apiPost('/backend/api/hrga/permit-types.php', payload);
            if (res.success) {
                showToast(res.message, 'success');
                modalMainType.hide();
                await loadMainTypes();
                await loadSubTypes(); // Refresh sub-types so categories update
            } else {
                showToast(res.message, 'danger');
            }
        } catch (err) {
            showToast('Terjadi kesalahan saat menyimpan label utama.', 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    });
}

window.toggleMainTypeStatus = async function(id, isChecked) {
    try {
        const res = await apiPost('/backend/api/hrga/permit-types.php', {
            action: 'toggle_status',
            id: id,
            is_active: isChecked ? 1 : 0
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadMainTypes();
            await loadSubTypes();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal mengubah status label utama.', 'danger');
    }
};

window.deleteMainType = async function(id, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus label utama "${name}"?\n\nJika kategori ini memiliki sub-jenis atau sudah pernah diajukan oleh karyawan, sistem akan otomatis menonaktifkannya agar arsip data tetap aman.`)) {
        return;
    }

    try {
        const res = await apiPost('/backend/api/hrga/permit-types.php', {
            action: 'delete',
            id: id
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadMainTypes();
            await loadSubTypes();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal menghapus label utama.', 'danger');
    }
};

// ==========================================================
// TAB 3: CRUD SUB-JENIS DARI LABEL UTAMA (permit_sub_types)
// ==========================================================

function populateMainTypeSelectOptions(mainTypes) {
    // Populate filter dropdown in Tab 3
    const filterSelect = document.getElementById('filterSubCategory');
    const modalSelect = document.getElementById('subCategoryId');

    if (filterSelect) {
        const curVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="0">Semua Label Utama (Izin, Sakit, Cuti)</option>';
        mainTypes.forEach(mt => {
            const opt = document.createElement('option');
            opt.value = mt.id;
            opt.textContent = `${mt.name} (${mt.code})`;
            filterSelect.appendChild(opt);
        });
        if (curVal) filterSelect.value = curVal;
    }

    if (modalSelect) {
        const curVal = modalSelect.value;
        modalSelect.innerHTML = '<option value="">-- Pilih Label Utama --</option>';
        mainTypes.forEach(mt => {
            if (mt.is_active) {
                const opt = document.createElement('option');
                opt.value = mt.id;
                opt.textContent = `${mt.name} (${mt.code})`;
                modalSelect.appendChild(opt);
            }
        });
        if (curVal) modalSelect.value = curVal;
    }
}

async function loadSubTypes() {
    const tbody = document.getElementById('subTypeTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat sub-jenis izin...</td></tr>`;

    const catId = document.getElementById('filterSubCategory') ? document.getElementById('filterSubCategory').value : 0;
    const status = document.getElementById('filterSubStatus') ? document.getElementById('filterSubStatus').value : 'active';

    try {
        let url = `/backend/api/hrga/permit-sub-types.php?status=${status}`;
        if (parseInt(catId) > 0) url += `&category_id=${catId}`;

        const res = await apiGet(url);
        if (res.success && res.data) {
            subTypesCache = res.data;
            renderSubTypes(res.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${res.message || 'Gagal memuat sub-jenis'}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Kendala koneksi memuat sub-jenis izin.</td></tr>`;
    }
}

function renderSubTypes(items) {
    const tbody = document.getElementById('subTypeTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada sub-jenis izin yang terdaftar.</td></tr>`;
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');

        let catBadge = 'bg-secondary';
        const catCode = (item.category_code || '').toLowerCase();
        if (catCode === 'izin') catBadge = 'bg-info text-dark';
        else if (catCode === 'sakit') catBadge = 'bg-warning text-dark';
        else if (catCode === 'cuti') catBadge = 'bg-success';

        let quotaText = 'Tanpa Batas';
        if (item.quota_days !== null && parseFloat(item.quota_days) > 0) {
            quotaText = `${parseFloat(item.quota_days)} Hari / ${item.quota_period.replace('_', ' ')}`;
        }

        let attText = '<span class="badge bg-light text-muted border">Opsional</span>';
        if (parseInt(item.requires_attachment) === 1) {
            attText = `<span class="badge bg-danger-subtle text-danger border border-danger" title="${item.attachment_label || 'Wajib'}"><i class="bi bi-paperclip me-1"></i>Wajib</span>`;
        }

        let genderBadge = '<span class="badge bg-light text-dark border">Semua</span>';
        if (item.gender_restriction === 'female') {
            genderBadge = `<span class="badge bg-pink text-dark border" style="background-color: #fce4ec;"><i class="bi bi-gender-female me-1"></i>Perempuan</span>`;
        } else if (item.gender_restriction === 'male') {
            genderBadge = `<span class="badge bg-blue text-dark border" style="background-color: #e3f2fd;"><i class="bi bi-gender-male me-1"></i>Laki-laki</span>`;
        }

        const isPaidBadge = parseInt(item.is_paid) === 1 
            ? `<span class="badge bg-success-subtle text-success border border-success">Dibayar</span>` 
            : `<span class="badge bg-secondary">Unpaid</span>`;

        const isActive = (parseInt(item.is_active) === 1);
        const activeSwitch = `
            <div class="form-check form-switch d-inline-block">
                <input class="form-check-input" type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleSubTypeStatus(${item.id}, this.checked)">
            </div>
        `;

        tr.innerHTML = `
            <td class="ps-4">
                <div class="fw-bold text-dark">${item.name}</div>
                <small class="text-muted text-truncate d-inline-block" style="max-width: 250px;" title="${item.description || ''}">${item.description || '-'}</small>
            </td>
            <td><span class="badge ${catBadge}">${item.category_name}</span></td>
            <td><small class="fw-semibold">${quotaText}</small></td>
            <td>${attText}</td>
            <td>${genderBadge}</td>
            <td>${isPaidBadge}</td>
            <td>${activeSwitch}</td>
            <td class="pe-4 text-end text-nowrap">
                <button class="btn btn-outline-primary btn-sm py-0 px-2 me-1" onclick="openEditSubTypeModal(${item.id})" title="Edit Sub-Jenis">
                    <i class="bi bi-pencil me-1"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="deleteSubType(${item.id}, '${escapeHtml(item.name)}')" title="Hapus Sub-Jenis">
                    <i class="bi bi-trash me-1"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openCreateSubTypeModal = function() {
    document.getElementById('modalSubTypeTitle').innerHTML = '<i class="bi bi-diagram-3-fill text-primary me-2"></i>Tambah Sub-Jenis Izin Baru';
    document.getElementById('subTypeId').value = '';
    document.getElementById('formSubType').reset();
    document.getElementById('subRequiresAttachment').checked = false;
    modalSubType.show();
};

window.openEditSubTypeModal = function(id) {
    const item = subTypesCache.find(x => x.id == id);
    if (!item) return;

    document.getElementById('modalSubTypeTitle').innerHTML = '<i class="bi bi-diagram-3-fill text-primary me-2"></i>Edit Sub-Jenis Izin';
    document.getElementById('subTypeId').value = item.id;
    document.getElementById('subCategoryId').value = item.category_id;
    document.getElementById('subName').value = item.name;
    document.getElementById('subDescription').value = item.description || '';
    document.getElementById('subQuotaDays').value = item.quota_days !== null ? item.quota_days : '';
    document.getElementById('subQuotaPeriod').value = item.quota_period;
    document.getElementById('subGenderRestriction').value = item.gender_restriction;
    document.getElementById('subIsPaid').value = item.is_paid;
    document.getElementById('subRequiresAttachment').checked = (parseInt(item.requires_attachment) === 1);
    document.getElementById('subAttachmentLabel').value = item.attachment_label || '';

    modalSubType.show();
};

function setupSubTypeFormHandler() {
    const form = document.getElementById('formSubType');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveSubType');
        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...`;

        const id = document.getElementById('subTypeId').value;
        const payload = {
            action: id ? 'update' : 'create',
            id: id ? parseInt(id) : null,
            category_id: parseInt(document.getElementById('subCategoryId').value),
            name: document.getElementById('subName').value.trim(),
            description: document.getElementById('subDescription').value.trim(),
            quota_days: document.getElementById('subQuotaDays').value,
            quota_period: document.getElementById('subQuotaPeriod').value,
            gender_restriction: document.getElementById('subGenderRestriction').value,
            is_paid: parseInt(document.getElementById('subIsPaid').value),
            requires_attachment: document.getElementById('subRequiresAttachment').checked ? 1 : 0,
            attachment_label: document.getElementById('subAttachmentLabel').value.trim()
        };

        try {
            const res = await apiPost('/backend/api/hrga/permit-sub-types.php', payload);
            if (res.success) {
                showToast(res.message, 'success');
                modalSubType.hide();
                await loadSubTypes();
                await loadMainTypes(); // update total sub-types in Tab 2
            } else {
                showToast(res.message, 'danger');
            }
        } catch (err) {
            showToast('Terjadi kesalahan sistem saat menyimpan sub-izin.', 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    });
}

window.toggleSubTypeStatus = async function(id, isChecked) {
    try {
        const res = await apiPost('/backend/api/hrga/permit-sub-types.php', {
            action: 'toggle_status',
            id: id,
            is_active: isChecked ? 1 : 0
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadSubTypes();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal mengubah status sub-izin.', 'danger');
    }
};

window.deleteSubType = async function(id, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus sub-jenis izin "${name}"?\n\nJika sub-izin ini sudah pernah diajukan oleh karyawan, sistem akan otomatis menonaktifkannya agar arsip tetap aman.`)) {
        return;
    }

    try {
        const res = await apiPost('/backend/api/hrga/permit-sub-types.php', {
            action: 'delete',
            id: id
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadSubTypes();
            await loadMainTypes();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal menghapus sub-izin akibat kendala jaringan/server.', 'danger');
    }
};

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
