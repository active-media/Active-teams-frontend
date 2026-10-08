import React, { useState, useContext } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  IconButton,
  Link,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const initialForm = {
  email: "",
  password: "",
};

// Rendered inside AuthPage's <Outlet/>. mode is still passed down from
// App.jsx via the route element, same as before.
const Login = ({ mode }) => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const isDark = mode === "dark";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      setSuccess("Login successful!");
      // The protected route will automatically navigate to home
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.response?.data?.message || err.message || "Login failed. Check console for details.";
      setError(
        msg.includes("not found") || msg.includes("no account")
          ? "Invalid email or password. Please try again or sign up."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const inputFieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
      borderRadius: 3,
      "& fieldset": { borderColor: isDark ? "#333333" : "#e0e0e0" },
      "&:hover fieldset": { borderColor: isDark ? "#555555" : "#b0b0b0" },
      "&.Mui-focused": { bgcolor: isDark ? "#1a1a1a" : "#f8f9fa" },
      "&.Mui-focused fieldset": { borderColor: "#42a5f5" },
    },
    "& .MuiInputBase-input": {
      color: isDark ? "#ffffff" : "#000000",
      "&:-webkit-autofill": {
        WebkitBoxShadow: "0 0 0 1000px inherit inset !important",
        WebkitTextFillColor: "inherit !important",
        transition: "background-color 5000s ease-in-out 0s",
      },
      "&:focus": { bgcolor: "transparent !important" },
    },
    "& .MuiInputLabel-root": {
      color: isDark ? "#999999" : "#666666",
      "&.Mui-focused": { color: "#42a5f5" },
    },
    "& .MuiInputBase-root": {
      bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
      "&.Mui-focused": { bgcolor: isDark ? "#1a1a1a" : "#f8f9fa" },
    },
  };

  return (
    <>
      <Typography variant="h5" fontWeight="bold" mb={3} textAlign="center">
        Login
      </Typography>

      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
        <TextField
          label="Email Address"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          fullWidth
          error={!!error && !form.email}
          helperText={!form.email && error ? "Email is required" : ""}
          sx={inputFieldSx}
        />

        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={handleChange}
          fullWidth
          error={!!error && !form.password}
          helperText={!form.password && error ? "Password is required" : ""}
          sx={inputFieldSx}
          InputProps={{
            style: {
              fontFamily: "monospace",
              WebkitTextSecurity: `${showPassword ? "" : "disc"}`,
            },
            endAdornment: (
              <IconButton
                onClick={() => setShowPassword((prev) => !prev)}
                edge="end"
                sx={{ color: isDark ? "#cccccc" : "#666666" }}
              >
                {!showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            ),
          }}
        />

        {error && <Typography color="error.main" textAlign="center">{error}</Typography>}
        {success && <Typography color="success.main" textAlign="center">{success}</Typography>}

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: 3,
            fontWeight: "bold",
            py: 1.5,
            mt: 1,
            "&:hover": { backgroundColor: "#222" },
          }}
        >
          {loading ? "Logging In..." : "Login"}
        </Button>
      </Box>

      <Box textAlign="center" mt={3}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate("/forgot-password")}
          sx={{ textDecoration: "underline", color: "#42a5f5", mb: 1 }}
        >
          Forgot Password?
        </Link>
        <Typography variant="body2" mt={1}>
          Don't have an account?{" "}
          <Link
            component="button"
            onClick={() => navigate("/signup")}
            sx={{ textDecoration: "underline", color: "#42a5f5" }}
          >
            Sign Up
          </Link>
        </Typography>
      </Box>
    </>
  );
};

export default Login;