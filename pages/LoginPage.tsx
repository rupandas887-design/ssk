
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import { supabase } from '../supabase/client';
import { AlertCircle, ShieldCheck, AlertTriangle, RefreshCw, Wrench, Copy, ShieldAlert, Key, Loader2 } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [roleWarning, setRoleWarning] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const { login, refreshProfile } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Speed optimization: Auto-redirect if already logged in and role is correct
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // We have a session, let's refresh and redirect
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile) {
          redirectToDashboard(mapToRole(profile.role));
        }
      }
    };
    checkAuth();
  }, []);

  const mapToRole = (roleStr: any): Role => {
    const normalized = String(roleStr || '').toLowerCase().trim();
    if (normalized === 'masteradmin') return Role.MasterAdmin;
    if (normalized === 'organisation' || normalized === 'admin') return Role.Organisation;
    return Role.Volunteer;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setRoleWarning(false);
    setProfileMissing(false);
    setAuthFailed(false);
    setIsSubmitting(true);
    
    try {
      const result = await login(email.trim(), password);

      if (result.user) {
        // Special logic for Master Admin email
        const isMasterEmail = email.toLowerCase() === 'masteradmin@ssk.com';
        if (isMasterEmail && result.user.role !== Role.MasterAdmin) {
            setRoleWarning(true);
            setError(`Identity confirmed, but role '${result.user.role}' detected. Master Admin level required.`);
            setIsSubmitting(false);
            return;
        }
        redirectToDashboard(result.user.role);
      } else {
          if (result.error === "no Profile record found") {
              setProfileMissing(true);
              setError("Identity verified, but Profile record is absent in database.");
          } else {
              setAuthFailed(true);
              setError(result.error || 'Identity verification failed. Invalid credentials.');
          }
      }
    } catch (err: any) {
      setError(err.message || 'Fatal system error during authentication.');
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
            setError("No active session detected. Please sign in again.");
            setIsRepairing(false);
            return;
        }

        // Determine correct role based on email or context
        const targetRole = session.user.email?.toLowerCase() === 'masteradmin@ssk.com' ? 'MasterAdmin' : 'Organisation';

        const { error: updateError } = await supabase
            .from('profiles')
            .upsert({ 
                id: session.user.id, 
                role: targetRole, 
                name: targetRole === 'MasterAdmin' ? 'Master Admin' : 'Org Admin',
                email: session.user.email 
            });

        if (updateError) {
            setError(`Repair failed: ${updateError.message}.`);
        } else {
            addNotification(`Role synchronized to ${targetRole}.`, "success");
            await refreshProfile();
            redirectToDashboard(mapToRole(targetRole));
        }
    } catch (err: any) {
        setError("Repair sequence interrupted.");
    } finally {
        setIsRepairing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md border-orange-900/30 bg-black/80 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-orange-500/10 rounded-full border border-orange-500/20">
                    {isSubmitting ? <Loader2 className="text-orange-500 animate-spin" size={40} /> : <ShieldCheck className="text-orange-500" size={40} />}
                  </div>
                </div>
                
                <h1 className="font-cinzel text-3xl text-white text-center mb-1">SSK TERMINAL</h1>
                <p className="text-gray-600 text-center text-[10px] tracking-[0.4em] uppercase mb-10 font-bold">Secure Access Node</p>
                
                <form onSubmit={handleLogin} className="space-y-5">
                    <Input 
                        label="ACCESS IDENTITY (EMAIL)"
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@ssk.com"
                        className="bg-black/50 border-gray-800 text-sm"
                        required
                    />
                    <Input 
                        label="SECURITY KEY (PASSWORD)"
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="bg-black/50 border-gray-800 text-sm"
                        required
                    />
                    
                    {error && (
                        <div className={`p-4 rounded border ${ (roleWarning || profileMissing) ? 'bg-orange-950/20 border-orange-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                            <div className={`flex items-center gap-2 font-black mb-2 text-[10px] uppercase tracking-widest ${ (roleWarning || profileMissing) ? 'text-orange-400' : 'text-red-400'}`}>
                                {profileMissing ? <ShieldAlert size={14} /> : (roleWarning ? <AlertTriangle size={14} /> : <AlertCircle size={14} />)}
                                <span>{profileMissing ? 'Sync Error' : (roleWarning ? 'Access Denied' : 'Auth Error')}</span>
                            </div>
                            <p className={`${ (roleWarning || profileMissing) ? 'text-orange-200' : 'text-red-200'} text-xs leading-relaxed opacity-80`}>{error}</p>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        disabled={!email || !password || isSubmitting} 
                        className="w-full py-4 text-xs tracking-[0.2em] font-black uppercase shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all"
                    >
                        {isSubmitting ? 'VERIFYING...' : 'INITIATE CONNECTION'}
                    </Button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-900 space-y-4">
                    {(authFailed || roleWarning || profileMissing) && (
                        <div className="bg-orange-500/5 border border-orange-500/20 p-5 rounded-md">
                             <div className="flex items-center gap-2 text-orange-500 font-bold mb-4 text-[10px] uppercase tracking-[0.2em]">
                                <Wrench size={14} />
                                <span>Identity Repair Suite</span>
                            </div>
                            <Button 
                                onClick={handleAutoRepair} 
                                disabled={isRepairing}
                                className="w-full text-[10px] py-3 bg-orange-700/80 hover:bg-orange-600 flex items-center justify-center gap-2 tracking-[0.2em] font-black"
                            >
                                <RefreshCw size={14} className={isRepairing ? 'animate-spin' : ''} />
                                {isRepairing ? 'REPAIRING IDENTITY...' : 'FIX PROFILE & ROLE'}
                            </Button>
                        </div>
                    )}

                    {authFailed && (
                        <div className="bg-blue-950/10 border border-blue-900/20 p-5 rounded-md mt-4">
                            <div className="flex items-center gap-2 text-blue-400 font-bold mb-4 text-[10px] uppercase tracking-[0.2em]">
                                <Key size={14} />
                                <span>Auth Recovery</span>
                            </div>
                            <ul className="text-[11px] text-gray-500 space-y-3">
                                <li>Check email spelling carefully.</li>
                                <li>Default admin password: <b className="text-orange-500">Ssk1919@</b></li>
                            </ul>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    </div>
  );
};

export default LoginPage;
