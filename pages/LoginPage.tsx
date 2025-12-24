import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import { 
  ShieldCheck, 
  AlertCircle, 
  AlertTriangle, 
  Copy, 
  Loader2, 
  Zap, 
  Terminal, 
  Database, 
  ExternalLink,
  ShieldAlert,
  ServerCrash
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  
  const { login, user: currentUser } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
        if (currentUser.role === Role.MasterAdmin) navigate('/admin');
        else if (currentUser.role === Role.Organisation) navigate('/organisation');
        else if (currentUser.role === Role.Volunteer) navigate('/volunteer');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setShowFixPrompt(false);
    setIsSubmitting(true);
    
    try {
      const result = await login(email.trim(), password);
      if (!result.user) {
          setError(result.error || 'Identity verification failed.');
          if (result.code === 'RECURSION_ERROR' || result.error?.toLowerCase().includes('recursion')) {
              setShowFixPrompt(true);
          }
      }
    } catch (err: any) {
      setError(err.message || 'System uplink failure.');
      setShowFixPrompt(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const metadataSqlFix = `-- 🚀 JWT METADATA BYPASS (RECURSION FIX)
-- 1. Grant MasterAdmin role to your Auth User metadata
UPDATE auth.users 
SET raw_app_metadata_content = jsonb_set(
  COALESCE(raw_app_metadata_content, '{}'::jsonb),
  '{role}',
  '"MasterAdmin"'
)
WHERE email = 'Masteradmin@ssk.com';

-- 2. Apply recursion-free policies using JWT claims
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self View" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin Power" ON public.profiles FOR ALL 
USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'MasterAdmin' );`;

  return (
    <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg space-y-6">
                <Card className="border-orange-900/30 bg-black/80 backdrop-blur-xl relative overflow-hidden shadow-[0_0_50px_-12px_rgba(255,100,0,0.3)]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                    
                    <div className="flex justify-center mb-8">
                      <div className="p-5 bg-orange-500/10 rounded-[2rem] border border-orange-500/20">
                        {isSubmitting ? <Loader2 className="text-orange-500 animate-spin" size={48} /> : <ShieldCheck className="text-orange-500" size={48} />}
                      </div>
                    </div>
                    
                    <h1 className="font-cinzel text-4xl text-white text-center mb-2 uppercase tracking-tighter">System Access</h1>
                    <p className="text-gray-600 text-center text-[10px] tracking-[0.5em] uppercase mb-12 font-black">Identity Terminal</p>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input 
                            label="SYSTEM EMAIL"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@ssk.com"
                            className="bg-black/40 border-gray-800 text-sm font-mono"
                            required
                        />
                        <Input 
                            label="SECURITY KEY"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-black/40 border-gray-800 text-sm font-mono"
                            required
                        />
                        
                        {error && (
                            <div className="p-4 rounded-xl border bg-red-950/20 border-red-500/30">
                                <div className="flex items-center gap-2 font-black mb-1 text-[10px] uppercase text-red-400">
                                    <AlertTriangle size={14} />
                                    <span>Access Denied</span>
                                </div>
                                <p className="text-gray-300 text-xs leading-relaxed">{error}</p>
                            </div>
                        )}

                        <Button type="submit" disabled={isSubmitting} className="w-full py-5 text-[11px] tracking-[0.3em] font-black uppercase shadow-xl shadow-orange-950/20">
                            {isSubmitting ? 'CONNECTING...' : 'INITIATE UPLINK'}
                        </Button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-800/50">
                        <button 
                            onClick={() => { setEmail('Masteradmin@ssk.com'); setPassword('Ssk1919@'); }}
                            className="w-full flex items-center justify-between p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-all text-left group"
                        >
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-1">Master Admin Keys</span>
                                <span className="text-xs text-gray-500 font-mono">Masteradmin@ssk.com</span>
                            </div>
                            <Terminal size={18} className="text-gray-700 group-hover:text-orange-500 transition-colors" />
                        </button>
                    </div>
                </Card>

                {showFixPrompt && (
                    <Card className="bg-orange-950/20 border-orange-500/40 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <ServerCrash size={120} />
                        </div>
                        <div className="flex items-start gap-4 mb-6 relative z-10">
                            <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-500 border border-orange-500/20">
                                <Zap size={24} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-orange-400 font-cinzel text-xl">Fix Recursion</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-black">Fastest Bypass Method</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed relative z-10">
                            The "Access Denied" error is caused by a recursive RLS policy. Use the **JWT Metadata** method to bypass the loop instantly.
                        </p>
                        
                        <div className="space-y-4 relative z-10">
                            <div className="bg-black/60 p-4 rounded-xl font-mono text-[9px] text-orange-500/70 border border-white/5 overflow-x-auto max-h-32 mb-4">
                                <pre>{metadataSqlFix}</pre>
                            </div>
                            <Button 
                                variant="secondary"
                                onClick={() => { navigator.clipboard.writeText(metadataSqlFix); addNotification("Metadata fix copied.", "success"); }}
                                className="w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <Copy size={14} /> Copy Metadata Fix
                            </Button>
                            <a 
                                href="https://supabase.com/dashboard" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full text-orange-500 text-[10px] font-black uppercase tracking-widest hover:underline"
                            >
                                Open SQL Editor <ExternalLink size={12} />
                            </a>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    </div>
  );
};

export default LoginPage;