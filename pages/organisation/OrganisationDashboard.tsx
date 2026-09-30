import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { Building2, User as UserIcon, Phone, ShieldCheck, Activity, RefreshCw, UserCircle, TrendingUp, Users, ArrowUpRight } from 'lucide-react';
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
        let targetOrgId = user?.organisationId;
        if (!targetOrgId && user?.email) {
            try {
                const { data: prof } = await supabase.from('profiles').select('organisation_id').eq('email', user.email).maybeSingle();
                if (prof?.organisation_id) targetOrgId = prof.organisation_id;
            } catch (e) {
                console.warn("Could not resolve organization ID from profile:", e);
            }
        }

        if (!targetOrgId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [orgRes, profilesRes, membersRes] = await Promise.all([
                supabase.from('organisations').select('*').eq('id', targetOrgId).maybeSingle(),
                supabase.from('profiles').select('*').eq('organisation_id', targetOrgId).eq('role', 'Volunteer'),
                supabase
                    .from('members')
                    .select('*, agent_profile:profiles!volunteer_id(name, mobile)')
                    .eq('organisation_id', targetOrgId)
                    .order('submission_date', { ascending: false })
            ]);

            if (orgRes.error) console.error("Organisation fetch error:", orgRes.error);
            if (profilesRes.error) console.error("Organisation volunteers fetch error:", profilesRes.error);
            
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

            if (membersRes.error) {
                console.warn("Organisation members join error, trying simple query:", membersRes.error);
                const fallbackRes = await supabase
                    .from('members')
                    .select('*')
                    .eq('organisation_id', targetOrgId)
                    .order('submission_date', { ascending: false });
                if (fallbackRes.data) setMyMembers(fallbackRes.data as any);
            } else if (membersRes.data) {
                setMyMembers(membersRes.data as MemberWithAgent[]);
            }
        } catch (error) {
            console.error("OrganisationDashboard Sync Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('org-dashboard-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'organisations' }, () => {
                fetchData();
            })
            .subscribe();

        const handleFocus = () => {
            fetchData();
        };
        window.addEventListener('focus', handleFocus);
        window.addEventListener('online', handleFocus);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', handleFocus);
        };
    }, [user]);

    return (
        <DashboardLayout title="Organization Command Center">
             {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-3">
                    <div className="w-10 h-10 border-4 border-saffron-600/20 border-t-saffron-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-semibold text-xs tracking-wider">Synchronizing Node Data...</p>
                </div>
             ) : (
            <div className="space-y-6 pb-12">
                {/* Organization Hero Card */}
                <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl md:rounded-3xl border border-slate-200/90 bg-white shadow-card group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-saffron-500/[0.05] via-saffron-400/[0.03] to-transparent blur-3xl rounded-full pointer-events-none -mr-20 -mt-20"></div>
                    
                    <div className="relative z-10 flex flex-col xl:flex-row gap-6 lg:gap-8 items-start xl:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start sm:items-center w-full">
                            <div className="flex-shrink-0">
                                {orgDetails?.profile_photo_url ? (
                                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-slate-50">
                                        <img 
                                            src={orgDetails.profile_photo_url} 
                                            alt={orgDetails.name} 
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gradient-to-br from-saffron-50 to-saffron-100 rounded-2xl border border-saffron-200 text-saffron-600 shadow-sm flex items-center justify-center">
                                        <Building2 className="w-10 h-10" strokeWidth={1.75} />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 overflow-hidden w-full">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-saffron-50 border border-saffron-100 text-[11px] font-bold text-saffron-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 animate-pulse"></span>
                                        Authorized Organization Node
                                    </span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                                    {orgDetails?.name || user?.organisationName}
                                </h2>
                                <div className="flex flex-wrap gap-2.5 pt-1">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200/80 text-xs font-mono text-slate-600">
                                        <Phone size={13} className="text-slate-400" />
                                        <span>{orgDetails?.mobile || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-700">
                                        <ShieldCheck size={13} className="text-emerald-600" />
                                        <span>{orgDetails?.status || 'Active'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full xl:w-72 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 shrink-0">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-700 font-bold shrink-0">
                                    <UserIcon size={18} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Administrative Lead</p>
                                    <h4 className="text-sm font-bold text-slate-900 truncate">{orgDetails?.secretary_name || user?.name}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Cards - Exactly 2 cards per row on desktop/tablet, 1 on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-5 lg:gap-6">
                    <Card className="p-6 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-600 shadow-sm">
                                <Users size={22} />
                            </div>
                            <span className="text-[11px] font-bold text-saffron-700 bg-saffron-50 border border-saffron-100 px-2.5 py-0.5 rounded-full">
                                Personnel
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Volunteers</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-extrabold text-slate-900 tabular-nums">{myVolunteers.length}</p>
                                <span className="text-xs font-semibold text-slate-500">registered agents</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-600 shadow-sm">
                                <TrendingUp size={22} />
                            </div>
                            <span className="text-[11px] font-bold text-saffron-700 bg-saffron-100 border border-saffron-200 px-2.5 py-0.5 rounded-full">
                                Registry Growth
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Enrolled Citizens</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-extrabold text-slate-900 tabular-nums">{myMembers.length}</p>
                                <span className="text-xs font-semibold text-slate-500">verified profiles</span>
                            </div>
                        </div>
                    </Card>
                </div>
                
                {/* Recent Activity Stream Card */}
                <Card 
                    title="Live Activity Stream" 
                    subtitle="Recent member registrations synchronized through your organization network"
                    className="border-slate-200/80 shadow-card p-0 overflow-hidden"
                    action={
                        <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5 text-xs text-slate-600">
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            <span>Sync Stream</span>
                        </Button>
                    }
                >
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm min-w-[500px]">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80">
                                <tr className="text-slate-600 text-xs font-bold tracking-wider">
                                    <th className="px-6 py-4">Registered Citizen</th>
                                    <th className="px-6 py-4">Field Volunteer</th>
                                    <th className="px-6 py-4 text-right">Submission Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {myMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-xs font-medium text-slate-500">
                                            No registrations recorded under this organization node yet.
                                        </td>
                                    </tr>
                                ) : myMembers.slice(0, 10).map(m => (
                                    <tr key={m.id} className="hover:bg-saffron-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {formatDisplayName(m.name, m.surname)}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono mt-0.5">{m.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-lg bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-600 font-bold text-xs">
                                                    <UserCircle size={15} />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700">{m.agent_profile?.name || 'Volunteer'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-mono text-slate-500">{m.submission_date.split('T')[0]}</span>
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
