
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, mapStringToRole } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import { supabase } from '../supabase/client';
import { AlertCircle, ShieldCheck, AlertTriangle, RefreshCw, Wrench, ShieldAlert, Key, Loader2 } from 'lucide-react';
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
  const { login, refreshProfile, user: currentUser } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Redirect if already logged in - uses strict role check
  useEffect(() => {
    if (currentUser) {
        const role = currentUser.role;
        if (role === Role.MasterAdmin) navigate('/admin');
        else if (role === Role.Organisation) navigate('/organisation');
        else if (role === Role.Volunteer) navigate('/volunteer');
    }
  }, [currentUser, navigate]);

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
        // Double check Master Admin identity
        const isMasterEmail = email.toLowerCase() === 'masteradmin@ssk.com';
        if (isMasterEmail && result.user.role !== Role.MasterAdmin) {
            setRoleWarning(true);
            setError(`Terminal mismatch. Detected role '${result.user.role}', but Master privileges are required here.`);
            setIsSubmitting(false);
            return;
        }
        
        // Success redirect
        const role = result.user.role;
        if (role === Role.MasterAdmin) navigate('/admin');
        else if (role === Role.Organisation) navigate('/organisation');
        else if (role === Role.Volunteer) navigate('/volunteer');
      } else {
          if (result.error === "no Profile record found") {
              setProfileMissing(true);
              setError("Identity verified, but Profile record is absent. Please use the repair tool below.");
          } else {
              setAuthFailed(true);
              setError(result.error || 'Identity verification failed.');
          }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoRepair = async () => {
    setIsRepairing(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            setError("Session expired. Please re-login.");
            setIsRepairing(false);
            return;
        }

        const isMaster = session.user.email?.toLowerCase() === 'masteradmin@ssk.com';
        const metaRole = session.user.user_metadata?.role;
        // Determine role based on metadata or master email
        const targetRoleStr = metaRole || (isMaster ? 'MasterAdmin' : 'Organisation');
        const targetRole = mapStringToRole(targetRoleStr);

        const { error: updateError } = await supabase
            .from('profiles')
            .upsert({ 
                id: session.user.id, 
                role: targetRoleStr, // Use the raw string for DB enum
                name: session.user.user_metadata?.name || (isMaster ? 'Master Admin' : 'Admin'),
                email: session.user.email,
                organisation_id: session.user.user_metadata?.organisation_id,
                status: 'Active'
            });

        if (updateError) {
            setError(`Repair failed: ${updateError.message}`);
        } else {
            addNotification(`Profile repaired as ${targetRole}.`, "success");
            await refreshProfile();
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
                
                <h1 className="font-cinzel text-3xl text-white text-center mb-1 uppercase tracking-tight">Terminal Login</h1>
                <p className="text-gray-600 text-center text-[10px] tracking-[0.4em] uppercase mb-10 font-bold">Identity Verification Required</p>
                
                <form onSubmit={handleLogin} className="space-y-5">
                    <Input 
                        label="SYSTEM EMAIL"
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@ssk.com"
                        required
                    />
                    <Input 
                        label="SECURITY KEY"
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    
                    {error && (
                        <div className={`p-4 rounded border ${ (roleWarning || profileMissing) ? 'bg-orange-950/20 border-orange-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                            <div className={`flex items-center gap-2 font-black mb-2 text-[10px] uppercase tracking-widest ${ (roleWarning || profileMissing) ? 'text-orange-400' : 'text-red-400'}`}>
                                {profileMissing ? <ShieldAlert size={14} /> : (roleWarning ? <AlertTriangle size={14} /> : <AlertCircle size={14} />)}
                                <span>{profileMissing ? 'Sync Latency' : (roleWarning ? 'Terminal Locked' : 'Denied')}</span>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed opacity-90">{error}</p>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        disabled={!email || !password || isSubmitting} 
                        className="w-full py-4 text-xs tracking-[0.2em] font-black uppercase"
                    >
                        {isSubmitting ? 'CONNECTING...' : 'INITIATE CONNECTION'}
                    </Button>
                </form>

                <div className="mt-8 pt-8 border-t border-gray-900">
                    {(profileMissing || roleWarning) && (
                        <div className="bg-orange-500/5 border border-orange-500/20 p-5 rounded-md">
                             <div className="flex items-center gap-2 text-orange-500 font-bold mb-4 text-[10px] uppercase tracking-[0.2em]">
                                <Wrench size={14} />
                                <span>Identity Maintenance</span>
                            </div>
                            <Button 
                                onClick={handleAutoRepair} 
                                disabled={isRepairing}
                                className="w-full text-[10px] py-3 flex items-center justify-center gap-2 tracking-[0.2em] font-black"
                            >
                                <RefreshCw size={14} className={isRepairing ? 'animate-spin' : ''} />
                                {isRepairing ? 'REPAIRING...' : 'REBUILD PROFILE'}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    </div>
  );
};

export default LoginPage;
