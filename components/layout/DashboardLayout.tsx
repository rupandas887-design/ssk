
import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { Shield, Users, BarChart2, UserPlus, FileDown, LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { path: '/admin/organisations', label: 'Organisations', icon: <Shield size={20} /> },
  { path: '/admin/reports', label: 'Reports', icon: <FileDown size={20} /> },
];

const orgNavItems: NavItem[] = [
  { path: '/organisation', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { path: '/organisation/volunteers', label: 'Volunteers', icon: <Users size={20} /> },
  { path: '/organisation/reports', label: 'Reports', icon: <FileDown size={20} /> },
];

const volunteerNavItems: NavItem[] = [
  { path: '/volunteer', label: 'My Submissions', icon: <Users size={20} /> },
  { path: '/volunteer/new-member', label: 'Enroll Member', icon: <UserPlus size={20} /> },
];

const DashboardLayout: React.FC<{ children: React.ReactNode; title: string; }> = ({ children, title }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    let navItems: NavItem[] = [];
    let roleLabel = '';
    let roleColor = 'text-orange-500';
    let roleBg = 'bg-orange-500/10';
    let roleBorder = 'border-orange-500/20';
    
    if (user?.role === Role.MasterAdmin) {
        navItems = adminNavItems;
        roleLabel = 'MASTER ADMIN';
    } else if (user?.role === Role.Organisation) {
        navItems = orgNavItems;
        roleLabel = 'ADMIN';
        roleColor = 'text-orange-400';
    } else if (user?.role === Role.Volunteer) {
        navItems = volunteerNavItems;
        roleLabel = 'VOLUNTEER';
        roleColor = 'text-blue-500';
        roleBg = 'bg-blue-500/10';
        roleBorder = 'border-blue-500/20';
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-gray-900 border-r border-gray-800 hidden md:flex flex-col">
                    <div className="p-4 flex-1">
                        <div className="mb-8 px-2">
                            <div className={`inline-block px-3 py-1 rounded-full border ${roleBg} ${roleColor} ${roleBorder} text-[10px] font-black tracking-[0.25em] mb-6`}>
                                {roleLabel}
                            </div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-4">Dashboard Menu</p>
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

                    {/* Sidebar User Profile & Logout */}
                    <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="h-10 w-10 rounded-full bg-orange-600/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                <UserIcon size={20} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-white truncate leading-tight">{user?.name}</p>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${roleColor}`}>{roleLabel}</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-md bg-red-900/10 hover:bg-red-900/20 text-red-400 transition-all text-xs font-bold border border-red-900/20 hover:border-red-900/40"
                        >
                            <LogOut size={14} />
                            <span>SIGN OUT</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-black">
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-orange-500 mb-1">
                                <div className="h-1 w-6 bg-orange-600 rounded-full"></div>
                                <span className="text-[10px] uppercase tracking-[0.3em] font-black">{roleLabel} ACCESS LEVEL</span>
                            </div>
                            <h1 className="font-cinzel text-3xl lg:text-4xl text-white tracking-tight">{title}</h1>
                        </div>
                        <div className="md:hidden">
                            <button 
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-900/20 text-red-400 text-xs font-bold border border-red-900/30 w-full justify-center"
                            >
                                <LogOut size={14} />
                                <span>SIGN OUT</span>
                            </button>
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
