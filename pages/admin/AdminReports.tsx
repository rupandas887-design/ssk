import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { supabase } from '../../supabase/client';
import { Member, Organisation, Role, User as VolunteerUser, Gender, Occupation, SupportNeed, MemberStatus, MaritalStatus, Qualification } from '../../types';
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
  Calendar,
  Building2,
  Fingerprint,
  Activity,
  UserCircle,
  Phone,
  BadgeCheck,
  MapPin,
  Loader2,
  Copy,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle,
  Clock
} from 'lucide-react';

type MemberWithAgent = Member & {
    agent_profile?: { 
        name: string, 
        mobile: string,
        profile_photo_url?: string,
        organisations?: { 
          name: string
        }
    }
};

const AdminReports: React.FC = () => {
    const [members, setMembers] = useState<MemberWithAgent[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const [editingMember, setEditingMember] = useState<MemberWithAgent | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<MemberWithAgent | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatDisplayName = (first: string, last: string) => {
        const f = (first || '').trim().toLowerCase();
        const l = (last || '').trim().toLowerCase();
        return `${f} ${l}`.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [membersRes, orgsRes] = await Promise.all([
                supabase
                    .from('members')
                    .select(`
                        *,
                        agent_profile:profiles!volunteer_id(
                            name, 
                            mobile,
                            profile_photo_url,
                            organisations (name)
                        )
                    `)
                    .order('submission_date', { ascending: false }),
                supabase.from('organisations').select('*').order('name')
            ]);
            
            if (membersRes.data) setMembers(membersRes.data as MemberWithAgent[]);
            if (orgsRes.data) setOrganisations(orgsRes.data || []);
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
            addNotification(`Verification status updated.`, "success");
            fetchData();
        } catch (err) {
            addNotification("Verification update failed.", "error");
        }
    };

    const handleCopyDetails = (member: MemberWithAgent) => {
        const text = `Name: ${formatDisplayName(member.name, member.surname)}\nMobile: ${member.mobile}\nAadhaar: ${member.aadhaar}`;
        navigator.clipboard.writeText(text);
        addNotification("Identity details copied to clipboard.", "info");
    };

    const handleEditMember = (member: MemberWithAgent) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleDeleteMember = async () => {
        if (!memberToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('members').delete().eq('id', memberToDelete.id);
            if (error) throw error;
            addNotification("Identity record purged successfully.", "success");
            setMemberToDelete(null);
            fetchData();
        } catch (err: any) {
            addNotification(`Purge operation failed.`, "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase.from('members').update({
                name: editingMember.name.trim(),
                surname: editingMember.surname.trim(),
                father_name: editingMember.father_name.trim(),
                mobile: editingMember.mobile.trim(),
                emergency_contact: editingMember.emergency_contact.trim(),
                dob: editingMember.dob,
                gender: editingMember.gender,
                marital_status: editingMember.marital_status,
                qualification: editingMember.qualification,
                pincode: editingMember.pincode,
                address: editingMember.address,
                occupation: editingMember.occupation,
                support_need: editingMember.support_need,
                status: editingMember.status,
            }).eq('id', editingMember.id);
            
            if (error) throw error;
            addNotification("Identity synchronized.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Update failed.`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExport = () => {
        const headers = ['Aadhaar', 'Display Name', 'Father Name', 'Mobile', 'DOB', 'Gender', 'Marital Status', 'Qualification', 'Address', 'Pincode', 'What they do?', 'What they want?', 'Volunteer', 'Organization', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar, 
            formatDisplayName(m.name, m.surname), 
            m.father_name, 
            m.mobile, 
            m.dob, 
            m.gender,
            m.marital_status,
            m.qualification,
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
        link.download = `Master_Registry_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout title="Master Registry Terminal">
            <div className="space-y-12">
                <Card className="bg-gray-950/50 border-white/5 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-8 sm:mb-10 text-orange-500/80 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em]">Query Processor</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 relative z-10">
                        <Select label="Filter by Node" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} className="bg-black/60 border-gray-700">
                            <option value="">All Organizations</option>
                            {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                        </Select>
                        <Input 
                            label="Identity Search"
                            placeholder="Name, Mobile, UID..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            icon={<Search size={16} />}
                            className="bg-black/60 border-gray-700"
                        />
                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
                            <Button onClick={fetchData} variant="secondary" className="flex-1 py-3 sm:py-4 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] gap-3">
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Registry
                            </Button>
                            <Button onClick={handleExport} className="flex-1 py-3 sm:py-4 text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] gap-3 bg-blue-600 hover:bg-blue-700">
                                <FileSpreadsheet size={16} /> Export Master CSV
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Universal Identification Ledger" className="overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="border-b border-white/10 bg-white/[0.02]">
                                <tr className="text-gray-400 uppercase tracking-widest text-[9px] sm:text-[10px] font-black">
                                    <th className="p-4 sm:p-8">Identification Details</th>
                                    <th className="p-4 sm:p-8 text-blue-500/80 hidden lg:table-cell">Source Attribution</th>
                                    <th className="p-4 sm:p-8 text-center">Status</th>
                                    <th className="p-4 sm:p-8 text-right pr-6 sm:pr-12">Registry Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-32 text-center text-[12px] animate-pulse font-black uppercase tracking-[0.5em] text-gray-600">Syncing Network Uplink...</td></tr>
                                ) : filteredMembers.length === 0 ? (
                                    <tr><td colSpan={4} className="p-32 text-center text-[12px] font-black uppercase tracking-[0.5em] text-gray-700">No identity records found in this vector.</td></tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-4 sm:p-8">
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-bold text-white text-base sm:text-xl group-hover:text-orange-500 transition-colors truncate mb-1">
                                                    {formatDisplayName(m.name, m.surname)}
                                                </span>
                                                <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-gray-500 font-mono tracking-tight">
                                                    <span className="flex items-center gap-1.5"><Phone size={10} /> {m.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-800 hidden sm:block"></span>
                                                    <span className="flex items-center gap-1.5"><Fingerprint size={10} /> {m.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8 hidden lg:table-cell">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-all shadow-lg bg-black/40">
                                                  {m.agent_profile?.profile_photo_url ? (
                                                    <img 
                                                      src={m.agent_profile.profile_photo_url} 
                                                      className="h-full w-full object-cover" 
                                                      alt="Agent profile" 
                                                    />
                                                  ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-blue-500/30">
                                                        <UserCircle size={20} />
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] truncate group-hover:text-blue-400 transition-colors">
                                                        {m.agent_profile?.name || 'Independent Agent'}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-orange-500/60 font-black uppercase tracking-widest truncate">
                                                            {m.agent_profile?.organisations?.name || 'Central Command'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 sm:p-8 text-center">
                                            <div className="flex justify-center">
                                                <span className={`px-3 sm:px-5 py-1 sm:py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] rounded-full border ${m.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 sm:p-8 text-right pr-4 sm:pr-12">
                                            <div className="flex justify-end items-center gap-2 sm:gap-3">
                                                <button 
                                                  onClick={() => handleVerifyStatus(m)} 
                                                  className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${m.status === MemberStatus.Accepted ? 'bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10' : 'bg-green-500/5 text-green-500 border-green-500/10 hover:bg-green-500/10'}`}
                                                >
                                                    {m.status === MemberStatus.Accepted ? 'Retract' : 'Verify'}
                                                </button>
                                                <button onClick={() => handleEditMember(m)} className="p-2 sm:p-3 bg-white/5 rounded-2xl border border-white/10 hover:border-orange-500/50 text-gray-500 hover:text-white transition-all">
                                                    <Edit3 size={16} className="sm:size-[18px]" />
                                                </button>
                                                <button onClick={() => setMemberToDelete(m)} className="p-2 sm:p-3 bg-red-500/5 rounded-2xl border border-red-500/10 text-red-500/40 hover:text-red-500 transition-all">
                                                    <Trash2 size={16} className="sm:size-[18px]" />
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

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Registry Audit Profile" maxWidth="4xl">
                {editingMember && (
                    <div className="space-y-6 sm:space-y-8">
                        <div className="bg-black/60 border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 overflow-hidden relative shadow-2xl">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>

                             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
                                <div className="lg:col-span-5 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="text-orange-500/60" size={12} />
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Digital Aadhaar Capture</p>
                                    </div>
                                    <div className="rounded-[1rem] sm:rounded-[1.25rem] overflow-hidden border border-white/10 bg-black shadow-inner relative group/img aspect-[1.58/1]">
                                        <img src={editingMember.aadhaar_front_url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Aadhaar Front" />
                                        <a href={editingMember.aadhaar_front_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>

                                <div className="lg:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-orange-500/80 uppercase tracking-[0.4em]">Identity Owner</p>
                                                <h4 className="text-lg sm:text-2xl font-cinzel text-white leading-tight font-bold break-words pr-2">
                                                    {formatDisplayName(editingMember.name, editingMember.surname)}
                                                </h4>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${editingMember.status === MemberStatus.Accepted ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500 animate-pulse'}`}>
                                                    {editingMember.status === MemberStatus.Accepted ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                    <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                                        {editingMember.status === MemberStatus.Accepted ? 'Verified Identity' : 'Review Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="p-3 sm:p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-4 transition-all hover:bg-white/[0.05]">
                                                <div className="h-9 w-9 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-500/60">
                                                    <Fingerprint size={16} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-600 mb-0.5">National ID</span>
                                                    <span className="text-xs font-mono text-white tracking-widest truncate">{editingMember.aadhaar}</span>
                                                </div>
                                            </div>

                                            <div className="p-3 sm:p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-4 transition-all hover:bg-white/[0.05]">
                                                <div className="h-9 w-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500/60">
                                                    <Building2 size={16} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-600 mb-0.5">Reporting Node</span>
                                                    <span className="text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-wider truncate">
                                                        {editingMember.agent_profile?.organisations?.name || 'Master Hub'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 pb-20 sm:pb-0">
                            <Input label="First Name" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} icon={<UserIcon size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="Surname" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} icon={<UserIcon size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="Father Name" value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} icon={<UserCircle size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="Primary Contact" value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} icon={<Phone size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="Birth Date" type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} icon={<Calendar size={12} />} className="py-2.5 text-xs font-bold" />
                            <Select label="Biological Gender" value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})} className="py-2.5 text-xs font-bold">
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Select label="Marital Status" value={editingMember.marital_status} onChange={(e) => setEditingMember({...editingMember, marital_status: e.target.value as MaritalStatus})} className="py-2.5 text-xs font-bold">
                                {Object.values(MaritalStatus).map(m => <option key={m} value={m}>{m}</option>)}
                            </Select>
                            <Select label="Qualification" value={editingMember.qualification} onChange={(e) => setEditingMember({...editingMember, qualification: e.target.value as Qualification})} className="py-2.5 text-xs font-bold">
                                {Object.values(Qualification).map(q => <option key={q} value={q}>{q}</option>)}
                            </Select>
                            <Input label="Pincode" value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} icon={<MapPin size={12} />} className="py-2.5 text-xs font-bold" />
                            <Select label="Registry Status" value={editingMember.status} onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MemberStatus})} className="py-2.5 text-xs font-bold">
                                <option value={MemberStatus.Pending}>Pending Audit</option>
                                <option value={MemberStatus.Accepted}>Verified & Safe</option>
                            </Select>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <Input label="Full Address" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} icon={<MapPin size={12} />} className="py-2.5 text-xs font-bold" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 sticky bottom-[-1rem] sm:bottom-[-2rem] bg-[#050505] pb-4 z-20">
                            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                                <Button variant="secondary" onClick={() => handleCopyDetails(editingMember)} className="flex-1 sm:flex-none px-3 sm:px-4 py-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest gap-2 bg-white/5 border border-white/5">
                                    <Copy size={14} /> <span className="hidden xs:inline">Copy</span>
                                </Button>
                                <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="flex-1 sm:flex-none px-6 sm:px-8 py-3 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">Abort</Button>
                            </div>
                            
                            <Button onClick={handleUpdateMember} disabled={isUpdating} className="w-full sm:w-auto px-10 sm:px-12 py-3.5 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] bg-orange-600 hover:bg-orange-500 shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isUpdating ? 'SYNCING...' : 'COMMIT CHANGES'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!memberToDelete} onClose={() => setMemberToDelete(null)} title="Security Protocol: Purge Record">
                <div className="p-4 sm:p-6 text-center space-y-6 sm:space-y-8">
                    <div className="p-6 bg-red-500/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-red-500 border border-red-500/20 shadow-inner">
                        <AlertTriangle size={36} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-lg sm:text-xl font-cinzel text-white tracking-widest">Irreversible Purge</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-[0.2em] font-black max-w-[280px] mx-auto">
                            Erase <span className="text-red-500">"{memberToDelete ? formatDisplayName(memberToDelete.name, memberToDelete.surname) : ''}"</span> from the global registry?
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => setMemberToDelete(null)} className="flex-1 text-[9px] sm:text-[10px] font-black tracking-widest uppercase py-3 sm:py-4">Abort</Button>
                        <Button onClick={handleDeleteMember} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-[9px] sm:text-[10px] font-black tracking-widest uppercase py-3 sm:py-4">
                            {isDeleting ? 'PURGING...' : 'Execute'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default AdminReports;