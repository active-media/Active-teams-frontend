import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Box, IconButton } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import darkLogo from "../assets/active-teams.png";
import styles from "../styles/AuthPage.module.css";

// Stays mounted for the whole time the user is on /login or /signup.
// Only the <Outlet/> content (the actual Login/Signup fields) swaps when
// the route changes — the shell, logo and media panel never remount,
// which is what lets the two sides slide instead of jump-cutting.
const AuthPage = ({ mode, setMode }) => {
  const location = useLocation();
  const authMode = location.pathname === "/signup" ? "signup" : "login";
  const isDark = mode === "dark";

  return (
    <Box className={styles.authPage} data-authmode={authMode} data-theme={mode}>
      <IconButton
        className={styles.themeToggle}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => {
          const next = mode === "light" ? "dark" : "light";
          localStorage.setItem("themeMode", next);
          setMode(next);
        }}
        sx={{
          color: isDark ? "#fff" : "#000",
          backgroundColor: isDark ? "#1f1f1f" : "#e0e0e0",
          "&:hover": { backgroundColor: isDark ? "#2c2c2c" : "#c0c0c0" },
        }}
      >
        {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>

      <Box className={styles.authShell}>
        <Box className={styles.track}>
          {/* ---- Form side ---- */}
          <Box
            className={styles.formPanel}
            sx={{ background: (theme) => theme.palette.background.paper }}
          >
            <Box className={styles.formFrame}>
              <Box display="flex" justifyContent="center" mb={2}>
                <img
                  src={darkLogo}
                  alt="The Active Church Logo"
                  style={{
                    maxHeight: 72,
                    maxWidth: "100%",
                    objectFit: "contain",
                    filter: isDark ? "invert(1)" : "none",
                    transition: "filter 0.3s ease-in-out",
                  }}
                />
              </Box>

              {/* Re-mounts on every route change so it can play a short
                  entrance fade timed to land partway through the slide. */}
              <Box key={location.pathname} className={styles.viewFade}>
                <Outlet />
              </Box>
            </Box>
          </Box>

          {/* ---- Media side ---- */}
          <Box className={styles.mediaPanel}>
            <video
              className={styles.authVideo}
              src="/active%20teams.mp4"
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              tabIndex={-1}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AuthPage;