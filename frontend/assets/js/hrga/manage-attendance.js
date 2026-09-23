let currentUser = null;
let currentAttendanceData = [];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;
    
    // Only HRGA and Admin allowed
    if (currentUser.role_id !== 2 && currentUser.role_id !== 7) {
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_attendance', currentUser);
    renderHeader(currentUser);

    initFilters();
    loadAllAttendance();

    document.getElementById('btnApplyFilter').addEventListener('click', loadAllAttendance);
    document.getElementById('btnExportPdf').addEventListener('click', exportPdf);
});

function initFilters() {
    const monthSelect = document.getElementById('filterMonth');
    const yearSelect = document.getElementById('filterYear');
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Populate Months
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    months.forEach((m, i) => {
        const val = (i + 1).toString().padStart(2, '0');
        const opt = new Option(m, val);
        if (i + 1 === currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    // Populate Years (Current and Previous 1 Year)
    yearSelect.appendChild(new Option(currentYear, currentYear));
    yearSelect.appendChild(new Option(currentYear - 1, currentYear - 1));
}

async function loadAllAttendance() {
    const tbody = document.getElementById('allAttendanceBody');
    const month = document.getElementById('filterMonth').value;
    const year = document.getElementById('filterYear').value;

    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data...</td></tr>`;
    
    try {
        const res = await apiGet(`/backend/api/attendance/all-attendance.php?month=${month}&year=${year}`);
        if (res.success) {
            if (res.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Tidak ada data absensi untuk periode ini.</td></tr>`;
                return;
            }
            currentAttendanceData = res.data;
            tbody.innerHTML = '';
            res.data.forEach(item => {
                const tr = document.createElement('tr');
                
                let badgeClass = 'bg-secondary';
                if (item.status === 'on_time') badgeClass = 'bg-success';
                if (item.status === 'late') badgeClass = 'bg-warning text-dark';
                if (item.status === 'absent') badgeClass = 'bg-danger';

                const employeeDisplay = item.employee_name 
                    ? `<div><span class="fw-semibold text-dark">${item.employee_name}</span><div class="text-muted small">${item.employee_email}</div></div>`
                    : `<span>${item.employee_email}</span>`;

                tr.innerHTML = `
                    <td class="ps-4 fw-semibold">${item.date}</td>
                    <td>${employeeDisplay}</td>
                    <td>${item.check_in ? item.check_in : '-'}</td>
                    <td>${item.break_start ? item.break_start : '-'}</td>
                    <td>${item.break_end ? item.break_end : '-'}</td>
                    <td>${item.check_out ? item.check_out : '-'}</td>
                    <td><span class="badge ${badgeClass}">${(item.status || 'pending').replace('_', ' ').toUpperCase()}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data</td></tr>`;
    }
}

function exportPdf() {
    if (!currentAttendanceData || currentAttendanceData.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const monthSelect = document.getElementById('filterMonth');
    const month = monthSelect.options[monthSelect.selectedIndex].text;
    const year = document.getElementById('filterYear').value;
    
    doc.setFontSize(16);
    doc.text(`Rekap Absensi Karyawan - ${month} ${year}`, 14, 15);
    
    // Calculate summary per user
    const summary = {};
    currentAttendanceData.forEach(item => {
        if (!summary[item.employee_email]) {
            summary[item.employee_email] = {
                name: item.employee_name || item.employee_email,
                on_time: 0,
                late: 0,
                absent: 0
            };
        }
        if (item.status === 'on_time') summary[item.employee_email].on_time++;
        else if (item.status === 'late') summary[item.employee_email].late++;
        else if (item.status === 'absent') summary[item.employee_email].absent++;
    });
    
    // Add summary table
    doc.setFontSize(12);
    doc.text("Ringkasan Kehadiran", 14, 25);
    const summaryBody = Object.values(summary).map(s => [s.name, s.on_time, s.late, s.absent]);
    doc.autoTable({
        startY: 30,
        head: [['Karyawan', 'On Time', 'Terlambat', 'Absen']],
        body: summaryBody,
        theme: 'grid',
        styles: { fontSize: 9 }
    });
    
    // Add detailed table
    doc.text("Detail Kehadiran", 14, doc.lastAutoTable.finalY + 10);
    const detailBody = currentAttendanceData.map(item => [
        item.date,
        item.employee_name || item.employee_email,
        item.check_in || '-',
        item.check_out || '-',
        (item.status || 'pending').replace('_', ' ').toUpperCase()
    ]);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Tanggal', 'Karyawan', 'Masuk', 'Keluar', 'Status']],
        body: detailBody,
        theme: 'grid',
        styles: { fontSize: 8 }
    });
    
    doc.save(`Rekap_Absensi_${month}_${year}.pdf`);
}
