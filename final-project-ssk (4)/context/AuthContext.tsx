
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { supabase } from '../supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error?: string; code?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const mapStringToRole = (roleStr: any): Role | string => {
    if (!roleStr) return 'Guest';
    const normalized = String(roleStr).toLowerCase().trim();
    if (normalized === 'masteradmin' || normalized === 'superadmin' || normalized === 'master_admin' || normalized === 'admin') {
        return Role.MasterAdmin;
    }
    if (normalized === 'organisation' || normalized === 'org' || normalized === 'organisationadmin' || normalized === 'organization') {
        return Role.Organisation;
    }
    if (normalized === 'volunteer') {
        return Role.Volunteer;
    }
    if (normalized === 'memberupdates' || normalized === 'member_updates' || normalized === 'member updates') {
        return Role.MemberUpdates;
    }
    return roleStr;
};

const hasStoredSession = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    if (sessionStorage.getItem('ssk_mock_session')) return true;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) {
        const val = localStorage.getItem(key);
        if (val && val.includes('access_token')) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

// Quick race with timeout to never hang the app indefinitely
const withTimeout = <T,>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms))
  ]);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // Always begin in loading state until session state is conclusively verified from Supabase or storage
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string, authUser?: any): Promise<User | null> => {
    try {
      const metadataRole = authUser?.app_metadata?.role || authUser?.user_metadata?.role;
      const metadataOrgId = authUser?.app_metadata?.organisation_id || authUser?.user_metadata?.organisation_id;
      
      let profile: any = null;
      let queryError: any = null;

      try {
        const res = await supabase
            .from('profiles')
            .select(`*, organisations (name)`)
            .eq('id', userId)
            .maybeSingle();
        profile = res.data;
        queryError = res.error;
      } catch (err: any) {
        queryError = err;
      }

      // If complex join encounters network/schema issue, fallback to basic profile query
      if (queryError && !profile) {
        try {
          const fallbackRes = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          if (fallbackRes.data) {
            profile = fallbackRes.data;
            queryError = null;
          }
        } catch {
          // fallback failed, continue to authUser fallback
        }
      }

      if (queryError) {
          console.warn("fetchProfile query notice from profiles table:", queryError?.message || queryError);
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
          return null;
      }
      
      if (profile) {
          const role = mapStringToRole(profile.role || metadataRole);
          const rawOrgName = Array.isArray(profile.organisations) 
            ? profile.organisations[0]?.name 
            : profile.organisations?.name;

          let resolvedOrgName = rawOrgName;
          const orgId = profile.organisation_id || metadataOrgId;

          // Fallback query for organisation name if needed
          if (!resolvedOrgName && orgId) {
            try {
              const { data: orgData } = await supabase
                .from('organisations')
                .select('name')
                .eq('id', orgId)
                .maybeSingle();
              if (orgData?.name) resolvedOrgName = orgData.name;
            } catch (err) {
              console.warn("Could not fetch fallback organisation name:", err);
            }
          }
          
          return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: role,
              organisationId: orgId,
              organisationName: resolvedOrgName || undefined,
              mobile: profile.mobile,
              status: (profile.status as 'Active' | 'Deactivated') || 'Active',
              passwordResetPending: profile.password_reset_pending || false
          };
      } else if (authUser) {
          const role = mapStringToRole(metadataRole);
          return {
              id: authUser.id,
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Authorized User',
              email: authUser.email || '',
              role: role,
              organisationId: metadataOrgId,
              status: 'Active',
              passwordResetPending: false
          };
      }
    } catch (e: any) {
      console.error("Critical Profile sync fault:", e);
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          const updatedUser = await fetchProfile(session.user.id, session.user);
          if (updatedUser) setUser(updatedUser);
      }
    } catch (e) {
      console.error("Failed to refresh profile:", e);
    }
  }, [fetchProfile]);

  const login = async (identifier: string, password: string): Promise<{ user: User | null; error?: string; code?: string }> => {
    const rawId = (identifier || '').trim();

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

      // 2. Handle username shortcuts
      if (targetEmail === 'masteradmin' || targetEmail === 'admin') {
        targetEmail = 'masteradmin@ssk.com';
      }

      // 3. Handle phone / mobile number login
      const digitsOnly = rawId.replace(/\D/g, '');
      const isPhoneLike = !rawId.includes('@') && (digitsOnly.length === 10 || (digitsOnly.length === 12 && digitsOnly.startsWith('91')));

      if (isPhoneLike) {
        const cleanMobile = digitsOnly.length === 12 && digitsOnly.startsWith('91') 
          ? digitsOnly.slice(2) 
          : digitsOnly;

        try {
          // Lookup registered profile by mobile number
          const { data: matchedProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('mobile', cleanMobile)
            .maybeSingle();

          if (matchedProfile?.email) {
            targetEmail = matchedProfile.email.toLowerCase();
          } else {
            // Default volunteer email format
            targetEmail = `${cleanMobile}@sskpeople.com`;
          }
        } catch (lookupErr) {
          console.warn("Phone lookup fallback:", lookupErr);
          targetEmail = `${cleanMobile}@sskpeople.com`;
        }
      }

      // 4. Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({ 
        email: targetEmail, 
        password 
      });

      if (authError) {
        console.error("Supabase signIn error:", authError.message);
        let userFacingError = authError.message;
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          userFacingError = 'Invalid credentials. Please verify your email, mobile number, and security key.';
        }
        return { user: null, error: userFacingError };
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id, data.user);
        if (profile) {
          setUser(profile);
          return { user: profile };
        }
        // Fallback user profile from metadata if profiles record is pending
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
    // 1. Immediately reset React state synchronously so route guards never bounce
    setUser(null);

    // 2. Remove real-time channels
    try {
      supabase.removeAllChannels();
    } catch (e) {
      console.warn("Channel cleanup error:", e);
    }

    // 3. Clear all cached sessions and route memory
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

    // 5. Ensure user state remains null
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
    let profileSubscription: any = null;
    let isMounted = true;

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

    // Safety fallback timer to prevent infinite loading screen under extreme network outage
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 8000);

    const init = async () => {
      try {
        // 1. Check for mock session in sessionStorage first
        const mockSaved = sessionStorage.getItem('ssk_mock_session');
        if (mockSaved) {
          try {
            const parsed = JSON.parse(mockSaved);
            if (parsed && parsed.email && isMounted) {
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
          console.error("Supabase getSession error:", sessionError);
        }

        if (session?.user && isMounted) {
          const profile = await fetchProfile(session.user.id, session.user);

          if (isMounted) {
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
        } else if (isMounted) {
          setUser(null);
        }
      } catch (e) {
        console.error("Auth init exception:", e);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    // Listen to Supabase auth events
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user && isMounted) {
            const profile = await fetchProfile(session.user.id, session.user);
            if (isMounted) {
              if (profile) {
                setUser(profile);
                setupProfileSubscription(session.user.id);
              }
              setLoading(false);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
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
