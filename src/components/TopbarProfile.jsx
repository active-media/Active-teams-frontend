import React, { useContext, useState, useEffect } from "react";
import {
  Avatar,
  Alert,
  Box,
  Button,
  IconButton,
  Snackbar,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  useTheme,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { UserContext } from "../contexts/UserContext";
import { usePushNotifications } from "../contexts/PushNotificationContext";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";


export default function TopbarProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const { profilePic, loadUserProfile } = useContext(UserContext);
  const { enablePushNotifications, disablePushNotifications,sendPushNotification } = usePushNotifications();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushFeedback, setPushFeedback] = useState(null);
  const open = Boolean(anchorEl);

const handleTestNotification = async () => {
  try {
    const result = await sendPushNotification({
      recipientEmails: ["divinentambwe28@gmail.com"],
      title: "Test",
      body: "It works!",
    });
    console.log("Push result:", result);
  } catch (error) {
    console.error("Could not send test notification:", error);
  }
};

  useEffect(() => {
    let cancelled = false;
   let enabled;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return undefined;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setPushEnabled(Boolean(subscription));
        enabled = Boolean(subscription);
      })
      .catch((error) => {
        console.error("Could not check push notification status:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const initializeProfile = async () => {
      if (isAuthenticated && user) {
        setIsLoading(true);
        try {
          if (loadUserProfile) {
            await loadUserProfile();
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeProfile();
  }, [user, isAuthenticated, loadUserProfile]);

  const getDisplayName = () => {
    return user?.name || user?.email || "Profile";
  };

  const getInitials = () => {
    if (user?.name) {
      return user.name[0].toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const isDefaultAvatar = () => {
    if (!profilePic) return true;
    
    const defaultAvatarUrls = [
      "https://cdn-icons-png.flaticon.com/512/6997/6997662.png",
      "https://cdn-icons-png.flaticon.com/512/6997/6997675.png",
      "https://cdn-icons-png.flaticon.com/512/147/147144.png"   
    ];
    
    return defaultAvatarUrls.some(url => profilePic.includes(url));
  };

  // Hide on auth routes
  if (location.pathname === "/signup" || location.pathname === "/login")
    return null;

  const handleMenuToggle = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handlePushToggle = async () => {
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePushNotifications();
        setPushEnabled(false);
        setPushFeedback({ severity: "success", message: "Notifications disabled on this device." });
      } else {
        await enablePushNotifications();
        setPushEnabled(true);
        setPushFeedback({ severity: "success", message: "Notifications enabled on this device." });
      }
    } catch (error) {
      setPushFeedback({
        severity: "error",
        message: error.message || "Could not update notification settings.",
      });
    } finally {
      setPushBusy(false);
    }
  };
  

  const displayName = getDisplayName();
  const initials = getInitials();
  const showInitials = isDefaultAvatar();

  return (
    <Box
      component="header"
      sx={{
        minHeight: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 1,
        px: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Button
        size="small"
        variant={pushEnabled ? "outlined" : "contained"}
        color={pushEnabled ? "inherit" : "primary"}
        startIcon={pushEnabled ? <NotificationsOffIcon /> : <NotificationsActiveIcon />}
        onClick={handlePushToggle}
        disabled={pushBusy}
        aria-label={pushEnabled ? "Disable push notifications" : "Enable push notifications"}
      >
       {pushBusy ? "Please wait..." : pushEnabled ? "Notifications on" : "Enable notifications"} 
      </Button>
      {/* <Button onClick={handleTestNotification}>
  Send test notification
</Button> */}

      <Tooltip title={`Go to Profile (${displayName})`}>
        <IconButton
          sx={{
            p: 0,
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
          onClick={handleProfileClick}
        >
          <Avatar
            alt={displayName}
            src={!isLoading && profilePic ? profilePic : undefined}
            sx={{
              width: 40,
              height: 40,
              border: `2px solid ${theme.palette.background.paper}`,
              cursor: "pointer",
              bgcolor: showInitials ? theme.palette.primary.main : 'transparent',
              boxShadow: theme.shadows[2],
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {(showInitials || isLoading) && initials}
          </Avatar>
        </IconButton>
      </Tooltip>

      <IconButton
        aria-label="Open account menu"
        onClick={handleMenuToggle}
        sx={{
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.1)'
          }
        }}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          elevation: 4,
          sx: {
            minWidth: 160,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxShadow: theme.shadows[6],
            overflow: 'visible',
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            }
          },
        }}
      >
        <MenuItem
          onClick={handleLogout}
          sx={{
            "&:hover": {
              backgroundColor: theme.palette.mode === "dark" 
                ? "rgba(255, 255, 255, 0.1)" 
                : "rgba(0, 0, 0, 0.04)",
            },
            px: 2,
            py: 1.2,
            fontSize: 14,
            borderRadius: 1,
            margin: 0.5,
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Snackbar
        open={Boolean(pushFeedback)}
        autoHideDuration={6000}
        onClose={() => setPushFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {pushFeedback ? (
          <Alert
            onClose={() => setPushFeedback(null)}
            severity={pushFeedback.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {pushFeedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}