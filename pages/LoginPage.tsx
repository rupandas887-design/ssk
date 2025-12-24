import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import { ShieldCheck, AlertCircle, AlertTriangle, Copy, Loader2, Zap, Info, Terminal, MousePointer2, Database, ShieldAlert } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [roleWarning, setRoleWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRepair, setShowRepair] = useState(false);
  
  const { login, user: currentUser } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
        const role = currentUser.role;
        if (role === Role.MasterAdmin) navigate('/admin');
        else if (role === Role.Organisation) navigate('/organisation');
        else if (role === Role.Volunteer) navigate('/volunteer');
    }
  }, [currentUser, navigate]);

  const testCredentials = [
    { label: 'Master Admin', email: 'masteradmin@ssk.com', pass: 'Ssk1919@', color: 'text-orange-500' },
    { label: 'Organisation', email: 'hubli@ssk.com', pass: 'org123', color: 'text-blue-400' },
    { label: 'Volunteer', email: 'anil@ssk.com', pass: 'vol123', color: 'text-green-400' }
  ];

  const fillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
    setErrorCode(null);
    addNotification("Credentials loaded.", "info");
  };

  const sqlMasterSeed = `-- MASTER ADMIN SEED SCRIPT
-- Run this in your Supabase SQL Editor to create the initial admin
-- Note: You MUST also create this user manually in the Auth Dashboard first.

INSERT INTO public.profiles (id, name, email, role, status)
SELECT 
    id, 
    'Master Administrator', 
    email, 
    'MasterAdmin', 
    'Active'
FROM auth.users 
WHERE email = 'masteradmin@ssk.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'MasterAdmin';`;

  const sqlRepairScript = `-- RECURSION REPAIR SCRIPT
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins have full access" ON public.profiles FOR ALL USING (public.get_my_role() = 'MasterAdmin');`;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setErrorCode(null);
    setRoleWarning(false);
    setShowRepair(false);
    setIsSubmitting(true);
    
    try {
      const result = await login(email.trim(), password);

      if (result.user) {
        const isMasterEmail = email.toLowerCase() === 'masteradmin@ssk.com';
        if (isMasterEmail && result.user.role !== Role.MasterAdmin) {
            setRoleWarning(true);
            setError(`Terminal mismatch. Detected role '${result.user.role}', but Master privileges are required.`);
            setIsSubmitting(false);
            return;
        }
      } else {
          setError(result.error || 'Identity verification failed.');
          setErrorCode(result.code || 'AUTH_FAILED');
          if (result.code === 'RECURSION_ERROR') {
              setShowRepair(true);
          }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
      if (err.message.includes('recursion')) setShowRepair(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <Card className="border-orange-900/30 bg-black/80 backdrop-blur-md relative overflow-hidden">
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
                            <div className={`p-4 rounded border ${roleWarning ? 'bg-orange-950/20 border-orange-500/30' : 'bg-red-950/20 border-red-500/30'}`}>
                                <div className={`flex items-center gap-2 font-black mb-2 text-[10px] uppercase tracking-widest ${roleWarning ? 'text-orange-400' : 'text-red-400'}`}>
                                    {roleWarning ? <AlertTriangle size={14} /> : <AlertCircle size={14} />}
                                    <span>{roleWarning ? 'Terminal Locked' : 'Denied'}</span>
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

                    {/* Quick Access Section */}
                    <div className="mt-10 pt-8 border-t border-gray-800/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Terminal size={12} className="text-gray-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Quick Access Terminal</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {testCredentials.map((cred) => (
                                <button
                                    key={cred.label}
                                    type="button"
                                    onClick={() => fillCredentials(cred.email, cred.pass)}
                                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 transition-all text-left group"
                                >
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${cred.color}`}>{cred.label}</span>
                                        <span className="text-[11px] text-gray-500 font-mono lowercase">{cred.email}</span>
                                    </div>
                                    <MousePointer2 size={14} className="text-gray-700 group-hover:text-white transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Intelligent Setup Helper */}
                {errorCode && !showRepair && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Card className="bg-orange-950/20 border-orange-500/40 p-6">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-orange-500/20 rounded-xl text-orange-500">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h3 className="text-orange-400 font-cinzel text-xl tracking-wider">Setup Diagnostic</h3>
                                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Required Actions Detected</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {errorCode === 'EMAIL_NOT_CONFIRMED' && (
                                    <div className="text-xs text-gray-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
                                        <p className="font-bold text-orange-400 mb-2 uppercase tracking-widest">Email Confirmation Active</p>
                                        Supabase requires email confirmation. Go to <b>Authentication → Providers → Email</b> and toggle <b>OFF</b> "Confirm email".
                                    </div>
                                )}
                                
                                {errorCode === 'AUTH_FAILED' && (
                                    <div className="text-xs text-gray-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
                                        <p className="font-bold text-orange-400 mb-2 uppercase tracking-widest">User Not Found</p>
                                        The user <b>{email}</b> does not exist in your Supabase Auth dashboard. 
                                        <br/><br/>
                                        1. Go to <b>Authentication → Users</b>.<br/>
                                        2. Click <b>Add user → Create new user</b>.<br/>
                                        3. Use the email and password from the terminal.
                                    </div>
                                )}

                                {errorCode === 'MISSING_PROFILE' && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-gray-300">Auth succeeded, but no database profile exists. Run this seed script in your SQL Editor:</p>
                                        <div className="bg-black/80 rounded-lg p-4 font-mono text-[9px] text-orange-400/80 mb-2 overflow-x-auto">
                                            <pre>{sqlMasterSeed}</pre>
                                        </div>
                                        <Button 
                                            variant="secondary" 
                                            onClick={() => {
                                                navigator.clipboard.writeText(sqlMasterSeed);
                                                addNotification("Seed script copied.", "success");
                                            }} 
                                            className="w-full py-2 text-[9px] font-black tracking-widest uppercase bg-orange-900/20 border-orange-500/20"
                                        >
                                            Copy Seed Script
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {showRepair && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Card className="bg-red-950/20 border-red-500/40 p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-3 bg-red-500/20 rounded-xl text-red-500 animate-pulse">
                                    <ShieldAlert size={24} />
                                </div>
                                <div>
                                    <h3 className="text-red-400 font-cinzel text-xl tracking-wider">Policy Loop</h3>
                                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Infinite Recursion Detected</p>
                                </div>
                            </div>
                            <p className="text-gray-300 text-xs leading-relaxed mb-6">
                                Your RLS policies are broken. Copy and run this script in your Supabase SQL Editor:
                            </p>
                            <div className="bg-black/80 rounded-lg p-4 font-mono text-[9px] text-red-400/80 mb-6 overflow-x-auto">
                                <pre>{sqlRepairScript}</pre>
                            </div>
                            <Button 
                                variant="secondary" 
                                onClick={() => {
                                    navigator.clipboard.writeText(sqlRepairScript);
                                    addNotification("Repair script copied.", "success");
                                }} 
                                className="w-full py-3 text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2 bg-red-900/40 border border-red-500/30 hover:bg-red-900/60"
                            >
                                <Copy size={14} />
                                Copy Repair Script
                            </Button>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default LoginPage;