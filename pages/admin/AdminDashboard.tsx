
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { 
  Shield, 
  Users, 
  UserCheck, 
  RefreshCw, 
  User as UserIcon, 
  ExternalLink, 
  Search, 
  Building2, 
  Activity, 
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Organisation, Volunteer, Member, Role, User as ProfileUser } from '../../types';
import { supabase } from '../../supabase/client';
import { mapStringToRole } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface OrgStats extends Organisation {
    volunteerCount: number;
    memberCount: number;
}

type MemberExtended = Member & {
    agent_name?: string;
    agent_mobile?: string;
};

const AdminDashboard: React.FC = () => {
    const { addNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [allProfiles, setAllProfiles] = useState<ProfileUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isVolunteersModalOpen, setIsVolunteersModalOpen] = useState(false);
    const [totalVolunteersCount, setTotalVolunteersCount] = useState<number>(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Optimized count for total volunteers
            const { count, error: countError } = await supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .eq('role', 'Volunteer');

            if (countError) console.error("Count Sync Error:", countError);
            else setTotalVolunteersCount(count || 0);

            const [orgsRes, membersRes, profilesRes] = await Promise.all([
                supabase.from('organisations').select('*').order('name'),
                supabase.from('members').select('*').order('submission_date', { ascending: false }),
                supabase.from('profiles').select('*')
            ]);

            if (orgsRes.data) setOrganisations(orgsRes.data);
            if (membersRes.data) setMembers(membersRes.data);
            
            if (profilesRes.data) {
                const mappedProfiles: ProfileUser[] = profilesRes.data.map(p => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    role: mapStringToRole(p.role),
                    organisationId: p.organisation_id,
                    mobile: p.mobile,
                    status: p.status
                }));
                setAllProfiles(mappedProfiles);
            }
        } catch (err) {
            console.error("Master Sync Fault:", err);
            addNotification("Failed to synchronize master registry.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Aggregate statistics per organization
    const orgStats = useMemo<OrgStats[]>(() => {
        return organisations.map(org => {
            const orgVolunteers = allProfiles.filter(p => p.organisationId === org.id && p.role === Role.Volunteer);
            const orgMembers = members.filter(m => m.organisation_id === org.id);
            return {
                ...org,
                volunteerCount: orgVolunteers.length,
                memberCount: orgMembers.length
            };
        }).sort((a, b) => b.memberCount - a.memberCount);
    }, [organisations, allProfiles, members]);

    const volunteersList = useMemo<Volunteer[]>(() => {
        const enrollmentMap = members.reduce((acc, m) => {
            if (m.volunteer_id) acc[m.volunteer_id] = (acc[m.volunteer_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return allProfiles
            .filter(p => p.role === Role.Volunteer)
            .map(v => ({
                ...v,
                organisationId: v.organisationId || '',
                enrollments: enrollmentMap[v.id] || 0,
            })).sort((a, b) => b.enrollments - a.enrollments);
    }, [allProfiles, members]);

    const filteredVolunteers = useMemo(() => {
        if (!searchTerm) return volunteersList;
        const term = searchTerm.toLowerCase();
        return volunteersList.filter(vol => 
            vol.name.toLowerCase().includes(term) || 
            vol.mobile?.includes(term)
        );
    }, [searchTerm, volunteersList]);

    const recentActivity = useMemo<MemberExtended[]>(() => {
        return members.slice(0, 10).map(m => {
            const agent = allProfiles.find(p => p.id === m.volunteer_id);
            return {
                ...m,
                agent_name: agent?.name || 'Unknown Agent',
                agent_mobile: agent?.mobile || 'N/A'
            };
        });
    }, [members, allProfiles]);

    return (
        <DashboardLayout title="Master Admin Dashboard">
            {/* Top Statistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="p-8 border-l-4 border-orange-600 bg-[#080808] hover:bg-[#0a0a0a] transition-all group">
                    <div className="flex justify-between items-center mb-4">
                      <Shield className="text-orange-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-black text-orange-600/50 uppercase tracking-[0.2em]">Sectors</span>
                    </div>
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Total Organisations</p>
                        <p className="text-4xl font-black text-white">{organisations.length}</p>
                    </div>
                </Card>
                
                <button 
                    onClick={() => setIsVolunteersModalOpen(true)}
                    className="text-left w-full block group relative overflow-hidden rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                    <Card className="p-8 border-l-4 border-blue-600 bg-[#080808] group-hover:bg-[#0a0a0a] transition-all h-full">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-20 transition-opacity">
                            <ExternalLink size={24} className="text-blue-500" />
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <Users className="text-blue-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                            <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-[0.2em]">Personnel</span>
                        </div>
                        <div>
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Global Volunteers</p>
                            <p className="text-4xl font-black text-white">{totalVolunteersCount}</p>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-4 opacity-0 group-hover:opacity-100 transition-opacity">Open Registry Terminal →</p>
                        </div>
                    </Card>
                </button>

                <Card className="p-8 border-l-4 border-green-600 bg-[#080808] hover:bg-[#0a0a0a] transition-all group">
                    <div className="flex justify-between items-center mb-4">
                      <UserCheck className="text-green-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-black text-green-600/50 uppercase tracking-[0.2em]">Database</span>
                    </div>
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Total Members</p>
                        <p className="text-4xl font-black text-white">{members.length}</p>
                    </div>
                </Card>
            </div>

            {/* Organizations Distribution Breakdown */}
            <div className="mt-12">
                <Card title="Organization Statistics Breakdown" className="bg-[#050505] border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 uppercase tracking-wider text-[10px] font-black">
                                    <th className="p-4">Organization Name</th>
                                    <th className="p-4 text-center">Volunteers</th>
                                    <th className="p-4 text-center">Members</th>
                                    <th className="p-4 text-right">Activity Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {orgStats.map(org => (
                                    <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                                    <Building2 size={16} />
                                                </div>
                                                <span className="font-bold text-white">{org.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center font-mono text-blue-400 font-bold">{org.volunteerCount}</td>
                                        <td className="p-4 text-center font-mono text-green-400 font-bold">{org.memberCount}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                {[1, 2, 3, 4, 5].map((bar) => (
                                                    <div 
                                                        key={bar} 
                                                        className={`w-1 h-3 rounded-full ${org.memberCount > (bar * 20) ? 'bg-orange-500' : 'bg-gray-800'}`}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {orgStats.length === 0 && !loading && (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-600 uppercase tracking-widest font-black text-[10px]">No sector data detected.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Recent Global Activity Stream */}
            <div className="mt-12">
                <Card title="Recent Registry Activity" className="bg-[#050505] border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 uppercase tracking-wider text-[10px] font-black">
                                    <th className="p-4">Member</th>
                                    <th className="p-4">Agent Source</th>
                                    <th className="p-4 text-right">Sync Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {recentActivity.map(m => (
                                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white">{m.name} {m.surname}</span>
                                                <span className="text-[10px] text-gray-500 font-mono">{m.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">{m.agent_name}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] text-orange-500/70 font-black uppercase">
                                                        {organisations.find(o => o.id === m.organisation_id)?.name || 'Standalone'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 font-mono text-[10px] text-right">
                                            {m.submission_date?.split('T')[0] || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                                {recentActivity.length === 0 && !loading && (
                                    <tr><td colSpan={3} className="p-12 text-center text-gray-600 uppercase tracking-widest font-black text-[10px]">No recent node updates detected.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Personnel Registry Terminal Modal */}
            <Modal 
                isOpen={isVolunteersModalOpen} 
                onClose={() => setIsVolunteersModalOpen(false)} 
                title="Global Personnel Terminal"
            >
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Search Agents by Name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-mono focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>
                    <div className="space-y-3">
                        {filteredVolunteers.map(vol => {
                            const org = organisations.find(o => o.id === vol.organisationId);
                            return (
                                <div key={vol.id} className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white leading-none mb-1">{vol.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-gray-500">{vol.mobile}</span>
                                                <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                                                <span className="text-[9px] font-black uppercase text-orange-500/60 tracking-widest">{org?.name || 'Unknown'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-2 mb-1">
                                            <TrendingUp size={12} className="text-blue-500" />
                                            <span className="text-xs font-black text-white">{vol.enrollments}</span>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Enrollments</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default AdminDashboard;
