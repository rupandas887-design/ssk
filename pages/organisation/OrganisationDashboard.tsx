
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Building2, User as UserIcon, Phone, ShieldCheck, Mail, Info, Activity } from 'lucide-react';
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
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px]">Accessing Secure Terminal...</p>
                </div>
             ) : (
            <div className="space-y-8">
                {/* High-Impact Identity Banner */}
                <div className="relative overflow-hidden p-8 lg:p-12 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-gray-900 via-gray-950 to-black shadow-2xl">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] -mr-64 -mt-64 rounded-full pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-start lg:items-center">
                        {/* Organisation Prominent Identity */}
                        <div className="flex-1 flex gap-8 items-start">
                            <div className="p-8 bg-orange-600/10 rounded-3xl border border-orange-500/20 text-orange-500 shadow-2xl shadow-orange-950/20">
                                <Building2 size={72} strokeWidth={1} />
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/80">Authorized Primary Entity</p>
                                    </div>
                                    <h2 className="font-cinzel text-4xl lg:text-6xl text-white tracking-tight leading-none mb-1">
                                        {orgDetails?.name || user?.organisationName || 'Unknown Entity'}
                                    </h2>
                                </div>
                                
                                <div className="flex flex-wrap gap-5">
                                    <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
                                        <Phone size={20} className="text-orange-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase font-black text-gray-500 tracking-[0.2em]">Master Contact</span>
                                            <span className="text-base font-mono text-gray-200 tracking-wider">{orgDetails?.mobile || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
                                        <ShieldCheck size={20} className="text-green-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase font-black text-gray-500 tracking-[0.2em]">Identity Level</span>
                                            <span className="text-[11px] font-black uppercase text-green-400 tracking-widest">{orgDetails?.status || 'Verified'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Principal Card */}
                        <div className="lg:w-[420px] p-10 bg-black/60 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-3xl group hover:border-orange-500/30 transition-all duration-500">
                            <div className="flex items-center gap-7">
                                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-white/80 group-hover:scale-110 transition-transform duration-500">
                                    <UserIcon size={36} strokeWidth={1} />
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Access Principal</p>
                                    <h2 className="font-cinzel text-2xl text-white truncate mb-1">{orgDetails?.secretary_name || user?.name}</h2>
                                    <div className="flex items-center gap-2 opacity-60">
                                        <Mail size={14} className="text-orange-500" />
                                        <span className="text-[11px] text-gray-400 truncate tracking-wide font-mono lowercase">{user?.email}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-gray-600 tracking-[0.3em]">Operational Tier</span>
                                <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20 uppercase tracking-widest">Master Admin</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="group relative overflow-hidden p-10 bg-gray-900/10 border-white/5 hover:border-orange-500/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-500">
                            <Users size={160} />
                        </div>
                        <div className="flex items-center space-x-12">
                            <div className="p-7 bg-orange-500/10 rounded-2xl text-orange-500 group-hover:bg-orange-500/20 transition-colors">
                                <Users size={56} strokeWidth={1} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.3em] mb-3">Field Agents</p>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-7xl font-black text-white leading-none">{myVolunteers.length}</p>
                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Active Force</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="group relative overflow-hidden p-10 bg-gray-900/10 border-white/5 hover:border-blue-500/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-500">
                            <UserCheck size={160} />
                        </div>
                        <div className="flex items-center space-x-12">
                            <div className="p-7 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                                <UserCheck size={56} strokeWidth={1} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.3em] mb-3">Community Enrollment</p>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-7xl font-black text-white leading-none">{myMembers.length}</p>
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Master Records</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Intelligent Insights */}
                <Card className="border-l-4 border-l-orange-600 bg-gradient-to-br from-gray-900/40 to-black p-10 shadow-2xl">
                    <div className="flex items-center gap-5 mb-8">
                         <div className="p-3 bg-orange-600/10 rounded-full text-orange-500">
                            <Activity size={28} />
                         </div>
                         <h3 className="font-cinzel text-2xl text-white tracking-widest uppercase">Drive Intelligence</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="md:col-span-2 space-y-6">
                            <p className="text-gray-400 text-lg leading-relaxed">
                                The SSK People master registry for <b>{orgDetails?.name || user?.organisationName}</b> is successfully synchronizing live data. 
                                Your team of <b>{myVolunteers.length}</b> field agents has successfully cataloged <b>{myMembers.length}</b> community members in this cycle.
                            </p>
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 w-fit">
                                <Info className="text-orange-500" size={16} />
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Terminal Status: Fully Operational</p>
                            </div>
                        </div>
                        <div className="bg-black/40 p-8 rounded-2xl border border-white/5 flex flex-col justify-center text-center shadow-inner">
                            <p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] mb-3">Agent Productivity Index</p>
                            <p className="text-5xl font-black text-white leading-none">
                                {myVolunteers.length > 0 ? (myMembers.length / myVolunteers.length).toFixed(1) : '0'}
                            </p>
                            <p className="text-[10px] font-bold text-orange-500/60 uppercase mt-3 tracking-widest">Records Per Agent</p>
                        </div>
                    </div>
                </Card>
             </div>
             )}
        </DashboardLayout>
    );
};

export default OrganisationDashboard;
