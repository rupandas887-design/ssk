
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { supabase } from '../supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapToRole = (roleStr: any): Role => {
    if (!roleStr) return Role.Volunteer;
    const normalized = String(roleStr).toLowerCase().trim();
    if (normalized === 'masteradmin' || normalized === 'superadmin') return Role.MasterAdmin;
    if (normalized === 'organisation' || normalized === 'admin' || normalized === 'org') return Role.Organisation;
    return Role.Volunteer;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
          .from('profiles')
          .select(`
            *,
            organisations (
              name
            )
          `)
          .eq('id', userId)
          .maybeSingle();

      if (error) {
          console.error('Auth: Profile fetch error:', error.message);
          return null;
      }
      
      if (profile) {
          return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: mapToRole(profile.role),
              organisationId: profile.organisation_id,
              organisationName: profile.organisations?.name || null,
              mobile: profile.mobile,
              status: profile.status || 'Active'
          };
      }
    } catch (e) {
      console.error('Auth: Unexpected fetch error', e);
    }
    return null;
  }, []);

  const refreshProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          const updatedUser = await fetchProfile(session.user.id);
          setUser(updatedUser);
      }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
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
            const mapped = await fetchProfile(session.user.id);
            setUser(mapped);
        }
        if (mounted) setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            setUser(null);
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
            const mapped = await fetchProfile(session.user.id);
            setUser(mapped);
        }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string): Promise<{ user: User | null; error?: string }> => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
            email: email.trim(), 
            password: password 
        });

        if (authError) return { user: null, error: authError.message };

        if (authData.user) {
            // RETRY LOGIC: Try 3 times with increasing delays to handle trigger latency
            let profile = await fetchProfile(authData.user.id);
            
            if (!profile) {
                await new Promise(r => setTimeout(r, 600)); // First retry
                profile = await fetchProfile(authData.user.id);
            }
            
            if (!profile) {
                await new Promise(r => setTimeout(r, 1200)); // Second retry
                profile = await fetchProfile(authData.user.id);
            }

            if (profile) {
                setUser(profile);
                return { user: profile };
            }
            return { user: null, error: "no Profile record found" };
        }
        return { user: null, error: "Authentication failed." };
    } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred" };
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
