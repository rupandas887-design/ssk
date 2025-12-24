import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Building2, User as UserIcon, Phone, ShieldCheck, Mail, Info, Activity, Globe } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Member, Role, User as VolunteerUser, Organisation } from '../../types';

const OrganisationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myVolunteers, setMyVolunteers] = useState<VolunteerUser[]>([]);
    const [myMembers, setMyMembers] = useState<Member[]>([]);
    const [orgDetails, setOrgDetails] = useState<Organisation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.organisationId) return;
            setLoading(true);
            
            try {
                const [orgRes, volsRes, membersRes] = await Promise.all([
                    supabase.from('organisations').select('*').eq('id', user.organisationId).single(),
                    supabase.from('profiles').select('*').eq('role', Role.Volunteer).eq('organisation_id', user.organisationId),
                    supabase.from('members').select('*').eq('organisation_id', user.organisationId)
                ]);
                
                if (orgRes.data) setOrgDetails(orgRes.data);
                if (volsRes.data) setMyVolunteers(volsRes.data);
                if (membersRes.data) setMyMembers(membersRes.data);
            } catch (error) {
                console.error("Dashboard Sync Error:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user]);

    return (
        <DashboardLayout title="Entity Terminal">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-32 gap-6">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Syncing Terminal Node...</p>
                </div>
             ) : (
            <div className="space-y-10">
                {/* Premium Identity Banner */}
                <div className="relative overflow-hidden p-8 lg:p-14 rounded-[3rem] border border-white/5 bg-[#050505] shadow-[0_0_50px_-12px_rgba(255,100,0,0.1)]">
                    {/* Background Visuals */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-500/5 blur-[150px] -mr-64 -mt-64 rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] -ml-32 -mb-32 rounded-full pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col xl:flex-row gap-12 items-start xl:items-center">
                        {/* Organisation Master Card */}
                        <div className="flex-1 flex gap-10 items-start">
                            <div className="p-10 bg-gradient-to-br from-orange-600/20 to-orange-950/40 rounded-[2.5rem] border border-orange-500/20 text-orange-500 shadow-2xl shadow-orange-950/30 group hover:rotate-2 transition-all duration-700">
                                <Building2 size={84} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Globe className="text-orange-500/60 animate-spin-slow" size={14} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-500/80">Operational Network Node</p>
                                    </div>
                                    <h2 className="font-cinzel text-4xl lg:text-7xl text-white tracking-tighter leading-none mb-2">
                                        {orgDetails?.name || user?.organisationName}
                                    </h2>
                                </div>
                                
                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center gap-5 px-8 py-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-2xl group hover:border-orange-500/40 transition-colors">
                                        <Phone size={24} className="text-orange-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase font-black text-gray-500 tracking-[0.2em]">Hotline</span>
                                            <span className="text-lg font-mono text-gray-200 tracking-wider">{orgDetails?.mobile || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5 px-8 py-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-2xl">
                                        <ShieldCheck size={24} className="text-green-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase font-black text-gray-500 tracking-[0.2em]">Status</span>
                                            <span className="text-[11px] font-black uppercase text-green-400 tracking-widest">{orgDetails?.status || 'Active'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Principal Section */}
                        <div className="xl:w-[460px] p-12 bg-white/[0.02] rounded-[3rem] border border-white/10 shadow-3xl backdrop-blur-3xl group hover:border-orange-500/20 transition-all duration-500">
                            <div className="flex items-center gap-8">
                                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-white/50 group-hover:scale-105 group-hover:text-orange-500 transition-all duration-500 shadow-inner">
                                    <UserIcon size={44} strokeWidth={1} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Access Principal</p>
                                    <h2 className="font-cinzel text-3xl text-white truncate mb-2">{orgDetails?.secretary_name || user?.name}</h2>
                                    <div className="flex items-center gap-2 opacity-60">
                                        <Mail size={16} className="text-orange-500" />
                                        <span className="text-[12px] text-gray-400 truncate tracking-wide font-mono lowercase">{user?.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase text-gray-600 tracking-[0.3em]">Clearance</span>
                                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-1">Tier 1 Admin</span>
                                </div>
                                <Activity className="text-orange-500/30 animate-pulse" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <Card className="group relative overflow-hidden p-12 bg-gradient-to-br from-gray-900/40 to-black border-white/5 hover:border-orange-500/30 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all duration-700 -rotate-6 group-hover:rotate-0">
                            <Users size={180} />
                        </div>
                        <div className="flex items-center space-x-12 relative z-10">
                            <div className="p-8 bg-orange-500/10 rounded-3xl text-orange-500 group-hover:bg-orange-500/20 transition-colors shadow-xl">
                                <Users size={64} strokeWidth={1} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Field Agent Force</p>
                                <div className="flex items-baseline gap-5">
                                    <p className="text-8xl font-black text-white leading-none tracking-tighter">{myVolunteers.length}</p>
                                    <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">Active</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="group relative overflow-hidden p-12 bg-gradient-to-br from-gray-900/40 to-black border-white/5 hover:border-blue-500/30 transition-all duration-500 shadow-2xl">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-all duration-700 rotate-6 group-hover:rotate-0">
                            <UserCheck size={180} />
                        </div>
                        <div className="flex items-center space-x-12 relative z-10">
                            <div className="p-8 bg-blue-500/10 rounded-3xl text-blue-500 group-hover:bg-blue-500/20 transition-colors shadow-xl">
                                <UserCheck size={64} strokeWidth={1} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Drive Enrollments</p>
                                <div className="flex items-baseline gap-5">
                                    <p className="text-8xl font-black text-white leading-none tracking-tighter">{myMembers.length}</p>
                                    <span className="text-[11px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Verified</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Insights Panel */}
                <Card className="border-l-4 border-l-orange-600 bg-[#080808] p-12 shadow-3xl">
                    <div className="flex items-center gap-6 mb-10">
                         <div className="p-4 bg-orange-600/10 rounded-2xl text-orange-500 border border-orange-500/10">
                            <Activity size={32} />
                         </div>
                         <h3 className="font-cinzel text-3xl text-white tracking-widest uppercase">Drive Intelligence</h3>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-16">
                        <div className="lg:col-span-2 space-y-8">
                            <p className="text-gray-400 text-xl leading-relaxed font-light">
                                The SSK People master registry for <b className="text-white font-black">{orgDetails?.name || user?.organisationName}</b> is successfully synchronizing with high-priority community data. 
                                Your established network of <b className="text-orange-500">{myVolunteers.length}</b> field agents has cataloged <b className="text-orange-500">{myMembers.length}</b> community members in the current operational cycle.
                            </p>
                            <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 w-fit">
                                <Info className="text-orange-500" size={18} />
                                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-[0.2em] leading-none">System Status: Fully Operational Core</p>
                            </div>
                        </div>
                        <div className="bg-black/40 p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-center text-center shadow-inner relative group overflow-hidden">
                            <div className="absolute inset-0 bg-orange-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                            <p className="relative z-10 text-[10px] font-black uppercase text-gray-600 tracking-[0.4em] mb-4">Agent Productivity Matrix</p>
                            <p className="relative z-10 text-8xl font-black text-white leading-none tracking-tighter">
                                {myVolunteers.length > 0 ? (myMembers.length / myVolunteers.length).toFixed(1) : '0'}
                            </p>
                            <p className="relative z-10 text-[10px] font-black text-orange-500/60 uppercase mt-5 tracking-[0.3em]">Records Per Field Node</p>
                        </div>
                    </div>
                </Card>
             </div>
             )}
        </DashboardLayout>
    );
};

export default OrganisationDashboard;