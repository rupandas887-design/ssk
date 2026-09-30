import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, Activity, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';
import { Role } from '../../types';

interface HeaderProps {
  isLandingPage?: boolean;
  showSidebarToggle?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  isLandingPage = false,
  showSidebarToggle = false,
  isSidebarOpen = true,
  onToggleSidebar
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  const getRoleBadge = (role?: Role | string) => {
    switch (role) {
      case Role.MasterAdmin:
      case 'masteradmin':
      case 'MasterAdmin':
        return { label: 'Admin', color: 'bg-saffron-50 text-saffron-700 border-saffron-200' };
      case Role.Organisation:
      case 'organisation':
      case 'Organisation':
        return { label: 'Org Lead', color: 'bg-saffron-100 text-saffron-800 border-saffron-300' };
      case Role.Volunteer:
      case 'volunteer':
      case 'Volunteer':
        return { label: 'Volunteer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case Role.MemberUpdates:
      case 'memberupdates':
      case 'MemberUpdates':
        return { label: 'Operator', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Member', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <header className="w-full bg-white/85 py-3 sm:py-3.5 sticky top-0 z-[100] border-b border-slate-200/80 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-3 sm:gap-4">
          {showSidebarToggle && (
            <button 
              onClick={onToggleSidebar}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100/80 hover:bg-saffron-50 text-slate-600 hover:text-saffron-600 border border-slate-200/60 hover:border-saffron-200 transition-all active:scale-95 flex items-center gap-2 group"
              title={isSidebarOpen ? "Collapse Navigation" : "Expand Navigation"}
              aria-label={isSidebarOpen ? "Collapse Navigation" : "Expand Navigation"}
            >
              <Menu size={18} className="text-slate-700 group-hover:text-saffron-600 transition-colors" />
              <span className="hidden sm:inline text-xs font-semibold text-slate-600 group-hover:text-saffron-600">
                {isSidebarOpen ? "Collapse" : "Menu"}
              </span>
            </button>
          )}

          <Link to="/" className="flex items-center transition-opacity hover:opacity-90">
            <BrandLogo variant="light" size="sm" showSubtitle={false} />
          </Link>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Live Nominal System Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/70 text-slate-600 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-700">Registry Active</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 pl-2">
                <div className="w-8 h-8 rounded-full bg-saffron-50 border border-saffron-200/70 flex items-center justify-center text-saffron-600 font-bold text-xs shadow-inner">
                  {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={14} />}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                    {user.name || 'User'}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border mt-0.5 inline-block w-fit ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-white text-slate-700 hover:text-rose-600 text-xs font-semibold rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 transition-all active:scale-95 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isLoggingOut ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <LogOut size={14} />}
                <span className="hidden sm:inline">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-4 sm:px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E87500] hover:from-[#E87500] hover:to-[#C65E00] text-black text-xs sm:text-sm font-bold rounded-xl shadow-[0_4px_14px_rgba(255,138,0,0.25)] hover:shadow-[0_6px_20px_rgba(255,138,0,0.35)] transition-all active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;