
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User, Role } from '../types';
import { supabase } from '../supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        await handleAuthChange('INITIAL_SESSION', session);
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
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            console.error('AuthChange: Error fetching profile:', error.message);
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
    if (event !== 'INITIAL_SESSION') setLoading(false);
  };

  const login = async (email: string, password: string): Promise<{ user: User | null; error?: string }> => {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
            email: email.trim(), 
            password: password 
        });

        if (authError) {
            console.error("Login: Auth error:", authError.message);
            let message = authError.message;
            if (message === 'Invalid login credentials') {
                message = "Invalid Credentials. Ensure this user exists in 'Authentication -> Users' and that 'Confirm Email' is DISABLED in Supabase settings.";
            }
            return { user: null, error: message };
        }

        if (authData.user) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError || !profile) {
                console.error("Login: Profile missing in database for ID:", authData.user.id);
                return { 
                    user: null, 
                    error: "Auth successful, but no matching Profile record found. Run the SQL to insert this ID into the 'profiles' table." 
                };
            }

            const mappedUser: User = {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role as Role,
                organisationId: profile.organisation_id,
                mobile: profile.mobile
            };
            
            setUser(mappedUser);
            return { user: mappedUser };
        }
        return { user: null, error: "An unknown authentication error occurred." };
    } catch (err: any) {
        console.error("Login: Unexpected error:", err);
        return { user: null, error: err.message || "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
