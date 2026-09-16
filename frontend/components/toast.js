/**
 * ==========================================================
 * MGI ERP / HRIS - Reusable Toast Notification Component
 * ==========================================================
 */

function ensureToastContainer() {
  let container = document.getElementById('mgi-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mgi-toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'success') {
  const container = ensureToastContainer();
  const toastId = 'toast-' + Date.now();
  
  const bgClass = type === 'success' ? 'bg-success text-white' : 
                  type === 'danger' || type === 'error' ? 'bg-danger text-white' : 
                  type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white';
                  
  const icon = type === 'success' ? 'bi-check-circle-fill' : 
               type === 'danger' || type === 'error' ? 'bi-exclamation-octagon-fill' : 
               type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

  const html = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon} fs-5"></i>
          <div>${message}</div>
        </div>
        <button type="button" class="btn-close ${type !== 'warning' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
  const element = document.getElementById(toastId);
  const toast = new bootstrap.Toast(element, { delay: 4000 });
  toast.show();
  
  element.addEventListener('hidden.bs.toast', () => {
    element.remove();
  });
}
