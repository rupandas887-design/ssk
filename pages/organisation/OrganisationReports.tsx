import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { Member, MemberStatus, Role, User as VolunteerUser, Gender, Occupation, SupportNeed } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { 
  FileSpreadsheet, 
  Search, 
  User as UserIcon, 
  ExternalLink,
  Edit3,
  Save,
  Calendar,
  Fingerprint,
  MapPin,
  Activity,
  Phone,
  UserCircle,
  BadgeCheck,
  Loader2,
  Eye,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Copy
} from 'lucide-react';

type MemberWithAgent = Member & {
    agent_profile?: { name: string, mobile: string, profile_photo_url?: string }
};

const OrganisationReports: React.FC = () => {
    const { user } = useAuth();
    const [myMembers, setMyMembers] = useState<MemberWithAgent[]>([]);
    const [allOrgProfiles, setAllOrgProfiles] = useState<VolunteerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    const [editingMember, setEditingMember] = useState<MemberWithAgent | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const [filters, setFilters] = useState({ 
        startDate: '', 
        endDate: '', 
        agentId: '', 
        search: '', 
        status: '' 
    });

    const formatDisplayName = (first: string, last: string) => {
        const f = (first || '').trim().toLowerCase();
        const l = (last || '').trim().toLowerCase();
        return `${f} ${l}`.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const fetchData = async () => {
        if (!user?.organisationId) return;
        setLoading(true);
        try {
            const [membersRes, profilesRes] = await Promise.all([
                supabase
                    .from('members')
                    .select('*, agent_profile:profiles!volunteer_id(name, mobile, profile_photo_url)')
                    .eq('organisation_id', user.organisationId)
                    .order('submission_date', { ascending: false }),
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('organisation_id', user.organisationId)
            ]);
            
            if (membersRes.data) setMyMembers(membersRes.data as MemberWithAgent[]);
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
                setAllOrgProfiles(mappedProfiles);
            }
        } catch (error) {
            addNotification("Sync failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const filteredMembers = useMemo(() => {
        return myMembers.filter(member => {
            if (filters.agentId && member.volunteer_id !== filters.agentId) return false;
            if (filters.status && member.status !== filters.status) return false;
            const subDate = new Date(member.submission_date);
            const start = filters.startDate ? new Date(filters.startDate) : null;
            const end = filters.endDate ? new Date(filters.endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);
            if (start && subDate < start) return false;
            if (end && subDate > end) return false;
            if (filters.search) {
                const term = filters.search.toLowerCase();
                return member.name.toLowerCase().includes(term) || member.surname.toLowerCase().includes(term) || member.mobile.includes(term) || member.aadhaar.includes(term);
            }
            return true;
        });
    }, [myMembers, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleEditMember = (member: MemberWithAgent) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleCopyDetails = (member: MemberWithAgent) => {
        const text = `Name: ${formatDisplayName(member.name, member.surname)}\nMobile: ${member.mobile}\nAadhaar: ${member.aadhaar}`;
        navigator.clipboard.writeText(text);
        addNotification("Identity details copied to clipboard.", "info");
    };

    const handleUpdateMember = async () => {
        if (!editingMember || editingMember.status === MemberStatus.Accepted) return;
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
            }).eq('id', editingMember.id);
            
            if (error) throw error;
            addNotification("Member synchronized.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Sync failed.`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExport = () => {
        const headers = ['Aadhaar', 'Identity Name', 'Father Name', 'Mobile', 'DOB', 'Pincode', 'Address', 'Volunteer', 'Date', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar, 
            formatDisplayName(m.name, m.surname), 
            m.father_name, 
            m.mobile, 
            m.dob, 
            m.pincode, 
            m.address,
            m.agent_profile?.name || 'N/A',
            m.submission_date.split('T')[0], 
            m.status
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Registry_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const isVerified = editingMember?.status === MemberStatus.Accepted;

    return (
        <DashboardLayout title="Our Members’ Data Registry">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-8 text-blue-500 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Registry Query Node</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <Select label="VOLUNTEER" name="agentId" value={filters.agentId} onChange={handleFilterChange}>
                            <option value="">All Volunteers</option>
                            {allOrgProfiles.filter(p => p.role === Role.Volunteer).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <Select label="VERIFICATION" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All States</option>
                            <option value={MemberStatus.Pending}>Pending</option>
                            <option value={MemberStatus.Accepted}>Accepted</option>
                        </Select>
                        <Input type="date" label="START" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        <Input type="date" label="END" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    </div>
                    <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <Input placeholder="Search Identity..." name="search" value={filters.search} onChange={handleFilterChange} icon={<Search size={16} />} className="flex-1" />
                        <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 px-10"><FileSpreadsheet size={16} className="mr-2" /> Export CSV</Button>
                    </div>
                </Card>

                <Card title="Our Members’ Data Registry">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 text-[10px] uppercase font-black tracking-widest">
                                    <th className="p-6">Identity Node</th>
                                    <th className="p-6">Volunteer</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="p-24 text-center text-[11px] animate-pulse font-black uppercase tracking-[0.4em] text-gray-500">Syncing...</td></tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors truncate">
                                                    {formatDisplayName(member.name, member.surname)}
                                                </span>
                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 font-mono tracking-tighter">
                                                    <span>{member.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                                                    <span>{member.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-all shadow-lg bg-black/40">
                                                  {member.agent_profile?.profile_photo_url ? (
                                                    <img 
                                                      src={member.agent_profile.profile_photo_url} 
                                                      className="h-full w-full object-cover" 
                                                      alt="Volunteer profile" 
                                                    />
                                                  ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-blue-500/30">
                                                        <UserCircle size={18} />
                                                    </div>
                                                  )}
                                                </div>
                                                <span className="text-[11px] font-black text-white uppercase tracking-widest">{member.agent_profile?.name || 'Volunteer'}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full border ${member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEditMember(member)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/50 text-gray-500 hover:text-white transition-all" title={member.status === MemberStatus.Accepted ? "View Member" : "Edit Member"}>
                                                    {member.status === MemberStatus.Accepted ? <Eye size={18} /> : <Edit3 size={18} />}
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

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={isVerified ? "Review Identity File" : "Operational Override"} maxWidth="4xl">
                {editingMember && (
                    <div className="space-y-6 pb-4">
                        <div className={`p-5 sm:p-6 border rounded-[2rem] relative overflow-hidden group transition-all duration-500 ${isVerified ? 'bg-green-500/5 border-green-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
                                <div className="lg:col-span-5 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className={isVerified ? "text-green-500/60" : "text-blue-500/60"} size={12} />
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${isVerified ? "text-green-500/60" : "text-blue-500/60"}`}>Identification Scan</p>
                                    </div>
                                    <div className="rounded-[1.25rem] overflow-hidden border border-white/10 bg-black/40 relative group/img shadow-xl aspect-[1.58/1]">
                                        <img src={editingMember.aadhaar_front_url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Aadhaar Front" />
                                        <a href={editingMember.aadhaar_front_url} target="_blank" className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>
                                
                                <div className="lg:col-span-7 flex flex-col justify-center space-y-4 lg:space-y-5">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                                            <div className="space-y-1">
                                                <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isVerified ? "text-green-500" : "text-blue-500"}`}>Target Identity</p>
                                                <h4 className="text-xl sm:text-2xl font-cinzel text-white leading-none font-bold uppercase break-words pr-2">
                                                    {formatDisplayName(editingMember.name, editingMember.surname)}
                                                </h4>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <div className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${editingMember.status === MemberStatus.Accepted ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                                    {editingMember.status} Record
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="px-4 py-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-4 transition-all hover:bg-black/60">
                                                <Fingerprint size={16} className={isVerified ? "text-green-500/50" : "text-blue-500/50"} />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[7px] font-black uppercase tracking-widest text-gray-600 leading-none mb-1">Citizen ID</span>
                                                    <span className="text-sm font-mono text-white tracking-widest truncate">{editingMember.aadhaar}</span>
                                                </div>
                                            </div>
                                            <div className="px-4 py-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-4 transition-all hover:bg-black/60">
                                                <BadgeCheck size={16} className={isVerified ? "text-green-500/50" : "text-blue-500/50"} />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[7px] font-black uppercase tracking-widest text-gray-600 leading-none mb-1">Verification</span>
                                                    <span className="text-xs font-bold text-white uppercase tracking-tighter truncate">Tier-1 Citizen</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {isVerified && (
                                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                                            <CheckCircle size={14} className="text-green-500 shrink-0" />
                                            <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Verified: Locked</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                            <Input label="Given Name" disabled={isVerified} value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} icon={<UserIcon size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="Surname" disabled={isVerified} value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} icon={<UserIcon size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="Father Name" disabled={isVerified} value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} icon={<UserCircle size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="Mobile" disabled={isVerified} value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} icon={<Phone size={12} />} className="py-2.5 text-xs font-bold" />
                            <Input label="DOB" disabled={isVerified} type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} icon={<Calendar size={12} />} className="py-2.5 text-xs font-bold" />
                            <Select label="Gender" disabled={isVerified} value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})} className="py-2.5 text-xs font-bold">
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Input label="Pincode" disabled={isVerified} value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} icon={<MapPin size={12} />} className="py-2.5 text-xs font-bold" />
                            <div className="sm:col-span-2">
                                <Input label="Full Residence" disabled={isVerified} value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} icon={<MapPin size={12} />} className="py-2.5 text-xs font-bold" />
                            </div>
                            <Select label="Vocation" disabled={isVerified} value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})} className="py-2.5 text-xs font-bold">
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="Support Matrix" disabled={isVerified} value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})} className="py-2.5 text-xs font-bold">
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>

                        <div className="flex flex-wrap justify-end items-center gap-4 pt-6 border-t border-white/10 mt-6 sticky bottom-0 bg-[#050505] pb-2 z-10">
                            <div className="flex gap-3 w-full sm:w-auto">
                                <Button variant="secondary" onClick={() => handleCopyDetails(editingMember)} className="flex-1 sm:flex-none px-4 py-3 text-[9px] font-black uppercase tracking-widest gap-2 bg-white/5 border border-white/5">
                                    <Copy size={14} /> <span className="hidden xs:inline">Copy</span>
                                </Button>
                                <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="flex-1 sm:flex-none px-8 py-3 text-[9px] font-black uppercase tracking-widest">
                                    {isVerified ? "Close" : "Cancel"}
                                </Button>
                            </div>
                            {!isVerified && (
                                <Button onClick={handleUpdateMember} disabled={isUpdating} className="w-full sm:w-auto px-12 py-4 text-[10px] font-black uppercase tracking-[0.3em] bg-blue-600 hover:bg-blue-500 shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isUpdating ? 'SYNCING...' : 'SAVE RECORD'}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default OrganisationReports;