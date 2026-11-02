/**
 * Normalizes role names to handle various formats from the backend
 * Converts formats like "leader at 12", "leader@12", "leader_at_12" to "leaderat12"
 * @param {string} role - The role string to normalize
 * @returns {string} - Normalized role in lowercase
 */
export const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') return '';
  
  return role
    .toLowerCase()
    .trim()
    .replace(/[\s@_-]/g, ''); // Remove spaces, @, underscores, hyphens
};

/**
 * Checks if a user role matches an allowed role
 * @param {string} userRole - The user's role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} - Whether the user role is allowed
 */
export const isRoleAllowed = (userRole, allowedRoles = []) => {
  if (!userRole || !allowedRoles.length) return false;
  
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  
  return normalizedAllowedRoles.includes(normalizedUserRole);
};

/**
 * SYSTEM_ROLES constant with all valid role types
 */
export const SYSTEM_ROLES = ['admin', 'leader', 'leaderat12', 'user', 'registrant'];

/**
 * ROLE_HIERARCHY for determining access levels
 */
export const ROLE_HIERARCHY = {
  "registrant": 1,
  "user": 2,
  "leader": 3,
  "leaderat12": 4,
  "admin": 5,
  "supreme_admin": 6
};

/**
 * Gets the hierarchy level for a role
 * @param {string} role - The role to check
 * @returns {number} - The hierarchy level (0 if not found)
 */
export const getRoleHierarchyLevel = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_HIERARCHY[normalizedRole] || 0;
};
