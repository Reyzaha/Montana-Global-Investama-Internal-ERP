let currentUser = null;
let subPermitsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (![2, 7].includes(parseInt(currentUser.role_id))) {
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('permit_sub_types', currentUser);
    renderHeader(currentUser);

    await loadCategories();
    loadSubPermits();

    document.getElementById('filterCategory').addEventListener('change', loadSubPermits);
    document.getElementById('filterStatus').addEventListener('change', loadSubPermits);

    setupFormHandler();
});

let categoriesCache = [];

async function loadCategories() {
    try {
        const res = await apiGet('/backend/api/hrga/permit-types.php?status=all');
        if (res.success && res.data) {
            categoriesCache = res.data;
            const filterCat = document.getElementById('filterCategory');
            const subCat = document.getElementById('subCategoryId');

            if (filterCat) {
                filterCat.innerHTML = '<option value="0">Semua Label Utama (Izin, Sakit, Cuti)</option>';
                res.data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = `${c.name} (${c.code})`;
                    filterCat.appendChild(opt);
                });
            }

            if (subCat) {
                subCat.innerHTML = '<option value="">-- Pilih Label Utama --</option>';
                res.data.forEach(c => {
                    if (c.is_active) {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = `${c.name} (${c.code})`;
                        subCat.appendChild(opt);
                    }
                });
            }
        }
    } catch (e) {
        console.error("Gagal memuat kategori:", e);
    }
}

async function loadSubPermits() {
    const catId = document.getElementById('filterCategory').value;
    const status = document.getElementById('filterStatus').value;
    const tbody = document.getElementById('subPermitTableBody');

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data...</td></tr>`;

    try {
        let url = `/backend/api/hrga/permit-sub-types.php?status=${status}`;
        if (parseInt(catId) > 0) url += `&category_id=${catId}`;

        const res = await apiGet(url);
        if (res.success && res.data) {
            subPermitsCache = res.data;
            renderSubPermitTable(res.data);
        }
    } catch (e) {
        console.error("Gagal memuat sub-izin:", e);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Gagal memuat data sub-jenis izin</td></tr>`;
    }
}

function renderSubPermitTable(items) {
    const tbody = document.getElementById('subPermitTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada sub-jenis izin yang terdaftar.</td></tr>`;
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');

        let catBadge = 'bg-secondary';
        if (item.category_code === 'izin') catBadge = 'bg-info text-dark';
        if (item.category_code === 'sakit') catBadge = 'bg-warning text-dark';
        if (item.category_code === 'cuti') catBadge = 'bg-success';

        let quotaText = 'Tanpa Batas';
        if (item.quota_days !== null && parseFloat(item.quota_days) > 0) {
            quotaText = `${parseFloat(item.quota_days)} Hari / ${item.quota_period.replace('_', ' ')}`;
        }

        let attText = '<span class="badge bg-light text-muted border">Opsional</span>';
        if (parseInt(item.requires_attachment) === 1) {
            attText = `<span class="badge bg-danger-subtle text-danger border border-danger" title="${item.attachment_label || 'Wajib'}"><i class="bi bi-paperclip me-1"></i>Wajib</span>`;
        }

        const isTimeActive = (parseInt(item.requires_time) === 1);
        const timeCell = `
            <div class="d-flex align-items-center gap-2">
                <div class="form-check form-switch mb-0" title="Klik untuk cepat ubah fitur jam">
                    <input class="form-check-input" type="checkbox" ${isTimeActive ? 'checked' : ''} onchange="toggleSubPermitTime(${item.id}, this.checked, '${escapeHtml(item.name)}')">
                </div>
                <div>
                    ${isTimeActive 
                        ? `<span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold d-inline-flex align-items-center" style="font-size: 0.72rem;">
                             <i class="bi bi-clock-fill me-1"></i>Wajib 2 Jam
                           </span>
                           <div class="text-muted" style="font-size: 0.68rem; line-height: 1.1;">Mulai s/d Selesai</div>`
                        : `<span class="badge bg-light text-muted border" style="font-size: 0.72rem;">
                             Harian
                           </span>
                           <div class="text-muted" style="font-size: 0.68rem; line-height: 1.1;">Tanpa Jam</div>`
                    }
                </div>
            </div>
        `;

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
                <input class="form-check-input" type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleSubPermitStatus(${item.id}, this.checked)">
            </div>
        `;

        tr.innerHTML = `
            <td class="ps-3">
                <div class="fw-bold text-dark">${item.name}</div>
                <small class="text-muted text-truncate d-inline-block" style="max-width: 260px;" title="${item.description || ''}">${item.description || '-'}</small>
            </td>
            <td><span class="badge ${catBadge}">${item.category_name}</span></td>
            <td><small class="fw-semibold">${quotaText}</small></td>
            <td>${attText}</td>
            <td>${timeCell}</td>
            <td>${genderBadge}</td>
            <td>${isPaidBadge}</td>
            <td>${activeSwitch}</td>
            <td class="text-center pe-3 text-nowrap">
                <button class="btn btn-outline-primary btn-sm py-0 px-2 me-1" onclick="openEditModal(${item.id})" title="Edit Sub-Izin">
                    <i class="bi bi-pencil me-1"></i> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="deleteSubPermit(${item.id}, '${escapeHtml(item.name)}')" title="Hapus Sub-Izin">
                    <i class="bi bi-trash me-1"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.openCreateModal = function() {
    document.getElementById('modalSubPermitTitle').textContent = 'Tambah Sub-Jenis Izin Baru';
    document.getElementById('subPermitId').value = '';
    document.getElementById('formSubPermit').reset();
    document.getElementById('subCategoryId').value = '1';
    document.getElementById('subRequiresAttachment').checked = false;
    document.getElementById('subRequiresTime').checked = false;
    updateSubRequiresTimePreview();
};

window.openEditModal = function(id) {
    const item = subPermitsCache.find(x => x.id == id);
    if (!item) return;

    document.getElementById('modalSubPermitTitle').textContent = 'Edit Sub-Jenis Izin';
    document.getElementById('subPermitId').value = item.id;
    document.getElementById('subCategoryId').value = item.category_id;
    document.getElementById('subName').value = item.name;
    document.getElementById('subDescription').value = item.description || '';
    document.getElementById('subQuotaDays').value = item.quota_days !== null ? item.quota_days : '';
    document.getElementById('subQuotaPeriod').value = item.quota_period;
    document.getElementById('subGenderRestriction').value = item.gender_restriction;
    document.getElementById('subIsPaid').value = item.is_paid;
    document.getElementById('subRequiresAttachment').checked = (parseInt(item.requires_attachment) === 1);
    document.getElementById('subAttachmentLabel').value = item.attachment_label || '';
    document.getElementById('subRequiresTime').checked = (parseInt(item.requires_time) === 1);
    updateSubRequiresTimePreview();

    const modal = new bootstrap.Modal(document.getElementById('modalSubPermit'));
    modal.show();
};

function setupFormHandler() {
    const form = document.getElementById('formSubPermit');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveSubPermit');
        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...`;

        const id = document.getElementById('subPermitId').value;
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
            attachment_label: document.getElementById('subAttachmentLabel').value.trim(),
            requires_time: document.getElementById('subRequiresTime').checked ? 1 : 0
        };

        try {
            const res = await apiPost('/backend/api/hrga/permit-sub-types.php', payload);
            if (res.success) {
                showToast(res.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalSubPermit')).hide();
                await loadSubPermits();
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

    const timeToggle = document.getElementById('subRequiresTime');
    if (timeToggle) {
        timeToggle.addEventListener('change', updateSubRequiresTimePreview);
    }
}

function updateSubRequiresTimePreview() {
    const chk = document.getElementById('subRequiresTime');
    const badge = document.getElementById('subRequiresTimeBadge');
    const preview = document.getElementById('subRequiresTimePreview');
    const card = document.getElementById('cardSubRequiresTime');

    if (!chk || !preview) return;

    if (chk.checked) {
        if (card) card.style.setProperty('border-color', '#3b82f6', 'important');
        if (badge) {
            badge.className = 'badge bg-primary text-white';
            badge.innerHTML = '<i class="bi bi-clock-fill me-1"></i>Fitur Jam AKTIF (2 Jam Wajib)';
        }
        preview.innerHTML = `
            <div class="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
                <div class="d-flex align-items-center text-primary fw-semibold small">
                    <i class="bi bi-eye-fill me-1"></i>Simulasi Tampilan Form Pengajuan Karyawan
                </div>
                <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size: 0.7rem;">
                    <i class="bi bi-check-lg me-1"></i>Input Wajib 2 Jam
                </span>
            </div>
            <div class="row g-2 mb-2">
                <div class="col-6">
                    <div class="p-2 border border-primary-subtle rounded bg-primary-subtle bg-opacity-10">
                        <div class="text-muted fw-semibold" style="font-size: 0.68rem;">1. JAM MULAI IZIN *</div>
                        <div class="fw-bold text-dark font-monospace d-flex align-items-center gap-1 mt-1">
                            <i class="bi bi-clock text-primary"></i>
                            <span>13:30</span>
                            <span class="text-muted small">WIB</span>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-2 border border-primary-subtle rounded bg-primary-subtle bg-opacity-10">
                        <div class="text-muted fw-semibold" style="font-size: 0.68rem;">2. JAM SELESAI IZIN *</div>
                        <div class="fw-bold text-dark font-monospace d-flex align-items-center gap-1 mt-1">
                            <i class="bi bi-clock-history text-primary"></i>
                            <span>17:00</span>
                            <span class="text-muted small">WIB</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="p-2 rounded bg-light border text-muted" style="font-size: 0.74rem;">
                <div class="d-flex align-items-start gap-1">
                    <i class="bi bi-info-circle-fill text-primary mt-1"></i>
                    <div>
                        <strong>Integrasi Sistem:</strong> Di Rekap Presensi & Dokumen Ekspor PDF Kehadiran, izin ini otomatis tercatat dengan format: 
                        <span class="badge bg-white text-dark border font-monospace ms-1">"Izin: [Nama Sub] (Pkl 13:30 - 17:00 WIB)"</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        if (card) card.style.setProperty('border-color', '#cbd5e1', 'important');
        if (badge) {
            badge.className = 'badge bg-secondary-subtle text-secondary border';
            badge.innerHTML = '<i class="bi bi-dash-circle me-1"></i>Izin Harian (Non-Aktif)';
        }
        preview.innerHTML = `
            <div class="d-flex align-items-center gap-2 p-1 text-muted">
                <i class="bi bi-calendar3 text-secondary fs-4"></i>
                <div style="font-size: 0.78rem;">
                    <div class="fw-semibold text-dark">Mode Standar (Izin Harian Penuh)</div>
                    <div>Karyawan hanya memilih tanggal pengajuan tanpa perlu mengisi rentang jam. Cocok untuk Cuti Tahunan, Sakit Rawat Inap, atau Izin 1 Hari Penuh.</div>
                </div>
            </div>
        `;
    }
}

window.toggleSubPermitTime = async function(id, isChecked, name) {
    try {
        const res = await apiPost('/backend/api/hrga/permit-sub-types.php', {
            action: 'toggle_time',
            id: id,
            requires_time: isChecked ? 1 : 0
        });
        if (res.success) {
            showToast(`Fitur jam untuk "${name || 'Sub-Izin'}" ${isChecked ? 'diaktifkan (Wajib Jam Mulai & Selesai)' : 'dinonaktifkan (Izin Harian)'}.`, 'success');
            await loadSubPermits();
        } else {
            showToast(res.message || 'Gagal mengubah fitur jam sub-izin.', 'danger');
            await loadSubPermits();
        }
    } catch (e) {
        showToast('Gagal mengubah fitur jam sub-izin.', 'danger');
        await loadSubPermits();
    }
};

window.toggleSubPermitStatus = async function(id, isChecked) {
    try {
        const res = await apiPost('/backend/api/hrga/permit-sub-types.php', {
            action: 'toggle_status',
            id: id,
            is_active: isChecked ? 1 : 0
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadSubPermits();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal mengubah status sub-izin.', 'danger');
    }
};

window.deleteSubPermit = async function(id, name) {
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
            await loadSubPermits();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal menghapus sub-izin akibat kendala jaringan/server.', 'danger');
    }
};
