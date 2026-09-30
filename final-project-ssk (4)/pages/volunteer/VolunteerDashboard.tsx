import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { Member, MemberStatus, Gender, MaritalStatus, Qualification, Occupation, SupportNeed } from '../../types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { 
  User, 
  RefreshCw, 
  Filter, 
  MapPin, 
  Phone, 
  Building2, 
  UserCircle, 
  Activity, 
  UserPlus, 
  Lock, 
  KeyRound, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Loader2,
  Edit3,
  ExternalLink,
  Save,
  CheckCircle,
  Clock,
  Copy,
  Calendar,
  Fingerprint,
  Image as ImageIcon,
  Sparkles,
  Users
} from 'lucide-react';

type MemberWithAttribution = Member & {
    agent?: {
        name: string;
        organisations?: {
            name: string;
        }
    }
};

const VolunteerDashboard: React.FC = () => {
    const { user, updatePassword } = useAuth();
    const navigate = useNavigate();
    const [mySubmissions, setMySubmissions] = useState<MemberWithAttribution[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    // Detail Modal State
    const [editingMember, setEditingMember] = useState<MemberWithAttribution | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdatingMember, setIsUpdatingMember] = useState(false);

    // Forced Password Reset State
    const [newPass, setNewPass] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isUpdatingPass, setIsUpdatingPass] = useState(false);

    const formatDisplayName = (first: string, last: string) => {
        const f = (first || '').trim().toLowerCase();
        const l = (last || '').trim().toLowerCase();
        return `${f} ${l}`.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const fetchSubmissions = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let { data, error } = await supabase
                .from('members')
                .select(`
                    *,
                    agent:profiles!volunteer_id (
                        name,
                        organisations (name)
                    )
                `)
                .eq('volunteer_id', user.id)
                .order('submission_date', { ascending: false });
                
            if (error) {
                console.warn("Volunteer fetchSubmissions join error, trying simple query:", error);
                const fallbackRes = await supabase
                    .from('members')
                    .select('*')
                    .eq('volunteer_id', user.id)
                    .order('submission_date', { ascending: false });

                if (fallbackRes.error) {
                    console.error("Volunteer fetchSubmissions fallback error:", fallbackRes.error);
                    throw fallbackRes.error;
                }
                data = fallbackRes.data as any;
            }
            if (data) setMySubmissions(data as MemberWithAttribution[]);
        } catch (err: any) {
            console.error("Volunteer submissions sync error:", err);
            addNotification(`Sync Fault: ${err.message || 'Failed to fetch submissions'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleForcePasswordChange = async () => {
        if (newPass.length < 6) {
            addNotification("Access Key must be at least 6 characters.", "error");
            return;
        }
        setIsUpdatingPass(true);
        try {
            const { error } = await updatePassword(newPass);
            if (error) throw error;
            addNotification("Security Key successfully updated.", "success");
            setNewPass('');
        } catch (err: any) {
            addNotification(`Password update failed: ${err.message}`, "error");
        } finally {
            setIsUpdatingPass(false);
        }
    };

    const handleCopyDetails = (member: Member) => {
        const textToCopy = `MEMBER PROFILE AUDIT
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
What do they do: ${member.occupation}
What do they want: ${member.support_need}
Submission Date: ${new Date(member.submission_date).toLocaleDateString()}
Status: ${member.status}
--------------------------------`;

        navigator.clipboard.writeText(textToCopy);
        addNotification("Member dossier copied to clipboard.", "success");
    };

    const handleEditClick = (member: MemberWithAttribution) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        
        if (editingMember.status === MemberStatus.Accepted) {
            addNotification("Record Verified: Alterations locked.", "error");
            return;
        }

        setIsUpdatingMember(true);
        try {
            const { error } = await supabase
                .from('members')
                .update({
                    name: editingMember.name,
                    surname: editingMember.surname,
                    father_name: editingMember.father_name,
                    dob: editingMember.dob,
                    gender: editingMember.gender,
                    marital_status: editingMember.marital_status,
                    qualification: editingMember.qualification,
                    emergency_contact: editingMember.emergency_contact,
                    pincode: editingMember.pincode,
                    address: editingMember.address,
                    occupation: editingMember.occupation,
                    support_need: editingMember.support_need
                })
                .eq('id', editingMember.id);

            if (error) throw error;

            addNotification("Identity updated successfully.", "success");
            setIsEditModalOpen(false);
            fetchSubmissions();
        } catch (err: any) {
            addNotification(`Update failed: ${err.message}`, "error");
        } finally {
            setIsUpdatingMember(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchSubmissions();

            // Realtime subscription for volunteer submissions
            const channel = supabase
                .channel(`volunteer-members-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'members',
                        filter: `volunteer_id=eq.${user.id}`
                    },
                    () => {
                        fetchSubmissions();
                    }
                )
                .subscribe();

            const handleFocus = () => {
                fetchSubmissions();
            };
            window.addEventListener('focus', handleFocus);
            window.addEventListener('online', handleFocus);

            return () => {
                supabase.removeChannel(channel);
                window.removeEventListener('focus', handleFocus);
                window.removeEventListener('online', handleFocus);
            };
        }
    }, [user?.id]);
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        phone: '',
        area: '', 
    });
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredSubmissions = useMemo(() => {
        return mySubmissions.filter(member => {
            const submissionDate = new Date(member.submission_date);
            const start = filters.startDate ? new Date(filters.startDate) : null;
            const end = filters.endDate ? new Date(filters.endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);
            
            if (start && submissionDate < start) return false;
            if (end && submissionDate > end) return false;
            if (filters.phone && member.mobile && !member.mobile.includes(filters.phone)) return false;
            if (filters.area && member.pincode && !member.pincode.includes(filters.area)) return false;
            return true;
        });
    }, [mySubmissions, filters]);

    const isLocked = !!user?.passwordResetPending;
    const isEditingVerified = editingMember?.status === MemberStatus.Accepted;

    return (
        <DashboardLayout title="Field Activity Portal">
            <div className={`space-y-6 pb-12 transition-all duration-700 ${isLocked ? 'blur-2xl grayscale pointer-events-none opacity-40 select-none' : ''}`}>
                
                {/* Hero Volunteer Profile Banner */}
                <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group">
                    {/* Subtle Indigo Glow */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-saffron-500/[0.06] via-saffron-400/[0.03] to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                    
                    <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center text-center md:text-left relative z-10">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-saffron-50 to-amber-50 border border-saffron-100 flex items-center justify-center text-saffron-600 shadow-sm shrink-0">
                            <User size={32} strokeWidth={2} />
                        </div>
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-saffron-50 border border-saffron-200/60 text-saffron-700 text-[11px] font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-saffron-500"></span>
                                    Authenticated Field Volunteer
                                </span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight truncate max-w-[320px] md:max-w-none">
                                {user?.name}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Node: <span className="text-slate-800 font-semibold">{user?.organisationName || 'Community Network'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
                        <Button 
                            variant="secondary"
                            onClick={fetchSubmissions} 
                            className="p-3 text-slate-600 flex items-center justify-center gap-2"
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            <span className="sm:hidden text-xs">Refresh</span>
                        </Button>
                        <Button 
                            onClick={() => navigate('/volunteer/new-member')} 
                            className="py-3 px-6 text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2"
                        >
                            <UserPlus size={16} />
                            <span>Enroll New Member</span>
                        </Button>
                    </div>
                </div>

                {/* KPI Metric Summary - Exactly 2 cards per row across all screen sizes */}
                <div className="grid grid-cols-2 gap-3 sm:gap-5">
                    <Card className="p-3.5 sm:p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-600">
                                    <Users size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-saffron-700 bg-saffron-50 px-2 py-0.5 rounded-full">Total</span>
                            </div>
                            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 leading-snug break-words whitespace-normal">Enrolled by You</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">{mySubmissions.length}</p>
                    </Card>

                    <Card className="p-3.5 sm:p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                    <CheckCircle size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Approved</span>
                            </div>
                            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 leading-snug break-words whitespace-normal">Accepted Records</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                            {mySubmissions.filter(m => m.status === MemberStatus.Accepted).length}
                        </p>
                    </Card>

                    <Card className="p-3.5 sm:p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2.5 sm:mb-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                    <Clock size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Audit</span>
                            </div>
                            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 leading-snug break-words whitespace-normal">Pending Review</p>
                        </div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                            {mySubmissions.filter(m => m.status === MemberStatus.Pending).length}
                        </p>
                    </Card>
                </div>
                
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
                        <Card title="Registry Filter & Query" subtitle="Search and refine your enrolled identity records" className="border-slate-200/80 shadow-card">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input label="Start Date" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="text-xs" />
                                <Input label="End Date" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="text-xs" />
                                <Input label="Mobile Search" name="phone" placeholder="91XXXXXXXX" value={filters.phone} onChange={handleFilterChange} icon={<Phone size={14} />} className="text-xs" />
                                <Input label="Area Pincode" name="area" placeholder="560XXX" value={filters.area} onChange={handleFilterChange} icon={<MapPin size={14} />} className="text-xs" />
                            </div>
                        </Card>
                    )}
                </div>

                {/* Field Activity Table */}
                <Card title="Field Enrollments" subtitle="All community members registered through your volunteer node" className="border-slate-200/80 shadow-card p-0 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left min-w-[650px] text-sm">
                        <thead className="bg-slate-50/80 border-b border-slate-200/80">
                          <tr className="text-slate-600 text-xs font-bold tracking-wider">
                            <th className="px-6 py-4">Citizen Identity</th>
                            <th className="px-6 py-4">Community Need</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loading ? (
                            <tr>
                              <td colSpan={4} className="p-16 text-center text-xs font-semibold text-slate-500">
                                <Loader2 className="animate-spin inline-block mr-2" size={18} />
                                Loading enrolled records...
                              </td>
                            </tr>
                          ) : filteredSubmissions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-16 text-center text-xs font-medium text-slate-500">
                                No member enrollment records found matching your filters.
                              </td>
                            </tr>
                          ) : filteredSubmissions.map(member => (
                            <tr key={member.id} className="hover:bg-saffron-50/20 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 text-base">
                                    {formatDisplayName(member.name, member.surname)}
                                  </span>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-mono">
                                    <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {member.mobile}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Fingerprint size={12} className="text-slate-400" /> {member.aadhaar ? member.aadhaar.slice(-4).padStart(12, '•') : 'N/A'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-slate-800">{member.occupation || 'N/A'}</span>
                                  <span className="text-xs text-saffron-600 font-medium">{member.support_need || 'None specified'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full border ${
                                  member.status === MemberStatus.Accepted 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
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
                                    title="Copy Details"
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleEditClick(member)}
                                    className="p-2 text-slate-600 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors border border-slate-200 hover:border-saffron-200"
                                    title={member.status === MemberStatus.Accepted ? "View Record" : "Edit Record"}
                                  >
                                    {member.status === MemberStatus.Accepted ? <Eye size={16} /> : <Edit3 size={16} />}
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

            {/* DETAIL / EDIT MODAL */}
            <Modal 
              isOpen={isEditModalOpen} 
              onClose={() => setIsEditModalOpen(false)} 
              title={isEditingVerified ? "Verified Member Details" : "Edit Member Enrollment"}
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
                      Close
                    </Button>
                    {!isEditingVerified && (
                      <Button 
                        onClick={handleUpdateMember} 
                        disabled={isUpdatingMember}
                        className="text-xs font-bold gap-2"
                      >
                        {isUpdatingMember ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        <span>Save Updates</span>
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
                        <User size={22} />
                      </div>
                      <div>
                        <h4 className="text-xl font-extrabold text-[#0B1020] tracking-tight">
                          {formatDisplayName(editingMember.name, editingMember.surname)}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Aadhaar: <span className="font-mono text-slate-600">{editingMember.aadhaar || 'N/A'}</span> • Submitted: {new Date(editingMember.submission_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 ${
                      editingMember.status === MemberStatus.Accepted 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                        : 'bg-orange-50/70 text-[#C65E00] border-orange-200'
                    }`}>
                      {editingMember.status}
                    </span>
                  </div>

                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input label="Full Name" disabled={isEditingVerified} value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                    <Input label="Gharano (Surname)" disabled={isEditingVerified} value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} />
                    <Input label="Father / Husband Name" disabled={isEditingVerified} value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} />
                    <Input label="Primary Mobile" disabled={isEditingVerified} value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} />
                    <Input label="Emergency Contact" disabled={isEditingVerified} value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} />
                    <Input label="Date of Birth" disabled={isEditingVerified} type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} />
                    <Select label="Gender" disabled={isEditingVerified} value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})}>
                      {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                    </Select>
                    <Select label="Marital Status" disabled={isEditingVerified} value={editingMember.marital_status} onChange={(e) => setEditingMember({...editingMember, marital_status: e.target.value as MaritalStatus})}>
                      {Object.values(MaritalStatus).map(m => <option key={m} value={m}>{m}</option>)}
                    </Select>
                    <Select label="Qualification" disabled={isEditingVerified} value={editingMember.qualification} onChange={(e) => setEditingMember({...editingMember, qualification: e.target.value as Qualification})}>
                      {Object.values(Qualification).map(q => <option key={q} value={q}>{q}</option>)}
                    </Select>
                    <Input label="Pincode" disabled={isEditingVerified} value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} />
                    <div className="sm:col-span-2">
                      <Input label="Residential Address" disabled={isEditingVerified} value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} />
                    </div>
                    <Select label="Occupation" disabled={isEditingVerified} value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})}>
                      {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                    </Select>
                    <Select label="Support Needed" disabled={isEditingVerified} value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})}>
                      {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                  </div>
                </div>
              )}
            </Modal>

            {/* MANDATORY SECURITY UPDATE MODAL */}
            <Modal isOpen={isLocked} onClose={() => {}} title="Security Key Renewal Required">
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Security Update Mandatory</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Your access password must be updated before you can continue using the field portal.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <Input 
                    label="New Security Password" 
                    type={showPass ? "text" : "password"} 
                    value={newPass} 
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Minimum 6 characters"
                    icon={<Lock size={16} />}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-[32px] text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <Button 
                  onClick={handleForcePasswordChange} 
                  disabled={isUpdatingPass || !newPass || newPass.length < 6} 
                  className="w-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {isUpdatingPass ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
                  <span>Update Password &amp; Proceed</span>
                </Button>
              </div>
            </Modal>
        </DashboardLayout>
    );
};

export default VolunteerDashboard;
