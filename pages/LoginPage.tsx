import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import Input from '../components/ui/Input';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Fix: Make the function async to use await for the login promise.
  const handleLogin = async () => {
    setError('');
    // Fix: Await the result of the login function.
    const loggedInUser = await login(email, password);

    if (loggedInUser) {
      switch (loggedInUser.role) {
        case Role.MasterAdmin:
          navigate('/admin');
          break;
        case Role.Organisation:
          navigate('/organisation');
          break;
        case Role.Volunteer:
          navigate('/volunteer');
          break;
        default:
          navigate('/');
      }
    } else {
        setError('Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <h1 className="font-cinzel text-2xl text-orange-500 text-center mb-6">Login</h1>
                <div className="space-y-4">
                    <Input 
                        label="Email"
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                    />
                    <Input 
                        label="Password"
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                    />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <Button onClick={handleLogin} disabled={!email || !password} className="w-full">
                        Login
                    </Button>
                     <p className="text-xs text-center text-gray-500 pt-2">
                        <strong>Admin Hint:</strong> Create the Master Admin user by following the README instructions.
                        <br />
                        Email: 9844955100@ssk.com | Pass: Ssk202512
                    </p>
                </div>
            </Card>
        </div>
    </div>
  );
};

export default LoginPage;