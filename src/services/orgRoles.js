import { supabase } from '../contexts/AuthContext';
import { normalizeRole } from '../utils/roleNormalizer';

const cache = new Map();

export function getOrgRoles(orgId, { force = false } = {}) {
  if (!orgId) return Promise.resolve([]);
  if (!force && cache.has(orgId)) return cache.get(orgId);
  const p = supabase.from('Organizations').select('roles').eq('_id', orgId).single().then(({ data, error }) => {
      if (error) throw error;
      return data.roles || [];
    });
  cache.set(orgId, p);
  p.catch(() => cache.delete(orgId));
  return p;
}
export function findRoleDef(roles, userRole) {
  if (!roles?.length) return null;
  const n = normalizeRole(userRole);
  return (
    roles.find(r => normalizeRole(r.name) === n) ||
    roles.find(r => r.is_default) ||
    null
  );
}

export async function saveOrgRoles(orgId, roles) {
  const clean = roles.map(r => ({
    name: r.name.trim(),
    description: r.description || '',
    pages: r.pages || [],
    is_default: !!r.is_default,
  }));
  if (clean.filter(r => r.is_default).length !== 1) {
    throw new Error('Exactly one role must be the default for new signups.');
  }

  // Must be logged in: the database only lets a super admin update this table.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You are not logged in. Please log in again.');
  }

  const { data, error } = await supabase
    .from('Organizations')
    .update({ roles: clean, updated_at: new Date().toISOString() })
    .eq('_id', orgId)
    .select('roles');
  if (error) throw error;

  // Row-level security blocks an update silently by returning zero rows.
  if (!data?.length) {
    throw new Error('Not saved. Only a super admin can edit roles.');
  }

  cache.delete(orgId);
  return clean;
}