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
  XCircle
} from 'lucide-react';

const OrganisationReports: React.FC = () => {
    const { user } = useAuth();
    const [myMembers, setMyMembers] = useState<Member[]>([]);
    const [myVolunteers, setMyVolunteers] = useState<VolunteerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = async () => {
        if (!user?.organisationId) return;
        setLoading(true);
        try {
            const [membersRes, volsRes] = await Promise.all([
                supabase.from('members').select('*').eq('organisation_id', user.organisationId).order('submission_date', { ascending: false }),
                supabase.from('profiles').select('*').eq('role', Role.Volunteer).eq('organisation_id', user.organisationId)
            ]);
            if (membersRes.data) setMyMembers(membersRes.data);
            if (volsRes.data) setMyVolunteers(volsRes.data);
        } catch (error) {
            addNotification("Sync failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const [filters, setFilters] = useState({ startDate: '', endDate: '', volunteerId: '', search: '', status: '' });

    const filteredMembers = useMemo(() => {
        return myMembers.filter(member => {
            if (filters.volunteerId && member.volunteer_id !== filters.volunteerId) return false;
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
                <Card className="bg-gray-950">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Input label="Search" name="search" value={filters.search} onChange={handleFilterChange} />
                        <Select label="Status" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value={MemberStatus.Pending}>Pending</option>
                            <option value={MemberStatus.Accepted}>Accepted</option>
                        </Select>
                        <Select label="Field Agent" name="volunteerId" value={filters.volunteerId} onChange={handleFilterChange}>
                            <option value="">All Agents</option>
                            {myVolunteers.map(vol => <option key={vol.id} value={vol.id}>{vol.name}</option>)}
                        </Select>
                        <Button onClick={fetchData} className="mt-6">Refresh</Button>
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
                                    <tr><td colSpan={4} className="p-20 text-center animate-pulse">Scanning...</td></tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{member.name} {member.surname}</span>
                                                <span className="text-[11px] text-gray-600 font-mono">{member.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
                                                    <UserIcon size={12} className="text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                        {myVolunteers.find(v => v.id === member.volunteer_id)?.name || 'System Agent'}
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
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                                                <button onClick={() => handleVerify(member)} className="p-3 bg-white/5 rounded-xl hover:text-green-400"><CheckCircle2 size={18} /></button>
                                                <button onClick={() => handleEditClick(member)} className="p-3 bg-white/5 rounded-xl hover:text-orange-500"><Edit3 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Registry Override">
                {editingMember && (
                    <div className="space-y-6 max-h-[85vh] overflow-y-auto p-2">
                        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex items-center gap-6">
                            {editingMember.member_image_url ? <img src={editingMember.member_image_url} className="h-24 w-24 rounded-2xl object-cover" /> : <ImageIcon size={32} className="text-gray-700" />}
                            <div>
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Enrolled By</p>
                                <p className="text-xl font-bold text-white uppercase">{myVolunteers.find(v => v.id === editingMember.volunteer_id)?.name || 'System'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="NAME" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                            <Input label="SURNAME" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                        </div>
                        <div className="flex justify-end gap-4 pt-10 border-t border-white/5 mt-8 sticky bottom-0 bg-gray-900 pb-2">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateMember} disabled={isUpdating}>Commit Changes</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default OrganisationReports;