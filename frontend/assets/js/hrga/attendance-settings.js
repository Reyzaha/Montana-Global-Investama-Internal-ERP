let currentUser = null;
let map = null;
let marker = null;
let circle = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    if (!currentUser) return;
    
    // Only HRGA and Admin allowed
    if (currentUser.role_id !== 2 && currentUser.role_id !== 7) {
        window.location.href = '/frontend/dashboard.html';
        return;
    }

    renderSidebar('attendance_settings', currentUser);
    renderHeader(currentUser);

    await loadSettings();

    document.getElementById('radius_meters').addEventListener('input', updateCircleRadius);
    document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
});

async function loadSettings() {
    try {
        const res = await apiGet('/backend/api/attendance/settings.php');
        if (res.success) {
            const settings = res.data.settings;
            const location = res.data.location;

            // Populate time
            document.getElementById('check_in_time').value = settings.check_in_time || '08:00';
            document.getElementById('check_out_time').value = settings.check_out_time || '17:00';
            document.getElementById('break_start_time').value = settings.break_start_time || '12:00';
            document.getElementById('break_end_time').value = settings.break_end_time || '13:00';

            // Populate Location
            if (location) {
                document.getElementById('location_name').value = location.name || '';
                document.getElementById('location_address').value = location.address || '';
                document.getElementById('latitude').value = location.latitude;
                document.getElementById('longitude').value = location.longitude;
                document.getElementById('radius_meters').value = location.radius || '100';
                initMap(location.latitude, location.longitude, location.radius || 100);
            } else {
                // Default fallback (e.g. Jakarta)
                initMap(-6.2088, 106.8456, 100);
            }
        }
    } catch (e) {
        showToast('Gagal memuat pengaturan.', 'danger');
    }
}

function initMap(lat, lng, radius) {
    if (map) return; // Prevent re-init

    map = L.map('map').setView([lat, lng], 16); // Zoom level 16

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Initial Marker
    marker = L.marker([lat, lng], {draggable: true}).addTo(map);
    
    // Initial Circle (Radius)
    circle = L.circle([lat, lng], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: parseInt(radius)
    }).addTo(map);

    // Geocoder Search Control
    if (L.Control.Geocoder) {
        L.Control.geocoder({
            defaultMarkGeocode: false,
            placeholder: "Search Location..."
        })
        .on('markgeocode', function(e) {
            const bbox = e.geocode.bbox;
            const center = e.geocode.center;
            
            map.fitBounds(bbox);
            marker.setLatLng(center);
            updateCoordinates(center.lat, center.lng);
            
            if(e.geocode.name) {
                document.getElementById('location_address').value = e.geocode.name;
                if(!document.getElementById('location_name').value) {
                    // Try to guess a short name
                    document.getElementById('location_name').value = e.geocode.name.split(',')[0];
                }
            }
        })
        .addTo(map);
    }

    // When marker is dragged
    marker.on('dragend', function (event) {
        const position = marker.getLatLng();
        updateCoordinates(position.lat, position.lng);
    });

    // When map is clicked
    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        updateCoordinates(e.latlng.lat, e.latlng.lng);
    });
}

function updateCoordinates(lat, lng) {
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;
    
    if (circle) {
        circle.setLatLng([lat, lng]);
    }
}

function updateCircleRadius(e) {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0 && circle) {
        circle.setRadius(val);
    }
}

async function saveSettings() {
    const check_in_time = document.getElementById('check_in_time').value;
    const check_out_time = document.getElementById('check_out_time').value;
    const break_start_time = document.getElementById('break_start_time').value;
    const break_end_time = document.getElementById('break_end_time').value;
    const name = document.getElementById('location_name').value.trim();
    const address = document.getElementById('location_address').value.trim();
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);
    const radius = parseInt(document.getElementById('radius_meters').value);

    if (!check_in_time || !check_out_time || !break_start_time || !break_end_time || isNaN(latitude) || isNaN(longitude) || isNaN(radius) || !name) {
        showToast('Pastikan semua field jam kerja, jam istirahat, dan lokasi terisi dengan benar.', 'warning');
        return;
    }

    const payload = {
        check_in_time,
        check_out_time,
        break_start_time,
        break_end_time,
        name,
        address,
        latitude,
        longitude,
        radius,
        radius_unit: 'meter'
    };

    const btn = document.getElementById('btnSaveSettings');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Menyimpan...`;

    try {
        const res = await apiPost('/backend/api/attendance/settings.php', payload);
        if (res.success) {
            showToast('Pengaturan absensi berhasil disimpan.', 'success');
        } else {
            showToast(res.message, 'danger');
        }
    } catch (e) {
        showToast('Terjadi kesalahan jaringan.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}
