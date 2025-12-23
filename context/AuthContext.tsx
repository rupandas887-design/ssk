
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User, Role } from '../types';
import { supabase } from '../supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely map database string to Role enum
const mapToRole = (roleStr: string): Role => {
    const normalized = roleStr?.toLowerCase();
    if (normalized === 'masteradmin') return Role.MasterAdmin;
    if (normalized === 'organisation') return Role.Organisation;
    return Role.Volunteer;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Auth: Error fetching profile:', error.message);
        return null;
    }
    
    if (profile) {
        return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: mapToRole(profile.role),
            organisationId: profile.organisation_id,
            mobile: profile.mobile,
        };
    }
    return null;
  };

  const refreshProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          const updatedUser = await fetchProfile(session.user.id);
          setUser(updatedUser);
      }
  };

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            const mapped = await fetchProfile(session.user.id);
            setUser(mapped);
        }
        setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            const mapped = await fetchProfile(session.user.id);
            setUser(mapped);
        } else {
            setUser(null);
        }
        if (event !== 'INITIAL_SESSION') setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ user: User | null; error?: string }> => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
            email: email.trim(), 
            password: password 
        });

        if (authError) {
            let message = authError.message;
            if (message === 'Invalid login credentials') {
                message = "Invalid login credentials. Ensure 'Confirm Email' is OFF in Supabase Auth settings.";
            }
            return { user: null, error: message };
        }

        if (authData.user) {
            const mappedUser = await fetchProfile(authData.user.id);
            if (!mappedUser) {
                return { 
                    user: null, 
                    error: "Auth successful, but no Profile record found. Check your SQL trigger 'handle_new_user'." 
                };
            }
            setUser(mappedUser);
            return { user: mappedUser };
        }
        return { user: null, error: "An unknown authentication error occurred." };
    } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
