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
        organisations?: { 
          name: string,
          profile_photo_url?: string
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
                            organisations (name, profile_photo_url)
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
        const headers = ['Aadhaar', 'Display Name', 'Father Name', 'Mobile', 'DOB', 'Gender', 'Address', 'Pincode', 'Occupation', 'Support Need', 'Volunteer', 'Organization', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar, 
            formatDisplayName(m.name, m.surname), 
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
            <div className="space-y-12">
                <Card className="bg-gray-950/50 border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-10 text-orange-500/80 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em]">Query Processor</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
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
                        <div className="md:col-span-2 flex gap-4 items-end">
                            <Button onClick={fetchData} variant="secondary" className="flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] gap-3">
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync Registry
                            </Button>
                            <Button onClick={handleExport} className="flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] gap-3 bg-blue-600 hover:bg-blue-700">
                                <FileSpreadsheet size={16} /> Export Master CSV
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Universal Identification Ledger" className="overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="border-b border-white/10 bg-white/[0.02]">
                                <tr className="text-gray-400 uppercase tracking-widest text-[10px] font-black">
                                    <th className="p-8">Identification Details</th>
                                    <th className="p-8 text-blue-500/80">Source Attribution</th>
                                    <th className="p-8 text-center">Status</th>
                                    <th className="p-8 text-right pr-12">Registry Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-32 text-center text-[12px] animate-pulse font-black uppercase tracking-[0.5em] text-gray-600">Syncing Network Uplink...</td></tr>
                                ) : filteredMembers.length === 0 ? (
                                    <tr><td colSpan={4} className="p-32 text-center text-[12px] font-black uppercase tracking-[0.5em] text-gray-700">No identity records found in this vector.</td></tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-8">
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="font-bold text-white text-xl group-hover:text-orange-500 transition-colors truncate mb-1">
                                                    {formatDisplayName(m.name, m.surname)}
                                                </span>
                                                <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono tracking-tight">
                                                    <span className="flex items-center gap-1.5"><Phone size={10} /> {m.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-800"></span>
                                                    <span className="flex items-center gap-1.5"><Fingerprint size={10} /> {m.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-all shadow-lg bg-black/40">
                                                  {m.agent_profile?.organisations?.profile_photo_url ? (
                                                    <img 
                                                      src={m.agent_profile.organisations.profile_photo_url} 
                                                      className="h-full w-full object-cover" 
                                                      alt="Org logo" 
                                                    />
                                                  ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-orange-500/30">
                                                        <Building2 size={20} />
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
                                        <td className="p-8 text-center">
                                            <div className="flex justify-center">
                                                <span className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border ${m.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-8 text-right pr-12">
                                            <div className="flex justify-end items-center gap-3">
                                                <button 
                                                  onClick={() => handleVerifyStatus(m)} 
                                                  className={`px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${m.status === MemberStatus.Accepted ? 'bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10' : 'bg-green-500/5 text-green-500 border-green-500/10 hover:bg-green-500/10'}`}
                                                >
                                                    {m.status === MemberStatus.Accepted ? 'Retract' : 'Verify'}
                                                </button>
                                                <button onClick={() => handleEditMember(m)} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:border-orange-500/50 text-gray-500 hover:text-white transition-all">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => setMemberToDelete(m)} className="p-3 bg-red-500/5 rounded-2xl border border-red-500/10 text-red-500/40 hover:text-red-500 transition-all">
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

            {/* PREVIEW MODAL - Redesigned for Trusted Visualization */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Member Identity Audit">
                {editingMember && (
                    <div className="space-y-10 p-2 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        {/* High-Fidelity Card Preview */}
                        <div className="relative group/card transition-all duration-700">
                             <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-blue-600/20 rounded-[3rem] blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000"></div>
                             
                             <div className="relative p-10 bg-black/60 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
                                {/* Trust Badge */}
                                <div className="absolute top-8 right-8 z-20">
                                    {editingMember.status === MemberStatus.Accepted ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full shadow-lg">
                                            <CheckCircle size={14} className="text-green-500" />
                                            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Verified Identity</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full shadow-lg">
                                            <Clock size={14} className="text-orange-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Pending Review</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                    {/* Identity Image */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="text-orange-500/60" size={14} />
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aadhaar Scan</p>
                                        </div>
                                        <div className="aspect-[1.6/1] rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-inner group/img relative">
                                            <img src={editingMember.aadhaar_front_url} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-1000" />
                                            <a href={editingMember.aadhaar_front_url} target="_blank" className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all duration-500 backdrop-blur-sm">
                                                <ExternalLink className="text-white" size={28} strokeWidth={1.5} />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Primary Attributes */}
                                    <div className="flex flex-col justify-center space-y-8">
                                        <div>
                                            <p className="text-[11px] font-black text-orange-500 uppercase tracking-[0.5em] mb-3">Identity Owner</p>
                                            <h4 className="text-3xl md:text-4xl font-cinzel text-white leading-tight font-bold">
                                                {formatDisplayName(editingMember.name, editingMember.surname)}
                                            </h4>
                                        </div>
                                        
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-4 text-gray-400">
                                                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-orange-500/60">
                                                    <Fingerprint size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Identification No.</span>
                                                    <span className="text-base font-mono text-white tracking-widest">{editingMember.aadhaar}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-gray-400">
                                                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-orange-500/60">
                                                    <Building2 size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Source Node</span>
                                                    <span className="text-sm font-bold text-white uppercase tracking-wider">{editingMember.agent_profile?.organisations?.name || 'Master Base'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Abstract Design Pattern */}
                                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-orange-600/5 blur-[100px] rounded-full pointer-events-none"></div>
                             </div>
                        </div>

                        {/* Editable Form Data */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
                            <Input label="Given Name" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} icon={<UserIcon size={14} />} />
                            <Input label="Surname" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} icon={<UserIcon size={14} />} />
                            <Input label="Father / Guardian" value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} icon={<UserCircle size={14} />} />
                            <Input label="Primary Mobile" value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} icon={<Phone size={14} />} />
                            <Input label="Emergency Contact" value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} icon={<Phone size={14} />} />
                            <Input label="Date of Birth" type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} icon={<Calendar size={14} />} />
                            <Select label="Biological Gender" value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})}>
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Input label="Pincode" value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} icon={<MapPin size={14} />} />
                            <Select label="Verification" value={editingMember.status} onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MemberStatus})}>
                                <option value={MemberStatus.Pending}>Pending Approval</option>
                                <option value={MemberStatus.Accepted}>Verified & Accepted</option>
                            </Select>
                            <div className="lg:col-span-3">
                                <Input label="Residential Address" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} icon={<MapPin size={14} />} />
                            </div>
                        </div>

                        <div className="flex justify-between items-center gap-6 pt-12 border-t border-white/5 mt-10 sticky bottom-0 bg-black/90 pb-6 z-30 backdrop-blur-lg">
                            <div className="flex gap-4">
                                <Button variant="secondary" onClick={() => handleCopyDetails(editingMember)} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest gap-2 bg-white/5">
                                    <Copy size={16} /> Copy Details
                                </Button>
                                <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="px-10 py-4 text-[10px] font-black uppercase tracking-widest">Abort</Button>
                            </div>
                            
                            <Button onClick={handleUpdateMember} disabled={isUpdating} className="px-16 py-4 text-[11px] font-black uppercase tracking-[0.2em] bg-orange-600 hover:bg-orange-500 shadow-2xl flex items-center gap-3">
                                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {isUpdating ? 'Synchronizing...' : 'Save & Close File'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!memberToDelete} onClose={() => setMemberToDelete(null)} title="Security Protocol: Purge Identity">
                <div className="p-8 text-center space-y-10">
                    <div className="p-8 bg-red-500/10 rounded-full w-28 h-28 mx-auto flex items-center justify-center text-red-500 border border-red-500/20 shadow-inner">
                        <AlertTriangle size={56} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-2xl font-cinzel text-white tracking-widest">Confirm Irreversible Purge</h4>
                        <p className="text-sm text-gray-500 leading-relaxed uppercase tracking-[0.2em] font-black max-w-sm mx-auto">
                            Completely remove <span className="text-red-500">"{memberToDelete ? formatDisplayName(memberToDelete.name, memberToDelete.surname) : ''}"</span> from the global registry?
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => setMemberToDelete(null)} className="flex-1 text-[11px] font-black tracking-widest uppercase py-5">Abort operation</Button>
                        <Button onClick={handleDeleteMember} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-[11px] font-black tracking-widest uppercase py-5 shadow-2xl">
                            {isDeleting ? 'PURGING...' : 'Execute Purge'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default AdminReports;