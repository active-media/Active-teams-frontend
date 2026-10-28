import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  Typography,
  IconButton,
  Autocomplete,
  CircularProgress,
  Alert,
  Paper,
  InputLabel,
} from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTheme } from "@mui/material/styles";
import { UserContext } from "../contexts/UserContext";
import { AuthContext, supabase } from "../contexts/AuthContext";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import darkLogo from "../assets/active-teams.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid"; // npm i uuid  (add to your project)

// ─── Geoapify (address autocomplete, SA only) ─────────────────────────────────
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const GEOAPIFY_COUNTRY_CODE = "za";

// ─── Confetti / welcome overlay (unchanged) ───────────────────────────────────
const WelcomeOverlay = ({ name, mode }) => {
  const pieces = Array.from({ length: 90 }).map((_, i) => {
    const left = Math.random() * 100;
    const size = 6 + Math.random() * 8;
    const height = size * (1.4 + Math.random());
    const rotate = Math.random() * 360;
    const dur = 2 + Math.random() * 1.5;
    const delay = Math.random() * 0.6;
    const colors = [
      "#f94144", "#f3722c", "#f8961e", "#f9844a", "#f9c74f",
      "#90be6d", "#43aa8b", "#577590", "#9b5de5", "#00bbf9",
    ];
    const bg = colors[Math.floor(Math.random() * colors.length)];
    const br = Math.random() > 0.6 ? `${size / 2}px` : "2px";

    return (
      <Box
        key={i}
        sx={{
          position: "absolute",
          top: -20,
          left: `${left}%`,
          width: `${size}px`,
          height: `${height}px`,
          backgroundColor: bg,
          borderRadius: br,
          opacity: 0.95,
          transform: `rotate(${rotate}deg)`,
          animation: `fall ${dur}s linear ${delay}s 1`,
        }}
      />
    );
  });

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: mode === "dark" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)",
        backdropFilter: "blur(2px)",
        overflow: "hidden",
        "@keyframes fall": {
          "0%": {
            transform: "translate3d(0,-10vh,0) rotate(0deg)",
            opacity: 1,
          },
          "80%": { opacity: 1 },
          "100%": {
            transform: "translate3d(0,110vh,0) rotate(360deg)",
            opacity: 0.6,
          },
        },
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {pieces}
      </Box>
      <Box
        sx={{
          position: "relative",
          px: 4,
          py: 3,
          borderRadius: 4,
          boxShadow: 6,
          textAlign: "center",
          backgroundColor: mode === "dark" ? "#121212" : "#ffffff",
          color: mode === "dark" ? "#fff" : "#111",
          border: mode === "dark" ? "1px solid #2a2a2a" : "1px solid #eaeaea",
          minWidth: 280,
        }}
      >
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Welcome{name ? ", " : ""}
          {name || "Friend"}!
        </Typography>
        <Typography variant="body1">
          Your account is ready. Taking you to your dashboard…
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Initial form state ───────────────────────────────────────────────────────
const initialForm = {
  name: "",
  surname: "",
  date_of_birth: "",
  home_address: "",
  invited_by: "",
  invited_by_id: "",
  phone_number: "",
  email: "",
  gender: "",
  password: "",
  confirm_password: "",
  organization: "",
};

// Rendered inside AuthPage's <Outlet/>. mode/setMode still come from
// App.jsx via the route element, same as before.
const Signup = ({ onSignup, mode }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setUserProfile } = useContext(UserContext);
  const { login } = useContext(AuthContext);
  const isDark = mode === "dark";

  // const [form, setForm] = useState(initialForm);
  // const [errors, setErrors] = useState({});
  // const [loading, setLoading] = useState(false);
  // const [showPassword, setShowPassword] = useState(false);
  // const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  // // Organizations (fetched from Supabase)
  // const [organizations, setOrganizations] = useState([]);
  // const [orgsLoading, setOrgsLoading] = useState(false);
  // const [orgsError, setOrgsError] = useState("");

  // // Invited-by users (filtered by org)
  // const [orgUsers, setOrgUsers] = useState([]);
  // const [orgUsersLoading, setOrgUsersLoading] = useState(false);
  // const [orgUsersError, setOrgUsersError] = useState("");
  // const [selectedInvitedBy, setSelectedInvitedBy] = useState(null);

  // // Address autocomplete
  // const [addressOptions, setAddressOptions] = useState([]);
  // const [addressLoading, setAddressLoading] = useState(false);
  // const [addressError, setAddressError] = useState("");
  // const [selectedAddress, setSelectedAddress] = useState(null);
  // const [biasLonLat, setBiasLonLat] = useState(null);

  const toastOptions = {
    position: "top-center",
    autoClose: 3500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: isDark ? "dark" : "light",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState("");

  const [orgUsers, setOrgUsers] = useState([]);
  const [orgUsersLoading, setOrgUsersLoading] = useState(false);
  const [orgUsersError, setOrgUsersError] = useState("");
  const [selectedInvitedBy, setSelectedInvitedBy] = useState(null);

  const [addressOptions, setAddressOptions] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);

  const [biasLonLat, setBiasLonLat] = useState(null);
  const isSmallScreen = window.innerWidth < 600;

  useEffect(() => {
    const fetchOrgs = async () => {
      setOrgsLoading(true);
      setOrgsError("");
      try {
        // Assumes you have a public "Organizations" table with a "name" column.
        // Adjust the table/column name to match your schema.
        const { data, error } = await supabase
          .from("Organizations")
          .select("_id, name")
          .order("name", { ascending: true });

        if (error) throw error;
        setOrganizations(data ?? []);
      } catch (err) {
        console.error("Error fetching organizations:", err);
        setOrgsError(
          "Could not load organizations. You can still type manually.",
        );
        setOrganizations([]);
      } finally {
        setOrgsLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // ── Fetch org members when organization changes ────────────────────────────
  useEffect(() => {
    setSelectedInvitedBy(null);
    setForm((prev) => ({ ...prev, invited_by: "", invited_by_id: "" }));
    setOrgUsers([]);
    setOrgUsersError("");

    const org = form.organization?.trim();
    const org_id = organizations.find((o) => o.name === org)?.org_id;
    if (!org) return;

    let active = true;

    const fetchUsers = async () => {
      setOrgUsersLoading(true);
      try {
        const { data, error } = await supabase
          .from("Users")
          .select("_id, name, surname, email")
          .eq("Organization", org); // column name from your schema

        if (!active) return;
        if (error) throw error;
        setOrgUsers(data ?? []);
      } catch (err) {
        if (!active) return;
        console.error("Error fetching org users:", err);
        setOrgUsersError("Could not load members for this organization.");
        setOrgUsers([]);
      } finally {
        if (active) setOrgUsersLoading(false);
      }
    };

    fetchUsers();
    return () => {
      active = false;
    };
  }, [form.organization]);

  // ── Geolocation bias ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setBiasLonLat({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setBiasLonLat(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // ── Geoapify address autocomplete ─────────────────────────────────────────
  useEffect(() => {
    if (!GEOAPIFY_API_KEY) {
      setAddressError(
        "Geoapify API key missing. Add VITE_GEOAPIFY_API_KEY to your .env.",
      );
      return;
    }

    const query = (form.home_address || "").trim();
    if (query.length < 3) {
      setAddressOptions([]);
      setAddressError("");
      return;
    }

    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setAddressLoading(true);
        setAddressError("");

        const biasParam = biasLonLat
          ? `&bias=proximity:${biasLonLat.lon},${biasLonLat.lat}`
          : "";

        const url =
          `https://api.geoapify.com/v1/geocode/autocomplete` +
          `?text=${encodeURIComponent(query)}&limit=10&lang=en` +
          `&filter=countrycode:${GEOAPIFY_COUNTRY_CODE}` +
          biasParam +
          `&format=json&apiKey=${GEOAPIFY_API_KEY}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Address lookup failed");
        const data = await res.json();
        if (!active) return;

        const mapped = (data?.results ?? [])
          .map((r) => ({
            label: r.formatted || "",
            formatted: r.formatted || "",
            suburb: r.suburb || "",
            city: r.city || r.town || r.village || "",
            state: r.state || "",
            postcode: r.postcode || "",
            lat: r.lat,
            lon: r.lon,
          }))
          .filter((x) => x.label);

        setAddressOptions(mapped);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setAddressError(
          "Could not load address suggestions. Please type manually.",
        );
        setAddressOptions([]);
      } finally {
        if (active) setAddressLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.home_address, biasLonLat]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Name is required";
    if (!form.surname?.trim()) e.surname = "Surname is required";
    if (!form.date_of_birth) e.date_of_birth = "Date of Birth is required";
    else if (new Date(form.date_of_birth) > new Date())
      e.date_of_birth = "Date cannot be in the future";
    if (!form.home_address?.trim()) e.home_address = "Home Address is required";
    if (!form.phone_number?.trim()) e.phone_number = "Phone Number is required";
    if (!form.email?.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    if (!form.gender) e.gender = "Select a gender";
    if (!form.organization?.trim())
      e.organization = "Organization/Church is required";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (!form.confirm_password) e.confirm_password = "Confirm your password";
    else if (form.confirm_password !== form.password)
      e.confirm_password = "Passwords do not match";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name])
      setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleInvitedByChange = (event, newValue) => {
    console.log("INVITEE", newValue);
    const invitedByValue =
      newValue && typeof newValue === "object" ? (`${newValue.name} ${newValue.surname}` || "") : (newValue || "");
    const invitedById =
      newValue && typeof newValue === "object" ? (newValue._id || newValue.key || "") : "";

    setSelectedInvitedBy(typeof newValue === "object" ? newValue : null);
    setForm((prev) => ({ ...prev, invited_by: invitedByValue, invited_by_id: invitedById }));
    if (errors.invited_by) setErrors((prev) => ({ ...prev, invited_by: "" }));
  };

  const handleGenderChange = (e) => {
    const genderVal = e.target.value;
    setForm((prev) => ({ ...prev, gender: genderVal }));
    if (errors.gender) setErrors((prev) => ({ ...prev, gender: "" }));
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!validate()) return;

  //   setLoading(true);

  //   const submitData = { ...form };
  //   delete submitData.confirm_password;

  //   try {
  //     const res = await fetch(`${BACKEND_URL}/signup`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(submitData),
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       toast.error(data?.detail || "Signup failed. Please try again.", toastOptions);
  //     } else {
  //       const userData = {
  //         name: submitData.name,
  //         surname: submitData.surname,
  //         date_of_birth: submitData.date_of_birth,
  //         home_address: submitData.home_address,
  //         phone_number: submitData.phone_number,
  //         email: submitData.email,
  //         gender: submitData.gender,
  //         organization: submitData.organization,
  //       };

  //       setUserProfile(userData);
  //       if (onSignup) onSignup(submitData);

  //       try {
  //         await login(submitData.email, submitData.password);
  //         toast.success("You've been signed up!", toastOptions);
  //       } catch {
  //         toast.error("Signup successful, but automatic login failed. Please log in.", {
  //           ...toastOptions,
  //           autoClose: 5000,
  //         });
  //         navigate("/login");
  //         return;
  //       }

  //       setWelcomeName(submitData.name || submitData.email);
  //       setShowWelcome(true);

  //       setTimeout(() => {
  //         setForm(initialForm);
  //         setShowWelcome(false);
  //         setSelectedAddress(null);
  //         setSelectedInvitedBy(null);
  //         setAddressOptions([]);
  //         setOrgUsers([]);
  //         navigate("/");
  //       }, 2000);
  //     }
  //   } catch {
  //     toast.error("Network or server error occurred.", toastOptions);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getUserLabel = (user) => {
    if (typeof user === "string") return user;
    const full = [user.name, user.surname].filter(Boolean).join(" ");
    return full || user.email || user._id || "";
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      // 1. Create Supabase Auth user
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (authError) {
        toast.error(authError.message || "Signup failed.", toastOptions);
        setLoading(false);
        return;
      }

      // 2. Insert profile row into public."Users"
      const newId = uuidv4();
      const profileRow = {
        _id: newId,
        name: form.name,
        surname: form.surname,
        date_of_birth: form.date_of_birth,
        home_address: form.home_address,
        invited_by: form.invited_by || null,
        // invited_by_id is not a column in your schema; store in a note if needed
        phone_number: form.phone_number,
        email: form.email,
        gender: form.gender,
        // Never store raw passwords — Supabase Auth manages credentials.
        // The password columns in your schema are legacy; leave them null.
        password: null,
        confirm_password: null,
        Organization: form.organization,
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: dbError } = await supabase
        .from("Users")
        .insert([profileRow]);

      if (dbError) {
        // If the auth user was created but DB insert failed, surface the error
        toast.error(dbError.message || "Failed to save profile.", toastOptions);
        setLoading(false);
        return;
      }

      // 3. Auto-login
      try {
        await login(form.email, form.password);
      } catch {
        toast.error(
          "Signup successful, but auto-login failed. Please log in manually.",
          {
            ...toastOptions,
            autoClose: 5000,
          },
        );
        navigate("/login");
        return;
      }

      // 4. Update UserContext
      setUserProfile({
        name: form.name,
        surname: form.surname,
        date_of_birth: form.date_of_birth,
        home_address: form.home_address,
        phone_number: form.phone_number,
        email: form.email,
        gender: form.gender,
        organization: form.organization,
      });

      if (onSignup) onSignup(form);

      toast.success("You've been signed up!", toastOptions);

      setWelcomeName(form.name || form.email);
      setShowWelcome(true);

      setTimeout(() => {
        setForm(initialForm);
        setShowWelcome(false);
        setSelectedAddress(null);
        setSelectedInvitedBy(null);
        setAddressOptions([]);
        setOrgUsers([]);
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("Network or server error occurred.", toastOptions);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
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
      bgcolor: "transparent !important",
      "&:-webkit-autofill": {
        WebkitBoxShadow: isDark
          ? "0 0 0 100px #1a1a1a inset !important"
          : "0 0 0 100px #f8f9fa inset !important",
        WebkitTextFillColor: isDark
          ? "#ffffff !important"
          : "#000000 !important",
        transition: "background-color 5000s ease-in-out 0s",
      },
    },
    "& .MuiInputLabel-root": {
      color: isDark ? "#999999" : "#666666",
      "&.Mui-focused": { color: "#42a5f5" },
    },
    "& .MuiFormHelperText-root": { color: isDark ? "#999999" : "#666666" },
  };

  const errFieldSx = (fieldKey) => ({
    ...inputFieldSx,
    "& .MuiOutlinedInput-root": {
      ...inputFieldSx["& .MuiOutlinedInput-root"],
      "& fieldset": {
        borderColor: errors[fieldKey]
          ? "#f44336"
          : isDark
            ? "#333333"
            : "#e0e0e0",
      },
    },
    "& .MuiFormHelperText-root": {
      color: errors[fieldKey] ? "#f44336" : isDark ? "#999999" : "#666666",
    },
  });

  const dropdownSx = {
    ListboxProps: {
      sx: {
        bgcolor: isDark ? "#1a1a1a" : "#ffffff",
        "& .MuiAutocomplete-option": {
          color: isDark ? "#ffffff" : "#000000",
          "&:hover": { bgcolor: isDark ? "#2a2a2a" : "#f5f5f5" },
          "&[aria-selected='true']": {
            bgcolor: isDark ? "#333333" : "#e0e0e0",
          },
        },
      },
    },
    PaperComponent: ({ children }) => (
      <Paper
        sx={{
          bgcolor: isDark ? "#1a1a1a" : "#ffffff",
          border: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
        }}
      >
        {children}
      </Paper>
    ),
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer limit={1} containerStyle={{ zIndex: 99999 }} />
      {showWelcome && <WelcomeOverlay name={welcomeName} mode={mode} />}

      {/* Theme toggle */}
      {/* <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <IconButton
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
      </Box> */}

      <Box
        sx={{
          maxWidth: 800,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          p: 3,
          borderRadius: 4,
          boxShadow: 3,
          background: theme.palette.background.paper,
        }}
       
      >
       
        
        {/* <Box display="flex" justifyContent="center" alignItems="center" mb={1}>
          <img
            src={darkLogo}
            alt="Active Teams Logo"
            style={{
              maxHeight: isSmallScreen ? 60 : 80,
              maxWidth: "100%",
              objectFit: "contain",
              filter: isDark ? "invert(1)" : "none",
              transition: "filter 0.3s",
            }}
            onChange={(event, newValue) => {
              const formatted = typeof newValue === "string" ? newValue : newValue?.formatted || newValue?.label || "";
              setSelectedAddress(typeof newValue === "string" ? null : newValue);
              setForm((prev) => ({ ...prev, home_address: formatted }));
              if (errors.home_address) setErrors((prev) => ({ ...prev, home_address: "" }));
            }}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.label || "")}
            filterOptions={(x) => x}
            loading={addressLoading}
            {...dropdownSx}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Home Address"
                name="home_address"
                error={!!errors.home_address}
                helperText={
                  errors.home_address || addressError ||
                  (GEOAPIFY_API_KEY ? "Start typing your address..." : "Missing Geoapify API key.")
                }
                fullWidth
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {addressLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                sx={{ ...inputFieldSx, "& .MuiOutlinedInput-root": { ...inputFieldSx["& .MuiOutlinedInput-root"], "& fieldset": { borderColor: errors.home_address ? theme.palette.error.main : isDark ? "#333333" : "#e0e0e0" } } }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={`${option.lon ?? ""}-${option.lat ?? ""}-${option.label}`}>
                <Box>
                  <Typography variant="body1">{option.label}</Typography>
                  {(option.suburb || option.city || option.state || option.postcode) && (
                    <Typography variant="caption" color="text.secondary">
                      {[option.suburb, option.city, option.state, option.postcode].filter(Boolean).join(" • ")}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
          />

          <TextField
            label="Phone Number" name="phone_number" value={form.phone_number} onChange={handleChange}
            error={!!errors.phone_number} helperText={errors.phone_number} fullWidth
            sx={{ ...inputFieldSx, "& .MuiOutlinedInput-root": { ...inputFieldSx["& .MuiOutlinedInput-root"], "& fieldset": { borderColor: errors.phone_number ? theme.palette.error.main : isDark ? "#333333" : "#e0e0e0" } } }}
          />

          <FormControl fullWidth error={!!errors.gender}>
            <InputLabel sx={{ color: isDark ? "#999999" : "#666666", "&.Mui-focused": { color: "#42a5f5" } }}>Gender</InputLabel>
            <Select
              name="gender" value={form.gender} onChange={handleGenderChange} label="Gender"
              sx={{
                bgcolor: isDark ? "#1a1a1a" : "#f8f9fa", borderRadius: 3, color: isDark ? "#ffffff" : "#000000",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "#333333" : "#e0e0e0" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "#555555" : "#b0b0b0" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#42a5f5" },
              }}
              MenuProps={{
                PaperProps: { sx: { bgcolor: isDark ? "#1a1a1a" : "#ffffff", "& .MuiMenuItem-root": { color: isDark ? "#ffffff" : "#000000", "&:hover": { bgcolor: isDark ? "#2a2a2a" : "#f5f5f5" }, "&.Mui-selected": { bgcolor: isDark ? "#333333" : "#e0e0e0", "&:hover": { bgcolor: isDark ? "#3a3a3a" : "#d5d5d5" } } } } },
              }}
            >
              <MenuItem value=""><em>Select Gender</em></MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
            </Select>
            {errors.gender && <Typography variant="caption" color="error">{errors.gender}</Typography>}
          </FormControl>

          {/* <FormControl fullWidth error={!!errors.organization}>
            <Autocomplete
              freeSolo
              options={organizations}
              value={organizations.find((org) => org.name === form.organization) || null}
              inputValue={form.organization}
              onInputChange={(event, newInputValue) => {
                setForm((prev) => ({ ...prev, organization: newInputValue }));
                if (errors.organization) setErrors((prev) => ({ ...prev, organization: "" }));
              }}
              onChange={(event, newValue) => {
                const orgName = newValue?.name || newValue || "";
                setForm((prev) => ({ ...prev, organization: orgName }));
                if (errors.organization) setErrors((prev) => ({ ...prev, organization: "" }));
              }}
              getOptionLabel={(option) => (typeof option === "string" ? option : option.name || "")}
              loading={orgsLoading}
              {...dropdownSx}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Organization / Church"
                  error={!!errors.organization}
                  // helperText={errors.organization || orgsError || (orgsLoading ? "Loading organizations..." : "Select or type your organization")}
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {orgsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{ ...inputFieldSx, "& .MuiOutlinedInput-root": { ...inputFieldSx["& .MuiOutlinedInput-root"], "& fieldset": { borderColor: errors.organization ? theme.palette.error.main : isDark ? "#333333" : "#e0e0e0" } } }}
                />
              )}
            />
          </FormControl> 
          <FormControl fullWidth>
            <Autocomplete
              freeSolo
              options={orgUsers}
              value={selectedInvitedBy}
              inputValue={form.invited_by}
              disabled={!form.organization?.trim()}
              onInputChange={(event, newInputValue) => {
                setForm((prev) => ({ ...prev, invited_by: newInputValue, invited_by_id: "" }));
                setSelectedInvitedBy(null);
                if (errors.invited_by) setErrors((prev) => ({ ...prev, invited_by: "" }));
              }}
              onChange={handleInvitedByChange}
              getOptionLabel={getUserLabel}
              isOptionEqualToValue={(option, value) => option._id === value?._id || getUserLabel(option) === getUserLabel(value)}
              loading={orgUsersLoading}
              noOptionsText={!form.organization?.trim() ? "Select an organization first" : orgUsersLoading ? "Loading members…" : "No members found"}
              {...dropdownSx}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Invited By"
                  error={!!errors.invited_by}
                  helperText={errors.invited_by || orgUsersError || (!form.organization?.trim() ? "Select an organization to see its members" : orgUsersLoading ? "Loading members…" : "Please select who invited you")}
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {orgUsersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{ ...inputFieldSx, "& .MuiOutlinedInput-root": { ...inputFieldSx["& .MuiOutlinedInput-root"], "& fieldset": { borderColor: errors.invited_by ? theme.palette.error.main : isDark ? "#333333" : "#e0e0e0" } } }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option._id || getUserLabel(option)}>
                  <Box>
                    <Typography variant="body1">{getUserLabel(option)}</Typography>
                    {option.email && <Typography variant="caption" color="text.secondary">{option.email}</Typography>}
                  </Box>
                </li>
              )}
            />
          </FormControl>

          <TextField
            label="Password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange}
            error={!!errors.password} helperText={errors.password} fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" tabIndex={-1} sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ ...inputFieldSx, "& .MuiOutlinedInput-root": { ...inputFieldSx["& .MuiOutlinedInput-root"], "& fieldset": { borderColor: errors.password ? theme.palette.error.main : isDark ? "#333333" : "#e0e0e0" } } }}
          />

          <TextField
            label="Confirm Password" name="confirm_password" type={showConfirmPassword ? "text" : "password"} value={form.confirm_password} onChange={handleChange}
            error={!!errors.confirm_password} helperText={errors.confirm_password} fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" tabIndex={-1} sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ ...inputFieldSx, "& .MuiOutlinedInput-root": { ...inputFieldSx["& .MuiOutlinedInput-root"], "& fieldset": { borderColor: errors.confirm_password ? theme.palette.error.main : isDark ? "#333333" : "#e0e0e0" } } }}
          />
        </Box> */} 

        {/* {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>Please fix the highlighted errors above.</Alert>
        )} */}

        <Box
          component="form"
          onSubmit={handleSubmit}
          display="flex"
          flexDirection="column"
          gap={3}
          
        >
          <Box
            display="grid"
            gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
            gap={2.5}
           
          >
            {/* Name */}
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              sx={errFieldSx("name")}
            />

            {/* Surname */}
            <TextField
              label="Surname"
              name="surname"
              value={form.surname}
              onChange={handleChange}
              error={!!errors.surname}
              helperText={errors.surname}
              fullWidth
              sx={errFieldSx("surname")}
            />

            {/* Date of Birth */}
            <TextField
              label="Date Of Birth"
              name="date_of_birth"
              type="date"
              value={form.date_of_birth}
              onChange={handleChange}
              error={!!errors.date_of_birth}
              helperText={errors.date_of_birth}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={errFieldSx("date_of_birth")}
            />

            {/* Email */}
            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
              sx={errFieldSx("email")}
            />

            {/* Home Address — Geoapify autocomplete */}
            <Box sx={{ gridColumn: { xs: "1", sm: "1" } }}>
              <Autocomplete
                freeSolo
                options={addressOptions}
                value={selectedAddress}
                inputValue={form.home_address}
                onInputChange={(_e, v) => {
                  setForm((p) => ({ ...p, home_address: v }));
                  setSelectedAddress(null);
                  if (errors.home_address)
                    setErrors((p) => ({ ...p, home_address: "" }));
                }}
                onChange={(_e, v) => {
                  const fmt =
                    typeof v === "string" ? v : v?.formatted || v?.label || "";
                  setSelectedAddress(typeof v === "string" ? null : v);
                  setForm((p) => ({ ...p, home_address: fmt }));
                  if (errors.home_address)
                    setErrors((p) => ({ ...p, home_address: "" }));
                }}
                getOptionLabel={(o) =>
                  typeof o === "string" ? o : o.label || ""
                }
                filterOptions={(x) => x}
                loading={addressLoading}
                {...dropdownSx}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Home Address"
                    name="home_address"
                    error={!!errors.home_address}
                    helperText={
                      errors.home_address ||
                      addressError ||
                      "Start typing your address…"
                    }
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {addressLoading ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={errFieldSx("home_address")}
                  />
                )}
                renderOption={(props, option) => (
                  <li
                    {...props}
                    key={`${option.lon}-${option.lat}-${option.label}`}
                  >
                    <Box>
                      <Typography variant="body1">{option.label}</Typography>
                      {(option.suburb || option.city || option.state) && (
                        <Typography variant="caption" color="text.secondary">
                          {[
                            option.suburb,
                            option.city,
                            option.state,
                            option.postcode,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
              />
            </Box>

            {/* Phone Number */}
            <TextField
              label="Phone Number"
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              error={!!errors.phone_number}
              helperText={errors.phone_number}
              fullWidth
              sx={errFieldSx("phone_number")}
            />

            {/* Gender */}
            <FormControl fullWidth error={!!errors.gender}>
              <InputLabel
                sx={{
                  color: isDark ? "#999" : "#666",
                  "&.Mui-focused": { color: "#42a5f5" },
                }}
              >
                Gender
              </InputLabel>
              <Select
                name="gender"
                value={form.gender}
                label="Gender"
                onChange={(e) => {
                  setForm((p) => ({ ...p, gender: e.target.value }));
                  if (errors.gender) setErrors((p) => ({ ...p, gender: "" }));
                }}
                sx={{
                  bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
                  borderRadius: 3,
                  color: isDark ? "#fff" : "#000",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: isDark ? "#333" : "#e0e0e0",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#42a5f5",
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: isDark ? "#1a1a1a" : "#fff",
                      "& .MuiMenuItem-root": {
                        color: isDark ? "#fff" : "#000",
                        "&:hover": { bgcolor: isDark ? "#2a2a2a" : "#f5f5f5" },
                      },
                    },
                  },
                }}
              >
                <MenuItem value="">
                  <em>Select Gender</em>
                </MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </Select>
              {errors.gender && (
                <Typography variant="caption" color="error">
                  {errors.gender}
                </Typography>
              )}
            </FormControl>

            {/* Organization */}
            <FormControl fullWidth error={!!errors.organization}>
              <Autocomplete
                freeSolo
                options={organizations}
                value={
                  organizations.find((o) => o.name === form.organization) ||
                  null
                }
                inputValue={form.organization}
                onInputChange={(_e, v) => {
                  setForm((p) => ({ ...p, organization: v }));
                  if (errors.organization)
                    setErrors((p) => ({ ...p, organization: "" }));
                }}
                onChange={(_e, v) => {
                  setForm((p) => ({ ...p, organization: v?.name || v || "" }));
                  if (errors.organization)
                    setErrors((p) => ({ ...p, organization: "" }));
                }}
                getOptionLabel={(o) =>
                  typeof o === "string" ? o : o.name || ""
                }
                loading={orgsLoading}
                {...dropdownSx}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Organization / Church"
                    error={!!errors.organization}
                    helperText={
                      errors.organization ||
                      orgsError ||
                      (orgsLoading
                        ? "Loading…"
                        : "Select or type your organization")
                    }
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {orgsLoading ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={errFieldSx("organization")}
                  />
                )}
              />
            </FormControl>

            {/* Invited By */}
            <FormControl fullWidth>
              <Autocomplete
                freeSolo
                options={orgUsers}
                value={selectedInvitedBy}
                inputValue={form.invited_by}
                disabled={!form.organization?.trim()}
                onInputChange={(_e, v) => {
                  setForm((p) => ({ ...p, invited_by: v, invited_by_id: "" }));
                  setSelectedInvitedBy(null);
                }}
                onChange={handleInvitedByChange}
                getOptionLabel={getUserLabel}
                isOptionEqualToValue={(o, v) =>
                  o._id === v?._id || getUserLabel(o) === getUserLabel(v)
                }
                loading={orgUsersLoading}
                noOptionsText={
                  !form.organization?.trim()
                    ? "Select an organization first"
                    : orgUsersLoading
                      ? "Loading…"
                      : "No members found"
                }
                {...dropdownSx}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Invited By"
                    helperText={
                      orgUsersError ||
                      (!form.organization?.trim()
                        ? "Select an organization to see its members"
                        : "Please select who invited you")
                    }
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {orgUsersLoading ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={inputFieldSx}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option._id || getUserLabel(option)}>
                    <Box>
                      <Typography variant="body1">
                        {getUserLabel(option)}
                      </Typography>
                      {option.email && (
                        <Typography variant="caption" color="text.secondary">
                          {option.email}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
              />
            </FormControl>

            {/* Password */}
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((p) => !p)}
                      edge="end"
                      tabIndex={-1}
                      sx={{ color: isDark ? "#ccc" : "#666" }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={errFieldSx("password")}
            />

            {/* Confirm Password */}
            <TextField
              label="Confirm Password"
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirm_password}
              onChange={handleChange}
              error={!!errors.confirm_password}
              helperText={errors.confirm_password}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      edge="end"
                      tabIndex={-1}
                      sx={{ color: isDark ? "#ccc" : "#666" }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={errFieldSx("confirm_password")}
            />
          </Box>

          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Please fix the highlighted errors above.
            </Alert>
          )}

          <Box textAlign="center">
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                backgroundColor: "#000",
                color: "#fff",
                borderRadius: 8,
                px: 4,
                py: 1.5,
                fontWeight: "bold",
                "&:hover": { backgroundColor: "#222" },
                "&:disabled": { backgroundColor: "#666" },
              }}
            >
              {loading ? "Signing Up…" : "Sign Up"}
            </Button>
          </Box>

          <Box textAlign="center" mt={1}>
            <Typography>
              Already have an account?{" "}
              <Typography
                component="span"
                sx={{
                  color: "#42a5f5",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
                onClick={() => navigate("/login")}
              >
                Log In
              </Typography>
            </Typography>
          </Box>

        </Box>
      </Box>
    </>
  );
};

export default Signup;
