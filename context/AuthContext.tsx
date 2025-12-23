import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User, Role } from '../types';
import { supabase } from '../supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        // Fix: Use the correct 'INITIAL_SESSION' event type from Supabase instead of 'INITIALIZED'.
        handleAuthChange('INITIAL_SESSION', session);
        setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
    if (session?.user) {
        // Fetch the user's profile from the public.profiles table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            setUser(null);
        } else if (profile) {
            setUser({
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role as Role,
                organisationId: profile.organisation_id,
                mobile: profile.mobile,
            });
        }
    } else {
        setUser(null);
    }
    // Fix: Compare against the correct 'INITIAL_SESSION' event type instead of 'INITIALIZED'.
    if (event !== 'INITIAL_SESSION') setLoading(false);
  };

  const login = async (email: string, password: string): Promise<User | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("Login error:", error.message);
      return null;
    }
    // The onAuthStateChange listener will handle setting the user state
    // We can refetch the profile here if needed, but the listener should cover it.
     const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
    
    return profile ? {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as Role,
        organisationId: profile.organisation_id,
        mobile: profile.mobile
    } : null;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Logout error:", error.message);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
