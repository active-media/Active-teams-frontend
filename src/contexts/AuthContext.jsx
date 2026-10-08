import React, { createContext, useState, useEffect, useCallback } from 'react';
import { normalizeRole } from '../utils/roleNormalizer';

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_URL}` || 'http://localhost:8000';

const KEY_ACCESS = 'access_token';
const KEY_REFRESH = 'refresh_token';
const KEY_REFRESH_ID = 'refresh_token_id';
const KEY_USER = 'userProfile';
const KEY_PROFILE_PIC = 'profilePic';
const KEY_LEADERS = 'leaders';
const KEY_IS_LEADER = 'isLeader';
const KEY_ORG_ID = 'org_id';
const KEY_PERSON_ID = 'person_id';

const DEFAULT_AVATARS = {
  female: 'https://cdn-icons-png.flaticon.com/512/6997/6997662.png',
  male: 'https://cdn-icons-png.flaticon.com/512/6997/6997675.png',
  neutral: 'https://cdn-icons-png.flaticon.com/512/147/147144.png'
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshInProgress, setRefreshInProgress] = useState(false);
  const [leaders, setLeaders] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const getDefaultAvatar = (userData) => {
    if (!userData) return DEFAULT_AVATARS.neutral;
    const gender = userData.gender?.toLowerCase();
    if (gender === 'female') return DEFAULT_AVATARS.female;
    if (gender === 'male') return DEFAULT_AVATARS.male;
    return DEFAULT_AVATARS.neutral;
  };

  const ensureUserWithAvatar = (userData) => {
    if (!userData) return null;
    let userRole = userData.role && String(userData.role).trim().length
      ? userData.role
      : 'user';
    
    // Normalize the role to handle various formats from backend
    // e.g., "leader at 12", "leader@12" -> "leaderat12"
    userRole = normalizeRole(userRole);
    
    const profilePicture = userData.profile_picture || 
                          userData.avatarUrl || 
                          userData.profilePicUrl || 
                          localStorage.getItem(KEY_PROFILE_PIC) || 
                          getDefaultAvatar(userData);
    const isSupremeAdmin = userData.is_supreme_admin === true;
    
    return {
      ...userData,
      role: userRole,
      is_supreme_admin: isSupremeAdmin,
      profile_picture: profilePicture,
      avatarUrl: profilePicture,
      profilePicUrl: profilePicture
    };
  };

  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return true;
      const bufferTime = 60 * 1000;
      return payload.exp * 1000 < Date.now() + bufferTime;
    } catch (e) {
      return true, e;
    }
  };

  const persistUser = (u) => {
    if (!u) {
      localStorage.removeItem(KEY_USER);
      return;
    }
    const withAvatar = ensureUserWithAvatar(u);
    console.log('Persisting user:', {
      email: withAvatar.email,
      role: withAvatar.role,
      is_supreme_admin: withAvatar.is_supreme_admin
    });
    localStorage.setItem(KEY_USER, JSON.stringify(withAvatar));
    if (withAvatar.org_id) {
      localStorage.setItem(KEY_ORG_ID, withAvatar.org_id);
    }
    if (withAvatar.person_id) {
      localStorage.setItem(KEY_PERSON_ID, withAvatar.person_id);
    }
    if (withAvatar.profile_picture) {
      localStorage.setItem(KEY_PROFILE_PIC, withAvatar.profile_picture);
    }
  };

  const persistLeadersData = (leadersData, leaderStatus) => {
    if (leadersData) {
      localStorage.setItem(KEY_LEADERS, JSON.stringify(leadersData));
      setLeaders(leadersData);
    }
    
    if (leaderStatus !== undefined) {
      localStorage.setItem(KEY_IS_LEADER, JSON.stringify(leaderStatus));
      setIsLeader(leaderStatus);
    }
  };

const logout = useCallback(() => {
    localStorage.removeItem(KEY_ACCESS);
    localStorage.removeItem(KEY_REFRESH);
    localStorage.removeItem(KEY_REFRESH_ID);
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_PROFILE_PIC);
    localStorage.removeItem(KEY_LEADERS);
    localStorage.removeItem(KEY_IS_LEADER);
    localStorage.removeItem(KEY_ORG_ID);
    localStorage.removeItem(KEY_PERSON_ID);
    localStorage.removeItem("customEventTypes");
    localStorage.removeItem("eventTypeMap"); 
          
    setUser(null);
    setLeaders(null);
    setIsLeader(false);
    setIsAuthenticated(false);
  }, []);

 const attemptRefresh = useCallback(async () => {
  const refresh = localStorage.getItem(KEY_REFRESH);
  const refreshId = localStorage.getItem(KEY_REFRESH_ID);
  
  if (!refresh || !refreshId) {
    console.error('No refresh token or refresh ID found');
    logout();
    return false;
  }

  if (refreshInProgress) {
    console.log('Refresh already in progress, skipping...');
    return false;
  }
  
  setRefreshInProgress(true);

  try {
    console.log('Attempting token refresh...');
    const res = await fetch(`${BACKEND_URL}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        refresh_token: refresh, 
        refresh_token_id: refreshId 
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Token refresh failed:', res.status, errorData);
      
      if (res.status === 401 || res.status === 403) {
        logout();
      }
      
      return false;
    }

const data = await res.json();
    console.log('Token refresh successful');
    localStorage.setItem(KEY_ACCESS, data.access_token);
    localStorage.setItem(KEY_REFRESH, data.refresh_token);
    localStorage.setItem(KEY_REFRESH_ID, data.refresh_token_id);
    
    return true;
  } catch (e) {
    console.error('Refresh attempt error:', e);
    return false;
  } finally {
    setRefreshInProgress(false);
  }
}, [refreshInProgress, logout]);

const authFetch = useCallback(async (url, options = {}) => {
  let accessToken = localStorage.getItem(KEY_ACCESS);
  
  if (accessToken && isTokenExpired(accessToken)) {
    console.log('Access token expired, attempting refresh...');
    const refreshed = await attemptRefresh();
    if (!refreshed) {
      console.error('Token refresh failed during pre-check');
      throw new Error('Token refresh failed');
    }
    accessToken = localStorage.getItem(KEY_ACCESS);
  }

  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json'
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401 && !refreshInProgress) {
      console.log('Got 401, attempting token refresh...');
      const refreshed = await attemptRefresh();
      
      if (refreshed) {
        const newToken = localStorage.getItem(KEY_ACCESS);
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, { ...options, headers });
        
        if (retryRes.status === 401) {
          console.warn('Still 401 after token refresh - likely auth expired completely');
          logout();
          throw new Error('Authentication expired');
        }
        
        return retryRes;
      } else {
        console.error('Token refresh failed on 401 retry');
        logout();
        throw new Error('Authentication failed - please log in again');
      }
    }
    
    return res;
  } catch (error) {
    if (error.name === 'AbortError') {
      // Caller (e.g. a component-level timeout) intentionally cancelled this
      // request — not a real network/auth failure. Let it propagate silently.
      throw error;
    }
    console.error('authFetch error:', error);
    throw error;
  }
}, [refreshInProgress, attemptRefresh, logout]);

const login = async (email, password) => {
    localStorage.removeItem("customEventTypes");
    localStorage.removeItem("eventTypeMap");
    
    const res = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    
    localStorage.setItem(KEY_ACCESS, data.access_token);
    localStorage.setItem(KEY_REFRESH, data.refresh_token);
    localStorage.setItem(KEY_REFRESH_ID, data.refresh_token_id);
    if (data.user && data.user.org_id) {
      localStorage.setItem(KEY_ORG_ID, data.user.org_id);
    }
    if (data.user && data.user.person_id) {
      localStorage.setItem(KEY_PERSON_ID, data.user.person_id);
    }

    const mergedUserData = { ...data.user, ...(data.leaders || {}) };
    const userWithAvatar = ensureUserWithAvatar(mergedUserData);
    persistUser(userWithAvatar);
    persistLeadersData(data.leaders, data.isLeader);
    
    if (userWithAvatar.profile_picture) {
      localStorage.setItem(KEY_PROFILE_PIC, userWithAvatar.profile_picture);
    }

    setUser(userWithAvatar);
    setIsAuthenticated(true);
    
    return data;
};

  const updateProfilePicture = useCallback((newPictureUrl) => {
    if (user) {
      const updatedUser = ensureUserWithAvatar({ 
        ...user, 
        profile_picture: newPictureUrl, 
        avatarUrl: newPictureUrl, 
        profilePicUrl: newPictureUrl 
      });
      setUser(updatedUser);
      persistUser(updatedUser);
    }
  }, [user]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === KEY_USER || e.key === KEY_PROFILE_PIC) {
        const storedUser = localStorage.getItem(KEY_USER);
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            const userWithAvatar = ensureUserWithAvatar(parsedUser);
            setUser(userWithAvatar);
          } catch (error) {
            console.error('Error parsing user from storage:', error);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      
      if (e.key === KEY_LEADERS) {
        const storedLeaders = localStorage.getItem(KEY_LEADERS);
        if (storedLeaders) {
          try {
            setLeaders(JSON.parse(storedLeaders));
          } catch (error) {
            console.error('Error parsing leaders from storage:', error);
          }
        } else {
          setLeaders(null);
        }
      }
      
      if (e.key === KEY_IS_LEADER) {
        const storedIsLeader = localStorage.getItem(KEY_IS_LEADER);
        if (storedIsLeader) {
          try {
            setIsLeader(JSON.parse(storedIsLeader));
          } catch (error) {
            console.error('Error parsing isLeader from storage:', error);
          }
        } else {
          setIsLeader(false);
        }
      }

      if (e.key === KEY_ACCESS && e.newValue == null) {
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const access = localStorage.getItem(KEY_ACCESS);
        const storedUser = localStorage.getItem(KEY_USER);
        const storedLeaders = localStorage.getItem(KEY_LEADERS);
        const storedIsLeader = localStorage.getItem(KEY_IS_LEADER);
        
        if (access && isTokenExpired(access)) {
          const refreshed = await attemptRefresh();
          if (!refreshed) {
            if (mounted) {
              logout();
              setLoading(false);
            }
            return;
          }
        }

        if (!localStorage.getItem(KEY_ACCESS) && localStorage.getItem(KEY_REFRESH) && localStorage.getItem(KEY_REFRESH_ID)) {
          const refreshed = await attemptRefresh();
          if (!refreshed) {
            if (mounted) logout();
            setLoading(false);
            return;
          }
        }

        const finalAccess = localStorage.getItem(KEY_ACCESS);
        const finalUser = storedUser ? ensureUserWithAvatar(JSON.parse(storedUser)) : null;
        
        if (storedLeaders) {
          try {
            setLeaders(JSON.parse(storedLeaders));
          } catch (error) {
            console.error('Error parsing leaders data:', error);
          }
        }
        
        if (storedIsLeader) {
          try {
            setIsLeader(JSON.parse(storedIsLeader));
          } catch (error) {
            console.error('Error parsing isLeader data:', error);
          }
        }

        if (finalAccess && finalUser) {
          // Verify stored user matches current token by fetching from backend
          try {
            const headerWithAuth = {
              'Authorization': `Bearer ${finalAccess}`,
              'Content-Type': 'application/json'
            };
            const res = await fetch(`${BACKEND_URL}/profile/${finalUser.id}`, {
              headers: headerWithAuth
            });
            
            if (res.ok) {
              const backendUser = await res.json();
              // Check if the backend user email matches stored user email
              if (backendUser.email && finalUser.email && 
                  backendUser.email.toLowerCase() !== finalUser.email.toLowerCase()) {
                console.warn('Stored user mismatch detected. Using backend user.');
                const verifiedUser = ensureUserWithAvatar(backendUser);
                persistUser(verifiedUser);
                if (mounted) {
                  setUser(verifiedUser);
                  setIsAuthenticated(true);
                }
              } else {
                // User verified, use stored version
                if (mounted) {
                  setUser(finalUser);
                  setIsAuthenticated(true);
                }
              }
            } else {
              // Backend fetch failed, logout
              if (mounted) logout();
            }
          } catch (verifyError) {
            console.error('Error verifying user:', verifyError);
            // On verification error, still set the user but will catch actual auth errors later
            if (mounted) {
              setUser(finalUser);
              setIsAuthenticated(true);
            }
          }
        } else if (finalAccess && !finalUser) {
          if (mounted) logout();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        logout();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => { mounted = false; };
  }, [logout, attemptRefresh]);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('force-logout', handler);
    return () => window.removeEventListener('force-logout', handler);
  }, [logout]);

  const setUserAndPersist = (u) => {
    const withAvatar = ensureUserWithAvatar(u);
    setUser(withAvatar);
    setIsAuthenticated(true);
    persistUser(withAvatar);
  };

  const setLeadersData = (leadersData, leaderStatus) => {
    persistLeadersData(leadersData, leaderStatus);
  };

  const requestPasswordReset = async (email) => {
    try {
      const res = await fetch(`${BACKEND_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Failed to request password reset');
      }

      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const res = await fetch(`${BACKEND_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || err.message || 'Failed to reset password');
      }

      const data = await res.json();
      return data;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      leaders,
      isLeader,
      login,
      logout,
      authFetch,
      updateProfilePicture,
      getDefaultAvatar,
      setUser: setUserAndPersist,
      setLeaders: setLeadersData,
      attemptRefresh,
      requestPasswordReset,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;