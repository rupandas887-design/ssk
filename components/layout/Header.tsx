
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
      switch(user.role) {
          case Role.MasterAdmin: return "/admin";
          case Role.Organisation: return "/organisation";
          case Role.Volunteer: return "/volunteer";
          default: return "/";
      }
  }

  return (
    <header className={`${isLandingPage ? 'absolute' : 'relative'} top-0 left-0 right-0 z-10 p-4 bg-black bg-opacity-50`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl md:text-3xl font-bold text-white font-cinzel">
          SSK<span className="text-orange-500">PEOPLE</span>
        </Link>
        <div className="flex items-center space-x-4">
          {user && <Link to={getDashboardPath()} className="text-gray-300 hover:text-orange-500 transition-colors">Dashboard</Link>}
          <Button onClick={handleAuthAction}>
            {user ? 'Logout' : 'Login'}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
