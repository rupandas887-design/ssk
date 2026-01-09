
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Building2, User as UserIcon, Phone, ShieldCheck, Activity, RefreshCw, UserCircle, TrendingUp } from 'lucide-react';
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

    const formatDisplayName = (first: string, last: string) => {
        const f = (first || '').trim().toLowerCase();
        const l = (last || '').trim().toLowerCase();
        return `${f} ${l}`.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

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
        <DashboardLayout title="Command Center">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Syncing Node...</p>
                </div>
             ) : (
            <div className="space-y-4 md:space-y-6 pb-6">
                <div className="relative overflow-hidden p-5 sm:p-8 rounded-2xl md:rounded-[2.5rem] border border-white/5 bg-[#050505] shadow-2xl group">
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/[0.03] blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none transition-all duration-1000 group-hover:bg-orange-500/[0.06]"></div>
                    
                    <div className="relative z-10 flex flex-col xl:flex-row gap-6 lg:gap-10 items-start xl:items-center">
                        <div className="flex-1 flex flex-col sm:flex-row gap-5 sm:gap-8 items-start w-full">
                            <div className="flex-shrink-0">
                                {orgDetails?.profile_photo_url ? (
                                    <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-2xl sm:rounded-[2rem] border border-orange-500/20 shadow-xl overflow-hidden group-hover:border-orange-500/50 transition-all duration-500">
                                        <img 
                                            src={orgDetails.profile_photo_url} 
                                            alt={orgDetails.name} 
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-4 sm:p-6 bg-gradient-to-br from-orange-600/10 to-orange-950/30 rounded-2xl sm:rounded-[2rem] border border-orange-500/10 text-orange-500 shadow-xl overflow-hidden flex-shrink-0">
                                        <Building2 className="w-8 h-8 sm:w-14 sm:h-14" strokeWidth={1.5} />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 sm:space-y-4 overflow-hidden w-full">
                                <div>
                                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                        <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/70">Authorized Organization</p>
                                    </div>
                                    <h2 className="font-cinzel text-xl sm:text-3xl md:text-4xl lg:text-5xl text-white tracking-tight leading-tight truncate">
                                        {orgDetails?.name || user?.organisationName}
                                    </h2>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/5">
                                        <Phone size={12} className="text-orange-500/60 sm:size-[14px]" />
                                        <span className="text-xs sm:text-sm font-mono text-gray-400">{orgDetails?.mobile || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/[0.02] rounded-lg sm:rounded-xl border border-white/5">
                                        <ShieldCheck size={12} className="text-green-500/60 sm:size-[14px]" />
                                        <span className="text-[8px] sm:text-[9px] font-black uppercase text-green-400 tracking-widest">{orgDetails?.status || 'Active'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full xl:w-72 p-4 sm:p-5 bg-white/[0.01] rounded-xl sm:rounded-[2rem] border border-white/5 backdrop-blur-2xl hover:border-orange-500/20 transition-all">
                             <div className="flex items-center gap-3 sm:gap-4">
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl bg-gray-900 border border-white/5 flex items-center justify-center text-gray-600">
                                    <UserIcon size={20} strokeWidth={1} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 mb-0.5">Lead Admin</p>
                                    <h2 className="font-cinzel text-sm sm:text-base text-white truncate">{orgDetails?.secretary_name || user?.name}</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <Card className="p-5 lg:p-7 relative overflow-hidden group border-white/5 bg-[#080808]">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                            <UserCircle size={80} className="sm:size-[100px]" />
                        </div>
                        <div className="relative z-10 flex flex-row items-center gap-4 lg:gap-6">
                            <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/5">
                                <Activity size={24} className="sm:size-8" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.3em] mb-1">Personnel</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl lg:text-4xl font-black text-orange-500 leading-none tracking-tighter">{myVolunteers.length}</p>
                                    <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-widest">Active</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 lg:p-7 relative overflow-hidden group border-white/5 bg-[#080808]">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                            <TrendingUp size={80} className="sm:size-[100px]" />
                        </div>
                        <div className="relative z-10 flex flex-row items-center gap-4 lg:gap-6">
                            <div className="p-4 bg-orange-500/10 rounded-xl text-orange-400 border border-orange-500/5">
                                <TrendingUp size={24} className="sm:size-8" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.3em] mb-1">Total Identity</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl lg:text-4xl font-black text-orange-500 leading-none tracking-tighter">{myMembers.length}</p>
                                    <span className="text-[8px] font-black text-orange-500/50 uppercase tracking-widest">Enrolled</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                <Card className="border-white/5 bg-[#080808] p-4 sm:p-6 rounded-xl md:rounded-3xl">
                    <div className="flex flex-row justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                <Activity size={16} />
                            </div>
                            <h3 className="font-cinzel text-base sm:text-lg text-white uppercase tracking-widest">Activity Stream</h3>
                        </div>
                        <button onClick={fetchData} className="p-2 bg-white/5 rounded-lg border border-white/5 hover:border-blue-500/40 text-gray-500 hover:text-white transition-all">
                            <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[450px]">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-600 text-[8px] sm:text-[9px] uppercase tracking-widest font-black">
                                    <th className="pb-4 pl-2">Enrolled Member</th>
                                    <th className="pb-4">Field Agent</th>
                                    <th className="pb-4 text-right pr-2">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {myMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-10 text-center text-gray-700 text-[9px] font-black uppercase tracking-widest">No activity detected.</td>
                                    </tr>
                                ) : myMembers.slice(0, 10).map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.01] transition-colors">
                                        <td className="py-3 pl-2">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-sm sm:text-base group-hover:text-blue-400 transition-colors truncate">
                                                    {formatDisplayName(m.name, m.surname)}
                                                </span>
                                                <span className="text-[9px] text-gray-600 font-mono">{m.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-lg bg-gray-950 flex items-center justify-center text-gray-600">
                                                    <UserCircle size={14} />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{m.agent_profile?.name || 'Agent'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-right pr-2">
                                            <span className="text-[10px] font-bold text-gray-700 uppercase font-mono">{m.submission_date.split('T')[0]}</span>
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
