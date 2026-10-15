import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { AuthContext } from "../contexts/AuthContext";
import {
  Box, Paper, Typography, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Card, CardContent, Tabs, Tab,
  InputAdornment, CircularProgress, Tooltip, Stack, Divider, List,
  ListItem, ListItemText, useTheme, Fab, useMediaQuery,
  Skeleton, Alert, AlertTitle, Menu, Badge
} from '@mui/material';
import {
  Search, Delete, Shield, Refresh, People,
  AdminPanelSettings, History, Person as PersonIcon,
  HowToReg as RegistrantIcon, Add as AddIcon,
  ArrowDropDown, Business as BusinessIcon,
  Edit as EditIcon, Close as CloseIcon,
  Check as CheckIcon,
  Settings as SettingsIcon,
  Restaurant as RestaurantIcon,
  ChildCare as ChildCareIcon,
  VolunteerActivism as VolunteerIcon,
  MusicNote as MusicIcon,
  Handshake as HandshakeIcon,
  LocalPolice as SecurityIcon,
  Coffee as CoffeeIcon
} from '@mui/icons-material';
import NewUserModal from '../components/NewUserModal';

// ─── module-level cache ───────────────────────────────────────────────────────
let globalUsersData = null;
let globalDataLoaded = false;
let globalDataTimestamp = null;
let globalOrgFilter = null;
let globalRolesCache = {};

const CACHE_DURATION = 5 * 60 * 1000;
const SUPREME_ADMIN_EMAIL = "plaatjiessamuel98@gmail.com";

export default function AdminDashboard() {
  const theme = useTheme();
  const { authFetch, user: currentUser } = useContext(AuthContext);
  const isSupremeAdmin = currentUser?.is_supreme_admin || currentUser?.email === SUPREME_ADMIN_EMAIL;

  const isXsDown = useMediaQuery(theme.breakpoints.down("xs"));
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const isLgDown = useMediaQuery(theme.breakpoints.down("lg"));

  const getResponsiveValue = (xs, sm, md, lg, xl) => {
    if (isXsDown) return xs;
    if (isSmDown) return sm;
    if (isMdDown) return md;
    if (isLgDown) return lg;
    return xl;
  };

  const containerPadding = getResponsiveValue(1, 2, 3, 4, 4);
  const cardSpacing = getResponsiveValue(1, 2, 2, 3, 3);

  // ─── state ──────────────────────────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(!globalDataLoaded);

  const [, setRolesLoading] = useState(false);
  const [users, setUsers] = useState(globalUsersData || []);
  const [totalUsers, setTotalUsers] = useState(globalUsersData?.length || 0);
  const [activityLog, setActivityLog] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(() => {
    if (!isSupremeAdmin && currentUser) {
      return currentUser.Organization || currentUser.organization || "Active Church";
    }
    return globalOrgFilter || "Active Church";
  });
  const [orgAnchorEl, setOrgAnchorEl] = useState(null);
  const [, setLoadingOrgs] = useState(false);
  const [showSupremeAdminModal, setShowSupremeAdminModal] = useState(false);
  const [supremeAdminEmail, setSupremeAdminEmail] = useState('');
  const [addingSupremeAdmin, setAddingSupremeAdmin] = useState(false);
  const [supremeAdminError, setSupremeAdminError] = useState('');
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [orgFormData, setOrgFormData] = useState({ name: '', address: '', phone: '', email: '' });
  const [orgFormErrors, setOrgFormErrors] = useState({});
  const [savingOrg, setSavingOrg] = useState(false);
  const [deletingOrg, setDeletingOrg] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(500);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creatingRole] = useState(false);
  const [organizationRoles, setOrganizationRoles] = useState([]);
  const [roleCreateError, setRoleCreateError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── derived ────────────────
  const roleStats = useMemo(() => {
    const stats = {};
    users.forEach(u => { const r = u.role || 'Unknown'; stats[r] = (stats[r] || 0) + 1; });
    return stats;
  }, [users]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set();
    users.forEach(u => { if (u.role) roles.add(u.role); });
    return Array.from(roles).sort();
  }, [users]);

  const getRoleIcon = (roleName) => {
    if (!roleName) return <PersonIcon />;
    const l = roleName.toLowerCase();
    if (l.includes('main leader') || l.includes('head')) return <AdminPanelSettings />;
    if (l.includes('shepard') || l.includes('shepherd')) return <HandshakeIcon />;
    if (l.includes('logic')) return <SettingsIcon />;
    if (l.includes('gate') || l.includes('security')) return <SecurityIcon />;
    if (l.includes('intercessor') || l.includes('prayer')) return <VolunteerIcon />;
    if (l.includes('children')) return <ChildCareIcon />;
    if (l.includes('youth')) return <People />;
    if (l.includes('welcome') || l.includes('usher')) return <HandshakeIcon />;
    if (l.includes('technical') || l.includes('sound')) return <SettingsIcon />;
    if (l.includes('kitchen') || l.includes('cleaning')) return <RestaurantIcon />;
    if (l.includes('worship') || l.includes('music')) return <MusicIcon />;
    if (l.includes('coffee') || l.includes('hospitality')) return <CoffeeIcon />;
    return <PersonIcon />;
  };

  const getRoleColor = (role) => {
    if (!role) return 'default';
    const map = { admin: 'error', leader: 'primary', leaderAt12: 'secondary', user: 'success', registrant: 'warning' };
    return map[role] || ['error', 'primary', 'secondary', 'success', 'warning', 'info'][
      role.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6
    ];
  };

  const getRoleDisplay = (role) => role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
  const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

  const addActivityLog = useCallback((action, details) => {
    setActivityLog(prev => [{
      id: Date.now(), action, details,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Current Admin'
    }, ...prev].slice(0, 50));
  }, [currentUser]);

  // ─── fetch helpers ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (org) => {
    const url = `${API_BASE_URL}/admin/users?skip=0&limit=500&organization=${encodeURIComponent(org)}`;
    const res = await authFetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error(`Users fetch failed: ${res.status}`);
    const data = await res.json();
    const arr = data?.users ?? [];

    const transformed = arr.map(u => ({
      id: u.id || u._id,
      name: u.name && u.surname ? `${u.name} ${u.surname}`.trim() : u.name || u.surname || 'Unknown',
      firstName: u.name || '',
      surname: u.surname || '',
      email: u.email || '',
      role: u.role || 'Unknown',
      phoneNumber: u.phone_number,
      organization: u.organization || u.Organization,
      createdAt: u.created_at,
      dateOfBirth: u.date_of_birth,
      address: u.address || u.home_address,
      gender: u.gender,
      invitedBy: u.invitedBy || u.invited_by,
      leader12: u.leader12,
      leader144: u.leader144,
      leader1728: u.leader1728,
      stage: u.stage,
    }));

    // update cache
    globalUsersData = transformed;
    globalDataLoaded = true;
    globalDataTimestamp = Date.now();
    globalOrgFilter = org;

    return { users: transformed, total: data.total ?? transformed.length };
  }, [API_BASE_URL, authFetch]);

  const fetchRoles = useCallback(async (org, force = false) => {
    if (!force) {
      const c = globalRolesCache[org];
      if (c && Date.now() - c.timestamp < CACHE_DURATION) { setOrganizationRoles(c.roles); return; }
    }
    setRolesLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE_URL}/admin/roles/distinct?organization=${encodeURIComponent(org)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const roles = data.roles || [];
      globalRolesCache[org] = { roles, timestamp: Date.now() };
      if (mountedRef.current) setOrganizationRoles(roles);
    } catch (e) {
      console.error('fetchRoles error', e);
    } finally {
      if (mountedRef.current) setRolesLoading(false);
    }
  }, [API_BASE_URL, authFetch]);

  const fetchOrgs = useCallback(async () => {
    if (!isSupremeAdmin) return;
    setLoadingOrgs(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/organizations`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      const orgs = (data.organizations || []).map(o => ({
        id: o._id || o.id, _id: o._id || o.id,
        name: o.name, address: o.address, phone: o.phone,
        email: o.email, user_count: o.user_count || 0, created_at: o.created_at
      }));
      if (mountedRef.current) setOrganizations(orgs);
    } catch (e) {
      console.error('fetchOrgs error', e);
    } finally {
      if (mountedRef.current) setLoadingOrgs(false);
    }
  }, [API_BASE_URL, authFetch, isSupremeAdmin]);

  // ─── MAIN LOAD ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const org = selectedOrg;
    if (!org) { setLoading(false); return; }

    const cacheValid = globalDataLoaded &&
      globalOrgFilter === org &&
      globalDataTimestamp &&
      (Date.now() - globalDataTimestamp < CACHE_DURATION);

    if (cacheValid && globalUsersData) {
      setUsers(globalUsersData);
      setTotalUsers(globalUsersData.length);
      setLoading(false);
      fetchRoles(org, false);
      if (isSupremeAdmin) fetchOrgs();
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    fetchUsers(org)
      .then(({ users: u, total }) => {
        if (!mountedRef.current) return;
        setUsers(u);
        setTotalUsers(total);
      })
      .catch(err => {
        console.error('fetchUsers error', err);
        if (mountedRef.current) { setUsers([]); setTotalUsers(0); }
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
        fetchingRef.current = false;
        fetchRoles(org, true);
        if (isSupremeAdmin) fetchOrgs();
      });
  }, [selectedOrg]); 

  // ─── org switch ─────────────────────────────────────────────────────────────
  const handleOrgChange = useCallback((orgName) => {
    if (orgName === selectedOrg) { setOrgAnchorEl(null); return; }
    // bust cache for the old org so new org fetches fresh
    globalDataLoaded = false;
    globalOrgFilter = null;
    globalUsersData = null;
    fetchingRef.current = false; 
    setUsers([]);
    setTotalUsers(0);
    setOrganizationRoles([]);
    setSelectedRole('all');
    setSearchTerm('');
    setPage(0);
    setOrgAnchorEl(null);
    setSelectedOrg(orgName); 
  }, [selectedOrg]);

  // ─── manual refresh ──────────────────────────────────────────────────────────
  const handleManualRefresh = useCallback(async () => {
    globalDataLoaded = false;
    fetchingRef.current = false;
    setLoading(true);
    try {
      const { users: u, total } = await fetchUsers(selectedOrg);
      if (mountedRef.current) { setUsers(u); setTotalUsers(total); }
      if (isSupremeAdmin) fetchOrgs();
    } catch (e) {
      console.error(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchUsers, fetchOrgs, selectedOrg, isSupremeAdmin]);

  // ─── CRUD handlers ─────────────────────────
  const handleCreateUser = async (userData) => {
    setCreatingUser(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name, surname: userData.surname, email: userData.email,
          password: userData.password, phone_number: userData.phone_number,
          date_of_birth: userData.date_of_birth, address: userData.address,
          gender: userData.gender, invitedBy: userData.invitedBy,
          leader12: userData.leader12, leader144: userData.leader144,
          leader1728: userData.leader1728, stage: userData.stage || 'Win', role: userData.role
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed to create user'); }
      addActivityLog('USER_CREATED', `Created: ${userData.name} ${userData.surname} (${userData.role})`);
      setShowAddUserModal(false);
      globalDataLoaded = false;
      fetchingRef.current = false;
      setLoading(true);
      const { users: u, total } = await fetchUsers(selectedOrg);
      setUsers(u); setTotalUsers(total);
    } catch (e) { alert(`Error: ${e.message}`); }
    finally { setCreatingUser(false); setLoading(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingRole(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed to update role'); }
      const u = users.find(x => x.id === userId);
      addActivityLog('ROLE_UPDATED', `Updated ${u?.name}'s role to ${newRole}`);
      const updated = users.map(x => x.id === userId ? { ...x, role: newRole } : x);
      setUsers(updated); globalUsersData = updated;
      setShowRoleModal(false); setSelectedUser(null);
    } catch (e) { alert(e.message); }
    finally { setUpdatingRole(false); }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeletingUser(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/admin/users/${selectedUser.id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed to delete user'); }
      addActivityLog('USER_DELETED', `Deleted: ${selectedUser.name}`);
      const updated = users.filter(u => u.id !== selectedUser.id);
      setUsers(updated); globalUsersData = updated;
      setShowDeleteConfirm(false); setSelectedUser(null);
    } catch (e) { alert(`Error: ${e.message}`); }
    finally { setDeletingUser(false); }
  };

  const handleCreateRole = () => {
    if (!selectedOrg || selectedOrg === "Active Church") { setRoleCreateError('Cannot create custom roles for Active Church'); return; }
    if (!newRoleName.trim()) { setRoleCreateError('Role name is required'); return; }
    const fmt = newRoleName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!fmt) { setRoleCreateError('Invalid role name'); return; }
    if (organizationRoles.some(r => r.name === fmt)) { setRoleCreateError(`Role "${fmt}" already exists`); return; }
    setOrganizationRoles(prev => [...prev, { name: fmt, count: 0, is_system: false, color: getRoleColor(fmt) }]);
    addActivityLog('ROLE_CREATED', `Created role: ${fmt} for ${selectedOrg}`);
    setShowCreateRoleModal(false); setNewRoleName(''); setRoleCreateError('');
  };

  useEffect(() => {
    if (users.length > 0 && organizationRoles.length > 0) {
      setOrganizationRoles(prev => prev.map(r => ({ ...r, count: users.filter(u => u.role === r.name).length })));
    }
  }, [users]);

  // ─── org CRUD ───────────────────────────────────────────────────────────────
  const handleOpenCreateOrg = () => { setEditingOrg(null); setOrgFormData({ name: '', address: '', phone: '', email: '' }); setOrgFormErrors({}); setShowOrgModal(true); };
  const handleOpenEditOrg = (org) => {
    const id = org.id || org._id;
    if (!id || id === 'undefined') { alert('Invalid organization ID'); return; }
    setEditingOrg({ ...org, id, _id: id });
    setOrgFormData({ name: org.name || '', address: org.address || '', phone: org.phone || '', email: org.email || '' });
    setOrgFormErrors({}); setShowOrgModal(true); setOrgAnchorEl(null);
  };
  const validateOrgForm = () => {
    const errors = {};
    if (!orgFormData.name.trim()) errors.name = 'Name is required';
    if (!orgFormData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(orgFormData.email)) errors.email = 'Invalid email';
    setOrgFormErrors(errors);
    return !Object.keys(errors).length;
  };
  const handleSaveOrganization = async () => {
    if (!validateOrgForm()) return;
    setSavingOrg(true);
    try {
      const oldName = editingOrg?.name;
      const url = editingOrg ? `${API_BASE_URL}/organizations/${editingOrg.id || editingOrg._id}` : `${API_BASE_URL}/organizations`;
      const method = editingOrg ? 'PUT' : 'POST';
      const payload = { name: orgFormData.name };
      if (orgFormData.address) payload.address = orgFormData.address;
      if (orgFormData.phone) payload.phone = orgFormData.phone;
      if (orgFormData.email) payload.email = orgFormData.email;
      const res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to save'); }
      addActivityLog(editingOrg ? 'ORG_UPDATED' : 'ORG_CREATED', `${editingOrg ? 'Updated' : 'Created'}: ${orgFormData.name}`);
      await fetchOrgs();
      if (editingOrg && oldName !== orgFormData.name && selectedOrg === oldName) {
        handleOrgChange(orgFormData.name);
      }
      setShowOrgModal(false);
    } catch (e) { alert(`Error: ${e.message}`); }
    finally { setSavingOrg(false); }
  };
  const handleDeleteOrganization = async (orgId, orgName) => {
    if (!orgId || orgId === 'undefined') { alert('Invalid ID'); return; }
    if (!window.confirm(`Delete "${orgName}"? This cannot be undone.`)) return;
    setDeletingOrg(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/organizations/${orgId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to delete'); }
      addActivityLog('ORG_DELETED', `Deleted: ${orgName}`);
      await fetchOrgs();
      if (selectedOrg === orgName) handleOrgChange('Active Church');
      setShowOrgModal(false);
    } catch (e) { alert(`Error: ${e.message}`); }
    finally { setDeletingOrg(false); }
  };
  const handleAddSupremeAdmin = async () => {
    if (!supremeAdminEmail.trim()) { setSupremeAdminError('Email required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supremeAdminEmail)) { setSupremeAdminError('Invalid email'); return; }
    setAddingSupremeAdmin(true); setSupremeAdminError('');
    try {
      const res = await authFetch(`${API_BASE_URL}/admin/supreme/add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: supremeAdminEmail }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Failed'); }
      setShowSupremeAdminModal(false); setSupremeAdminEmail('');
      alert(`Added ${supremeAdminEmail} as supreme admin`);
    } catch (e) { setSupremeAdminError(e.message); }
    finally { setAddingSupremeAdmin(false); }
  };

  // ─── pagination / filter ────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return users.filter(u => {
      const matchSearch = !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
      const matchRole = selectedRole === 'all' || u.role === selectedRole;
      return matchSearch && matchRole;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, searchTerm, selectedRole]);

  const paginatedUsers = useMemo(() => filteredUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage), [filteredUsers, page, rowsPerPage]);

  // reset page when filter changes
  useEffect(() => { setPage(0); }, [searchTerm, selectedRole]);
  useEffect(() => {
    const max = Math.max(0, Math.ceil(filteredUsers.length / rowsPerPage) - 1);
    if (page > max) setPage(max);
  }, [filteredUsers.length, rowsPerPage, page]);

  // ─── style constants ────────────────────────────────────────────────────────
  const cardStyles = {
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
    '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
    height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2
  };
  const roleCardColors = ['#f44336','#9c27b0','#4caf50','#ff9800','#607d8b','#2196f3','#e91e63','#00bcd4','#8bc34a','#ff5722','#673ab7','#3f51b5','#009688','#795548','#ffc107'];

  // ─── sub-components ─────────────────────────────────────────────────────────
  const UserCard = ({ user }) => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Stack direction="row" spacing={2} alignItems="center" flex={1}>
            <Avatar sx={{ bgcolor: '#9c27b0', boxShadow: 1 }}>{getInitials(user.name)}</Avatar>
            <Box flex={1}>
              <Typography variant="subtitle2" fontWeight="bold">{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              {isSupremeAdmin && user.organization && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <BusinessIcon fontSize="inherit" /> {user.organization}
                </Typography>
              )}
              <Chip label={getRoleDisplay(user.role)} color={getRoleColor(user.role)} size="small" icon={getRoleIcon(user.role)} sx={{ mt: 0.5 }} />
            </Box>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="text.secondary">{user.phoneNumber || 'No phone'}</Typography>
            <Typography variant="caption" color="text.secondary">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'No date'}</Typography>
          </Box>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Change Role"><IconButton size="small" onClick={() => { setSelectedUser(user); setShowRoleModal(true); }} sx={{ boxShadow: 1, borderRadius: 1 }}><Shield fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete User"><IconButton size="small" onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }} sx={{ color: 'error.main', boxShadow: 1, borderRadius: 1 }}><Delete fontSize="small" /></IconButton></Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  const SkeletonCard = () => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="80%" height={20} sx={{ mt: 0.5 }} />
          </Box>
          <Stack direction="row" spacing={1}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );

  const SkeletonTableRow = () => (
    <TableRow>
      {[80, 60, 70, 60, 40].map((w, i) => <TableCell key={i}><Skeleton variant="text" width={`${w}%`} /></TableCell>)}
    </TableRow>
  );

  const RoleOption = ({ role, onSelect }) => (
    <Paper variant="outlined" sx={{
      p: 2, cursor: 'pointer',
      border: selectedUser?.role === role.name ? 2 : 1,
      borderColor: selectedUser?.role === role.name ? 'primary.main' : 'divider',
      borderRadius: 1, transition: 'all 0.2s',
      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: 1 }
    }} onClick={onSelect}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 24, height: 24, bgcolor: role.color || '#9c27b0' }}><PersonIcon fontSize="small" /></Avatar>
          <Typography variant="body1" fontWeight="medium">{role.name}</Typography>
          {!role.is_system && <Chip label="custom" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />}
        </Stack>
        <Typography variant="body2" color="text.secondary">{role.count} {role.count === 1 ? 'person' : 'people'}</Typography>
      </Stack>
    </Paper>
  );

  // ─── skeleton screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box p={containerPadding} sx={{ maxWidth: "1400px", margin: "0 auto", mt: getResponsiveValue(2,3,4,5,5), minHeight: "100vh" }}>
        <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>Admin Dashboard</Typography>
        <Grid container spacing={cardSpacing} mb={cardSpacing}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Skeleton variant="circular" width={56} height={56} sx={{ mx: 'auto', mb: 1 }} />
                  <Skeleton variant="text" width="60%" height={40} sx={{ mx: 'auto' }} />
                  <Skeleton variant="text" width="80%" height={20} sx={{ mx: 'auto' }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Paper sx={{ boxShadow: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}><Skeleton variant="rounded" height={40} /></Grid>
              <Grid item xs={12} sm={4}><Skeleton variant="rounded" height={40} /></Grid>
            </Grid>
          </Box>
          {isMdDown
            ? <Box sx={{ p: 1 }}>{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</Box>
            : <TableContainer><Table><TableHead><TableRow>{['User','Role','Phone','Created','Actions'].map(h => <TableCell key={h}><Skeleton variant="text" width="60%" /></TableCell>)}</TableRow></TableHead><TableBody>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} />)}</TableBody></Table></TableContainer>
          }
        </Paper>
      </Box>
    );
  }

  // ─── main render ─────────────────────────────────────────────────────────────
  return (
    <Box p={containerPadding} sx={{ maxWidth: "1400px", margin: "0 auto", mt: getResponsiveValue(2,3,4,5,5), minHeight: "100vh" }}>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">Admin Dashboard</Typography>
          {selectedOrg && <Chip icon={<BusinessIcon />} label={selectedOrg} color="primary" variant="outlined" />}
        </Box>
        {isSupremeAdmin && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" onClick={(e) => setOrgAnchorEl(e.currentTarget)} startIcon={<BusinessIcon />} endIcon={<ArrowDropDown />} sx={{ boxShadow: 1, borderRadius: 2, minWidth: 200, justifyContent: 'space-between' }}>
              {selectedOrg || 'Active Church'}
            </Button>
            <Menu anchorEl={orgAnchorEl} open={Boolean(orgAnchorEl)} onClose={() => setOrgAnchorEl(null)} PaperProps={{ sx: { maxHeight: 400, width: 300 } }}>
              {organizations.map(org => (
                <MenuItem key={org.id || org._id} onClick={() => handleOrgChange(org.name)} selected={selectedOrg === org.name} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium">{org.name}</Typography>
                    <Badge badgeContent={org.user_count} color="primary" max={999} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <Typography variant="caption" color="text.secondary" noWrap>{org.email}</Typography>
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditOrg(org); }} sx={{ ml: 'auto' }}><EditIcon fontSize="small" /></IconButton>
                  </Box>
                </MenuItem>
              ))}
              <Divider />
              <MenuItem onClick={handleOpenCreateOrg} sx={{ color: 'primary.main' }}>
                <AddIcon fontSize="small" sx={{ mr: 1 }} /><Typography variant="body2">Add New Organization</Typography>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Box>

      {/* Stats cards */}
      <Grid container spacing={cardSpacing} sx={{ mb: cardSpacing }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={cardStyles}>
            <CardContent sx={{ textAlign: 'center', p: getResponsiveValue(1.5,2,2.5,3,3) }}>
              <Avatar sx={{ bgcolor: '#2196f3', width: 56, height: 56, mb: 2, mx: 'auto', boxShadow: 2 }}><People /></Avatar>
              <Typography variant="h4" fontWeight="bold">{totalUsers}</Typography>
              <Typography variant="body2" color="text.secondary">Total People</Typography>
            </CardContent>
          </Card>
        </Grid>
        {(() => {
          const isActiveChurch = selectedOrg?.trim().toLowerCase() === 'active church';
          if (isActiveChurch) {
            return [
              { role: 'admin', color: '#f44336', icon: <AdminPanelSettings /> },
              { role: 'leader', color: '#9c27b0', icon: <HandshakeIcon /> },
              { role: 'leaderAt12', color: '#2196f3', icon: <People /> },
              { role: 'user', color: '#4caf50', icon: <PersonIcon /> },
              { role: 'registrant', color: '#ff9800', icon: <RegistrantIcon /> },
            ].map(({ role, color, icon }) => (
              <Grid item xs={6} sm={4} md={2} key={role}>
                <Card sx={cardStyles}>
                  <CardContent sx={{ textAlign: 'center', p: getResponsiveValue(1.5,2,2.5,3,3) }}>
                    <Avatar sx={{ bgcolor: color, width: 56, height: 56, mb: 2, mx: 'auto', boxShadow: 2 }}>{icon}</Avatar>
                    <Typography variant="h4" fontWeight="bold">{roleStats[role] || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">{role}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ));
          }
          return Object.entries(roleStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([role, count], i) => (
            <Grid item xs={6} sm={4} md={2} key={role}>
              <Card sx={cardStyles}>
                <CardContent sx={{ textAlign: 'center', p: getResponsiveValue(1.5,2,2.5,3,3) }}>
                  <Avatar sx={{ bgcolor: roleCardColors[i % roleCardColors.length], width: 56, height: 56, mb: 2, mx: 'auto', boxShadow: 2 }}>{getRoleIcon(role)}</Avatar>
                  <Typography variant="h4" fontWeight="bold">{count}</Typography>
                  <Typography variant="body2" color="text.secondary">{role}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ));
        })()}
      </Grid>

      {/* Main panel */}
      <Paper sx={{ boxShadow: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', flexDirection: getResponsiveValue('column','column','row','row','row'), justifyContent: 'space-between', alignItems: getResponsiveValue('stretch','stretch','center','center','center'), p: 2, gap: getResponsiveValue(2,2,0,0,0) }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant={isMdDown ? "fullWidth" : "standard"}>
            <Tab label="USERS" sx={{ fontWeight: 600 }} />
            <Tab label="ROLES & PERMISSIONS" sx={{ fontWeight: 600 }} />
            <Tab label="ACTIVITY LOG" sx={{ fontWeight: 600 }} />
          </Tabs>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={handleManualRefresh} sx={{ boxShadow: 1, borderRadius: 2, height: 40 }} size={getResponsiveValue("small","small","medium","medium","medium")}>Refresh</Button>
            {isSupremeAdmin && <Button variant="contained" startIcon={<AdminPanelSettings />} onClick={() => setShowSupremeAdminModal(true)} sx={{ boxShadow: 1, borderRadius: 2, height: 40 }} size={getResponsiveValue("small","small","medium","medium","medium")}>Add Supreme</Button>}
          </Box>
        </Box>

        {/* Users tab */}
        {activeTab === 0 && (
          <Box sx={{ p: getResponsiveValue(1,2,3,3,3) }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <TextField fullWidth placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                size={getResponsiveValue("small","small","medium","medium","medium")} />
              <FormControl sx={{ minWidth: getResponsiveValue('100%',200,200,200,200) }}>
                <InputLabel>Filter Role</InputLabel>
                <Select value={selectedRole} label="Filter Role" onChange={e => setSelectedRole(e.target.value)} size={getResponsiveValue("small","small","medium","medium","medium")}>
                  <MenuItem value="all">All Roles ({totalUsers})</MenuItem>
                  {uniqueRoles.map(r => <MenuItem key={r} value={r}>{r} ({roleStats[r]})</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            {filteredUsers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <People sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No users found</Typography>
              </Box>
            ) : isMdDown ? (
              <Box>
                <Box sx={{ maxHeight: 500, overflowY: "auto", border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 1 }}>
                  {paginatedUsers.map(u => <UserCard key={u.id} user={u} />)}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>Showing {filteredUsers.length} of {totalUsers} users</Typography>
              </Box>
            ) : (
              <Box>
                <TableContainer sx={{ maxHeight: 500, boxShadow: 1, borderRadius: 1 }}>
                  <Table stickyHeader size={getResponsiveValue("small","small","medium","medium","medium")}>
                    <TableHead>
                      <TableRow>
                        {['User','Role','Phone','Created', ...(isSupremeAdmin ? ['Organization'] : []),'Actions'].map(h => (
                          <TableCell key={h} align={h === 'Actions' ? 'right' : 'left'} sx={{ fontWeight: 'bold', backgroundColor: 'background.paper' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedUsers.map(user => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar sx={{ bgcolor: '#9c27b0', boxShadow: 1 }}>{getInitials(user.name)}</Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight="medium">{user.name}</Typography>
                                <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell><Chip label={getRoleDisplay(user.role)} color={getRoleColor(user.role)} size="small" icon={getRoleIcon(user.role)} sx={{ boxShadow: 1 }} /></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{user.phoneNumber || 'N/A'}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</Typography></TableCell>
                          {isSupremeAdmin && <TableCell><Typography variant="body2" color="text.secondary">{user.organization || 'N/A'}</Typography></TableCell>}
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Change Role"><IconButton size="small" onClick={() => { setSelectedUser(user); setShowRoleModal(true); }} sx={{ boxShadow: 1, borderRadius: 1 }}><Shield fontSize="small" /></IconButton></Tooltip>
                              <Tooltip title="Delete User"><IconButton size="small" onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }} sx={{ color: 'error.main', boxShadow: 1, borderRadius: 1 }}><Delete fontSize="small" /></IconButton></Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>Showing {filteredUsers.length} of {totalUsers} users</Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Roles tab */}
        {activeTab === 1 && (
          <Box sx={{ p: getResponsiveValue(1,2,3,3,3) }}>
            <Alert severity="info" sx={{ mb: 3, boxShadow: 1, borderRadius: 2 }}>
              <AlertTitle>Role Distribution</AlertTitle>
              {uniqueRoles.length} unique roles in this organization
            </Alert>
            <Grid container spacing={cardSpacing}>
              {uniqueRoles.map((role, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={role}>
                  <Card sx={cardStyles}>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: roleCardColors[i % roleCardColors.length], width: 48, height: 48, boxShadow: 2 }}>{getRoleIcon(role)}</Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="bold">{getRoleDisplay(role)}</Typography>
                          <Typography variant="body2" color="text.secondary">{roleStats[role]} {roleStats[role] === 1 ? 'person' : 'people'}</Typography>
                        </Box>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {role === 'admin' && 'Full system access'}
                        {role === 'leader' && 'Group leaders managing cells'}
                        {role === 'leaderAt12' && 'Leaders at 12 level'}
                        {role === 'user' && 'Regular members'}
                        {role === 'registrant' && 'Event check-in volunteers'}
                        {!['admin','leader','leaderAt12','user','registrant'].includes(role) && `${role} role`}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Activity tab */}
        {activeTab === 2 && (
          <Box sx={{ p: getResponsiveValue(1,2,3,3,3) }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">Recent Activity</Typography>
              <Chip icon={<History />} label={`${activityLog.length} events`} size="small" variant="outlined" />
            </Stack>
            {activityLog.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <History sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No activity yet</Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 500, overflowY: "auto", border: `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 1 }}>
                <List>
                  {activityLog.map((log, idx) => (
                    <React.Fragment key={log.id}>
                      <ListItem sx={{ py: 2 }}>
                        <ListItemText
                          primary={<Typography variant="body1" fontWeight="medium">{log.details}</Typography>}
                          secondary={<Typography variant="body2" color="text.secondary">{log.action} • {new Date(log.timestamp).toLocaleString()} • {log.user}</Typography>}
                        />
                      </ListItem>
                      {idx < activityLog.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Modals */}
      <NewUserModal open={showAddUserModal} onClose={() => setShowAddUserModal(false)} onUserCreated={handleCreateUser} loading={creatingUser} />

      {/* Supreme admin modal */}
      <Dialog open={showSupremeAdminModal} onClose={() => !addingSupremeAdmin && setShowSupremeAdminModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle><Typography variant="h6" fontWeight="bold">Add Supreme Admin</Typography></DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField fullWidth label="User Email" type="email" value={supremeAdminEmail} onChange={e => { setSupremeAdminEmail(e.target.value); setSupremeAdminError(''); }} error={!!supremeAdminError} helperText={supremeAdminError} disabled={addingSupremeAdmin} autoFocus />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setShowSupremeAdminModal(false); setSupremeAdminEmail(''); setSupremeAdminError(''); }} variant="outlined" disabled={addingSupremeAdmin}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSupremeAdmin} disabled={addingSupremeAdmin || !supremeAdminEmail.trim()} startIcon={addingSupremeAdmin ? <CircularProgress size={20} /> : <AdminPanelSettings />}>
            {addingSupremeAdmin ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Org modal */}
      <Dialog open={showOrgModal} onClose={() => !savingOrg && setShowOrgModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">{editingOrg ? 'Edit Organization' : 'New Organization'}</Typography>
          <IconButton onClick={() => setShowOrgModal(false)} size="small" disabled={savingOrg}><CloseIcon /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField label="Organization Name *" value={orgFormData.name} onChange={e => setOrgFormData({ ...orgFormData, name: e.target.value })} error={!!orgFormErrors.name} helperText={orgFormErrors.name} fullWidth required disabled={savingOrg} />
            <TextField label="Address" value={orgFormData.address} onChange={e => setOrgFormData({ ...orgFormData, address: e.target.value })} fullWidth multiline rows={2} disabled={savingOrg} />
            <Grid container spacing={2}>
              <Grid item xs={6}><TextField label="Phone" value={orgFormData.phone} onChange={e => setOrgFormData({ ...orgFormData, phone: e.target.value })} fullWidth disabled={savingOrg} /></Grid>
              <Grid item xs={6}><TextField label="Email *" type="email" value={orgFormData.email} onChange={e => setOrgFormData({ ...orgFormData, email: e.target.value })} error={!!orgFormErrors.email} helperText={orgFormErrors.email} fullWidth required disabled={savingOrg} /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          {editingOrg && (
            <Button variant="outlined" color="error" onClick={() => { const id = editingOrg.id || editingOrg._id; handleDeleteOrganization(id, editingOrg.name); }} disabled={savingOrg || deletingOrg} startIcon={deletingOrg ? <CircularProgress size={20} /> : <Delete />} sx={{ mr: 'auto' }}>
              {deletingOrg ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          <Button variant="outlined" onClick={() => setShowOrgModal(false)} disabled={savingOrg}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveOrganization} disabled={savingOrg} startIcon={savingOrg ? <CircularProgress size={20} /> : <CheckIcon />}>{savingOrg ? 'Saving...' : 'Save'}</Button>
        </DialogActions>
      </Dialog>

      {/* FAB */}
      <Fab color={isSupremeAdmin ? "primary" : "secondary"} sx={{ position: 'fixed', bottom: 16, right: 16, boxShadow: 4 }} onClick={isSupremeAdmin ? handleOpenCreateOrg : () => setShowAddUserModal(true)}>
        <AddIcon />
      </Fab>

      {/* Role change modal */}
      <Dialog open={showRoleModal} onClose={() => !updatingRole && setShowRoleModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle><Typography variant="h6" fontWeight="bold">Change User Role</Typography></DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>User: <strong>{selectedUser.name}</strong></Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Current: <Chip label={selectedUser.role} size="small" /></Typography>
              {selectedOrg?.trim().toLowerCase() === 'active church' ? (
                <>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>Select New Role:</Typography>
                  <FormControl fullWidth>
                    <Select value={selectedUser.role} onChange={e => handleRoleChange(selectedUser.id, e.target.value)} disabled={updatingRole}>
                      {['admin','leader','leaderAt12','user','registrant'].map(r => <MenuItem key={r} value={r}>{getRoleDisplay(r)}</MenuItem>)}
                    </Select>
                  </FormControl>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Available Roles:</Typography>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => { setShowRoleModal(false); setShowCreateRoleModal(true); }} sx={{ borderRadius: 2 }}>ADD ROLE</Button>
                  </Box>
                  <Stack spacing={1} sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                    {organizationRoles.map(role => <RoleOption key={role.name} role={role} onSelect={() => handleRoleChange(selectedUser.id, role.name)} />)}
                  </Stack>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowRoleModal(false)} disabled={updatingRole} variant="outlined">CANCEL</Button>
        </DialogActions>
      </Dialog>

      {/* Create role modal */}
      <Dialog open={showCreateRoleModal} onClose={() => !creatingRole && setShowCreateRoleModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle><Typography variant="h6" fontWeight="bold">Create New Role</Typography></DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField fullWidth label="Role Name" value={newRoleName} onChange={e => { setNewRoleName(e.target.value); setRoleCreateError(''); }} placeholder="e.g., Welcome Team, Sound Tech" error={!!roleCreateError} helperText={roleCreateError} disabled={creatingRole} autoFocus />
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>Preview:</Typography>
              <Chip label={newRoleName.trim() || 'New Role'} color={getRoleColor(newRoleName)} icon={getRoleIcon(newRoleName)} />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Stored as: <strong>{newRoleName.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') || 'new_role'}</strong>
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setShowCreateRoleModal(false); setNewRoleName(''); setRoleCreateError(''); }} variant="outlined" disabled={creatingRole}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRole} disabled={creatingRole || !newRoleName.trim()} startIcon={<CheckIcon />}>Create Role</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm modal */}
      <Dialog open={showDeleteConfirm} onClose={() => !deletingUser && setShowDeleteConfirm(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle><Typography variant="h6" fontWeight="bold" color="error">Delete User</Typography></DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography>Are you sure you want to delete <strong>{selectedUser.name}</strong>?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Email: {selectedUser.email}</Typography>
              {selectedUser.role === 'admin' && !isSupremeAdmin && <Alert severity="warning" sx={{ mt: 2 }}>You cannot delete another admin user.</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setShowDeleteConfirm(false)} disabled={deletingUser} variant="outlined">Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser} disabled={deletingUser || (selectedUser?.role === 'admin' && !isSupremeAdmin)} startIcon={deletingUser ? <CircularProgress size={16} /> : <Delete />}>
            {deletingUser ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}