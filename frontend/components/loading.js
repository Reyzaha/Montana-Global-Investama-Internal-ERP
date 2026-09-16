/**
 * ==========================================================
 * MGI ERP / HRIS - Reusable Loading & Empty State Components
 * ==========================================================
 */

function renderLoading(containerId, message = 'Memuat data...') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted fw-medium">${message}</p>
    </div>
  `;
}

function renderEmptyState(containerId, message = 'Tidak ada data ditemukan.', actionBtnHtml = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="text-center py-5 border rounded bg-white my-3">
      <div class="mb-3 text-muted">
        <i class="bi bi-inbox fs-1"></i>
      </div>
      <h6 class="fw-semibold text-secondary">${message}</h6>
      <p class="text-muted small">Belum ada catatan yang tersimpan pada modul ini.</p>
      ${actionBtnHtml ? `<div class="mt-3">${actionBtnHtml}</div>` : ''}
    </div>
  `;
}

function renderErrorState(containerId, message = 'Gagal memuat data dari server.', retryFnName = '') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="alert alert-danger d-flex align-items-center justify-content-between p-3 my-3 shadow-sm" role="alert">
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-exclamation-triangle-fill fs-4"></i>
        <div>
          <strong>Terjadi Kesalahan:</strong> ${message}
        </div>
      </div>
      ${retryFnName ? `<button class="btn btn-sm btn-outline-danger" onclick="${retryFnName}()">Coba Lagi</button>` : ''}
    </div>
  `;
}
