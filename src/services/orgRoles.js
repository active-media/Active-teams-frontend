import { createClient } from '@supabase/supabase-js';
import { supabase } from '/supabaseClient';
import { normalizeRole } from '../utils/roleNormalizer';

const cache = new Map();

// Acts as the logged-in user (needed for the super-admin policy).
// Check AuthContext for the real token key ('access_token' vs 'token').
const asUser = () =>
  createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } },
    auth: { persistSession: false },
  });

export function getOrgRoles(orgId, { force = false } = {}) {
  if (!orgId) return Promise.resolve([]);
  if (!force && cache.has(orgId)) return cache.get(orgId);
  const p = supabase.from('Organizations').select('roles').eq('_id', orgId).single()
    .then(({ data, error }) => { if (error) throw error; return data.roles || []; });
  cache.set(orgId, p);
  p.catch(() => cache.delete(orgId));
  return p;
}

// The user's role definition: exact name match, otherwise the org's default role.
// Returns null if the org has no roles configured yet.
export function findRoleDef(roles, userRole) {
  if (!roles?.length) return null;
  const n = normalizeRole(userRole);
  return roles.find(r => normalizeRole(r.name) === n) || roles.find(r => r.is_default) || null;
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
  const { data, error } = await asUser()
    .from('Organizations')
    .update({ roles: clean, updated_at: new Date().toISOString() })
    .eq('_id', orgId)
    .select('roles');
  if (error) throw error;
  if (!data?.length) throw new Error('Not saved. Only a super admin can edit roles.');
  cache.delete(orgId);
  return clean;
}