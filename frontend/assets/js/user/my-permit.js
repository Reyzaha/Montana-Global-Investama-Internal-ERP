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
    const subContainer = document.getElementById('subTypeContainer');
    const sakitContainer = document.getElementById('sakitConditionContainer');
    const subSelect = document.getElementById('permit_sub_type_id');
    const subLabel = document.getElementById('subTypeLabel');
    const hint = document.getElementById('subTypeDetailHint');
    const reqLabel = document.getElementById('attachmentRequiredLabel');
    const attLabel = document.getElementById('attachmentMainLabel');
    const attHelp = document.getElementById('attachmentHelpText');

    subSelect.innerHTML = '<option value="">-- Pilih Jenis Pengajuan --</option>';
    hint.textContent = '';
    reqLabel.classList.add('d-none');

    if (!categoryId) {
        subSelect.disabled = true;
        subContainer.classList.remove('d-none');
        sakitContainer.classList.add('d-none');
        return;
    }

    const pt = permitTypes.find(x => x.id === categoryId);
    const isSakit = (pt && pt.code === 'sakit') || categoryId === 2;

    if (isSakit) {
        // Requirement 4: Sakit tidak perlu jenis sakit, hanya opsi surat dokter vs tanpa surat
        subContainer.classList.add('d-none');
        subSelect.removeAttribute('required');
        sakitContainer.classList.remove('d-none');
        handleSakitConditionChange();
    } else {
        subContainer.classList.remove('d-none');
        subSelect.setAttribute('required', 'required');
        sakitContainer.classList.add('d-none');
        
        if (attLabel) attLabel.innerHTML = 'Upload Bukti Lampiran <span id="attachmentRequiredLabel" class="text-danger d-none">*</span>';
        if (attHelp) attHelp.textContent = 'Maks. 5MB. Format JPG, PNG, atau PDF.';

        if (pt && pt.code === 'cuti') {
            subLabel.innerHTML = 'Jenis Cuti <span class="text-danger">*</span>';
        } else if (pt && pt.code === 'izin') {
            subLabel.innerHTML = 'Jenis Izin <span class="text-danger">*</span>';
        } else {
            subLabel.innerHTML = 'Sub-Jenis Izin / Cuti <span class="text-danger">*</span>';
        }
    }

    subSelect.disabled = true;
    subSelect.innerHTML = '<option value="">Memuat opsi...</option>';

    try {
        const res = await apiGet(`/backend/api/hrga/permit-sub-types.php?category_id=${categoryId}&status=active`);
        if (res.success && res.data) {
            currentSubPermits = res.data;
            subSelect.innerHTML = '<option value="">-- Pilih Jenis Pengajuan --</option>';
            currentSubPermits.forEach(st => {
                const opt = document.createElement('option');
                opt.value = st.id;
                let text = st.name;
                if (st.quota_days) text += ` (Kuota: ${st.quota_days} hari)`;
                opt.textContent = text;
                subSelect.appendChild(opt);
            });
            subSelect.disabled = false;
        }
    } catch (err) {
        console.error("Gagal memuat sub-izin:", err);
        subSelect.innerHTML = '<option value="">Gagal memuat opsi</option>';
    }
}

function handleSakitConditionChange() {
    const isDenganSurat = document.getElementById('sakitDenganSurat').checked;
    const reqLabel = document.getElementById('attachmentRequiredLabel');
    const attLabel = document.getElementById('attachmentMainLabel');
    const attHelp = document.getElementById('attachmentHelpText');
    
    if (isDenganSurat) {
        if (reqLabel) reqLabel.classList.remove('d-none');
        if (attLabel) attLabel.innerHTML = 'Upload Bukti Surat Sakit <span id="attachmentRequiredLabel" class="text-danger">* (Wajib)</span>';
        if (attHelp) attHelp.textContent = 'Wajib melampirkan Surat Keterangan Dokter dari RS / Klinik (Maks. 5MB, format JPG, PNG, PDF).';
    } else {
        if (reqLabel) reqLabel.classList.add('d-none');
        if (attLabel) attLabel.innerHTML = 'Upload Bukti Surat Sakit <span class="text-muted fw-normal small">(Opsional)</span>';
        if (attHelp) attHelp.textContent = 'Opsional: Dapat melampirkan foto resep obat atau keterangan dokter jika ada.';
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

    if (sub.name === 'Cuti Tahunan') {
        hint.innerHTML = `<span class="text-primary"><i class="bi bi-info-circle me-1"></i>Pengajuan ini akan memotong sisa kuota cuti tahunan Anda.</span>`;
    } else if (sub.name === 'Cuti Khusus') {
        hint.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>Cuti khusus berbayar resmi (tidak memotong saldo cuti tahunan).</span>`;
    } else if (parseInt(sub.requires_attachment) === 1) {
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
    let subTypeId = document.getElementById('permit_sub_type_id').value;
    const pt = permitTypes.find(x => x.id === typeId);
    const isSakit = (pt && pt.code === 'sakit') || typeId === 2;
    const fileInput = document.getElementById('attachment');
    
    // Check Sakit condition or standard sub-type
    if (isSakit) {
        const isDenganSurat = document.getElementById('sakitDenganSurat').checked;
        const targetSub = currentSubPermits.find(x => isDenganSurat ? x.name.includes('Surat Dokter') : x.name.includes('tanpa Surat'));
        if (targetSub) {
            subTypeId = targetSub.id;
        }
        if (isDenganSurat && fileInput.files.length === 0) {
            alertDiv.textContent = 'Bukti Surat Keterangan Dokter wajib diunggah untuk pengajuan sakit dengan surat dokter.';
            alertDiv.classList.remove('d-none');
            return;
        }
    } else {
        if (!subTypeId) {
            alertDiv.textContent = 'Silakan pilih jenis pengajuan (sub-jenis) terlebih dahulu.';
            alertDiv.classList.remove('d-none');
            return;
        }
        const sub = currentSubPermits.find(x => x.id == subTypeId);
        const requiresAttachment = (pt && pt.requires_attachment) || (sub && parseInt(sub.requires_attachment) === 1);
        if (requiresAttachment && fileInput.files.length === 0) {
            const label = (sub && sub.attachment_label) ? sub.attachment_label : 'Dokumen Lampiran';
            alertDiv.textContent = `Lampiran berkas (${label}) wajib diunggah untuk jenis pengajuan ini.`;
            alertDiv.classList.remove('d-none');
            return;
        }
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
