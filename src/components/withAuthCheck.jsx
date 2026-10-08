import React, { useContext, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { normalizeRole, SYSTEM_ROLES, ROLE_HIERARCHY, getRoleHierarchyLevel } from "../utils/roleNormalizer";
import { Box, Typography, Paper, Button, CircularProgress } from "@mui/material";
import { Block } from "@mui/icons-material";

const withAuthCheck = (WrappedComponent, allowedRoles = [], requiresCell = false) => {
  return function AuthenticatedComponent(props) {
    const { user, loading, authFetch } = useContext(AuthContext);
    const location = useLocation();
    const [hasCell, setHasCell] = useState(false);
    const [cellLoading, setCellLoading] = useState(true);

    useEffect(() => {
      const checkUserCell = async () => {
        if (requiresCell && user?.role === 'user') {
          try {
            const response = await authFetch(
              `${import.meta.env.VITE_BACKEND_URL}/check-leader-status`
            );
            
            if (!response.ok) {
              console.error('Failed to check leader status:', response.status);
              setHasCell(false);
              return;
            }
            
            const data = await response.json();
            setHasCell(data.hasCell || false);
          } catch (error) {
            console.error('Error checking user cell:', error);
            setHasCell(false);
          } finally {
            setCellLoading(false);
          }
        } else {
          setCellLoading(false);
        }
      };

      if (user) {
        checkUserCell();
      }
    }, [user, requiresCell, authFetch]);

    if (loading || (requiresCell && cellLoading)) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh' 
        }}>
          <CircularProgress size={48} />
        </Box>
      );
    }

    if (!user) {
      console.log('No user found, redirecting to login from:', location.pathname);
      return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (requiresCell && user.role === 'user' && !hasCell) {
      console.log('User does not have cell access, redirecting to home');
      return <Navigate to="/" replace />;
    }

    const userRole = user.role;
    const normalizedUserRole = normalizeRole(userRole);
    const isSupremeAdmin = user.is_supreme_admin || user.email === "tkgenia1234@gmail.com";
    const isCustomRole = !SYSTEM_ROLES.includes(normalizedUserRole);

    if (isSupremeAdmin) {
      console.log('Supreme admin access granted for:', user.email);
      return <WrappedComponent {...props} />;
    }

    if (allowedRoles.length === 0) {
      console.log('No role restrictions, access granted for:', user.email);
      return <WrappedComponent {...props} />;
    }

    if (isCustomRole) {
      console.log('Custom role detected:', userRole, '(normalized:', normalizedUserRole + ')');
      
      const userLevel = ROLE_HIERARCHY['user'] || 2;
      
      const hasAccess = allowedRoles.some(role => {
        const roleLevel = ROLE_HIERARCHY[normalizeRole(role)] || 0;
        return userLevel >= roleLevel;
      });
      
      const isUserLevelPage = allowedRoles.includes('user') || allowedRoles.includes('registrant');
      
      if (isUserLevelPage) {
        console.log('Custom role', userRole, 'granted user-level access');
        return <WrappedComponent {...props} />;
      }
      
      if (hasAccess) {
        console.log('Custom role', userRole, 'granted access based on hierarchy');
        return <WrappedComponent {...props} />;
      }
      
      const isLeaderPage = allowedRoles.includes('leader') || allowedRoles.includes('leaderat12');
      const isAdminPage = allowedRoles.includes('admin');
      
      if (isLeaderPage) {
        const roleLower = normalizedUserRole;
        if (roleLower.includes('leader') || roleLower.includes('head') || roleLower.includes('manager')) {
          console.log('Custom role', userRole, 'granted leader access based on name');
          return <WrappedComponent {...props} />;
        }
      }
      
      if (isAdminPage) {
        console.log('Custom role', userRole, 'cannot access admin pages');
        return (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh', 
            bgcolor: '#f5f5f5', 
            p: 3 
          }}>
            <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
              <Block sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Access Denied
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                You don't have permission to access this page.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your role: <strong>{user.role || 'unknown'}</strong><br />
                Required: <strong>{allowedRoles.join(' or ')}</strong>
              </Typography>
              <Button variant="contained" onClick={() => window.location.href = '/'}>
                Go to Home
              </Button>
            </Paper>
          </Box>
        );
      }
      
      console.log('Custom role', userRole, 'access denied to this page');
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh', 
          bgcolor: '#f5f5f5', 
          p: 3 
        }}>
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <Block sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              You don't have permission to access this page.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your role: <strong>{user.role || 'unknown'}</strong><br />
              Required: <strong>{allowedRoles.join(' or ')}</strong>
            </Typography>
            <Button variant="contained" onClick={() => window.location.href = '/'}>
              Go to Home
            </Button>
          </Paper>
        </Box>
      );
    }

    // Check if user role matches allowed roles (with normalization)
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
    if (normalizedAllowedRoles.includes(normalizedUserRole)) {
      console.log('System role', userRole, '(normalized:', normalizedUserRole + ') access granted');
      return <WrappedComponent {...props} />;
    }

    const userLevel = getRoleHierarchyLevel(userRole);
    
    const hasHierarchyAccess = allowedRoles.some(role => {
      const roleLevel = getRoleHierarchyLevel(role);
      return userLevel >= roleLevel;
    });
    
    if (hasHierarchyAccess) {
      console.log('Hierarchy access granted for', userRole);
      return <WrappedComponent {...props} />;
    }

    console.log('Access denied for role:', userRole, '(normalized:', normalizedUserRole + ') Required:', allowedRoles);
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        bgcolor: '#f5f5f5', 
        p: 3 
      }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Block sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            You don't have permission to access this page.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your role: <strong>{user.role || 'unknown'}</strong><br />
            Required: <strong>{allowedRoles.join(' or ')}</strong>
          </Typography>
          <Button variant="contained" onClick={() => window.location.href = '/'}>
            Go to Home
          </Button>
        </Paper>
      </Box>
    );
  };
};

export default withAuthCheck;