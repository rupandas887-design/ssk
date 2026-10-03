import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, mapStringToRole } from '../context/AuthContext';
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
  Shield,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Activity
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      const role = mapStringToRole(currentUser.role);
      if (role === Role.MasterAdmin) navigate('/admin', { replace: true });
      else if (role === Role.Organisation) navigate('/organisation', { replace: true });
      else if (role === Role.Volunteer) navigate('/volunteer/new-member', { replace: true });
      else if (role === Role.MemberUpdates) navigate('/member-updates', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your email, 10-digit mobile number, or username.');
      return;
    }
    if (!password) {
      setError('Please enter your security password.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    
    try {
      const result = await login(cleanId, password);
      if (result.user) {
        const role = mapStringToRole(result.user.role);
        // Direct immediate navigation to prevent any mobile render cycle hang
        if (role === Role.MasterAdmin) navigate('/admin', { replace: true });
        else if (role === Role.Organisation) navigate('/organisation', { replace: true });
        else if (role === Role.Volunteer) navigate('/volunteer/new-member', { replace: true });
        else if (role === Role.MemberUpdates) navigate('/member-updates', { replace: true });
        else navigate('/', { replace: true });
        return;
      }
      
      setError(result.error || 'Identity verification failed. Please check credentials.');
      setIsSubmitting(false);
    } catch (err: any) {
      console.error("Login submission error:", err);
      setError(err.message || 'System connection failure. Please try again.');
      setIsSubmitting(false);
    }
  };

  const setPreset = (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col selection:bg-saffron-500/20">
      <Header />
      
      <div className="flex-grow flex flex-col items-center justify-center p-3.5 sm:p-6 relative">
        {/* Subtle Ambient Radial Light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full pointer-events-none opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-saffron-500/10 via-saffron-400/10 to-saffron-500/10 blur-[140px] rounded-full"></div>
        </div>

        <div className="w-full max-w-md space-y-4 sm:space-y-6 relative z-10 animate-in fade-in duration-300">
          <div className="text-center space-y-2 mb-2 sm:mb-4">
            <div className="inline-flex justify-center mb-1">
              <BrandLogo variant="light" size="lg" showSubtitle={true} />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              SSK Community Registry
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Secure Sign In for Admins, Organisations & Field Volunteers
            </p>
          </div>

          <Card className="bg-white border border-slate-200/90 p-5 sm:p-8 rounded-2xl shadow-[0_10px_35px_-5px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)]">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              <Input 
                id="login-identifier"
                label="Email / Mobile / Username"
                type="text"
                icon={<Mail size={16} />}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="masteradmin, mobile, or email"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              
              <Input 
                id="login-password"
                label="Security Key (Password)"
                type={showPassword ? 'text' : 'password'}
                icon={<Lock size={16} />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              
              {error && (
                <div className="p-3.5 rounded-xl border bg-rose-50 border-rose-200 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-bold text-xs text-rose-900">Authentication Notice</p>
                    <p className="text-rose-700 text-xs leading-relaxed break-words">{error}</p>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-2 min-h-[44px] cursor-pointer"
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

            {/* Quick helper shortcuts for testing & quick access */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
                Quick Role Credentials
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPreset('masteradmin', '123456')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-saffron-50/70 border border-slate-200/80 hover:border-saffron-300 text-slate-700 hover:text-saffron-900 font-semibold text-left transition-colors flex items-center gap-1.5"
                >
                  <UserCheck size={14} className="text-saffron-600 shrink-0" />
                  <span className="truncate">Master Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('member121@gmail.com', 'Member2026@')}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 hover:border-amber-300 text-slate-700 hover:text-amber-900 font-semibold text-left transition-colors flex items-center gap-1.5"
                >
                  <Activity size={14} className="text-amber-600 shrink-0" />
                  <span className="truncate">Member Updates</span>
                </button>
              </div>
            </div>
          </Card>
          
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium pt-1">
            <Shield size={14} className="text-saffron-600" />
            <span>End-to-End Encrypted Registry Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
