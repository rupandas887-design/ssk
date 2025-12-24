
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

  // Fix: Explicitly typed fetchProfile return type to Promise<User | null> to resolve setUser type errors.
  const fetchProfile = useCallback(async (userId: string, authUser?: any): Promise<User | null> => {
    try {
      // Step 1: Try to get role from Auth Metadata (Fastest, Bypass RLS issues)
      const metadataRole = authUser?.app_metadata?.role || authUser?.user_metadata?.role;
      
      const { data: profile, error } = await supabase
          .from('profiles')
          .select(`*, organisations (name)`)
          .eq('id', userId)
          .maybeSingle();

      if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('recursion') || msg.includes('infinite loop')) {
              // If recursion happens, we fallback strictly to Auth Metadata
              if (metadataRole && authUser) {
                  return {
                      id: authUser.id,
                      name: authUser.user_metadata?.name || 'Authorized User',
                      email: authUser.email || '',
                      role: mapStringToRole(metadataRole),
                      status: 'Active'
                  };
              }
              throw new Error('RLS_RECURSION_ERROR');
          }
          return null;
      }
      
      if (profile) {
          return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: mapStringToRole(profile.role || metadataRole),
              organisationId: profile.organisation_id,
              organisationName: profile.organisations?.name || undefined,
              mobile: profile.mobile,
              status: (profile.status as 'Active' | 'Deactivated') || 'Active'
          };
      } else if (authUser) {
          // Fallback if profile row doesn't exist yet but user is authenticated
          return {
              id: authUser.id,
              name: authUser.user_metadata?.name || 'Authorized User',
              email: authUser.email || '',
              role: mapStringToRole(metadataRole),
              status: 'Active'
          };
      }
    } catch (e: any) {
      if (e.message === 'RLS_RECURSION_ERROR') throw e;
      console.error("Profile sync fault:", e);
    }
    return null;
  }, []);

  const login = async (email: string, password: string): Promise<{ user: User | null; error?: string; code?: string }> => {
    try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ 
            email: email.trim().toLowerCase(), 
            password 
        });

        if (authError) return { user: null, error: authError.message };

        if (data.user) {
            try {
                const profile = await fetchProfile(data.user.id, data.user);
                if (profile) {
                    setUser(profile);
                    return { user: profile };
                }
                return { user: null, error: "Identity verified but profile node is unreachable.", code: 'SYNC_ERROR' };
            } catch (e: any) {
                if (e.message === 'RLS_RECURSION_ERROR') {
                    return { user: null, error: "Database Security Loop Detected. Access Denied by RLS.", code: 'RECURSION_ERROR' };
                }
                return { user: null, error: e.message };
            }
        }
        return { user: null, error: "Handshake failed." };
    } catch (err: any) {
        return { user: null, error: err.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshProfile = useCallback(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          const updatedUser = await fetchProfile(session.user.id, session.user);
          setUser(updatedUser);
      }
  }, [fetchProfile]);

  const updatePassword = async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
  }

  useEffect(() => {
    const init = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            try {
                const mapped = await fetchProfile(session.user.id, session.user);
                setUser(mapped);
            } catch (e) {
                console.error("Auth init error:", e);
            }
        }
        setLoading(false);
    };
    init();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile, updatePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be wrapped in AuthProvider');
  return context;
};
