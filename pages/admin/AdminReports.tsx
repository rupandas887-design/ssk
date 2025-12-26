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
  FileText
} from 'lucide-react';

const AdminReports: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [allProfiles, setAllProfiles] = useState<VolunteerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    // Filters State
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal & Action State
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [membersRes, orgsRes, profilesRes] = await Promise.all([
                supabase.from('members').select('*').order('submission_date', { ascending: false }),
                supabase.from('organisations').select('*').order('name'),
                supabase.from('profiles').select('*')
            ]);
            
            if (membersRes.data) setMembers(membersRes.data);
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

    // Filter Logic
    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchOrg = !selectedOrgId || m.organisation_id === selectedOrgId;
            const matchVol = !selectedVolunteerId || m.volunteer_id === selectedVolunteerId;
            
            const subDate = new Date(m.submission_date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            const matchStart = !start || subDate >= start;
            const matchEnd = !end || subDate <= end;
            
            const matchSearch = !searchQuery || 
                m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                m.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.mobile.includes(searchQuery) ||
                m.aadhaar.includes(searchQuery);
                
            return matchOrg && matchVol && matchStart && matchEnd && matchSearch;
        });
    }, [members, selectedOrgId, selectedVolunteerId, startDate, endDate, searchQuery]);

    const availableAgents = useMemo(() => {
        let base = allProfiles;
        if (selectedOrgId) {
            base = base.filter(p => p.organisationId === selectedOrgId);
        }
        return base;
    }, [selectedOrgId, allProfiles]);

    // Handlers
    const handleEditMember = (member: Member) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleDeleteMember = async () => {
        if (!memberToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('members').delete().eq('id', memberToDelete);
            if (error) throw error;
            addNotification("Record purged from master registry.", "success");
            setMemberToDelete(null);
            fetchData();
        } catch (err: any) {
            addNotification(`Purge failed: ${err.message}`, "error");
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
                mobile: editingMember.mobile,
                aadhaar: editingMember.aadhaar,
                father_name: editingMember.father_name,
                dob: editingMember.dob,
                gender: editingMember.gender,
                pincode: editingMember.pincode,
                address: editingMember.address,
                occupation: editingMember.occupation,
                support_need: editingMember.support_need,
                status: editingMember.status,
                emergency_contact: editingMember.emergency_contact
            }).eq('id', editingMember.id);
            
            if (error) throw error;
            addNotification("Master record synchronized.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Update failed: ${err.message}`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDownload = () => {
        const headers = ['Aadhaar', 'Name', 'Surname', 'Mobile', 'Org', 'Agent', 'Date', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar, m.name, m.surname, m.mobile,
            organisations.find(o => o.id === m.organisation_id)?.name || 'N/A',
            allProfiles.find(p => p.id === m.volunteer_id)?.name || 'N/A',
            m.submission_date, m.status
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Global_Registry_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout title="Master Registry Terminal">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-8 rounded-[2rem] shadow-2xl">
                    <div className="flex items-center gap-2 mb-8 text-orange-500">
                        <Filter size={18} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Multi-Vector Query Intelligence</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">1. Organization Sector</label>
                            <Select 
                                value={selectedOrgId} 
                                onChange={(e) => { setSelectedOrgId(e.target.value); setSelectedVolunteerId(''); }}
                                className="bg-black/40 border-gray-800"
                            >
                                <option value="">All Organizations</option>
                                {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">2. Enrollment Agent</label>
                            <Select 
                                value={selectedVolunteerId} 
                                onChange={(e) => setSelectedVolunteerId(e.target.value)}
                                className="bg-black/40 border-gray-800"
                            >
                                <option value="">All Agents</option>
                                {availableAgents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">3. Start Date</label>
                            <Input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                className="bg-black/40 border-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">4. End Date</label>
                            <Input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                className="bg-black/40 border-gray-800"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="w-full md:w-1/2">
                            <Input 
                                placeholder="Global ID Search (Name, Phone, Aadhaar)..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                icon={<Search size={16} />}
                                className="bg-black/20 border-gray-900"
                            />
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={fetchData} variant="secondary" className="px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                            </Button>
                            <Button onClick={handleDownload} className="px-10 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl">
                                <FileSpreadsheet size={16} /> Export Dataset
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Global Identity Node Registry">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Member Identity</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Enrollment Agent</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Status</th>
                                    <th className="p-6 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-24 text-center text-[11px] animate-pulse font-black uppercase tracking-[0.4em] text-gray-600">Synchronizing Global Nodes...</td></tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{m.name} {m.surname}</span>
                                                    {m.member_image_url && <FileText size={14} className="text-blue-500/50" />}
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-gray-600 font-mono tracking-tighter">
                                                    <span>{m.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-800"></span>
                                                    <span>{m.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/5 border border-blue-500/10 rounded-lg w-fit">
                                                    <UserIcon size={10} className="text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                        {allProfiles.find(p => p.id === m.volunteer_id)?.name || 'Agent '+m.volunteer_id.slice(0,5)}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                                    <Building2 size={8} /> {organisations.find(o => o.id === m.organisation_id)?.name || 'Master Entity'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${m.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => handleEditMember(m)} 
                                                    className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-orange-500/50 text-gray-400 hover:text-white transition-all"
                                                    title="Edit Record"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => setMemberToDelete(m.id)} 
                                                    className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 hover:border-red-500/50 text-red-500/60 hover:text-red-500 transition-all"
                                                    title="Purge Record"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && !loading && (
                                    <tr><td colSpan={4} className="p-40 text-center text-[11px] text-gray-700 uppercase tracking-[0.5em] font-black">Null intersection in master dataset.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Registry Override Terminal">
                {editingMember && (
                    <div className="space-y-6 p-2 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-start gap-8 p-8 bg-orange-500/5 border border-orange-500/10 rounded-[2.5rem] relative overflow-hidden group/modal-head">
                            {editingMember.member_image_url ? (
                                <div className="relative h-40 w-40 rounded-[2rem] overflow-hidden border-2 border-white/10 shrink-0 shadow-2xl">
                                    <img src={editingMember.member_image_url} alt="Aadhaar Scan" className="w-full h-full object-cover" />
                                    <a href={editingMember.member_image_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                        <ExternalLink size={24} />
                                    </a>
                                </div>
                            ) : (
                                <div className="h-40 w-40 rounded-[2rem] bg-gray-900 border-2 border-white/5 flex items-center justify-center text-gray-700 shrink-0">
                                    <FileText size={48} />
                                </div>
                            )}
                            <div className="flex-1 space-y-4 pt-2">
                                <div>
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-1">Aadhaar Document Scan</p>
                                    <h4 className="text-3xl font-cinzel text-white leading-none">{editingMember.name} {editingMember.surname}</h4>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="px-5 py-2 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-2">
                                        <Fingerprint size={12} className="text-orange-500/50" />
                                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{editingMember.aadhaar}</span>
                                    </div>
                                    <div className="px-5 py-2 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-2">
                                        <Calendar size={12} className="text-blue-500/50" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enrolled: {editingMember.submission_date.split('T')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Input label="FIRST NAME" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                            <Input label="SURNAME" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                            <Input label="FATHER / GUARDIAN NAME" value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} />
                            <Input label="MOBILE IDENTITY" value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} />
                            <Input label="EMERGENCY CONTACT" value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} />
                            <Input label="DATE OF BIRTH" type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} />
                            <Select label="GENDER" value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})}>
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Input label="AADHAAR ID" value={editingMember.aadhaar} onChange={(e) => setEditingMember({...editingMember, aadhaar: e.target.value})} maxLength={12} />
                            <Input label="PINCODE" value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} />
                            <Select label="REGISTRY STATUS" value={editingMember.status} onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MemberStatus})}>
                                <option value={MemberStatus.Pending}>Pending Verification</option>
                                <option value={MemberStatus.Accepted}>Accepted / Verified</option>
                            </Select>
                            <div className="md:col-span-2">
                                <Input label="RESIDENTIAL ADDRESS" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} />
                            </div>
                            <Select label="CURRENT OCCUPATION" value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="SUPPORT NEED" value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>

                        <div className="flex justify-end gap-4 pt-10 border-t border-white/5 mt-8 sticky bottom-0 bg-gray-900 pb-2 z-10">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">Abort</Button>
                            <Button 
                                onClick={handleUpdateMember} 
                                disabled={isUpdating}
                                className="px-12 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl"
                            >
                                {isUpdating ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                {isUpdating ? 'SYNCHRONIZING...' : 'Commit Master Override'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!memberToDelete} onClose={() => setMemberToDelete(null)} title="Security Confirmation">
                <div className="p-6 text-center space-y-8">
                    <div className="p-6 bg-red-500/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <AlertTriangle size={48} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-cinzel text-white mb-3">Irreversible Purge</h4>
                        <p className="text-sm text-gray-500 leading-relaxed uppercase tracking-widest font-bold">
                            Are you certain you wish to purge this Aadhaar record? This action is absolute.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => setMemberToDelete(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest">Cancel</Button>
                        <Button 
                            onClick={handleDeleteMember} 
                            disabled={isDeleting}
                            className="flex-1 bg-red-600 hover:bg-red-700 py-4 text-[10px] font-black uppercase tracking-widest"
                        >
                            {isDeleting ? 'PURGING...' : 'Confirm Purge'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default AdminReports;