
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Header from './Header';
import ScrollingStrip from '../ui/ScrollingStrip';
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
  LayoutGrid
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Network Overview', icon: <LayoutGrid size={20} /> },
  { path: '/admin/organisations', label: 'Organizations', icon: <Map size={20} /> },
  { path: '/admin/reports', label: 'Master Registry', icon: <FileDown size={20} /> },
];

const organisationNavItems: NavItem[] = [
  { path: '/organisation', label: 'Command Hub', icon: <LayoutDashboard size={20} /> },
  { path: '/organisation/volunteers', label: 'Field Agents', icon: <Users size={20} /> },
  { path: '/organisation/reports', label: 'Organization Ledger', icon: <Database size={20} /> },
];

const volunteerNavItems: NavItem[] = [
  { path: '/volunteer', label: 'Agent Terminal', icon: <Zap size={20} /> },
  { path: '/volunteer/new-member', label: 'Enrollment', icon: <UserPlus size={20} /> },
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
                return { label: 'MASTER ADMIN', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
            case Role.Organisation:
                return { label: 'ORGANIZATION LEAD', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
            case Role.Volunteer:
                return { label: 'FIELD AGENT', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' };
            default:
                return { label: 'GUEST', color: 'text-white', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
        }
    };

    const navItems = getNavItems();
    const { label: roleLabel, color: roleColor, bg: roleBg, border: roleBorder } = getRoleConfig();

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Header />
            <ScrollingStrip />
            
            <div className="md:hidden flex items-center justify-between p-4 bg-[#0a0c14] border-b border-white/5">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 text-white hover:text-white"
                >
                    <Menu size={24} />
                </button>
                <div className={`px-4 py-1 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[9px] font-black tracking-[0.2em]`}>
                    {roleLabel}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar */}
                <aside className="w-64 bg-[#0a0c14] border-r border-white/5 hidden md:flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="mb-10 px-2">
                            <div className={`inline-block px-4 py-1.5 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[10px] font-black tracking-[0.25em] mb-8 shadow-lg shadow-black/40`}>
                                {roleLabel}
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white font-black mb-6 border-b border-white/5 pb-2">Network Navigation</p>
                            <nav className="space-y-2">
                                {navItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/admin' || item.path === '/organisation' || item.path === '/volunteer'}
                                        className={({ isActive }) =>
                                            `flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                                            isActive
                                                ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/30 font-bold'
                                                : 'text-white hover:bg-white/5 hover:text-white'
                                            }`
                                        }
                                    >
                                        <span className="shrink-0">{item.icon}</span>
                                        <span className="text-sm tracking-wide">{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black/20">
                        <div className="flex flex-col gap-4 mb-6 px-2">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-500 shadow-inner">
                                    <UserIcon size={24} strokeWidth={1.5} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-white truncate leading-tight">{user?.name}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${roleColor}`}>{roleLabel}</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-900/10 hover:bg-red-900/20 text-red-400 transition-all text-[11px] font-black tracking-[0.2em] border border-red-900/20 uppercase"
                        >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </aside>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <>
                        <div 
                          className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 md:hidden"
                          onClick={() => setIsMobileMenuOpen(false)}
                        ></div>
                        <aside className="fixed inset-y-0 left-0 w-80 bg-[#0a0c14] z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 md:hidden border-r border-white/10">
                            <div className="p-8 flex items-center justify-between border-b border-white/5">
                                <span className="text-2xl font-bold font-cinzel text-white">SSK<span className="text-orange-500">PEOPLE</span></span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white hover:text-white bg-white/5 rounded-xl">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-8 flex-1 overflow-y-auto">
                                <div className={`inline-block px-4 py-2 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[10px] font-black tracking-[0.25em] mb-10`}>
                                    {roleLabel}
                                </div>
                                <nav className="space-y-3">
                                    {navItems.map(item => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center space-x-5 p-5 rounded-2xl transition-all ${
                                                isActive
                                                    ? 'bg-orange-600 text-white shadow-2xl'
                                                    : 'text-white hover:bg-white/5'
                                                }`
                                            }
                                        >
                                            {item.icon}
                                            <span className="font-bold text-base tracking-wide">{item.label}</span>
                                        </NavLink>
                                    ))}
                                </nav>
                            </div>
                            <div className="p-8 border-t border-white/5 bg-black/40">
                                <button 
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-4 p-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition-all text-xs font-black tracking-[0.3em]"
                                >
                                    <LogOut size={20} />
                                    <span>TERMINATE SESSION</span>
                                </button>
                            </div>
                        </aside>
                    </>
                )}

                <main className="flex-1 p-6 md:p-12 overflow-y-auto bg-black custom-scrollbar">
                    <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 text-orange-500 mb-2">
                                <div className="h-1.5 w-8 bg-orange-600 rounded-full"></div>
                                <span className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-black">{roleLabel} TERMINAL</span>
                            </div>
                            <h1 className="font-cinzel text-3xl md:text-5xl text-white tracking-tighter leading-tight">{title}</h1>
                        </div>
                    </div>
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
