import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
  useRef,
} from "react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Button,
  useTheme,
  Snackbar,
  Alert,
  Slider,
  IconButton,
  InputAdornment,
  Container,
  Fade,
  Paper,
  Avatar,
  Card,
  CardContent,
  Skeleton,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import Cropper from "react-easy-crop";
import getCroppedImg from "../components/cropImageHelper";
import { UserContext } from "../contexts/UserContext.jsx";
import { AuthContext } from "../contexts/AuthContext.jsx";
import {
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  CameraAlt,
  ExpandMore,
  Security,
} from "@mui/icons-material";

// ─── Constants ────────────────────────────────────────────────────────────────
const carouselTexts = [
  { text: "We are THE ACTIVE CHURCH", color: "#1976d2" },
  { text: "A church raising a NEW GENERATION", color: "#7b1fa2" },
  { text: "A generation that will CHANGE THIS NATION", color: "#d32f2f" },
  { text: "Amen.", color: "#2e7d32" },
];

const DEFAULT_AVATARS = {
  female: "https://cdn-icons-png.flaticon.com/512/6997/6997662.png",
  male:   "https://cdn-icons-png.flaticon.com/512/6997/6997675.png",
  neutral:"https://cdn-icons-png.flaticon.com/512/147/147144.png",
};

const getDefaultAvatar = (gender) => {
  if (!gender) return DEFAULT_AVATARS.neutral;
  const g = String(gender).trim().toLowerCase();
  if (g === "female") return DEFAULT_AVATARS.female;
  if (g === "male")   return DEFAULT_AVATARS.male;
  return DEFAULT_AVATARS.neutral;
};

const normalizeGender = (g) => {
  if (!g) return "";
  const map = { male: "Male", female: "Female", Male: "Male", Female: "Female" };
  return map[g] || g;
};

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── API helpers ──────────────────────────────────────────────────────────────

/** Get the current backend session token */
async function getToken() {
  return localStorage.getItem("access_token");
}

/** GET /profile/{userId} */
async function fetchProfileFromAPI(userId) {
  const token = await getToken();
  const res = await fetch(`${API}/profile/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Profile fetch failed: ${res.status}`);
  }
  return res.json();
}

/** GET /profile/me/details — resolves from token when no userId is known yet */
async function fetchMyProfile() {
  const token = await getToken();
  const res = await fetch(`${API}/profile/me/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Profile fetch failed: ${res.status}`);
  }
  return res.json();
}

/** PUT /profile/{userId} */
async function updateProfileViaAPI(userId, fields) {
  const token = await getToken();
  const res = await fetch(`${API}/profile/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Profile update failed: ${res.status}`);
  }
  return res.json();
}

/** POST /users/{userId}/avatar  (multipart) */
async function uploadAvatarViaAPI(userId, blob, contentType) {
  const token = await getToken();
  const form = new FormData();
  form.append("avatar", blob, `avatar.${contentType.split("/")[1] || "png"}`);
  const res = await fetch(`${API}/users/${userId}/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Avatar upload failed: ${res.status}`);
  }
  return res.json(); // { avatarUrl }
}

/** Password changes require a backend endpoint that is not currently available. */
async function changePasswordViaSupabase(newPassword) {
  void newPassword;
  throw new Error("Password changes are not available through the current account service.");
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Profile() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { userProfile, setUserProfile, setProfilePic, profilePic } =
    useContext(UserContext);
  const { updateProfilePicture, user: authUser } = useContext(AuthContext);

  // ── State ──────────────────────────────────────────────────────────────────
  const [loggedInUserRole, setLoggedInUserRole] = useState(() => {
    try {
      const p = localStorage.getItem("userProfile");
      return p ? JSON.parse(p).role || "user" : "user";
    } catch {
      return "user";
    }
  });

  const fileInputRef       = useRef(null);
  const hasFetchedProfile  = useRef(false);

  const [crop, setCrop]                       = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                       = useState(1);
  const [croppingSrc, setCroppingSrc]         = useState(null);
  const [croppingOpen, setCroppingOpen]       = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedBlob, setCroppedBlob]         = useState(null);

  const [loadingProfile, setLoadingProfile]   = useState(true);
  const [carouselIndex, setCarouselIndex]     = useState(0);
  const [advancedOpen, setAdvancedOpen]       = useState(false);

  const [leaders, setLeaders] = useState({
    leaderAt1: "", leaderAt12: "", leaderAt144: "",
  });
  const [organization, setOrganization] = useState("");

  const [form, setForm] = useState({
    name: "", surname: "", dob: "", email: "",
    address: "", phone: "", invitedBy: "", gender: "",
    organization: "", currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [originalForm, setOriginalForm] = useState({ ...form });
  const [showPassword, setShowPassword] = useState({
    current: false, new: false, confirm: false,
  });
  const [errors, setErrors]   = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false, message: "", severity: "success",
  });

  // ── Carousel ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(
      () => setCarouselIndex((p) => (p + 1) % carouselTexts.length),
      4000,
    );
    return () => clearInterval(t);
  }, []);

  const currentCarouselItem = carouselTexts[carouselIndex];

  // ── Role helpers ───────────────────────────────────────────────────────────
  const checkIfCanEdit = useCallback((role) => {
    if (!role) return false;
    const parts = String(role).toLowerCase().split(/[\/,\s|]+/).map((r) => r.trim());
    return parts.some((r) => r === "admin" || r === "leader");
  }, []);

  const canEditProfile = checkIfCanEdit(loggedInUserRole);
  const isRegularUser  = !canEditProfile;

  const getUserRole = useCallback(() => {
    if (!loggedInUserRole) return "User";
    const parts = String(loggedInUserRole)
      .trim().split(/[\/,\s|]+/).map((r) => r.trim()).filter(Boolean)
      .map((r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase());
    return [...new Set(parts)].join(" / ") || "User";
  }, [loggedInUserRole]);

  // ── Map API response → form ────────────────────────────────────────────────
  const updateFormWithProfile = useCallback((profile) => {
    const orgValue = profile?.Organization || profile?.organization || "";
    setOrganization(orgValue);

    const formData = {
      name:            profile?.name        || "",
      surname:         profile?.surname     || "",
      dob:             profile?.date_of_birth || "",
      email:           profile?.email       || "",
      address:         profile?.home_address || "",
      phone:           profile?.phone_number || "",
      invitedBy:       profile?.invited_by  || "",
      gender:          normalizeGender(profile?.gender || ""),
      organization:    orgValue,
      currentPassword: "",
      newPassword:     "",
      confirmPassword: "",
    };

    // Leaders — the backend now returns resolved objects in profile.leaders
    const resolvedLeaders = profile?._resolvedLeaders || {};
    const ldrs = profile?.leaders || {};

    const leaderNames = {
      leaderAt1:   "",
      leaderAt12:  "",
      leaderAt144: "",
    };

    if (ldrs.leaderAt1) {
      leaderNames.leaderAt1 =
        `${ldrs.leaderAt1.name || ""} ${ldrs.leaderAt1.surname || ""}`.trim();
    } else if (resolvedLeaders[profile?.leader12]) {
      leaderNames.leaderAt1 = resolvedLeaders[profile.leader12];
    }

    if (ldrs.leaderAt12) {
      leaderNames.leaderAt12 =
        `${ldrs.leaderAt12.name || ""} ${ldrs.leaderAt12.surname || ""}`.trim();
    } else if (resolvedLeaders[profile?.leader144]) {
      leaderNames.leaderAt12 = resolvedLeaders[profile.leader144];
    }

    if (ldrs.leaderAt144) {
      leaderNames.leaderAt144 =
        `${ldrs.leaderAt144.name || ""} ${ldrs.leaderAt144.surname || ""}`.trim();
    } else if (resolvedLeaders[profile?.leader1728]) {
      leaderNames.leaderAt144 = resolvedLeaders[profile.leader1728];
    }

    setLeaders(leaderNames);
    localStorage.setItem("leaders", JSON.stringify(leaderNames));
    setForm(formData);
    setOriginalForm(formData);
  }, []);

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasFetchedProfile.current) return;

    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);

        // Prefer the userId already stored in context / localStorage
        const storedProfile = (() => {
          try { return JSON.parse(localStorage.getItem("userProfile")); }
          catch { return null; }
        })();

        const userId =
          userProfile?._id  ||
          userProfile?.id   ||
          storedProfile?._id ||
          storedProfile?.id;

        let profileData;
        if (userId) {
          profileData = await fetchProfileFromAPI(userId);
        } else {
          // Fallback: resolve from token
          profileData = await fetchMyProfile();
        }

        if (!profileData || !isMounted) return;

        const avatarUrl =
          profileData.profile_picture || getDefaultAvatar(profileData.gender);

        const finalProfile = {
          ...profileData,
          id:            profileData._id || profileData.id,
          _id:           profileData._id || profileData.id,
          profile_picture: avatarUrl,
          avatarUrl,
          profilePicUrl: avatarUrl,
        };

        updateFormWithProfile(finalProfile);
        if (setUserProfile)  setUserProfile(finalProfile);
        if (setProfilePic)   setProfilePic(avatarUrl);
        if (finalProfile.role) {
          setLoggedInUserRole(finalProfile.role);
          localStorage.setItem("userRole", finalProfile.role);
        }
        localStorage.setItem("userProfile", JSON.stringify(finalProfile));
        hasFetchedProfile.current = true;
      } catch (err) {
        console.error("Profile loading error:", err);
        setSnackbar({ open: true, message: `Could not load profile: ${err.message}`, severity: "error" });
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [authUser, setUserProfile, setProfilePic, updateFormWithProfile, userProfile]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasChanges = React.useMemo(() => {
    const pwChange = form.newPassword || form.confirmPassword || form.currentPassword;
    const profileChange = Object.keys(form).some((k) => {
      if (["currentPassword", "newPassword", "confirmPassword"].includes(k)) return false;
      return form[k] !== originalForm[k];
    });
    return !!(pwChange || profileChange);
  }, [form, originalForm]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const n = {};
    if (!form.email.trim()) n.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) n.email = "Email is invalid";

    if (canEditProfile) {
      if (!form.name.trim())    n.name    = "Name is required";
      if (!form.surname.trim()) n.surname = "Surname is required";
      if (form.dob && new Date(form.dob) > new Date()) n.dob = "Date cannot be in the future";
    }

    if (form.phone?.trim()) {
      const cleaned = form.phone.replace(/\D/g, "");
      if (cleaned.length < 7)  n.phone = "Phone number too short";
      if (cleaned.length > 15) n.phone = "Phone number too long";
    }

    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (!form.currentPassword.trim()) n.currentPassword = "Current password is required";
      if (form.newPassword && form.newPassword.length < 8)
        n.newPassword = "Must be at least 8 characters";
      if (form.newPassword !== form.confirmPassword) n.confirmPassword = "Passwords do not match";
      if (form.newPassword && !form.confirmPassword) n.confirmPassword = "Please confirm your new password";
    }

    setErrors(n);
    return Object.keys(n).length === 0;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === "phone") {
      value = value.replace(/\D/g, "");
      if (value.length > 0 && value[0] !== "0") value = "0" + value.slice(1);
      value = value.slice(0, 10);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "organization") setOrganization(value);
  };

  const handleCancel = () => {
    setForm({ ...originalForm });
    setOrganization(originalForm.organization || "");
    setErrors({});
  };

  const togglePasswordVisibility = (f) =>
    setShowPassword((prev) => ({ ...prev, [f]: !prev[f] }));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const userId = userProfile?._id || userProfile?.id;
    if (!userId) {
      setSnackbar({ open: true, message: "User ID not found — please log in again.", severity: "error" });
      return;
    }

    const hasProfileChanges = Object.keys(form).some((k) => {
      if (["currentPassword", "newPassword", "confirmPassword"].includes(k)) return false;
      return form[k] !== originalForm[k];
    });
    const hasPasswordChange = !!(form.newPassword && form.confirmPassword && form.currentPassword);

    let profileUpdated  = false;
    let passwordUpdated = false;

    // 1. Profile update via backend
    if (hasProfileChanges) {
      try {
        const updated = await updateProfileViaAPI(userId, {
          name:          form.name,
          surname:       form.surname,
          date_of_birth: form.dob,
          email:         form.email,
          home_address:  form.address,
          phone_number:  form.phone,
          invited_by:    form.invitedBy,
          gender:        form.gender,
          organization:  form.organization,
          Organization:  form.organization,
        });

        const merged = { ...userProfile, ...updated };
        if (setUserProfile) setUserProfile(merged);
        localStorage.setItem("userProfile", JSON.stringify(merged));
        profileUpdated = true;
      } catch (err) {
        setSnackbar({ open: true, message: `Profile update failed: ${err.message}`, severity: "error" });
        return;
      }
    }

    // 2. Password via Supabase Auth
    if (hasPasswordChange) {
      try {
        await changePasswordViaSupabase(form.newPassword);
        passwordUpdated = true;
        setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
      } catch (err) {
        setSnackbar({ open: true, message: `Password change failed: ${err.message}`, severity: "error" });
        return;
      }
    }

    setOriginalForm({ ...form, currentPassword: "", newPassword: "", confirmPassword: "" });

    const msg =
      profileUpdated && passwordUpdated ? "Profile and password updated!" :
      profileUpdated  ? "Profile updated successfully!" :
      passwordUpdated ? "Password updated successfully!" : "";

    if (msg) setSnackbar({ open: true, message: msg, severity: "success" });
  };

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const onFileChange = (e) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setCroppingSrc(reader.result);
        setCroppingOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((_area, pixels) => setCroppedAreaPixels(pixels), []);

  const onCropSave = async () => {
    try {
      const croppedDataUrl = await getCroppedImg(croppingSrc, croppedAreaPixels);
      const userId = userProfile?._id || userProfile?.id;

      if (!userId) {
        if (setProfilePic) setProfilePic(croppedDataUrl);
        localStorage.setItem("profilePic", croppedDataUrl);
        setCroppingOpen(false);
        setSnackbar({ open: true, message: "Saved locally (no user ID found)", severity: "warning" });
        return;
      }

      // Convert data-url → blob for multipart upload
      const fetchRes  = await fetch(croppedDataUrl);
      const blob      = await fetchRes.blob();

      try {
        const { avatarUrl } = await uploadAvatarViaAPI(userId, blob, blob.type || "image/png");

        if (setProfilePic) setProfilePic(avatarUrl);
        if (updateProfilePicture) updateProfilePicture(avatarUrl);

        const merged = { ...userProfile, profile_picture: avatarUrl, avatarUrl, profilePicUrl: avatarUrl };
        if (setUserProfile) setUserProfile(merged);
        localStorage.setItem("userProfile", JSON.stringify(merged));

        setSnackbar({ open: true, message: "Profile picture updated!", severity: "success" });
      } catch (uploadErr) {
        console.error("Avatar upload failed:", uploadErr);
        // Graceful local fallback
        if (setProfilePic) setProfilePic(croppedDataUrl);
        localStorage.setItem("profilePic", croppedDataUrl);
        setSnackbar({ open: true, message: "Saved locally (upload failed — check Storage bucket)", severity: "warning" });
      }

      setCroppingOpen(false);
    } catch (e) {
      console.error("Crop error:", e);
      setSnackbar({ open: true, message: "Could not process image", severity: "error" });
    }
  };

  // ── Misc ───────────────────────────────────────────────────────────────────
  const getInitials = () =>
    (form.name || userProfile?.name || "").charAt(0).toUpperCase();

  // ── Styles ─────────────────────────────────────────────────────────────────
  const commonFieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
      height: "56px",
      "&.Mui-focused": { bgcolor: isDark ? "#1a1a1a" : "#f8f9fa" },
      "& fieldset": { borderColor: isDark ? "#333333" : "#e0e0e0" },
      "&:hover fieldset": { borderColor: currentCarouselItem.color },
      "&.Mui-focused fieldset": { borderColor: currentCarouselItem.color },
    },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: `0 0 0 1000px ${isDark ? "#1a1a1a" : "#f8f9fa"} inset`,
      WebkitTextFillColor: isDark ? "#ffffff" : "#000000",
    },
    "& .MuiInputBase-input": {
      color: isDark ? "#ffffff" : "#000000",
      padding: "16px 14px",
      height: "24px",
      fontSize: "0.875rem",
      background: "transparent !important",
    },
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#0a0a0a" : "#f8f9fa", pb: 4 }}>
        <Box
          sx={{
            minHeight: "30vh",
            background: isDark
              ? `linear-gradient(135deg, ${currentCarouselItem.color}15 0%, ${currentCarouselItem.color}25 100%)`
              : `linear-gradient(135deg, ${currentCarouselItem.color}10 0%, ${currentCarouselItem.color}20 100%)`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pt: 6, pb: 12,
          }}
        >
          <Skeleton variant="text" width="60%" height={60}
            sx={{ bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", borderRadius: 2 }} />
        </Box>
        <Box sx={{ display: "flex", justifyContent: "center", mt: -10, mb: 5 }}>
          <Skeleton variant="circular" width={150} height={150}
            sx={{ bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
        </Box>
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}>
          <Card sx={{ bgcolor: isDark ? "#111111" : "#ffffff", borderRadius: 3,
            border: `1px solid ${isDark ? "#222222" : "#e0e0e0"}` }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Grid container spacing={3}>
                {[...Array(9)].map((_, i) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={i}>
                    <Skeleton variant="text" width="40%" height={20}
                      sx={{ mb: 1, bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }} />
                    <Skeleton variant="rectangular" height={56}
                      sx={{ bgcolor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", borderRadius: 1 }} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#0a0a0a" : "#f8f9fa", pb: 4 }}>
      {/* Hero banner */}
      <Box
        sx={{
          position: "relative", minHeight: "30vh",
          background: isDark
            ? `linear-gradient(135deg, ${currentCarouselItem.color}15 0%, ${currentCarouselItem.color}25 100%)`
            : `linear-gradient(135deg, ${currentCarouselItem.color}10 0%, ${currentCarouselItem.color}20 100%)`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          transition: "background 1s ease-in-out", overflow: "hidden", pt: 6, pb: 12,
        }}
      >
        <Box sx={{ position: "relative", zIndex: 2, textAlign: "center", px: 2 }}>
          <Fade in key={carouselIndex} timeout={1000}>
            <Typography variant="h3" sx={{
              fontWeight: 700, fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
              color: currentCarouselItem.color, lineHeight: 1.2, maxWidth: "800px",
              textShadow: isDark ? "0 2px 20px rgba(255,255,255,0.1)" : "0 2px 20px rgba(0,0,0,0.1)",
            }}>
              {currentCarouselItem.text}
            </Typography>
          </Fade>
        </Box>
      </Box>

      {/* Avatar */}
      <Box sx={{ position: "relative", zIndex: 10, display: "flex",
        justifyContent: "center", mt: -10, mb: 5 }}>
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <Box sx={{ position: "relative", display: "inline-block" }}>
            <Avatar
              sx={{
                width: 150, height: 150,
                border: `6px solid ${isDark ? "#0a0a0a" : "#ffffff"}`,
                boxShadow: `0 12px 40px ${currentCarouselItem.color}60`,
                bgcolor: isDark ? "#1a1a1a" : "#ffffff",
                color: currentCarouselItem.color,
                fontSize: "2.5rem", fontWeight: 700, cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": { transform: "scale(1.05)", boxShadow: `0 16px 60px ${currentCarouselItem.color}80` },
              }}
              src={profilePic}
              onClick={() => fileInputRef.current?.click()}
            >
              {!profilePic && getInitials()}
            </Avatar>
            <IconButton
              sx={{
                position: "absolute", bottom: 4, right: 4,
                bgcolor: currentCarouselItem.color, color: "white",
                width: 36, height: 36,
                border: `2px solid ${isDark ? "#0a0a0a" : "#ffffff"}`,
                "&:hover": { bgcolor: currentCarouselItem.color, transform: "scale(1.1)" },
                transition: "all 0.2s ease", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
              size="small"
              onClick={() => fileInputRef.current?.click()}
            >
              <CameraAlt sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <input ref={fileInputRef} hidden accept="image/*" type="file" onChange={onFileChange} />

          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" sx={{
              fontWeight: 700, color: isDark ? "#ffffff" : "#000000", mb: 1,
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
            }}>
              {form.name} {form.surname}
            </Typography>
            <Typography variant="body2" sx={{
              display: "inline-block", px: 2, py: 0.5, borderRadius: 2,
              bgcolor: canEditProfile ? `${currentCarouselItem.color}20` : isDark ? "#333333" : "#e0e0e0",
              color: canEditProfile ? currentCarouselItem.color : isDark ? "#999999" : "#666666",
              fontWeight: 600, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 1,
            }}>
              {getUserRole()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Form card */}
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, position: "relative", zIndex: 2 }}>
        <Card sx={{
          bgcolor: isDark ? "#111111" : "#ffffff", borderRadius: 3,
          boxShadow: isDark ? "0 8px 32px rgba(255,255,255,0.02)" : "0 8px 32px rgba(0,0,0,0.08)",
          border: `1px solid ${isDark ? "#222222" : "#e0e0e0"}`,
        }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, pt: 4 }}>
            {isRegularUser && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Your profile is managed by church administrators. You can only change your email, phone and password.
              </Alert>
            )}
            {canEditProfile && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                You have {getUserRole()} privileges and can edit all profile fields.
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Name */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Name
                  </Typography>
                  <TextField value={form.name} onChange={handleChange("name")} fullWidth
                    disabled={!canEditProfile} error={!!errors.name} helperText={errors.name} sx={commonFieldSx} />
                </Grid>

                {/* Surname */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Surname
                  </Typography>
                  <TextField value={form.surname} onChange={handleChange("surname")} fullWidth
                    disabled={!canEditProfile} error={!!errors.surname} helperText={errors.surname} sx={commonFieldSx} />
                </Grid>

                {/* Date of Birth */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Date Of Birth
                  </Typography>
                  <TextField value={form.dob} onChange={handleChange("dob")} fullWidth type="date"
                    disabled={!canEditProfile} error={!!errors.dob} helperText={errors.dob}
                    slotProps={{ inputLabel: { shrink: true } }} sx={commonFieldSx} />
                </Grid>

                {/* Gender */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Gender
                  </Typography>
                  <TextField select value={form.gender} onChange={handleChange("gender")} fullWidth
                    disabled={!canEditProfile} sx={commonFieldSx}>
                    {[
                      { value: "", label: "Select Gender" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                    ].map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Email */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Email Address
                  </Typography>
                  <TextField value={form.email} onChange={handleChange("email")} fullWidth
                    error={!!errors.email} helperText={errors.email} sx={commonFieldSx} />
                </Grid>

                {/* Home Address */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Home Address
                  </Typography>
                  <TextField value={form.address} onChange={handleChange("address")} fullWidth
                    disabled={!canEditProfile} sx={commonFieldSx} />
                </Grid>

                {/* Phone */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Phone Number
                  </Typography>
                  <TextField value={form.phone} onChange={handleChange("phone")} fullWidth
                    error={!!errors.phone} helperText={errors.phone}
                    slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
                    sx={commonFieldSx} />
                </Grid>

                {/* Invited By */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Invited By
                  </Typography>
                  <TextField value={form.invitedBy} onChange={handleChange("invitedBy")} fullWidth
                    disabled={!canEditProfile} sx={commonFieldSx} />
                </Grid>

                {/* Organization */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Organization / Church
                  </Typography>
                  <TextField value={organization || form.organization} onChange={handleChange("organization")}
                    fullWidth disabled={!canEditProfile} placeholder="Your church or organization" sx={commonFieldSx} />
                </Grid>

                {/* Leader@1 */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Leader@1
                  </Typography>
                  <TextField value={leaders.leaderAt1} fullWidth disabled sx={commonFieldSx} />
                </Grid>

                {/* Leader@12 */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Leader@12
                  </Typography>
                  <TextField value={leaders.leaderAt12} fullWidth disabled sx={commonFieldSx} />
                </Grid>

                {/* Leader@144 */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                    Leader@144
                  </Typography>
                  <TextField value={leaders.leaderAt144} fullWidth disabled sx={commonFieldSx} />
                </Grid>
              </Grid>

              {/* Advanced — change password */}
              <Box sx={{ mt: 4 }}>
                <Accordion expanded={advancedOpen} onChange={() => setAdvancedOpen(!advancedOpen)}
                  sx={{
                    bgcolor: isDark ? "#1a1a1a" : "#f8f9fa", boxShadow: "none",
                    border: `1px solid ${isDark ? "#333333" : "#e0e0e0"}`,
                    borderRadius: "12px !important", "&:before": { display: "none" },
                  }}>
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ color: currentCarouselItem.color }} />}
                    sx={{ borderRadius: "12px", "& .MuiAccordionSummary-content": { alignItems: "center", gap: 1 } }}>
                    <Security sx={{ color: currentCarouselItem.color }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: isDark ? "#ffffff" : "#000000" }}>
                      Advanced Settings
                    </Typography>
                    <Typography variant="caption" sx={{ color: isDark ? "#999999" : "#666666", ml: 1 }}>
                      (Change Password)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                          Current Password
                        </Typography>
                        <TextField value={form.currentPassword} onChange={handleChange("currentPassword")}
                          type={showPassword.current ? "text" : "password"} fullWidth
                          error={!!errors.currentPassword} helperText={errors.currentPassword}
                          autoComplete="current-password"
                          slotProps={{ input: { endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => togglePasswordVisibility("current")} edge="end"
                                sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                                {showPassword.current ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ) } }}
                          sx={commonFieldSx} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                          New Password
                        </Typography>
                        <TextField value={form.newPassword} onChange={handleChange("newPassword")}
                          type={showPassword.new ? "text" : "password"} fullWidth
                          error={!!errors.newPassword} helperText={errors.newPassword}
                          autoComplete="new-password"
                          slotProps={{ input: { endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => togglePasswordVisibility("new")} edge="end"
                                sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                                {showPassword.new ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ) } }}
                          sx={commonFieldSx} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>
                          Confirm New Password
                        </Typography>
                        <TextField value={form.confirmPassword} onChange={handleChange("confirmPassword")}
                          type={showPassword.confirm ? "text" : "password"} fullWidth
                          error={!!errors.confirmPassword} helperText={errors.confirmPassword}
                          autoComplete="new-password"
                          slotProps={{ input: { endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => togglePasswordVisibility("confirm")} edge="end"
                                sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                                {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ) } }}
                          sx={commonFieldSx} />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Box>

              {/* Action buttons */}
              <Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                <Button type="submit" variant="contained" startIcon={<Save />} disabled={!hasChanges}
                  sx={{
                    bgcolor: currentCarouselItem.color,
                    "&:hover": { bgcolor: currentCarouselItem.color, opacity: 0.9 },
                    "&:disabled": { bgcolor: isDark ? "#333333" : "#cccccc", color: isDark ? "#666666" : "#999999" },
                    borderRadius: 2, px: 4, py: 1.5, fontWeight: 600, textTransform: "none", fontSize: "1rem",
                  }}>
                  {canEditProfile ? "Save Changes" : "Update Profile"}
                </Button>
                {hasChanges && (
                  <Button variant="outlined" onClick={handleCancel} startIcon={<Cancel />}
                    sx={{ borderRadius: 2, px: 4, py: 1.5, fontWeight: 600, textTransform: "none", fontSize: "1rem" }}>
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {/* Cropper modal */}
      {croppingOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, p: 2 }}
          onClick={() => setCroppingOpen(false)}
        >
          <Paper
            sx={{ position: "relative", width: "90vw", maxWidth: 500,
              bgcolor: isDark ? "#111111" : "#ffffff", borderRadius: 3, p: 3,
              border: `1px solid ${isDark ? "#333333" : "#e0e0e0"}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ mb: 2, textAlign: "center",
              color: isDark ? "#ffffff" : "#000000", fontWeight: 600 }}>
              Crop Your Profile Picture
            </Typography>
            <Box sx={{ position: "relative", width: "100%", height: 300 }}>
              <Cropper image={croppingSrc} crop={crop} zoom={zoom} aspect={1}
                onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography gutterBottom sx={{ color: isDark ? "#cccccc" : "#666666", fontWeight: 600, mb: 1 }}>
                Zoom
              </Typography>
              <Slider value={zoom} min={1} max={3} step={0.1} onChange={(_, v) => setZoom(v)}
                sx={{
                  color: currentCarouselItem.color,
                  "& .MuiSlider-thumb": { bgcolor: currentCarouselItem.color },
                  "& .MuiSlider-rail": { bgcolor: isDark ? "#333333" : "#cccccc" },
                }} />
            </Box>
            <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
              <Button variant="outlined" onClick={() => setCroppingOpen(false)}
                sx={{ borderColor: isDark ? "#666" : "#ccc", color: isDark ? "#ccc" : "#666",
                  borderRadius: 2, px: 3, py: 1, fontWeight: 600, textTransform: "none" }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={onCropSave}
                sx={{ bgcolor: currentCarouselItem.color,
                  "&:hover": { bgcolor: currentCarouselItem.color, opacity: 0.9 },
                  borderRadius: 2, px: 3, py: 1, fontWeight: 600, textTransform: "none" }}>
                Save Picture
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity} sx={{ borderRadius: 2, fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1) rotate(0deg); opacity: 0.3; }
          100% { transform: scale(1.05) rotate(2deg); opacity: 0.1; }
        }
      `}</style>
    </Box>
  );
}