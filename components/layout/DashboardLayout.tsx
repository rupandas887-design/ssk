import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { 
  Shield, 
  Users, 
  FileDown, 
  LogOut, 
  User as UserIcon, 
  LayoutDashboard, 
  Building2, 
  UserPlus,
  Menu,
  X,
  Map,
  Database,
  ShieldCheck,
  Zap,
  LayoutGrid,
  Activity
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Network Control', icon: <LayoutGrid size={18} /> },
  { path: '/admin/organisations', label: 'Nodes / Bases', icon: <Map size={18} /> },
  { path: '/admin/reports', label: 'Master Registry', icon: <FileDown size={18} /> },
];

const organisationNavItems: NavItem[] = [
  { path: '/organisation', label: 'Command Terminal', icon: <LayoutDashboard size={18} /> },
  { path: '/organisation/volunteers', label: 'Field Agents', icon: <Users size={18} /> },
  { path: '/organisation/reports', label: 'Identity Ledger', icon: <Database size={18} /> },
];

const volunteerNavItems: NavItem[] = [
  { path: '/volunteer', label: 'Agent Terminal', icon: <Zap size={18} /> },
  { path: '/volunteer/new-member', label: 'Enrollment Hub', icon: <UserPlus size={18} /> },
];

const DashboardLayout: React.FC<{ children: React.ReactNode; title: string; }> = ({ children, title }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getNavItems = () => {
        if (user?.role === Role.MasterAdmin) return adminNavItems;
        if (user?.role === Role.Organisation) return organisationNavItems;
        if (user?.role === Role.Volunteer) return volunteerNavItems;
        return [];
    };

    const getRoleConfig = () => {
        switch (user?.role) {
            case Role.MasterAdmin:
                return { label: 'MASTER ADMIN', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
            case Role.Organisation:
                return { label: 'ORG LEAD', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
            case Role.Volunteer:
                return { label: 'FIELD AGENT', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
            default:
                return { label: 'GUEST', color: 'text-white', bg: 'bg-white/5', border: 'border-white/10' };
        }
    };

    const navItems = getNavItems();
    const { label: roleLabel, color: roleColor, bg: roleBg, border: roleBorder } = getRoleConfig();

    return (
        <div className="min-h-screen bg-black flex flex-col text-white selection:bg-orange-500/40">
            <Header />
            
            {/* Mobile Navigation Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-[#050505] border-b border-white/5">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 bg-white/5 rounded-xl text-white hover:bg-orange-600/10 transition-colors"
                >
                    <Menu size={20} />
                </button>
                <div className={`px-4 py-1.5 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[8px] font-black tracking-widest`}>
                    {roleLabel}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar */}
                <aside className="w-72 bg-[#050505] border-r border-white/5 hidden md:flex flex-col shadow-2xl relative z-30">
                    <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="mb-14">
                            <div className={`inline-block px-5 py-2 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[9px] font-black tracking-[0.3em] mb-12 shadow-xl shadow-black/50`}>
                                {roleLabel}
                            </div>
                            
                            <p className="text-[10px] uppercase tracking-[0.5em] text-gray-600 font-black mb-6 border-b border-white/5 pb-4">Terminal Navigation</p>
                            
                            <nav className="space-y-4">
                                {navItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/admin' || item.path === '/organisation' || item.path === '/volunteer'}
                                        className={({ isActive }) =>
                                            `flex items-center gap-4 px-5 py-4.5 rounded-[1.25rem] transition-all duration-500 ${
                                            isActive
                                                ? 'bg-orange-600 text-white shadow-[0_15px_30px_-10px_rgba(234,102,12,0.4)] font-bold translate-x-2'
                                                : 'text-gray-500 hover:bg-white/5 hover:text-white'
                                            }`
                                        }
                                    >
                                        <span className="shrink-0">{item.icon}</span>
                                        <span className="text-[11px] uppercase tracking-widest font-black whitespace-nowrap">{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-black/40">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-500 shadow-inner group">
                                <UserIcon size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-white truncate leading-tight">{user?.name}</p>
                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 opacity-60 ${roleColor}`}>{user?.organisationName || 'Remote Link'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-3 p-4.5 rounded-2xl bg-red-600/10 hover:bg-red-600 hover:text-white text-red-500 transition-all text-[10px] font-black tracking-[0.4em] border border-red-600/20 uppercase"
                        >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* Main Dynamic Viewport */}
                <main className="flex-1 p-4 sm:p-8 md:p-14 overflow-y-auto bg-[#020202] custom-scrollbar">
                    <div className="mb-10 md:mb-16 max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8 border-b border-white/5 pb-10 md:pb-14">
                        <div className="space-y-3 md:space-y-5">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-orange-600 animate-pulse"></div>
                                <span className="text-[8px] md:text-[11px] uppercase tracking-[0.4em] md:tracking-[0.6em] font-black text-gray-600">Secure Environment Access</span>
                            </div>
                            <h1 className="font-cinzel text-3xl md:text-6xl lg:text-7xl text-white tracking-tighter leading-none">{title}</h1>
                        </div>
                        <div className="flex items-center gap-4 md:gap-5 px-5 md:px-7 py-3 md:py-4 bg-white/[0.02] rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-3xl shadow-xl self-start lg:self-auto">
                           <Activity size={16} className="text-green-500 animate-pulse" />
                           <div className="flex flex-col">
                               <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Registry Sync</span>
                               <span className="text-[8px] md:text-[9px] font-mono text-green-500/80 uppercase">Handshake Nominal</span>
                           </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto animate-in">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-black/95 z-[110] backdrop-blur-xl animate-fade-in"
                  onClick={() => setIsMobileMenuOpen(false)}
                ></div>
                <div className="fixed inset-y-0 left-0 w-[80%] max-w-[320px] bg-[#050505] z-[120] flex flex-col shadow-[20px_0_60px_rgba(0,0,0,1)] animate-in slide-in-from-left duration-500">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xl font-cinzel font-bold text-white">SSK<span className="text-orange-500">P</span></span>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-xl">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        <nav className="space-y-3">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-4 p-4 rounded-xl transition-all ${
                                        isActive ? 'bg-orange-600 text-white shadow-2xl font-bold' : 'text-gray-400 hover:bg-white/5'
                                        }`
                                    }
                                >
                                    {item.icon}
                                    <span className="uppercase tracking-widest text-[10px] font-black">{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                    <div className="p-6 border-t border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-500">
                                <UserIcon size={18} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-white truncate leading-tight">{user?.name}</p>
                                <p className={`text-[8px] font-black uppercase tracking-widest opacity-60 ${roleColor}`}>{roleLabel}</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className="w-full p-4 bg-red-600/10 text-red-500 border border-red-600/20 rounded-xl font-black uppercase tracking-widest text-[10px]">
                            Terminate Session
                        </button>
                    </div>
                </div>
              </>
            )}
        </div>
    );
};

export default DashboardLayout;