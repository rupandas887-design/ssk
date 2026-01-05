
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
  CheckCircle2, 
  User as UserIcon, 
  ExternalLink,
  RefreshCw,
  XCircle,
  FileText,
  Calendar,
  Fingerprint,
  MapPin,
  Briefcase,
  Activity,
  Phone,
  Eye,
  Zap,
  ShieldCheck,
  UserCircle,
  BadgeCheck,
  ImageIcon
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
    
    const [viewingMember, setViewingMember] = useState<MemberWithAgent | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
            addNotification("Sector registry sync failed.", "error");
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

    const handleVerifyStatus = async (member: MemberWithAgent) => {
        const newStatus = member.status === MemberStatus.Accepted ? MemberStatus.Pending : MemberStatus.Accepted;
        try {
            const { error } = await supabase.from('members').update({ status: newStatus }).eq('id', member.id);
            if (error) throw error;
            addNotification(`Member status updated to ${newStatus}.`, "success");
            fetchData();
        } catch (err) {
            addNotification("Verification update failed.", "error");
        }
    };

    const openDetails = (member: MemberWithAgent) => {
        setViewingMember({ ...member });
        setIsDetailModalOpen(true);
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
        link.download = `Sector_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <DashboardLayout title="Sector Verification Terminal">
            <div className="space-y-8">
                <Card className="bg-gray-950 border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-8 text-blue-500 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Sector Query Intelligence</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <Select label="VOLUNTEER" name="agentId" value={filters.agentId} onChange={handleFilterChange}>
                            <option value="">All Volunteers</option>
                            {allOrgProfiles.filter(p => p.role === Role.Volunteer).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <Select label="Status" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All States</option>
                            <option value={MemberStatus.Pending}>Pending</option>
                            <option value={MemberStatus.Accepted}>Accepted</option>
                        </Select>
                        <Input type="date" label="Start Date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        <Input type="date" label="End Date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    </div>
                    <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <Input placeholder="Search Identity..." name="search" value={filters.search} onChange={handleFilterChange} icon={<Search size={16} />} className="flex-1" />
                        <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 px-10"><FileSpreadsheet size={16} className="mr-2" /> Export</Button>
                    </div>
                </Card>

                <Card title="Registry Records">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr className="text-gray-500 text-[10px] uppercase font-black tracking-widest">
                                    <th className="p-6">Identity Node</th>
                                    <th className="p-6">Agent</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMembers.map(member => (
                                    <tr key={member.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02]">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-lg">{member.name} {member.surname}</span>
                                                <span className="text-[11px] text-gray-600 font-mono">{member.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-[11px] font-black text-white uppercase">{member.agent_profile?.name || 'N/A'}</span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full border ${member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => openDetails(member)} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-white"><Eye size={18} /></button>
                                                <button onClick={() => handleVerifyStatus(member)} className={`p-3 rounded-xl border ${member.status === MemberStatus.Accepted ? 'text-red-400' : 'text-green-400'}`}>
                                                    {member.status === MemberStatus.Accepted ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
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

            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Master Identity File">
                {viewingMember && (
                    <div className="space-y-8 p-2 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="p-10 bg-blue-500/5 border border-blue-500/10 rounded-[3rem] relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Aadhaar Front Side</p>
                                    <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 relative group/img shadow-2xl">
                                        <img src={viewingMember.aadhaar_front_url} className="w-full h-full object-cover" />
                                        <a href={viewingMember.aadhaar_front_url} target="_blank" className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black text-blue-500/60 uppercase tracking-widest">Aadhaar Back Side</p>
                                    <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 relative group/img shadow-2xl">
                                        <img src={viewingMember.aadhaar_back_url} className="w-full h-full object-cover" />
                                        <a href={viewingMember.aadhaar_back_url} target="_blank" className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                            <ExternalLink className="text-white" size={24} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 space-y-4 pt-6 border-t border-white/5">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">Authenticated Identity</p>
                                <h4 className="text-2xl md:text-3xl font-cinzel text-white tracking-tight">{viewingMember.name} {viewingMember.surname}</h4>
                                <div className="flex flex-wrap gap-4">
                                    <div className="px-5 py-2.5 bg-black/60 rounded-2xl border border-white/5 flex items-center gap-2">
                                        <Fingerprint size={12} className="text-blue-500/50" />
                                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em]">{viewingMember.aadhaar}</span>
                                    </div>
                                    <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-2 ${viewingMember.status === MemberStatus.Accepted ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                        <CheckCircle2 size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{viewingMember.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <DataPoint label="Father / Guardian" value={viewingMember.father_name} icon={<UserIcon size={14} />} />
                            <DataPoint label="Primary Mobile" value={viewingMember.mobile} icon={<Phone size={14} />} />
                            <DataPoint label="Emergency Link" value={viewingMember.emergency_contact} icon={<ShieldCheck size={14} />} />
                            <DataPoint label="Date of Birth" value={viewingMember.dob} icon={<Calendar size={14} />} />
                            <DataPoint label="Identity Gender" value={viewingMember.gender} icon={<Activity size={14} />} />
                            <DataPoint label="Postal Pincode" value={viewingMember.pincode} icon={<MapPin size={14} />} />
                            <div className="md:col-span-2 lg:col-span-3">
                                <DataPoint label="Residential Registry Address" value={viewingMember.address} icon={<MapPin size={14} />} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-10 border-t border-white/5 mt-8 sticky bottom-0 bg-gray-900 pb-4 z-10">
                            <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>Close File</Button>
                            <Button onClick={() => { handleVerifyStatus(viewingMember); setIsDetailModalOpen(false); }} className={`px-12 ${viewingMember.status === MemberStatus.Accepted ? 'bg-orange-600' : 'bg-green-600'}`}>
                                {viewingMember.status === MemberStatus.Accepted ? 'Reset Verification' : 'Verify Identity Node'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

const DataPoint: React.FC<{ label: string, value: string, icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl group hover:border-blue-500/20 transition-all overflow-hidden">
        <div className="flex items-center gap-2 mb-3 text-gray-500 group-hover:text-blue-500 transition-colors">
            {icon}
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
        </div>
        <p className="text-white font-bold tracking-tight break-words whitespace-pre-wrap">{value || 'N/A'}</p>
    </div>
);

export default OrganisationReports;
