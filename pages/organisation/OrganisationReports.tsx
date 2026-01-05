
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
  RefreshCw,
  Edit3,
  Save,
  FileText,
  Calendar,
  Fingerprint,
  MapPin,
  Activity,
  Phone,
  Eye,
  ShieldCheck,
  UserCircle,
  BadgeCheck,
  Loader2
} from 'lucide-react';

type MemberWithAgent = Member & {
    agent_profile?: { name: string, mobile: string }
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

    const fetchData = async () => {
        if (!user?.organisationId) return;
        setLoading(true);
        try {
            const [membersRes, profilesRes] = await Promise.all([
                supabase
                    .from('members')
                    .select('*, agent_profile:profiles!volunteer_id(name, mobile)')
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
            addNotification("Organization registry sync failed.", "error");
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
                // Status is NOT updated here as per security requirement
            }).eq('id', editingMember.id);
            
            if (error) throw error;
            addNotification("Member record updated successfully.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Identity sync failed.`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleExport = () => {
        const headers = ['Aadhaar', 'Full Name', 'Father Name', 'Mobile', 'DOB', 'Pincode', 'Address', 'VOLUNTEER', 'Date', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar, `${m.name} ${m.surname}`, m.father_name, m.mobile, m.dob, m.pincode, m.address,
            m.agent_profile?.name || 'N/A',
            m.submission_date.split('T')[0], m.status
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Organization_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout title="Organization Registry Terminal">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-8 text-blue-500 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Registry Query Intelligence</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <Select label="FIELD AGENT" name="agentId" value={filters.agentId} onChange={handleFilterChange}>
                            <option value="">All Agents</option>
                            {allOrgProfiles.filter(p => p.role === Role.Volunteer).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <Select label="VERIFICATION STATUS" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All States</option>
                            <option value={MemberStatus.Pending}>Pending</option>
                            <option value={MemberStatus.Accepted}>Accepted</option>
                        </Select>
                        <Input type="date" label="START DATE" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        <Input type="date" label="END DATE" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    </div>
                    <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <Input placeholder="Universal Identity Search..." name="search" value={filters.search} onChange={handleFilterChange} icon={<Search size={16} />} className="flex-1" />
                        <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 px-10"><FileSpreadsheet size={16} className="mr-2" /> Export CSV</Button>
                    </div>
                </Card>

                <Card title="Organization Identity Records">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 text-[10px] uppercase font-black tracking-widest">
                                    <th className="p-6">Identity Node</th>
                                    <th className="p-6">Attributed Agent</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="p-24 text-center text-[11px] animate-pulse font-black uppercase tracking-[0.4em] text-gray-500">Syncing Network Data...</td></tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-lg group-hover:text-blue-500 transition-colors">{member.name} {member.surname}</span>
                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400 font-mono tracking-tighter">
                                                    <span>{member.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                                                    <span>{member.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                    <UserCircle size={16} />
                                                </div>
                                                <span className="text-[11px] font-black text-white uppercase tracking-widest">{member.agent_profile?.name || 'Authorized Agent'}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full border ${member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button onClick={() => handleEditMember(member)} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-white transition-all" title="Modify Citizen File">
                                                    <Edit3 size={18} />
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

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Citizen Identity Override">
                {editingMember && (
                    <div className="space-y-8 p-2 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="p-10 bg-blue-500/5 border border-blue-500/10 rounded-[3rem] relative overflow-hidden group">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Aadhaar Front Side</p>
                                    <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 relative group/img shadow-2xl">
                                        <img src={editingMember.aadhaar_front_url} className="w-full h-full object-cover" />
                                        <a href={editingMember.aadhaar_front_url} target="_blank" className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Aadhaar Back Side</p>
                                    <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 relative group/img shadow-2xl">
                                        <img src={editingMember.aadhaar_back_url} className="w-full h-full object-cover" />
                                        <a href={editingMember.aadhaar_back_url} target="_blank" className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 space-y-4 pt-6 border-t border-white/5 relative z-10">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">Target Identity Node</p>
                                <h4 className="text-2xl md:text-3xl font-cinzel text-white tracking-tight leading-tight">{editingMember.name} {editingMember.surname}</h4>
                                <div className="flex flex-wrap gap-4">
                                    <div className="px-5 py-2.5 bg-black/60 rounded-2xl border border-white/5 flex items-center gap-2">
                                        <Fingerprint size={12} className="text-blue-500/50" />
                                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em]">{editingMember.aadhaar}</span>
                                    </div>
                                    <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-2 ${editingMember.status === MemberStatus.Accepted ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
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
                            <Input label="Emergency Connection" value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} icon={<ShieldCheck size={14} />} />
                            <Input label="Date of Birth" type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} icon={<Calendar size={14} />} />
                            <Select label="Gender Identity" value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})}>
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Input label="Postal Pincode" value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} icon={<MapPin size={14} />} />
                            <div className="md:col-span-2">
                                <Input label="Full Residential Address" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} icon={<MapPin size={14} />} />
                            </div>
                            <Select label="Primary Vocation" value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="Support Requirement" value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>

                        <div className="flex justify-end gap-4 pt-10 border-t border-white/5 mt-8 sticky bottom-0 bg-gray-900 pb-4 z-10">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="px-10 py-4 text-[10px] font-black uppercase tracking-widest">Cancel</Button>
                            <Button onClick={handleUpdateMember} disabled={isUpdating} className="px-12 py-4 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 flex items-center gap-2">
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isUpdating ? 'Synchronizing...' : 'Save Member File'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default OrganisationReports;
