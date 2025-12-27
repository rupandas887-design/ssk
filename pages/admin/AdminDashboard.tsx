
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
  Phone,
  Database,
  Network,
  BadgeCheck
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
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [volunteersWithOrg, setVolunteersWithOrg] = useState<VolunteerWithOrg[]>([]);
    const [loading, setLoading] = useState(true);
    const [isVolunteersModalOpen, setIsVolunteersModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Organisations and Members
            const [orgsRes, membersRes] = await Promise.all([
                supabase.from('organisations').select('*').order('name'),
                supabase.from('members').select('*')
            ]);

            const fetchedOrgs = orgsRes.data || [];
            const fetchedMembers = membersRes.data || [];
            
            setOrganisations(fetchedOrgs);
            setMembers(fetchedMembers);

            // 2. Fetch ALL Profiles and filter locally to avoid RLS/Case issues
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select(`
                    *,
                    organisations!organisation_id(name)
                `);

            if (profilesError) throw profilesError;

            if (profilesData) {
                // Case-insensitive filtering for 'Volunteer'
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
                    organisation_name: p.organisations?.name || fetchedOrgs.find(o => o.id === p.organisation_id)?.name || 'Independent Sector',
                    mobile: p.mobile || 'N/A',
                    status: p.status || 'Active',
                    enrollments: enrollmentMap[p.id] || 0
                }));
                
                setVolunteersWithOrg(mapped.sort((a, b) => b.enrollments - a.enrollments));
            }
        } catch (err: any) {
            console.error("Master Sync Error:", err);
            addNotification(`Database Sync failed. Check SQL fix.`, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredVolunteers = useMemo(() => {
        if (!searchTerm) return volunteersWithOrg;
        const term = searchTerm.toLowerCase();
        return volunteersWithOrg.filter(vol => 
            vol.name.toLowerCase().includes(term) || 
            vol.mobile?.includes(term) ||
            vol.organisation_name?.toLowerCase().includes(term)
        );
    }, [searchTerm, volunteersWithOrg]);

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
        <DashboardLayout title="Master Admin Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="p-8 border-l-4 border-orange-600 bg-[#080808] hover:bg-[#0a0a0a] transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform">
                        <Building2 size={80} />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <Shield className="text-orange-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-black text-orange-600/50 uppercase tracking-[0.2em]">Sectors</span>
                    </div>
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Active Organisations</p>
                        <p className="text-5xl font-black text-white">{loading ? '...' : organisations.length}</p>
                    </div>
                </Card>
                
                <button 
                    onClick={() => setIsVolunteersModalOpen(true)}
                    className="text-left w-full block group relative overflow-hidden rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                    <Card className="p-8 border-l-4 border-blue-600 bg-[#080808] group-hover:bg-[#0a0a0a] transition-all h-full relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:-rotate-12 transition-transform">
                            <Users size={80} />
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <Users className="text-blue-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                            <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-[0.2em]">Personnel</span>
                        </div>
                        <div>
                            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Global Volunteers</p>
                            <p className="text-5xl font-black text-white">{loading ? '...' : volunteersWithOrg.length}</p>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-4 opacity-60 group-hover:opacity-100 transition-opacity">Open Registry Terminal →</p>
                        </div>
                    </Card>
                </button>

                <Card className="p-8 border-l-4 border-green-600 bg-[#080808] hover:bg-[#0a0a0a] transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-125 transition-transform">
                        <Database size={80} />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <UserCheck className="text-green-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-black text-green-600/50 uppercase tracking-[0.2em]">Database</span>
                    </div>
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Total Enrolled Members</p>
                        <p className="text-5xl font-black text-white">{loading ? '...' : members.length}</p>
                    </div>
                </Card>
            </div>

            <div className="mt-12">
                <Card title="Sector Performance Matrix" className="bg-[#050505] border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 uppercase tracking-wider text-[10px] font-black">
                                    <th className="p-5">Entity Node</th>
                                    <th className="p-5 text-center">Personnel (Volunteers)</th>
                                    <th className="p-5 text-center">Enrollments (Members)</th>
                                    <th className="p-5 text-right">Operational Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {orgStats.map(org => (
                                    <tr key={org.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/10">
                                                    <Building2 size={20} />
                                                </div>
                                                <span className="font-bold text-white text-base group-hover:text-orange-500 transition-colors">{org.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className="font-mono text-xl text-blue-400 font-black">{org.volunteerCount}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className="font-mono text-xl text-green-400 font-black">{org.memberCount}</span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className={`h-2 w-2 rounded-full ${org.status === 'Active' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{org.status}</span>
                                            </div>
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
                title="Global Personnel Registry"
            >
                <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text"
                            placeholder="Filter by Name, Mobile, or Sector..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-mono focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>
                    
                    <div className="space-y-4">
                        {filteredVolunteers.map(vol => (
                            <div key={vol.id} className="p-5 bg-gray-900/40 border border-gray-800/60 rounded-2xl flex items-center justify-between group hover:border-blue-500/40 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform">
                                        <UserIcon size={24} />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-white leading-none mb-2 group-hover:text-blue-400 transition-colors">{vol.name}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 size={10} className="text-orange-500" />
                                                <span className="text-[10px] font-black uppercase text-orange-500/80 tracking-widest">
                                                    {vol.organisation_name}
                                                </span>
                                            </div>
                                            <div className="h-1 w-1 rounded-full bg-gray-800"></div>
                                            <div className="flex items-center gap-1.5">
                                                <Phone size={10} className="text-gray-600" />
                                                <span className="text-[10px] font-mono text-gray-500">{vol.mobile}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 mb-1">
                                        <TrendingUp size={14} className="text-blue-400" />
                                        <span className="text-xl font-black text-white font-mono">{vol.enrollments}</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Enrollments</span>
                                </div>
                            </div>
                        ))}
                        {filteredVolunteers.length === 0 && (
                            <p className="text-center text-gray-600 text-[10px] uppercase font-black py-10">No volunteers found in registry.</p>
                        )}
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default AdminDashboard;
