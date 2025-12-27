
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import { Role } from '../../types';

const Header: React.FC<{ isLandingPage?: boolean }> = ({ isLandingPage = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthAction = () => {
    if (user) {
      logout();
      navigate('/');
    } else {
      navigate('/login');
    }
  };
  
  const getDashboardPath = () => {
      if (!user) return "/";
      if (user.role === Role.MasterAdmin) return "/admin";
      if (user.role === Role.Organisation) return "/organisation";
      if (user.role === Role.Volunteer) return "/volunteer";
      return "/";
  }

  return (
    <header className={`${isLandingPage ? 'absolute' : 'relative'} top-0 left-0 right-0 z-30 p-4 md:p-6 bg-black bg-opacity-50 backdrop-blur-md`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl sm:text-2xl md:text-3xl font-bold text-white font-cinzel flex items-center gap-2">
          SSK<span className="text-orange-500">PEOPLE</span>
        </Link>
        <div className="flex items-center space-x-3 md:space-x-6">
          {user && (
            <Link to={getDashboardPath()} className="hidden sm:block text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-500 transition-colors">
              Dashboard
            </Link>
          )}
          <Button onClick={handleAuthAction} size="sm" className="px-4 md:px-6 md:py-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest">
            {user ? 'Logout' : 'Login'}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
