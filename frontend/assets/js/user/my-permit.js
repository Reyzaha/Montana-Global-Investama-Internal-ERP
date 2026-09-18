let currentUser = null;
let permitTypes = [];
const permitModal = new bootstrap.Modal(document.getElementById('newPermitModal'));

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    renderSidebar('my_permit', currentUser);
    renderHeader(currentUser);

    loadPermitTypes();
    loadMyPermits();
    loadMyLeaveBalance();

    document.getElementById('permit_type_id').addEventListener('change', handleCategoryChange);
    document.getElementById('permit_sub_type_id').addEventListener('change', handleSubTypeChange);
});

let currentSubPermits = [];

async function handleCategoryChange(e) {
    const categoryId = parseInt(e.target.value);
    const subSelect = document.getElementById('permit_sub_type_id');
    const hint = document.getElementById('subTypeDetailHint');
    const reqLabel = document.getElementById('attachmentRequiredLabel');

    subSelect.innerHTML = '<option value="">-- Pilih Sub-Jenis Izin --</option>';
    hint.textContent = '';
    reqLabel.classList.add('d-none');

    if (!categoryId) {
        subSelect.disabled = true;
        return;
    }

    subSelect.disabled = true;
    subSelect.innerHTML = '<option value="">Memuat opsi sub-izin...</option>';

    try {
        const res = await apiGet(`/backend/api/hrga/permit-sub-types.php?category_id=${categoryId}&status=active`);
        if (res.success && res.data) {
            currentSubPermits = res.data;
            subSelect.innerHTML = '<option value="">-- Pilih Sub-Jenis Izin --</option>';
            currentSubPermits.forEach(st => {
                const opt = document.createElement('option');
                opt.value = st.id;
                let text = st.name;
                if (st.quota_days) text += ` (Maks. ${st.quota_days} hari)`;
                opt.textContent = text;
                subSelect.appendChild(opt);
            });
            subSelect.disabled = false;
        }
    } catch (err) {
        console.error("Gagal memuat sub-izin:", err);
        subSelect.innerHTML = '<option value="">Gagal memuat sub-izin</option>';
    }
}

function handleSubTypeChange(e) {
    const subId = parseInt(e.target.value);
    const sub = currentSubPermits.find(x => x.id === subId);
    const reqLabel = document.getElementById('attachmentRequiredLabel');
    const hint = document.getElementById('subTypeDetailHint');

    if (!sub) {
        reqLabel.classList.add('d-none');
        hint.textContent = '';
        return;
    }

    if (parseInt(sub.requires_attachment) === 1) {
        reqLabel.classList.remove('d-none');
        const label = sub.attachment_label || 'Surat Bukti / Dokumen Pendukung';
        hint.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-circle me-1"></i>Wajib lampiran: <strong>${label}</strong></span>`;
    } else {
        reqLabel.classList.add('d-none');
        hint.textContent = sub.description || '';
    }
}
async function loadMyLeaveBalance() {
    try {
        const res = await apiGet('/backend/api/user/leave-balance.php');
        if (res.success && res.data) {
            const d = res.data;
            document.getElementById('leaveRemainingDisplay').textContent = `${d.remaining_days} Hari`;
            document.getElementById('leaveUsedDisplay').textContent = `${d.used_days} Hari`;
            const total = parseFloat(d.quota_days) + parseFloat(d.carried_over_days);
            document.getElementById('leaveTotalDisplay').textContent = `${total} Hari`;
            document.getElementById('leaveQuotaDetails').textContent = `Tahun ${d.year} (Kuota: ${d.quota_days} + Carry: ${d.carried_over_days})`;
        }
    } catch (e) {
        console.error('Failed to load leave balance', e);
    }
}

async function loadPermitTypes() {
    try {
        const res = await apiGet('/backend/api/hrga/permit-types.php');
        if (res.success) {
            permitTypes = res.data;
            const select = document.getElementById('permit_type_id');
            select.innerHTML = '<option value="">-- Pilih Kategori Utama --</option>';
            permitTypes.forEach(pt => {
                const opt = document.createElement('option');
                opt.value = pt.id;
                opt.textContent = pt.name;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Failed to load permit types', e);
    }
}

function handleTypeChange(e) {
    const id = parseInt(e.target.value);
    const pt = permitTypes.find(x => x.id === id);
    const reqLabel = document.getElementById('attachmentRequiredLabel');
    if (pt && pt.requires_attachment) {
        reqLabel.classList.remove('d-none');
    } else {
        reqLabel.classList.add('d-none');
    }
}

async function loadMyPermits() {
    const tbody = document.getElementById('myPermitTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Loading...</td></tr>`;

    try {
        // user_id is automatically filtered in backend if role is not HRGA/PM
        const res = await apiGet('/backend/api/hrga/permits.php');
        if (res.success) {
            if (res.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">You have no permit requests yet.</td></tr>`;
                return;
            }
            tbody.innerHTML = '';
            res.data.forEach(p => {
                const tr = document.createElement('tr');
                const badge = getStatusBadge(p.status);
                const attachIcon = p.has_attachment > 0 ? '<i class="bi bi-paperclip text-muted"></i> ' : '';
                let typeDisplay = p.permit_type_name;
                if (p.permit_sub_type_name) {
                    typeDisplay += ` <small class="text-primary fw-normal">(${p.permit_sub_type_name})</small>`;
                }

                tr.innerHTML = `
                    <td class="ps-4 text-muted">#${p.id}</td>
                    <td class="fw-semibold">${attachIcon}${typeDisplay}</td>
                    <td class="small"><i class="bi bi-calendar-event me-1 text-muted"></i> ${p.start_date} s/d ${p.end_date}</td>
                    <td>${badge}</td>
                    <td class="small text-muted">${new Date(p.created_at).toLocaleString('id-ID')}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Network error</td></tr>`;
    }
}

function getStatusBadge(status) {
    const map = {
        'pending_hrga': '<span class="badge bg-warning text-dark">Pending HRGA</span>',
        'pending_pm': '<span class="badge bg-info text-dark">Pending PM</span>',
        'approved': '<span class="badge bg-success">Approved</span>',
        'rejected': '<span class="badge bg-danger">Rejected</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

async function submitPermit(e) {
    e.preventDefault();
    const alertDiv = document.getElementById('formAlert');
    alertDiv.classList.add('d-none');
    
    const typeId = parseInt(document.getElementById('permit_type_id').value);
    const subTypeId = document.getElementById('permit_sub_type_id').value;
    const pt = permitTypes.find(x => x.id === typeId);
    const sub = currentSubPermits.find(x => x.id == subTypeId);
    const fileInput = document.getElementById('attachment');
    
    // Check required attachment from category or sub-type
    const requiresAttachment = (pt && pt.requires_attachment) || (sub && parseInt(sub.requires_attachment) === 1);
    if (requiresAttachment && fileInput.files.length === 0) {
        const label = (sub && sub.attachment_label) ? sub.attachment_label : 'Dokumen Lampiran';
        alertDiv.textContent = `Lampiran berkas (${label}) wajib diunggah untuk jenis izin ini.`;
        alertDiv.classList.remove('d-none');
        return;
    }

    const formData = new FormData();
    formData.append('permit_type_id', typeId);
    if (subTypeId) {
        formData.append('permit_sub_type_id', subTypeId);
    }
    formData.append('start_date', document.getElementById('start_date').value);
    formData.append('end_date', document.getElementById('end_date').value);
    formData.append('description', document.getElementById('description').value);
    if (fileInput.files.length > 0) {
        formData.append('attachment', fileInput.files[0]);
    }

    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Submitting...';

    try {
        const response = await fetch('/backend/api/hrga/permits.php', {
            method: 'POST',
            body: formData
        });
        const res = await response.json();

        if (res.success) {
            showToast('Permit request submitted successfully.', 'success');
            permitModal.hide();
            document.getElementById('newPermitForm').reset();
            document.getElementById('permit_sub_type_id').disabled = true;
            document.getElementById('subTypeDetailHint').textContent = '';
            loadMyPermits();
            loadMyLeaveBalance();
        } else {
            alertDiv.textContent = res.message;
            alertDiv.classList.remove('d-none');
        }
    } catch (err) {
        alertDiv.textContent = 'A network error occurred.';
        alertDiv.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Request';
    }
}
