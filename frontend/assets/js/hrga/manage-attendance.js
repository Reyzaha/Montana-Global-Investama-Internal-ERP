let currentUser = null;
let currentAttendanceData = [];
let employeesList = [];
let currentPeriod = { startDate: '', endDate: '' };

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;
    
    // Only HRGA (2) and Admin (7) allowed
    if (currentUser.role_id !== 2 && currentUser.role_id !== 7) {
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('hrga_attendance', currentUser);
    renderHeader(currentUser);

    initFilters();
    await loadAllAttendance();

    // Event Listeners
    document.getElementById('btnApplyFilter').addEventListener('click', () => loadAllAttendance());
    document.getElementById('filterStartDate').addEventListener('change', updatePeriodDisplay);
    document.getElementById('filterEndDate').addEventListener('change', updatePeriodDisplay);
    document.getElementById('filterMonth').addEventListener('change', onMonthYearChange);
    document.getElementById('filterYear').addEventListener('change', onMonthYearChange);
    document.getElementById('filterEmployee').addEventListener('change', applyLocalFilter);
    document.getElementById('filterStatus').addEventListener('change', applyLocalFilter);
    document.getElementById('btnExportPdf').addEventListener('click', exportPdf);
    document.getElementById('btnExportCsv').addEventListener('click', exportCsv);
});

function initFilters() {
    const monthSelect = document.getElementById('filterMonth');
    const yearSelect = document.getElementById('filterYear');
    const startDateInput = document.getElementById('filterStartDate');
    const endDateInput = document.getElementById('filterEndDate');
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Populate Months
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    monthSelect.innerHTML = '';
    months.forEach((m, i) => {
        const val = (i + 1).toString().padStart(2, '0');
        const opt = new Option(m, val);
        if (i + 1 === currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    });

    // Populate Years (Current and Previous 1 Year)
    yearSelect.innerHTML = '';
    yearSelect.appendChild(new Option(currentYear, currentYear));
    yearSelect.appendChild(new Option(currentYear - 1, currentYear - 1));

    // Set initial date range to entire current month
    syncDatesFromMonthYear();
}

function syncDatesFromMonthYear() {
    const month = document.getElementById('filterMonth').value;
    const year = document.getElementById('filterYear').value;
    
    const startDate = `${year}-${month}-01`;
    // Last day of month
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

    document.getElementById('filterStartDate').value = startDate;
    document.getElementById('filterEndDate').value = endDate;

    updatePeriodDisplay();
}

function onMonthYearChange() {
    syncDatesFromMonthYear();
    loadAllAttendance();
}

function updatePeriodDisplay() {
    const s = document.getElementById('filterStartDate').value;
    const e = document.getElementById('filterEndDate').value;
    const display = document.getElementById('filterPeriodDisplay');
    
    if (s && e) {
        display.textContent = `Periode: ${formatDateIndo(s)} s/d ${formatDateIndo(e)}`;
    } else {
        display.textContent = `Periode: Semua Data`;
    }
}

async function loadAllAttendance() {
    const tbody = document.getElementById('allAttendanceBody');
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;

    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data kehadiran...</td></tr>`;
    
    try {
        let url = `/backend/api/attendance/all-attendance.php`;
        if (startDate && endDate) {
            url += `?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
        } else {
            const m = document.getElementById('filterMonth').value;
            const y = document.getElementById('filterYear').value;
            url += `?month=${m}&year=${y}`;
        }

        const res = await apiGet(url);
        if (res.success) {
            if (Array.isArray(res.data)) {
                currentAttendanceData = res.data;
            } else if (res.data && res.data.attendances) {
                currentAttendanceData = res.data.attendances;
                currentPeriod.startDate = res.data.start_date || startDate;
                currentPeriod.endDate = res.data.end_date || endDate;
                if (res.data.employees) {
                    employeesList = res.data.employees;
                    populateEmployeeDropdown(employeesList);
                }
            } else {
                currentAttendanceData = [];
            }

            updatePeriodDisplay();
            updateMetrics(currentAttendanceData);
            applyLocalFilter();
        } else {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">${res.message}</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">Gagal memuat data dari server.</td></tr>`;
    }
}

function populateEmployeeDropdown(employees) {
    const select = document.getElementById('filterEmployee');
    const currentVal = select.value;
    select.innerHTML = '<option value="">Semua Karyawan</option>';
    
    employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `${emp.name} (${emp.position || emp.role_name || 'Staff'})`;
        select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
}

function updateMetrics(data) {
    let totalHadir = 0;
    let onTime = 0;
    let late = 0;
    let permitCount = 0;
    let absent = 0;

    data.forEach(item => {
        const st = (item.status || '').toLowerCase();
        if (st === 'on_time') {
            totalHadir++;
            onTime++;
        } else if (st === 'late') {
            totalHadir++;
            late++;
        } else if (['cuti', 'izin', 'sakit'].includes(st) || item.has_approved_permit) {
            permitCount++;
        } else if (st === 'absent') {
            absent++;
        }
    });

    const onTimePct = totalHadir > 0 ? Math.round((onTime / totalHadir) * 100) : 0;
    const latePct = totalHadir > 0 ? Math.round((late / totalHadir) * 100) : 0;

    document.getElementById('cardTotalHadir').textContent = totalHadir;
    document.getElementById('cardTotalHadirSub').textContent = `Dari ${data.length} total baris log`;
    document.getElementById('cardOnTime').textContent = onTime;
    document.getElementById('cardOnTimePercent').textContent = `${onTimePct}% dari kehadiran`;
    document.getElementById('cardLate').textContent = late;
    document.getElementById('cardLatePercent').textContent = `${latePct}% dari kehadiran`;
    document.getElementById('cardPermit').textContent = permitCount;
    document.getElementById('cardAbsent').textContent = absent;
}

function applyLocalFilter() {
    const selectedUserId = document.getElementById('filterEmployee').value;
    const selectedStatus = document.getElementById('filterStatus').value;
    const tbody = document.getElementById('allAttendanceBody');

    let filtered = currentAttendanceData;

    if (selectedUserId) {
        filtered = filtered.filter(item => item.user_id == selectedUserId);
    }

    if (selectedStatus) {
        filtered = filtered.filter(item => {
            const st = (item.status || '').toLowerCase();
            if (selectedStatus === 'cuti') {
                return st === 'cuti' || (item.has_approved_permit && item.permit_category === 'cuti');
            }
            if (selectedStatus === 'izin') {
                return st === 'izin' || (item.has_approved_permit && item.permit_category === 'izin');
            }
            if (selectedStatus === 'sakit') {
                return st === 'sakit' || (item.has_approved_permit && item.permit_category === 'sakit');
            }
            return st === selectedStatus;
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Tidak ada data absensi yang sesuai filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const st = (item.status || '').toLowerCase();
        
        let badgeClass = 'bg-secondary';
        let statusText = 'PENDING';
        let keteranganHtml = '-';

        if (st === 'on_time') {
            badgeClass = 'bg-success';
            statusText = 'TEPAT WAKTU';
            keteranganHtml = '<span class="text-success small fw-semibold"><i class="bi bi-check2-circle me-1"></i>Hadir Tepat Waktu</span>';
        } else if (st === 'late') {
            badgeClass = 'bg-warning text-dark';
            statusText = 'TERLAMBAT';
            keteranganHtml = '<span class="text-warning-emphasis small fw-semibold"><i class="bi bi-exclamation-triangle me-1"></i>Terlambat Masuk</span>';
        } else if (st === 'cuti') {
            badgeClass = 'bg-primary';
            statusText = 'CUTI';
        } else if (st === 'izin') {
            badgeClass = 'bg-info text-dark';
            statusText = 'IZIN';
        } else if (st === 'sakit') {
            badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
            statusText = 'SAKIT';
        } else if (st === 'absent') {
            badgeClass = 'bg-danger';
            statusText = 'ABSEN';
            keteranganHtml = '<span class="text-danger small fw-semibold"><i class="bi bi-x-circle me-1"></i>Tidak Masuk</span>';
        }

        // Jika terdapat pengajuan Izin/Cuti/Sakit yang disetujui OM & HR
        if (item.has_approved_permit) {
            const catName = item.permit_category_name || (st === 'cuti' ? 'Cuti' : (st === 'sakit' ? 'Sakit' : 'Izin'));
            const subName = item.permit_sub_type_name || catName;
            const desc = item.permit_description ? `<div class="text-muted small fst-italic mt-1">"${escapeHtml(item.permit_description)}"</div>` : '';
            
            keteranganHtml = `
                <div class="text-start">
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle fw-semibold mb-1">
                        <i class="bi bi-patch-check-fill me-1"></i>${escapeHtml(catName)}: ${escapeHtml(subName)}
                    </span>
                    <div class="small text-success fw-bold">
                        <i class="bi bi-shield-check me-1"></i>Disetujui OM & HR
                    </div>
                    ${desc}
                </div>
            `;

            // Annotate badge status if it was attendance with approved permit
            if (st === 'late' && subName.toLowerCase().includes('terlambat')) {
                statusText = 'TERLAMBAT (DISAHKAN)';
            }
        }

        const formattedDate = formatDateIndo(item.date);
        const employeeDisplay = item.employee_name 
            ? `<div><span class="fw-semibold text-dark">${escapeHtml(item.employee_name)}</span><div class="text-muted small">${escapeHtml(item.employee_email)}</div></div>`
            : `<span>${escapeHtml(item.employee_email)}</span>`;

        const positionDisplay = item.employee_position || item.role_name || '-';

        tr.innerHTML = `
            <td class="ps-4 fw-semibold text-nowrap">${formattedDate}</td>
            <td>${employeeDisplay}</td>
            <td><span class="badge bg-light text-dark border">${escapeHtml(positionDisplay)}</span></td>
            <td><span class="fw-medium text-dark">${item.check_in ? item.check_in : '-'}</span></td>
            <td><span class="text-muted">${item.break_start ? item.break_start : '-'}</span></td>
            <td><span class="text-muted">${item.break_end ? item.break_end : '-'}</span></td>
            <td><span class="fw-medium text-dark">${item.check_out ? item.check_out : '-'}</span></td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td class="pe-4 text-start">${keteranganHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const dayName = days[dt.getDay()];
            const day = parts[2];
            const month = parts[1];
            const year = parts[0];
            return `${dayName}, ${day}/${month}/${year}`;
        }
    } catch (e) {}
    return dateStr;
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// ==========================================================
// EXPORT EXCEL / CSV REKAP KEHADIRAN & CATATAN PERMIT
// ==========================================================
function exportCsv() {
    if (!currentAttendanceData || currentAttendanceData.length === 0) {
        showToast('Tidak ada data absensi untuk diexport.', 'warning');
        return;
    }

    const filterEmpSelect = document.getElementById('filterEmployee');
    const selectedUserId = filterEmpSelect.value;
    const selectedEmpText = filterEmpSelect.options[filterEmpSelect.selectedIndex].text;

    let exportData = currentAttendanceData;
    if (selectedUserId) {
        exportData = exportData.filter(x => x.user_id == selectedUserId);
    }

    if (exportData.length === 0) {
        showToast('Tidak ada data yang sesuai untuk diexport.', 'warning');
        return;
    }

    const startDate = document.getElementById('filterStartDate').value || currentPeriod.startDate || '';
    const endDate = document.getElementById('filterEndDate').value || currentPeriod.endDate || '';

    // CSV Headers
    const headers = [
        'No',
        'Tanggal',
        'Hari',
        'Karyawan',
        'Email',
        'Jabatan / Posisi',
        'Jam Masuk',
        'Istirahat Keluar',
        'Istirahat Masuk',
        'Jam Pulang',
        'Status Kehadiran',
        'Keterangan & Catatan Permit (Disetujui OM & HR)'
    ];

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const rows = exportData.map((item, idx) => {
        let dayName = '-';
        if (item.date) {
            const p = item.date.split('-');
            if (p.length === 3) {
                const dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
                dayName = days[dt.getDay()] || '-';
            }
        }

        let statusText = 'PENDING';
        const st = (item.status || '').toLowerCase();
        if (st === 'on_time') statusText = 'TEPAT WAKTU';
        else if (st === 'late') statusText = 'TERLAMBAT';
        else if (st === 'cuti') statusText = 'CUTI';
        else if (st === 'izin') statusText = 'IZIN';
        else if (st === 'sakit') statusText = 'SAKIT';
        else if (st === 'absent') statusText = 'ABSEN';

        let ket = item.notes || '-';
        if (item.has_approved_permit) {
            const cat = item.permit_category_name || '';
            const sub = item.permit_sub_type_name || '';
            const desc = item.permit_description ? ` (Alasan: ${item.permit_description})` : '';
            ket = `[${cat}: ${sub}] Disetujui OM & HR${desc}`;
        }

        return [
            idx + 1,
            item.date || '-',
            dayName,
            item.employee_name || '-',
            item.employee_email || '-',
            item.employee_position || item.role_name || '-',
            item.check_in || '-',
            item.break_start || '-',
            item.break_end || '-',
            item.check_out || '-',
            statusText,
            ket
        ];
    });

    // Helper to escape CSV cell
    const csvContent = [headers, ...rows].map(row => {
        return row.map(cell => {
            const cellStr = (cell === null || cell === undefined) ? '' : String(cell);
            // Escape double quotes
            return `"${cellStr.replace(/"/g, '""')}"`;
        }).join(',');
    }).join('\r\n');

    // Add UTF-8 BOM so Excel opens indonesian characters properly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    let filename = `Rekap_Absensi_MGI_${startDate}_sd_${endDate}`;
    if (selectedUserId) {
        const cleanName = selectedEmpText.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
        filename += `_${cleanName}`;
    }
    filename += '.csv';

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('File CSV/Excel rekap absensi berhasil diunduh.', 'success');
}

// ==========================================================
// EXPORT PDF REKAP KEHADIRAN (PER USER & PER TANGGAL)
// ==========================================================
function exportPdf() {
    if (!currentAttendanceData || currentAttendanceData.length === 0) {
        showToast('Tidak ada data absensi untuk diexport.', 'warning');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const startDate = document.getElementById('filterStartDate').value || currentPeriod.startDate || '';
    const endDate = document.getElementById('filterEndDate').value || currentPeriod.endDate || '';

    const filterEmpSelect = document.getElementById('filterEmployee');
    const selectedUserId = filterEmpSelect.value;
    const selectedEmpText = filterEmpSelect.options[filterEmpSelect.selectedIndex].text;

    // Filter data if specific employee is selected
    let exportData = currentAttendanceData;
    if (selectedUserId) {
        exportData = exportData.filter(x => x.user_id == selectedUserId);
    }

    if (exportData.length === 0) {
        showToast('Tidak ada data karyawan yang dipilih untuk diexport.', 'warning');
        return;
    }

    // Group data by user
    const usersMap = {};
    exportData.forEach(item => {
        const key = item.user_id || item.employee_email;
        if (!usersMap[key]) {
            usersMap[key] = {
                user_id: item.user_id,
                name: item.employee_name || item.employee_email,
                email: item.employee_email,
                position: item.employee_position || item.role_name || 'Staff Pegawai',
                records: [],
                total_attended: 0,
                on_time: 0,
                late: 0,
                permits: 0,
                absent: 0
            };
        }
        usersMap[key].records.push(item);

        const st = (item.status || '').toLowerCase();
        if (st === 'on_time') {
            usersMap[key].total_attended++;
            usersMap[key].on_time++;
        } else if (st === 'late') {
            usersMap[key].total_attended++;
            usersMap[key].late++;
        } else if (['cuti', 'izin', 'sakit'].includes(st) || item.has_approved_permit) {
            usersMap[key].permits++;
        } else if (st === 'absent') {
            usersMap[key].absent++;
        }
    });

    const userList = Object.values(usersMap);

    // Calculate Grand Totals
    let grandAttended = 0;
    let grandOnTime = 0;
    let grandLate = 0;
    let grandPermits = 0;
    let grandAbsent = 0;

    userList.forEach(u => {
        grandAttended += u.total_attended;
        grandOnTime += u.on_time;
        grandLate += u.late;
        grandPermits += u.permits;
        grandAbsent += u.absent;
        // Sort individual records ascending by date
        u.records.sort((a, b) => (a.date > b.date ? 1 : -1));
    });

    const grandOnTimePct = grandAttended > 0 ? Math.round((grandOnTime / grandAttended) * 100) : 0;
    const grandLatePct = grandAttended > 0 ? Math.round((grandLate / grandAttended) * 100) : 0;

    let currentY = 16;

    // ----------------------------------------------------
    // 1. KOP SURAT PERUSAHAAN (COMPANY HEADER)
    // ----------------------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 58, 138); // Navy
    doc.text("PT MONTANA GLOBAL INVESTAMA", margin, currentY);

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Gray
    doc.text("Internal ERP & HRIS Management System - Divisi Human Resources & General Affairs", margin, currentY);

    currentY += 4;
    // Double decorative lines
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1.2);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 1.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    currentY += 8;

    // ----------------------------------------------------
    // 2. JUDUL DOKUMEN & PERIODE
    // ----------------------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // Slate dark
    doc.text("LAPORAN REKAPITULASI KEHADIRAN PEGAWAI", pageWidth / 2, currentY, { align: "center" });

    currentY += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Periode: ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`, pageWidth / 2, currentY, { align: "center" });

    currentY += 4.5;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const officerName = currentUser.name || currentUser.email;
    doc.text(`Dicetak: ${printedAt} WIB | Petugas HRGA: ${officerName}`, pageWidth / 2, currentY, { align: "center" });

    currentY += 6;

    // ----------------------------------------------------
    // 3. STATISTIK RINGKASAN (KPI METRIC BOXES)
    // ----------------------------------------------------
    const boxWidth = (pageWidth - (margin * 2) - 12) / 4;
    const boxHeight = 16;

    // Box 1: Total Hadir
    doc.setFillColor(239, 246, 255); // Blue tint
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(margin, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175);
    doc.text("TOTAL HADIR", margin + 4, currentY + 5);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${grandAttended}`, margin + 4, currentY + 12);

    // Box 2: Tepat Waktu
    const box2X = margin + boxWidth + 4;
    doc.setFillColor(240, 253, 244); // Green tint
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text("TEPAT WAKTU", box2X + 4, currentY + 5);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${grandOnTime} (${grandOnTimePct}%)`, box2X + 4, currentY + 12);

    // Box 3: Terlambat
    const box3X = margin + (boxWidth * 2) + 8;
    doc.setFillColor(254, 252, 232); // Yellow tint
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(161, 98, 7);
    doc.text("TERLAMBAT", box3X + 4, currentY + 5);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${grandLate} (${grandLatePct}%)`, box3X + 4, currentY + 12);

    // Box 4: Izin/Cuti/Sakit Disetujui
    const box4X = margin + (boxWidth * 3) + 12;
    doc.setFillColor(243, 244, 246); // Gray/Info tint
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(box4X, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text("IZIN/CUTI/SAKIT", box4X + 4, currentY + 5);
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${grandPermits} Hari`, box4X + 4, currentY + 12);

    currentY += boxHeight + 8;

    // ----------------------------------------------------
    // 4. TABEL REKAPITULASI RINGKAS SEMUA PEGAWAI
    // ----------------------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("I. Ringkasan Kehadiran Seluruh Pegawai", margin, currentY);

    currentY += 4;

    const summaryTableData = userList.map((u, idx) => {
        const uPct = u.total_attended > 0 ? Math.round((u.on_time / u.total_attended) * 100) : 0;
        return [
            idx + 1,
            u.name,
            u.position,
            u.total_attended,
            u.on_time,
            u.late,
            u.permits,
            u.absent,
            `${uPct}%`
        ];
    });

    doc.autoTable({
        startY: currentY,
        head: [['No', 'Nama Pegawai', 'Jabatan', 'Total Hadir', 'On Time', 'Terlambat', 'Izin/Cuti', 'Absen', 'Disiplin']],
        body: summaryTableData,
        theme: 'striped',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [30, 58, 138], // Navy
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 42 },
            2: { cellWidth: 32 },
            3: { halign: 'center', cellWidth: 18 },
            4: { halign: 'center', cellWidth: 16 },
            5: { halign: 'center', cellWidth: 16 },
            6: { halign: 'center', cellWidth: 16 },
            7: { halign: 'center', cellWidth: 14 },
            8: { halign: 'center', cellWidth: 18 }
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        }
    });

    currentY = doc.lastAutoTable.finalY + 8;

    // ----------------------------------------------------
    // 5. DETAIL KEHADIRAN RAPI PER USER DAN PER TANGGAL
    // ----------------------------------------------------
    if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("II. Detail Kehadiran Harian Per Pegawai", margin, currentY);

    currentY += 4;

    userList.forEach((u, userIdx) => {
        if (currentY > pageHeight - 50) {
            doc.addPage();
            currentY = 16;
        }

        // Employee Info Card Banner
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 11, 1.5, 1.5, 'FD');

        // Blue accent indicator on the left
        doc.setFillColor(30, 58, 138);
        doc.rect(margin, currentY, 2.5, 11, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${userIdx + 1}. ${u.name.toUpperCase()} - ${u.position}`, margin + 5, currentY + 4.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const userSummaryText = `Total Hadir: ${u.total_attended} Hari  |  Tepat Waktu: ${u.on_time} Hari  |  Terlambat: ${u.late} Hari  |  Izin/Cuti/Sakit: ${u.permits} Hari  |  Absen: ${u.absent} Hari`;
        doc.text(userSummaryText, margin + 5, currentY + 8.8);

        currentY += 13;

        // Daily Attendance Table for this Employee
        const detailRows = u.records.map((r, rIdx) => {
            let statusLabel = 'TEPAT WAKTU';
            let keterangan = 'Hadir Tepat Waktu';
            const st = (r.status || '').toLowerCase();

            if (st === 'late') {
                statusLabel = 'TERLAMBAT';
                keterangan = 'Terlambat Masuk';
            } else if (st === 'cuti') {
                statusLabel = 'CUTI';
                keterangan = 'Cuti';
            } else if (st === 'izin') {
                statusLabel = 'IZIN';
                keterangan = 'Izin';
            } else if (st === 'sakit') {
                statusLabel = 'SAKIT';
                keterangan = 'Sakit';
            } else if (st === 'absent') {
                statusLabel = 'ABSEN';
                keterangan = 'Tidak Masuk Kerja';
            }

            if (r.has_approved_permit) {
                const cat = r.permit_category_name || '';
                const sub = r.permit_sub_type_name || '';
                const desc = r.permit_description ? ` - ${r.permit_description}` : '';
                keterangan = `[${cat}: ${sub}] Disetujui OM & HR${desc}`;
                if (st === 'late' && sub.toLowerCase().includes('terlambat')) {
                    statusLabel = 'TERLAMBAT (SAH)';
                }
            }

            return [
                rIdx + 1,
                formatDateIndo(r.date),
                r.check_in || '-',
                r.break_start || '-',
                r.break_end || '-',
                r.check_out || '-',
                statusLabel,
                keterangan
            ];
        });

        doc.autoTable({
            startY: currentY,
            head: [['No', 'Tanggal & Hari', 'Jam Masuk', 'Istirahat Out', 'Istirahat In', 'Jam Pulang', 'Status', 'Keterangan']],
            body: detailRows,
            theme: 'grid',
            styles: {
                fontSize: 7.5,
                cellPadding: 1.8,
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [51, 65, 85], // Slate dark gray
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { cellWidth: 36 },
                2: { halign: 'center', cellWidth: 18 },
                3: { halign: 'center', cellWidth: 18 },
                4: { halign: 'center', cellWidth: 18 },
                5: { halign: 'center', cellWidth: 18 },
                6: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
                7: { cellWidth: 42 }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 6) {
                    const text = data.cell.raw;
                    if (text === 'TEPAT WAKTU') {
                        data.cell.styles.textColor = [22, 101, 52]; // Dark green
                    } else if (text.includes('TERLAMBAT')) {
                        data.cell.styles.textColor = [180, 83, 9]; // Dark yellow / amber
                    } else if (text === 'CUTI' || text === 'IZIN') {
                        data.cell.styles.textColor = [30, 58, 138]; // Dark blue
                    } else if (text === 'SAKIT' || text === 'ABSEN') {
                        data.cell.styles.textColor = [185, 28, 28]; // Dark red
                    }
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 6;
    });

    // ----------------------------------------------------
    // 6. LEMBAR PENGESAHAN / TANDA TANGAN (SIGNATURE BLOCK)
    // ----------------------------------------------------
    if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
    } else {
        currentY += 4;
    }

    const todayDateIndo = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const signX1 = margin + 10;
    const signX2 = pageWidth - margin - 60;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    doc.text(`Jakarta, ${todayDateIndo}`, signX2, currentY);
    currentY += 5;
    doc.text("Dibuat Oleh,", signX1, currentY);
    doc.text("Mengetahui & Menyetujui,", signX2, currentY);

    currentY += 18; // Spasi tanda tangan

    doc.setFont("helvetica", "bold");
    doc.text(`(${officerName})`, signX1, currentY);
    doc.text("( Direksi / Head of HRGA )", signX2, currentY);

    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("HRGA Operations Officer", signX1, currentY);
    doc.text("PT Montana Global Investama", signX2, currentY);

    // ----------------------------------------------------
    // 7. FOOTER NOMOR HALAMAN DI SETIAP HALAMAN
    // ----------------------------------------------------
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);

        // Footer dividing line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

        doc.text("PT Montana Global Investama - Dokumen Resmi Laporan Kehadiran", margin, pageHeight - 6);
        doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    }

    // Generate filename
    let filename = `Rekap_Kehadiran_MGI_${startDate}_sd_${endDate}`;
    if (selectedUserId) {
        const cleanName = selectedEmpText.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
        filename += `_${cleanName}`;
    }
    filename += '.pdf';

    doc.save(filename);
    showToast('Laporan PDF rekap kehadiran berhasil diunduh.', 'success');
}
