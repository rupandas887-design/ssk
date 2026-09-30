import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import BrandLogo from '../components/ui/BrandLogo';
import CulturalLoader from '../components/ui/CulturalLoader';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Loader2,
  Lock,
  Mail,
  Shield
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
        else if (currentUser.role === Role.Volunteer) navigate('/volunteer/new-member');
        else if (currentUser.role === Role.MemberUpdates) navigate('/member-updates');
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const result = await login(email.trim(), password);
      if (!result.user) {
          setError(result.error || 'Identity verification failed. Please check credentials.');
          setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'System connection failure.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col selection:bg-saffron-500/20">
      {isSubmitting && (
        <CulturalLoader message="Verifying credentials & restoring session..." overlay={true} compact={false} />
      )}
      <Header />
      
      <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 relative">
        {/* Subtle Ambient Radial Light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full pointer-events-none opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-saffron-500/10 via-saffron-400/10 to-saffron-500/10 blur-[140px] rounded-full"></div>
        </div>

        <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in duration-300">
          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex justify-center mb-2">
              <BrandLogo variant="light" size="lg" showSubtitle={true} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              SSK Community Registry
            </h1>
          </div>

          <Card className="bg-white border border-slate-200/90 p-8 sm:p-10 rounded-2xl shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)]">
            <form onSubmit={handleLogin} className="space-y-5">
              <Input 
                label="Email / Mobile / Username"
                type="text"
                icon={<Mail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email, 10-digit mobile, or username"
                required
                autoComplete="username"
              />
              
              <Input 
                label="Security Key (Password)"
                type="password"
                icon={<Lock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              
              {error && (
                <div className="p-4 rounded-xl border bg-rose-50 border-rose-200 flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-rose-900">Authentication Failed</p>
                    <p className="text-rose-700 text-xs leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Login</span>
                  </>
                )}
              </Button>
            </form>
          </Card>
          
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium pt-2">
            <Shield size={14} className="text-saffron-600" />
            <span>End-to-End Encrypted Registry Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
