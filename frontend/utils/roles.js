/**
 * ==========================================================
 * MGI ERP / HRIS - Roles & Permissions Constants
 * ==========================================================
 */

const ROLES = {
  IT: { id: 1, name: 'IT', badgeClass: 'bg-primary' },
  HRGA: { id: 2, name: 'HRGA', badgeClass: 'bg-info text-dark' },
  LEGAL: { id: 3, name: 'LEGAL', badgeClass: 'bg-warning text-dark' },
  FINANCE: { id: 4, name: 'FINANCE', badgeClass: 'bg-success' },
  BUSINESS_DEV: { id: 5, name: 'BUSINESS DEVELOPMENT', badgeClass: 'bg-secondary' },
  PM: { id: 6, name: 'PM', badgeClass: 'bg-dark' },
  ADMIN: { id: 7, name: 'ADMIN', badgeClass: 'bg-danger' }
};

function getRoleNameById(roleId) {
  const role = Object.values(ROLES).find(r => r.id === parseInt(roleId));
  return role ? role.name : 'Unknown Role';
}

function getRoleBadge(roleId) {
  const role = Object.values(ROLES).find(r => r.id === parseInt(roleId));
  if (!role) return '<span class="badge bg-secondary">Unknown</span>';
  return `<span class="badge ${role.badgeClass}">${role.name}</span>`;
}
