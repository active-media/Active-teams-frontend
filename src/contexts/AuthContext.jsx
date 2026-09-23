import React, { createContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase client ──────────────────────────────────────────────────────────
// Put these in your .env:  VITE_SUPABASE_URL  and  VITE_SUPABASE_ANON_KEY
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export { supabase }; // re-export so other files can import it from here

// ─── Constants ────────────────────────────────────────────────────────────────
const KEY_USER        = 'userProfile';
const KEY_PROFILE_PIC = 'profilePic';
const KEY_LEADERS     = 'leaders';
const KEY_IS_LEADER   = 'isLeader';

const DEFAULT_AVATARS = {
  female:  'https://cdn-icons-png.flaticon.com/512/6997/6997662.png',
  male:    'https://cdn-icons-png.flaticon.com/512/6997/6997675.png',
  neutral: 'https://cdn-icons-png.flaticon.com/512/147/147144.png',
};

export const AuthContext = createContext();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDefaultAvatar = (userData) => {
  if (!userData) return DEFAULT_AVATARS.neutral;
  const gender = userData.gender?.toLowerCase();
  if (gender === 'female') return DEFAULT_AVATARS.female;
  if (gender === 'male')   return DEFAULT_AVATARS.male;
  return DEFAULT_AVATARS.neutral;
};

const ensureUserWithAvatar = (userData) => {
  if (!userData) return null;
  const normalizedRole = userData.role?.trim() || 'user';
  const profilePicture =
    userData.profile_picture ||
    userData.avatarUrl ||
    userData.profilePicUrl ||
    localStorage.getItem(KEY_PROFILE_PIC) ||
    getDefaultAvatar(userData);
  const isSupremeAdmin = userData.is_supreme_admin === true || userData.is_supreme_admin === 'true';

  return {
    ...userData,
    role:             normalizedRole,
    is_supreme_admin: isSupremeAdmin,
    profile_picture:  profilePicture,
    avatarUrl:        profilePicture,
    profilePicUrl:    profilePicture,
  };
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user,            setUser]            = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [leaders,         setLeaders]         = useState(null);
  const [isLeader,        setIsLeader]        = useState(false);

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
      setLeaders(leadersData);
    }
    if (leaderStatus !== undefined) {
      localStorage.setItem(KEY_IS_LEADER, JSON.stringify(leaderStatus));
      setIsLeader(leaderStatus);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();

    [
      KEY_USER, KEY_PROFILE_PIC, KEY_LEADERS, KEY_IS_LEADER,
      'customEventTypes', 'eventTypeMap',
    ].forEach((k) => localStorage.removeItem(k));

    setUser(null);
    setLeaders(null);
    setIsLeader(false);
    setIsAuthenticated(false);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    // Clear stale event caches
    localStorage.removeItem('customEventTypes');
    localStorage.removeItem('eventTypeMap');

    // 1. Try Supabase Auth first
    let { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    // 2. Silent migration: if Supabase doesn't know this user yet,
    //    verify against the old backend and create the Supabase Auth account on the fly.
    if (authError) {
      let migratedOk = false;

      try {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
        const res = await fetch(`${BACKEND_URL}/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        });

        if (res.ok) {
          // Old backend accepted the credentials — create the user in Supabase Auth
          const { error: signUpError } = await supabase.auth.admin?.createUser?.({
            email,
            password,
            email_confirm: true,
          }) ?? await supabase.auth.signUp({ email, password });

          if (!signUpError) {
            // Now sign them in properly
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (!retry.error) {
              authData  = retry.data;
              authError = null;
              migratedOk = true;
              console.log(`Silently migrated user: ${email}`);
            }
          }
        }
      } catch (migrationErr) {
        console.warn('Migration attempt failed:', migrationErr.message);
      }

      if (!migratedOk) {
        throw new Error(authError.message || 'Login failed');
      }
    }

    const authUser = authData.user;

    // 2. Fetch the full profile row from public."Users"
    //    Match on email (since _id is your own UUID, not the Supabase auth UUID)
    const { data: rows, error: dbError } = await supabase
      .from('Users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (dbError) throw new Error(dbError.message || 'Failed to load profile');

    const profile = rows?.[0] ?? {};

    // 3. Build merged user object
    const mergedUser = ensureUserWithAvatar({
      ...profile,
      // Supabase auth id — keep your own _id as the primary app id
      supabase_id: authUser.id,
      id:          profile._id || authUser.id,
      email:       email,
    });

    persistUser(mergedUser);

    // 4. Leaders metadata (stored as columns in your Users table)
    const leadersData = {
      LeaderId:    profile.LeaderId,
      leader12:    profile.leader12,
      leader144:   profile.leader144,
      leader1728:  profile.leader1728,
      'LeaderPath[0]': profile['LeaderPath[0]'],
      'LeaderPath[1]': profile['LeaderPath[1]'],
      'LeaderPath[2]': profile['LeaderPath[2]'],
    };
    const leaderStatus = !!profile.LeaderId;
    persistLeadersData(leadersData, leaderStatus);

    setUser(mergedUser);
    setIsAuthenticated(true);

    return { user: mergedUser, leaders: leadersData, isLeader: leaderStatus };
  };

  // ── authFetch — wraps supabase.auth.getSession for Bearer tokens ───────────
  // Use this for any custom backend calls that still need a JWT.
  const authFetch = useCallback(async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Try refreshing
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session?.access_token) {
        headers['Authorization'] = `Bearer ${refreshed.session.access_token}`;
        return fetch(url, { ...options, headers });
      }
      logout();
      throw new Error('Authentication expired — please log in again');
    }

    return res;
  }, [logout]);

  // ── Profile picture helper ─────────────────────────────────────────────────
  const updateProfilePicture = useCallback(async (newPictureUrl) => {
    if (!user) return;

    const updatedUser = ensureUserWithAvatar({
      ...user,
      profile_picture: newPictureUrl,
      avatarUrl:       newPictureUrl,
      profilePicUrl:   newPictureUrl,
    });
    setUser(updatedUser);
    persistUser(updatedUser);

    // Persist to DB
    await supabase
      .from('Users')
      .update({ profile_picture: newPictureUrl })
      .eq('_id', user._id || user.id);
  }, [user]);

  // ── Password reset ─────────────────────────────────────────────────────────
  const requestPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Supabase will redirect here after the user clicks the link
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message || 'Failed to request password reset');
    return { message: 'Reset email sent' };
  };

  const resetPassword = async (_token, newPassword) => {
    // When the user arrives from the email link Supabase sets the session
    // automatically; we just update the password.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message || 'Failed to reset password');
    return { message: 'Password updated' };
  };

  // ── Bootstrap: listen to Supabase auth state changes ──────────────────────
  useEffect(() => {
    let mounted = true;

    // onAuthStateChange fires immediately with the current session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          // Re-hydrate profile from localStorage (set during login())
          const storedUser = localStorage.getItem(KEY_USER);
          if (storedUser) {
            try {
              const parsed = ensureUserWithAvatar(JSON.parse(storedUser));
              // Make sure the stored profile belongs to the current session user
              if (parsed.email?.toLowerCase() === session.user.email?.toLowerCase()) {
                setUser(parsed);
                setIsAuthenticated(true);
              } else {
                // Mismatch — fetch fresh profile
                const { data: rows } = await supabase
                  .from('Users')
                  .select('*')
                  .eq('email', session.user.email)
                  .limit(1);
                const fresh = ensureUserWithAvatar(rows?.[0] ?? {});
                persistUser(fresh);
                setUser(fresh);
                setIsAuthenticated(true);
              }
            } catch {
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            // No cache — fetch from DB
            const { data: rows } = await supabase
              .from('Users')
              .select('*')
              .eq('email', session.user.email)
              .limit(1);
            const fresh = ensureUserWithAvatar(rows?.[0] ?? {});
            persistUser(fresh);
            setUser(fresh);
            setIsAuthenticated(!!rows?.[0]);
          }

          // Restore leaders from cache
          const storedLeaders  = localStorage.getItem(KEY_LEADERS);
          const storedIsLeader = localStorage.getItem(KEY_IS_LEADER);
          if (storedLeaders)  try { setLeaders(JSON.parse(storedLeaders));  } catch { /* ignore */ }
          if (storedIsLeader) try { setIsLeader(JSON.parse(storedIsLeader)); } catch { /* ignore */ }

          setLoading(false);
        }
      }
    );

    // Force-logout event (fired elsewhere in the app)
    const forceLogoutHandler = () => logout();
    window.addEventListener('force-logout', forceLogoutHandler);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('force-logout', forceLogoutHandler);
    };
  }, [logout]);

  // ── Setters exposed to consumers ──────────────────────────────────────────
  const setUserAndPersist = (u) => {
    const withAvatar = ensureUserWithAvatar(u);
    setUser(withAvatar);
    setIsAuthenticated(true);
    persistUser(withAvatar);
  };

  const setLeadersData = (leadersData, leaderStatus) => {
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
      login,
      logout,
      authFetch,
      supabase,
      updateProfilePicture,
      getDefaultAvatar,
      setUser:    setUserAndPersist,
      setLeaders: setLeadersData,
      requestPasswordReset,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;