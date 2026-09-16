let currentUser = null;
let matrixData = null;
let currentRoles = [];
let currentModules = {};

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (![1, 7].includes(parseInt(currentUser.role_id))) {
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('access_control', currentUser);
    renderHeader(currentUser);

    await loadAccessControlData();
    await loadUsersForOverride();
    setupFormHandlers();
});

async function loadAccessControlData() {
    try {
        const res = await apiGet('/backend/api/it/access-control.php');
        if (res.success && res.data) {
            matrixData = res.data;
            currentRoles = res.data.roles || [];
            currentModules = res.data.modules || {};

            renderMatrixTable(res.data.matrix);
            renderOverridesTable(res.data.overrides);
            populateModuleDropdown(res.data.modules);
        }
    } catch (e) {
        console.error("Gagal memuat access control:", e);
        showToast("Terjadi kesalahan saat memuat data access control.", "danger");
    }
}

function renderMatrixTable(matrixList) {
    const tbody = document.getElementById('matrixTableBody');
    if (!tbody) return;

    // Build lookup: [module_code][role_id] = { can_view, can_create, ... }
    const lookup = {};
    matrixList.forEach(m => {
        if (!lookup[m.module_code]) lookup[m.module_code] = {};
        lookup[m.module_code][m.role_id] = m;
    });

    tbody.innerHTML = '';
    Object.keys(currentModules).forEach(modCode => {
        const mod = currentModules[modCode];
        const tr = document.createElement('tr');

        let html = `
            <td class="text-start ps-3">
                <div class="fw-bold text-dark">${mod.name}</div>
                <small class="text-muted"><i class="bi bi-folder2 me-1"></i>${mod.category} (<code>${modCode}</code>)</small>
            </td>
        `;

        currentRoles.forEach(role => {
            const perm = (lookup[modCode] && lookup[modCode][role.id]) ? lookup[modCode][role.id] : null;
            const badges = [];

            if (perm) {
                if (parseInt(perm.can_view)) badges.push('<span class="badge bg-success-subtle text-success border border-success" title="View">V</span>');
                if (parseInt(perm.can_create)) badges.push('<span class="badge bg-primary-subtle text-primary border border-primary" title="Create">C</span>');
                if (parseInt(perm.can_edit)) badges.push('<span class="badge bg-warning-subtle text-warning-emphasis border border-warning" title="Edit">E</span>');
                if (parseInt(perm.can_delete)) badges.push('<span class="badge bg-danger-subtle text-danger border border-danger" title="Delete">D</span>');
                if (parseInt(perm.can_approve)) badges.push('<span class="badge bg-info-subtle text-info-emphasis border border-info" title="Approve">A</span>');
            }

            const isCellAdmin = (role.id === 7);
            const content = badges.length > 0 
                ? badges.join(' ') 
                : '<span class="text-muted small">—</span>';

            html += `
                <td>
                    <button type="button" class="btn btn-sm btn-light border py-1 px-2 text-nowrap" 
                            onclick="openEditPermission(${role.id}, '${role.name}', '${modCode}', '${mod.name}')" 
                            title="${isCellAdmin ? 'Role Admin memiliki akses penuh' : 'Klik untuk mengubah hak akses'}">
                        ${content}
                    </button>
                </td>
            `;
        });

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function renderOverridesTable(overridesList) {
    const tbody = document.getElementById('overridesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!overridesList || overridesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada pengecualian hak akses (user override) yang aktif.</td></tr>`;
        return;
    }

    overridesList.forEach(item => {
        const tr = document.createElement('tr');
        const isGrant = (item.override_type === 'grant');
        const typeBadge = isGrant 
            ? `<span class="badge bg-success"><i class="bi bi-plus-circle me-1"></i>GRANT</span>`
            : `<span class="badge bg-danger"><i class="bi bi-dash-circle me-1"></i>DENY</span>`;

        const isExpired = (item.status === 'expired');
        const statusBadge = isExpired 
            ? `<span class="badge bg-secondary">EXPIRED</span>`
            : `<span class="badge bg-success-subtle text-success border border-success">AKTIF</span>`;

        tr.innerHTML = `
            <td class="ps-3">
                <div class="fw-bold text-dark">${item.user_name}</div>
                <small class="text-muted">${item.user_email} (${item.role_name})</small>
            </td>
            <td><code>${item.module_code}</code></td>
            <td><span class="badge bg-light text-dark border text-uppercase">${item.action}</span></td>
            <td>${typeBadge}</td>
            <td style="max-width: 200px;" class="text-truncate" title="${item.reason}">${item.reason}</td>
            <td><small class="text-muted">${item.granted_by_email}</small></td>
            <td><small>${item.expires_at ? item.expires_at : 'Permanen'}</small></td>
            <td>${statusBadge}</td>
            <td class="text-center pe-3">
                <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2" onclick="revokeOverride(${item.id})">
                    <i class="bi bi-trash me-1"></i> Cabut
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateModuleDropdown(modules) {
    const sel = document.getElementById('overrideModuleCode');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih Modul --</option>';
    Object.keys(modules).forEach(code => {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${modules[code].name} (${modules[code].category})`;
        sel.appendChild(opt);
    });
}

async function loadUsersForOverride() {
    const sel = document.getElementById('overrideUserId');
    if (!sel) return;
    try {
        const res = await apiGet('/backend/api/users/index.php');
        if (res.success && res.data) {
            sel.innerHTML = '<option value="">-- Pilih Karyawan --</option>';
            res.data.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = `${u.email} (${u.role_name})`;
                sel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Gagal memuat users:", e);
    }
}

window.openEditPermission = function(roleId, roleName, moduleCode, moduleName) {
    if (roleId === 7) {
        showToast('Role Admin selalu memiliki hak akses penuh untuk seluruh modul.', 'info');
        return;
    }

    if (moduleCode === 'access_control' && parseInt(currentUser.role_id) !== 7) {
        showToast('Hanya role Admin yang berwenang mengubah izin pada modul Access Control.', 'warning');
        return;
    }

    document.getElementById('editRoleId').value = roleId;
    document.getElementById('editModuleCode').value = moduleCode;
    document.getElementById('editRoleName').textContent = roleName;
    document.getElementById('editModuleName').textContent = moduleName;

    // Find current permissions in matrix
    let cur = null;
    if (matrixData && matrixData.matrix) {
        cur = matrixData.matrix.find(m => m.role_id == roleId && m.module_code == moduleCode);
    }

    document.getElementById('permView').checked = cur ? parseInt(cur.can_view) === 1 : false;
    document.getElementById('permCreate').checked = cur ? parseInt(cur.can_create) === 1 : false;
    document.getElementById('permEdit').checked = cur ? parseInt(cur.can_edit) === 1 : false;
    document.getElementById('permDelete').checked = cur ? parseInt(cur.can_delete) === 1 : false;
    document.getElementById('permApprove').checked = cur ? parseInt(cur.can_approve) === 1 : false;

    const modal = new bootstrap.Modal(document.getElementById('modalEditPermission'));
    modal.show();
};

function setupFormHandlers() {
    // 1. Form Edit Matrix
    const formEdit = document.getElementById('formEditPermission');
    if (formEdit) {
        formEdit.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSavePermission');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...`;

            const payload = {
                action: 'update_matrix',
                role_id: parseInt(document.getElementById('editRoleId').value),
                module_code: document.getElementById('editModuleCode').value,
                can_view: document.getElementById('permView').checked ? 1 : 0,
                can_create: document.getElementById('permCreate').checked ? 1 : 0,
                can_edit: document.getElementById('permEdit').checked ? 1 : 0,
                can_delete: document.getElementById('permDelete').checked ? 1 : 0,
                can_approve: document.getElementById('permApprove').checked ? 1 : 0
            };

            try {
                const res = await apiPost('/backend/api/it/access-control.php', payload);
                if (res.success) {
                    showToast(res.message, 'success');
                    bootstrap.Modal.getInstance(document.getElementById('modalEditPermission')).hide();
                    await loadAccessControlData();
                } else {
                    showToast(res.message, 'danger');
                }
            } catch (err) {
                showToast('Terjadi kesalahan jaringan.', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }

    // 2. Form Add Override
    const formAdd = document.getElementById('formAddOverride');
    if (formAdd) {
        formAdd.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitOverride');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...`;

            let expVal = document.getElementById('overrideExpiresAt').value;
            if (expVal) expVal = expVal.replace('T', ' ') + ':00';

            const payload = {
                action: 'add_override',
                user_id: parseInt(document.getElementById('overrideUserId').value),
                module_code: document.getElementById('overrideModuleCode').value,
                action_name: document.getElementById('overrideAction').value,
                override_type: document.getElementById('overrideType').value,
                reason: document.getElementById('overrideReason').value.trim(),
                expires_at: expVal || null
            };

            try {
                const res = await apiPost('/backend/api/it/access-control.php', payload);
                if (res.success) {
                    showToast(res.message, 'success');
                    formAdd.reset();
                    bootstrap.Modal.getInstance(document.getElementById('modalAddOverride')).hide();
                    await loadAccessControlData();
                } else {
                    showToast(res.message, 'danger');
                }
            } catch (err) {
                showToast('Terjadi kesalahan saat menyimpan override.', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }
}

window.revokeOverride = async function(overrideId) {
    if (!confirm('Apakah Anda yakin ingin mencabut hak akses override ini? User akan kembali menggunakan izin default dari peranan/role-nya.')) {
        return;
    }

    try {
        const res = await apiPost('/backend/api/it/access-control.php', {
            action: 'revoke_override',
            override_id: overrideId
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadAccessControlData();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal mencabut override.', 'danger');
    }
};
