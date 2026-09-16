/**
 * ==========================================================
 * MGI ERP / HRIS - Reusable Header & Top Navbar
 * ==========================================================
 */

function renderHeader(currentUser = null) {
  const headerContainer = document.getElementById('app-header');
  if (!headerContainer) return;

  const email = currentUser ? currentUser.email : 'user@mgi.co.id';
  const roleName = currentUser ? currentUser.role_name : 'IT';

  // Fallback getAppUrl if not available
  const toUrl = typeof getAppUrl === 'function' ? getAppUrl : (p) => p;

  headerContainer.innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <button class="btn btn-outline-secondary d-lg-none" type="button" id="sidebarToggleBtn" aria-label="Toggle Navigation">
        <i class="bi bi-list fs-5"></i>
      </button>
      <div class="fw-semibold text-secondary d-none d-md-block">
        PT Montana Global Investama
      </div>
    </div>

    <div class="d-flex align-items-center gap-3">
      <!-- Notification Dropdown -->
      <div class="dropdown">
        <button class="btn btn-light position-relative rounded-circle p-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Notifications" id="notificationDropdownBtn">
          <i class="bi bi-bell fs-5 text-secondary"></i>
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" id="notificationBadge" style="font-size: 0.65rem;">
            0
          </span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow border-0" id="notificationMenuList" style="min-width: 300px; max-height: 400px; overflow-y: auto;">
          <li class="dropdown-header fw-bold text-dark d-flex justify-content-between align-items-center">
            <span>Notifikasi</span>
            <span class="badge bg-light text-muted fw-normal" id="notificationCountBadge">0 pesan</span>
          </li>
          <li><hr class="dropdown-divider my-1"></li>
          <li class="text-center py-3 text-muted small" id="notificationLoading">
            <span class="spinner-border spinner-border-sm me-1"></span> Memuat...
          </li>
        </ul>
      </div>

      <!-- User Profile Dropdown -->
      <div class="dropdown">
        <button class="btn btn-light d-flex align-items-center gap-2 border px-3 py-1 rounded-pill" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style="width: 32px; height: 32px; font-size: 0.85rem;">
            ${email.charAt(0).toUpperCase()}
          </div>
          <div class="text-start d-none d-sm-block" style="line-height: 1.2;">
            <div class="fw-semibold text-dark small text-truncate" style="max-width: 140px;">${email}</div>
            <span class="badge bg-primary-subtle text-primary" style="font-size: 0.65rem;">${roleName}</span>
          </div>
          <i class="bi bi-chevron-down text-muted small ms-1"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
          <li class="px-3 py-2 border-bottom">
            <div class="fw-bold text-dark">${email}</div>
            <div class="text-muted small">Role: ${roleName}</div>
          </li>
          <li><a class="dropdown-item py-2" href="${toUrl('/frontend/pages/user/profile.html')}"><i class="bi bi-person me-2"></i> My Profile</a></li>
          <li><a class="dropdown-item py-2" href="${toUrl('/frontend/dashboard.html')}"><i class="bi bi-speedometer2 me-2"></i> Dashboard</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item py-2 text-danger" id="logoutBtn" onclick="handleLogout()"><i class="bi bi-box-arrow-right me-2"></i> Keluar</button></li>
        </ul>
      </div>
    </div>
  `;

  // Attach mobile sidebar toggle event
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('app-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }

  // Load real notifications
  loadHeaderNotifications(currentUser);
}

async function loadHeaderNotifications(currentUser) {
  const badge = document.getElementById('notificationBadge');
  const list = document.getElementById('notificationMenuList');
  const countBadge = document.getElementById('notificationCountBadge');
  if (!badge || !list) return;

  const toUrl = typeof getAppUrl === 'function' ? getAppUrl : (p) => p;

  try {
    const res = await apiGet('/backend/api/notifications.php');
    if (res.success && Array.isArray(res.data)) {
      const notifications = res.data;
      const unreadCount = notifications.filter(n => n.is_read == 0 || n.is_read == '0').length;

      if (unreadCount > 0) {
        badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('d-none');
      } else {
        badge.classList.add('d-none');
      }

      if (countBadge) {
        countBadge.innerText = `${notifications.length} pesan`;
      }

      if (notifications.length === 0) {
        list.innerHTML = `
          <li class="dropdown-header fw-bold text-dark d-flex justify-content-between align-items-center">
            <span>Notifikasi</span>
            <span class="badge bg-light text-muted fw-normal">0 pesan</span>
          </li>
          <li><hr class="dropdown-divider my-1"></li>
          <li class="text-center py-4 text-muted small">
            <i class="bi bi-bell-slash fs-4 d-block mb-1 text-secondary"></i>
            Tidak ada notifikasi
          </li>
        `;
        return;
      }

      let itemsHtml = `
        <li class="dropdown-header fw-bold text-dark d-flex justify-content-between align-items-center">
          <span>Notifikasi</span>
          <span class="badge bg-light text-muted fw-normal">${notifications.length} pesan</span>
        </li>
        <li><hr class="dropdown-divider my-1"></li>
      `;

      notifications.forEach(n => {
        let iconClass = 'bi-info-circle text-info';
        let bgSubtle = '';
        if (n.type === 'success') {
          iconClass = 'bi-check-circle-fill text-success';
        } else if (n.type === 'danger') {
          iconClass = 'bi-x-circle-fill text-danger';
        } else if (n.type === 'warning') {
          iconClass = 'bi-exclamation-triangle-fill text-warning';
        }

        if (n.is_read == 0 || n.is_read == '0') {
          bgSubtle = 'bg-light';
        }

        // Determine target link
        let targetHref = '#';
        if (n.reference_type === 'PROFILE_REQ') {
          if (currentUser && [2, 7].includes(Number(currentUser.role_id))) {
            targetHref = toUrl('/frontend/pages/hrga/profile-requests.html');
          } else {
            targetHref = toUrl('/frontend/pages/user/profile.html');
          }
        }

        itemsHtml += `
          <li>
            <a class="dropdown-item py-2 px-3 ${bgSubtle} border-bottom border-light" href="${targetHref}">
              <div class="d-flex align-items-start gap-2">
                <i class="bi ${iconClass} fs-6 mt-1"></i>
                <div class="flex-grow-1" style="min-width: 0;">
                  <div class="d-flex justify-content-between align-items-baseline">
                    <span class="small fw-semibold text-dark text-truncate">${n.title || 'Pemberitahuan'}</span>
                    <span class="text-muted" style="font-size: 0.68rem;">${formatTimeAgo(n.created_at)}</span>
                  </div>
                  <div class="text-muted small text-break mt-1" style="font-size: 0.78rem; line-height: 1.3;">
                    ${n.message || ''}
                  </div>
                </div>
              </div>
            </a>
          </li>
        `;
      });

      list.innerHTML = itemsHtml;
    }
  } catch (err) {
    if (list) {
      list.innerHTML = `
        <li class="dropdown-header fw-bold text-dark">Notifikasi</li>
        <li><hr class="dropdown-divider my-1"></li>
        <li class="text-center py-3 text-muted small">Gagal memuat notifikasi</li>
      `;
    }
  }
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return 'baru saja';
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)}m lalu`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)}j lalu`;
  return `${Math.floor(diffInSec / 86400)}h lalu`;
}

async function handleLogout() {
  const toUrl = typeof getAppUrl === 'function' ? getAppUrl : (p) => p;
  try {
    await apiPost('/backend/api/auth/logout.php');
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    localStorage.removeItem('mgi_user');
    window.location.href = toUrl('/frontend/login.html');
  }
}
