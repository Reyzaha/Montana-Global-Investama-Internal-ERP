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

    loadSubPermits();

    document.getElementById('filterCategory').addEventListener('change', loadSubPermits);
    document.getElementById('filterStatus').addEventListener('change', loadSubPermits);

    setupFormHandler();
});

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
            attachment_label: document.getElementById('subAttachmentLabel').value.trim()
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
}

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
