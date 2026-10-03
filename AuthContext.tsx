import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { User, Role } from '../types';
import { supabase } from '../supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ user: User | null; error?: string; code?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mapStringToRole = (roleStr: any): Role => {
  if (!roleStr) return Role.Volunteer;
  const normalized = String(roleStr).toLowerCase().replace(/[\s_-]+/g, '').trim();
  
  if (normalized === 'masteradmin' || normalized === 'superadmin' || normalized === 'admin') {
    return Role.MasterAdmin;
  }
  if (normalized === 'organisation' || normalized === 'org' || normalized === 'organisationadmin' || normalized === 'organization') {
    return Role.Organisation;
  }
  if (normalized === 'volunteer') {
    return Role.Volunteer;
  }
  if (normalized === 'memberupdates') {
    return Role.MemberUpdates;
  }
  return Role.Volunteer;
};

// Mobile-safe check for existing session in storage without throwing
const CACHED_USER_KEY = 'ssk_cached_user_profile';

const getCachedUser = (): User | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(CACHED_USER_KEY) || sessionStorage.getItem('ssk_mock_session');
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
};

const hasStoredSession = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('ssk_mock_session')) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
        const val = localStorage.getItem(key);
        if (val && val.includes('access_token')) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const cachedUser = getCachedUser();
  const [user, setUser] = useState<User | null>(cachedUser);
  // If we have a cached user, start loading = false immediately for instant dashboard render.
  // If there is no stored session at all, also start loading = false immediately.
  const [loading, setLoading] = useState<boolean>(!cachedUser && hasStoredSession());
  const isMountedRef = useRef<boolean>(true);
  const authInitializedRef = useRef<boolean>(false);

  // Helper to persist active profile cache
  const updateCachedUser = useCallback((userToCache: User | null) => {
    try {
      if (userToCache) {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userToCache));
      } else {
        localStorage.removeItem(CACHED_USER_KEY);
      }
    } catch (e) {
      console.warn("Failed to cache user profile:", e);
    }
  }, []);

  // Sync cache with state
  useEffect(() => {
    updateCachedUser(user);
  }, [user, updateCachedUser]);

  const fetchProfile = useCallback(async (userId: string, authUser?: any): Promise<User | null> => {
    try {
      const metadataRole = authUser?.app_metadata?.role || authUser?.user_metadata?.role;
      const metadataOrgId = authUser?.app_metadata?.organisation_id || authUser?.user_metadata?.organisation_id;
      
      let profile: any = null;

      // Optimize: Fetch only profile data. Join is slow.
      try {
        const res = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        profile = res.data;
      } catch (err: any) {
        console.warn("Profile query fault:", err);
      }

      if (profile) {
        const role = mapStringToRole(profile.role || metadataRole);
        const orgId = profile.organisation_id || metadataOrgId;

        // Lazy fetch organisation name if missing
        let resolvedOrgName: string | undefined = undefined;
        
        return {
          id: profile.id,
          name: profile.name || authUser?.user_metadata?.name || 'Registered User',
          email: profile.email || authUser?.email || '',
          role: role,
          organisationId: orgId,
          organisationName: resolvedOrgName, // Fetch lazily or not at all in init
          mobile: profile.mobile,
          status: (profile.status as 'Active' | 'Deactivated') || 'Active',
          passwordResetPending: profile.password_reset_pending || false,
          profile_photo_url: profile.profile_photo_url
        };
      }

      // If profile record is not yet synced in DB but Supabase Auth session exists,
      // return resilient user constructed from Auth tokens so the user is NEVER blocked
      if (authUser) {
        return {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Authorized User',
          email: authUser.email || '',
          role: mapStringToRole(metadataRole),
          organisationId: metadataOrgId,
          status: 'Active',
          passwordResetPending: false
        };
      }
    } catch (e: any) {
      console.error("Critical Profile sync fault:", e);
      if (authUser) {
        const metadataRole = authUser?.app_metadata?.role || authUser?.user_metadata?.role;
        return {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Authorized User',
          email: authUser.email || '',
          role: mapStringToRole(metadataRole),
          organisationId: authUser?.app_metadata?.organisation_id || authUser?.user_metadata?.organisation_id,
          status: 'Active',
          passwordResetPending: false
        };
      }
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMountedRef.current) {
        const updatedUser = await fetchProfile(session.user.id, session.user);
        if (updatedUser && isMountedRef.current) setUser(updatedUser);
      }
    } catch (e) {
      console.error("Failed to refresh profile:", e);
    }
  }, [fetchProfile]);

  const login = async (identifier: string, password: string): Promise<{ user: User | null; error?: string; code?: string }> => {
    const rawId = (identifier || '').trim();

    if (!rawId) {
      return { user: null, error: 'Please enter your email, mobile number, or username.' };
    }
    if (!password) {
      return { user: null, error: 'Please enter your password.' };
    }

    // 1. Mock login for Member Updates Dashboard
    if (
      (rawId.toLowerCase() === 'member121@gmail.com' || rawId.toLowerCase() === 'member121') && 
      password === 'Member2026@'
    ) {
      const mockUser: User = {
        id: 'member-updates-operator',
        name: 'Member Updates Operator',
        email: 'member121@gmail.com',
        role: Role.MemberUpdates,
        status: 'Active',
        passwordResetPending: false
      };
      try {
        sessionStorage.setItem('ssk_mock_session', JSON.stringify(mockUser));
      } catch (e) {
        console.error("Failed to persist mock session:", e);
      }
      setUser(mockUser);
      return { user: mockUser };
    }

    try {
      let targetEmail = rawId.toLowerCase();
      const normalizedNoSpace = targetEmail.replace(/[\s_-]+/g, '');

      // 2. Handle username shortcuts for Master Admin & Admin
      if (
        normalizedNoSpace === 'masteradmin' || 
        normalizedNoSpace === 'admin' || 
        normalizedNoSpace === 'superadmin' ||
        targetEmail === 'admin@ssk.com' ||
        targetEmail === 'masteradmin@ssk.com'
      ) {
        targetEmail = 'masteradmin@ssk.com';
      }

      // 3. Handle phone / mobile number login on mobile & desktop keyboards
      const digitsOnly = rawId.replace(/\D/g, '');
      const isPhoneLike = !rawId.includes('@') && (
        digitsOnly.length === 10 || 
        (digitsOnly.length === 11 && digitsOnly.startsWith('0')) ||
        (digitsOnly.length === 12 && digitsOnly.startsWith('91'))
      );

      if (isPhoneLike) {
        let cleanMobile = digitsOnly;
        if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
          cleanMobile = digitsOnly.slice(1);
        } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
          cleanMobile = digitsOnly.slice(2);
        }

        try {
          // Lookup registered profile by mobile number
          const { data: matchedProfile, error: profileErr } = await supabase
            .from('profiles')
            .select('email')
            .eq('mobile', cleanMobile)
            .maybeSingle();

          if (matchedProfile?.email) {
            targetEmail = matchedProfile.email.toLowerCase().trim();
          } else {
            // Default volunteer email format
            targetEmail = `${cleanMobile}@sskpeople.com`;
          }
        } catch (lookupErr) {
          console.warn("Phone lookup fallback:", lookupErr);
          targetEmail = `${cleanMobile}@sskpeople.com`;
        }
      }

      // 4. Authenticate with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: targetEmail, 
        password 
      });

      if (authError) {
        console.error("Supabase signIn error:", authError.message);
        let userFacingError = authError.message;
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          userFacingError = 'Invalid credentials. Please verify your email / mobile and password.';
        } else if (authError.message.toLowerCase().includes('network') || authError.message.toLowerCase().includes('fetch')) {
          userFacingError = 'Network connection problem. Please check your mobile internet connection and try again.';
        }
        return { user: null, error: userFacingError };
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id, data.user);
        if (profile) {
          setUser(profile);
          return { user: profile };
        }
        // Fallback user profile from metadata if profiles record lookup is deferred
        const metadataRole = data.user.app_metadata?.role || data.user.user_metadata?.role;
        const fallbackUser: User = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Authorized User',
          email: data.user.email || '',
          role: mapStringToRole(metadataRole),
          organisationId: data.user.app_metadata?.organisation_id || data.user.user_metadata?.organisation_id,
          status: 'Active',
          passwordResetPending: false
        };
        setUser(fallbackUser);
        return { user: fallbackUser };
      }
      return { user: null, error: "Authentication Handshake Failed." };
    } catch (err: any) {
      console.error("Unexpected login failure:", err);
      return { user: null, error: err.message || 'System connection failure.' };
    }
  };

  const logout = async () => {
    // 1. Immediately reset React state synchronously
    setUser(null);
    authInitializedRef.current = false; // Reset init flag

    // 2. Remove real-time channels
    try {
      supabase.removeAllChannels();
    } catch (e) {
      console.warn("Channel cleanup error:", e);
    }

    // 3. Clear all cached sessions and route memory safely
    try {
      sessionStorage.removeItem('ssk_mock_session');
      sessionStorage.clear();
      localStorage.removeItem('ssk_last_authenticated_route');

      // Purge Supabase auth tokens from localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error("Storage cleanup error during logout:", e);
    }

    // 4. Invalidate Supabase session
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase auth signOut warning (safe to ignore):", e);
    }

    // 5. Final state safeguard
    setUser(null);
  };

  const updatePassword = async (newPassword: string) => {
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) return { success: false, error: authError.message };
    
    if (user?.id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_reset_pending: false })
        .eq('id', user.id);
      
      if (profileError) {
        console.error("Failed to clear security flag:", profileError);
        return { success: false, error: "Password changed but security flag remains. Please contact support." };
      }
      await refreshProfile();
    }
    
    return { success: true };
  };

  // Auth Initialization and Session Persistence Effect
  useEffect(() => {
    isMountedRef.current = true;
    let profileSubscription: any = null;

    const setupProfileSubscription = (userId: string) => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
      profileSubscription = supabase
        .channel(`profile-security-${userId}`)
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles', 
            filter: `id=eq.${userId}` 
          },
          () => {
            console.debug("Security profile update detected. Synchronizing...");
            refreshProfile();
          }
        )
        .subscribe();
    };

    // Safety fallback timer to guarantee loading screen never locks up indefinitely on slow mobile connections
    const safetyTimer = setTimeout(() => {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }, 800);

    const init = async () => {
      try {
        // 1. Check for mock session in sessionStorage first
        const mockSaved = sessionStorage.getItem('ssk_mock_session');
        if (mockSaved) {
          try {
            const parsed = JSON.parse(mockSaved);
            if (parsed && parsed.email && isMountedRef.current) {
              setUser(parsed);
              setLoading(false);
              clearTimeout(safetyTimer);
              return;
            }
          } catch {
            sessionStorage.removeItem('ssk_mock_session');
          }
        }

        // 2. Fetch authenticated Supabase session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn("Supabase getSession notice:", sessionError.message);
        }

        if (session?.user && isMountedRef.current) {
          const profile = await fetchProfile(session.user.id, session.user);

          if (isMountedRef.current) {
            if (profile) {
              setUser(profile);
              setupProfileSubscription(session.user.id);
            } else {
              const metadataRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
              const metadataOrgId = session.user.app_metadata?.organisation_id || session.user.user_metadata?.organisation_id;
              setUser({
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Authorized User',
                email: session.user.email || '',
                role: mapStringToRole(metadataRole),
                organisationId: metadataOrgId,
                status: 'Active',
                passwordResetPending: false
              });
            }
          }
        } else if (isMountedRef.current) {
          setUser(null);
        }
      } catch (e) {
        console.error("Auth init exception:", e);
        if (isMountedRef.current) {
          setUser(null);
        }
      } finally {
        clearTimeout(safetyTimer);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    init();

    // Listen to Supabase auth events (including INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED)
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (isMountedRef.current) {
            setUser(null);
            authInitializedRef.current = false;
            setLoading(false);
          }
        } else if (
          event === 'INITIAL_SESSION' || 
          event === 'SIGNED_IN' || 
          event === 'TOKEN_REFRESHED' || 
          event === 'USER_UPDATED'
        ) {
          if (session?.user && isMountedRef.current) {
            const profile = await fetchProfile(session.user.id, session.user);
            if (isMountedRef.current) {
              if (profile) {
                setUser(profile);
                setupProfileSubscription(session.user.id);
              } else {
                const metadataRole = session.user.app_metadata?.role || session.user.user_metadata?.role;
                const metadataOrgId = session.user.app_metadata?.organisation_id || session.user.user_metadata?.organisation_id;
                setUser({
                  id: session.user.id,
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Authorized User',
                  email: session.user.email || '',
                  role: mapStringToRole(metadataRole),
                  organisationId: metadataOrgId,
                  status: 'Active',
                  passwordResetPending: false
                });
              }
              setLoading(false);
            }
          } else if (!session && isMountedRef.current) {
            // Unauthenticated state
            setLoading(false);
          }
        }
      }
    );

    if (authInitializedRef.current) return () => {
      isMountedRef.current = false;
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
      authListener?.unsubscribe();
      clearTimeout(safetyTimer);
    };
    authInitializedRef.current = true;
    init();

    return () => {
      isMountedRef.current = false;
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
      authListener?.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, [fetchProfile, refreshProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be wrapped in AuthProvider');
  return context;
};
