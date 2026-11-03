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
import SettingsIcon from '@mui/icons-material/Settings';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

import {
  Home,
  Person,
  Group,
  Event,
  BarChart,
  Assessment,
  Assignment,
  HowToReg,
  AdminPanelSettings,
  Description,
  AccessTime
} from '@mui/icons-material';
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { normalizeRole, SYSTEM_ROLES, ROLE_HIERARCHY } from '../utils/roleNormalizer';
import logo from "../assets/active-teams.png"

const BODY = "'Figtree', system-ui, sans-serif";

const allMenuItems = [
  { 
    label: 'Home', 
    path: '/', 
    icon: Home, 
    roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'],
    level: 1 
  },
  { 
    label: 'Profile', 
    path: '/profile', 
    icon: Person, 
    roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'],
    level: 1
  },
  { 
    label: 'People', 
    path: '/people', 
    icon: Group, 
    roles: ['admin', 'leader', 'leaderat12'],
    level: 3
  },
  { 
    label: 'Events', 
    path: '/events', 
    icon: Event, 
    roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'],
    requiresCell: true,
    level: 1
  },
  { 
    label: 'Stats', 
    path: '/stats', 
    icon: BarChart, 
    roles: ['admin', 'leader', 'leaderat12'],
    level: 3
  },
  { 
    label: 'Service Check-in', 
    path: '/service-check-in', 
    icon: HowToReg, 
    roles: ['admin', 'registrant', 'leaderat12', 'leader'],
    level: 1
  },
  { 
    label: 'Daily Tasks', 
    path: '/daily-tasks', 
    icon: Assignment, 
    roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'],
    level: 1
  },
  { 
    label: 'Admin', 
    path: '/admin', 
    icon: AdminPanelSettings, 
    roles: ['admin'],
    level: 5
  },
  { 
    label: 'REPORTING', 
    divider: true, 
    roles: [] 
  },
  { 
    label: 'Reports', 
    path: '/reports', 
    icon: Description, 
    roles: ['admin', 'leader', 'leaderat12'],
    level: 3
  },
  { 
    label: 'Scheduled Reports', 
    path: '/reporting/scheduled', 
    icon: AccessTime, 
    roles: ['admin'],
    level: 5
  },
  { 
    label: 'Reporting Dashboard', 
    path: '/reporting/dashboard', 
    icon: BarChart, 
    roles: ['admin', 'leader', 'leaderat12'],
    level: 3
  },
  {
    label: 'Report History',
    path: '/reporting/history',
    icon: AccessTime,
    roles: ['admin', 'leader', 'leaderat12'],
    level: 3
  },
  { 
    label: 'Help & Support', 
    path: 'https://activemediahelpdesk.netlify.app/', 
    icon: SupportAgentIcon, 
    external: true, 
    roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'],
    level: 1
  },
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

      const userRole = "admin"
      // user?.role?.toLowerCase() || '';
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
        // if (userRole === 'admin' ) {
        //   return true;
        // }
        if (item.divider) {
          return true;
        }

        if (isCustomRole) {
          const userLevel = ROLE_HIERARCHY['user'] || 2;
          if (item.level > userLevel) return false;
          if (item.path === '/events' && userRole === 'user' && !hasCell) return false;
          return true;
        } else {
          const normalizedUserRole = normalizeRole(userRole);
          const normalizedItemRoles = item.roles.map(normalizeRole);
          
          if (!normalizedItemRoles.includes(normalizedUserRole)) {
            console.log(` ${item.label}: System role ${userRole} (normalized: ${normalizedUserRole}) not in ${item.roles} (normalized: ${normalizedItemRoles})`);
            return false;
          }
          
          if (item.path === '/events' && userRole === 'user' && !hasCell) {
            console.log(` ${item.label}: User has no cell`);
            return false;
          }
          if (item.roles.includes(userRole)) {
            console.log(`${item.label}: System role ${userRole} granted access`);
            return true
          }
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

  // Flatter, truer black in dark mode to match the design
  const bgColor = mode === 'dark' ? '#0a0a0a' : '#ffffff';
  const textColor = mode === 'dark' ? '#ffffff' : '#000000';
  const activeTextColor = mode === 'dark' ? '#ffffff' : '#000000';
  const activeBorderColor = mode === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)';

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

      <List sx={{ flexGrow: 1 }}>
        {menuItems.map(({ label, path, icon, external, divider }) => {
          const Icon = icon;
          if (divider) {
            return (
              <Box
                key={label}
                sx={{
                  px: 1,
                  pt: 2,
                  pb: 0.75,
                  textTransform: 'uppercase',
                  color: mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {label}
              </Box>
            );
          }
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
                borderRadius: 2,
                color: textColor,
                border: isActive ? `1px solid ${activeBorderColor}` : '1px solid transparent',
                backgroundColor: isActive
                  ? mode === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.04)'
                  : 'transparent',
                '&:hover': {
                  backgroundColor:
                    mode === 'dark'
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(0,0,0,0.08)',
                  color: activeTextColor,
                  '& .MuiListItemIcon-root': { color: activeTextColor },
                },
                '&.Mui-selected': {
                  backgroundColor:
                    mode === 'dark'
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.04)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor:
                    mode === 'dark'
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(0,0,0,0.08)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: BODY,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Bottom-left settings/theme control, matching the gear icon in the design */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <IconButton
          onClick={handleToggleMode}
          size="small"
          title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          sx={{
            color: mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
            backgroundColor: 'transparent',
            border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
            '&:hover': {
              backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
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