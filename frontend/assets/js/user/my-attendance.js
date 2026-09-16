let currentUser = null;
let currentLat = null;
let currentLng = null;
let currentAccuracy = null;
let locationStatusText = "";

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
                if (!todayRecord && res.data.server_date) {
                    todayRecord = list.find(item => item.date === res.data.server_date) || null;
                }
            }

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
                if (item.status === 'on_time') badgeClass = 'bg-success';
                if (item.status === 'late') badgeClass = 'bg-warning text-dark';
                if (item.status === 'absent') badgeClass = 'bg-danger';

                tr.innerHTML = `
                    <td class="ps-3 fw-semibold">${item.date}</td>
                    <td>${item.check_in ? item.check_in : '-'}</td>
                    <td>${item.break_start ? item.break_start : '-'}</td>
                    <td>${item.break_end ? item.break_end : '-'}</td>
                    <td>${item.check_out ? item.check_out : '-'}</td>
                    <td><span class="badge ${badgeClass}">${(item.status || 'pending').replace('_', ' ').toUpperCase()}</span></td>
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

