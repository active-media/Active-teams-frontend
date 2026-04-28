import React from "react";
import { useMemo, useState, useEffect, useContext } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";

import { AuthContext } from "./contexts/AuthContext";

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

// Wrap protected pages WITH ROLES - UPDATED WITH leaderAt12
const ProtectedHome = withAuthCheck(Home, ['admin', 'leader', 'leaderAt12', 'user', 'registrant']);
const ProtectedProfile = withAuthCheck(Profile, ['admin', 'leader', 'leaderAt12', 'user', 'registrant']);
const ProtectedPeople = withAuthCheck(People, ['admin', 'leader', 'leaderAt12']);
const ProtectedEvents = withAuthCheck(Events, ['admin', 'leader', 'leaderAt12', 'registrant'], true); 
const ProtectedStats = withAuthCheck(Stats, ['admin']);
const ProtectedCheckIn = withAuthCheck(ServiceCheckIn, ['admin', 'registrant', 'leaderAt12']);
const ProtectedDailyTasks = withAuthCheck(DailyTasks, ['admin', 'leader', 'leaderAt12', 'user', 'registrant']);
const ProtectedAdmin = withAuthCheck(Admin, ['admin']);
const ProtectedCreateEvents = withAuthCheck(CreateEvents, ['admin', 'leader', 'leaderAt12']);
const ProtectedAttendance = withAuthCheck(AttendanceModal, ['admin', 'leader', 'leaderAt12']);
const ProtectedEventDetails = withAuthCheck(EventDetails, ['admin', 'leader', 'leaderAt12', 'user', 'registrant']);

function App() {
const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
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
        
        <div style={{ flexGrow: 1 }}>
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

            {/* Protected routes with role restrictions - UPDATED WITH leaderAt12 */}
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