/**
 * ==========================================================
 * MGI ERP / HRIS - Standard API Fetch Client
 * ==========================================================
 */

// Detect base path dynamically (e.g. '/Montana-Global-Investama-ERP' or empty '' on domain root)
const APP_BASE_PATH = (() => {
  const match = window.location.pathname.match(/^(\/[^\/]+)?\/(frontend|backend)/i);
  if (match && match[1]) {
    return match[1];
  }
  // Check if current pathname starts with a known directory name before frontend/backend
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length > 0 && parts[0].toLowerCase() !== 'frontend' && parts[0].toLowerCase() !== 'backend') {
    return '/' + parts[0];
  }
  return '';
})();

const API_BASE_URL = `${APP_BASE_PATH}/backend/api`;

/**
 * Helper to resolve frontend/backend paths relative to app base
 */
function getAppUrl(path) {
  if (!path) return APP_BASE_PATH || '/';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (APP_BASE_PATH && cleanPath.startsWith(APP_BASE_PATH)) {
    return cleanPath;
  }
  return `${APP_BASE_PATH}${cleanPath}`;
}

/**
 * Standard GET request
 */
async function apiGet(endpoint) {
  return sendRequest(endpoint, { method: 'GET' });
}

/**
 * Standard POST request
 */
async function apiPost(endpoint, data = {}) {
  return sendRequest(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/**
 * Standard PUT request
 */
async function apiPut(endpoint, data = {}) {
  return sendRequest(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/**
 * Standard DELETE request
 */
async function apiDelete(endpoint) {
  return sendRequest(endpoint, { method: 'DELETE' });
}

/**
 * Standard PATCH request
 */
async function apiPatch(endpoint, data = {}) {
  return sendRequest(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/**
 * Upload request (for FormData)
 */
async function apiUpload(endpoint, formData, method = 'POST') {
  return sendRequest(endpoint, {
    method: method,
    body: formData
  });
}

/**
 * Core Request wrapper with standardized JSON error formatting
 */
async function sendRequest(endpoint, options = {}) {
  let url = endpoint;
  if (!url.startsWith('http')) {
    if (url.startsWith('/backend') || url.startsWith('/frontend') || url.startsWith('/api')) {
      url = getAppUrl(url);
    } else if (!url.startsWith(APP_BASE_PATH) && !url.startsWith('/')) {
      url = `${API_BASE_URL}/${url}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });

    const contentType = response.headers.get('content-type');
    let json = {};
    if (contentType && contentType.includes('application/json')) {
      json = await response.json();
    } else {
      const text = await response.text();
      json = { success: response.ok, message: text || response.statusText };
    }

    if (!response.ok && !json.message) {
      json.message = `HTTP error ${response.status}: ${response.statusText}`;
    }

    return json;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      message: error.message || 'Koneksi ke server gagal. Periksa jaringan Anda.'
    };
  }
}
