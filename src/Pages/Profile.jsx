import React, { useState, useCallback, useEffect, useContext, useRef, useMemo } from "react";
import {
  Box, Typography, TextField, Grid, Button, useTheme, Snackbar, Alert, Slider,
  IconButton, InputAdornment, Fade, Paper, Avatar, MenuItem, Chip, Collapse,
} from "@mui/material";
import Cropper from "react-easy-crop";
import getCroppedImg from "../components/cropImageHelper";
import { UserContext } from "../contexts/UserContext.jsx";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { CameraAlt, ExpandMore } from "@mui/icons-material";

/* Add to index.html for the new look (falls back to system fonts if skipped):
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Figtree:wght@400;500;600&display=swap" rel="stylesheet"> */
const DISPLAY = "'Bricolage Grotesque', 'Figtree', system-ui, sans-serif";
const BODY = "'Figtree', system-ui, sans-serif";

const carouselTexts = [
  { text: "We are THE ACTIVE CHURCH", color: "#1976d2" },
  { text: "A church raising a NEW GENERATION", color: "#7b1fa2" },
  { text: "A generation that will CHANGE THIS NATION", color: "#d32f2f" },
  { text: "Amen.", color: "#2e7d32" },
];

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const getToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("accessToken");

function getUserId() {
  const token = getToken();
  if (!token) throw new Error("No authentication token found");
  let userId = null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    userId = payload.user_id || payload.sub || payload.id;
    if (userId) localStorage.setItem("userId", userId);
  } catch (e) {
    console.error("Failed to decode token:", e);
  }
  userId = userId || localStorage.getItem("userId");
  if (!userId) throw new Error("User ID not found");
  return userId;
}

// One request helper for all three API calls (uses authFetch when available, plain fetch otherwise)
async function apiRequest(path, { method, body, isForm }, authFetch) {
  const headers = isForm ? {} : { "Content-Type": "application/json" };
  const init = { method, body: isForm ? body : JSON.stringify(body), headers };
  let response;
  if (authFetch) {
    response = await authFetch(`${BACKEND_URL}${path}`, init);
  } else {
    const token = getToken();
    if (!token) throw new Error("Authentication required");
    response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers: { ...headers, Authorization: `Bearer ${token}` } });
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTP ${response.status}`);
  }
  return response.json();
}

const updateUserProfile = (data, authFetch) =>
  apiRequest(`/profile/${getUserId()}`, { method: "PUT", body: data }, authFetch);

const updatePassword = (currentPassword, newPassword, authFetch) =>
  apiRequest(`/users/${getUserId()}/password`, { method: "PUT", body: { currentPassword, newPassword } }, authFetch);

async function uploadAvatarFromDataUrl(dataUrl, authFetch) {
  const userId = getUserId();
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("avatar", blob, "avatar.png");
  return apiRequest(`/users/${userId}/avatar`, { method: "POST", body: form, isForm: true }, authFetch);
}

const emptyForm = {
  name: "", surname: "", dob: "", email: "", address: "", phone: "", invitedBy: "",
  gender: "", organization: "", currentPassword: "", newPassword: "", confirmPassword: "",
};
const PASSWORD_KEYS = ["currentPassword", "newPassword", "confirmPassword"];

const normalizeGender = (g) => (!g ? "" : { male: "Male", female: "Female", Male: "Male", Female: "Female" }[g] || g);

const getLeaderName = (leader) => {
  if (typeof leader === "string") return leader.trim();
  if (!leader || typeof leader !== "object") return "";
  const fullName = leader.fullName || leader.full_name;
  if (fullName) return String(fullName).trim();
  return [leader.name, leader.surname]
    .filter(Boolean)
    .join(" ")
    .trim();
};

const getLeaderEntries = (leaders) => {
  const entries = new Map();
  if (Array.isArray(leaders)) {
    leaders.forEach((leader) => {
      const level = Number(leader?.level);
      if (Number.isInteger(level) && level > 0) entries.set(level, getLeaderName(leader));
    });
  } else if (leaders && typeof leaders === "object") {
    Object.entries(leaders).forEach(([key, leader]) => {
      const match = key.match(/^leader(?:[_\s-]?at)?[_\s@-]?(\d+)$/i) || key.match(/^(\d+)$/);
      if (match) entries.set(Number(match[1]), getLeaderName(leader));
    });
  }
  return entries;
};

const getDefaultAvatar = (gender) => {
  const g = String(gender || "").trim().toLowerCase();
  if (g === "female") return "https://cdn-icons-png.flaticon.com/512/6997/6997662.png";
  if (g === "male") return "https://cdn-icons-png.flaticon.com/512/6997/6997675.png";
  return "https://cdn-icons-png.flaticon.com/512/147/147144.png";
};

export default function Profile() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { userProfile, setUserProfile, setProfilePic, profilePic } = useContext(UserContext);
  const { authFetch, updateProfilePicture } = useContext(AuthContext);

  const [loggedInUserRole, setLoggedInUserRole] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("userProfile") || "{}").role || "user";
    } catch (e) {
      return "user";
    }
  });

  const fileInputRef = useRef(null);
  const hasFetchedProfile = useRef(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppingSrc, setCroppingSrc] = useState(null);
  const [croppingOpen, setCroppingOpen] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [leaders, setLeaders] = useState({ leaderAt1: "", leaderAt12: "", leaderAt144: "" });
  const [form, setForm] = useState(emptyForm);
  const [originalForm, setOriginalForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const accent = carouselTexts[carouselIndex].color;
  const ink = isDark ? "#f1f0f8" : "#1c1b2e";
  const mute = isDark ? "#9a98b0" : "#6c6a80";
  const line = isDark ? "#2a2a38" : "#e3e1ec";
  const fieldBg = isDark ? "#1d1d29" : "#f8f7fb";
  const cardBg = isDark ? "#16161f" : "#ffffff";
  const pageBg = isDark ? "#0d0d14" : "#f3f2f7";

  const canEditProfile = useMemo(() => {
    const roles = String(loggedInUserRole || "").toLowerCase().split(/[/,\s|]+/).filter(Boolean);
    return roles.includes("admin") || roles.includes("leader");
  }, [loggedInUserRole]);

  const roleLabel = useMemo(() => {
    const roles = String(loggedInUserRole || "").trim().split(/[/,\s|]+/).filter(Boolean)
      .map((r) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase());
    return roles.length ? [...new Set(roles)].join(" / ") : "User";
  }, [loggedInUserRole]);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setCarouselIndex((p) => (p + 1) % carouselTexts.length), 4000);
    return () => clearInterval(t);
  }, []);

  const updateFormWithProfile = useCallback((profile) => {
    const orgValue = profile?.organization || profile?.Organization || "";
    const data = {
      name: profile?.name || "",
      surname: profile?.surname || "",
      dob: profile?.date_of_birth || "",
      email: profile?.email || "",
      address: profile?.home_address || "",
      phone: profile?.phone_number || "",
      invitedBy: profile?.invited_by || "",
      gender: normalizeGender(profile?.gender || ""),
      organization: orgValue,
      currentPassword: "", newPassword: "", confirmPassword: "",
    };

    const leaderEntries = getLeaderEntries(profile?.leaders);
    getLeaderEntries(profile).forEach((name, level) => {
      if (name || !leaderEntries.has(level)) leaderEntries.set(level, name);
    });
    if (!profile?.leaders && !profile?.invited_by) {
      getLeaderEntries(JSON.parse(localStorage.getItem("leaders") || "{}")).forEach((name, level) => {
        if (name || !leaderEntries.has(level)) leaderEntries.set(level, name);
      });
    }
    const nextLeaders = Object.fromEntries(
      [...leaderEntries].map(([level, name]) => [`leaderAt${level}`, name])
    );
    nextLeaders.leaderAt1 = nextLeaders.leaderAt1 || profile?.invited_by || "";
    if (profile?.leaders) nextLeaders.leaderAt12 = nextLeaders.leaderAt12 || profile.invited_by || "";
    const selfName = `${data.name} ${data.surname}`.trim();
    if (!nextLeaders.leaderAt144 || nextLeaders.leaderAt144.endsWith("(You)")) {
      nextLeaders.leaderAt144 = selfName ? `${selfName} (You)` : "You";
    }
    [1, 12, 144].forEach((level) => {
      if (!(`leaderAt${level}` in nextLeaders)) nextLeaders[`leaderAt${level}`] = "";
    });
    setLeaders(nextLeaders);
    localStorage.setItem("leaders", JSON.stringify(nextLeaders));

    setForm(data);
    setOriginalForm(data);
  }, []);

  useEffect(() => {
    if (hasFetchedProfile.current) return;
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const token = getToken();
        if (!token) return;
        let userId;
        try { userId = getUserId(); } catch (e) { return; }

        let profileData = null;
        if (authFetch) {
          try {
            const r = await authFetch(`${BACKEND_URL}/profile/${userId}`);
            if (r.ok) profileData = await r.json();
          } catch (e) { console.error("AuthFetch error:", e); }
        }
        if (!profileData) {
          try {
            const r = await fetch(`${BACKEND_URL}/profile/${userId}`, {
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            if (r.ok) profileData = await r.json();
          } catch (e) { console.error("Direct fetch error:", e); }
        }

        if (profileData && isMounted) {
          const pic = profileData.profile_picture || profileData.avatarUrl || profileData.profilePicUrl || getDefaultAvatar(profileData.gender);
          const finalProfileData = { ...profileData, profile_picture: pic, avatarUrl: pic, profilePicUrl: pic };
          updateFormWithProfile(finalProfileData);
          if (setUserProfile) setUserProfile(finalProfileData);
          if (setProfilePic) setProfilePic(pic);
          if (finalProfileData.role) {
            setLoggedInUserRole(finalProfileData.role);
            localStorage.setItem("userRole", finalProfileData.role);
          }
          hasFetchedProfile.current = true;
        }
      } catch (e) {
        console.error("Profile loading error:", e);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [authFetch, setUserProfile, setProfilePic, updateFormWithProfile]);

  const profileChanged = useMemo(
    () => Object.keys(form).some((k) => !PASSWORD_KEYS.includes(k) && form[k] !== originalForm[k]),
    [form, originalForm]
  );
  const passwordTouched = PASSWORD_KEYS.some((k) => form[k] !== "");
  const hasChanges = profileChanged || passwordTouched;

  const validate = () => {
    const n = {};
    if (canEditProfile) {
      if (!form.name.trim()) n.name = "Enter your name";
      if (!form.surname.trim()) n.surname = "Enter your surname";
    }
    if (!form.email.trim()) n.email = "Enter your email address";
    else if (!/\S+@\S+\.\S+/.test(form.email)) n.email = "Enter a valid email address";

    if (form.dob && canEditProfile && new Date(form.dob) > new Date()) n.dob = "Date of birth can't be in the future";

    if (form.phone.trim()) {
      const cleaned = form.phone.replace(/\D/g, "");
      if (!/\d/.test(form.phone)) n.phone = "Phone number should contain numbers";
      else if (cleaned.length < 7) n.phone = "Phone number looks too short";
      else if (cleaned.length > 15) n.phone = "Phone number looks too long";
    }

    if (passwordTouched) {
      if (!form.currentPassword.trim()) n.currentPassword = "Enter your current password";
      if (form.newPassword && form.newPassword.length < 8) n.newPassword = "Use at least 8 characters";
      if (form.newPassword !== form.confirmPassword) n.confirmPassword = "Passwords don't match";
      if (form.newPassword && !form.confirmPassword) n.confirmPassword = "Confirm your new password";
    }
    setErrors(n);
    if (n.currentPassword || n.newPassword || n.confirmPassword) setPasswordOpen(true);
    return Object.keys(n).length === 0;
  };

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === "phone") {
      value = value.replace(/\D/g, "");
      if (value.length > 0 && value[0] !== "0") value = "0" + value.slice(1);
      value = value.slice(0, 10);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setForm({ ...originalForm });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const wantsPassword = form.newPassword && form.confirmPassword && form.currentPassword;
    let profileUpdated = false;
    let passwordUpdated = false;

    try {
      if (profileChanged) {
        const profileData = {
          name: form.name, surname: form.surname, date_of_birth: form.dob, email: form.email,
          home_address: form.address, phone_number: form.phone, invited_by: form.invitedBy,
          gender: form.gender, organization: form.organization,
        };
        try {
          await updateUserProfile(profileData, authFetch);
        } catch (err) {
          setSnackbar({ open: true, message: `Profile update failed: ${err.message}`, severity: "error" });
          return;
        }
        const updatedProfile = { ...userProfile, ...profileData };
        if (setUserProfile) setUserProfile(updatedProfile);
        localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
        profileUpdated = true;
      }

      if (wantsPassword) {
        try {
          await updatePassword(form.currentPassword, form.newPassword, authFetch);
          passwordUpdated = true;
        } catch (err) {
          setSnackbar({ open: true, message: `Password change failed: ${err.message}`, severity: "error" });
          return;
        }
      }

      const cleared = { ...form, currentPassword: "", newPassword: "", confirmPassword: "" };
      setForm(cleared);
      setOriginalForm(cleared);

      const message =
        profileUpdated && passwordUpdated ? "Profile and password updated"
        : profileUpdated ? "Profile updated"
        : passwordUpdated ? "Password updated" : "";
      if (message) setSnackbar({ open: true, message, severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: `Couldn't save: ${err.message}`, severity: "error" });
    }
  };

  const onFileChange = (e) => {
    if (e.target.files?.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setCroppingSrc(reader.result);
        setCroppingOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = "";
    }
  };

  const onCropComplete = useCallback((_a, pixels) => setCroppedAreaPixels(pixels), []);

  const onCropSave = async () => {
    try {
      const croppedImage = await getCroppedImg(croppingSrc, croppedAreaPixels);
      try {
        const res = await uploadAvatarFromDataUrl(croppedImage, authFetch);
        const url = res?.avatarUrl || res?.profile_picture || res?.profilePicUrl;
        if (url) {
          if (setProfilePic) setProfilePic(url);
          const updatedProfile = { ...userProfile, profile_picture: url, avatarUrl: url, profilePicUrl: url };
          if (setUserProfile) setUserProfile(updatedProfile);
          if (updateProfilePicture) updateProfilePicture(url);
          localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
          setSnackbar({ open: true, message: "Profile picture updated", severity: "success" });
        } else {
          if (setProfilePic) setProfilePic(croppedImage);
          localStorage.setItem("profilePic", croppedImage);
          setSnackbar({ open: true, message: "Profile picture saved on this device only", severity: "info" });
        }
      } catch (uploadError) {
        console.error("Avatar upload failed:", uploadError);
        if (setProfilePic) setProfilePic(croppedImage);
        if (updateProfilePicture) updateProfilePicture(croppedImage);
        localStorage.setItem("profilePic", croppedImage);
        setSnackbar({ open: true, message: "Upload failed. Picture saved on this device only", severity: "warning" });
      }
      setCroppingOpen(false);
    } catch (err) {
      console.error("Crop error:", err);
      setSnackbar({ open: true, message: "Couldn't process that image", severity: "error" });
    }
  };

  /* ---------- styling helpers ---------- */
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: fieldBg, borderRadius: "12px", fontFamily: BODY, fontSize: "0.95rem",
      "& fieldset": { borderColor: line, borderWidth: 1.5 },
      "&:hover fieldset": { borderColor: accent },
      "&.Mui-focused fieldset": { borderColor: accent, borderWidth: 1.5 },
      "&.Mui-disabled": { bgcolor: "transparent", "& fieldset": { borderStyle: "dashed" } },
    },
    "& .MuiInputBase-input": { color: ink, py: "13px", "&.Mui-disabled": { WebkitTextFillColor: mute } },
    "& input:-webkit-autofill": {
      WebkitBoxShadow: `0 0 0 1000px ${fieldBg} inset`, WebkitTextFillColor: ink,
    },
    "& .MuiFormHelperText-root": { ml: 0.5, fontFamily: BODY },
  };

  const cardSx = { bgcolor: cardBg, border: `1px solid ${line}`, borderRadius: "18px", p: { xs: 2.5, sm: 3 } };
  const labelSx = { mb: 0.75, fontWeight: 600, fontSize: "0.8125rem", color: ink, fontFamily: BODY };

  // Plain render function (not a component) so inputs keep focus while typing
  const field = (label, key, { locked = false, size = { xs: 12, sm: 6 }, ...props } = {}) => (
    <Grid size={size} key={key}>
      <Typography component="label" htmlFor={`f-${key}`} sx={{ ...labelSx, display: "block" }}>
        {label}
        {locked && !canEditProfile && (
          <Box component="span" sx={{ ml: 1, fontWeight: 400, color: mute }}>Managed by admins</Box>
        )}
      </Typography>
      <TextField
        id={`f-${key}`}
        value={form[key] || ""}
        onChange={handleChange(key)}
        fullWidth
        disabled={locked && !canEditProfile}
        error={!!errors[key]}
        helperText={errors[key]}
        sx={inputSx}
        {...props}
      />
    </Grid>
  );

  const passwordField = (label, key, visKey, size, autoComplete) => (
    <Grid size={size} key={key}>
      <Typography component="label" htmlFor={`f-${key}`} sx={{ ...labelSx, display: "block" }}>{label}</Typography>
      <TextField
        id={`f-${key}`}
        value={form[key] || ""}
        onChange={handleChange(key)}
        type={showPassword[visKey] ? "text" : "password"}
        fullWidth
        error={!!errors[key]}
        helperText={errors[key]}
        autoComplete={autoComplete}
        sx={inputSx}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={() => setShowPassword((p) => ({ ...p, [visKey]: !p[visKey] }))}
                  sx={{ textTransform: "none", fontWeight: 600, color: mute, minWidth: 0 }}
                >
                  {showPassword[visKey] ? "Hide" : "Show"}
                </Button>
              </InputAdornment>
            ),
          },
        }}
      />
    </Grid>
  );

  const section = (title, sub, children) => (
    <Box sx={{ ...cardSx, mb: 2 }}>
      <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "1.2rem", color: ink }}>{title}</Typography>
      <Typography sx={{ color: mute, fontSize: "0.8125rem", mb: 2.5, fontFamily: BODY }}>{sub}</Typography>
      {children}
    </Box>
  );

  const leaderSteps = Object.entries(leaders)
    .map(([key, value]) => {
      const match = key.match(/^leaderAt(\d+)$/);
      return match ? { level: Number(match[1]), label: `Leader@${match[1]}`, value } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.level - b.level);

  if (loadingProfile) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: pageBg, display: "grid", placeItems: "center" }}>
        <Typography sx={{ color: mute, fontFamily: BODY }}>Loading your profile…</Typography>
      </Box>
    );
  }

  const initial = (form.name || userProfile?.name || "?").charAt(0).toUpperCase();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: pageBg, color: ink, fontFamily: BODY, pb: 14 }}>
      {/* Banner */}
      <Box sx={{ bgcolor: accent, color: "#fff", px: 2.5, pt: 3, pb: 7, transition: "background-color .8s" }}>
        <Box sx={{ maxWidth: 1040, mx: "auto" }}>
          <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "0.95rem" }}>The Active Church</Typography>
          <Fade in key={carouselIndex} timeout={800}>
            <Typography
              component="h2"
              aria-live="polite"
              sx={{
                mt: 5, fontFamily: DISPLAY, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05,
                fontSize: { xs: "1.75rem", sm: "2.5rem", md: "2.9rem" }, minHeight: "2.2em", maxWidth: 760,
              }}
            >
              {carouselTexts[carouselIndex].text}
            </Typography>
          </Fade>
        </Box>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          maxWidth: 1040, mx: "auto", mt: 5, px: 2,
          display: "grid", gap: 5, alignItems: "start",
          gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
        }}
      >
        {/* Identity card */}
        <Box sx={{ ...cardSx, textAlign: "center", position: { md: "sticky" }, top: { md: 16 } }}>
          <Box sx={{ position: "relative", width: 112, height: 112, mx: "auto", mb: 1.75 }}>
            <Avatar
              src={profilePic}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                width: 112, height: 112, bgcolor: accent, color: "#fff", cursor: "pointer",
                fontFamily: DISPLAY, fontWeight: 800, fontSize: "2.5rem", border: `5px solid ${cardBg}`,
                transition: "background-color .8s",
              }}
            >
              {!profilePic && initial}
            </Avatar>
            <IconButton
              aria-label="Change profile picture"
              onClick={() => fileInputRef.current?.click()}
              size="small"
              sx={{
                position: "absolute", right: 0, bottom: 2, width: 34, height: 34,
                bgcolor: ink, color: cardBg, border: `3px solid ${cardBg}`, "&:hover": { bgcolor: ink },
              }}
            >
              <CameraAlt sx={{ fontSize: 16 }} />
            </IconButton>
            <input ref={fileInputRef} hidden accept="image/*" type="file" onChange={onFileChange} />
          </Box>

          <Typography component="h1" sx={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.2 }}>
            {`${form.name} ${form.surname}`.trim() || "Your name"}
          </Typography>
          <Chip
            label={roleLabel}
            size="small"
            sx={{
              mt: 1, fontWeight: 600, fontFamily: BODY,
              bgcolor: canEditProfile ? `${accent}22` : fieldBg,
              color: canEditProfile ? accent : mute,
              border: canEditProfile ? "none" : `1px solid ${line}`,
            }}
          />

          <Typography sx={{ mt: 3, mb: 1.5, textAlign: "left", fontWeight: 600, fontSize: "0.8125rem", color: mute }}>
            Your leadership line
          </Typography>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, textAlign: "left" }}>
            {leaderSteps.map((s, i) => (
              <Box component="li" key={s.label} sx={{ position: "relative", pl: 4, pb: i < leaderSteps.length - 1 ? 2.25 : 0 }}>
                <Box sx={{ position: "absolute", left: 0, top: 4, width: 16, height: 16, borderRadius: "50%", border: `3px solid ${accent}`, bgcolor: cardBg, transition: "border-color .8s" }} />
                {i < leaderSteps.length - 1 && <Box sx={{ position: "absolute", left: 7, top: 20, bottom: -2, width: 2, bgcolor: line }} />}
                <Typography sx={{ fontSize: "0.75rem", color: mute }}>{s.label}</Typography>
                <Typography sx={{ fontWeight: s.value ? 600 : 400, color: s.value ? ink : mute }}>
                  {s.value || "Not assigned yet"}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Form sections */}
        <Box>
          <Alert
            severity={canEditProfile ? "success" : "info"}
            sx={{ mb: 2, borderRadius: "12px", fontFamily: BODY }}
          >
            {canEditProfile
              ? `You have ${roleLabel} privileges and can edit every field on this page.`
              : "Your details are managed by church administrators. You can update your email, phone number and password."}
          </Alert>

          {section("About you", "Your name, birthday and gender.",
            <Grid container spacing={2}>
              {field("Name", "name", { locked: true })}
              {field("Surname", "surname", { locked: true })}
              {field("Date of birth", "dob", { locked: true, type: "date" })}
              {field("Gender", "gender", {
                locked: true,
                select: true,
                children: [
                  <MenuItem key="" value="">Select gender</MenuItem>,
                  <MenuItem key="Male" value="Male">Male</MenuItem>,
                  <MenuItem key="Female" value="Female">Female</MenuItem>,
                ],
              })}
            </Grid>
          )}

          {section("Contact", "How the church reaches you.",
            <Grid container spacing={2}>
              {field("Email address", "email", { type: "email" })}
              {field("Phone number", "phone", { slotProps: { htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } } })}
              {field("Home address", "address", { locked: true, size: { xs: 12 } })}
            </Grid>
          )}

          {section("Church", "Where you belong and who invited you.",
            <Grid container spacing={2}>
              {field("Organization / church", "organization", { locked: true, placeholder: "Your church or organization" })}
              {field("Invited by", "invitedBy", { locked: true })}
            </Grid>
          )}

          {section("Security", "Change your password.",
            <Box sx={{ border: `1px solid ${line}`, borderRadius: "14px", bgcolor: fieldBg }}>
              <Button
                fullWidth
                onClick={() => setPasswordOpen((o) => !o)}
                aria-expanded={passwordOpen}
                endIcon={<ExpandMore sx={{ color: accent, transform: passwordOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />}
                sx={{ justifyContent: "space-between", textTransform: "none", color: ink, fontWeight: 600, fontSize: "0.95rem", px: 2, py: 1.5, borderRadius: "14px" }}
              >
                Change password
              </Button>
              <Collapse in={passwordOpen} unmountOnExit={false}>
                <Grid container spacing={2} sx={{ p: 2, pt: 0.5 }}>
                  {passwordField("Current password", "currentPassword", "current", { xs: 12 }, "current-password")}
                  {passwordField("New password", "newPassword", "new", { xs: 12, sm: 6 }, "new-password")}
                  {passwordField("Confirm new password", "confirmPassword", "confirm", { xs: 12, sm: 6 }, "new-password")}
                </Grid>
              </Collapse>
            </Box>
          )}
        </Box>

        {/* Floating save bar */}
        <Box
          role="region"
          aria-label="Unsaved changes"
          sx={{
            position: "fixed", left: "50%", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            transform: hasChanges ? "translate(-50%, 0)" : "translate(-50%, 160%)",
            transition: "transform .25s", zIndex: 1200, display: "flex", alignItems: "center", gap: 1,
            bgcolor: ink, color: cardBg, pl: 2.5, pr: 1, py: 1, borderRadius: 99,
            boxShadow: "0 10px 30px rgba(0,0,0,.3)", maxWidth: "calc(100% - 24px)",
            visibility: hasChanges ? "visible" : "hidden",
          }}
        >
          <Typography sx={{ fontSize: "0.9rem", whiteSpace: "nowrap" }}>You have unsaved changes</Typography>
          <Button onClick={handleCancel} sx={{ color: "inherit", opacity: 0.8, textTransform: "none", fontWeight: 600, borderRadius: 99 }}>
            Discard
          </Button>
          <Button type="submit" variant="contained" sx={{ bgcolor: accent, "&:hover": { bgcolor: accent, opacity: 0.9 }, textTransform: "none", fontWeight: 600, borderRadius: 99, px: 2.5, boxShadow: "none" }}>
            Save changes
          </Button>
        </Box>
      </Box>

      {/* Crop dialog */}
      {croppingOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1300, p: 2 }}
          onClick={() => setCroppingOpen(false)}
        >
          <Paper
            sx={{ width: "90vw", maxWidth: 500, bgcolor: cardBg, borderRadius: "18px", p: 3, border: `1px solid ${line}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography sx={{ mb: 2, textAlign: "center", color: ink, fontFamily: DISPLAY, fontWeight: 800, fontSize: "1.2rem" }}>
              Crop your profile picture
            </Typography>
            <Box sx={{ position: "relative", width: "100%", height: 300 }}>
              <Cropper image={croppingSrc} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </Box>
            <Typography sx={{ mt: 2, color: mute, fontWeight: 600, fontSize: "0.8125rem" }}>Zoom</Typography>
            <Slider
              value={zoom} min={1} max={3} step={0.1} onChange={(_, v) => setZoom(v)}
              sx={{ color: accent, "& .MuiSlider-rail": { bgcolor: line } }}
            />
            <Box sx={{ mt: 2, display: "flex", gap: 1.5, justifyContent: "center" }}>
              <Button variant="outlined" onClick={() => setCroppingOpen(false)} sx={{ borderRadius: 99, px: 3, textTransform: "none", fontWeight: 600, color: mute, borderColor: line }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={onCropSave} sx={{ borderRadius: 99, px: 3, textTransform: "none", fontWeight: 600, bgcolor: accent, "&:hover": { bgcolor: accent, opacity: 0.9 } }}>
                Save picture
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ borderRadius: "12px", fontWeight: 600 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}