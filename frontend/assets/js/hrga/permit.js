let currentUser = null;
const permitModal = new bootstrap.Modal(document.getElementById('permitDetailModal'));

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    // Must be HRGA or PM
    if (currentUser.role_id !== 2 && currentUser.role_id !== 6) {
        showToast('Unauthorized role.', 'danger');
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_permit', currentUser);
    renderHeader(currentUser);

    loadPermits();

    document.getElementById('btnApplyFilter').addEventListener('click', () => {
        loadPermits();
    });
});

async function loadPermits() {
    const tbody = document.getElementById('permitTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Loading permits...</td></tr>`;

    const status = document.getElementById('filterStatus').value;
    let url = `/backend/api/hrga/permits.php?page=1&limit=50`;
    if (status) url += `&status=${status}`;

    try {
        const res = await apiGet(url);
        if (res.success) {
            renderPermits(res.data);
            updateSummaryCounts(res.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Failed to load permits: ${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Network error</td></tr>`;
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No permit requests found.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    data.forEach(p => {
        const tr = document.createElement('tr');
        
        const badge = getStatusBadge(p.status);
        const attachmentIcon = p.has_attachment > 0 ? '<i class="bi bi-paperclip text-muted" title="Has attachment"></i> ' : '';

        tr.innerHTML = `
            <td class="ps-4 fw-semibold text-muted">#${p.id}</td>
            <td>
                <div class="fw-semibold text-dark">${p.employee_email}</div>
            </td>
            <td>${attachmentIcon}${p.permit_type_name}</td>
            <td>
                <div class="small"><i class="bi bi-calendar-event me-1 text-muted"></i> ${p.start_date} s/d ${p.end_date}</div>
            </td>
            <td>${badge}</td>
            <td class="small text-muted">${new Date(p.created_at).toLocaleString('id-ID')}</td>
            <td class="pe-4 text-end">
                <button class="btn btn-sm btn-outline-primary" onclick="viewPermit(${p.id})">View</button>
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
    permitModal.show();

    try {
        const res = await apiGet(`/backend/api/hrga/permits-detail.php?id=${id}`);
        if (!res.success) {
            body.innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
            return;
        }

        const p = res.data;
        let attachmentsHtml = '';
        if (p.attachments.length > 0) {
            attachmentsHtml = p.attachments.map(a => `
                <a href="/backend/${a.file_path}" target="_blank" class="badge bg-light text-dark border p-2 text-decoration-none me-2">
                    <i class="bi bi-file-earmark-text text-primary"></i> ${a.original_name}
                </a>
            `).join('');
        } else {
            attachmentsHtml = '<span class="text-muted small">No attachments</span>';
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
            historyHtml = '<span class="text-muted small">No history yet.</span>';
        }

        body.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Employee</div>
                    <div class="fw-semibold">${p.employee_email}</div>
                </div>
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Permit Type</div>
                    <div>${p.permit_type_name}</div>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Duration</div>
                    <div>${p.start_date} <i class="bi bi-arrow-right mx-1"></i> ${p.end_date}</div>
                </div>
                <div class="col-md-6">
                    <div class="small text-muted text-uppercase fw-bold mb-1">Status</div>
                    <div>${getStatusBadge(p.status)}</div>
                </div>
            </div>

            <div class="mb-4">
                <div class="small text-muted text-uppercase fw-bold mb-1">Description</div>
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
            (currentUser.role_id === 6 && p.status === 'pending_pm')
        ) {
            footer.innerHTML = `
                <div class="w-100 mb-3">
                    <label class="form-label small fw-bold">Note (Required for rejection)</label>
                    <textarea id="actionNote" class="form-control" rows="2" placeholder="Leave a note..."></textarea>
                </div>
                <div class="w-100 d-flex justify-content-end gap-2">
                    <button class="btn btn-outline-danger" onclick="handleAction(${p.id}, 'reject')">Reject</button>
                    <button class="btn btn-success" onclick="handleAction(${p.id}, 'approve')">Approve</button>
                </div>
            `;
        } else {
            footer.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>`;
        }

    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">Network error</div>`;
    }
}

async function handleAction(id, action) {
    const note = document.getElementById('actionNote').value;
    if (action === 'reject' && !note.trim()) {
        showToast('Please provide a reason for rejection.', 'warning');
        return;
    }

    const endpoint = action === 'approve' ? `/backend/api/hrga/permits-approve.php?id=${id}` : `/backend/api/hrga/permits-reject.php?id=${id}`;
    
    if (!confirm(`Are you sure you want to ${action} this permit?`)) return;

    try {
        const res = await apiPost(endpoint, { note });
        if (res.success) {
            showToast(`Permit successfully ${action}d.`, 'success');
            permitModal.hide();
            loadPermits();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Action failed due to network error.', 'danger');
    }
}
