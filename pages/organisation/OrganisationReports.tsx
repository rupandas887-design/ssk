import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { Member, MemberStatus, Role, User as VolunteerUser, Gender, Occupation, SupportNeed, MaritalStatus, Qualification } from '../../types';
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
  Copy,
  AlertCircle
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
        let targetOrgId = user?.organisationId;
        if (!targetOrgId && user?.email) {
            try {
                const { data: prof } = await supabase.from('profiles').select('organisation_id').eq('email', user.email).maybeSingle();
                if (prof?.organisation_id) targetOrgId = prof.organisation_id;
            } catch (e) {
                console.warn("Could not resolve organization ID from profile:", e);
            }
        }

        if (!targetOrgId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [membersRes, profilesRes] = await Promise.all([
                supabase
                    .from('members')
                    .select('*, agent_profile:profiles!volunteer_id(name, mobile, profile_photo_url)')
                    .eq('organisation_id', targetOrgId)
                    .order('submission_date', { ascending: false }),
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('organisation_id', targetOrgId)
            ]);

            if (profilesRes.error) console.error("Organisation reports profiles error:", profilesRes.error);
            
            if (membersRes.error) {
                console.warn("Organisation reports members error, falling back to simple select:", membersRes.error);
                const fallbackRes = await supabase
                    .from('members')
                    .select('*')
                    .eq('organisation_id', targetOrgId)
                    .order('submission_date', { ascending: false });
                if (fallbackRes.data) setMyMembers(fallbackRes.data as any);
            } else if (membersRes.data) {
                setMyMembers(membersRes.data as MemberWithAgent[]);
            }

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
            console.error("OrganisationReports sync error:", error);
            addNotification("Sync failed.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('org-reports-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
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
    }, [user]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleCopyDetails = (member: Member) => {
        const textToCopy = `MEMBER IDENTITY FILE
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
        addNotification("Member dossier copied to clipboard.", "success");
    };

    const filteredMembers = useMemo(() => {
        return myMembers.filter(member => {
            const matchesAgent = filters.agentId ? member.volunteer_id === filters.agentId : true;
            const matchesStatus = filters.status ? member.status === filters.status : true;
            
            const submissionDate = new Date(member.submission_date);
            const start = filters.startDate ? new Date(filters.startDate) : null;
            const end = filters.endDate ? new Date(filters.endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            const matchesStart = start ? submissionDate >= start : true;
            const matchesEnd = end ? submissionDate <= end : true;

            const q = filters.search.toLowerCase().trim();
            const fullName = `${member.name || ''} ${member.surname || ''}`.toLowerCase();
            const matchesSearch = !q || (
                fullName.includes(q) ||
                (member.mobile && member.mobile.includes(q)) ||
                (member.aadhaar && member.aadhaar.includes(q)) ||
                (member.agent_profile?.name && member.agent_profile.name.toLowerCase().includes(q))
            );

            return matchesAgent && matchesStatus && matchesStart && matchesEnd && matchesSearch;
        });
    }, [myMembers, filters]);

    const handleExport = () => {
        const headers = [
            'Full Name', 'Gharano', 'Father Name', 'Mobile', 
            'Emergency Contact', 'DOB', 'Gender', 'Marital Status', 
            'Qualification', 'Pincode', 'Occupation', 'Support Need', 
            'Volunteer', 'Status', 'Full Address'
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
            m.status,
            m.address
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Organization_Members_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleEditMember = (member: MemberWithAgent) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        
        if (editingMember.status === MemberStatus.Accepted) {
            addNotification("Cannot alter a verified citizen file.", "error");
            return;
        }

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
                    support_need: editingMember.support_need
                })
                .eq('id', editingMember.id);

            if (error) throw error;

            addNotification("Member identity updated.", "success");
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            addNotification(`Update failed: ${err.message}`, "error");
        } finally {
            setIsUpdating(false);
        }
    };

    const isVerified = editingMember?.status === MemberStatus.Accepted;

    return (
        <DashboardLayout title="Member Data Ledger">
            <div className="space-y-6 pb-12">
                {/* FILTER CARD */}
                <Card 
                    title="Ledger Query & Filter" 
                    subtitle="Filter records by assigned volunteer, audit verification status, date or keywords"
                    className="border-slate-200/80 shadow-card"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select label="Filter by Volunteer" name="agentId" value={filters.agentId} onChange={handleFilterChange}>
                            <option value="">All Field Volunteers</option>
                            {allOrgProfiles.filter(p => p.role === Role.Volunteer).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                        <Select label="Verification Status" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Verification States</option>
                            <option value={MemberStatus.Pending}>Pending</option>
                            <option value={MemberStatus.Accepted}>Accepted</option>
                        </Select>
                        <Input type="date" label="Enrolled From" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        <Input type="date" label="Enrolled To" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="w-full sm:flex-1">
                            <Input 
                                placeholder="Search by name, phone, Aadhaar..." 
                                name="search" 
                                value={filters.search} 
                                onChange={handleFilterChange} 
                                icon={<Search size={16} />} 
                            />
                        </div>
                        <Button onClick={handleExport} className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold gap-2">
                            <FileSpreadsheet size={15} />
                            <span>Export CSV</span>
                        </Button>
                    </div>
                </Card>

                {/* TABLE CARD */}
                <Card 
                    title="Enrolled Citizens Ledger" 
                    subtitle="Universal community records verified through this organization node"
                    className="border-slate-200/80 shadow-card p-0 overflow-hidden"
                >
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm min-w-[650px]">
                            <thead className="bg-slate-50/80 border-b border-slate-200/80">
                                <tr className="text-slate-600 text-xs font-bold tracking-wider">
                                    <th className="px-6 py-4">Citizen Identity</th>
                                    <th className="px-6 py-4 hidden sm:table-cell">Enrolling Volunteer</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-xs font-semibold text-slate-500">
                                            <Loader2 className="animate-spin inline-block mr-2" size={18} />
                                            Synchronizing member ledger...
                                        </td>
                                    </tr>
                                ) : filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-xs font-medium text-slate-500">
                                            No member records found matching your filters.
                                        </td>
                                    </tr>
                                ) : filteredMembers.map(member => (
                                    <tr key={member.id} className="hover:bg-saffron-50/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-base">
                                                    {formatDisplayName(member.name, member.surname)}
                                                </span>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                                                    <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {member.mobile}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1"><Fingerprint size={12} className="text-slate-400" /> {member.aadhaar ? member.aadhaar.slice(-4).padStart(12, '•') : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                                  {member.agent_profile?.profile_photo_url ? (
                                                    <img 
                                                      src={member.agent_profile.profile_photo_url} 
                                                      className="h-full w-full object-cover" 
                                                      alt="Volunteer" 
                                                    />
                                                  ) : (
                                                    <UserCircle size={18} className="text-saffron-600" />
                                                  )}
                                                </div>
                                                <span className="text-xs font-semibold text-slate-700">{member.agent_profile?.name || 'Field Volunteer'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full border ${
                                              member.status === MemberStatus.Accepted 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : member.status === MemberStatus.Deceased
                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {member.status === MemberStatus.Accepted && <CheckCircle size={12} />}
                                                {member.status === MemberStatus.Pending && <Clock size={12} />}
                                                <span>{member.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                  onClick={() => handleCopyDetails(member)}
                                                  className="p-2 text-slate-400 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors border border-transparent hover:border-saffron-100"
                                                  title="Copy Dossier"
                                                >
                                                    <Copy size={15} />
                                                </button>
                                                <button 
                                                  onClick={() => handleEditMember(member)} 
                                                  className="p-2 text-slate-600 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors border border-slate-200 hover:border-saffron-200" 
                                                  title={member.status === MemberStatus.Accepted ? "View File" : "Edit File"}
                                                >
                                                    {member.status === MemberStatus.Accepted ? <Eye size={15} /> : <Edit3 size={15} />}
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
              title={isVerified ? "Member Dossier" : "Update Member Record"} 
              maxWidth="3xl"
              footer={editingMember && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                    <Button 
                      variant="secondary" 
                      onClick={() => handleCopyDetails(editingMember)} 
                      className="w-full sm:w-auto text-xs font-semibold gap-2"
                    >
                        <Copy size={15} /> <span>Copy Dossier</span>
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button 
                          variant="ghost" 
                          onClick={() => setIsEditModalOpen(false)} 
                          className="text-xs"
                        >
                            {isVerified ? "Close" : "Cancel"}
                        </Button>
                        {!isVerified && (
                            <Button 
                              onClick={handleUpdateMember} 
                              disabled={isUpdating} 
                              className="text-xs font-bold gap-2"
                            >
                                {isUpdating ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                <span>Save Changes</span>
                            </Button>
                        )}
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
                                        Citizen ID: <span className="font-mono text-slate-600">{editingMember.aadhaar || 'N/A'}</span> • Enrolled: {new Date(editingMember.submission_date).toLocaleDateString()}
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
                            <Input label="Full Name" disabled={isVerified} value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                            <Input label="Gharano (Surname)" disabled={isVerified} value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                            <Input label="Father / Husband Name" disabled={isVerified} value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} />
                            <Input label="Primary Mobile" disabled={isVerified} value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} />
                            <Input label="Emergency Contact" disabled={isVerified} value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} />
                            <Input label="Date of Birth" disabled={isVerified} type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} />
                            <Select label="Gender" disabled={isVerified} value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})}>
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </Select>
                            <Select label="Marital Status" disabled={isVerified} value={editingMember.marital_status} onChange={(e) => setEditingMember({...editingMember, marital_status: e.target.value as MaritalStatus})}>
                                {Object.values(MaritalStatus).map(m => <option key={m} value={m}>{m}</option>)}
                            </Select>
                            <Select label="Qualification" disabled={isVerified} value={editingMember.qualification} onChange={(e) => setEditingMember({...editingMember, qualification: e.target.value as Qualification})}>
                                {Object.values(Qualification).map(q => <option key={q} value={q}>{q}</option>)}
                            </Select>
                            <Input label="Pincode" disabled={isVerified} value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} />
                            <div className="sm:col-span-2">
                                <Input label="Residential Address" disabled={isVerified} value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} />
                            </div>
                            <Select label="Occupation" disabled={isVerified} value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})}>
                                {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                            <Select label="Community Need" disabled={isVerified} value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})}>
                                {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
};

export default OrganisationReports;
