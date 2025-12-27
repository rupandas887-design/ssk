
import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { supabase } from '../../supabase/client';
import { Member, Organisation, Role, User as VolunteerUser, Gender, Occupation, SupportNeed, MemberStatus } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { 
  FileSpreadsheet, 
  Search,
  RefreshCw,
  Edit3,
  Save,
  User as UserIcon,
  Image as ImageIcon,
  ExternalLink,
  Filter,
  Trash2,
  AlertTriangle,
  Calendar,
  Building2,
  Fingerprint,
  FileText,
  Activity,
  Eye,
  UserCircle,
  ShieldCheck,
  Phone,
  BadgeCheck
} from 'lucide-react';

type MemberWithAgent = Member & {
    agent_profile?: { 
        name: string, 
        mobile: string,
        organisations?: { name: string }
    }
};

const AdminReports: React.FC = () => {
    const [members, setMembers] = useState<MemberWithAgent[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [allProfiles, setAllProfiles] = useState<VolunteerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [editingMember, setEditingMember] = useState<MemberWithAgent | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [membersRes, orgsRes, profilesRes] = await Promise.all([
                supabase
                    .from('members')
                    .select(`
                        *,
                        agent_profile:profiles!volunteer_id(
                            name, 
                            mobile,
                            organisations (name)
                        )
                    `)
                    .order('submission_date', { ascending: false }),
                supabase.from('organisations').select('*').order('name'),
                supabase.from('profiles').select('*')
            ]);
            
            if (membersRes.data) setMembers(membersRes.data as MemberWithAgent[]);
            if (orgsRes.data) setOrganisations(orgsRes.data);
            
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
                setAllProfiles(mappedProfiles);
            }
        } catch (err) {
            addNotification("Master registry uplink failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchOrg = !selectedOrgId || m.organisation_id === selectedOrgId;
            const matchVol = !selectedVolunteerId || m.volunteer_id === selectedVolunteerId;
            const matchSearch = !searchQuery || 
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                m.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.mobile.includes(searchQuery);
            return matchOrg && matchVol && matchSearch;
        });
    }, [members, selectedOrgId, selectedVolunteerId, searchQuery]);

    const handleEditMember = (member: MemberWithAgent) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleDeleteMember = async () => {
        if (!memberToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('members').delete().eq('id', memberToDelete);
            if (error) throw error;
            addNotification("Record purged.", "success");
            setMemberToDelete(null);
            fetchData();
        } catch (err: any) {
            addNotification(`Action failed.`, "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase.from('members').update({
                name: editingMember.name,
                surname: editingMember.surname,
                status: editingMember.status,
            }).eq('id', editingMember.id);
            if (error) throw error;
            addNotification("Data synchronized.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Update failed.`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <DashboardLayout title="Master Registry Terminal">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-8 text-orange-500 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Multi-Vector Registry Search</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                        <Select label="Filter by Sector" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
                            <option value="">All Organizations</option>
                            {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                        </Select>
                        <Input 
                            placeholder="Search by Name/Mobile..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            icon={<Search size={16} />}
                        />
                        <div className="flex gap-4 items-end">
                            <Button onClick={fetchData} variant="secondary" className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest gap-2">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Global Enrolled Members">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 uppercase tracking-widest text-[10px] font-black">
                                    <th className="p-6">Member Identity</th>
                                    <th className="p-6 text-blue-500">Personnel Attribution</th>
                                    <th className="p-6 text-center">Verification</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-24 text-center text-[11px] animate-pulse font-black uppercase tracking-[0.4em] text-gray-600">Loading Node Data...</td></tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-lg">{m.name} {m.surname}</span>
                                                <span className="text-[11px] text-gray-600 font-mono">{m.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                                    <UserCircle size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-white uppercase tracking-widest">
                                                        {m.agent_profile?.name || 'Unknown Agent'}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Building2 size={10} className="text-orange-500/80" />
                                                        <span className="text-[9px] text-orange-500/80 font-black uppercase tracking-widest">
                                                            {m.agent_profile?.organisations?.name || 'Independent'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${m.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleEditMember(m)} className="p-3 text-gray-400 hover:text-white">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => setMemberToDelete(m.id)} className="p-3 text-red-500/60 hover:text-red-500">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modify Member Identity">
                {editingMember && (
                    <div className="space-y-6">
                        <Input label="Name" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                        <Input label="Surname" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                        <Select label="Status" value={editingMember.status} onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MemberStatus})}>
                            <option value={MemberStatus.Pending}>Pending</option>
                            <option value={MemberStatus.Accepted}>Accepted</option>
                        </Select>
                        <div className="flex justify-end gap-4 pt-6">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateMember} disabled={isUpdating}>{isUpdating ? 'Saving...' : 'Save Changes'}</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default AdminReports;
