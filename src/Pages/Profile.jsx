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
  Divider,
  Skeleton,
  MenuItem,
  Collapse,
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
import axios from "axios";

const carouselTexts = [
  { text: "We are THE ACTIVE CHURCH", color: "#1976d2" },
  { text: "A church raising a NEW GENERATION", color: "#7b1fa2" },
  { text: "A generation that will CHANGE THIS NATION", color: "#d32f2f" },
  { text: "Amen.", color: "#2e7d32" },
];

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_URL}`;

const createAuthenticatedRequest = () => {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  return axios.create({
    baseURL: BACKEND_URL,
    headers: {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : undefined,
    },
  });
};

async function fetchUserProfile(authFetch) {
  try {
    const token = localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (!token) {
      throw new Error("No authentication token found");
    }

    let userId = null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.user_id || payload.sub || payload.id;

      if (userId) {
        localStorage.setItem("userId", userId);
      }
    } catch (e) {
      console.error("Failed to decode token:", e);
    }

    if (!userId) {
      userId = localStorage.getItem("userId");
    }

    if (!userId) {
      throw new Error("User ID not found");
    }

    if (authFetch) {
      const response = await authFetch(`${BACKEND_URL}/profile/${userId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      return data;
    }

    const response = await fetch(`${BACKEND_URL}/profile/${userId}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
}

async function updateUserProfile(data, authFetch) {
  const token = localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  if (!token) throw new Error("No authentication token found");

  let userId = null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userId = payload.user_id || payload.sub || payload.id;

    if (userId) {
      localStorage.setItem("userId", userId);
    }
  } catch (e) {
    console.error("Failed to decode token:", e);
  }

  if (!userId) {
    userId = localStorage.getItem("userId");
  }

  if (!userId) throw new Error("User ID not found");

  if (authFetch) {
    const response = await authFetch(`${BACKEND_URL}/profile/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  } else {
    const api = createAuthenticatedRequest();
    const response = await api.put(`/profile/${userId}`, data);
    return response.data;
  }
}

async function uploadAvatarFromDataUrl(dataUrl, authFetch) {
  const userId = localStorage.getItem("userId");
  if (!userId) throw new Error("User ID not found");

  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("avatar", blob, "avatar.png");

  if (authFetch) {
    const response = await authFetch(`${BACKEND_URL}/users/${userId}/avatar`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error("Failed to upload avatar");
    return response.json();
  } else {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) throw new Error("Authentication required");

    const response = await fetch(`${BACKEND_URL}/users/${userId}/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) throw new Error("Failed to upload avatar");
    return response.json();
  }
}

async function updatePassword(currentPassword, newPassword, authFetch) {
  const userId = localStorage.getItem("userId");
  if (!userId) throw new Error("User ID not found");

  if (authFetch) {
    const response = await authFetch(`${BACKEND_URL}/users/${userId}/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }
    return response.json();
  } else {
    const token = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (!token) throw new Error("Authentication required");

    const res = await axios.put(`${BACKEND_URL}/users/${userId}/password`, {
      currentPassword,
      newPassword
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });
    return res.data;
  }
}

export default function Profile() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { userProfile, setUserProfile, setProfilePic, profilePic } = useContext(UserContext);
  const { authFetch } = useContext(AuthContext);

  const [loggedInUserRole, setLoggedInUserRole] = useState(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        return parsed.role || "user";
      } catch (e) {
        console.error("Failed to parse stored profile:", e);
      }
    }
    return "user";
  });

  const fileInputRef = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppingSrc, setCroppingSrc] = useState(null);
  const [croppingOpen, setCroppingOpen] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [leaders, setLeaders] = useState({
    leaderAt1: "",
    leaderAt12: "",
    leaderAt144: "",
  });

  const [organization, setOrganization] = useState("");

  const [form, setForm] = useState({
    name: "",
    surname: "",
    dob: "",
    email: "",
    address: "",
    phone: "",
    invitedBy: "",
    gender: "",
    organization: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [originalForm, setOriginalForm] = useState({ ...form });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const hasFetchedProfile = useRef(false);

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
  ];

  const normalizeGender = (gender) => {
    if (!gender) return "";
    const genderMap = {
      'male': 'Male',
      'female': 'Female',
      'Male': 'Male',
      'Female': 'Female'
    };
    return genderMap[gender] || gender;
  };

  const checkIfCanEdit = useCallback((roleToCheck) => {
    if (!roleToCheck) return false;
    const roleStr = String(roleToCheck).toLowerCase().trim();
    const roles = roleStr.split(/[\/,\s|]+/).map(r => r.trim()).filter(r => r.length > 0);
    const hasAdminRole = roles.some(role => role === "admin");
    const hasLeaderRole = roles.some(role => role === "leader");
    return hasAdminRole || hasLeaderRole;
  }, []);

  const canEditProfile = checkIfCanEdit(loggedInUserRole);
  const isRegularUser = !canEditProfile;

  const getUserRole = useCallback(() => {
    if (!loggedInUserRole) return "User";
    const roleStr = String(loggedInUserRole).trim();
    const roles = roleStr.split(/[\/,\s|]+/).map(role => role.trim()).filter(role => role.length > 0).map(role => role.charAt(0).toUpperCase() + role.slice(1).toLowerCase());
    const uniqueRoles = [...new Set(roles)];
    if (uniqueRoles.length === 0) return "User";
    return uniqueRoles.join(" / ");
  }, [loggedInUserRole]);

  useEffect(() => {
    const t = setInterval(() => setCarouselIndex((p) => (p + 1) % carouselTexts.length), 4000);
    return () => clearInterval(t);
  }, []);

  const updateFormWithProfile = useCallback((profile) => {
    console.log("Profile data received:", profile);
    console.log("Leaders data:", profile.leaders);

    const orgValue = profile?.organization || profile?.Organization || "";
    setOrganization(orgValue);

    const formData = {
      name: profile?.name || "",
      surname: profile?.surname || "",
      dob: profile?.date_of_birth || "",
      email: profile?.email || "",
      address: profile?.home_address || "",
      phone: profile?.phone_number || "",
      invitedBy: profile?.invited_by || "",
      gender: normalizeGender(profile?.gender || ""),
      organization: orgValue,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    // In updateFormWithProfile, the leaderAt1 display for newly signed-up users
    // whose LeaderPath IDs resolve to null. Add this fallback after the leaders block:

if (profile?.leaders) {
  const leaderNames = {
    leaderAt1: profile.leaders.leaderAt1
      ? `${profile.leaders.leaderAt1.name} ${profile.leaders.leaderAt1.surname}`
      : profile.invited_by || "",
    leaderAt12: profile.leaders.leaderAt12
      ? `${profile.leaders.leaderAt12.name} ${profile.leaders.leaderAt12.surname}`
      : profile.invited_by || "",
    leaderAt144: profile.leaders.leaderAt144
      ? `${profile.leaders.leaderAt144.name} ${profile.leaders.leaderAt144.surname}`
      : "",
  };

  setLeaders(leaderNames);
  localStorage.setItem("leaders", JSON.stringify(leaderNames));
} else if (profile?.invited_by) {
      localStorage.setItem("leaders", JSON.stringify(leaderNames));
    } else {
      const savedLeaders = JSON.parse(localStorage.getItem("leaders")) || {};
      setLeaders(savedLeaders);
    }

    setForm(formData);
    setOriginalForm(formData);
  }, []);

  useEffect(() => {
    if (hasFetchedProfile.current) {
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);

        const token = localStorage.getItem("access_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("accessToken");

        if (!token) {
          console.log("No token found");
          setLoadingProfile(false);
          return;
        }

        let userId = null;

        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.user_id || payload.sub || payload.id;

          if (userId) {
            localStorage.setItem("userId", userId);
          }
        } catch (e) {
          console.error("Failed to decode token:", e);
        }

        if (!userId) {
          setLoadingProfile(false);
          return;
        }

        let profileData = null;

        if (authFetch) {
          try {
            const response = await authFetch(`${BACKEND_URL}/profile/${userId}`);
            if (response.ok) {
              profileData = await response.json();
            }
          } catch (error) {
            console.error("AuthFetch error:", error);
          }
        }

        if (!profileData) {
          try {
            const response = await fetch(`${BACKEND_URL}/profile/${userId}`, {
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              }
            });

            if (response.ok) {
              profileData = await response.json();
            }
          } catch (error) {
            console.error("Direct fetch error:", error);
          }
        }

        if (profileData && isMounted) {
          updateFormWithProfile(profileData);
          if (setUserProfile) setUserProfile(profileData);
          if (profileData.profile_picture && setProfilePic) {
            setProfilePic(profileData.profile_picture);
          }

          if (profileData.role) {
            setLoggedInUserRole(profileData.role);
            localStorage.setItem("userRole", profileData.role);
          }

          hasFetchedProfile.current = true;
        }
      } catch (error) {
        console.error("Profile loading error:", error);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authFetch, setUserProfile, setProfilePic, updateFormWithProfile]);

  const hasChanges = React.useMemo(() => {
    const hasPasswordChange = form.newPassword !== "" || form.confirmPassword !== "" || form.currentPassword !== "";
    const hasProfileChanges = Object.keys(form).some((key) => {
      if (["currentPassword", "newPassword", "confirmPassword"].includes(key)) return false;
      return form[key] !== originalForm[key];
    });
    return hasPasswordChange || hasProfileChanges;
  }, [form, originalForm]);

  const togglePasswordVisibility = (field) =>
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));

  const validate = () => {
    const n = {};

    if (canEditProfile) {
      if (!form.name.trim()) n.name = "Name is required";
      if (!form.surname.trim()) n.surname = "Surname is required";
      if (!form.email.trim()) n.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) n.email = "Email is invalid";
    } else {
      if (!form.email.trim()) n.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) n.email = "Email is invalid";
    }

    if (form.dob && canEditProfile) {
      const dobDate = new Date(form.dob);
      const today = new Date();
      if (dobDate > today) n.dob = "Date of birth cannot be in the future";
    }

    if (form.phone && form.phone.trim()) {
      const hasNumbers = /\d/.test(form.phone);
      if (!hasNumbers) n.phone = "Phone number should contain numbers";
      const cleaned = form.phone.replace(/\D/g, '');
      if (cleaned.length < 7) n.phone = "Phone number seems too short";
      if (cleaned.length > 15) n.phone = "Phone number seems too long";
    }

    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (!form.currentPassword.trim()) n.currentPassword = "Current password is required to change password";
      if (form.newPassword && form.newPassword.length < 8) n.newPassword = "New password must be at least 8 characters long";
      if (form.newPassword !== form.confirmPassword) n.confirmPassword = "Passwords do not match";
      if (form.newPassword && !form.confirmPassword) n.confirmPassword = "Please confirm your new password";
    }

    setErrors(n);
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
    if (field === "organization") setOrganization(value);
  };

  const handleCancel = () => {
    setForm({ ...originalForm });
    setOrganization(originalForm.organization || "");
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const hasPasswordChange = form.newPassword && form.confirmPassword && form.currentPassword;
      const hasProfileChanges = Object.keys(form).some((key) => {
        if (["currentPassword", "newPassword", "confirmPassword"].includes(key)) return false;
        return form[key] !== originalForm[key];
      });

      let profileUpdated = false;
      let passwordUpdated = false;

      if (hasProfileChanges) {
        try {
          const profileData = {
            name: form.name,
            surname: form.surname,
            date_of_birth: form.dob,
            email: form.email,
            home_address: form.address,
            phone_number: form.phone,
            invited_by: form.invitedBy,
            gender: form.gender,
            organization: form.organization,
          };
          await updateUserProfile(profileData, authFetch);
          const updatedProfile = { ...userProfile, ...profileData };
          if (setUserProfile) setUserProfile(updatedProfile);
          localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
          profileUpdated = true;
        } catch (profileError) {
          setSnackbar({ open: true, message: `Profile update failed: ${profileError.message}`, severity: "error" });
          return;
        }
      }

      if (hasPasswordChange) {
        try {
          await updatePassword(form.currentPassword, form.newPassword, authFetch);
          passwordUpdated = true;
          setForm(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
        } catch (passwordError) {
          setSnackbar({ open: true, message: `Password change failed: ${passwordError.message}`, severity: "error" });
          return;
        }
      }

      setOriginalForm({ ...form, currentPassword: "", newPassword: "", confirmPassword: "" });

      let successMessage = "";
      if (profileUpdated && passwordUpdated) successMessage = "Profile and password updated successfully!";
      else if (profileUpdated) successMessage = "Profile updated successfully!";
      else if (passwordUpdated) successMessage = "Password updated successfully!";

      if (successMessage) {
        setSnackbar({ open: true, message: successMessage, severity: "success" });
      }
    } catch (err) {
      setSnackbar({ open: true, message: `Failed to update: ${err.message}`, severity: "error" });
    }
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setCroppingSrc(reader.result);
        setCroppingOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

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
          localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
          setSnackbar({ open: true, message: "Profile picture uploaded successfully!", severity: "success" });
        } else {
          if (setProfilePic) setProfilePic(croppedImage);
          setSnackbar({ open: true, message: "Profile picture updated locally", severity: "info" });
        }
      } catch (uploadError) {
        console.error("Avatar upload failed:", uploadError);
        if (setProfilePic) setProfilePic(croppedImage);
        setSnackbar({ open: true, message: "Profile picture updated locally only", severity: "warning" });
      }
      setCroppingOpen(false);
    } catch (e) {
      console.error("Crop error:", e);
      setSnackbar({ open: true, message: "Could not process image", severity: "error" });
    }
  };

  const getInitials = () => {
    const name = form.name || userProfile?.name || "";
    return name.charAt(0).toUpperCase();
  };

  const currentCarouselItem = carouselTexts[carouselIndex];

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
      lineHeight: "1.4375em",
      background: "transparent !important",
    }
  };

  const ProfileSkeleton = () => (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#0a0a0a" : "#f8f9fa", pb: 4 }}>
      <Box sx={{ position: "relative", minHeight: "30vh", background: isDark ? `linear-gradient(135deg, ${currentCarouselItem.color}15 0%, ${currentCarouselItem.color}25 100%)` : `linear-gradient(135deg, ${currentCarouselItem.color}10 0%, ${currentCarouselItem.color}20 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pt: 6, pb: 12 }}>
        <Skeleton variant="text" width="60%" height={60} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 2 }} />
      </Box>
      <Box sx={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", mt: -10, mb: 5 }}>
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <Skeleton variant="circular" width={150} height={150} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', border: `6px solid ${isDark ? "#0a0a0a" : "#ffffff"}`, }} />
          <Skeleton variant="text" width={200} height={40} sx={{ mt: 2, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
        </Box>
      </Box>
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, position: "relative", zIndex: 2 }}>
        <Card sx={{ bgcolor: isDark ? "#111111" : "#ffffff", borderRadius: 3, boxShadow: isDark ? "0 8px 32px rgba(255,255,255,0.02)" : "0 8px 32px rgba(0,0,0,0.08)", border: `1px solid ${isDark ? "#222222" : "#e0e0e0"}`, }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, pt: 4 }}>
            <Grid container spacing={3}>
              {[...Array(9)].map((_, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={index}>
                  <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1, bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 1 }} />
                  <Skeleton variant="rectangular" height={56} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Skeleton variant="rectangular" width={150} height={48} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderRadius: 2 }} />
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );

  if (loadingProfile) return <ProfileSkeleton />;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: isDark ? "#0a0a0a" : "#f8f9fa", pb: 4 }}>
      <Box sx={{
        position: "relative",
        minHeight: "30vh",
        background: isDark
          ? `linear-gradient(135deg, ${currentCarouselItem.color}15 0%, ${currentCarouselItem.color}25 100%)`
          : `linear-gradient(135deg, ${currentCarouselItem.color}10 0%, ${currentCarouselItem.color}20 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 1s ease-in-out",
        overflow: "hidden",
        pt: 6,
        pb: 12,
      }}>
        <Box sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          "&::before": {
            content: '""',
            position: "absolute",
            width: "200%",
            height: "200%",
            background: `radial-gradient(circle at 50% 50%, ${currentCarouselItem.color}08 0%, transparent 70%)`,
            animation: "pulse 4s ease-in-out infinite alternate",
          },
        }} />
        <Box sx={{ position: "relative", zIndex: 2, textAlign: "center", px: 2 }}>
          <Fade in key={carouselIndex} timeout={1000}>
            <Typography variant="h3" sx={{
              fontWeight: 700,
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
              color: currentCarouselItem.color,
              textShadow: isDark ? "0 2px 20px rgba(255,255,255,0.1)" : "0 2px 20px rgba(0,0,0,0.1)",
              transition: "color 1s ease-in-out",
              lineHeight: 1.2,
              maxWidth: "800px",
            }}>
              {currentCarouselItem.text}
            </Typography>
          </Fade>
        </Box>
      </Box>

      <Box sx={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", mt: -10, mb: 5 }}>
        <Box sx={{ position: "relative", textAlign: "center" }}>
          <Box sx={{ position: "relative", display: "inline-block" }}>
            <Avatar sx={{
              width: 150,
              height: 150,
              border: `6px solid ${isDark ? "#0a0a0a" : "#ffffff"}`,
              boxShadow: `0 12px 40px ${currentCarouselItem.color}60`,
              bgcolor: isDark ? "#1a1a1a" : "#ffffff",
              color: currentCarouselItem.color,
              fontSize: "2.5rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: `0 16px 60px ${currentCarouselItem.color}80`,
              },
            }}
              src={profilePic}
              onClick={() => fileInputRef.current?.click()}>
              {!profilePic && getInitials()}
            </Avatar>
            <IconButton sx={{
              position: "absolute",
              bottom: 4,
              right: 4,
              bgcolor: currentCarouselItem.color,
              color: "white",
              width: 36,
              height: 36,
              border: `2px solid ${isDark ? "#0a0a0a" : "#ffffff"}`,
              "&:hover": {
                bgcolor: currentCarouselItem.color,
                transform: "scale(1.1)",
              },
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
              size="small"
              onClick={() => fileInputRef.current?.click()}>
              <CameraAlt sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <input ref={fileInputRef} hidden accept="image/*" type="file" onChange={onFileChange} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="h4" sx={{
              fontWeight: 700,
              color: isDark ? "#ffffff" : "#000000",
              mb: 1,
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
            }}>
              {form.name} {form.surname}
            </Typography>
            <Typography variant="body2" sx={{
              display: "inline-block",
              px: 2,
              py: 0.5,
              borderRadius: 2,
              bgcolor: canEditProfile ? `${currentCarouselItem.color}20` : isDark ? "#333333" : "#e0e0e0",
              color: canEditProfile ? currentCarouselItem.color : isDark ? "#999999" : "#666666",
              fontWeight: 600,
              textTransform: "uppercase",
              fontSize: "0.75rem",
              letterSpacing: 1
            }}>
              {getUserRole()}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, position: "relative", zIndex: 2 }}>
        <Card sx={{
          bgcolor: isDark ? "#111111" : "#ffffff",
          borderRadius: 3,
          boxShadow: isDark ? "0 8px 32px rgba(255,255,255,0.02)" : "0 8px 32px rgba(0,0,0,0.08)",
          border: `1px solid ${isDark ? "#222222" : "#e0e0e0"}`,
        }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, pt: 4 }}>
            {isRegularUser && (
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Your profile information is managed by church administrators. You can only change your email, number and password.
              </Alert>
            )}
            {canEditProfile && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                You have {getUserRole()} privileges and can edit all profile fields.
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Name</Typography>
                  <TextField
                    value={form.name || ""}
                    onChange={handleChange("name")}
                    fullWidth
                    disabled={!canEditProfile}
                    error={!!errors.name}
                    helperText={errors.name}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Surname</Typography>
                  <TextField
                    value={form.surname || ""}
                    onChange={handleChange("surname")}
                    fullWidth
                    disabled={!canEditProfile}
                    error={!!errors.surname}
                    helperText={errors.surname}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Date Of Birth</Typography>
                  <TextField
                    value={form.dob || ""}
                    onChange={handleChange("dob")}
                    fullWidth
                    type="date"
                    disabled={!canEditProfile}
                    error={!!errors.dob}
                    helperText={errors.dob}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Gender</Typography>
                  <TextField
                    select
                    value={form.gender || ""}
                    onChange={handleChange("gender")}
                    fullWidth
                    disabled={!canEditProfile}
                    sx={commonFieldSx}
                  >
                    {genderOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Email Address</Typography>
                  <TextField
                    value={form.email || ""}
                    onChange={handleChange("email")}
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Home Address</Typography>
                  <TextField
                    value={form.address || ""}
                    onChange={handleChange("address")}
                    fullWidth
                    disabled={!canEditProfile}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Phone Number</Typography>
                  <TextField
                    value={form.phone || ""}
                    onChange={handleChange("phone")}
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone}
                    sx={commonFieldSx}
                    slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Invited By</Typography>
                  <TextField
                    value={form.invitedBy || ""}
                    onChange={handleChange("invitedBy")}
                    fullWidth
                    disabled={!canEditProfile}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Organization / Church</Typography>
                  <TextField
                    value={organization || form.organization || ""}
                    onChange={handleChange("organization")}
                    fullWidth
                    disabled={!canEditProfile}
                    sx={commonFieldSx}
                    placeholder="Your church or organization"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Leader@1</Typography>
                  <TextField
                    value={leaders.leaderAt1 || ""}
                    fullWidth
                    disabled={true}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Leader@12</Typography>
                  <TextField
                    value={leaders.leaderAt12 || ""}
                    fullWidth
                    disabled={true}
                    sx={commonFieldSx}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Leader@144</Typography>
                  <TextField
                    value={leaders.leaderAt144 || ""}
                    fullWidth
                    disabled={true}
                    sx={commonFieldSx}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                <Accordion
                  expanded={advancedOpen}
                  onChange={() => setAdvancedOpen(!advancedOpen)}
                  sx={{
                    bgcolor: isDark ? "#1a1a1a" : "#f8f9fa",
                    boxShadow: "none",
                    border: `1px solid ${isDark ? "#333333" : "#e0e0e0"}`,
                    borderRadius: "12px !important",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore sx={{ color: currentCarouselItem.color }} />}
                    sx={{
                      borderRadius: "12px",
                      "& .MuiAccordionSummary-content": {
                        alignItems: "center",
                        gap: 1,
                      },
                    }}
                  >
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
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Current Password</Typography>
                        <TextField
                          value={form.currentPassword || ""}
                          onChange={handleChange("currentPassword")}
                          type={showPassword.current ? "text" : "password"}
                          fullWidth
                          error={!!errors.currentPassword}
                          helperText={errors.currentPassword}
                          autoComplete="current-password"
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={() => togglePasswordVisibility("current")} edge="end" sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                                    {showPassword.current ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={commonFieldSx}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>New Password</Typography>
                        <TextField
                          value={form.newPassword || ""}
                          onChange={handleChange("newPassword")}
                          type={showPassword.new ? "text" : "password"}
                          fullWidth
                          error={!!errors.newPassword}
                          helperText={errors.newPassword}
                          autoComplete="new-password"
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={() => togglePasswordVisibility("new")} edge="end" sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                                    {showPassword.new ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={commonFieldSx}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: isDark ? "#cccccc" : "#666666" }}>Confirm New Password</Typography>
                        <TextField
                          value={form.confirmPassword || ""}
                          onChange={handleChange("confirmPassword")}
                          type={showPassword.confirm ? "text" : "password"}
                          fullWidth
                          error={!!errors.confirmPassword}
                          helperText={errors.confirmPassword}
                          autoComplete="new-password"
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={() => togglePasswordVisibility("confirm")} edge="end" sx={{ color: isDark ? "#cccccc" : "#666666" }}>
                                    {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                          sx={commonFieldSx}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Box>

              <Box sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={!hasChanges}
                  sx={{
                    bgcolor: currentCarouselItem.color,
                    "&:hover": { bgcolor: currentCarouselItem.color, opacity: 0.9 },
                    "&:disabled": { bgcolor: isDark ? "#333333" : "#cccccc", color: isDark ? "#666666" : "#999999" },
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: "none",
                    fontSize: "1rem",
                  }}
                >
                  {canEditProfile ? "Save Changes" : "Update Profile"}
                </Button>
                {hasChanges && (
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    startIcon={<Cancel />}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      textTransform: "none",
                      fontSize: "1rem",
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {croppingOpen && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
            p: 2,
          }}
          onClick={() => setCroppingOpen(false)}
        >
          <Paper
            sx={{
              position: "relative",
              width: "90vw",
              maxWidth: 500,
              bgcolor: isDark ? "#111111" : "#ffffff",
              borderRadius: 3,
              p: 3,
              border: `1px solid ${isDark ? "#333333" : "#e0e0e0"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" sx={{ mb: 2, textAlign: "center", color: isDark ? "#ffffff" : "#000000", fontWeight: 600 }}>
              Crop Your Profile Picture
            </Typography>
            <Box sx={{ position: "relative", width: "100%", height: 300 }}>
              <Cropper
                image={croppingSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography gutterBottom sx={{ color: isDark ? "#cccccc" : "#666666", fontWeight: 600, mb: 1 }}>Zoom</Typography>
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(_, v) => setZoom(v)}
                sx={{
                  color: currentCarouselItem.color,
                  "& .MuiSlider-thumb": { bgcolor: currentCarouselItem.color },
                  "& .MuiSlider-track": { bgcolor: currentCarouselItem.color },
                  "& .MuiSlider-rail": { bgcolor: isDark ? "#333333" : "#cccccc" }
                }}
              />
            </Box>
            <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                variant="outlined"
                onClick={() => setCroppingOpen(false)}
                sx={{
                  borderColor: isDark ? "#666666" : "#cccccc",
                  color: isDark ? "#cccccc" : "#666666",
                  "&:hover": { borderColor: isDark ? "#888888" : "#999999", bgcolor: isDark ? "#222222" : "#f5f5f5" },
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  textTransform: "none"
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={onCropSave}
                sx={{
                  bgcolor: currentCarouselItem.color,
                  "&:hover": { bgcolor: currentCarouselItem.color, opacity: 0.9 },
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  textTransform: "none"
                }}
              >
                Save Picture
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
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ borderRadius: 2, fontWeight: 600, "& .MuiAlert-icon": { fontSize: "1.2rem" } }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1) rotate(0deg); opacity: 0.3; }
          100% { transform: scale(1.05) rotate(2deg); opacity: 0.1; }
        }
      `}</style>
    </Box>
  );
}