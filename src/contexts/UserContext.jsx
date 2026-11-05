import React, { createContext, useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "./AuthContext";

export const UserContext = createContext();

const DEFAULT_AVATARS = {
  female:  "https://cdn-icons-png.flaticon.com/512/6997/6997662.png",
  male:    "https://cdn-icons-png.flaticon.com/512/6997/6997675.png",
  neutral: "https://cdn-icons-png.flaticon.com/512/147/147144.png",
};

const getDefaultAvatar = (userDataOrGender) => {
  if (!userDataOrGender) return DEFAULT_AVATARS.neutral;
  const gender = typeof userDataOrGender === "string"
    ? userDataOrGender
    : userDataOrGender?.gender;
  if (!gender) return DEFAULT_AVATARS.neutral;
  const normalized = String(gender).trim().toLowerCase();
  if (normalized === "female") return DEFAULT_AVATARS.female;
  if (normalized === "male")   return DEFAULT_AVATARS.male;
  return DEFAULT_AVATARS.neutral;
};

const getProfilePictureFromUser = (userData) => {
  if (!userData) return DEFAULT_AVATARS.neutral;
  return (
    userData.profile_picture ||
    userData.avatarUrl       ||
    userData.profilePicUrl   ||
    getDefaultAvatar(userData)
  );
};

const normalizeUserProfile = (userData) => {
  if (!userData) return null;
  const profilePicture = getProfilePictureFromUser(userData);
  return {
    ...userData,
    profile_picture: profilePicture,
    avatarUrl:       profilePicture,
    profilePicUrl:   profilePicture,
  };
};

export const UserProvider = ({ children }) => {
  const [profilePic,   setProfilePicState]   = useState(DEFAULT_AVATARS.neutral);
  const [userProfile,  setUserProfileState]  = useState(null);
  const authContext = useContext(AuthContext);

  // ── Sync from AuthContext.user (source of truth) ──────────────────────────
  useEffect(() => {
    if (authContext?.user) {
      const normalized = normalizeUserProfile(authContext.user);
      setUserProfileState(normalized);
      setProfilePicState(normalized.profile_picture);
    } else {
      // AuthContext not ready yet — hydrate from localStorage
      try {
        const saved = localStorage.getItem("userProfile");
        if (saved) {
          const normalized = normalizeUserProfile(JSON.parse(saved));
          setUserProfileState(normalized);
          setProfilePicState(normalized.profile_picture);
        } else {
          const savedPic = localStorage.getItem("profilePic");
          setProfilePicState(savedPic || DEFAULT_AVATARS.neutral);
        }
      } catch (e) {
        console.error("UserContext hydration error:", e);
      }
    }
  }, [authContext?.user]);

  // ── setProfilePic ─────────────────────────────────────────────────────────
  const setProfilePic = useCallback((newPic) => {
    setProfilePicState(newPic);

    if (userProfile) {
      const updated = {
        ...userProfile,
        profile_picture: newPic,
        avatarUrl:       newPic,
        profilePicUrl:   newPic,
      };
      setUserProfileState(updated);
      localStorage.setItem("userProfile", JSON.stringify(updated));
    }

    if (newPic && !Object.values(DEFAULT_AVATARS).includes(newPic)) {
      localStorage.setItem("profilePic", newPic);
    }
  }, [userProfile]);

  // ── setUserProfile ────────────────────────────────────────────────────────
  const setUserProfile = useCallback((newProfile) => {
    if (!newProfile) {
      setUserProfileState(null);
      setProfilePicState(DEFAULT_AVATARS.neutral);
      localStorage.removeItem("userProfile");
      localStorage.removeItem("profilePic");
      return;
    }
    const normalized = normalizeUserProfile(newProfile);
    setUserProfileState(normalized);
    setProfilePicState(normalized.profile_picture);
    localStorage.setItem("userProfile",  JSON.stringify(normalized));
    localStorage.setItem("profilePic",   normalized.profile_picture);
  }, []);

  const loadUserProfile = useCallback(() => {
    if (authContext?.user) {
      const normalized = normalizeUserProfile(authContext.user);
      setUserProfileState(normalized);
      setProfilePicState(normalized.profile_picture);
    }
  }, [authContext?.user]);

  const clearUserData = useCallback(() => {
    setUserProfileState(null);
    setProfilePicState(DEFAULT_AVATARS.neutral);
    localStorage.removeItem("userProfile");
    localStorage.removeItem("profilePic");
  }, []);

  return (
    <UserContext.Provider value={{
      profilePic,
      setProfilePic,
      userProfile,
      setUserProfile,
      loadUserProfile,
      clearUserData,
    }}>
      {children}
    </UserContext.Provider>
  );
};