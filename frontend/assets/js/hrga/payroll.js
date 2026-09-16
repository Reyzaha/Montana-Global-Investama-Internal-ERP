let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    if (![2, 7].includes(parseInt(currentUser.role_id))) {
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_payroll', currentUser);
    renderHeader(currentUser);

    initPeriodSelectors();
    loadPayrollData();

    document.getElementById('selectMonth').addEventListener('change', loadPayrollData);
    document.getElementById('selectYear').addEventListener('change', loadPayrollData);

    document.getElementById('btnCalculatePayroll').addEventListener('click', handleCalculatePayroll);
    document.getElementById('btnFinalizePayroll').addEventListener('click', handleFinalizePayroll);
});

function initPeriodSelectors() {
    const monthSelect = document.getElementById('selectMonth');
    const yearSelect = document.getElementById('selectYear');

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    monthSelect.innerHTML = '';
    months.forEach((m, idx) => {
        const opt = document.createElement('option');
        opt.value = idx + 1;
        opt.textContent = m;
        if (idx + 1 === currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    yearSelect.innerHTML = '';
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

async function loadPayrollData() {
    const month = document.getElementById('selectMonth').value;
    const year = document.getElementById('selectYear').value;
    const tbody = document.getElementById('payrollTableBody');

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data payroll...</td></tr>`;

    try {
        const res = await apiGet(`/backend/api/hrga/payroll.php?month=${month}&year=${year}`);
        if (res.success && res.data) {
            const summary = res.data.summary;
            document.getElementById('statEmployees').textContent = summary.total_employees;
            document.getElementById('statNetPayout').textContent = formatRupiah(summary.total_net_payout);
            document.getElementById('statOvertimePayout').textContent = formatRupiah(summary.total_overtime_payout);
            document.getElementById('statDeductions').textContent = formatRupiah(summary.total_deductions);

            const records = res.data.records;
            tbody.innerHTML = '';

            if (records.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada kalkulasi payroll untuk periode ini. Klik "Hitung Ulang Periode Ini" untuk memproses.</td></tr>`;
                return;
            }

            records.forEach(r => {
                const tr = document.createElement('tr');
                let badgeStatus = 'bg-secondary';
                if (r.status === 'finalized') badgeStatus = 'bg-primary';
                if (r.status === 'paid') badgeStatus = 'bg-success';

                const totalDed = parseFloat(r.deduction_late) + parseFloat(r.deduction_absent);

                tr.innerHTML = `
                    <td class="ps-3">
                        <div class="fw-bold">${r.employee_name}</div>
                        <small class="text-muted">${r.employee_email}</small>
                    </td>
                    <td>${formatRupiah(r.base_salary)}</td>
                    <td>${formatRupiah(r.allowance_total)}</td>
                    <td><span class="badge bg-light text-dark border">${r.overtime_hours} Jam</span></td>
                    <td class="text-primary fw-semibold">${formatRupiah(r.overtime_pay)}</td>
                    <td class="text-danger fw-semibold">${formatRupiah(totalDed)}</td>
                    <td class="text-success fw-bold">${formatRupiah(r.net_salary)}</td>
                    <td><span class="badge ${badgeStatus}">${r.status.toUpperCase()}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading payroll:", e);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">Gagal memuat data payroll</td></tr>`;
    }
}

async function handleCalculatePayroll() {
    const month = parseInt(document.getElementById('selectMonth').value);
    const year = parseInt(document.getElementById('selectYear').value);
    const btn = document.getElementById('btnCalculatePayroll');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Menghitung...`;

    try {
        const res = await apiPost('/backend/api/hrga/payroll.php', {
            action: 'calculate',
            month: month,
            year: year
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadPayrollData();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Terjadi kesalahan saat memproses payroll.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function handleFinalizePayroll() {
    if (!confirm('Apakah Anda yakin ingin memfinalisasi payroll periode ini? Status akan dikunci dan siap untuk proses pembayaran.')) {
        return;
    }

    const month = parseInt(document.getElementById('selectMonth').value);
    const year = parseInt(document.getElementById('selectYear').value);
    const btn = document.getElementById('btnFinalizePayroll');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Finalisasi...`;

    try {
        const res = await apiPost('/backend/api/hrga/payroll.php', {
            action: 'finalize',
            month: month,
            year: year
        });
        if (res.success) {
            showToast(res.message, 'success');
            await loadPayrollData();
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Terjadi kesalahan saat memfinalisasi payroll.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function formatRupiah(val) {
    const num = parseFloat(val) || 0;
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}
