
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';
import { AlertCircle, HelpCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await login(email.trim(), password);

    if (result.user) {
      switch (result.user.role) {
        case Role.MasterAdmin: navigate('/admin'); break;
        case Role.Organisation: navigate('/organisation'); break;
        case Role.Volunteer: navigate('/volunteer'); break;
        default: navigate('/');
      }
    } else {
        setError(result.error || 'Login failed. Please verify your email and password.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <h1 className="font-cinzel text-2xl text-orange-500 text-center mb-6">System Login</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <Input 
                        label="Email Address"
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Masteradmin@ssk.com"
                        required
                    />
                    <Input 
                        label="Password"
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    
                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-md">
                            <div className="flex items-center gap-2 text-red-400 font-bold mb-1">
                                <AlertCircle size={16} />
                                <span>Login Issue</span>
                            </div>
                            <p className="text-red-400 text-xs leading-relaxed">{error}</p>
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        disabled={!email || !password || isSubmitting} 
                        className="w-full"
                    >
                        {isSubmitting ? 'Authenticating...' : 'Sign In'}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-800 space-y-4">
                    <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-md">
                        <div className="flex items-center gap-2 text-orange-500 font-bold mb-2 text-xs uppercase tracking-widest">
                            <HelpCircle size={14} />
                            <span>Quick Troubleshooting</span>
                        </div>
                        <ul className="text-[11px] text-gray-400 space-y-2 list-disc pl-4">
                            <li>Ensure <span className="text-white">Email Confirmation</span> is DISABLED in Supabase Auth Settings.</li>
                            <li>Verify the user exists in the <span className="text-white">Authentication &gt; Users</span> tab of your project.</li>
                            <li>Check that the <span className="text-white">profiles</span> table has a row with the matching User ID.</li>
                        </ul>
                    </div>

                    <div className="text-[10px] text-gray-600 bg-gray-900/50 p-3 rounded">
                        <p className="font-bold mb-1">DEFAULT MASTER ADMIN</p>
                        <p>User: Masteradmin@ssk.com</p>
                        <p>Pass: Ssk1919@</p>
                    </div>
                </div>
            </Card>
        </div>
    </div>
  );
};

export default LoginPage;
