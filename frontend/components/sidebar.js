/**
 * ==========================================================
 * MGI ERP / HRIS - Reusable Navigation Sidebar
 * ==========================================================
 */

function renderSidebar(activeMenu = 'dashboard', currentUser = null) {
  const sidebarContainer = document.getElementById('app-sidebar');
  if (!sidebarContainer) return;

  const roleId = currentUser ? parseInt(currentUser.role_id) : 1;
  const roleName = currentUser ? currentUser.role_name : 'IT';

  // Fallback getAppUrl if not available
  const toUrl = typeof getAppUrl === 'function' ? getAppUrl : (p) => p;

  let roleMenusHtml = '';

  // 1. IT Role Specific Menu
  if (roleId === 1 || roleId === 7) { // IT or Admin
    roleMenusHtml += `
      <div class="sidebar-heading">IT Management</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/it/devices.html')}" class="sidebar-link ${activeMenu === 'devices' ? 'active' : ''}">
          <i class="bi bi-laptop"></i>
          <span>Device Management</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/it/emails.html')}" class="sidebar-link ${activeMenu === 'emails' ? 'active' : ''}">
          <i class="bi bi-envelope-at"></i>
          <span>Email & Accounts</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/it/users.html')}" class="sidebar-link ${activeMenu === 'users' ? 'active' : ''}">
          <i class="bi bi-people"></i>
          <span>User Management</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/it/create-user.html')}" class="sidebar-link ${activeMenu === 'create-user' ? 'active' : ''}">
          <i class="bi bi-person-plus"></i>
          <span>Create User</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/it/access-control.html')}" class="sidebar-link ${activeMenu === 'access_control' ? 'active' : ''}">
          <i class="bi bi-shield-lock"></i>
          <span>Access Control</span>
        </a>
      </li>
      <div class="sidebar-heading">System</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/it/activity-log.html')}" class="sidebar-link ${activeMenu === 'activity-log' ? 'active' : ''}">
          <i class="bi bi-journal-text"></i>
          <span>Activity Log</span>
        </a>
      </li>
    `;
  }

  // Common HRGA / Attendance & Permit items for all roles
  roleMenusHtml += `
    <div class="sidebar-heading">Employee Self Service</div>
    <li class="sidebar-item">
      <a href="${toUrl('/frontend/pages/user/my-attendance.html')}" class="sidebar-link ${activeMenu === 'attendance' ? 'active' : ''}">
        <i class="bi bi-clock-history"></i>
        <span>My Attendance</span>
      </a>
    </li>
    <li class="sidebar-item">
      <a href="${toUrl('/frontend/pages/user/my-permit.html')}" class="sidebar-link ${activeMenu === 'my_permit' ? 'active' : ''}">
        <i class="bi bi-file-earmark-text"></i>
        <span>My Permits</span>
      </a>
    </li>
    <li class="sidebar-item">
      <a href="${toUrl('/frontend/pages/user/documents-overview.html')}" class="sidebar-link ${activeMenu === 'shared_documents' ? 'active' : ''}">
        <i class="bi bi-folder-symlink"></i>
        <span>Shared Documents</span>
      </a>
    </li>
  `;

  // Legal Role Management
  if (roleId === 3 || roleId === 7) {
    roleMenusHtml += `
      <div class="sidebar-heading">Legal Management</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/legal/documents.html')}" class="sidebar-link ${activeMenu === 'legal_documents' ? 'active' : ''}">
          <i class="bi bi-briefcase"></i>
          <span>Document Management</span>
        </a>
      </li>
    `;
  }

  // PM Role Specific Menu
  if (roleId === 6 || roleId === 7) {
    roleMenusHtml += `
      <div class="sidebar-heading">PM Management</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/pm/permits.html')}" class="sidebar-link ${activeMenu === 'pm_permits' ? 'active' : ''}">
          <i class="bi bi-patch-check"></i>
          <span>Approve Permit</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/pm/expense-requests.html')}" class="sidebar-link ${activeMenu === 'pm_expense' ? 'active' : ''}">
          <i class="bi bi-wallet2"></i>
          <span>Approve Pengajuan Biaya</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/pm/expense-verification.html')}" class="sidebar-link ${activeMenu === 'pm_verification' ? 'active' : ''}">
          <i class="bi bi-shield-check"></i>
          <span>Verifikasi Barang & Nota</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/pm/petty-cash.html')}" class="sidebar-link ${activeMenu === 'pm_petty_cash' ? 'active' : ''}">
          <i class="bi bi-graph-up-arrow"></i>
          <span>Monitoring Petty Cash</span>
        </a>
      </li>
    `;
  }

  // HRGA Management Menu
  if (roleId === 2 || roleId === 7) {
    roleMenusHtml += `
      <div class="sidebar-heading">HRGA Management</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/permit.html')}" class="sidebar-link ${activeMenu === 'hrga_permit' ? 'active' : ''}">
          <i class="bi bi-ui-checks"></i>
          <span>Permit Approval</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/permit-sub-types.html')}" class="sidebar-link ${activeMenu === 'permit_sub_types' ? 'active' : ''}">
          <i class="bi bi-ui-checks-grid"></i>
          <span>Sub-Jenis Izin & Cuti</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/manage-attendance.html')}" class="sidebar-link ${activeMenu === 'hrga_attendance' ? 'active' : ''}">
          <i class="bi bi-calendar-check"></i>
          <span>Attendance Recap</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/employees.html')}" class="sidebar-link ${activeMenu === 'hrga_employees' ? 'active' : ''}">
          <i class="bi bi-people-fill"></i>
          <span>Employees</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/profile-requests.html')}" class="sidebar-link ${activeMenu === 'profile_requests' ? 'active' : ''}">
          <i class="bi bi-person-lines-fill"></i>
          <span>Profile Requests</span>
        </a>
      </li>
      <div class="sidebar-heading">Expense & Petty Cash</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/expense-requests.html')}" class="sidebar-link ${activeMenu === 'hrga_expense' ? 'active' : ''}">
          <i class="bi bi-receipt"></i>
          <span>Pengajuan Biaya (Ticketing)</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/expense-realization.html')}" class="sidebar-link ${activeMenu === 'hrga_realization' ? 'active' : ''}">
          <i class="bi bi-camera"></i>
          <span>Realisasi & Bukti Belanja</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/petty-cash.html')}" class="sidebar-link ${activeMenu === 'hrga_petty_cash' ? 'active' : ''}">
          <i class="bi bi-cash-coin"></i>
          <span>Petty Cash Ledger</span>
        </a>
      </li>
      <div class="sidebar-heading">Payroll & Compensation</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/payroll.html')}" class="sidebar-link ${activeMenu === 'hrga_payroll' ? 'active' : ''}">
          <i class="bi bi-cash-stack"></i>
          <span>Payroll Management</span>
        </a>
      </li>
      <div class="sidebar-heading">Settings</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/hrga/attendance-settings.html')}" class="sidebar-link ${activeMenu === 'attendance_settings' ? 'active' : ''}">
          <i class="bi bi-gear"></i>
          <span>Attendance Settings</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/admin/master-data.html')}" class="sidebar-link ${activeMenu === 'master_data' ? 'active' : ''}">
          <i class="bi bi-sliders"></i>
          <span>Configuration Center</span>
        </a>
      </li>
    `;
  }


  sidebarContainer.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-brand-title">
        <i class="bi bi-buildings text-warning"></i>
        <span>MGI ERP</span>
      </span>
      <span class="sidebar-brand-badge ms-auto">${roleName}</span>
    </div>
    <ul class="sidebar-nav list-unstyled mb-0">
      <div class="sidebar-heading">Main Navigation</div>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/dashboard.html')}" class="sidebar-link ${activeMenu === 'dashboard' ? 'active' : ''}">
          <i class="bi bi-grid-1x2"></i>
          <span>Dashboard</span>
        </a>
      </li>
      <li class="sidebar-item">
        <a href="${toUrl('/frontend/pages/user/profile.html')}" class="sidebar-link ${activeMenu === 'my_profile' ? 'active' : ''}">
          <i class="bi bi-person-circle"></i>
          <span>My Profile</span>
        </a>
      </li>
      ${roleMenusHtml}
    </ul>
  `;
}
