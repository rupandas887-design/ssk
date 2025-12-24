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

export const mapStringToRole = (roleStr: any): Role => {
    if (!roleStr) return Role.Volunteer;
    const normalized = String(roleStr).toLowerCase().trim();
    if (normalized === 'masteradmin' || normalized === 'superadmin' || normalized === 'master_admin') {
        return Role.MasterAdmin;
    }
    if (
        normalized === 'organisation' || 
        normalized === 'organization' || 
        normalized === 'admin' || 
        normalized === 'org' ||
        normalized === 'organisation_admin' ||
        normalized === 'org_admin'
    ) {
        return Role.Organisation;
    }
    return Role.Volunteer;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
          .from('profiles')
          .select(`*, organisations (name)`)
          .eq('id', userId)
          .maybeSingle();

      if (error) {
          if (error.message.includes('recursion')) {
              throw new Error('infinite recursion detected in policy for relation "profiles"');
          }
          console.error('Profile fetch error:', error.message);
          return null;
      }
      
      if (profile) {
          return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: mapStringToRole(profile.role),
              organisationId: profile.organisation_id,
              organisationName: profile.organisations?.name || null,
              mobile: profile.mobile,
              status: profile.status || 'Active'
          };
      }
    } catch (e: any) {
      if (e.message?.includes('recursion')) throw e;
    }
    return null;
  }, []);

  const refreshProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          try {
              const updatedUser = await fetchProfile(session.user.id);
              setUser(updatedUser);
          } catch (e) {
              console.error("Refresh recursion error");
          }
      }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
            try {
                const mapped = await fetchProfile(session.user.id);
                setUser(mapped);
            } catch (e) {
                console.error("Init recursion error");
            }
        }
        if (mounted) setLoading(false);
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            setUser(null);
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            try {
                const mapped = await fetchProfile(session.user.id);
                setUser(mapped);
            } catch (e) {
                console.error("Auth change recursion error");
            }
        }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<{ user: User | null; error?: string; code?: string }> => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
            email: email.trim(), 
            password: password 
        });

        if (authError) {
            return { 
                user: null, 
                error: authError.message, 
                code: authError.message.includes('confirm') ? 'EMAIL_NOT_CONFIRMED' : 'AUTH_FAILED' 
            };
        }

        if (authData.user) {
            try {
                let profile = await fetchProfile(authData.user.id);
                if (!profile) {
                    await new Promise(r => setTimeout(r, 1000));
                    profile = await fetchProfile(authData.user.id);
                }
                
                if (profile) {
                    setUser(profile);
                    return { user: profile };
                }
                return { user: null, error: "Profile record missing in database.", code: 'MISSING_PROFILE' };
            } catch (e: any) {
                return { user: null, error: e.message, code: 'RECURSION_ERROR' };
            }
        }
        return { user: null, error: "Authentication failed." };
    } catch (err: any) {
        return { user: null, error: err.message || "Unexpected error" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile, updatePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};