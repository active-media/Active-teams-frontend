import React from "react";
import { useMemo, useState, useEffect, useContext, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

import { AuthContext } from "./contexts/AuthContext";
import { UserContext } from "./contexts/UserContext";

import Sidebar from "./components/Sidebar";
import TopbarProfile from "./components/TopbarProfile";

import Home from "./Pages/Home";
import Profile from "./Pages/Profile";
import { PeopleSection as People } from "./Pages/People";
import Events from "./Pages/Events";
import Stats from "./Pages/Stats";
import ServiceCheckIn from "./Pages/ServiceCheckIn";
import DailyTasks from "./Pages/DailyTasks";
import CreateEvents from "./Pages/CreateEvents";
import AttendanceModal from "./Pages/AttendanceModal";
import EventDetails from "./Pages/EventDetails";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import EventRegistrationForm from "./components/EventRegistrationForm";
import SplashScreen from "./components/SplashScreen";

import withAuthCheck from "./components/withAuthCheck";
import Admin from "./Pages/Admin";
import NotFound from "./Pages/NotFound";

// Wrap protected pages WITH ROLES - Updated with normalized roles (lowercase)
const ProtectedHome = withAuthCheck(Home, ['admin', 'leader', 'leaderat12', 'user', 'registrant']);
const ProtectedProfile = withAuthCheck(Profile, ['admin', 'leader', 'leaderat12', 'user', 'registrant']);
const ProtectedPeople = withAuthCheck(People, ['admin', 'leader', 'leaderat12']);
const ProtectedEvents = withAuthCheck(Events, ['admin', 'leader', 'leaderat12', 'registrant'], true); 
const ProtectedStats = withAuthCheck(Stats, ['admin','leaderat12']);
const ProtectedCheckIn = withAuthCheck(ServiceCheckIn, ['admin', 'registrant', 'leaderat12']);
const ProtectedDailyTasks = withAuthCheck(DailyTasks, ['admin', 'leader', 'leaderat12', 'user', 'registrant']);
const ProtectedAdmin = withAuthCheck(Admin, ['admin']);
const ProtectedCreateEvents = withAuthCheck(CreateEvents, ['admin', 'leader', 'leaderat12']);
const ProtectedAttendance = withAuthCheck(AttendanceModal, ['admin', 'leader', 'leaderat12']);
const ProtectedEventDetails = withAuthCheck(EventDetails, ['admin', 'leader', 'leaderat12', 'user', 'registrant']);

function App() {
  const { user, loading, authFetch } = useContext(AuthContext);
  const { loadUserProfile, setUserProfile, setProfilePic } = useContext(UserContext);
  const location = useLocation();
  const profileRefreshDone = useRef(false);
  const [mode, setMode] = useState(() => localStorage.getItem("themeMode") || "light");
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const [showSplash, setShowSplash] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);

  const noLayoutRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];
  const hideLayout = noLayoutRoutes.includes(location.pathname);

  useEffect(() => {
    console.log(' Debug Info:', {
      user: !!user,
      userRole: user?.role,
      loading,
      showSplash,
      splashFinished,
      currentPath: location.pathname,
      shouldRedirect: !loading && !user && !showSplash
    });
  }, [user, loading, showSplash, splashFinished, location.pathname]);


  const handleSplashFinish = () => {
    console.log(' Splash animation finished');
    setSplashFinished(true);
  };


  useEffect(() => {
    if (splashFinished && !loading) {
      console.log(' Both splash and auth complete, hiding splash screen');
      setShowSplash(false);
    }
  }, [splashFinished, loading]);

  useEffect(() => {
    if (!loading && user && loadUserProfile) {
      loadUserProfile();
    }
  }, [loading, user, loadUserProfile]);

  useEffect(() => {
    const refreshProfile = async () => {
      if (!authFetch || !user) return;

      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");
      if (!token) return;

      let userId = user?.user_id || user?.id || user?.sub;
      if (!userId) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload.user_id || payload.sub || payload.id;
        } catch {
          return;
        }
      }

      if (!userId) return;

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const response = await authFetch(`${backendUrl}/profile/${userId}`);
        if (!response.ok) return;

        const profileData = await response.json();

        const getDefaultAvatarUrl = (gender) => {
          if (!gender) return "https://cdn-icons-png.flaticon.com/512/147/147144.png";
          const normalized = String(gender).trim().toLowerCase();
          if (normalized === "female") return "https://cdn-icons-png.flaticon.com/512/6997/6997662.png";
          if (normalized === "male") return "https://cdn-icons-png.flaticon.com/512/6997/6997675.png";
          return "https://cdn-icons-png.flaticon.com/512/147/147144.png";
        };

        const finalProfilePic =
          profileData.profile_picture && profileData.profile_picture.trim()
            ? profileData.profile_picture
            : getDefaultAvatarUrl(profileData.gender);

        const finalProfile = {
          ...profileData,
          profile_picture: finalProfilePic,
          avatarUrl: finalProfilePic,
          profilePicUrl: finalProfilePic,
        };

        if (setUserProfile) setUserProfile(finalProfile);
        if (setProfilePic) setProfilePic(finalProfilePic);
      } catch (error) {
        console.error("App profile refresh error:", error);
      }
    };

    if (!loading && user && !profileRefreshDone.current) {
      profileRefreshDone.current = true;
      refreshProfile();
    }
  }, [loading, user, authFetch, setUserProfile, setProfilePic]);

  useEffect(() => {
    if (!user) {
      profileRefreshDone.current = false;
    }
  }, [user]);

  if (showSplash || loading) {
    return (
      <SplashScreen
        onFinish={handleSplashFinish}
        duration={6000}
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {user && !hideLayout && <TopbarProfile />}
      
      <div style={{ display: "flex" }}>
        {user && !hideLayout && <Sidebar mode={mode} setMode={setMode} />}
        
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                !user ? (
                  <Login mode={mode} setMode={setMode} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route 
              path="/signup" 
              element={
                !user ? (
                  <Signup mode={mode} setMode={setMode} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
            <Route path="/forgot-password" element={<ForgotPassword mode={mode} />} />
            <Route path="/reset-password" element={<ResetPassword mode={mode} />} />

            {/* Protected routes with role restrictions - normalized roles (lowercase) */}
            <Route path="/" element={<ProtectedHome />} />
            <Route path="/admin" element={<ProtectedAdmin />} />
            <Route path="/profile" element={<ProtectedProfile title="Profile" />} />
            <Route path="/people" element={<ProtectedPeople title="People" />} />
            <Route path="/events" element={<ProtectedEvents title="Events" />} />
            <Route path="/stats" element={<ProtectedStats title="Stats" />} />
            <Route path="/create-events" element={<ProtectedCreateEvents title="Create Events" />} />
            <Route path="/edit-event/:id" element={<ProtectedCreateEvents title="Create Events Edit" />} />
            <Route path="/attendance" element={<ProtectedAttendance title="Attendance Modal" />} />
            <Route path="/event-details" element={<ProtectedEventDetails title="event-details-screen" />} />
            <Route path="/service-check-in" element={<ProtectedCheckIn title="Service Check-in" />} />
            <Route path="/daily-tasks" element={<ProtectedDailyTasks title="Daily Tasks" />} />
            <Route path="/event-payment/:eventId" element={<EventRegistrationForm title="Event register" />} />
            <Route path="*" element={<NotFound />} />

          </Routes>

          
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;