
import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Building2, User as UserIcon, Phone, ShieldCheck, Mail, Info, Activity, Globe, Zap, Clock, RefreshCw, UserCircle, TrendingUp, MapPin } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Member, Role, User as VolunteerUser, Organisation } from '../../types';

type MemberWithAgent = Member & {
    agent_profile?: { name: string, mobile: string }
};

const OrganisationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myVolunteers, setMyVolunteers] = useState<VolunteerUser[]>([]);
    const [myMembers, setMyMembers] = useState<MemberWithAgent[]>([]);
    const [orgDetails, setOrgDetails] = useState<Organisation | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user?.organisationId) return;
        setLoading(true);
        
        try {
            const [orgRes, profilesRes, membersRes] = await Promise.all([
                supabase.from('organisations').select('*').eq('id', user.organisationId).single(),
                supabase.from('profiles').select('*').eq('organisation_id', user.organisationId).eq('role', 'Volunteer'),
                supabase
                    .from('members')
                    .select('*, agent_profile:profiles!volunteer_id(name, mobile)')
                    .eq('organisation_id', user.organisationId)
                    .order('submission_date', { ascending: false })
            ]);
            
            if (orgRes.data) setOrgDetails(orgRes.data);
            
            if (profilesRes.data) {
                const mapped: VolunteerUser[] = profilesRes.data.map(p => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    role: Role.Volunteer,
                    organisationId: p.organisation_id,
                    mobile: p.mobile,
                    status: p.status
                }));
                setMyVolunteers(mapped);
            }
            
            if (membersRes.data) setMyMembers(membersRes.data as MemberWithAgent[]);
        } catch (error) {
            console.error("Sync Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    return (
        <DashboardLayout title="Sector Command Center">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-32 gap-6">
                    <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[11px] animate-pulse">Syncing Sector Node...</p>
                </div>
             ) : (
            <div className="space-y-12">
                <div className="relative overflow-hidden p-10 lg:p-14 rounded-[3.5rem] border border-white/10 bg-[#050505] shadow-2xl group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/[0.04] blur-[120px] rounded-full -mr-40 -mt-40 pointer-events-none transition-all duration-1000 group-hover:bg-orange-500/[0.08]"></div>
                    
                    <div className="relative z-10 flex flex-col xl:flex-row gap-16 items-start xl:items-center">
                        <div className="flex-1 flex gap-10 items-start">
                            <div className="p-10 bg-gradient-to-br from-orange-600/20 to-orange-950/40 rounded-[2.8rem] border border-orange-500/20 text-orange-500 shadow-xl group/icon overflow-hidden">
                                <Building2 size={80} strokeWidth={1} className="relative z-10 group-hover/icon:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.5em] text-orange-500/80">Authorized Sector Unit</p>
                                    </div>
                                    <h2 className="font-cinzel text-5xl lg:text-7xl text-white tracking-tighter leading-none mb-4">
                                        {orgDetails?.name || user?.organisationName}
                                    </h2>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-4 px-6 py-3 bg-white/[0.03] rounded-2xl border border-white/5">
                                        <Phone size={18} className="text-orange-500/60" />
                                        <span className="text-base font-mono text-gray-300">{orgDetails?.mobile || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 px-6 py-3 bg-white/[0.03] rounded-2xl border border-white/5">
                                        <ShieldCheck size={18} className="text-green-500/60" />
                                        <span className="text-[10px] font-black uppercase text-green-400 tracking-widest">{orgDetails?.status || 'Active'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="xl:w-96 p-8 bg-white/[0.02] rounded-[3rem] border border-white/10 backdrop-blur-3xl group/admin hover:border-orange-500/20 transition-all">
                             <div className="flex items-center gap-6">
                                <div className="h-16 w-16 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center text-gray-500 group-hover/admin:text-orange-500 transition-colors">
                                    <UserIcon size={32} strokeWidth={1} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-1">Sector Lead</p>
                                    <h2 className="font-cinzel text-xl text-white truncate">{orgDetails?.secretary_name || user?.name}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <Card className="p-12 relative overflow-hidden group border-white/5 bg-gradient-to-br from-gray-900/40 to-black hover:border-blue-500/30 transition-all duration-700">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={180} />
                        </div>
                        <div className="relative z-10 flex items-center gap-10">
                            <div className="p-8 bg-blue-500/10 rounded-3xl text-blue-400 border border-blue-500/10 group-hover:scale-105 transition-transform">
                                <Users size={56} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.5em] mb-4">Authorized Agents</p>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-7xl font-black text-white leading-none tracking-tighter">{myVolunteers.length}</p>
                                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Field Personnel</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-12 relative overflow-hidden group border-white/5 bg-gradient-to-br from-gray-900/40 to-black hover:border-orange-500/30 transition-all duration-700">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp size={180} />
                        </div>
                        <div className="relative z-10 flex items-center gap-10">
                            <div className="p-8 bg-orange-500/10 rounded-3xl text-orange-400 border border-orange-500/10 group-hover:scale-105 transition-transform">
                                <Activity size={56} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.5em] mb-4">Sector Growth</p>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-7xl font-black text-white leading-none tracking-tighter">{myMembers.length}</p>
                                    <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Enrolled Identity</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                <Card className="border-white/5 bg-[#080808] p-8 rounded-[2.5rem]">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                <Activity size={24} />
                            </div>
                            <h3 className="font-cinzel text-2xl text-white uppercase tracking-widest">Live Enrollment Stream</h3>
                        </div>
                        <button onClick={fetchData} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/40 text-gray-500 hover:text-white transition-all">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="p-5">Enrolled Member</th>
                                    <th className="p-5">Field Agent</th>
                                    <th className="p-5 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {myMembers.slice(0, 10).map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.015] transition-colors">
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{m.name} {m.surname}</span>
                                                <span className="text-[11px] text-gray-600 font-mono">{m.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center text-gray-600 group-hover:text-orange-500 transition-colors">
                                                    <UserCircle size={18} />
                                                </div>
                                                <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">{m.agent_profile?.name || 'Authorized Agent'}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className="text-[11px] font-bold text-gray-600 uppercase font-mono">{m.submission_date.split('T')[0]}</span>
                                        </td>
                                    </tr>
                                ))}
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
