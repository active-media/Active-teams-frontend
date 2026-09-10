import React, { createContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase client ──────────────────────────────────────────────────────────
// Required env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export { supabase };

// ─── Constants ────────────────────────────────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const KEY_USER        = 'userProfile';
const KEY_PROFILE_PIC = 'profilePic';
const KEY_LEADERS     = 'leaders';
const KEY_IS_LEADER   = 'isLeader';
const KEY_JWT_TOKEN   = 'jwtToken';

const STALE_KEYS = [
  KEY_USER, KEY_PROFILE_PIC, KEY_LEADERS, KEY_IS_LEADER,
  'customEventTypes', 'eventTypeMap',
];

const DEFAULT_AVATARS = {
  female:  'https://cdn-icons-png.flaticon.com/512/6997/6997662.png',
  male:    'https://cdn-icons-png.flaticon.com/512/6997/6997675.png',
  neutral: 'https://cdn-icons-png.flaticon.com/512/147/147144.png',
};

// ─── Pure helpers (defined outside component to avoid re-creation) ────────────
const getDefaultAvatar = (userData) => {
  if (!userData) return DEFAULT_AVATARS.neutral;
  const gender = userData.gender?.toLowerCase();
  if (gender === 'female') return DEFAULT_AVATARS.female;
  if (gender === 'male')   return DEFAULT_AVATARS.male;
  return DEFAULT_AVATARS.neutral;
};

const ensureUserWithAvatar = (userData) => {
  if (!userData) return null;
  const normalizedRole    = userData.role?.trim() || 'user';
  const isSupremeAdmin    = userData.is_supreme_admin === true || userData.is_supreme_admin === 'true';
  const profilePicture    =
    userData.profile_picture ||
    userData.avatarUrl       ||
    userData.profilePicUrl   ||
    localStorage.getItem(KEY_PROFILE_PIC) ||
    getDefaultAvatar(userData);

  return {
    ...userData,
    role:             normalizedRole,
    is_supreme_admin: isSupremeAdmin,
    profile_picture:  profilePicture,
    avatarUrl:        profilePicture,
    profilePicUrl:    profilePicture,
  };
};

/**
 * Returns true when a JWT is missing or within 60 s of expiry.
 * Useful as a defensive pre-check even though Supabase handles refresh automatically.
 */
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const { exp } = JSON.parse(atob(parts[1]));
    if (!exp) return true;
    return exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
};

// ─── Context ──────────────────────────────────────────────────────────────────
export const AuthContext = createContext();

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user,            setUserState]      = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [leaders,         setLeadersState]    = useState(null);
  const [isLeader,        setIsLeader]        = useState(false);
  const [jwtToken,        setJwtToken]        = useState(null);

  // ── Persistence helpers ────────────────────────────────────────────────────
  const persistUser = (u) => {
    if (!u) { localStorage.removeItem(KEY_USER); return; }
    const withAvatar = ensureUserWithAvatar(u);
    localStorage.setItem(KEY_USER, JSON.stringify(withAvatar));
    if (withAvatar.profile_picture) {
      localStorage.setItem(KEY_PROFILE_PIC, withAvatar.profile_picture);
    }
  };

  const persistLeadersData = (leadersData, leaderStatus) => {
    if (leadersData !== undefined) {
      localStorage.setItem(KEY_LEADERS, JSON.stringify(leadersData));
      setLeadersState(leadersData);
    }
    if (leaderStatus !== undefined) {
      localStorage.setItem(KEY_IS_LEADER, JSON.stringify(leaderStatus));
      setIsLeader(leaderStatus);
    }
  };

  // ── Hydrate leaders from localStorage cache ────────────────────────────────
  const hydrateLeadersFromCache = () => {
    const storedLeaders  = localStorage.getItem(KEY_LEADERS);
    const storedIsLeader = localStorage.getItem(KEY_IS_LEADER);
    if (storedLeaders)  try { setLeadersState(JSON.parse(storedLeaders));  } catch { /* ignore */ }
    if (storedIsLeader) try { setIsLeader(JSON.parse(storedIsLeader));     } catch { /* ignore */ }
  };

  // ── Fetch profile from DB by email ────────────────────────────────────────
  const fetchProfileByEmail = async (email) => {
    const { data: rows, error } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error) throw new Error(error.message || 'Failed to load profile');
    return rows?.[0] ?? null;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Session may already be invalid/expired server-side (signOut itself
      // can 403 in that case). That's fine — clear local state regardless,
      // otherwise a dead session can never be fully torn down.
      console.warn('[Auth] signOut failed, clearing local state anyway:', err?.message);
    }
    STALE_KEYS.forEach((k) => localStorage.removeItem(k));
    setUserState(null);
    setLeadersState(null);
    setIsLeader(false);
    setIsAuthenticated(false);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  /**
   * Signs in via Supabase Auth.
   * If the user hasn't been migrated yet, falls back to the legacy backend to
   * verify credentials and silently creates a Supabase Auth account on the fly.
   */
  const login = async (email, password) => {
    localStorage.removeItem('customEventTypes');
    localStorage.removeItem('eventTypeMap');

    let { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    // ── Silent migration from legacy backend ──────────────────────────────
    if (authError) {
      let migratedOk = false;

      try {
        const res = await fetch(`${BACKEND_URL}/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => 'unknown body');
          throw new Error(`Legacy login failed (${res.status}): ${text}`);
        }

        // Legacy credentials valid — create Supabase Auth account
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({ email, password });

        if (signUpError) {
          const msg = (signUpError.message || '').toLowerCase();
          const alreadyExists =
            signUpError.status === 400 &&
            /already registered|duplicate key|user already exists|user already registered/i.test(msg);

          if (!alreadyExists) throw signUpError;
          // Account already exists — try signing in again
        }

        // Whether we just created the account or it already existed, sign in
        const retry = await supabase.auth.signInWithPassword({ email, password });
        if (retry.error) throw retry.error;

        authData   = retry.data;
        authError  = null;
        migratedOk = true;
        console.log(`[Auth] Silently migrated user: ${email}`);
      } catch (migrationErr) {
        console.warn('[Auth] Migration failed:', migrationErr.message);
      }

      if (!migratedOk) {
        throw new Error(authError?.message || 'Login failed');
      }
    }

    // ── Load profile from DB ──────────────────────────────────────────────
    const profile = await fetchProfileByEmail(email);
    if (!profile) throw new Error('User profile not found');

    const mergedUser = ensureUserWithAvatar({
      ...profile,
      supabase_id: authData.user.id,
      id:          profile._id || authData.user.id,
      email,
    });

    persistUser(mergedUser);

    // ── Leaders metadata ──────────────────────────────────────────────────
    const leadersData = {
      LeaderId:        profile.LeaderId,
      leader12:        profile.leader12,
      leader144:       profile.leader144,
      leader1728:      profile.leader1728,
      'LeaderPath[0]': profile['LeaderPath[0]'],
      'LeaderPath[1]': profile['LeaderPath[1]'],
      'LeaderPath[2]': profile['LeaderPath[2]'],
    };
    const leaderStatus = !!profile.LeaderId;
    persistLeadersData(leadersData, leaderStatus);

    setUserState(mergedUser);
    setIsAuthenticated(true);

    return { user: mergedUser, leaders: leadersData, isLeader: leaderStatus };
  };

  // ── authFetch — authenticated requests to your own backend ────────────────
  /**
   * Wraps fetch() with a Supabase session token.
   * Automatically retries once after a token refresh on 401.
   */
  const authFetch = useCallback(async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token;

    // Defensive pre-check (Supabase usually handles this, but belt-and-suspenders)
    if (token && isTokenExpired(token)) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed?.session?.access_token ?? null;
    }

    const buildHeaders = (t) => ({
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    });

    const res = await fetch(url, { ...options, headers: buildHeaders(token) });

    if (res.status === 401) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed?.session?.access_token) {
        const e = new Error('Authentication expired — please log in again');
        e.code = 'AUTH_EXPIRED';
        throw e;
      }
      const retryRes = await fetch(url, {
        ...options,
        headers: buildHeaders(refreshed.session.access_token),
      });
      if (retryRes.status === 401) {
        // Refresh "succeeded" but the backend still rejects the token.
        // This usually means the backend isn't validating Supabase JWTs
        // (e.g. it expects its own legacy tokens) — not that the user's
        // session is actually invalid. Don't log the user out here; let
        // the caller decide (e.g. surface an error, or fall back to the
        // legacy backend) instead of forcing a signOut that itself may fail.
        const e = new Error('Request unauthorized after token refresh');
        e.code = 'AUTH_REJECTED_BY_BACKEND';
        throw e;
      }
      return retryRes;
    }

    return res;
  }, []);

  // ── Profile picture ────────────────────────────────────────────────────────
  const updateProfilePicture = useCallback(async (newPictureUrl) => {
    if (!user) return;

    const updatedUser = ensureUserWithAvatar({
      ...user,
      profile_picture: newPictureUrl,
      avatarUrl:       newPictureUrl,
      profilePicUrl:   newPictureUrl,
    });
    setUserState(updatedUser);
    persistUser(updatedUser);

    await supabase
      .from('Users')
      .update({ profile_picture: newPictureUrl })
      .eq('_id', user._id || user.id);
  }, [user]);

  // ── Password reset ─────────────────────────────────────────────────────────
  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message || 'Failed to request password reset');
    return { message: 'Reset email sent' };
  };

  /**
   * Called after the user arrives via the reset-password email link.
   * Supabase sets the session automatically from the URL; we just update the password.
   * The `_token` param is accepted for API compatibility but is not needed.
   */
  const resetPassword = async (_token, newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message || 'Failed to reset password');
    return { message: 'Password updated' };
  };

  // ── Bootstrap: Supabase auth state listener ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUserState(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
          const storedRaw = localStorage.getItem(KEY_USER);

          if (storedRaw) {
            try {
              const parsed = ensureUserWithAvatar(JSON.parse(storedRaw));

              if (parsed.email?.toLowerCase() === session.user.email?.toLowerCase()) {
                // Cache hit — use it
                if (mounted) {
                  setUserState(parsed);
                  setIsAuthenticated(true);
                }
              } else {
                // Email mismatch (e.g. different user on same device) — fetch fresh
                const profile = await fetchProfileByEmail(session.user.email);
                const fresh   = ensureUserWithAvatar(profile ?? {});
                persistUser(fresh);
                if (mounted) {
                  setUserState(fresh);
                  setIsAuthenticated(!!profile);
                }
              }
            } catch {
              if (mounted) {
                setUserState(null);
                setIsAuthenticated(false);
              }
            }
          } else {
            // No cache — fetch from DB
            const profile = await fetchProfileByEmail(session.user.email);
            const fresh   = ensureUserWithAvatar(profile ?? {});
            persistUser(fresh);
            if (mounted) {
              setUserState(fresh);
              setIsAuthenticated(!!profile);
            }
          }

          hydrateLeadersFromCache();
          if (mounted) setLoading(false);
        }
      },
    );

    const forceLogoutHandler = () => logout();
    window.addEventListener('force-logout', forceLogoutHandler);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('force-logout', forceLogoutHandler);
    };
  }, [logout]);

  // ── Cross-tab storage sync ─────────────────────────────────────────────────
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === KEY_USER || e.key === KEY_PROFILE_PIC) {
        const raw = localStorage.getItem(KEY_USER);
        if (raw) {
          try { setUserState(ensureUserWithAvatar(JSON.parse(raw))); }
          catch { /* ignore */ }
        } else {
          setUserState(null);
          setIsAuthenticated(false);
        }
      }

      if (e.key === KEY_LEADERS) {
        const raw = localStorage.getItem(KEY_LEADERS);
        if (raw) try { setLeadersState(JSON.parse(raw)); } catch { /* ignore */ }
        else     setLeadersState(null);
      }

      if (e.key === KEY_IS_LEADER) {
        const raw = localStorage.getItem(KEY_IS_LEADER);
        if (raw) try { setIsLeader(JSON.parse(raw)); } catch { /* ignore */ }
        else     setIsLeader(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Public setters ─────────────────────────────────────────────────────────
  const setUser = (u) => {
    const withAvatar = ensureUserWithAvatar(u);
    setUserState(withAvatar);
    setIsAuthenticated(true);
    persistUser(withAvatar);
  };

  const setLeaders = (leadersData, leaderStatus) => {
    persistLeadersData(leadersData, leaderStatus);
  };

  // ── Context value ──────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      leaders,
      isLeader,
      supabase,
      login,
      logout,
      authFetch,
      updateProfilePicture,
      getDefaultAvatar,
      setUser,
      setLeaders,
      requestPasswordReset,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;