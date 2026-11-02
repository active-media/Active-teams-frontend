import React, { useState, useEffect, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Typography,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Link,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import darkLogo from "../assets/active-teams.png";
import { AuthContext } from "../contexts/AuthContext";

const ResetPassword = ({ mode }) => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useContext(AuthContext);

  useEffect(() => {
    if (!token) {
      setError("Invalid or expired reset token.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Invalid or expired reset token.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
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

        {/* Heading */}
        <Typography variant="h5" fontWeight="bold" mb={2}>
          Reset Password
        </Typography>

        <Typography variant="body2" mb={1} sx={{ textAlign: "left" }}>
          Enter and confirm your new password to reset your account.
        </Typography>

        {/* Error / Success Messages */}
        {error && (
          <Typography color="error.main" fontSize={14} mb={2}>
            {error}
          </Typography>
        )}
        {message && (
          <Typography color="success.main" fontSize={14} mb={2}>
            {message}
          </Typography>
        )}

        {/* New Password */}
        <TextField
          label="New Password"
          type={showPassword ? "text" : "password"}
          variant="outlined"
          fullWidth
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "999px",
              backgroundColor:
                mode === "dark" ? theme.palette.background.default : "#fff",
              color: theme.palette.text.primary,
            },
            "& .MuiInputLabel-root": {
              color: theme.palette.text.secondary,
            },
          }}
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={() => setShowPassword((prev) => !prev)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />

        {/* Confirm Password */}
        <TextField
          label="Confirm Password"
          type={showConfirm ? "text" : "password"}
          variant="outlined"
          fullWidth
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              borderRadius: "999px",
              backgroundColor:
                mode === "dark" ? theme.palette.background.default : "#fff",
              color: theme.palette.text.primary,
            },
            "& .MuiInputLabel-root": {
              color: theme.palette.text.secondary,
            },
          }}
          InputProps={{
            endAdornment: (
              <IconButton
                onClick={() => setShowConfirm((prev) => !prev)}
                edge="end"
              >
                {showConfirm ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={loading || !token}
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
          {loading ? "Resetting..." : "Reset Password"}
        </Button>

        {/* Back to Login */}
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

export default ResetPassword;
