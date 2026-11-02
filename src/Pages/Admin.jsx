import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { AuthContext } from "../contexts/AuthContext";
import {
  Box, Paper, Typography, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Card, CardContent, Tabs, Tab,
  InputAdornment, CircularProgress, Tooltip, Stack, Divider, List,
  ListItem, ListItemText, useTheme, Fab, useMediaQuery,
  Skeleton, Alert, AlertTitle, Menu, Badge, Autocomplete
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
  Coffee as CoffeeIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import NewUserModal from '../components/NewUserModal';

// ISO week id like "2026-W44" (matches the format the targets API uses)
const getISOWeekId = (d = new Date()) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
const weekOffset = (n) => getISOWeekId(new Date(Date.now() + n * 7 * 86400000));

// Module-level cache shared across mounts
let globalUsersData = null;
let globalDataLoaded = false;
let globalDataTimestamp = null;
let globalOrgFilter = null;
const globalRolesCache = {};

export default function AdminDashboard() {
  const theme = useTheme();
  const { authFetch, user: currentUser } = useContext(AuthContext);
  const isSupremeAdmin = currentUser?.is_supreme_admin === true;
  const isAdmin = currentUser?.role === "admin";

  const isXsDown = useMediaQuery(theme.breakpoints.down("xs"));
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const isLgDown = useMediaQuery(theme.breakpoints.down("lg"));

  const getResponsiveValue = (xs, sm, md, lg, xl) => {
    if (isXsDown) return xs;
    if (isSmDown) return sm;
    if (isMdDown) return md;
    if (isLgDown) return xl;
    return xl;
  };

  const containerPadding = getResponsiveValue(1, 2, 3, 4, 4);
  const cardSpacing = getResponsiveValue(1, 2, 2, 3, 3);

  const [selectedRole, setSelectedRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(!globalDataLoaded);

  const [, setRolesLoading] = useState(false);
  const [users, setUsers] = useState(globalUsersData || []);
  const [totalUsers, setTotalUsers] = useState(globalUsersData?.length || 0);
  const [activityLog, setActivityLog] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
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
  const [orgFormData, setOrgFormData] = useState({ name: '' });
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

  // ─── fetch helpers ────────────────
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
    globalUsersData = transformed;
    globalDataLoaded = true;
    globalDataTimestamp = Date.now();
    globalOrgFilter = org;
    return { users: transformed, total: data.total ?? transformed.length };
  }, [API_BASE_URL, authFetch]);

  const fetchRoles = useCallback(async (org, force = false) => {
    if (!force) {
      const c = globalRolesCache[org];
      if (c && Date.now() - c.timestamp < 300000) { setOrganizationRoles(c.roles); return; }
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

  const fetchActivityLog = useCallback(async () => {
    setActivityLoading(true);
    setActivityError('');
    try {
      const res = await authFetch(
        `${API_BASE_URL}/admin/activity-logs?limit=100`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Activity log fetch failed: ${res.status}`);
      }
      const rows = Array.isArray(data.logs) ? data.logs : [];
      const mapped = rows.map((log, index) => ({
        id: log.id || log._id || `${log.timestamp || 'activity'}-${index}`,
        action: log.action || 'ACTIVITY',
        details: log.details || 'No details recorded',
        timestamp: log.timestamp || new Date().toISOString(),
        user: log.user_id || log.user || 'System',
      }));
      if (mountedRef.current) setActivityLog(mapped);
    } catch (e) {
      console.error('fetchActivityLog error', e);
      if (mountedRef.current) setActivityError(e.message || 'Could not load activity log');
    } finally {
      if (mountedRef.current) setActivityLoading(false);
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

  // ─── MAIN LOAD ────────────────
  useEffect(() => {
    const org = selectedOrg;
    if (!org) { setLoading(false); return; }

    const cacheValid = globalDataLoaded &&
      globalOrgFilter === org &&
      globalDataTimestamp &&
      (Date.now() - globalDataTimestamp < 300000);

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

  useEffect(() => {
    if (activeTab === 2) {
      fetchActivityLog();
    }
  }, [activeTab, fetchActivityLog]);

  // ─── org switch ─────────────────────────────────────────────────────────────
  const handleOrgChange = useCallback((orgName) => {
    if (orgName === selectedOrg) { setOrgAnchorEl(null); return; }
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

  // ─── manual refresh ────────────────
  const handleManualRefresh = useCallback(async () => {
    globalDataLoaded = false;
    fetchingRef.current = false;
    setLoading(true);
    try {
      const { users: u, total } = await fetchUsers(selectedOrg);
      if (mountedRef.current) { setUsers(u); setTotalUsers(total); }
      if (isSupremeAdmin) fetchOrgs();
      if (activeTab === 2) await fetchActivityLog();
    } catch (e) {
      console.error(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetchUsers, fetchOrgs, fetchActivityLog, selectedOrg, isSupremeAdmin, activeTab]);

  // ─── CRUD handlers ────────────────
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

  // Super admin shortcut: promote a user to admin of the org currently being viewed
  const handleMakeAdmin = async (user) => {
    if (!isSupremeAdmin || !user || user.role === 'admin') return;
    if (!window.confirm(`Make ${user.name} an admin of ${selectedOrg}?`)) return;
    await handleRoleChange(user.id, 'admin');
  };

  // A brand-new org may have no 'admin' role yet, so always offer it
  const rolesForModal = useMemo(() => (
    organizationRoles.some(r => r.name === 'admin')
      ? organizationRoles
      : [{ name: 'admin', count: 0, is_system: true, color: '#f44336' }, ...organizationRoles]
  ), [organizationRoles]);

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
    } catch (e) { alert(e.message); }
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

  // Super admin shortcut: promote a user to admin of the org currently being viewed

  // ===== TARGETS TAB =====
  const [selectedWeek, setSelectedWeek] = useState(() => getISOWeekId());
  const [serviceTargets, setServiceTargets] = useState([]);
  const [twelveTasksTargets, setTwelveTasksTargets] = useState([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingTwelveTasks, setIsLoadingTwelveTasks] = useState(false);
  const [showSetTargetModal, setShowSetTargetModal] = useState(false);
  const [showSetTwelveTasksModal, setShowSetTwelveTasksModal] = useState(false);

  const [availableWeeks, setAvailableWeeks] = useState([]);

  const fetchTargets = useCallback(async () => {
    {
      if (!selectedOrg || !selectedWeek) {
        setServiceTargets([]);
        setTwelveTasksTargets([]);
        return;
      }
      setIsLoadingTargets(true);
      setIsLoadingTwelveTasks(true);
      try {
        const serviceRes = await authFetch(
          `${API_BASE_URL}/targets/service?week=${selectedWeek}&org=${selectedOrg}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );
        if (serviceRes.ok) {
          const serviceData = await serviceRes.json();
          setServiceTargets(serviceData.targets || []);
        }

        const twelveRes = await authFetch(
          `${API_BASE_URL}/targets/twelve-tasks?week=${selectedWeek}&org=${selectedOrg}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );
        if (twelveRes.ok) {
          const twelveData = await twelveRes.json();
          setTwelveTasksTargets(twelveData.targets || []);
        }
      } catch (e) {
        console.error('fetchTargets error', e);
        setServiceTargets([]);
        setTwelveTasksTargets([]);
      } finally {
        setIsLoadingTargets(false);
        setIsLoadingTwelveTasks(false);
      }
    }
  }, [API_BASE_URL, authFetch, selectedOrg, selectedWeek]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  useEffect(() => {
    const fetchAvailableWeeks = async () => {
      if (!selectedOrg) return;
      try {
        const res = await authFetch(
          `${API_BASE_URL}/targets/available-weeks?organization=${selectedOrg}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          // Fallback to recent weeks if API fails
          setAvailableWeeks(data.weeks || ['2026-W41', '2026-W40', '2026-W39', '2026-W38']);
        }
      } catch (e) {
        console.error('fetchAvailableWeeks error', e);
        setAvailableWeeks(['2026-W41', '2026-W40', '2026-W39', '2026-W38']);
      }
    };
    fetchAvailableWeeks();
  }, [selectedOrg]);

  // ===== target handlers ────────────
  const handleCopyLastWeekTargets = async () => {
    if (!selectedOrg || !selectedWeek) { alert('Please select an organization and week first'); return; }
    setIsLoadingTargets(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/targets/copy-last-week`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Targets copied successfully');
        fetchTargets();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.detail || 'Failed to copy targets'));
      }
    } catch (e) {
      console.error('copy-last-week error', e);
      alert('Error copying targets');
    } finally {
      setIsLoadingTargets(false);
    }
  };

  const handleSetTargetManual = () => {
    setShowSetTargetModal(true);
  };

  const handleSetTwelveTasksTargetManual = () => {
    setShowSetTwelveTasksModal(true);
  };

  // ─── derived: filtering / paging / styles ────────────────
  const cardStyles = {
    height: '100%', borderRadius: 2, boxShadow: 2,
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
  };
  const roleCardColors = ['#2196f3', '#9c27b0', '#f44336', '#4caf50', '#ff9800', '#00bcd4', '#795548'];

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter(u => {
      const roleOk = selectedRole === 'all' || u.role === selectedRole;
      const textOk = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
      return roleOk && textOk;
    });
  }, [users, searchTerm, selectedRole]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredUsers, page, rowsPerPage]
  );

  // Mobile card for a user (used when the table is hidden on small screens)
  const UserCard = ({ user }) => (
    <Card sx={{ ...cardStyles, mb: 1 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: '#9c27b0' }}>{getInitials(user.name)}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body1" fontWeight="medium" noWrap>{user.name}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
            <Chip label={getRoleDisplay(user.role)} color={getRoleColor(user.role)} size="small" sx={{ mt: 0.5 }} />
          </Box>
          <Stack direction="row">
            <IconButton size="small" onClick={() => { setSelectedUser(user); setShowRoleModal(true); }}><EditIcon /></IconButton>
            <IconButton size="small" color="error" onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}><Delete /></IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  // ─── organization handlers (super admin) ────────────────
  const handleOpenCreateOrg = () => {
    setEditingOrg(null);
    setOrgFormData({ name: '' });
    setOrgFormErrors({});
    setShowOrgModal(true);
    setOrgAnchorEl(null);
  };

  const handleOpenEditOrg = (org) => {
    setEditingOrg(org);
    setOrgFormData({ name: org.name || '' });
    setOrgFormErrors({});
    setShowOrgModal(true);
    setOrgAnchorEl(null);
  };

  const handleSaveOrganization = async () => {
    const name = (orgFormData.name || '').trim();
    if (!name) { setOrgFormErrors({ name: 'Organization name is required' }); return; }
    setSavingOrg(true);
    try {
      const id = editingOrg ? (editingOrg.id || editingOrg._id) : null;
      const res = await authFetch(
        id ? `${API_BASE_URL}/organizations/${id}` : `${API_BASE_URL}/organizations`,
        { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }
      );
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to save organization'); }
      addActivityLog(id ? 'ORG_UPDATED' : 'ORG_CREATED', `${id ? 'Updated' : 'Created'} organization: ${name}`);
      setShowOrgModal(false);
      setEditingOrg(null);
      await fetchOrgs();
    } catch (e) { setOrgFormErrors({ name: e.message }); }
    finally { setSavingOrg(false); }
  };

  const handleDeleteOrganization = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeletingOrg(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/organizations/${id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to delete organization'); }
      addActivityLog('ORG_DELETED', `Deleted organization: ${name}`);
      setShowOrgModal(false);
      setEditingOrg(null);
      if (selectedOrg === name) handleOrgChange('Active Church');
      await fetchOrgs();
    } catch (e) { alert(e.message); }
    finally { setDeletingOrg(false); }
  };

  const handleAddSupremeAdmin = async () => {
    const email = supremeAdminEmail.trim();
    if (!email) return;
    setAddingSupremeAdmin(true);
    setSupremeAdminError('');
    try {
      const res = await authFetch(`${API_BASE_URL}/admin/supreme-admins`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to add supreme admin'); }
      addActivityLog('SUPREME_ADMIN_ADDED', `Added supreme admin: ${email}`);
      setShowSupremeAdminModal(false);
      setSupremeAdminEmail('');
    } catch (e) { setSupremeAdminError(e.message); }
    finally { setAddingSupremeAdmin(false); }
  };

  // ─── set targets for people ────────────────
  const [serviceForm, setServiceForm] = useState({ person: null, count: '' });
  const [twelveForm, setTwelveForm] = useState({ person: null, count: '' });
  const [savingTarget, setSavingTarget] = useState(false);

  const weekOptions = useMemo(() => {
    const set = new Set([weekOffset(1), weekOffset(0), weekOffset(-1), selectedWeek, ...availableWeeks]);
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [availableWeeks, selectedWeek]);

  const personById = useMemo(() => {
    const m = {};
    users.forEach(u => { m[u.id] = u; });
    return m;
  }, [users]);

  const handleSaveServiceTarget = async () => {
    const { person, count } = serviceForm;
    if (!person || count === '' || Number(count) < 0) { alert('Pick a person and enter a target (0 or more).'); return; }
    setSavingTarget(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/targets/service`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leader_name: person.name,
          email: person.email,
          target_count: parseInt(count, 10),
          week_identifier: selectedWeek,
          person_id: person.id,
          target_type: 'service',
        })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to save service target'); }
      addActivityLog('TARGET_SET', `Service target ${count} for ${person.name} (${selectedWeek})`);
      setShowSetTargetModal(false);
      setServiceForm({ person: null, count: '' });
      await fetchTargets();
    } catch (e) { alert(e.message); }
    finally { setSavingTarget(false); }
  };

  const handleSaveTwelveTasksTarget = async () => {
    const { person, count } = twelveForm;
    if (!person || count === '' || Number(count) < 0) { alert('Pick a person and enter a target (0 or more).'); return; }
    setSavingTarget(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/targets/twelve-tasks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: person.id,
          target: parseInt(count, 10),
          week_identifier: selectedWeek,
          organization: selectedOrg,
          is_default: false,
        })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Failed to save twelve-tasks target'); }
      const data = await res.json();
      if (data.roster_status && data.roster_message) {
        alert(data.roster_message);
      }
      addActivityLog('TARGET_SET', `Twelve-tasks target ${count} for ${person.name} (${selectedWeek})`);
      setShowSetTwelveTasksModal(false);
      setTwelveForm({ person: null, count: '' });
      await fetchTargets();
    } catch (e) { alert(e.message); }
    finally { setSavingTarget(false); }
  };

  // ===== render ────────────────
  return (
    <Box padding={containerPadding} sx={{ maxWidth: "1400px", margin: "0 auto", mt: getResponsiveValue(2,3,4,5,5), minHeight: "100vh" }}>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">Admin Dashboard</Typography>
          {selectedOrg && <Chip icon={<BusinessIcon />} label={selectedOrg} color="primary" variant="outlined" />}
          {isSupremeAdmin && <Chip icon={<AdminPanelSettings />} label="Super Admin" color="error" size="small" />}
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
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditOrg(org); }} sx={{ ml: 'auto' }}><EditIcon /></IconButton>
                  </Box>
                </MenuItem>
              ))}
              <Divider />
              <MenuItem onClick={handleOpenCreateOrg} sx={{ color: 'primary.main' }}>
                <AddIcon sx={{ mr: 1 }} /><Typography variant="body2">Add New Organization</Typography>
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
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={role}>
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
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={role}>
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
            <Tab value={0} label="USERS" sx={{ fontWeight: 600 }} />
            <Tab value={1} label="ROLES & PERMISSIONS" sx={{ fontWeight: 600 }} />
            <Tab value={2} label="ACTIVITY LOG" sx={{ fontWeight: 600 }} />
            {isSupremeAdmin && <Tab value={3} label="ORGANIZATIONS" sx={{ fontWeight: 600 }} />}
            <Tab value={4} label="TARGETS" sx={{ fontWeight: 600 }} />
          </Tabs>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={handleManualRefresh} sx={{ boxShadow: 1, borderRadius: 2, height: 40 }} size={getResponsiveValue("small","small","medium","medium","medium")}>Refresh</Button>
            {isSupremeAdmin && <Button variant="contained" startIcon={<AdminPanelSettings />} onClick={() => setShowSupremeAdminModal(true)} sx={{ boxShadow: 1, borderRadius: 2, height: 40 }} size={getResponsiveValue("small","small","medium","medium","medium")}>Add Supreme</Button>}
          </Box>
        </Box>

        {/* Users tab */}
        {activeTab === 0 && (<Box padding={getResponsiveValue(1,2,3,3,3)}>
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
                              <Tooltip title="Change Role"><IconButton size="small" onClick={() => { setSelectedUser(user); setShowRoleModal(true); }} sx={{ boxShadow: 1, borderRadius: 1 }}><Shield /></IconButton></Tooltip>
                              {isSupremeAdmin && (
                                <Tooltip title={`Make admin of ${selectedOrg}`}>
                                  <IconButton size="small" disabled={user.role === 'admin' || updatingRole} onClick={() => handleMakeAdmin(user)} sx={{ boxShadow: 1, borderRadius: 1 }}><AdminPanelSettings /></IconButton>
                                </Tooltip>
                              )}
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
        </Box>)}

        {/* Roles tab */}
        {activeTab === 1 && (<Box padding={getResponsiveValue(1,2,3,3,3)}>
          <Alert severity="info" sx={{ mb: 3, boxShadow: 1, borderRadius: 2 }}>
            <AlertTitle>{uniqueRoles.length} unique roles in this organization</AlertTitle>
          </Alert>
          <Grid container spacing={cardSpacing}>
            {uniqueRoles.map((role, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={role}>
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
        </Box>)}

        {/* Activity tab */}
        {activeTab === 2 && (
          <Box sx={{ p: getResponsiveValue(1,2,3,3,3) }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="bold">Recent Activity</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Refresh activity log">
                  <IconButton size="small" onClick={fetchActivityLog} disabled={activityLoading}>
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Chip icon={<History />} label={`${activityLog.length} events`} size="small" variant="outlined" />
              </Stack>
            </Stack>
            {activityError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                action={<Button color="inherit" size="small" onClick={fetchActivityLog}>Retry</Button>}
              >
                {activityError}
              </Alert>
            )}
            {activityLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading activity log...</Typography>
              </Box>
            ) : activityLog.length === 0 ? (
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

        {/* Organizations tab (super admin only) */}
        {activeTab === 3 && isSupremeAdmin && (() => {
          const orgTabContent = () => (
            <Box padding={getResponsiveValue(1,2,3,3,3)}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Organizations</Typography>
              <Grid container spacing={cardSpacing}>
                {organizations.map(org => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={org.id || org._id}>
                    <Card sx={cardStyles}>
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                          <Avatar sx={{ bgcolor: '#1976d2', width: 48, height: 48, boxShadow: 2 }}><BusinessIcon /></Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">{org.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{org.email}</Typography>
                            {org.phone && (
                              <Typography variant="body2" color="text.secondary">
                                <PhoneIcon /> {org.phone}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                        {isSupremeAdmin && (
                          <Box sx={{ display: "flex", justifyContent: "flex-end", my: 1 }}>
                            <Button variant="outlined" size="small" startIcon={<EditIcon />} sx={{ mr: 1, borderRadius: 1 }} onClick={() => handleOpenEditOrg(org)}>Edit</Button>
                            <Button variant="outlined" size="small" startIcon={<Delete />} sx={{ ml: 1, borderRadius: 1, color: "error.main"}} onClick={() => { if (window.confirm("Delete " + org.name + "? This cannot be undone.")) { handleDeleteOrganization(org.id || org._id, org.name); }}}>Delete</Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {organizations.length === 0 && (
                  <Grid size={12}>
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <BusinessIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} /> <Typography variant="h6" color="text.secondary">No organizations found</Typography>
                    </Box>
                  </Grid>
                )}
                {isSupremeAdmin && (
                  <Box sx={{ mt: 3 }}>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateOrg} sx={{ boxShadow: 1, borderRadius: 2, width: "100%" }}>
                      <Typography variant="body1">Create New Organization</Typography>
                    </Button>
                  </Box>
                )}
              </Grid>
            </Box>
          );
          return orgTabContent();
        })()}

        {activeTab === 4 && (isAdmin || isSupremeAdmin) && (<Box padding={getResponsiveValue(1, 2, 3, 3, 3)} sx={{ pt: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Targets</Typography>
              <Typography variant="body2" color="text.secondary">
                Set weekly targets for people in {selectedOrg}.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Week</InputLabel>
                <Select label="Week" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                  {weekOptions.map(w => <MenuItem key={w} value={w}>{w}{w === getISOWeekId() ? ' (this week)' : ''}</MenuItem>)}
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleSetTargetManual}>Service target</Button>
              <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={handleSetTwelveTasksTargetManual}>Twelve-tasks target</Button>
              <Button variant="outlined" onClick={handleCopyLastWeekTargets} disabled={isLoadingTargets}>Copy last week</Button>
            </Stack>
          </Stack>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Service targets</Typography>
          <TableContainer sx={{ mb: 4, borderRadius: 1, boxShadow: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Target</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actual</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingTargets ? (
                  <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={20} /></TableCell></TableRow>
                ) : serviceTargets.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>No service targets for {selectedWeek}</TableCell></TableRow>
                ) : serviceTargets.map((t, i) => (
                  <TableRow key={t.id || t._id || i} hover>
                    <TableCell>{t.leader_name || personById[t.person_id]?.name || (t.person_id ? t.person_id : 'Leader default')}</TableCell>
                    <TableCell>{t.email || personById[t.person_id]?.email || '—'}</TableCell>
                    <TableCell align="right">{t.target_count ?? '—'}</TableCell>
                    <TableCell align="right">{t.actual_count ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Twelve-tasks targets</Typography>
          <TableContainer sx={{ borderRadius: 1, boxShadow: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Target</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actual</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingTwelveTasks ? (
                  <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={20} /></TableCell></TableRow>
                ) : twelveTasksTargets.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'text.secondary' }}>No twelve-tasks targets for {selectedWeek}</TableCell></TableRow>
                ) : twelveTasksTargets.map((t, i) => (
                  <TableRow key={t.id || t._id || i} hover>
                    <TableCell>{personById[t.person_id]?.name || t.leader_name || (t.person_id ? t.person_id : 'Leader default')}</TableCell>
                    <TableCell align="right">{t.target ?? '—'}</TableCell>
                    <TableCell align="right">{t.actual ?? 0}</TableCell>
                    <TableCell>{t.is_default ? <Chip size="small" label="Default" /> : <Chip size="small" variant="outlined" label="Custom" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>)}
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
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            {editingOrg && (
              <Button variant="outlined" color="error" onClick={() => { const id = editingOrg.id || editingOrg._id; handleDeleteOrganization(id, editingOrg.name); }} disabled={savingOrg || deletingOrg} startIcon={deletingOrg ? <CircularProgress size={20} /> : <Delete />} sx={{ mr: 'auto' }}>
                Deleting...
              </Button>
            )}
            <Button variant="outlined" onClick={() => setShowOrgModal(false)} disabled={savingOrg}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveOrganization} disabled={savingOrg} startIcon={savingOrg ? <CircularProgress size={20} /> : <CheckIcon />}>{savingOrg ? 'Saving...' : 'Save'}</Button>
          </DialogActions>
        </Dialog>

        {/* Set service target */}
        <Dialog open={showSetTargetModal} onClose={() => !savingTarget && setShowSetTargetModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
          <DialogTitle><Typography variant="h6" fontWeight="bold">Set service target · {selectedWeek}</Typography></DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Autocomplete
                options={users}
                value={serviceForm.person}
                onChange={(_, v) => setServiceForm(f => ({ ...f, person: v }))}
                getOptionLabel={u => `${u.name || ''}${u.email ? ` (${u.email})` : ''}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={params => <TextField {...params} label="Person" />}
              />
              <TextField label="Target (services this week)" type="number" inputProps={{ min: 0 }} value={serviceForm.count}
                onChange={e => setServiceForm(f => ({ ...f, count: e.target.value }))} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setShowSetTargetModal(false)} disabled={savingTarget} variant="outlined">Cancel</Button>
            <Button onClick={handleSaveServiceTarget} disabled={savingTarget || !serviceForm.person || serviceForm.count === ''} variant="contained"
              startIcon={savingTarget ? <CircularProgress size={20} /> : <CheckIcon />}>Save</Button>
          </DialogActions>
        </Dialog>

        {/* Set twelve-tasks target */}
        <Dialog open={showSetTwelveTasksModal} onClose={() => !savingTarget && setShowSetTwelveTasksModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
          <DialogTitle><Typography variant="h6" fontWeight="bold">Set twelve-tasks target · {selectedWeek}</Typography></DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Autocomplete
                options={users}
                value={twelveForm.person}
                onChange={(_, v) => setTwelveForm(f => ({ ...f, person: v }))}
                getOptionLabel={u => `${u.name || ''}${u.email ? ` (${u.email})` : ''}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={params => <TextField {...params} label="Person" />}
              />
              <TextField label="Target (tasks this week)" type="number" inputProps={{ min: 0 }} value={twelveForm.count}
                onChange={e => setTwelveForm(f => ({ ...f, count: e.target.value }))} fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setShowSetTwelveTasksModal(false)} disabled={savingTarget} variant="outlined">Cancel</Button>
            <Button onClick={handleSaveTwelveTasksTarget} disabled={savingTarget || !twelveForm.person || twelveForm.count === ''} variant="contained"
              startIcon={savingTarget ? <CircularProgress size={20} /> : <CheckIcon />}>Save</Button>
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
                  )
                  : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">Available Roles:</Typography>
                        <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => { setShowRoleModal(false); setShowCreateRoleModal(true); }} sx={{ borderRadius: 2 }}>ADD ROLE</Button>
                      </Box>
                      <Stack spacing={1} sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                        {rolesForModal.map(role => <RoleOption key={role.name} role={role} isSelected={selectedUser?.role === role.name} onSelect={() => handleRoleChange(selectedUser.id, role.name)} />)}
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

// RoleOption component
const RoleOption = ({ role, onSelect, isSelected }) => (
  <Paper variant="outlined" sx={{
    p: 2, cursor: 'pointer',
    border: isSelected ? 2 : 1,
    borderColor: isSelected ? 'primary.main' : 'divider',
    borderRadius: 1, transition: 'all 0.2s',
    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)', boxShadow: 1 }
  }} onClick={onSelect}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar sx={{ width: 24, height: 24, bgcolor: role.color || '#9c27b0' }}><PersonIcon /></Avatar>
        <Typography variant="body1" fontWeight="medium">{role.name}</Typography>
        {!role.is_system && <Chip label="custom" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.625rem' }} />}
      </Stack>
      <Typography variant="body2" color="text.secondary">{role.count} {role.count === 1 ? 'person' : 'people'}</Typography>
    </Stack>
  </Paper>
);