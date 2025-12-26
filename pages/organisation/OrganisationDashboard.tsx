import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Building2, User as UserIcon, Phone, ShieldCheck, Mail, Info, Activity, Globe, Zap, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Member, Role, User as VolunteerUser, Organisation } from '../../types';

// Extended type for joined volunteer data
type MemberWithAgent = Member & {
    agent_profile?: { name: string }
};

const OrganisationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myVolunteers, setMyVolunteers] = useState<VolunteerUser[]>([]);
    const [myMembers, setMyMembers] = useState<MemberWithAgent[]>([]);
    const [allOrgProfiles, setAllOrgProfiles] = useState<VolunteerUser[]>([]);
    const [orgDetails, setOrgDetails] = useState<Organisation | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user?.organisationId) return;
        setLoading(true);
        
        try {
            const [orgRes, profilesRes, membersRes] = await Promise.all([
                supabase.from('organisations').select('*').eq('id', user.organisationId).single(),
                supabase.from('profiles').select('*').eq('organisation_id', user.organisationId),
                supabase
                    .from('members')
                    .select('*, agent_profile:profiles!volunteer_id(name)')
                    .eq('organisation_id', user.organisationId)
                    .order('submission_date', { ascending: false })
            ]);
            
            if (orgRes.data) setOrgDetails(orgRes.data);
            
            if (profilesRes.data) {
                const mappedProfiles: VolunteerUser[] = profilesRes.data.map(p => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    role: p.role as Role,
                    organisationId: p.organisation_id,
                    mobile: p.mobile,
                    status: p.status
                }));
                setAllOrgProfiles(mappedProfiles);
                setMyVolunteers(mappedProfiles.filter(p => p.role === Role.Volunteer));
            }
            
            if (membersRes.data) setMyMembers(membersRes.data);
        } catch (error) {
            console.error("Dashboard Sync Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const recentActivity = useMemo(() => myMembers.slice(0, 8), [myMembers]);

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
                                <p className="text-gray-500 text-[12px] font-black uppercase tracking-[0.5em] mb-5">Sector Enrollment</p>
                                <div className="flex items-baseline gap-6">
                                    <p className="text-8xl font-black text-white leading-none tracking-tighter">{myMembers.length}</p>
                                    <span className="text-[12px] font-black text-blue-500 uppercase tracking-widest leading-none ml-4">Verified</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Sector Activity Stream - Isolated by Organisation */}
                <Card className="border-white/5 bg-[#080808] p-10 shadow-4xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                <Activity size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/60 mb-0.5">Real-time Stream</p>
                                <h3 className="font-cinzel text-2xl text-white uppercase tracking-widest">Sector Activity Stream</h3>
                            </div>
                        </div>
                        <button onClick={fetchData} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/40 transition-all text-gray-500 hover:text-white">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="p-5 text-[10px] uppercase tracking-widest text-gray-500 font-black">Enrolled Identity</th>
                                    <th className="p-5 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">VOLUNTEER</th>
                                    <th className="p-5 text-[10px] uppercase tracking-widest text-gray-500 font-black text-right">Verification Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {recentActivity.map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.015] transition-colors">
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{m.name} {m.surname}</span>
                                                <span className="text-[11px] text-gray-600 font-mono tracking-tighter">{m.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                                <UserIcon size={12} className="text-blue-500" />
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                    {m.agent_profile?.name || allOrgProfiles.find(p => p.id === m.volunteer_id)?.name || 'System Agent'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex items-center justify-end gap-2 text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                                                <Clock size={12} />
                                                {m.submission_date.split('T')[0]}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {recentActivity.length === 0 && (
                                    <tr><td colSpan={3} className="p-20 text-center text-xs text-gray-700 uppercase tracking-widest font-black">No member activations in your sector.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
             )}
        </DashboardLayout>
    );
};

export default OrganisationDashboard;