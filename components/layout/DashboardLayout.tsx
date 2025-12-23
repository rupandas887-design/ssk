
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { Shield, Users, BarChart2, UserPlus, FileDown } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: <BarChart2 size={20} /> },
  { path: '/admin/organisations', label: 'Organisations', icon: <Shield size={20} /> },
  { path: '/admin/reports', label: 'Reports', icon: <FileDown size={20} /> },
];

const orgNavItems: NavItem[] = [
  { path: '/organisation', label: 'Dashboard', icon: <BarChart2 size={20} /> },
  { path: '/organisation/volunteers', label: 'Volunteers', icon: <Users size={20} /> },
  { path: '/organisation/reports', label: 'Reports', icon: <FileDown size={20} /> },
];

const volunteerNavItems: NavItem[] = [
  { path: '/volunteer', label: 'My Submissions', icon: <Users size={20} /> },
  { path: '/volunteer/new-member', label: 'New Member', icon: <UserPlus size={20} /> },
];


const DashboardLayout: React.FC<{ children: React.ReactNode; title: string; }> = ({ children, title }) => {
    const { user } = useAuth();
    const location = useLocation();

    let navItems: NavItem[] = [];
    if (user?.role === Role.MasterAdmin) navItems = adminNavItems;
    else if (user?.role === Role.Organisation) navItems = orgNavItems;
    else if (user?.role === Role.Volunteer) navItems = volunteerNavItems;

    return (
        <div className="min-h-screen bg-black">
            <Header />
            <div className="flex">
                <aside className="w-64 bg-gray-900 p-4 border-r border-gray-800 hidden md:block">
                    <nav className="space-y-2">
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/admin' || item.path === '/organisation' || item.path === '/volunteer'}
                                className={({ isActive }) =>
                                    `flex items-center space-x-3 p-2 rounded-md transition-colors ${
                                    isActive
                                        ? 'bg-orange-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`
                                }
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1 p-6 lg:p-10">
                    <h1 className="font-cinzel text-3xl text-orange-500 mb-6">{title}</h1>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
