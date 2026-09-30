
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { 
  Shield, 
  Users, 
  UserCheck, 
  RefreshCw, 
  User as UserIcon, 
  Search, 
  Building2, 
  Activity, 
  Phone,
  Database,
  TrendingUp,
  FileSpreadsheet,
  Map,
  Power,
  PowerOff,
  Loader2
} from 'lucide-react';
import { Organisation, Volunteer, Member, Role } from '../../types';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';

interface OrgStats extends Organisation {
    volunteerCount: number;
    memberCount: number;
}

type VolunteerWithOrg = Volunteer & {
    organisation_name?: string;
};

const AdminDashboard: React.FC = () => {
    const { addNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [organisations, setOrgs] = useState<Organisation[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [volunteersWithOrg, setVolunteersWithOrg] = useState<VolunteerWithOrg[]>([]);
    const [loading, setLoading] = useState(true);
    const [isVolunteersModalOpen, setIsVolunteersModalOpen] = useState(false);
    const [statusTransitionId, setStatusTransitionId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orgsRes, membersRes] = await Promise.all([
                supabase.from('organisations').select('*').order('name'),
                supabase.from('members').select('*')
            ]);

            if (orgsRes.error) console.error("AdminDashboard organisations error:", orgsRes.error);
            if (membersRes.error) console.error("AdminDashboard members error:", membersRes.error);

            const fetchedOrgs = orgsRes.data || [];
            const fetchedMembers = membersRes.data || [];
            
            setOrgs(fetchedOrgs);
            setMembers(fetchedMembers);

            let profilesData: any[] | null = null;
            const { data: pData, error: profilesError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    organisations!organisation_id(name)
                `);

            if (profilesError) {
                console.warn("Profiles with org join error, falling back to simple query:", profilesError);
                const fallbackProfiles = await supabase.from('profiles').select('*');
                if (fallbackProfiles.error) {
                    console.error("Profiles fallback query error:", fallbackProfiles.error);
                } else {
                    profilesData = fallbackProfiles.data;
                }
            } else {
                profilesData = pData;
            }

            if (profilesData) {
                const volunteerProfiles = profilesData.filter(p => 
                    p.role && p.role.toLowerCase() === 'volunteer'
                );

                const enrollmentMap = fetchedMembers.reduce((acc, m) => {
                    if (m.volunteer_id) acc[m.volunteer_id] = (acc[m.volunteer_id] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const mapped: VolunteerWithOrg[] = volunteerProfiles.map((p: any) => ({
                    id: p.id,
                    name: p.name || 'Agent ' + p.id.slice(0, 4),
                    email: p.email,
                    role: Role.Volunteer,
                    organisationId: p.organisation_id,
                    organisation_name: p.organisations?.name || fetchedOrgs.find(o => o.id === p.organisation_id)?.name || 'Independent Organization',
                    mobile: p.mobile || 'N/A',
                    status: (p.status as 'Active' | 'Deactivated') || 'Active',
                    enrollments: enrollmentMap[p.id] || 0
                }));
                
                setVolunteersWithOrg(mapped.sort((a, b) => b.enrollments - a.enrollments));
            }
        } catch (err: any) {
            console.error("Master Sync Error:", err);
            addNotification(`Database Sync failed.`, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Subscribe to real-time changes on members, organisations and profiles tables
        const channel = supabase
            .channel('admin-dashboard-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'organisations' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                fetchData();
            })
            .subscribe();

        // Also re-sync when tab gains focus or reconnects
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
    }, []);

    const handleToggleVolunteerStatus = async (volunteerId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Deactivated' : 'Active';
        setStatusTransitionId(volunteerId);
        
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', volunteerId);
            
            if (error) throw error;
            
            addNotification(`Agent status updated to ${newStatus}.`, "success");
            
            // Update local state for immediate feedback
            setVolunteersWithOrg(prev => prev.map(v => 
                v.id === volunteerId ? { ...v, status: newStatus as any } : v
            ));
        } catch (err: any) {
            addNotification(`Status update failed: ${err.message}`, "error");
        } finally {
            setStatusTransitionId(null);
        }
    };

    const filteredVolunteers = useMemo(() => {
        if (!searchTerm) return volunteersWithOrg;
        const term = searchTerm.toLowerCase();
        return volunteersWithOrg.filter(vol => 
            vol.name.toLowerCase().includes(term) || 
            vol.mobile?.includes(term) ||
            vol.organisation_name?.toLowerCase().includes(term)
        );
    }, [searchTerm, volunteersWithOrg]);

    const handleExportVolunteers = () => {
        const headers = ['Name', 'Email', 'Mobile', 'Organization', 'Enrollments', 'Status'];
        const rows = filteredVolunteers.map(v => [
            v.name,
            v.email,
            v.mobile,
            v.organisation_name,
            v.enrollments,
            v.status
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Global_Agents_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const orgStats = useMemo<OrgStats[]>(() => {
        return organisations.map(org => {
            const orgVolunteers = volunteersWithOrg.filter(p => p.organisationId === org.id);
            const orgMembers = members.filter(m => m.organisation_id === org.id);
            return {
                ...org,
                volunteerCount: orgVolunteers.length,
                memberCount: orgMembers.length
            };
        }).sort((a, b) => b.memberCount - a.memberCount);
    }, [organisations, volunteersWithOrg, members]);

    return (
        <DashboardLayout title="Network Intelligence Dashboard">
            {/* Analytics Cards - Strictly 2 cards per row on all screen sizes with consistent alignment template */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6 items-stretch">
                <Card className="p-4 sm:p-6 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all group relative overflow-hidden h-full flex flex-col justify-between">
                    <div>
                        {/* Top row: Icon (left) and Status/Category Badge (right) */}
                        <div className="flex items-center justify-between gap-1 mb-3 sm:mb-4">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-600 shadow-sm shrink-0">
                                <Shield size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2} />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-saffron-700 bg-saffron-50 border border-saffron-100 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0 max-w-[55%] truncate text-center">
                                Organizations
                            </span>
                        </div>
                        {/* Middle: Card Title */}
                        <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-start">
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider leading-snug break-normal">
                                Active Organizations
                            </p>
                        </div>
                    </div>
                    {/* Bottom: Value */}
                    <div className="mt-2 pt-1 border-t border-slate-100/60">
                        <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-sans tabular-nums leading-none">
                            {loading ? '...' : organisations.length}
                        </p>
                    </div>
                </Card>
                
                <button 
                    onClick={() => setIsVolunteersModalOpen(true)}
                    className="text-left w-full h-full block group relative overflow-hidden rounded-2xl outline-none focus:ring-2 focus:ring-saffron-500/50 transition-all"
                >
                    <Card className="p-4 sm:p-6 border border-slate-200/80 shadow-card group-hover:shadow-card-hover group-hover:border-saffron-300 transition-all h-full relative flex flex-col justify-between">
                        <div>
                            {/* Top row: Icon (left) and Status/Category Badge (right) */}
                            <div className="flex items-center justify-between gap-1 mb-3 sm:mb-4">
                                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-saffron-100 border border-saffron-200 flex items-center justify-center text-saffron-600 shadow-sm shrink-0">
                                    <Users size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2} />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-saffron-700 bg-saffron-100 border border-saffron-200 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0 max-w-[55%] truncate text-center">
                                    Field Personnel
                                </span>
                            </div>
                            {/* Middle: Card Title */}
                            <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-start">
                                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider leading-snug break-normal">
                                    Volunteers
                                </p>
                            </div>
                        </div>
                        {/* Bottom: Value & Action */}
                        <div className="mt-2 pt-1 border-t border-slate-100/60 flex items-baseline justify-between gap-2">
                            <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-sans tabular-nums leading-none">
                                {loading ? '...' : volunteersWithOrg.length}
                            </p>
                            <p className="text-[10px] sm:text-xs font-bold text-saffron-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 shrink-0">
                                <span>Directory</span>
                                <span>→</span>
                            </p>
                        </div>
                    </Card>
                </button>

                <Card className="p-4 sm:p-6 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all group relative overflow-hidden h-full flex flex-col justify-between">
                    <div>
                        {/* Top row: Icon (left) and Status/Category Badge (right) */}
                        <div className="flex items-center justify-between gap-1 mb-3 sm:mb-4">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                <UserCheck size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2} />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0 max-w-[55%] truncate text-center">
                                Registry Base
                            </span>
                        </div>
                        {/* Middle: Card Title */}
                        <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-start">
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider leading-snug break-normal">
                                Total Enrolled Members
                            </p>
                        </div>
                    </div>
                    {/* Bottom: Value */}
                    <div className="mt-2 pt-1 border-t border-slate-100/60">
                        <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-sans tabular-nums leading-none">
                            {loading ? '...' : members.length}
                        </p>
                    </div>
                </Card>
            </div>

            <div className="mt-8 sm:mt-10">
                <Card title="Organization Operational Matrix" subtitle="Real-time volunteer and enrollment count by affiliated organization node" className="bg-white border-slate-200/80 p-0 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm min-w-[550px]">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80">
                                <tr className="text-slate-600 text-xs font-bold tracking-wider">
                                    <th className="px-6 py-4">Organization Node</th>
                                    <th className="px-6 py-4 text-center">Active Volunteers</th>
                                    <th className="px-6 py-4 text-center">Verified Enrollments</th>
                                    <th className="px-6 py-4 text-right">Operational Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orgStats.map(org => (
                                    <tr key={org.id} className="hover:bg-saffron-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center">
                                                    {org.profile_photo_url ? (
                                                      <img 
                                                        src={org.profile_photo_url} 
                                                        alt={org.name} 
                                                        className="h-full w-full object-cover"
                                                      />
                                                    ) : (
                                                      <Building2 size={20} className="text-saffron-500" />
                                                    )}
                                                </div>
                                                <span className="font-bold text-slate-900 text-sm truncate">{org.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-base font-extrabold text-saffron-600 tabular-nums">{org.volunteerCount}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-base font-extrabold text-emerald-600 tabular-nums">{org.memberCount}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                org.status === 'Active' 
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${org.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                <span>{org.status}</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal 
                isOpen={isVolunteersModalOpen} 
                onClose={() => setIsVolunteersModalOpen(false)} 
                title="Volunteer Personnel Directory"
                maxWidth="2xl"
            >
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search by name, organization, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-xs font-medium focus:outline-none focus:border-saffron-500 focus:ring-4 focus:ring-saffron-500/15 transition-all shadow-sm"
                            />
                        </div>
                        <Button 
                            onClick={handleExportVolunteers}
                            variant="secondary"
                            size="sm"
                            className="flex items-center justify-center gap-2"
                        >
                            <FileSpreadsheet size={15} />
                            <span>Export CSV</span>
                        </Button>
                    </div>
                    
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredVolunteers.map(vol => (
                            <div key={vol.id} className={`p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between group hover:border-saffron-300 hover:bg-white transition-all shadow-sm ${vol.status === 'Deactivated' ? 'opacity-60' : ''}`}>
                                <div className="flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-xl bg-saffron-50 flex items-center justify-center text-saffron-600 border border-saffron-100 font-bold text-xs shrink-0">
                                        {vol.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-bold text-slate-900 leading-none group-hover:text-saffron-600 transition-colors">{vol.name}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                                                vol.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}>
                                                {vol.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                                            <span className="font-semibold text-slate-700">{vol.organisation_name}</span>
                                            <span>·</span>
                                            <span>{vol.mobile}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <TrendingUp size={13} className="text-saffron-600" />
                                            <span className="text-base font-extrabold text-slate-900 tabular-nums">{vol.enrollments}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">Entries</span>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleToggleVolunteerStatus(vol.id, vol.status)}
                                        disabled={statusTransitionId === vol.id}
                                        className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
                                            vol.status === 'Active' 
                                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                                            : 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                        }`}
                                        title={vol.status === 'Active' ? 'Deactivate Volunteer' : 'Activate Volunteer'}
                                    >
                                        {statusTransitionId === vol.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : vol.status === 'Active' ? (
                                            <PowerOff size={16} />
                                        ) : (
                                            <Power size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default AdminDashboard;
