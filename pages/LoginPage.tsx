
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
  AlertTriangle, 
  Loader2,
  Lock,
  Globe
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user: currentUser } = useAuth();
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
    setIsSubmitting(true);
    
    try {
      const result = await login(email.trim(), password);
      if (!result.user) {
          setError(result.error || 'Identity verification failed.');
      }
    } catch (err: any) {
      setError(err.message || 'System uplink failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col selection:bg-orange-500/30">
        <Header />
        
        <div className="flex-grow flex flex-col items-center justify-center p-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-orange-600/10 blur-[150px] rounded-full"></div>
            </div>

            <div className="w-full max-w-lg space-y-8 animate-in relative z-10">
                <div className="text-center space-y-3 mb-12">
                   <div className="inline-flex items-center gap-3 px-4 py-2 bg-orange-600/10 border border-orange-500/20 rounded-full text-orange-500 mb-6">
                      <Globe size={14} className="animate-spin-slow" />
                      <span className="text-[9px] font-black uppercase tracking-[0.4em]">Global Network Access</span>
                   </div>
                   <h1 className="font-cinzel text-5xl text-white tracking-tighter uppercase">SSK <span className="text-orange-600">Secure</span></h1>
                   <p className="text-gray-500 text-[10px] tracking-[0.6em] uppercase font-black">Identity Verification Terminal</p>
                </div>

                <Card className="glass-panel border-white/10 p-10 md:p-14 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)]">
                    <form onSubmit={handleLogin} className="space-y-10">
                        <div className="space-y-6">
                            <Input 
                                label="System Identification Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@sskpeople.com"
                                className="bg-black/40 border-gray-800 text-sm font-medium py-4 px-6 rounded-2xl focus:border-orange-500/50"
                                required
                            />
                            <div className="space-y-1.5">
                                <Input 
                                    label="Network Access Key"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-black/40 border-gray-800 text-sm font-medium py-4 px-6 rounded-2xl focus:border-orange-500/50"
                                    required
                                />
                                <div className="flex justify-end px-2">
                                    <button type="button" className="text-[9px] font-black uppercase tracking-widest text-gray-600 hover:text-orange-500 transition-colors">Key Recovery Protocol</button>
                                </div>
                            </div>
                        </div>
                        
                        {error && (
                            <div className="p-5 rounded-2xl border bg-red-950/20 border-red-500/30 flex items-start gap-4 animate-in">
                                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                <div className="space-y-1">
                                    <p className="font-black text-[10px] uppercase text-red-500 tracking-widest">Authentication Fault</p>
                                    <p className="text-gray-400 text-xs leading-relaxed">{error}</p>
                                </div>
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full py-6 text-[11px] tracking-[0.4em] font-black uppercase shadow-2xl bg-orange-600 hover:bg-orange-500 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Establishing Uplink...</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={20} />
                                <span>Authorize Access</span>
                              </>
                            )}
                        </Button>
                    </form>
                </Card>
                
                <p className="text-center text-[9px] font-black uppercase tracking-[0.3em] text-gray-700">
                    Proprietary Terminal • Unauthorized access will be logged
                </p>
            </div>
        </div>
    </div>
  );
};

export default LoginPage;
