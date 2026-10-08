import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Box,
  Switch,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

import {
  Home,
  Person,
  Group,
  Event,
  BarChart,
  Assignment,
  HowToReg,
  AdminPanelSettings
} from '@mui/icons-material';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { normalizeRole, SYSTEM_ROLES, ROLE_HIERARCHY } from '../utils/roleNormalizer';
import logo from "../assets/active-teams.png"

const BODY = "'Figtree', system-ui, sans-serif";

const allMenuItems = [
  { label: 'Home', path: '/', icon: Home, roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'], level: 1 },
  { label: 'Profile', path: '/profile', icon: Person, roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'], level: 1 },
  { label: 'People', path: '/people', icon: Group, roles: ['admin', 'leader', 'leaderat12'], level: 3 },
  { label: 'Events', path: '/events', icon: Event, roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'], requiresCell: true, level: 1 },
  { label: 'Stats', path: '/stats', icon: BarChart, roles: ['admin', 'leader', 'leaderat12'], level: 3 },
  { label: 'Service Check-in', path: '/service-check-in', icon: HowToReg, roles: ['admin', 'registrant', 'leaderat12', 'leader'], level: 1 },
  { label: 'Daily Tasks', path: '/daily-tasks', icon: Assignment, roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'], level: 1 },
  { label: 'Admin', path: '/admin', icon: AdminPanelSettings, roles: ['admin'], level: 5 },
  { label: 'Help & Support', path: 'https://activemediahelpdesk.netlify.app/', icon: SupportAgentIcon, external: true, roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'], level: 1 },
];

export default function Sidebar({ mode, setMode }) {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:900px)');
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [, setUserHasCell] = useState(true);
  const [menuItems, setMenuItems] = useState([]);

  const accent = theme.palette.primary.main;
  const isDark = mode === 'dark';
  const line = isDark ? '#2a2a38' : '#e3e1ec';

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) setMode(savedMode);
  }, [setMode]);

  // Access logic unchanged (only the debug console.log lines were removed)
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setMenuItems([]);
        return;
      }

      const userRole = user?.role?.toLowerCase() || '';
      const isSupremeAdmin = user?.is_supreme_admin || user?.email === "tkgenia1234@gmail.com";
      const isCustomRole = !SYSTEM_ROLES.includes(normalizeRole(userRole));

      if (isSupremeAdmin) {
        setMenuItems(allMenuItems);
        return;
      }
      let hasCell = true;
      if (userRole === 'user') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/check-leader-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          hasCell = data.hasCell || false;
          setUserHasCell(hasCell);
        } catch (error) {
          console.error('Error checking user cell:', error);
          hasCell = false;
          setUserHasCell(false);
        }
      } else {
        setUserHasCell(true);
      }
      const filteredItems = allMenuItems.filter(item => {
        if (isCustomRole) {
          const userLevel = ROLE_HIERARCHY['user'] || 2;
          if (item.level > userLevel) return false;
          if (item.path === '/events' && userRole === 'user' && !hasCell) return false;
          return true;
        } else {
          const normalizedUserRole = normalizeRole(userRole);
          const normalizedItemRoles = item.roles.map(normalizeRole);
          if (!normalizedItemRoles.includes(normalizedUserRole)) return false;
          if (item.path === '/events' && userRole === 'user' && !hasCell) return false;
          return true;
        }
      });
      setMenuItems(filteredItems);
    };

    checkUserAccess();
  }, [user]);

  const handleToggleMode = () => {
    setMode((prev) => {
      const newMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (location.pathname === "/signup" || location.pathname === "/login") {
    return null;
  }

  const drawerContent = (
    <Box
      sx={{
        width: 240,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: theme.palette.background.paper,
        borderRight: `1px solid ${line}`,
        fontFamily: BODY,
      }}
    >
      <Box sx={{ padding: 2, display: 'flex', justifyContent: 'center', mt: "15px" }}>
        <img
          src={logo}
          alt="Active Church Logo"
          style={{
            maxWidth: '100%',
            maxHeight: '100px',
            height: 'auto',
            borderRadius: 8,
            filter: isDark ? 'invert(1) brightness(2)' : 'none',
          }}
        />
      </Box>

      <List component="nav" aria-label="Main navigation" sx={{ flexGrow: 1, px: 1.5 }}>
        {menuItems.map(({ label, path, icon, external }) => {
          const Icon = icon;
          const isActive = !external && location.pathname === path;
          return (
            <ListItemButton
              key={label}
              component={external ? 'a' : Link}
              to={external ? undefined : path}
              href={external ? path : undefined}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                mb: 0.5,
                borderRadius: '12px',
                color: isActive ? accent : theme.palette.text.secondary,
                backgroundColor: isActive ? alpha(accent, 0.1) : 'transparent',
                borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
                '&.Mui-selected': { backgroundColor: alpha(accent, 0.1) },
                '&.Mui-selected:hover': { backgroundColor: alpha(accent, 0.14) },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                  color: accent,
                  '& .MuiListItemIcon-root': { color: accent },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <Icon />
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: BODY,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Theme switch: a footer row styled like the menu items */}
      <Box sx={{ borderTop: `1px solid ${line}`, p: 1.5 }}>
        <ListItemButton
          role="switch"
          aria-checked={isDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={handleToggleMode}
          sx={{
            borderRadius: '12px',
            borderLeft: '3px solid transparent',
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
              color: accent,
              '& .MuiListItemIcon-root': { color: accent },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            {isDark ? <Brightness4Icon /> : <Brightness7Icon />}
          </ListItemIcon>
          <ListItemText
            primary={isDark ? 'Dark mode' : 'Light mode'}
            primaryTypographyProps={{ fontSize: '0.95rem', fontFamily: BODY }}
          />
          <Switch
            edge="end"
            size="small"
            checked={isDark}
            tabIndex={-1}
            disableRipple
            inputProps={{ 'aria-hidden': true }}
            sx={{ pointerEvents: 'none' }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="Open navigation menu"
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed', top: 12, left: 12, zIndex: 1300,
            bgcolor: theme.palette.background.paper, border: `1px solid ${line}`, borderRadius: '12px',
            '&:hover': { bgcolor: theme.palette.background.paper },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            height: '100vh',
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${line}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}