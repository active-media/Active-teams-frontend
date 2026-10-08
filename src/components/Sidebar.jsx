import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Box,
  useMediaQuery,
} from '@mui/material';
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
    label: 'Help & Support', 
    path: 'https://activemediahelpdesk.netlify.app/', 
    icon: SupportAgentIcon, 
    external: true, 
    roles: ['admin', 'leader', 'leaderat12', 'user', 'registrant'],
    level: 1
  },
];

export default function Sidebar({ mode, setMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:900px)');
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [, setUserHasCell] = useState(true);
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode');
    if (savedMode) setMode(savedMode);
  }, [setMode]);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setMenuItems([]);
        return;
      }

      const userRole = user?.role?.toLowerCase() || '';
      const isSupremeAdmin = user?.is_supreme_admin || user?.email === "tkgenia1234@gmail.com";
      const isCustomRole = !SYSTEM_ROLES.includes(normalizeRole(userRole));
      
      // Normalize user role for consistency
      const normalizedUserRole = normalizeRole(userRole);
      
      console.log(` Sidebar - User role: ${userRole}, Normalized: ${normalizedUserRole}, Custom: ${isCustomRole}, Supreme: ${isSupremeAdmin}`);

      if (isSupremeAdmin) {
        setMenuItems(allMenuItems);
        return;
      }
      let hasCell = true;
      if (userRole === 'user') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/check-leader-status`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          hasCell = data.hasCell || false;
          setUserHasCell(hasCell);
          console.log(' User cell check:', data);
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
                    if (item.level > userLevel) {
            console.log(` ${item.label}: Custom role ${userRole} level ${userLevel} < required ${item.level}`);
            return false;
          }
          
          if (item.path === '/events' && userRole === 'user' && !hasCell) {
            console.log(` ${item.label}: User has no cell`);
            return false;
          }
          
          console.log(`${item.label}: Custom role ${userRole} granted access (level ${userLevel})`);
          return true;
        } 
        
        else {
          // Normalize both user role and item roles for comparison
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
          
          console.log(`${item.label}: System role ${userRole} granted access`);
          return true;
        }
      });

      console.log(' Final menu items:', filteredItems.map(item => item.label));
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

  const bgColor = mode === 'dark' ? '#121212' : '#ffffff';
  const textColor = mode === 'dark' ? '#ffffff' : '#000000';
  const activeTextColor = mode === 'dark' ? '#ffffff' : '#000000';

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
        backgroundColor: bgColor,
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
            filter: mode === 'dark' ? 'invert(1) brightness(2)' : 'none',
          }}
        />
      </Box>

      <List sx={{ flexGrow: 1 }}>
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
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                color: textColor,
                backgroundColor: isActive
                  ? mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.06)'
                  : 'transparent',
                borderLeft: isActive
                  ? `4px solid ${mode === 'dark' ? '#ffffff' : '#000000'}`
                  : '4px solid transparent',
                '&:hover': {
                  backgroundColor:
                    mode === 'dark'
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(0,0,0,0.12)',
                  color: activeTextColor,
                  '& .MuiListItemIcon-root': { color: activeTextColor },
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
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ margin: 7, display: 'flex', justifyContent: 'center' }}>
        <IconButton
          onClick={handleToggleMode}
          sx={{
            color: mode === 'dark' ? '#fff' : '#000',
            backgroundColor: mode === 'dark' ? '#1f1f1f' : '#e0e0e0',
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#615a5aff' : '#a79c9cff',
            },
          }}
        >
          {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Box>

    </Box>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          color="inherit"
          onClick={handleDrawerToggle}
          sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1300 }}
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
            backgroundColor: bgColor,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}