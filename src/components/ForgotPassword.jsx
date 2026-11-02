import React, { useState, useContext } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  Link,
} from "@mui/material";
import darkLogo from "../assets/active-teams.png";
import { AuthContext } from "../contexts/AuthContext";

const ForgotPassword = ({ mode }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const isDark = mode === "dark";

  const { requestPasswordReset } = useContext(AuthContext);

  const inputFieldSx = {
    mb: 2,
    "& .MuiOutlinedInput-root": {
      bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
      borderRadius: "999px",
      "& fieldset": {
        borderColor: isDark ? "#333333" : "#e0e0e0",
      },
      "&:hover fieldset": {
        borderColor: isDark ? "#555555" : "#b0b0b0",
      },
      "&.Mui-focused": {
        bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#42a5f5",
      },
    },
    "& .MuiInputBase-input": {
      color: isDark ? "#ffffff" : "#000000",
      bgcolor: "transparent !important",
      "&:-webkit-autofill": {
        WebkitBoxShadow: isDark ? "0 0 0 100px #1a1a1a inset !important" : "0 0 0 100px #f8f9fa inset !important",
        WebkitTextFillColor: isDark ? "#ffffff !important" : "#000000 !important",
        transition: "background-color 5000s ease-in-out 0s",
      },
      "&:focus": {
        bgcolor: "transparent !important",
      },
    },
    "& .MuiInputLabel-root": {
      color: isDark ? "#999999" : "#666666",
      "&.Mui-focused": {
        color: "#42a5f5",
      },
    },
    "& .MuiInputBase-root": {
      bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
      "&.Mui-focused": {
        bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
      },
    },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const trimmed = (email || "").trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(trimmed);
      setMessage("If your email exists, a reset link has been sent.");
      setEmail("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.palette.background.default,
        px: 2,
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          maxWidth: 400,
          backgroundColor:
            mode === "dark" ? theme.palette.background.paper : "#fff",
          color: theme.palette.text.primary,
          p: 4,
          borderRadius: 4,
          boxShadow: 3,
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <Box display="flex" justifyContent="center" mb={2}>
          <img
            src={darkLogo}
            alt="The Active Church"
            style={{
              maxHeight: isSmallScreen ? 60 : 80,
              maxWidth: "100%",
              objectFit: "contain",
              filter: mode === "dark" ? "invert(1)" : "none",
              transition: "filter 0.3s ease-in-out",
            }}
          />
        </Box>

        <Typography variant="h5" fontWeight="bold" mb={2}>
          Forgot Password
        </Typography>
        <Typography variant="body2" mb={2} sx={{ textAlign: "left" }}>
          Enter your email address to reset your password.
        </Typography>

        <TextField
          label="Email Address"
          type="email"
          variant="outlined"
          fullWidth
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={inputFieldSx}
        />

        {message && (
          <Typography color="success.main" fontSize={14} mb={2}>
            {message}
          </Typography>
        )}
        {error && (
          <Typography color="error.main" fontSize={14} mb={2}>
            {error}
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{
            backgroundColor: mode === "dark" ? "#fff" : "#000",
            color: mode === "dark" ? "#000" : "#fff",
            fontWeight: "bold",
            borderRadius: "999px",
            py: 1.2,
            mb: 2,
            "&:hover": {
              backgroundColor: mode === "dark" ? "#e0e0e0" : "#222",
            },
          }}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        <Typography fontSize={14}>
          Remember your password?{" "}
          <Link href="/login" underline="hover" color="primary">
            Login
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default ForgotPassword;