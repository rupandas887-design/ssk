import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Building2, User as UserIcon, Phone, ShieldCheck, Mail, Info, Activity, Globe, Zap } from 'lucide-react';
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
        <DashboardLayout title="Entity Command Center">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-32 gap-6">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[11px] animate-pulse">Establishing Secure Uplink...</p>
                </div>
             ) : (
            <div className="space-y-12">
                {/* Premium High-Impact Identity Banner */}
                <div className="relative overflow-hidden p-8 lg:p-14 rounded-[3rem] border border-white/10 bg-[#050505] shadow-[0_0_80px_-20px_rgba(255,100,0,0.15)] group">
                    <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-orange-500/[0.03] blur-[160px] -mr-80 -mt-80 rounded-full pointer-events-none group-hover:bg-orange-500/[0.05] transition-all duration-1000"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.03] blur-[130px] -ml-40 -mb-40 rounded-full pointer-events-none transition-all duration-1000"></div>
                    
                    <div className="relative z-10 flex flex-col xl:flex-row gap-16 items-start xl:items-center">
                        {/* Identity Core */}
                        <div className="flex-1 flex gap-10 items-start">
                            <div className="p-10 bg-gradient-to-br from-orange-600/20 to-orange-950/40 rounded-[2.8rem] border border-orange-500/20 text-orange-500 shadow-2xl shadow-orange-950/40 relative group/icon overflow-hidden">
                                <div className="absolute inset-0 bg-orange-500/10 scale-0 group-hover/icon:scale-100 transition-transform duration-700 rounded-[2.8rem]"></div>
                                <Building2 size={92} strokeWidth={1} className="relative z-10 group-hover/icon:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-orange-500/80 leading-none">Registered Primary Entity Node</p>
                                    </div>
                                    <h2 className="font-cinzel text-4xl lg:text-7xl text-white tracking-tighter leading-none mb-4 transition-colors duration-1000">
                                        {orgDetails?.name || user?.organisationName}
                                    </h2>
                                </div>
                                
                                <div className="flex flex-wrap gap-6">
                                    <div className="flex items-center gap-5 px-8 py-5 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-3xl hover:border-orange-500/40 transition-all duration-500 shadow-xl">
                                        <Phone size={24} className="text-orange-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em] mb-0.5">Primary Hotline</span>
                                            <span className="text-xl font-mono text-gray-100 tracking-wider">{orgDetails?.mobile || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5 px-8 py-5 bg-white/[0.03] rounded-3xl border border-white/5 backdrop-blur-3xl">
                                        <ShieldCheck size={24} className="text-green-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-black text-gray-500 tracking-[0.2em] mb-0.5">Registry Status</span>
                                            <span className="text-[11px] font-black uppercase text-green-400 tracking-widest leading-none mt-1">{orgDetails?.status || 'Active'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Principal Admin Card */}
                        <div className="xl:w-[480px] p-12 bg-white/[0.02] rounded-[3.5rem] border border-white/10 shadow-3xl backdrop-blur-3xl group/admin hover:border-orange-500/20 transition-all duration-700 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/admin:opacity-10 transition-opacity">
                                <Zap size={120} strokeWidth={1} />
                            </div>
                            <div className="flex items-center gap-8 relative z-10">
                                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/10 flex items-center justify-center text-white/40 group-hover/admin:scale-105 group-hover/admin:text-orange-500 transition-all duration-700 shadow-inner">
                                    <UserIcon size={48} strokeWidth={1} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Access Principal</p>
                                    <h2 className="font-cinzel text-3xl text-white truncate mb-2">{orgDetails?.secretary_name || user?.name}</h2>
                                    <div className="flex items-center gap-2 opacity-60">
                                        <Mail size={16} className="text-orange-500" />
                                        <span className="text-[12px] text-gray-400 truncate tracking-wide font-mono lowercase">{user?.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em]">Operational Level</span>
                                    <span className="text-[11px] font-black text-orange-500 uppercase tracking-widest mt-1">Master Administrator</span>
                                </div>
                                <Activity className="text-orange-500/40 animate-pulse" size={28} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid Analytics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <Card className="group relative overflow-hidden p-14 bg-gradient-to-br from-gray-900/60 to-black border-white/5 hover:border-orange-500/30 transition-all duration-700 shadow-3xl">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 -rotate-12 group-hover:rotate-0">
                            <Users size={220} />
                        </div>
                        <div className="flex items-center space-x-14 relative z-10">
                            <div className="p-9 bg-orange-500/10 rounded-[2rem] text-orange-500 group-hover:bg-orange-500/20 transition-all duration-500 shadow-2xl">
                                <Users size={72} strokeWidth={1} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[12px] font-black uppercase tracking-[0.5em] mb-5">Authorized Field Force</p>
                                <div className="flex items-baseline gap-6">
                                    <p className="text-8xl font-black text-white leading-none tracking-tighter">{myVolunteers.length}</p>
                                    <span className="text-[12px] font-black text-orange-500 uppercase tracking-widest leading-none ml-4">Active Nodes</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="group relative overflow-hidden p-14 bg-gradient-to-br from-gray-900/60 to-black border-white/5 hover:border-blue-500/30 transition-all duration-700 shadow-3xl">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 rotate-12 group-hover:rotate-0">
                            <UserCheck size={220} />
                        </div>
                        <div className="flex items-center space-x-14 relative z-10">
                            <div className="p-9 bg-blue-500/10 rounded-[2rem] text-blue-500 group-hover:bg-blue-500/20 transition-all duration-500 shadow-2xl">
                                <UserCheck size={72} strokeWidth={1} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[12px] font-black uppercase tracking-[0.5em] mb-5">Master Enrollment</p>
                                <div className="flex items-baseline gap-6">
                                    <p className="text-8xl font-black text-white leading-none tracking-tighter">{myMembers.length}</p>
                                    <span className="text-[12px] font-black text-blue-500 uppercase tracking-widest leading-none ml-4">Verified</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Advanced Intelligence Panel */}
                <Card className="border-l-8 border-l-orange-600 bg-[#080808] p-14 shadow-4xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/[0.02] blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none"></div>
                    
                    <div className="relative z-10 flex items-center gap-8 mb-12">
                         <div className="p-5 bg-orange-600/10 rounded-3xl text-orange-500 border border-orange-500/10 shadow-lg">
                            <Activity size={40} />
                         </div>
                         <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-500/60 mb-1">Advanced Metrics</p>
                            <h3 className="font-cinzel text-4xl text-white tracking-[0.1em] uppercase">Drive Intelligence</h3>
                         </div>
                    </div>
                    
                    <div className="relative z-10 grid lg:grid-cols-3 gap-20">
                        <div className="lg:col-span-2 space-y-10">
                            <p className="text-gray-400 text-2xl leading-relaxed font-light">
                                The SSK People master registry for <b className="text-white font-black">{orgDetails?.name || user?.organisationName}</b> is successfully synchronizing data nodes. 
                                Your network of <b className="text-orange-500 font-bold">{myVolunteers.length}</b> field agents has cataloged <b className="text-orange-500 font-bold">{myMembers.length}</b> community members in the current window.
                            </p>
                            <div className="flex items-center gap-5 p-6 bg-white/[0.03] rounded-2xl border border-white/5 w-fit shadow-xl">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.3em] leading-none">System Status: Active & Operational</p>
                            </div>
                        </div>
                        
                        <div className="bg-black/60 p-12 rounded-[3rem] border border-white/10 flex flex-col justify-center text-center shadow-2xl relative group/matrix overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/[0.03] to-transparent translate-y-full group-hover/matrix:translate-y-0 transition-transform duration-1000"></div>
                            <p className="relative z-10 text-[11px] font-black uppercase text-gray-600 tracking-[0.5em] mb-6">Force Productivity Matrix</p>
                            <p className="relative z-10 text-9xl font-black text-white leading-none tracking-tighter">
                                {myVolunteers.length > 0 ? (myMembers.length / myVolunteers.length).toFixed(1) : '0'}
                            </p>
                            <p className="relative z-10 text-[11px] font-black text-orange-500/60 uppercase mt-8 tracking-[0.4em]">Verified Records Per Node</p>
                        </div>
                    </div>
                </Card>
             </div>
             )}
        </DashboardLayout>
    );
};

export default OrganisationDashboard;