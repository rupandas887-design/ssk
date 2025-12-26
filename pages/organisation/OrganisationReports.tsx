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
  Filter, 
  Search, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  User as UserIcon, 
  Image as ImageIcon, 
  ExternalLink,
  Save,
  RefreshCw,
  XCircle,
  Building2
} from 'lucide-react';

const OrganisationReports: React.FC = () => {
    const { user } = useAuth();
    const [myMembers, setMyMembers] = useState<Member[]>([]);
    const [allOrgProfiles, setAllOrgProfiles] = useState<VolunteerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = async () => {
        if (!user?.organisationId) return;
        setLoading(true);
        try {
            const [membersRes, profilesRes] = await Promise.all([
                supabase.from('members').select('*').eq('organisation_id', user.organisationId).order('submission_date', { ascending: false }),
                supabase.from('profiles').select('*').eq('organisation_id', user.organisationId)
            ]);
            
            if (membersRes.data) setMyMembers(membersRes.data);
            
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

    const [filters, setFilters] = useState({ startDate: '', endDate: '', agentId: '', search: '', status: '' });

    const filteredMembers = useMemo(() => {
        return myMembers.filter(member => {
            if (filters.agentId && member.volunteer_id !== filters.agentId) return false;
            if (filters.status && member.status !== filters.status) return false;
            if (filters.search) {
                const term = filters.search.toLowerCase();
                return member.name.toLowerCase().includes(term) || member.surname.toLowerCase().includes(term) || member.mobile.includes(term);
            }
            return true;
        });
    }, [myMembers, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleVerify = async (member: Member) => {
        const newStatus = member.status === MemberStatus.Accepted ? MemberStatus.Pending : MemberStatus.Accepted;
        try {
            await supabase.from('members').update({ status: newStatus }).eq('id', member.id);
            addNotification(`Member ${newStatus}.`, "success");
            fetchData();
        } catch (err) {
            addNotification("Verification failed.", "error");
        }
    };

    const handleEditClick = (member: Member) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        setIsUpdating(true);
        try {
            await supabase.from('members').update({
                name: editingMember.name, surname: editingMember.surname, mobile: editingMember.mobile,
                father_name: editingMember.father_name, dob: editingMember.dob, gender: editingMember.gender,
                pincode: editingMember.pincode, address: editingMember.address,
                occupation: editingMember.occupation, support_need: editingMember.support_need,
                status: editingMember.status
            }).eq('id', editingMember.id);
            addNotification("Updated successfully.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <DashboardLayout title="Sector Verification Terminal">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-6 rounded-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Input 
                            label="Global Search" 
                            name="search" 
                            value={filters.search} 
                            onChange={handleFilterChange} 
                            placeholder="Name or Phone..."
                        />
                        <Select label="Status Filter" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value={MemberStatus.Pending}>Pending Verification</option>
                            <option value={MemberStatus.Accepted}>Verified / Accepted</option>
                        </Select>
                        <Select label="Enrollment Agent" name="agentId" value={filters.agentId} onChange={handleFilterChange}>
                            <option value="">All Agents</option>
                            {allOrgProfiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                        </Select>
                        <div className="flex items-end">
                            <Button onClick={fetchData} variant="secondary" className="w-full flex items-center justify-center gap-2 py-3 uppercase text-[10px] font-black tracking-widest">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Dataset
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Sector Node Registry">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Member Identity</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Enrollment Agent</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Status</th>
                                    <th className="p-6 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-24 text-center text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 animate-pulse">Scanning Sector Nodes...</td></tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{member.name} {member.surname}</span>
                                                <div className="flex items-center gap-2 text-[11px] text-gray-600 font-mono">
                                                    <span>{member.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-800"></span>
                                                    <span>{member.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
                                                    <UserIcon size={12} className="text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                        {allOrgProfiles.find(p => p.id === member.volunteer_id)?.name || 'Agent '+member.volunteer_id.slice(0,5)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => handleVerify(member)} 
                                                    className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-green-500/40 text-gray-500 hover:text-green-400 transition-all"
                                                    title="Verify Member"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEditClick(member)} 
                                                    className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 transition-all"
                                                    title="Override Record"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && !loading && (
                                    <tr><td colSpan={4} className="p-40 text-center text-[11px] text-gray-700 uppercase tracking-[0.5em] font-black">Null intersection in sector dataset.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Sector Override Terminal">
                {editingMember && (
                    <div className="space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar p-2">
                        <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] flex items-center gap-8 relative overflow-hidden group/modal-head">
                            {editingMember.member_image_url ? (
                                <div className="relative h-32 w-32 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                    <img src={editingMember.member_image_url} className="h-full w-full object-cover" />
                                    <a href={editingMember.member_image_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                        <ExternalLink size={20} />
                                    </a>
                                </div>
                            ) : (
                                <div className="h-32 w-32 rounded-2xl bg-gray-900 border border-white/5 flex items-center justify-center text-gray-700 shrink-0">
                                    <ImageIcon size={32} />
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">Enrolled Identity</p>
                                <p className="text-3xl font-cinzel text-white leading-tight uppercase mb-2">{editingMember.name} {editingMember.surname}</p>
                                <div className="flex items-center gap-2">
                                    <UserIcon size={12} className="text-gray-600" />
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        Source Agent: {allOrgProfiles.find(v => v.id === editingMember.volunteer_id)?.name || 'System'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Input label="GIVEN NAME" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                            <Input label="SURNAME" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                            <Input label="MOBILE" value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} />
                            <Input label="AADHAAR" value={editingMember.aadhaar} onChange={(e) => setEditingMember({...editingMember, aadhaar: e.target.value})} maxLength={12} />
                            <Select label="SECTOR STATUS" value={editingMember.status} onChange={(e) => setEditingMember({...editingMember, status: e.target.value as MemberStatus})}>
                                <option value={MemberStatus.Pending}>Pending Verification</option>
                                <option value={MemberStatus.Accepted}>Accepted / Verified</option>
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
                                {isUpdating ? 'SYNCHRONIZING...' : 'Commit Changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default OrganisationReports;