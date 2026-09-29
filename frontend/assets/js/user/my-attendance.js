let currentUser = null;
let currentLat = null;
let currentLng = null;
let currentAccuracy = null;
let locationStatusText = "";
let currentAttendanceList = [];
let currentEmployeeInfo = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;

    renderSidebar('attendance', currentUser);
    renderHeader(currentUser);

    // Live Digital Clock & Current Date
    updateLiveClock();
    setInterval(updateLiveClock, 1000);

    // Watch location
    initGeolocation();

    // Load attendance history and today's status
    loadMyAttendance();

    // Load overtime history and setup submit form
    loadMyOvertime();
    setupOvertimeForm();

    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.warn('PWA ServiceWorker registration failed:', err);
        });
    }
});

function updateLiveClock() {
    const now = new Date();
    const clockEl = document.getElementById('digitalClock');
    if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('id-ID');
    }
    const dateEl = document.getElementById('currentDateText');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('id-ID', options) + ' (WIB)';
    }
}

function initGeolocation() {
    const statusText = document.getElementById('locationStatus');
    
    if (!navigator.geolocation) {
        statusText.textContent = "Geolocation tidak didukung oleh browser Anda.";
        return;
    }

    navigator.geolocation.watchPosition(
        (position) => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
            currentAccuracy = position.coords.accuracy;
            locationStatusText = `Lokasi terdeteksi (Akurasi: ${Math.round(currentAccuracy)}m)`;
            statusText.innerHTML = `<span class="text-success"><i class="bi bi-geo-alt-fill"></i> ${locationStatusText}</span>`;
        },
        (error) => {
            let msg = "Gagal mengambil lokasi.";
            if (error.code === 1) msg = "Izin lokasi ditolak. Silakan izinkan akses lokasi pada browser Anda.";
            if (error.code === 2) msg = "Lokasi tidak tersedia atau GPS mati.";
            if (error.code === 3) msg = "Waktu pengambilan lokasi habis.";
            statusText.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle"></i> ${msg}</span>`;
            currentLat = null;
            currentLng = null;
            currentAccuracy = null;
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function loadMyAttendance() {
    const tbody = document.getElementById('attendanceTableBody');
    try {
        const res = await apiGet('/backend/api/attendance/my-attendance.php');
        if (res.success) {
            let todayRecord = null;
            let list = [];

            if (Array.isArray(res.data)) {
                list = res.data;
                const todayStr = getTodayString();
                todayRecord = list.find(item => item.date === todayStr) || null;
            } else if (res.data && typeof res.data === 'object') {
                list = res.data.history || [];
                todayRecord = res.data.today || null;
                currentEmployeeInfo = res.data.employee || null;
                if (!todayRecord && res.data.server_date) {
                    todayRecord = list.find(item => item.date === res.data.server_date) || null;
                }
            }

            currentAttendanceList = list;
            console.log("Today attendance record:", todayRecord);

            // Update Today Badges & Button States
            updateTodayAttendanceUI(todayRecord);

            if (list.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Tidak ada data absensi dalam 31 hari terakhir.</td></tr>`;
                return;
            }

            tbody.innerHTML = '';
            list.forEach(item => {
                const tr = document.createElement('tr');
                
                let badgeClass = 'bg-secondary';
                let statusLabel = (item.status || 'pending').replace('_', ' ').toUpperCase();

                if (item.status === 'on_time') {
                    badgeClass = 'bg-success';
                    statusLabel = 'HADIR TEPAT WAKTU';
                } else if (item.status === 'late') {
                    badgeClass = 'bg-warning text-dark';
                    statusLabel = 'TERLAMBAT';
                } else if (item.status === 'absent') {
                    badgeClass = 'bg-danger';
                    statusLabel = 'ALPHA / ABSEN';
                } else if (item.status === 'izin') {
                    badgeClass = 'bg-info text-dark';
                    statusLabel = 'IZIN';
                } else if (item.status === 'cuti') {
                    badgeClass = 'bg-primary';
                    statusLabel = 'CUTI';
                } else if (item.status === 'sakit') {
                    badgeClass = 'bg-warning-subtle text-dark border border-warning';
                    statusLabel = 'SAKIT';
                }

                let subText = '';
                if (item.has_approved_permit) {
                    const subName = item.permit_sub_type_name || item.permit_category_name || '';
                    let timePkl = '';
                    if (item.permit_time && item.permit_end_time) {
                        timePkl = ` (Pkl ${item.permit_time.substring(0, 5)} - ${item.permit_end_time.substring(0, 5)})`;
                    } else if (item.permit_time) {
                        timePkl = ` (Pkl ${item.permit_time.substring(0, 5)})`;
                    }
                    subText = `<div class="small text-primary fw-semibold mt-1"><i class="bi bi-info-circle me-1"></i>${subName}${timePkl}</div>`;
                }

                tr.innerHTML = `
                    <td class="ps-3 fw-semibold">${item.date}</td>
                    <td>${item.check_in ? item.check_in : '-'}</td>
                    <td>${item.break_start ? item.break_start : '-'}</td>
                    <td>${item.break_end ? item.break_end : '-'}</td>
                    <td>${item.check_out ? item.check_out : '-'}</td>
                    <td>
                        <span class="badge ${badgeClass}">${statusLabel}</span>
                        ${subText}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading attendance:", e);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Gagal memuat data presensi</td></tr>`;
    }
}

function updateTodayAttendanceUI(today) {
    const checkInEl = document.getElementById('todayCheckIn');
    const breakStartEl = document.getElementById('todayBreakStart');
    const breakEndEl = document.getElementById('todayBreakEnd');
    const checkOutEl = document.getElementById('todayCheckOut');

    const btnCheckIn = document.getElementById('btnCheckIn');
    const btnCheckOut = document.getElementById('btnCheckOut');
    const btnBreakStart = document.getElementById('btnBreakStart');
    const btnBreakEnd = document.getElementById('btnBreakEnd');

    const hasCheckIn = !!(today && today.check_in);
    const hasBreakStart = !!(today && today.break_start);
    const hasBreakEnd = !!(today && today.break_end);
    const hasCheckOut = !!(today && today.check_out);

    if (checkInEl) checkInEl.textContent = hasCheckIn ? today.check_in : '-';
    if (breakStartEl) breakStartEl.textContent = hasBreakStart ? today.break_start : '-';
    if (breakEndEl) breakEndEl.textContent = hasBreakEnd ? today.break_end : '-';
    if (checkOutEl) checkOutEl.textContent = hasCheckOut ? today.check_out : '-';

    // 1. Check In Button State
    if (btnCheckIn) {
        if (hasCheckIn) {
            btnCheckIn.disabled = true;
            btnCheckIn.className = 'btn btn-secondary flex-fill';
            btnCheckIn.title = 'Anda sudah check in hari ini';
            btnCheckIn.innerHTML = `<i class="bi bi-check-circle me-1"></i> Sudah Masuk`;
        } else {
            btnCheckIn.disabled = false;
            btnCheckIn.className = 'btn btn-primary flex-fill';
            btnCheckIn.title = 'Lakukan presensi masuk';
            btnCheckIn.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Check In`;
        }
    }

    // 2. Check Out Button State
    if (btnCheckOut) {
        if (hasCheckOut) {
            btnCheckOut.disabled = true;
            btnCheckOut.className = 'btn btn-secondary flex-fill';
            btnCheckOut.title = 'Anda sudah check out hari ini';
            btnCheckOut.innerHTML = `<i class="bi bi-check-circle me-1"></i> Sudah Pulang`;
        } else if (!hasCheckIn) {
            btnCheckOut.disabled = true;
            btnCheckOut.className = 'btn btn-outline-secondary flex-fill';
            btnCheckOut.title = 'Silakan Check In terlebih dahulu';
            btnCheckOut.innerHTML = `<i class="bi bi-box-arrow-right me-1"></i> Check Out`;
        } else if (hasBreakStart && !hasBreakEnd) {
            btnCheckOut.disabled = true;
            btnCheckOut.className = 'btn btn-outline-secondary flex-fill';
            btnCheckOut.title = 'Selesaikan istirahat terlebih dahulu sebelum check out';
            btnCheckOut.innerHTML = `<i class="bi bi-box-arrow-right me-1"></i> Check Out`;
        } else {
            btnCheckOut.disabled = false;
            btnCheckOut.className = 'btn btn-outline-danger flex-fill';
            btnCheckOut.title = 'Lakukan presensi pulang';
            btnCheckOut.innerHTML = `<i class="bi bi-box-arrow-right me-1"></i> Check Out`;
        }
    }

    // 3. Break Start Button State
    if (btnBreakStart) {
        if (hasCheckOut) {
            btnBreakStart.disabled = true;
            btnBreakStart.className = 'btn btn-secondary flex-fill';
            btnBreakStart.title = 'Presensi hari ini telah selesai';
            btnBreakStart.innerHTML = `<i class="bi bi-dash-circle me-1"></i> Mulai Istirahat`;
        } else if (hasBreakStart) {
            btnBreakStart.disabled = true;
            btnBreakStart.className = 'btn btn-secondary flex-fill';
            btnBreakStart.title = 'Awal istirahat sudah tercatat';
            btnBreakStart.innerHTML = `<i class="bi bi-check-circle me-1"></i> Sudah Istirahat`;
        } else if (!hasCheckIn) {
            btnBreakStart.disabled = true;
            btnBreakStart.className = 'btn btn-outline-secondary flex-fill';
            btnBreakStart.title = 'Silakan Check In terlebih dahulu';
            btnBreakStart.innerHTML = `<i class="bi bi-cup-hot me-1"></i> Mulai Istirahat`;
        } else {
            btnBreakStart.disabled = false;
            btnBreakStart.className = 'btn btn-warning flex-fill text-dark fw-semibold';
            btnBreakStart.title = 'Lakukan presensi mulai istirahat';
            btnBreakStart.innerHTML = `<i class="bi bi-cup-hot me-1"></i> Mulai Istirahat`;
        }
    }

    // 4. Break End Button State
    if (btnBreakEnd) {
        if (hasCheckOut) {
            btnBreakEnd.disabled = true;
            btnBreakEnd.className = 'btn btn-secondary flex-fill';
            btnBreakEnd.title = 'Presensi hari ini telah selesai';
            btnBreakEnd.innerHTML = `<i class="bi bi-dash-circle me-1"></i> Selesai Istirahat`;
        } else if (hasBreakEnd) {
            btnBreakEnd.disabled = true;
            btnBreakEnd.className = 'btn btn-secondary flex-fill';
            btnBreakEnd.title = 'Selesai istirahat sudah tercatat';
            btnBreakEnd.innerHTML = `<i class="bi bi-check2-all me-1"></i> Sudah Selesai`;
        } else if (!hasBreakStart) {
            btnBreakEnd.disabled = true;
            btnBreakEnd.className = 'btn btn-outline-secondary flex-fill';
            btnBreakEnd.title = 'Mulai istirahat terlebih dahulu sebelum selesai istirahat';
            btnBreakEnd.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Selesai Istirahat`;
        } else {
            btnBreakEnd.disabled = false;
            btnBreakEnd.className = 'btn btn-success flex-fill fw-semibold';
            btnBreakEnd.title = 'Lakukan presensi selesai istirahat';
            btnBreakEnd.innerHTML = `<i class="bi bi-check2-circle me-1"></i> Selesai Istirahat`;
        }
    }
}

async function handleAttendance(type) {
    const isBypass = document.getElementById('bypassLocationCheck').checked;
    
    if (!isBypass && (currentLat === null || currentLng === null)) {
        showToast('Pastikan GPS/Lokasi perangkat Anda aktif dan telah diizinkan.', 'warning');
        return;
    }

    let endpoint = '';
    let btnId = '';
    
    if (type === 'checkin') {
        endpoint = '/backend/api/attendance/check-in.php';
        btnId = 'btnCheckIn';
    } else if (type === 'break_start') {
        endpoint = '/backend/api/attendance/break-start.php';
        btnId = 'btnBreakStart';
    } else if (type === 'break_end') {
        endpoint = '/backend/api/attendance/break-end.php';
        btnId = 'btnBreakEnd';
    } else if (type === 'checkout') {
        endpoint = '/backend/api/attendance/check-out.php';
        btnId = 'btnCheckOut';
    } else {
        console.error('Tipe presensi tidak dikenali:', type);
        return;
    }

    const payload = {
        bypass_location: isBypass,
        latitude: currentLat,
        longitude: currentLng,
        accuracy: currentAccuracy
    };

    const btn = document.getElementById(btnId);
    if (!btn) return;

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Loading...`;

    let isSuccess = false;

    try {
        console.log(`Mengirim presensi [${type}] ke ${endpoint}`, payload);
        const res = await apiPost(endpoint, payload);
        console.log(`Respon presensi [${type}]:`, res);

        if (res.success) {
            isSuccess = true;
            let msg = res.message;
            if (!isBypass && res.data && res.data.distance !== undefined) {
                msg += ` (Jarak: ${res.data.distance} meter)`;
            }
            showToast(msg, 'success');
            await loadMyAttendance();
        } else {
            if (res.code === 'LOCATION_ACCURACY_LOW') {
                showToast(res.message, 'warning');
            } else if (res.code === 'OUTSIDE_ATTENDANCE_RADIUS') {
                showToast(`Anda berada di luar radius absensi. Jarak Anda: ${res.data.distance}m, Max Radius: ${res.data.allowed_radius}m`, 'danger');
            } else {
                showToast(res.message, 'danger');
            }
        }
    } catch (e) {
        console.error(`Kesalahan presensi [${type}]:`, e);
        showToast('Terjadi kesalahan jaringan.', 'danger');
    } finally {
        if (!isSuccess) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

/**
 * Load overtime history for the logged-in user
 */
async function loadMyOvertime() {
    const tbody = document.getElementById('overtimeTableBody');
    if (!tbody) return;

    try {
        const res = await apiGet('/backend/api/hrga/overtime-requests.php');
        if (res.success && res.data && res.data.items) {
            tbody.innerHTML = '';
            if (res.data.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada riwayat pengajuan lembur</td></tr>`;
                return;
            }

            res.data.items.forEach(item => {
                const tr = document.createElement('tr');
                let badgeClass = 'bg-secondary';
                let statusLabel = item.status;

                if (item.status === 'pending_hrga') {
                    badgeClass = 'bg-warning text-dark';
                    statusLabel = 'Menunggu HRGA';
                } else if (item.status === 'pending_pm') {
                    badgeClass = 'bg-info text-dark';
                    statusLabel = 'Menunggu PM';
                } else if (item.status === 'approved') {
                    badgeClass = 'bg-success';
                    statusLabel = 'Disetujui';
                } else if (item.status === 'rejected') {
                    badgeClass = 'bg-danger';
                    statusLabel = 'Ditolak';
                }

                tr.innerHTML = `
                    <td class="ps-3 fw-semibold">${item.date}</td>
                    <td>${item.start_time}</td>
                    <td>${item.end_time}</td>
                    <td><span class="badge bg-light text-dark border">${item.duration_hours} Jam</span></td>
                    <td style="max-width: 250px;" class="text-truncate" title="${item.reason}">${item.reason}</td>
                    <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                    <td><small class="text-muted">${item.rejection_note ? item.rejection_note : '-'}</small></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading overtime:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Gagal memuat data lembur</td></tr>`;
    }
}

/**
 * Setup Overtime Modal Form submission
 */
function setupOvertimeForm() {
    const form = document.getElementById('formOvertime');
    const otDate = document.getElementById('otDate');
    if (otDate && !otDate.value) {
        otDate.value = new Date().toISOString().split('T')[0];
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitOvertime');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Mengirim...`;

        const payload = {
            date: document.getElementById('otDate').value,
            start_time: document.getElementById('otStartTime').value,
            end_time: document.getElementById('otEndTime').value,
            reason: document.getElementById('otReason').value
        };

        try {
            const res = await apiPost('/backend/api/hrga/overtime-requests.php', payload);
            if (res.success) {
                showToast(res.message, 'success');
                form.reset();
                if (otDate) otDate.value = new Date().toISOString().split('T')[0];
                const modalEl = document.getElementById('overtimeModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                await loadMyOvertime();
            } else {
                showToast(res.message, 'danger');
            }
        } catch (err) {
            console.error("Error submitting overtime:", err);
            showToast("Terjadi kesalahan sistem saat mengajukan lembur.", "danger");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

/**
 * Export My Attendance Recap to Professional PDF using jsPDF & AutoTable
 */
window.exportMyAttendancePdf = function() {
    if (!currentAttendanceList || currentAttendanceList.length === 0) {
        showToast('Tidak ada data riwayat presensi untuk diekspor.', 'warning');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('Modul PDF (jsPDF) sedang dimuat. Silakan tunggu beberapa detik dan coba lagi.', 'warning');
        return;
    }

    const btnExport = document.getElementById('btnExportMyAttendancePdf');
    const oldBtnHtml = btnExport ? btnExport.innerHTML : '';
    if (btnExport) {
        btnExport.disabled = true;
        btnExport.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyiapkan PDF...';
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;

        // Determine employee metadata
        const emp = currentEmployeeInfo || currentUser || {};
        const empName = emp.name || emp.username || emp.email || 'Karyawan MGI';
        const empEmail = emp.email || '-';
        const empPosition = emp.position || emp.role_name || 'Staff Pegawai';

        // Sort data chronologically descending for display
        const records = [...currentAttendanceList].sort((a, b) => (a.date < b.date ? 1 : -1));
        const dates = records.map(r => r.date).filter(Boolean).sort();
        const earliestDate = dates.length > 0 ? dates[0] : '';
        const latestDate = dates.length > 0 ? dates[dates.length - 1] : '';

        // Helper date format in Indonesian
        function formatIndoDate(dateStr) {
            if (!dateStr) return '-';
            try {
                const d = new Date(dateStr + 'T00:00:00');
                const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            } catch (e) {
                return dateStr;
            }
        }

        // Helper calculate work duration
        function calcWorkDuration(checkIn, checkOut, breakStart, breakEnd) {
            if (!checkIn || !checkOut) return '-';
            const parseTime = (t) => {
                const parts = t.split(':');
                return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            };
            const inMins = parseTime(checkIn);
            const outMins = parseTime(checkOut);
            let totalMins = Math.max(0, outMins - inMins);

            if (breakStart && breakEnd) {
                const bsMins = parseTime(breakStart);
                const beMins = parseTime(breakEnd);
                if (beMins > bsMins) {
                    totalMins = Math.max(0, totalMins - (beMins - bsMins));
                }
            }

            const h = Math.floor(totalMins / 60);
            const m = totalMins % 60;
            return `${h} Jam ${m > 0 ? m + ' Mnt' : ''}`.trim();
        }

        // Calculate statistics
        let countHadir = 0;
        let countOnTime = 0;
        let countLate = 0;
        let countPermit = 0;
        let countAbsent = 0;

        records.forEach(r => {
            const st = (r.status || '').toLowerCase();
            if (r.check_in) countHadir++;
            if (st === 'on_time') countOnTime++;
            else if (st === 'late') countLate++;
            else if (st === 'absent') countAbsent++;

            if (r.has_approved_permit || ['izin', 'cuti', 'sakit'].includes(st)) {
                countPermit++;
            }
        });

        const totalRecords = records.length;
        const onTimePct = countHadir > 0 ? Math.round((countOnTime / countHadir) * 100) : 0;
        const latePct = countHadir > 0 ? Math.round((countLate / countHadir) * 100) : 0;

        let currentY = 16;

        // 1. KOP SURAT PERUSAHAAN (COMPANY HEADER)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138); // Navy
        doc.text("PT MONTANA GLOBAL INVESTAMA", margin, currentY);

        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // Slate Gray
        doc.text("Internal ERP & HRIS Management System - Employee Self Service (Rekap Presensi Karyawan)", margin, currentY);

        currentY += 4;
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(1.2);
        doc.line(margin, currentY, pageWidth - margin, currentY);

        currentY += 1.5;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(margin, currentY, pageWidth - margin, currentY);

        currentY += 7.5;

        // 2. JUDUL DOKUMEN & SUBTITLE
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // Slate dark
        doc.text("LAPORAN REKAPITULASI PRESENSI PRIBADI (MY ATTENDANCE)", pageWidth / 2, currentY, { align: "center" });

        currentY += 5.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const periodText = earliestDate && latestDate ? `Periode: ${formatIndoDate(earliestDate)} s/d ${formatIndoDate(latestDate)} (31 Hari Terakhir)` : 'Periode 31 Hari Terakhir';
        doc.text(periodText, pageWidth / 2, currentY, { align: "center" });

        currentY += 6;

        // 3. KOTAK INFORMASI PEGAWAI (EMPLOYEE INFO CARD)
        const infoCardHeight = 16;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), infoCardHeight, 1.5, 1.5, 'FD');

        const col1X = margin + 4;
        const col2X = margin + ((pageWidth - (margin * 2)) / 2) + 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Nama Karyawan :", col1X, currentY + 5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(empName, col1X + 26, currentY + 5.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Jabatan / Posisi :", col1X, currentY + 11.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(empPosition, col1X + 26, currentY + 11.5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Email Karyawan :", col2X, currentY + 5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(empEmail, col2X + 26, currentY + 5.5);

        const nowFormatted = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("Waktu Cetak :", col2X, currentY + 11.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(nowFormatted, col2X + 26, currentY + 11.5);

        currentY += infoCardHeight + 5;

        // 4. SUMMARY METRIC BOXES (4 KPI CARDS)
        const boxGap = 3;
        const boxCount = 4;
        const totalBoxWidth = pageWidth - (margin * 2) - (boxGap * (boxCount - 1));
        const boxWidth = totalBoxWidth / boxCount;
        const boxHeight = 14;

        // Box 1: Total Hari
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.roundedRect(margin, currentY, boxWidth, boxHeight, 1.2, 1.2, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(30, 64, 175);
        doc.text("TOTAL REKAP", margin + 3, currentY + 4.5);
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${totalRecords} Hari`, margin + 3, currentY + 11);

        // Box 2: Tepat Waktu
        const b2X = margin + boxWidth + boxGap;
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(b2X, currentY, boxWidth, boxHeight, 1.2, 1.2, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(22, 101, 52);
        doc.text("TEPAT WAKTU", b2X + 3, currentY + 4.5);
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${countOnTime} (${onTimePct}%)`, b2X + 3, currentY + 11);

        // Box 3: Terlambat
        const b3X = b2X + boxWidth + boxGap;
        doc.setFillColor(254, 252, 232);
        doc.setDrawColor(254, 240, 138);
        doc.roundedRect(b3X, currentY, boxWidth, boxHeight, 1.2, 1.2, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(161, 98, 7);
        doc.text("TERLAMBAT", b3X + 3, currentY + 4.5);
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${countLate} (${latePct}%)`, b3X + 3, currentY + 11);

        // Box 4: Izin/Cuti/Sakit
        const b4X = b3X + boxWidth + boxGap;
        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(b4X, currentY, boxWidth, boxHeight, 1.2, 1.2, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(75, 85, 99);
        doc.text("IZIN/CUTI/SAKIT", b4X + 3, currentY + 4.5);
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${countPermit} Hari`, b4X + 3, currentY + 11);

        currentY += boxHeight + 7;

        // 5. TABEL RINCIAN KEHADIRAN (AUTOTABLE)
        const tableData = records.map((r, idx) => {
            const dateFmt = formatIndoDate(r.date);
            const inTime = r.check_in ? r.check_in.substring(0, 5) : '-';
            const brkStart = r.break_start ? r.break_start.substring(0, 5) : '-';
            const brkEnd = r.break_end ? r.break_end.substring(0, 5) : '-';
            const breakTime = (brkStart !== '-' || brkEnd !== '-') ? `${brkStart} - ${brkEnd}` : '-';
            const outTime = r.check_out ? r.check_out.substring(0, 5) : '-';
            const workDur = calcWorkDuration(r.check_in, r.check_out, r.break_start, r.break_end);

            let statusText = (r.status || '-').toUpperCase();
            if (r.status === 'on_time') statusText = 'HADIR TEPAT WAKTU';
            if (r.status === 'late') statusText = 'TERLAMBAT';
            if (r.status === 'absent') statusText = 'ALPHA';

            if (r.has_approved_permit) {
                const sub = r.permit_sub_type_name || r.permit_category_name || '';
                let timeStr = '';
                if (r.permit_time && r.permit_end_time) {
                    timeStr = ` (Pkl ${r.permit_time.substring(0, 5)} - ${r.permit_end_time.substring(0, 5)} WIB)`;
                } else if (r.permit_time) {
                    timeStr = ` (Pkl ${r.permit_time.substring(0, 5)} WIB)`;
                }
                statusText = `${statusText} - [${sub}${timeStr}]`;
            }

            return [
                idx + 1,
                dateFmt,
                inTime,
                breakTime,
                outTime,
                workDur,
                statusText
            ];
        });

        doc.autoTable({
            startY: currentY,
            margin: { left: margin, right: margin },
            head: [['No', 'Hari & Tanggal', 'Masuk', 'Istirahat', 'Pulang', 'Jam Kerja', 'Status / Keterangan Presensi']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                cellPadding: 2.2
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [30, 41, 59],
                valign: 'middle',
                cellPadding: 2
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 9 },
                1: { cellWidth: 34 },
                2: { halign: 'center', cellWidth: 17 },
                3: { halign: 'center', cellWidth: 24 },
                4: { halign: 'center', cellWidth: 17 },
                5: { halign: 'center', cellWidth: 20 },
                6: { cellWidth: 'auto' }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 6) {
                    const text = data.cell.raw || '';
                    if (text.includes('TEPAT WAKTU')) {
                        data.cell.styles.textColor = [22, 101, 52]; // Green
                        data.cell.styles.fontStyle = 'bold';
                    } else if (text.includes('TERLAMBAT')) {
                        data.cell.styles.textColor = [161, 98, 7]; // Amber
                        data.cell.styles.fontStyle = 'bold';
                    } else if (text.includes('ALPHA') || text.includes('ABSEN')) {
                        data.cell.styles.textColor = [185, 28, 28]; // Red
                        data.cell.styles.fontStyle = 'bold';
                    } else if (text.includes('IZIN') || text.includes('CUTI') || text.includes('SAKIT')) {
                        data.cell.styles.textColor = [30, 64, 175]; // Blue
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        let finalY = doc.lastAutoTable.finalY + 10;

        // Check if there is enough space for signatures on the same page
        if (finalY + 45 > pageHeight - 15) {
            doc.addPage();
            finalY = 20;
        }

        // 6. LEMBAR PENGESAHAN / SIGNATURE
        const sigWidth = 70;
        const leftSigX = margin + 10;
        const rightSigX = pageWidth - margin - sigWidth - 10;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        // Left: Karyawan
        doc.text("Karyawan yang bersangkutan,", leftSigX, finalY);
        doc.text("( Ditandatangani secara digital )", leftSigX, finalY + 18);
        doc.setFont("helvetica", "bold");
        doc.text(empName, leftSigX, finalY + 23);
        doc.setFont("helvetica", "normal");
        doc.text(empPosition, leftSigX, finalY + 27);

        // Right: HRGA / PM
        doc.text("Mengetahui & Menyetujui,", rightSigX, finalY);
        doc.text("Divisi HRGA / Manajemen", rightSigX, finalY + 4);
        doc.text("( ..................................................... )", rightSigX, finalY + 23);
        doc.text("Tanggal: .......................................", rightSigX, finalY + 27);

        // 7. FOOTER & PAGE NUMBERING
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

            doc.text("Dokumen ini dihasilkan secara otomatis oleh Sistem ERP PT Montana Global Investama.", margin, pageHeight - 6.5);
            doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: "right" });
        }

        // Save PDF
        const cleanEmpName = empName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `Rekap_Presensi_${cleanEmpName}_${getTodayString()}.pdf`;
        doc.save(fileName);

        showToast('Rekap presensi berhasil diekspor ke PDF.', 'success');
    } catch (err) {
        console.error("Gagal export PDF my attendance:", err);
        showToast('Gagal mengekspor PDF presensi: ' + err.message, 'danger');
    } finally {
        if (btnExport) {
            btnExport.disabled = false;
            btnExport.innerHTML = oldBtnHtml;
        }
    }
};

