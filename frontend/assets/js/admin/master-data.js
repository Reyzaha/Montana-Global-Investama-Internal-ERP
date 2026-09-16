let currentUser = null;
let expenseCategoriesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (![1, 2, 4, 7].includes(parseInt(currentUser.role_id))) {
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('master_data', currentUser);
    renderHeader(currentUser);

    loadExpenseCategories();
    setupExpenseCategoryForm();
});

async function loadExpenseCategories() {
    const tbody = document.getElementById('expenseCategoryTableBody');
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat kategori...</td></tr>`;

    try {
        const res = await apiGet('/backend/api/finance/expense-categories.php?status=all');
        if (res.success && res.data && res.data.categories) {
            expenseCategoriesCache = res.data.categories;
            renderExpenseCategoriesTable(res.data.categories);
        }
    } catch (e) {
        console.error("Gagal memuat kategori biaya:", e);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">Gagal memuat data kategori</td></tr>`;
    }
}

function renderExpenseCategoriesTable(items) {
    const tbody = document.getElementById('expenseCategoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada kategori biaya.</td></tr>`;
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');

        const budgetLimit = item.budget_limit_monthly 
            ? formatRupiah(item.budget_limit_monthly) 
            : '<span class="text-muted">Tidak Dibatasi</span>';

        const spent = parseFloat(item.current_month_spent) || 0;
        const isOverBudget = item.budget_limit_monthly && spent > parseFloat(item.budget_limit_monthly);
        const spentBadge = isOverBudget 
            ? `<span class="text-danger fw-bold">${formatRupiah(spent)} <i class="bi bi-exclamation-triangle" title="Melebihi pagu!"></i></span>`
            : `<span>${formatRupiah(spent)}</span>`;

        const pmReq = parseInt(item.requires_pm_approval) === 1 
            ? `<span class="badge bg-primary-subtle text-primary border border-primary">Wajib</span>` 
            : `<span class="badge bg-secondary">Opsional</span>`;

        const autoApprove = item.auto_approve_below_amount 
            ? `<span class="badge bg-success-subtle text-success border border-success">&lt; ${formatRupiah(item.auto_approve_below_amount)}</span>` 
            : '<span class="text-muted">—</span>';

        const isActive = (parseInt(item.is_active) === 1);
        const activeSwitch = `
            <div class="form-check form-switch d-inline-block">
                <input class="form-check-input" type="checkbox" ${isActive ? 'checked' : ''} onchange="toggleExpenseCategoryStatus(${item.id}, this.checked)">
            </div>
        `;

        tr.innerHTML = `
            <td class="ps-3 fw-bold text-dark">${item.name}</td>
            <td><code>${item.code}</code></td>
            <td>${budgetLimit}</td>
            <td>${spentBadge}</td>
            <td>${pmReq}</td>
            <td>${autoApprove}</td>
            <td><small class="text-muted">${item.default_gl_account_code || '-'}</small></td>
            <td>${activeSwitch}</td>
            <td class="text-center pe-3">
                <button class="btn btn-outline-primary btn-sm py-0 px-2" onclick="openEditExpenseCategoryModal(${item.id})">
                    <i class="bi bi-pencil me-1"></i> Edit
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openCreateExpenseCategoryModal = function() {
    document.getElementById('modalExpenseCategoryTitle').textContent = 'Tambah Kategori Biaya Baru';
    document.getElementById('expCatId').value = '';
    document.getElementById('formExpenseCategory').reset();
    document.getElementById('expCatRequiresPm').checked = true;
    new bootstrap.Modal(document.getElementById('modalExpenseCategory')).show();
};

window.openEditExpenseCategoryModal = function(id) {
    const item = expenseCategoriesCache.find(x => x.id == id);
    if (!item) return;

    document.getElementById('modalExpenseCategoryTitle').textContent = 'Edit Kategori Biaya';
    document.getElementById('expCatId').value = item.id;
    document.getElementById('expCatName').value = item.name;
    document.getElementById('expCatCode').value = item.code;
    document.getElementById('expCatBudget').value = item.budget_limit_monthly !== null ? item.budget_limit_monthly : '';
    document.getElementById('expCatAutoApprove').value = item.auto_approve_below_amount !== null ? item.auto_approve_below_amount : '';
    document.getElementById('expCatGl').value = item.default_gl_account_code || '';
    document.getElementById('expCatRequiresPm').checked = (parseInt(item.requires_pm_approval) === 1);

    new bootstrap.Modal(document.getElementById('modalExpenseCategory')).show();
};

function setupExpenseCategoryForm() {
    const form = document.getElementById('formExpenseCategory');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveExpCat');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...`;

        const id = document.getElementById('expCatId').value;
        const payload = {
            action: id ? 'update' : 'create',
            id: id ? parseInt(id) : null,
            name: document.getElementById('expCatName').value.trim(),
            code: document.getElementById('expCatCode').value.trim(),
            budget_limit_monthly: document.getElementById('expCatBudget').value,
            auto_approve_below_amount: document.getElementById('expCatAutoApprove').value,
            default_gl_account_code: document.getElementById('expCatGl').value.trim(),
            requires_pm_approval: document.getElementById('expCatRequiresPm').checked ? 1 : 0
        };

        try {
            const res = await apiPost('/backend/api/finance/expense-categories.php', payload);
            if (res.success) {
                showToast(res.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalExpenseCategory')).hide();
                await loadExpenseCategories();
            } else {
                showToast(res.message, 'danger');
            }
        } catch (err) {
            showToast('Terjadi kesalahan saat menyimpan kategori.', 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });
}

window.toggleExpenseCategoryStatus = async function(id, isChecked) {
    try {
        const res = await apiPost('/backend/api/finance/expense-categories.php', {
            action: 'toggle_status',
            id: id,
            is_active: isChecked ? 1 : 0
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadExpenseCategories();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Gagal mengubah status kategori.', 'danger');
    }
};

function formatRupiah(val) {
    const num = parseFloat(val) || 0;
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}
