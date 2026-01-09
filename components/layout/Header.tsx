import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC<{ isLandingPage?: boolean }> = ({ isLandingPage = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="w-full bg-black py-4 md:py-8 sticky top-0 z-[100] border-b border-white/5 backdrop-blur-md bg-black/80">
      <div className="container mx-auto px-4 md:px-10 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <span className="text-xl md:text-3xl font-bold text-white font-cinzel tracking-tight">
            SSK <span className="text-[#FF6600]">PEOPLE</span>
          </span>
        </Link>
        
        <div>
          {user ? (
            <button 
              onClick={logout}
              className="px-6 md:px-10 py-2 md:py-2.5 bg-[#FF6600] text-white text-[9px] md:text-[10px] font-black uppercase rounded-[4px] tracking-widest hover:bg-[#e65c00] transition-colors"
            >
              Logout
            </button>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="px-6 md:px-10 py-2 md:py-2.5 bg-[#FF6600] text-white text-[9px] md:text-[10px] font-black uppercase rounded-[4px] tracking-widest hover:bg-[#e65c00] transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;