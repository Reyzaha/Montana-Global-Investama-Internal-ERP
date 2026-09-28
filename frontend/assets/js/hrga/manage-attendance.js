let currentUser = null;
let currentAttendanceData = [];
let employeesList = [];

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
    await loadAllAttendance();

    document.getElementById('btnApplyFilter').addEventListener('click', applyLocalFilter);
    document.getElementById('filterMonth').addEventListener('change', loadAllAttendance);
    document.getElementById('filterYear').addEventListener('change', loadAllAttendance);
    document.getElementById('filterEmployee').addEventListener('change', applyLocalFilter);
    document.getElementById('filterStatus').addEventListener('change', applyLocalFilter);
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
}

async function loadAllAttendance() {
    const tbody = document.getElementById('allAttendanceBody');
    const month = document.getElementById('filterMonth').value;
    const year = document.getElementById('filterYear').value;

    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div> Memuat data kehadiran...</td></tr>`;
    
    try {
        const res = await apiGet(`/backend/api/attendance/all-attendance.php?month=${month}&year=${year}`);
        if (res.success) {
            // Handle both structure: res.data as array or res.data.attendances
            if (Array.isArray(res.data)) {
                currentAttendanceData = res.data;
            } else if (res.data && res.data.attendances) {
                currentAttendanceData = res.data.attendances;
                if (res.data.employees) {
                    employeesList = res.data.employees;
                    populateEmployeeDropdown(employeesList);
                }
            } else {
                currentAttendanceData = [];
            }

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
    let absent = 0;

    data.forEach(item => {
        if (item.status === 'on_time') {
            totalHadir++;
            onTime++;
        } else if (item.status === 'late') {
            totalHadir++;
            late++;
        } else if (item.status === 'absent') {
            absent++;
        }
    });

    const totalLogs = totalHadir + absent;
    const onTimePct = totalHadir > 0 ? Math.round((onTime / totalHadir) * 100) : 0;
    const latePct = totalHadir > 0 ? Math.round((late / totalHadir) * 100) : 0;

    document.getElementById('cardTotalHadir').textContent = totalHadir;
    document.getElementById('cardTotalHadirSub').textContent = `Dari ${totalLogs} total catatan absensi`;
    document.getElementById('cardOnTime').textContent = onTime;
    document.getElementById('cardOnTimePercent').textContent = `${onTimePct}% dari kehadiran`;
    document.getElementById('cardLate').textContent = late;
    document.getElementById('cardLatePercent').textContent = `${latePct}% dari kehadiran`;
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
        filtered = filtered.filter(item => item.status === selectedStatus);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Tidak ada data absensi yang sesuai filter.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(item => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'bg-secondary';
        let statusText = 'Pending';
        let keterangan = '-';

        if (item.status === 'on_time') {
            badgeClass = 'bg-success';
            statusText = 'TEPAT WAKTU';
            keterangan = '<span class="text-success small fw-semibold"><i class="bi bi-check2-circle me-1"></i>Hadir Tepat Waktu</span>';
        } else if (item.status === 'late') {
            badgeClass = 'bg-warning text-dark';
            statusText = 'TERLAMBAT';
            keterangan = '<span class="text-warning-emphasis small fw-semibold"><i class="bi bi-exclamation-triangle me-1"></i>Terlambat Masuk</span>';
        } else if (item.status === 'absent') {
            badgeClass = 'bg-danger';
            statusText = 'ABSEN';
            keterangan = '<span class="text-danger small fw-semibold"><i class="bi bi-x-circle me-1"></i>Tidak Masuk</span>';
        }

        const formattedDate = formatDateIndo(item.date);
        const employeeDisplay = item.employee_name 
            ? `<div><span class="fw-semibold text-dark">${item.employee_name}</span><div class="text-muted small">${item.employee_email}</div></div>`
            : `<span>${item.employee_email}</span>`;

        const positionDisplay = item.employee_position || item.role_name || '-';

        tr.innerHTML = `
            <td class="ps-4 fw-semibold text-nowrap">${formattedDate}</td>
            <td>${employeeDisplay}</td>
            <td><span class="badge bg-light text-dark border">${positionDisplay}</span></td>
            <td><span class="fw-medium text-dark">${item.check_in ? item.check_in : '-'}</span></td>
            <td><span class="text-muted">${item.break_start ? item.break_start : '-'}</span></td>
            <td><span class="text-muted">${item.break_end ? item.break_end : '-'}</span></td>
            <td><span class="fw-medium text-dark">${item.check_out ? item.check_out : '-'}</span></td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td class="pe-4 text-end">${keterangan}</td>
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

    const monthSelect = document.getElementById('filterMonth');
    const monthText = monthSelect.options[monthSelect.selectedIndex].text;
    const year = document.getElementById('filterYear').value;

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
                absent: 0
            };
        }
        usersMap[key].records.push(item);

        if (item.status === 'on_time') {
            usersMap[key].total_attended++;
            usersMap[key].on_time++;
        } else if (item.status === 'late') {
            usersMap[key].total_attended++;
            usersMap[key].late++;
        } else if (item.status === 'absent') {
            usersMap[key].absent++;
        }
    });

    const userList = Object.values(usersMap);

    // Calculate Grand Totals
    let grandAttended = 0;
    let grandOnTime = 0;
    let grandLate = 0;
    let grandAbsent = 0;

    userList.forEach(u => {
        grandAttended += u.total_attended;
        grandOnTime += u.on_time;
        grandLate += u.late;
        grandAbsent += u.absent;
        // Sort individual records ascending by date
        u.records.sort((a, b) => (a.date > b.date ? 1 : -1));
    });

    const grandLogs = grandAttended + grandAbsent;
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
    doc.text(`Periode: ${monthText} ${year}`, pageWidth / 2, currentY, { align: "center" });

    currentY += 4.5;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const officerName = currentUser.name || currentUser.email;
    doc.text(`Dicetak: ${printedAt} WIB | Petugas HRGA: ${officerName}`, pageWidth / 2, currentY, { align: "center" });

    currentY += 6;

    // ----------------------------------------------------
    // 3. STATISTIK RINGKASAN GLOBAL (EXECUTIVE SUMMARY)
    // ----------------------------------------------------
    const summaryBoxes = [
        ['Total Karyawan', `${userList.length} Orang`],
        ['Total Hadir', `${grandAttended} Hari`],
        ['Tepat Waktu', `${grandOnTime} (${grandOnTimePct}%)`],
        ['Total Terlambat', `${grandLate} (${grandLatePct}%)`],
        ['Total Absen', `${grandAbsent} Hari`]
    ];

    doc.autoTable({
        startY: currentY,
        head: [summaryBoxes.map(b => b[0])],
        body: [summaryBoxes.map(b => b[1])],
        theme: 'grid',
        styles: {
            fontSize: 8.5,
            halign: 'center',
            cellPadding: 2.5
        },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [51, 65, 85],
            fontStyle: 'bold',
            lineWidth: 0.2,
            lineColor: [203, 213, 225]
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: 0.2,
            lineColor: [203, 213, 225]
        }
    });

    currentY = doc.lastAutoTable.finalY + 6;

    // ----------------------------------------------------
    // 4. TABEL REKAPITULASI RINGKASAN PER KARYAWAN
    // ----------------------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("I. Tabel Ringkasan Kehadiran Seluruh Karyawan", margin, currentY);

    currentY += 3;

    const summaryTableBody = userList.map((u, idx) => {
        const pct = u.total_attended > 0 ? Math.round((u.on_time / u.total_attended) * 100) + '%' : '0%';
        return [
            idx + 1,
            u.name,
            u.position,
            u.total_attended,
            u.on_time,
            u.late,
            u.absent,
            pct
        ];
    });

    doc.autoTable({
        startY: currentY,
        head: [['No', 'Nama Karyawan', 'Divisi / Jabatan', 'Total Hadir', 'Tepat Waktu', 'Terlambat', 'Absen', '% Ketepatan']],
        body: summaryTableBody,
        theme: 'striped',
        styles: {
            fontSize: 8,
            cellPadding: 2.2,
            lineColor: [226, 232, 240],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [30, 58, 138],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 42, fontStyle: 'bold' },
            2: { cellWidth: 38 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 22 },
            5: { halign: 'center', cellWidth: 22 },
            6: { halign: 'center', cellWidth: 18 },
            7: { halign: 'center', cellWidth: 20 }
        }
    });

    currentY = doc.lastAutoTable.finalY + 8;

    // ----------------------------------------------------
    // 5. DETAIL KEHADIRAN RAPI PER USER DAN PER TANGGAL
    // ----------------------------------------------------
    // Check if new page needed before starting detailed section
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
        // Space check for employee header box + table preview
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
        const userSummaryText = `Total Hadir: ${u.total_attended} Hari  |  Tepat Waktu: ${u.on_time} Hari  |  Total Terlambat: ${u.late} Hari  |  Absen: ${u.absent} Hari`;
        doc.text(userSummaryText, margin + 5, currentY + 8.8);

        currentY += 13;

        // Daily Attendance Table for this Employee
        const detailRows = u.records.map((r, rIdx) => {
            let statusLabel = 'TEPAT WAKTU';
            let keterangan = 'Tepat Waktu';
            if (r.status === 'late') {
                statusLabel = 'TERLAMBAT';
                keterangan = 'Terlambat Masuk';
            } else if (r.status === 'absent') {
                statusLabel = 'ABSEN';
                keterangan = 'Tidak Masuk Kerja';
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
                1: { cellWidth: 38 },
                2: { halign: 'center', cellWidth: 20 },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'center', cellWidth: 20 },
                5: { halign: 'center', cellWidth: 20 },
                6: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
                7: { cellWidth: 32 }
            },
            didParseCell: function(data) {
                // Color status column
                if (data.section === 'body' && data.column.index === 6) {
                    const text = data.cell.raw;
                    if (text === 'TEPAT WAKTU') {
                        data.cell.styles.textColor = [22, 101, 52]; // Dark green
                    } else if (text === 'TERLAMBAT') {
                        data.cell.styles.textColor = [180, 83, 9]; // Dark yellow / amber
                    } else if (text === 'ABSEN') {
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
    const cleanMonth = monthText.replace(/\s+/g, '_');
    let filename = `Rekap_Kehadiran_MGI_${cleanMonth}_${year}`;
    if (selectedUserId) {
        const cleanName = selectedEmpText.split('(')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
        filename += `_${cleanName}`;
    }
    filename += '.pdf';

    doc.save(filename);
    showToast('Laporan PDF rekap kehadiran berhasil diunduh.', 'success');
}
