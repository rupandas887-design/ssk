
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import { supabase } from '../supabase/client';
import { AlertCircle, Terminal, Database, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Wrench, Copy, UserX } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [roleWarning, setRoleWarning] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const { login, refreshProfile } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Check if we already have a session but no profile
  useEffect(() => {
      const checkSession = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
              setCurrentUid(session.user.id);
          }
      };
      checkSession();
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setRoleWarning(false);
    setProfileMissing(false);
    setIsSubmitting(true);
    
    try {
      const result = await login(email.trim(), password);

      if (result.user) {
        // DETECT WRONG ROLE FOR ADMIN
        const isMasterEmail = email.toLowerCase() === 'masteradmin@ssk.com';
        if (isMasterEmail && result.user.role !== Role.MasterAdmin) {
            setRoleWarning(true);
            setError(`Account found, but assigned role is '${result.user.role}'. Master Admin access requires 'MasterAdmin' role.`);
            setIsSubmitting(false);
            return;
        }
        redirectToDashboard(result.user.role);
      } else {
          // Check if error is specifically about missing profile
          if (result.error?.includes("no Profile record found")) {
              setProfileMissing(true);
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) setCurrentUid(session.user.id);
              setError("Authentication successful, but your Profile record is missing from the database.");
          } else {
              setError(result.error || 'Login failed. Please verify your credentials.');
          }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const redirectToDashboard = (role: Role) => {
    switch (role) {
      case Role.MasterAdmin: navigate('/admin'); break;
      case Role.Organisation: navigate('/organisation'); break;
      case Role.Volunteer: navigate('/volunteer'); break;
      default: navigate('/');
    }
  };

  const handleAutoRepair = async () => {
    setIsRepairing(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            setError("No active session. Please log in first.");
            setIsRepairing(false);
            return;
        }

        // Attempt direct creation/update
        const { error: updateError } = await supabase
            .from('profiles')
            .upsert({ 
                id: session.user.id, 
                role: 'MasterAdmin', 
                name: 'Master Admin',
                email: session.user.email 
            });

        if (updateError) {
            setError(`Auto-repair failed: ${updateError.message}. This usually happens when RLS (Row Level Security) is enabled. Please use the SQL script below.`);
        } else {
            addNotification("Profile recreated successfully!", "success");
            await refreshProfile();
            redirectToDashboard(Role.MasterAdmin);
        }
    } catch (err: any) {
        setError("An error occurred during auto-repair.");
    } finally {
        setIsRepairing(false);
    }
  };

  const copySql = () => {
      const uid = currentUid || 'YOUR_USER_ID';
      const sql = `-- REPAIR MASTER ADMIN PROFILE
INSERT INTO public.profiles (id, name, email, role)
VALUES ('${uid}', 'Master Admin', 'masteradmin@ssk.com', 'MasterAdmin')
ON CONFLICT (id) DO UPDATE 
SET role = 'MasterAdmin', name = 'Master Admin';`;
      
      navigator.clipboard.writeText(sql);
      addNotification("SQL Fix copied to clipboard!", "info");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md border-orange-900/20">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <ShieldCheck className="text-orange-500" size={32} />
                  </div>
                </div>
                <h1 className="font-cinzel text-2xl text-white text-center mb-1">SSK Terminal</h1>
                <p className="text-gray-500 text-center text-xs tracking-widest uppercase mb-8">Role-Based Access Control</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <Input 
                        label="Identity (Email)"
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="masteradmin@ssk.com"
                        required
                    />
                    <Input 
                        label="Security Key (Password)"
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    
                    {error && (
                        <div className={`p-4 rounded-md border ${ (roleWarning || profileMissing) ? 'bg-orange-900/10 border-orange-800/30' : 'bg-red-900/10 border-red-800/30'}`}>
                            <div className={`flex items-center gap-2 font-bold mb-1 text-[10px] uppercase tracking-wider ${ (roleWarning || profileMissing) ? 'text-orange-500' : 'text-red-500'}`}>
                                {profileMissing ? <UserX size={14} /> : (roleWarning ? <AlertTriangle size={14} /> : <AlertCircle size={14} />)}
                                <span>{profileMissing ? 'Profile Missing' : (roleWarning ? 'Role Mismatch' : 'Access Denied')}</span>
                            </div>
                            <p className={`${ (roleWarning || profileMissing) ? 'text-orange-400' : 'text-red-400'} text-[11px] leading-relaxed`}>{error}</p>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        disabled={!email || !password || isSubmitting} 
                        className="w-full py-3 shadow-lg shadow-orange-900/20 active:scale-95 transition-transform"
                    >
                        {isSubmitting ? 'Authenticating...' : 'Establish Session'}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-800 space-y-4">
                    {(roleWarning || profileMissing) && (
                        <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-md">
                             <div className="flex items-center gap-2 text-orange-500 font-bold mb-3 text-[10px] uppercase tracking-[0.2em]">
                                <Wrench size={12} />
                                <span>Emergency Recovery Tool</span>
                            </div>
                            
                            <Button 
                                onClick={handleAutoRepair} 
                                disabled={isRepairing}
                                className="w-full text-[10px] py-2 mb-4 bg-orange-700/80 hover:bg-orange-600 flex items-center justify-center gap-2 tracking-widest"
                            >
                                <RefreshCw size={12} className={isRepairing ? 'animate-spin' : ''} />
                                {isRepairing ? 'REPAIRING PROFILE...' : 'ATTEMPT AUTO-REPAIR'}
                            </Button>

                            <div className="space-y-2 relative">
                                <div className="flex justify-between items-center">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Manual SQL Override:</p>
                                    <button onClick={copySql} className="text-orange-500 hover:text-orange-400 flex items-center gap-1 text-[9px] font-bold">
                                        <Copy size={10} /> COPY FIX
                                    </button>
                                </div>
                                <pre className="text-[9px] text-orange-200/70 bg-black/40 p-3 rounded overflow-x-auto font-mono leading-relaxed border border-orange-900/20">
{`-- Run in Supabase SQL Editor
INSERT INTO profiles (id, name, email, role)
VALUES ('${currentUid || 'loading...'}', 
        'Master Admin', 
        'masteradmin@ssk.com', 
        'MasterAdmin')
ON CONFLICT (id) DO UPDATE 
SET role = 'MasterAdmin';`}
                                </pre>
                            </div>
                        </div>
                    )}

                    {!roleWarning && !profileMissing && (
                        <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-md">
                            <div className="flex items-center gap-2 text-gray-500 font-bold mb-2 text-[9px] uppercase tracking-[0.2em]">
                                <Database size={10} />
                                <span>System Status</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] text-gray-400">Database Online</span>
                                </div>
                                <span className="text-[10px] text-gray-600">v1.4.5 Build-Prod</span>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            
            <p className="mt-8 text-[10px] text-gray-600 tracking-[0.3em] uppercase">
                Secure Environment &bull; SSK People Management
            </p>
        </div>
    </div>
  );
};

export default LoginPage;
