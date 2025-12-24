
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Building2, User as UserIcon, Phone, ShieldCheck, Mail, Info } from 'lucide-react';
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
                // Fetch Org Details
                const { data: orgData } = await supabase
                    .from('organisations')
                    .select('*')
                    .eq('id', user.organisationId)
                    .single();

                // Fetch Volunteers
                const { data: volsData } = await supabase.from('profiles')
                    .select('*')
                    .eq('role', Role.Volunteer)
                    .eq('organisation_id', user.organisationId);

                // Fetch Members
                const { data: membersData } = await supabase.from('members')
                    .select('*')
                    .eq('organisation_id', user.organisationId);
                
                if (orgData) setOrgDetails(orgData);
                if (volsData) setMyVolunteers(volsData);
                if (membersData) setMyMembers(membersData);
            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user]);

    return (
        <DashboardLayout title="Entity Overview">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px]">Syncing Data Terminal...</p>
                </div>
             ) : (
            <div className="space-y-8">
                {/* Identity Banner */}
                <div className="relative overflow-hidden p-8 rounded-2xl border border-orange-500/20 bg-gray-900/40 backdrop-blur-sm">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -ml-32 -mb-32 rounded-full"></div>
                    
                    <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-start lg:items-center">
                        {/* Organisation Main Info */}
                        <div className="flex-1 flex gap-8 items-start">
                            <div className="p-6 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-orange-500 shadow-2xl shadow-orange-950/20">
                                <Building2 size={56} />
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60 mb-2">Registered Entity</p>
                                    <h2 className="font-cinzel text-4xl text-white tracking-tight">{user?.organisationName || 'Unknown Entity'}</h2>
                                </div>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex items-center gap-3 px-4 py-2 bg-black/60 rounded-xl border border-gray-800 shadow-inner">
                                        <Phone size={16} className="text-orange-500" />
                                        <span className="text-sm font-mono text-gray-200 tracking-wider">{orgDetails?.mobile || 'No Contact'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-4 py-2 bg-black/60 rounded-xl border border-gray-800 shadow-inner">
                                        <ShieldCheck size={16} className="text-green-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Status: {orgDetails?.status || 'Active'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Divider for Mobile */}
                        <div className="w-full h-px bg-gray-800 lg:hidden"></div>

                        {/* Admin Identity Component */}
                        <div className="lg:w-96 p-6 bg-gray-900/80 rounded-2xl border border-gray-800 shadow-2xl flex items-center gap-5">
                            <div className="h-14 w-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                                <UserIcon size={28} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-1">Access Principal</p>
                                <h2 className="font-cinzel text-lg text-white truncate">{user?.name}</h2>
                                <div className="flex items-center gap-2 mt-1 opacity-60">
                                    <Mail size={12} className="text-orange-500" />
                                    <span className="text-[11px] text-gray-400 truncate lowercase">{user?.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] border-gray-800 hover:border-orange-500/30">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Users size={120} />
                        </div>
                        <div className="flex items-center space-x-8">
                            <div className="p-5 bg-orange-500/10 rounded-2xl text-orange-500">
                                <Users size={40} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Volunteers</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-5xl font-black text-white">{myVolunteers.length}</p>
                                    <span className="text-[10px] text-orange-500 font-bold uppercase">Field Agents</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="group relative overflow-hidden transition-all duration-500 hover:scale-[1.02] border-gray-800 hover:border-blue-500/30">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <UserCheck size={120} />
                        </div>
                        <div className="flex items-center space-x-8">
                            <div className="p-5 bg-blue-500/10 rounded-2xl text-blue-500">
                                <UserCheck size={40} />
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Memberships</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-5xl font-black text-white">{myMembers.length}</p>
                                    <span className="text-[10px] text-blue-500 font-bold uppercase">Enrollments</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Intelligence Card */}
                <div className="mt-4">
                    <Card className="border-l-4 border-l-orange-600 bg-gradient-to-br from-gray-900 to-black">
                        <div className="flex items-center gap-4 mb-6">
                             <Info className="text-orange-500" size={24} />
                             <h3 className="font-cinzel text-xl text-white">Entity Summary</h3>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                            The terminal currently tracks <b>{myVolunteers.length}</b> field agents assigned to <b>{user?.organisationName}</b>. 
                            Collectively, your team has successfully processed and registered <b>{myMembers.length}</b> community members 
                            into the SSK People database.
                        </p>
                    </Card>
                </div>
             </div>
             )}
        </DashboardLayout>
    );
};

export default OrganisationDashboard;
