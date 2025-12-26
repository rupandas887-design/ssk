
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
  BadgeCheck
} from 'lucide-react';

// Extended member type to handle joined volunteer profile data
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

    // Filter State
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
                return (
                    member.name.toLowerCase().includes(term) || 
                    member.surname.toLowerCase().includes(term) || 
                    member.mobile.includes(term) ||
                    member.aadhaar.includes(term) ||
                    member.pincode.includes(term)
                );
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
        const headers = ['Aadhaar', 'Full Name', 'Father Name', 'Mobile', 'DOB', 'Pincode', 'Address', 'VOLUNTEER', 'VOL_MOBILE', 'Date', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar, `${m.name} ${m.surname}`, m.father_name, m.mobile, m.dob, m.pincode, m.address,
            m.agent_profile?.name || allOrgProfiles.find(p => p.id === m.volunteer_id)?.name || 'N/A',
            m.agent_profile?.mobile || 'N/A',
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
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                        <Filter size={150} />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-8 text-blue-500 relative z-10">
                        <Activity size={18} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Sector Query Intelligence</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">1. VOLUNTEER</label>
                            <Select 
                                name="agentId"
                                value={filters.agentId} 
                                onChange={handleFilterChange}
                                className="bg-black/40 border-gray-800"
                            >
                                <option value="">All Volunteers</option>
                                {allOrgProfiles
                                    .filter(p => p.role === Role.Volunteer)
                                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                }
                            </Select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">2. Status Category</label>
                            <Select 
                                name="status"
                                value={filters.status} 
                                onChange={handleFilterChange}
                                className="bg-black/40 border-gray-800"
                            >
                                <option value="">All Verification States</option>
                                <option value={MemberStatus.Pending}>Pending Verification</option>
                                <option value={MemberStatus.Accepted}>Accepted / Verified</option>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">3. Activation Start</label>
                            <Input 
                                type="date" 
                                name="startDate"
                                value={filters.startDate} 
                                onChange={handleFilterChange} 
                                className="bg-black/40 border-gray-800"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">4. Activation End</label>
                            <Input 
                                type="date" 
                                name="endDate"
                                value={filters.endDate} 
                                onChange={handleFilterChange} 
                                className="bg-black/40 border-gray-800"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                        <div className="w-full md:w-1/2">
                            <Input 
                                placeholder="Universal Identity Search (Name, Mobile, Aadhaar)..." 
                                name="search"
                                value={filters.search} 
                                onChange={handleFilterChange} 
                                icon={<Search size={16} />}
                                className="bg-black/20 border-gray-900 focus:border-blue-500/50"
                            />
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <Button onClick={fetchData} variant="secondary" className="flex-1 md:flex-none px-6 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
                            </Button>
                            <Button onClick={handleExport} className="flex-1 md:flex-none px-10 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-2xl bg-blue-600 hover:bg-blue-700">
                                <FileSpreadsheet size={16} /> Export Data
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card title="Sector Identity Node Registry">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-800">
                                <tr>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Identity Node</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">ENROLLMENT VOLUNTEER</th>
                                    <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Status</th>
                                    <th className="p-6 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-900/50">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-24 text-center text-[11px] animate-pulse font-black uppercase tracking-[0.4em] text-gray-600">Synchronizing Sector Records...</td></tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id} className="group hover:bg-white/[0.02] transition-all">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{member.name} {member.surname}</span>
                                                    {member.member_image_url && <FileText size={14} className="text-blue-500/50" />}
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-gray-600 font-mono tracking-tighter">
                                                    <span>{member.mobile}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-800"></span>
                                                    <span>{member.aadhaar.slice(-4).padStart(12, '•')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                                                    <UserCircle size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-white uppercase tracking-widest">
                                                        {member.agent_profile?.name || allOrgProfiles.find(p => p.id === member.volunteer_id)?.name || 'Unknown operator'}
                                                    </span>
                                                    <span className="text-[9px] text-blue-500/60 font-mono font-bold tracking-widest mt-0.5">
                                                        {member.agent_profile?.mobile || 'PH: N/A'}
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
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button 
                                                    onClick={() => openDetails(member)} 
                                                    className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/50 text-gray-400 hover:text-white transition-all"
                                                    title="View Full Identity"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleVerifyStatus(member)} 
                                                    className={`p-3 rounded-xl border transition-all ${member.status === MemberStatus.Accepted ? 'bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/5 border-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                                                    title={member.status === MemberStatus.Accepted ? "Reset Verification" : "Verify Record"}
                                                >
                                                    {member.status === MemberStatus.Accepted ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && !loading && (
                                    <tr><td colSpan={4} className="p-40 text-center text-[11px] text-gray-700 uppercase tracking-[0.5em] font-black">No member records found for this sector.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Master Identity File">
                {viewingMember && (
                    <div className="space-y-8 p-2 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col md:flex-row gap-8 p-10 bg-blue-500/5 border border-blue-500/10 rounded-[3rem] relative overflow-hidden group/modal-head">
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/modal-head:rotate-12 transition-all duration-700">
                                <Fingerprint size={120} />
                            </div>
                            
                            {viewingMember.member_image_url ? (
                                <div className="relative h-48 w-full md:w-64 rounded-[2.5rem] overflow-hidden border-2 border-white/10 shrink-0 shadow-3xl">
                                    <img src={viewingMember.member_image_url} alt="Aadhaar Scan" className="w-full h-full object-cover" />
                                    <a href={viewingMember.member_image_url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/70 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white gap-2">
                                        <ExternalLink size={24} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Open Full Scan</span>
                                    </a>
                                </div>
                            ) : (
                                <div className="h-48 w-full md:w-64 rounded-[2.5rem] bg-gray-950 border-2 border-white/5 flex flex-col items-center justify-center text-gray-800 shrink-0 gap-3">
                                    <FileText size={48} strokeWidth={1} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">No Document Found</span>
                                </div>
                            )}
                            
                            <div className="flex-1 space-y-6 pt-4 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-2">Authenticated Identity Node</p>
                                    <h4 className="text-4xl font-cinzel text-white leading-none tracking-tight">{viewingMember.name} {viewingMember.surname}</h4>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="px-5 py-2.5 bg-black/60 rounded-2xl border border-white/5 flex items-center gap-2">
                                        <Fingerprint size={12} className="text-blue-500/50" />
                                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em]">{viewingMember.aadhaar}</span>
                                    </div>
                                    <div className="px-5 py-2.5 bg-black/60 rounded-2xl border border-white/5 flex items-center gap-2">
                                        <Calendar size={12} className="text-orange-500/50" />
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enrolled: {viewingMember.submission_date.split('T')[0]}</span>
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
                            <DataPoint label="Professional Status" value={viewingMember.occupation} icon={<Briefcase size={14} />} />
                            {/* Fix: Changed ZapIcon to Zap to resolve 'Cannot find name ZapIcon' error */}
                            <DataPoint label="Support Requirement" value={viewingMember.support_need} icon={<Zap size={14} />} />
                            
                            <div className="p-8 bg-gradient-to-br from-blue-950/20 to-black border border-blue-500/20 rounded-[2rem] md:col-span-2 lg:col-span-1 group hover:border-blue-500/40 transition-all">
                                <div className="flex items-center gap-2 mb-6 text-blue-500">
                                    <BadgeCheck size={18} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Source Authentication</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/10 group-hover:scale-105 transition-transform">
                                        <UserCircle size={32} />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-white font-black uppercase text-sm tracking-widest leading-none mb-1">
                                            {viewingMember.agent_profile?.name || 'Unknown operator'}
                                        </p>
                                        <p className="text-[10px] text-blue-400 font-mono font-bold tracking-widest flex items-center gap-1.5">
                                            <Phone size={10} /> {viewingMember.agent_profile?.mobile || 'No Contact'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-10 border-t border-white/5 mt-8 sticky bottom-0 bg-gray-900 pb-4 z-10">
                            <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)} className="px-10 py-4 text-[10px] font-black uppercase tracking-widest">Close File</Button>
                            <Button 
                                onClick={() => { handleVerifyStatus(viewingMember); setIsDetailModalOpen(false); }} 
                                className={`px-12 py-4 text-[10px] font-black uppercase tracking-widest shadow-2xl ${viewingMember.status === MemberStatus.Accepted ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {viewingMember.status === MemberStatus.Accepted ? 'Reset Verification' : 'Verify Identity Node'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const DataPoint: React.FC<{ label: string, value: string, icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl group hover:border-blue-500/20 transition-all">
        <div className="flex items-center gap-2 mb-3 text-gray-500 group-hover:text-blue-500 transition-colors">
            {icon}
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
        </div>
        <p className="text-white font-bold tracking-tight">{value || 'N/A'}</p>
    </div>
);

export default OrganisationReports;
