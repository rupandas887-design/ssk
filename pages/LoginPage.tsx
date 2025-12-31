
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
  Loader2
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
                </Card>
            </div>
        </div>
    </div>
  );
};

export default LoginPage;
