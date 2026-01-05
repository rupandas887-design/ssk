
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
  ShieldAlert
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Network Overview', icon: <LayoutDashboard size={20} /> },
  { path: '/admin/organisations', label: 'Sector Units', icon: <Map size={20} /> },
  { path: '/admin/reports', label: 'Master Registry', icon: <FileDown size={20} /> },
];

const organisationNavItems: NavItem[] = [
  { path: '/organisation', label: 'Sector Hub', icon: <LayoutDashboard size={20} /> },
  { path: '/organisation/volunteers', label: 'Field Agents', icon: <Users size={20} /> },
  { path: '/organisation/reports', label: 'Sector Reports', icon: <FileDown size={20} /> },
];

const volunteerNavItems: NavItem[] = [
  { path: '/volunteer', label: 'Agent Terminal', icon: <LayoutDashboard size={20} /> },
  { path: '/volunteer/new-member', label: 'Enroll Member', icon: <UserPlus size={20} /> },
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
                return { label: 'SECTOR UNIT', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
            case Role.Volunteer:
                return { label: 'FIELD AGENT', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
            default:
                return { label: 'GUEST', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
        }
    };

    const navItems = getNavItems();
    const { label: roleLabel, color: roleColor, bg: roleBg, border: roleBorder } = getRoleConfig();

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Header />
            
            <div className="md:hidden flex items-center justify-between p-4 bg-gray-950 border-b border-white/5">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 text-gray-400 hover:text-white"
                >
                    <Menu size={24} />
                </button>
                <div className={`px-3 py-1 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[9px] font-black tracking-widest`}>
                    {roleLabel}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                <aside className="w-64 bg-gray-900 border-r border-gray-800 hidden md:flex flex-col">
                    <div className="p-4 flex-1">
                        <div className="mb-8 px-2">
                            <div className={`inline-block px-3 py-1 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[10px] font-black tracking-[0.25em] mb-6`}>
                                {roleLabel}
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-4">Network Navigation</p>
                            <nav className="space-y-1">
                                {navItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/admin' || item.path === '/organisation' || item.path === '/volunteer'}
                                        className={({ isActive }) =>
                                            `flex items-center space-x-3 p-3 rounded-md transition-all duration-200 ${
                                            isActive
                                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'
                                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                            }`
                                        }
                                    >
                                        {item.icon}
                                        <span className="font-medium text-sm">{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                        <div className="flex flex-col gap-3 mb-4 px-2">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                    <UserIcon size={20} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-white truncate leading-tight">{user?.name}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${roleColor}`}>{roleLabel}</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-red-900/10 hover:bg-red-900/20 text-red-400 transition-all text-xs font-bold border border-red-900/20 hover:border-red-900/40"
                        >
                            <LogOut size={14} />
                            <span>TERMINATE SESSION</span>
                        </button>
                    </div>
                </aside>

                {isMobileMenuOpen && (
                    <>
                        <div 
                          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
                          onClick={() => setIsMobileMenuOpen(false)}
                        ></div>
                        <aside className="fixed inset-y-0 left-0 w-72 bg-gray-950 z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 md:hidden border-r border-white/5">
                            <div className="p-6 flex items-center justify-between border-b border-white/5">
                                <span className="text-xl font-bold font-cinzel text-white">SSK<span className="text-orange-500">PEOPLE</span></span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className={`inline-block px-3 py-1 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[9px] font-black tracking-[0.2em] mb-8`}>
                                    {roleLabel}
                                </div>
                                <nav className="space-y-2">
                                    {navItems.map(item => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center space-x-4 p-4 rounded-xl transition-all ${
                                                isActive
                                                    ? 'bg-orange-600 text-white shadow-xl'
                                                    : 'text-gray-400 hover:bg-white/5'
                                                }`
                                            }
                                        >
                                            {item.icon}
                                            <span className="font-bold text-sm">{item.label}</span>
                                        </NavLink>
                                    ))}
                                </nav>
                            </div>
                            <div className="p-6 border-t border-white/5 bg-black/40">
                                <button 
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all text-xs font-black tracking-widest"
                                >
                                    <LogOut size={16} />
                                    <span>SIGN OUT</span>
                                </button>
                            </div>
                        </aside>
                    </>
                )}

                <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-black custom-scrollbar">
                    <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-orange-500 mb-1">
                                <div className="h-1 w-6 bg-orange-600 rounded-full"></div>
                                <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black">{roleLabel} TERMINAL</span>
                            </div>
                            <h1 className="font-cinzel text-2xl md:text-4xl text-white tracking-tight leading-tight">{title}</h1>
                        </div>
                    </div>
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
