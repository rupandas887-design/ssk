
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
  ExternalLink,
  Trash2,
  AlertTriangle,
  Calendar,
  Building2,
  Fingerprint,
  FileText,
  Activity,
  UserCircle,
  ShieldCheck,
  Phone,
  BadgeCheck,
  MapPin,
  Briefcase,
  Zap,
  Loader2,
  ImageIcon,
  CheckCircle2,
  XCircle
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
                m.mobile.includes(searchQuery) ||
                m.aadhaar.includes(searchQuery);
            return matchOrg && matchVol && matchSearch;
        });
    }, [members, selectedOrgId, selectedVolunteerId, searchQuery]);

    const handleVerifyStatus = async (member: MemberWithAgent) => {
        const newStatus = member.status === MemberStatus.Accepted ? MemberStatus.Pending : MemberStatus.Accepted;
        try {
            const { error } = await supabase.from('members').update({ status: newStatus }).eq('id', member.id);
            if (error) throw error;
            addNotification(`Identity verification status updated to ${newStatus}.`, "success");
            fetchData();
        } catch (err) {
            addNotification("Verification update failed.", "error");
        }
    };

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
            addNotification(`Purge failed.`, "error");
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
                father_name: editingMember.father_name,
                mobile: editingMember.mobile,
                emergency_contact: editingMember.emergency_contact,
                dob: editingMember.dob,
                gender: editingMember.gender,
                pincode: editingMember.pincode,
                address: editingMember.address,
                occupation: editingMember.occupation,
                support_need: editingMember.support_need,
                status: editingMember.status,
            }).eq('id', editingMember.id);
            
            if (error) throw error;
            addNotification("Member identity synchronized.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Update failed.`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExport = () => {
        const headers = ['Aadhaar', 'Full Name', 'Father Name', 'Mobile', 'DOB', 'Gender', 'Address', 'Pincode', 'Occupation', 'Support Need', 'Volunteer', 'Organization', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar, 
            `${m.name} ${m.surname}`, 
            m.father_name, 
            m.mobile, 
            m.dob, 
            m.gender,
            m.address,
            m.pincode,
            m.occupation,
            m.support_need,
            m.agent_profile?.name || 'N/A',
            m.agent_profile?.organisations?.name || 'N/A',
            m.status
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Registry_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout title="Master Registry Terminal">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-8 text-orange-500 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Multi-Vector Registry Intelligence</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <Select label="Filter by Organization" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="bg-black/60 border-gray-700">
                            <option value="">All Organizations</option>
                            {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                        </Select>
                        <Input 
                            label="Universal Search"
                            placeholder="Name, Mobile, Aadhaar..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            icon={<Search size={16} />}
                            className="bg-black/60 border-gray-700"
                        />
                        <div className="md:col-span-2 flex gap-4 items-end">
                            <Button onClick={fetchData} variant="secondary" className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest gap-2">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Node
                            </Button>
                            <Button onClick={handleExport} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest gap-2 bg-blue-600 hover:bg-blue-700">
                                <FileSpreadsheet size={16} /> Export CSV
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Global Identity Registry">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-400 uppercase tracking-widest text-[10px] font-black">
                                    <th className="p-6">Member Identity</th>
                                    <th className="p-6 text-blue-500">Personnel Attribution</th>
                                    <th className="p-6 text-center">Verification</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-24 text-center text-[11px] animate-pulse font-black uppercase tracking-[0.4em] text-gray-500">Loading Node Data...</td></tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors break-words line-clamp-1">{m.name} {m.surname}</span>
                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 font-mono tracking-tighter">
                                                    <span>{m.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                                                    <span>{m.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                                                    <UserCircle size={20} />
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-[11px] font-black text-white uppercase tracking-widest break-words line-clamp-1">
                                                        {m.agent_profile?.name || 'Unknown Agent'}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Building2 size={10} className="text-orange-500/80" />
                                                        <span className="text-[9px] text-orange-500/80 font-black uppercase tracking-widest break-words line-clamp-1">
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
                                            <div className="flex justify-end items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button 
                                                  onClick={() => handleVerifyStatus(m)} 
                                                  className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${m.status === MemberStatus.Accepted ? 'bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10' : 'bg-green-500/5 text-green-500 border-green-500/10 hover:bg-green-500/10'}`}
                                                  title={m.status === MemberStatus.Accepted ? "Reset Verification" : "Verify Identity"}
                                                >
                                                    {m.status === MemberStatus.Accepted ? 'Unverify' : 'Verify'}
                                                </button>
                                                <button onClick={() => handleEditMember(m)} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-orange-500/50 text-gray-400 hover:text-white transition-all" title="Modify Master File">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => setMemberToDelete(m.id)} className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-red-500/60 hover:text-red-500 transition-all" title="Purge Identity">
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

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Master Identity Override">
                {editingMember && (
                    <div className="space-y-8 p-2 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="p-8 bg-orange-500/5 border border-orange-500/10 rounded-[2.5rem] relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                                <Fingerprint size={100} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest">Aadhaar Front Side</p>
                                    <div className="aspect-video rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl relative group/img">
                                        <img src={editingMember.aadhaar_front_url} className="w-full h-full object-cover" />
                                        <a href={editingMember.aadhaar_front_url} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest">Aadhaar Back Side</p>
                                    <div className="aspect-video rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl relative group/img">
                                        <img src={editingMember.aadhaar_back_url} className="w-full h-full object-cover" />
                                        <a href={editingMember.aadhaar_back_url} target="_blank" className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-4 pt-2 border-t border-white/5 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-1">Target Identity Node</p>
                                    <h4 className="text-2xl font-cinzel text-white leading-tight break-words overflow-hidden line-clamp-2">{editingMember.name} {editingMember.surname}</h4>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <div className="px-4 py-2 bg-black/60 rounded-xl border border-white/5 flex items-center gap-2">
                                        <Fingerprint size={12} className="text-orange-500/50" />
                                        <span className="text-[10px] font-mono text-gray-300 uppercase tracking-[0.2em]">{editingMember.aadhaar}</span>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${editingMember.status === MemberStatus.Accepted ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                        <BadgeCheck size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{editingMember.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Given Name" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} icon={<UserIcon size={14} />} />
                            <Input label="Surname" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} icon={<UserIcon size={14} />} />
                            <Input label="Father / Guardian" value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} icon={<UserCircle size={14} />} />
                            <Input label="Mobile" value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} icon={<Phone size={14} />} />
                            <Input label="Emergency Contact" value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} icon={<ShieldCheck size={14} />} />
                            <Input label="DOB" type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} icon={<Calendar size={14} />} />
                            <Select label="Gender" value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})}>
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Input label="Pincode" value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} icon={<MapPin size={14} />} />
                            <div className="md:col-span-2">
                                <Input label="Full Address" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} icon={<MapPin size={14} />} />
                            </div>
                            <Select label="Occupation" value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="Support Need" value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                            <div className="md:col-span-2">
                                <Select label="Verification Override" value={editingMember.status} onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MemberStatus})}>
                                    <option value={MemberStatus.Pending}>Pending Verification</option>
                                    <option value={MemberStatus.Accepted}>Accepted / Verified</option>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-10 border-t border-white/5 mt-8 sticky bottom-0 bg-gray-900 pb-4 z-10">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="px-10 py-4 text-[10px] font-black uppercase tracking-widest">Cancel</Button>
                            <Button onClick={handleUpdateMember} disabled={isUpdating} className="px-12 py-4 text-[10px] font-black uppercase tracking-widest bg-orange-600 hover:bg-orange-500 flex items-center gap-2">
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isUpdating ? 'Syncing...' : 'Update File'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default AdminReports;
