/**
 * ==========================================================
 * MGI ERP / HRIS - Frontend Auth & Route Protection Guard
 * ==========================================================
 */

/**
 * Check active session from backend API
 */
async function checkAuth(requiredRoles = []) {
  try {
    const res = await apiGet('/backend/api/auth/me.php');
    if (!res.success || !res.data || !res.data.user) {
      redirectToLogin();
      return null;
    }

    const user = res.data.user;

    // Check MFA completed
    if (!user.mfa_verified) {
      window.location.href = getAppUrl('/frontend/mfa.html');
      return null;
    }

    // Role check if specified
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role_id)) {
      alert('Akses Ditolak: Anda tidak memiliki wewenang untuk membuka halaman ini.');
      window.location.href = getAppUrl('/frontend/dashboard.html');
      return null;
    }

    return user;
  } catch (err) {
    console.error('Auth Guard Error:', err);
    redirectToLogin();
    return null;
  }
}

function redirectToLogin() {
  if (!window.location.pathname.includes('login.html')) {
    window.location.href = getAppUrl('/frontend/login.html');
  }
}

async function performLogout() {
  try {
    await apiPost('/backend/api/auth/logout.php');
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    window.location.href = getAppUrl('/frontend/login.html');
  }
}
