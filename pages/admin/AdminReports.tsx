import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { supabase } from '../../supabase/client';
import { Member, Organisation, Role, User as VolunteerUser, Gender, Occupation, SupportNeed } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { 
  FileSpreadsheet, 
  Users, 
  Building2, 
  Search,
  RefreshCw,
  Edit3,
  Save,
  User as UserIcon,
  Image as ImageIcon,
  ExternalLink,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';

const AdminReports: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [volunteers, setVolunteers] = useState<VolunteerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [membersRes, orgsRes, volsRes] = await Promise.all([
                supabase.from('members').select('*').order('submission_date', { ascending: false }),
                supabase.from('organisations').select('*').order('name'),
                supabase.from('profiles').select('*').eq('role', Role.Volunteer)
            ]);
            if (membersRes.data) setMembers(membersRes.data);
            if (orgsRes.data) setOrganisations(orgsRes.data);
            if (volsRes.data) setVolunteers(volsRes.data);
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

    const availableVolunteers = useMemo(() => {
        if (!selectedOrgId) return volunteers;
        return volunteers.filter(v => v.organisationId === selectedOrgId);
    }, [selectedOrgId, volunteers]);

    const handleEditMember = (member: Member) => {
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
                mobile: editingMember.mobile,
                father_name: editingMember.father_name,
                dob: editingMember.dob,
                gender: editingMember.gender,
                pincode: editingMember.pincode,
                address: editingMember.address,
                occupation: editingMember.occupation,
                support_need: editingMember.support_need
            }).eq('id', editingMember.id);
            if (error) throw error;
            addNotification("Member synchronized.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Error: ${err.message}`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <DashboardLayout title="Intelligence Reports">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-8 rounded-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Sector</label>
                            <Select value={selectedOrgId} onChange={(e) => { setSelectedOrgId(e.target.value); setSelectedVolunteerId(''); }}>
                                <option value="">All Organisations</option>
                                {organisations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Agent</label>
                            <Select value={selectedVolunteerId} onChange={(e) => setSelectedVolunteerId(e.target.value)}>
                                <option value="">All Volunteers</option>
                                {availableVolunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </Select>
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Search</label>
                            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={<Search size={16} />} />
                        </div>
                    </div>
                </Card>

                <Card title="Global Member Registry">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Member Identity</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Field Agent</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Sector</th>
                                    <th className="p-6 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-20 text-center text-xs animate-pulse">Syncing...</td></tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{m.name} {m.surname}</span>
                                                <span className="text-[11px] text-gray-600 font-mono tracking-tighter">{m.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/5 border border-blue-500/10 rounded-lg w-fit">
                                                    <UserIcon size={10} className="text-blue-500" />
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                                        {volunteers.find(v => v.id === m.volunteer_id)?.name || 'System Agent'}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest mt-1 ml-1">Responsible Agent</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                {organisations.find(o => o.id === m.organisation_id)?.name || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button onClick={() => handleEditMember(m)} className="p-3 bg-white/5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
                                                <Edit3 size={18} />
                                            </button>
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
                    <div className="space-y-6 p-2 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-start gap-6 p-6 bg-orange-500/5 border border-orange-500/10 rounded-[2rem]">
                            {editingMember.member_image_url ? (
                                <img src={editingMember.member_image_url} className="h-32 w-32 rounded-2xl object-cover" />
                            ) : (
                                <div className="h-32 w-32 rounded-2xl bg-gray-900 flex items-center justify-center"><ImageIcon size={40} className="text-gray-700" /></div>
                            ) }
                            <div>
                                <h4 className="text-2xl font-cinzel text-white leading-none mb-2">{editingMember.name} {editingMember.surname}</h4>
                                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-4">
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Agent Ownership</p>
                                    <p className="text-xs font-bold text-white uppercase">{volunteers.find(v => v.id === editingMember.volunteer_id)?.name || 'System'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="FIRST NAME" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                            <Input label="LAST NAME" value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                            <Input label="MOBILE" value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} />
                        </div>
                        <div className="flex justify-end gap-4 pt-10 border-t border-white/5 mt-6 sticky bottom-0 bg-gray-900 pb-2">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateMember} disabled={isUpdating}>Save Changes</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default AdminReports;