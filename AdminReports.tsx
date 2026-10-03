import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import AadhaarImageDisplay from '../../components/ui/AadhaarImageDisplay';
import { uploadMemberImage } from '../../services/storageService';
import { supabase } from '../../supabase/client';
import { Member, Organisation, Role, User as VolunteerUser, Gender, Occupation, SupportNeed, MemberStatus, MaritalStatus, Qualification } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { 
  FileSpreadsheet, 
  Search,
  Filter,
  RefreshCw,
  Edit3,
  Save,
  User as UserIcon,
  ExternalLink,
  Trash2,
  Calendar,
  Building2,
  Fingerprint,
  Phone,
  UserCircle,
  BadgeCheck,
  MapPin,
  Loader2,
  Copy,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  ShieldCheck,
  Check
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [editingMember, setEditingMember] = useState<MemberWithAgent | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<MemberWithAgent | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);

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
            
            if (membersRes.error) {
                console.error("AdminReports members error:", membersRes.error);
                const fallbackRes = await supabase.from('members').select('*').order('submission_date', { ascending: false });
                if (fallbackRes.data) setMembers(fallbackRes.data as any);
            } else if (membersRes.data) {
                setMembers(membersRes.data as MemberWithAgent[]);
            }
            if (orgsRes.error) console.error("AdminReports organisations error:", orgsRes.error);
            if (orgsRes.data) setOrganisations(orgsRes.data || []);
        } catch (err) {
            console.error("Master registry synchronization exception:", err);
            addNotification("Master registry synchronization failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('admin-reports-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
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
    }, []);

    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchesOrg = selectedOrgId ? m.organisation_id === selectedOrgId : true;
            
            const q = searchQuery.toLowerCase().trim();
            const fullName = `${m.name || ''} ${m.surname || ''}`.toLowerCase();
            const matchesSearch = !q || (
                fullName.includes(q) ||
                (m.mobile && m.mobile.includes(q)) ||
                (m.aadhaar && m.aadhaar.includes(q)) ||
                (m.agent_profile?.name && m.agent_profile.name.toLowerCase().includes(q))
            );

            return matchesOrg && matchesSearch;
        });
    }, [members, selectedOrgId, searchQuery]);

    const handleVerifyStatus = async (member: MemberWithAgent) => {
        const newStatus = member.status === MemberStatus.Accepted ? MemberStatus.Pending : MemberStatus.Accepted;
        try {
            const { error } = await supabase
                .from('members')
                .update({ status: newStatus })
                .eq('id', member.id);

            if (error) throw error;

            setMembers(prev => prev.map(m => m.id === member.id ? { ...m, status: newStatus } : m));
            addNotification(`Record set to ${newStatus}.`, "success");
        } catch (err: any) {
            addNotification(`Failed to update status: ${err.message}`, "error");
        }
    };

    const handleEditMember = (member: MemberWithAgent) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleUploadAadhaarInEdit = async (file: File) => {
        if (!editingMember) return;
        setIsUploadingAadhaar(true);
        try {
            const { publicUrl } = await uploadMemberImage(file, 'aadhaar');
            setEditingMember(prev => prev ? ({
                ...prev,
                aadhaar_front_url: publicUrl,
                aadhaar_back_url: publicUrl
            }) : null);
            addNotification("Aadhaar card image attached. Click 'Save Updates' to save.", "success");
        } catch (err: any) {
            console.error("Aadhaar upload in admin edit failed:", err);
            addNotification(err.message || "Failed to upload Aadhaar card.", "error");
        } finally {
            setIsUploadingAadhaar(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('members')
                .update({
                    name: editingMember.name,
                    surname: editingMember.surname,
                    father_name: editingMember.father_name,
                    mobile: editingMember.mobile,
                    emergency_contact: editingMember.emergency_contact,
                    dob: editingMember.dob,
                    gender: editingMember.gender,
                    marital_status: editingMember.marital_status,
                    qualification: editingMember.qualification,
                    pincode: editingMember.pincode,
                    address: editingMember.address,
                    occupation: editingMember.occupation,
                    support_need: editingMember.support_need,
                    status: editingMember.status,
                    aadhaar_front_url: editingMember.aadhaar_front_url || null,
                    aadhaar_back_url: editingMember.aadhaar_back_url || null
                })
                .eq('id', editingMember.id);

            if (error) throw error;

            addNotification("Master registry updated.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Update failed: ${err.message}`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteMember = async () => {
        if (!memberToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('members')
                .delete()
                .eq('id', memberToDelete.id);

            if (error) throw error;

            addNotification("Citizen file purged from registry.", "success");
            setMemberToDelete(null);
            fetchData();
        } catch (err: any) {
            addNotification(`Purge failed: ${err.message}`, "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCopyDetails = (member: Member) => {
        const textToCopy = `GLOBAL CITIZEN DOSSIER
--------------------------------
Full Name: ${member.name} ${member.surname}
Father/Husband: ${member.father_name}
Mobile: ${member.mobile}
Emergency Contact: ${member.emergency_contact || 'N/A'}
DOB: ${member.dob}
Gender: ${member.gender}
Marital Status: ${member.marital_status}
Qualification: ${member.qualification}
Pincode: ${member.pincode}
Address: ${member.address}
Occupation: ${member.occupation}
Support Needed: ${member.support_need}
Submission Date: ${new Date(member.submission_date).toLocaleDateString()}
Status: ${member.status}
--------------------------------`;

        navigator.clipboard.writeText(textToCopy);
        addNotification("Citizen dossier copied to clipboard.", "success");
    };

    const handleExport = () => {
        const headers = [
            'Full Name', 'Gharano', 'Father Name', 'Mobile', 
            'Emergency Contact', 'DOB', 'Gender', 'Marital Status', 
            'Qualification', 'Pincode', 'Occupation', 'Support Need', 
            'Volunteer', 'Organization', 'Status', 'Full Address'
        ];
        const rows = filteredMembers.map(m => [
            m.name,
            m.surname,
            m.father_name, 
            m.mobile,
            m.emergency_contact, 
            m.dob, 
            m.gender,
            m.marital_status,
            m.qualification,
            m.pincode,
            m.occupation,
            m.support_need,
            m.agent_profile?.name || 'N/A',
            m.agent_profile?.organisations?.name || 'N/A',
            m.status,
            m.address
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Master_Registry_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout title="Global Members Registry">
            <div className="space-y-6 pb-12">
                {/* Search & Filter - Single Filter button toggle */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Button 
                            variant="secondary"
                            onClick={() => setIsFilterOpen(prev => !prev)}
                            className="px-4 py-2 text-xs font-bold gap-2 flex items-center shadow-xs"
                        >
                            <Filter size={15} className={isFilterOpen ? "text-saffron-600" : ""} />
                            <span>Filter</span>
                        </Button>
                    </div>

                    {isFilterOpen && (
                        <Card 
                            title="Registry Query &amp; Search" 
                            subtitle="Filter records across all nodes by organization, name, mobile, or Aadhaar UID"
                            className="border-slate-200/80 shadow-card"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Select label="Filter by Organization" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
                                    <option value="">All Organizations</option>
                                    {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                                </Select>
                                
                                <div className="lg:col-span-2">
                                    <Input 
                                        label="Search Identity"
                                        placeholder="Search by name, mobile, Aadhaar..." 
                                        value={searchQuery} 
                                        onChange={(e) => setSearchQuery(e.target.value)} 
                                        icon={<Search size={16} />}
                                    />
                                </div>

                                <div className="flex gap-2 items-end">
                                    <Button variant="secondary" onClick={fetchData} className="flex-1 py-2.5 text-xs font-semibold gap-1.5">
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                        <span>Sync</span>
                                    </Button>
                                    <Button onClick={handleExport} className="flex-1 py-2.5 text-xs font-bold gap-1.5">
                                        <FileSpreadsheet size={14} />
                                        <span>CSV</span>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Ledger Table */}
                <Card 
                    title="Universal Identification Ledger" 
                    subtitle="Complete registry records across the entire SSK Samaj network"
                    className="border-slate-200/80 shadow-card p-0 overflow-hidden"
                >
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm min-w-[700px]">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80">
                                <tr className="text-slate-600 text-xs font-bold tracking-wider">
                                    <th className="px-6 py-4">Citizen Identity</th>
                                    <th className="px-6 py-4 hidden lg:table-cell">Source Attribution</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Registry Control</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-xs font-semibold text-slate-500">
                                            <Loader2 className="animate-spin inline-block mr-2" size={18} />
                                            Synchronizing global ledger...
                                        </td>
                                    </tr>
                                ) : filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-xs font-medium text-slate-500">
                                            No identity records found matching your filters.
                                        </td>
                                    </tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id} className="hover:bg-saffron-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-base">
                                                    {formatDisplayName(m.name, m.surname)}
                                                </span>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                                                    <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {m.mobile}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1"><Fingerprint size={12} className="text-slate-400" /> {m.aadhaar ? m.aadhaar.slice(-4).padStart(12, '•') : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                                  {m.agent_profile?.profile_photo_url ? (
                                                    <img 
                                                      src={m.agent_profile.profile_photo_url} 
                                                      className="h-full w-full object-cover" 
                                                      alt="Agent" 
                                                    />
                                                  ) : (
                                                    <UserCircle size={20} className="text-saffron-600" />
                                                  )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-900 truncate">
                                                        {m.agent_profile?.name || 'Independent Agent'}
                                                    </span>
                                                    <span className="text-[11px] text-saffron-600 font-semibold truncate">
                                                        {m.agent_profile?.organisations?.name || 'Master Hub'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full border ${
                                              m.status === MemberStatus.Accepted 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : m.status === MemberStatus.Deceased
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {m.status === MemberStatus.Accepted && <CheckCircle size={12} />}
                                                {m.status === MemberStatus.Pending && <Clock size={12} />}
                                                <span>{m.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-1.5">
                                                <button 
                                                  onClick={() => handleVerifyStatus(m)} 
                                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                    m.status === MemberStatus.Accepted 
                                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                  }`}
                                                  title="Toggle Verification"
                                                >
                                                    {m.status === MemberStatus.Accepted ? 'Retract' : 'Verify'}
                                                </button>
                                                <button 
                                                  onClick={() => handleEditMember(m)} 
                                                  className="p-1.5 text-slate-600 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors border border-slate-200 hover:border-saffron-200"
                                                  title="Edit Record"
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button 
                                                  onClick={() => setMemberToDelete(m)} 
                                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200"
                                                  title="Purge Record"
                                                >
                                                    <Trash2 size={15} />
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

            {/* AUDIT / EDIT MODAL */}
            <Modal 
              isOpen={isEditModalOpen} 
              onClose={() => setIsEditModalOpen(false)} 
              title="Registry Audit Profile" 
              maxWidth="3xl"
              footer={editingMember && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                    <Button 
                      variant="secondary" 
                      onClick={() => handleCopyDetails(editingMember)} 
                      className="w-full sm:w-auto text-xs font-semibold gap-2"
                    >
                        <Copy size={15} /> <span>Copy Details</span>
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button 
                          variant="ghost" 
                          onClick={() => setIsEditModalOpen(false)} 
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleUpdateMember} 
                          disabled={isUpdating} 
                          className="text-xs font-bold gap-2"
                        >
                            {isUpdating ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            <span>Save Record</span>
                        </Button>
                    </div>
                </div>
              )}
            >
                {editingMember && (
                    <div className="space-y-6">
                        {/* Member Summary Header */}
                        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF8A00] shrink-0 font-bold text-lg">
                                    <UserIcon size={22} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-extrabold text-[#0B1020] tracking-tight">
                                        {formatDisplayName(editingMember.name, editingMember.surname)}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Aadhaar: <span className="font-mono text-slate-600">{editingMember.aadhaar || 'N/A'}</span> • Enrolled: {new Date(editingMember.submission_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 ${
                              editingMember.status === MemberStatus.Accepted 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                : editingMember.status === MemberStatus.Deceased
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : 'bg-orange-50/70 text-[#C65E00] border-orange-200'
                            }`}>
                              {editingMember.status}
                            </span>
                        </div>

                        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input label="Full Name" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                            <Input label="Gharano (Surname)" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                            <Input label="Father / Husband Name" value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} />
                            <Input label="Primary Mobile" value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} />
                            <Input label="Emergency Contact" value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} />
                            <Input label="Date of Birth" type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} />
                            <Select label="Gender" value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})}>
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Select label="Marital Status" value={editingMember.marital_status} onChange={(e) => setEditingMember({...editingMember, marital_status: e.target.value as MaritalStatus})}>
                                {Object.values(MaritalStatus).map(m => <option key={m} value={m}>{m}</option>)}
                            </Select>
                            <Select label="Qualification" value={editingMember.qualification} onChange={(e) => setEditingMember({...editingMember, qualification: e.target.value as Qualification})}>
                                {Object.values(Qualification).map(q => <option key={q} value={q}>{q}</option>)}
                            </Select>
                            <Input label="Pincode" value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} />
                            <Select label="Registry Status" value={editingMember.status} onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MemberStatus})}>
                                <option value={MemberStatus.Pending}>Pending Audit</option>
                                <option value={MemberStatus.Accepted}>Verified & Safe</option>
                                <option value={MemberStatus.Deceased}>Deceased</option>
                            </Select>
                            <Select label="Occupation" value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <div className="sm:col-span-2">
                                <Input label="Residential Address" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} />
                            </div>
                            <Select label="Community Need" value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                            <div className="sm:col-span-3 mt-4 pt-4 border-t border-slate-100">
                                <AadhaarImageDisplay 
                                    imageUrl={editingMember.aadhaar_front_url || editingMember.aadhaar_back_url}
                                    onFileSelect={handleUploadAadhaarInEdit}
                                    isUploading={isUploadingAadhaar}
                                    disabled={false}
                                />
                            </div>
                        </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* DELETE MODAL */}
            <Modal isOpen={!!memberToDelete} onClose={() => setMemberToDelete(null)} title="Confirm Record Deletion">
                <div className="p-4 text-center space-y-5">
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center border border-rose-100">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-slate-900">Irreversible Action</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                            Are you sure you want to permanently remove <strong className="text-slate-800">{memberToDelete ? formatDisplayName(memberToDelete.name, memberToDelete.surname) : ''}</strong> from the Samaj global registry?
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setMemberToDelete(null)} className="flex-1 text-xs">
                          Cancel
                        </Button>
                        <Button onClick={handleDeleteMember} disabled={isDeleting} variant="danger" className="flex-1 text-xs font-bold">
                            {isDeleting ? 'Deleting...' : 'Delete Citizen Record'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default AdminReports;
