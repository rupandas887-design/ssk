import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Header from './Header';
import BrandLogo from '../ui/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { 
  Users, 
  FileDown, 
  LogOut, 
  User as UserIcon, 
  LayoutDashboard, 
  UserPlus,
  X,
  Map,
  Database,
  Zap,
  LayoutGrid,
  Activity,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Loader2
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const adminNavItems: NavItem[] = [
  { path: '/admin', label: 'Network Control', icon: <LayoutGrid size={18} strokeWidth={2} /> },
  { path: '/admin/organisations', label: 'Organization Management', icon: <Map size={18} strokeWidth={2} /> },
  { path: '/admin/reports', label: 'Global Members Registry', icon: <FileDown size={18} strokeWidth={2} /> },
];

const organisationNavItems: NavItem[] = [
  { path: '/organisation', label: 'Command Terminal', icon: <LayoutDashboard size={18} strokeWidth={2} /> },
  { path: '/organisation/volunteers', label: 'Volunteers Management', icon: <Users size={18} strokeWidth={2} /> },
  { path: '/organisation/reports', label: 'Our Members’ Data Registry', icon: <Database size={18} strokeWidth={2} /> },
];

const volunteerNavItems: NavItem[] = [
  { path: '/volunteer', label: 'Volunteers Management', icon: <Zap size={18} strokeWidth={2} /> },
  { path: '/volunteer/new-member', label: 'Enrollment Hub', icon: <UserPlus size={18} strokeWidth={2} /> },
];

const memberUpdatesNavItems: NavItem[] = [
  { path: '/member-updates', label: 'Member Registry Updates', icon: <Activity size={18} strokeWidth={2} /> },
];

const SIDEBAR_STORAGE_KEY = 'ssk_dashboard_sidebar_open';

const DashboardLayout: React.FC<{ children: React.ReactNode; title: string; hideHeader?: boolean; }> = ({ children, title, hideHeader = false }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    // Remember desktop sidebar state (true = expanded w-68, false = completely hidden)
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            return saved !== null ? JSON.parse(saved) : true;
        } catch {
            return true;
        }
    });

    const toggleDesktopSidebar = () => {
        setIsDesktopSidebarOpen(prev => {
            const next = !prev;
            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
            } catch (e) {
                console.error("Storage error:", e);
            }
            return next;
        });
    };

    const handleHeaderToggle = () => {
        if (window.innerWidth < 768) {
            setIsMobileMenuOpen(prev => !prev);
        } else {
            toggleDesktopSidebar();
        }
    };

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Prevent background body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const handleLogout = async () => {
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

    const getNavItems = () => {
        if (user?.role === Role.MasterAdmin) return adminNavItems;
        if (user?.role === Role.Organisation) return organisationNavItems;
        if (user?.role === Role.Volunteer) return volunteerNavItems;
        if (user?.role === Role.MemberUpdates) return memberUpdatesNavItems;
        return [];
    };

    const getRoleConfig = () => {
        switch (user?.role) {
            case Role.MasterAdmin:
                return { label: 'Master Admin', shortLabel: 'Admin', badgeBg: 'bg-saffron-500/15 text-saffron-300 border-saffron-500/30' };
            case Role.Organisation:
                return { label: 'Organisation Lead', shortLabel: 'Org', badgeBg: 'bg-saffron-500/15 text-saffron-300 border-saffron-500/30' };
            case Role.Volunteer:
                return { label: 'Field Volunteer', shortLabel: 'Volunteer', badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
            case Role.MemberUpdates:
                return { label: 'Registry Operator', shortLabel: 'Operator', badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
            default:
                return { label: 'Authorized User', shortLabel: 'User', badgeBg: 'bg-slate-700/40 text-slate-300 border-slate-600/30' };
        }
    };

    const navItems = getNavItems();
    const { label: roleLabel, shortLabel, badgeBg } = getRoleConfig();

    return (
        <div className="min-h-screen bg-[#F5F7FB] flex flex-col text-slate-900 selection:bg-saffron-500/20">
            {/* Main Header with Toggle Button */}
            <Header 
                showSidebarToggle={true}
                isSidebarOpen={isDesktopSidebarOpen}
                onToggleSidebar={handleHeaderToggle}
            />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Desktop Sidebar: Deep Navy Gradient (#0B1020 to #111827) + Subtle Saffron Glow */}
                <aside 
                    aria-hidden={!isDesktopSidebarOpen}
                    className={`hidden md:flex flex-col relative z-30 transition-all duration-300 ease-in-out shrink-0 select-none overflow-hidden ${
                        isDesktopSidebarOpen 
                            ? 'w-68 shadow-2xl border-r border-slate-800/80 bg-gradient-to-b from-[#0B1020] via-[#0E1528] to-[#111827] text-white opacity-100' 
                            : 'w-0 border-r-0 opacity-0 pointer-events-none'
                    }`}
                >
                    {/* Subtle Saffron Glow Accent in Sidebar Corner */}
                    <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-saffron-500/10 via-saffron-400/5 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>

                    <div className="w-68 flex flex-col h-full flex-1 relative z-10">
                        {/* Sidebar Header with Brand & Collapse Button */}
                        <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-slate-800/80">
                            <div className="flex items-center overflow-hidden">
                                <BrandLogo variant="dark" size="sm" showSubtitle={false} />
                            </div>
                            <button
                                onClick={toggleDesktopSidebar}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-saffron-500/20 text-slate-400 hover:text-white transition-all active:scale-95 border border-white/5 group"
                                title="Collapse side menu"
                                aria-label="Collapse Side Menu"
                            >
                                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform text-saffron-400" />
                            </button>
                        </div>

                        {/* Scrollable Nav Area */}
                        <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                            <div>
                                {/* Role Indicator Badge */}
                                <div className="mb-5 px-1 pt-1">
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                                            <span className="text-xs font-semibold text-slate-200 truncate">
                                                {roleLabel}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeBg}`}>
                                            {shortLabel}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2 px-2.5">
                                    Navigation
                                </p>

                                {/* Nav Items List */}
                                <nav className="space-y-1.5">
                                    {navItems.map(item => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            end={item.path === '/admin' || item.path === '/organisation' || item.path === '/volunteer' || item.path === '/member-updates'}
                                            className={({ isActive }) =>
                                                `group relative flex items-center rounded-xl transition-all duration-200 px-3.5 py-3 gap-3 ${
                                                    isActive
                                                        ? 'bg-gradient-to-r from-[#FF8A00] to-[#E87500] text-black shadow-[0_4px_16px_rgba(255,138,0,0.35)] font-bold'
                                                        : 'text-slate-300 hover:bg-saffron-500/10 hover:text-white'
                                                }`
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <span className={`shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 ${
                                                        isActive ? 'text-black' : 'text-saffron-400 group-hover:text-saffron-300'
                                                    }`}>
                                                        {item.icon}
                                                    </span>
                                                    
                                                    <span className="text-xs font-medium tracking-wide leading-tight truncate">
                                                        {item.label}
                                                    </span>
                                                </>
                                            )}
                                        </NavLink>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {/* Desktop Sidebar Bottom Profile & Logout */}
                        <div className="p-3 border-t border-slate-800/80 bg-black/20 space-y-2">
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-saffron-500/20 border border-saffron-500/30 flex items-center justify-center text-saffron-300 font-bold text-xs">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={16} />}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-xs font-bold text-white truncate leading-tight">{user?.name || 'Authorized User'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                        {user?.organisationName || 'Community Network'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-all text-xs font-semibold border border-white/5 active:scale-95 group disabled:opacity-50 cursor-pointer"
                            >
                                {isLoggingOut ? <Loader2 size={14} className="animate-spin text-rose-400" /> : <LogOut size={14} className="text-slate-400 group-hover:text-rose-400 transition-colors" />}
                                <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Dynamic Viewport: #F5F7FB background with subtle visual depth */}
                <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar min-w-0 w-full transition-all duration-300 bg-[#F5F7FB] relative">
                    {/* Subtle Ambient Radial Light in main viewport */}
                    <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-gradient-to-bl from-saffron-500/[0.04] via-saffron-400/[0.02] to-transparent rounded-full blur-3xl pointer-events-none"></div>

                    {!hideHeader && (
                        <div className="mb-6 sm:mb-8 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 relative z-10">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-saffron-50 border border-saffron-200/60 text-saffron-700 text-[11px] font-bold">
                                        <ShieldCheck size={13} className="text-saffron-600" />
                                        <span>Verified Portal</span>
                                    </span>
                                    <span className="text-xs text-slate-400">·</span>
                                    <span className="text-xs font-medium text-slate-500">
                                        {roleLabel}
                                    </span>
                                </div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                                    {title}
                                </h1>
                            </div>
                            
                            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white rounded-xl border border-slate-200/80 shadow-sm shrink-0 self-start sm:self-auto">
                               <span className="relative flex h-2 w-2">
                                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                               </span>
                               <div className="flex flex-col">
                                   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database Sync</span>
                                   <span className="text-xs font-semibold text-slate-700">Live Active</span>
                               </div>
                            </div>
                        </div>
                    )}

                    <div className="max-w-7xl mx-auto min-w-0 w-full relative z-10">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Off-Canvas Drawer (Overlay) */}
            {isMobileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-slate-900/60 z-[110] backdrop-blur-sm transition-opacity duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-hidden="true"
                ></div>
                <div 
                  className="fixed inset-y-0 left-0 w-[85%] max-w-[300px] bg-gradient-to-b from-[#0B1020] via-[#0E1528] to-[#111827] text-white border-r border-slate-800 z-[120] flex flex-col shadow-2xl animate-in slide-in-from-left duration-300"
                  role="dialog"
                  aria-modal="true"
                >
                    {/* Drawer Header */}
                    <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                        <BrandLogo variant="dark" size="sm" showSubtitle={false} />
                        <button 
                            onClick={() => setIsMobileMenuOpen(false)} 
                            className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                            aria-label="Close menu"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Drawer Menu Items */}
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3 px-2">Navigation</p>
                        <nav className="space-y-1.5">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all ${
                                        isActive 
                                            ? 'bg-gradient-to-r from-[#FF8A00] to-[#E87500] text-black shadow-lg font-bold' 
                                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <span className={`${isActive ? 'text-black' : 'text-saffron-400'} shrink-0`}>{item.icon}</span>
                                            <span className="text-xs font-semibold">{item.label}</span>
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* Drawer Footer with User & Sign Out */}
                    <div className="p-4 border-t border-slate-800 bg-black/40 space-y-3">
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="h-9 w-9 rounded-lg bg-saffron-500/20 border border-saffron-500/30 flex items-center justify-center text-saffron-300 font-bold text-xs shrink-0">
                                {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={16} />}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <p className="text-xs font-bold text-white truncate leading-tight">{user?.name || 'User'}</p>
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">{roleLabel}</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                handleLogout();
                            }} 
                            disabled={isLoggingOut}
                            className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/20 rounded-xl font-semibold text-xs transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isLoggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                            <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                        </button>
                    </div>
                </div>
              </>
            )}
        </div>
    );
};

export default DashboardLayout;
