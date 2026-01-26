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
  Image as ImageIcon
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
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
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
                
            if (error) throw error;
            if (data) setMySubmissions(data as MemberWithAttribution[]);
        } catch (err: any) {
            addNotification(`Sync Fault: ${err.message}`, 'error');
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
            const { success, error } = await updatePassword(newPass);
            if (success) {
                addNotification("Security Key updated successfully. Network access restored.", "success");
                setNewPass('');
            } else {
                addNotification(error || "Update failed.", "error");
            }
        } finally {
            setIsUpdatingPass(false);
        }
    };

    const handleEditMember = (member: MemberWithAttribution) => {
        setEditingMember({ ...member });
        setIsEditModalOpen(true);
    };

    const handleCopyDetails = (member: MemberWithAttribution) => {
        const text = `Name: ${formatDisplayName(member.name, member.surname)}\nMobile: ${member.mobile}\nAadhaar: ${member.aadhaar}`;
        navigator.clipboard.writeText(text);
        addNotification("Identity details copied to clipboard.", "info");
    };

    const handleUpdateMember = async () => {
        if (!editingMember || editingMember.status === MemberStatus.Accepted) return;
        setIsUpdatingMember(true);
        try {
            const { error } = await supabase.from('members').update({
                name: (editingMember.name || '').trim(),
                surname: (editingMember.surname || '').trim(),
                father_name: (editingMember.father_name || '').trim(),
                mobile: (editingMember.mobile || '').trim(),
                emergency_contact: (editingMember.emergency_contact || '').trim(),
                dob: editingMember.dob,
                gender: editingMember.gender,
                marital_status: editingMember.marital_status,
                qualification: editingMember.qualification,
                pincode: (editingMember.pincode || '').trim(),
                address: (editingMember.address || '').trim(),
                occupation: editingMember.occupation,
                support_need: editingMember.support_need,
            }).eq('id', editingMember.id);
            
            if (error) throw error;
            addNotification("Identity synchronized.", "success");
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
        }
    }, [user?.id]);
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        phone: '',
        area: '', 
    });

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
        <DashboardLayout title="Volunteers management">
            <div className={`space-y-4 md:space-y-6 pb-6 transition-all duration-700 ${isLocked ? 'blur-2xl grayscale pointer-events-none opacity-40 select-none' : ''}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 md:p-8 bg-blue-900/10 border border-blue-900/20 rounded-2xl md:rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:rotate-6 transition-transform duration-700 pointer-events-none">
                        <User size={100} className="md:size-[120px]" />
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center text-center md:text-left relative z-10">
                         <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-400/10 shadow-lg shrink-0">
                            <User size={28} className="md:size-8" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-blue-400/50 mb-1">Authenticated Volunteer</p>
                            <h2 className="font-cinzel text-2xl md:text-3xl lg:text-4xl text-white tracking-tight leading-none truncate max-w-[280px] md:max-w-none">
                                {user?.name}
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
                        <button 
                            onClick={fetchSubmissions} 
                            className="flex items-center justify-center p-3.5 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/40 transition-all text-gray-500 hover:text-white"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <Button 
                            onClick={() => navigate('/volunteer/new-member')} 
                            className="w-full sm:w-auto py-3.5 px-8 text-[9px] font-black uppercase tracking-widest shadow-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2"
                        >
                            <UserPlus size={16} />
                            <span>Enroll Member</span>
                        </Button>
                    </div>
                </div>
                
                <Card className="border-white/5 bg-black/40 backdrop-blur-md p-5 md:p-6 rounded-xl md:rounded-2xl">
                    <div className="flex items-center gap-2 mb-4 text-gray-600">
                        <Filter size={12} />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Registry Query Node</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input label="Start" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="text-xs" />
                        <Input label="End" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="text-xs" />
                        <Input label="Contact" name="phone" placeholder="91XXXXXXXX" value={filters.phone} onChange={handleFilterChange} icon={<Phone size={12} />} className="text-xs" />
                        <Input label="Pincode" name="area" placeholder="560XXX" value={filters.area} onChange={handleFilterChange} icon={<MapPin size={12} />} className="text-xs" />
                    </div>
                </Card>

                <Card className="bg-[#050505] border-white/5 rounded-xl md:rounded-3xl p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Activity size={16} />
                        </div>
                        <h3 className="font-cinzel text-base md:text-lg text-white uppercase tracking-widest">Field Activity</h3>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left min-w-[600px]">
                        <thead className="border-b border-white/5">
                          <tr className="text-gray-600 text-[8px] sm:text-[9px] uppercase tracking-widest font-black">
                            <th className="pb-4 pl-2">Member Node</th>
                            <th className="pb-4 text-blue-500">Volunteer Attribution</th>
                            <th className="pb-4 text-center">Verification Status</th>
                            <th className="pb-4 text-right pr-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {loading ? (
                              <tr><td colSpan={4} className="text-center p-20 animate-pulse text-[10px] uppercase tracking-[0.3em] text-gray-700 font-black">Syncing...</td></tr>
                          ) : (
                            <>
                            {filteredSubmissions.length === 0 ? (
                                <tr><td colSpan={4} className="text-center p-12 text-gray-700 text-[9px] font-black uppercase tracking-widest">No matching records.</td></tr>
                            ) : filteredSubmissions.map(member => (
                              <tr key={member.id} className="group hover:bg-white/[0.01] transition-colors">
                                <td className="py-4 pl-2">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-sm sm:text-base group-hover:text-blue-400 transition-colors truncate">
                                            {formatDisplayName(member.name, member.surname)}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[9px] text-gray-600 font-mono tracking-tighter mt-0.5">
                                          <Phone size={10} /> {member.mobile}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/5 flex items-center justify-center text-blue-500">
                                            <UserCircle size={16} />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest truncate">
                                                {member.agent?.name || user?.name}
                                            </span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Building2 size={10} className="text-orange-500/70" />
                                                <span className="text-[8px] font-black text-orange-500/60 uppercase tracking-tighter truncate">
                                                    {member.agent?.organisations?.name || user?.organisationName || 'Independent'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 text-center">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                        member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/10' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/10'
                                    }`}>
                                      {member.status}
                                    </span>
                                    <span className="text-[8px] font-mono text-gray-700 uppercase">{member.submission_date.split('T')[0]}</span>
                                  </div>
                                </td>
                                <td className="py-4 text-right pr-2">
                                    <button 
                                      onClick={() => handleEditMember(member)} 
                                      className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/50 text-gray-500 hover:text-white transition-all"
                                      title={member.status === MemberStatus.Accepted ? "View Details" : "Edit Record"}
                                    >
                                        {member.status === MemberStatus.Accepted ? <Eye size={18} /> : <Edit3 size={18} />}
                                    </button>
                                </td>
                              </tr>
                            ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                </Card>
            </div>

            {/* IDENTITY DETAIL MODAL */}
            <Modal 
              isOpen={isEditModalOpen} 
              onClose={() => setIsEditModalOpen(false)} 
              title={isEditingVerified ? "Review Identity File" : "Modify Member Record"}
              maxWidth="4xl"
              footer={editingMember && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <Button 
                        variant="secondary" 
                        onClick={() => handleCopyDetails(editingMember)} 
                        className="flex-1 sm:flex-none px-4 py-3.5 text-[9px] font-black uppercase tracking-widest gap-2 bg-white/5 border border-white/5 active:scale-95 transition-all"
                      >
                          <Copy size={16} /> <span>Copy Details</span>
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => setIsEditModalOpen(false)} 
                        className="flex-1 sm:flex-none px-6 sm:px-10 py-3.5 text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                      >
                          {isEditingVerified ? "Close" : "Cancel"}
                      </Button>
                  </div>
                  {!isEditingVerified && (
                      <Button 
                        onClick={handleUpdateMember} 
                        disabled={isUpdatingMember} 
                        className="w-full sm:w-auto px-10 sm:px-14 py-4 text-[10px] font-black uppercase tracking-[0.4em] bg-blue-600 hover:bg-blue-500 shadow-[0_15px_30px_-10px_rgba(59,130,246,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                          {isUpdatingMember ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          {isUpdatingMember ? 'SYNCING...' : 'SAVE CHANGES'}
                      </Button>
                  )}
                </div>
              )}
            >
              {editingMember && (
                <div className="space-y-6 sm:space-y-8">
                  <div className={`p-4 sm:p-6 border rounded-[1.5rem] sm:rounded-[2rem] relative overflow-hidden group transition-all duration-500 ${isEditingVerified ? 'bg-green-500/5 border-green-500/10' : 'bg-blue-500/5 border-blue-500/10'}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
                      <div className="lg:col-span-5 space-y-3">
                          <div className="flex items-center gap-2">
                              <ImageIcon className={isEditingVerified ? "text-green-500/60" : "text-blue-500/60"} size={12} />
                              <p className={`text-[9px] font-black uppercase tracking-widest ${isEditingVerified ? "text-green-500/60" : "text-blue-500/60"}`}>Identification Scan</p>
                          </div>
                          <div className="rounded-[1rem] sm:rounded-[1.25rem] overflow-hidden border border-white/10 bg-black/40 relative group/img shadow-xl aspect-[1.58/1]">
                              <img src={editingMember.aadhaar_front_url} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" alt="Aadhaar Front" />
                              <a href={editingMember.aadhaar_front_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/70 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                  <ExternalLink className="text-white" size={24} />
                              </a>
                          </div>
                      </div>
                      
                      <div className="lg:col-span-7 flex flex-col justify-center space-y-4 lg:space-y-5">
                          <div className="space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                                  <div className="space-y-1">
                                      <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isEditingVerified ? "text-green-500" : "text-blue-500"}`}>Target Identity</p>
                                      <h4 className="text-lg sm:text-2xl font-cinzel text-white leading-none font-bold uppercase break-words pr-2">
                                          {formatDisplayName(editingMember.name, editingMember.surname)}
                                      </h4>
                                  </div>
                                  <div className="flex-shrink-0">
                                      <div className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest whitespace-nowrap ${editingMember.status === MemberStatus.Accepted ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                          {editingMember.status} Record
                                      </div>
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="px-3 py-2 sm:px-4 sm:py-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-4 transition-all hover:bg-black/60">
                                      <Fingerprint size={16} className={isEditingVerified ? "text-green-500/50" : "text-blue-500/50"} />
                                      <div className="flex flex-col min-w-0">
                                          <span className="text-[7px] font-black uppercase tracking-widest text-gray-600 leading-none mb-1">Citizen ID</span>
                                          <span className="text-xs sm:text-sm font-mono text-white tracking-widest truncate">{editingMember.aadhaar}</span>
                                      </div>
                                  </div>
                                  <div className="px-3 py-2 sm:px-4 sm:py-3 bg-black/40 rounded-xl border border-white/5 flex items-center gap-4 transition-all hover:bg-black/60">
                                      <Building2 size={16} className={isEditingVerified ? "text-green-500/50" : "text-blue-500/50"} />
                                      <div className="flex flex-col min-w-0">
                                          <span className="text-[7px] font-black uppercase tracking-widest text-gray-600 leading-none mb-1">Parent Node</span>
                                          <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-tighter truncate">
                                            {editingMember.agent?.organisations?.name || user?.organisationName || 'Independent'}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          {isEditingVerified && (
                              <div className="p-2 sm:p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                                  <p className="text-[9px] font-black text-green-400 uppercase tracking-widest">Verified: Audit Locked</p>
                              </div>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-8">
                      <Input label="Full Name" disabled={isEditingVerified} value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} icon={<User size={12} />} className="py-2.5 text-xs font-bold" />
                      <Input label="Gharano" disabled={isEditingVerified} value={editingMember.surname} onChange={(e) => setEditingMember({...editingMember, surname: e.target.value})} icon={<User size={12} />} className="py-2.5 text-xs font-bold" />
                      <Input label="Father / Guardian / Husband Name" disabled={isEditingVerified} value={editingMember.father_name} onChange={(e) => setEditingMember({...editingMember, father_name: e.target.value})} icon={<UserCircle size={12} />} className="py-2.5 text-xs font-bold" />
                      <Input label="Mobile" disabled={isEditingVerified} value={editingMember.mobile} onChange={(e) => setEditingMember({...editingMember, mobile: e.target.value})} icon={<Phone size={12} />} className="py-2.5 text-xs font-bold" />
                      <Input label="Emergency Contact" disabled={isEditingVerified} value={editingMember.emergency_contact} onChange={(e) => setEditingMember({...editingMember, emergency_contact: e.target.value})} icon={<Phone size={12} />} className="py-2.5 text-xs font-bold" />
                      <Input label="DOB" disabled={isEditingVerified} type="date" value={editingMember.dob} onChange={(e) => setEditingMember({...editingMember, dob: e.target.value})} icon={<Calendar size={12} />} className="py-2.5 text-xs font-bold" />
                      <Select label="Gender" disabled={isEditingVerified} value={editingMember.gender} onChange={(e) => setEditingMember({...editingMember, gender: e.target.value as Gender})} className="py-2.5 text-xs font-bold">
                          {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                      </Select>
                      <Select label="Marital Status" disabled={isEditingVerified} value={editingMember.marital_status} onChange={(e) => setEditingMember({...editingMember, marital_status: e.target.value as MaritalStatus})} className="py-2.5 text-xs font-bold">
                          {Object.values(MaritalStatus).map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>
                      <Select label="Qualification" disabled={isEditingVerified} value={editingMember.qualification} onChange={(e) => setEditingMember({...editingMember, qualification: e.target.value as Qualification})} className="py-2.5 text-xs font-bold">
                          {Object.values(Qualification).map(q => <option key={q} value={q}>{q}</option>)}
                      </Select>
                      <Input label="Pincode" disabled={isEditingVerified} value={editingMember.pincode} onChange={(e) => setEditingMember({...editingMember, pincode: e.target.value})} icon={<MapPin size={12} />} className="py-2.5 text-xs font-bold" />
                      <div className="sm:col-span-2">
                          <Input label="Full Residence" disabled={isEditingVerified} value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} icon={<MapPin size={12} />} className="py-2.5 text-xs font-bold" />
                      </div>
                      <Select label="What do they do?" disabled={isEditingVerified} value={editingMember.occupation} onChange={(e) => setEditingMember({...editingMember, occupation: e.target.value as Occupation})} className="py-2.5 text-xs font-bold">
                          {Object.values(Occupation).map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                      <Select label="What do they want?" disabled={isEditingVerified} value={editingMember.support_need} onChange={(e) => setEditingMember({...editingMember, support_need: e.target.value as SupportNeed})} className="py-2.5 text-xs font-bold">
                          {Object.values(SupportNeed).map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                  </div>
                </div>
              )}
            </Modal>

            {/* MANDATORY SECURITY UPDATE MODAL */}
            <Modal isOpen={isLocked} onClose={() => {}} title="Critical Security Update Required">
                <div className="space-y-8 p-4">
                    <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-3xl flex items-center gap-4">
                        <ShieldAlert className="text-red-500 shrink-0" size={32} />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest text-red-500">Security Override Engaged</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                                Your access key has been flagged for mandatory renewal. You must establish a new security key to restore terminal connectivity.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="relative">
                            <Input 
                                label="ESTABLISH NEW SECURITY KEY" 
                                type={showPass ? "text" : "password"} 
                                value={newPass} 
                                onChange={(e) => setNewPass(e.target.value)}
                                placeholder="Min 6 characters"
                                icon={<Lock size={16} />}
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-4 top-[38px] text-gray-500 hover:text-white transition-colors"
                            >
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button 
                            onClick={handleForcePasswordChange} 
                            disabled={isUpdatingPass || !newPass || newPass.length < 6} 
                            className="w-full py-5 text-[11px] font-black uppercase tracking-[0.4em] bg-orange-600 hover:bg-orange-500 flex items-center justify-center gap-3"
                        >
                            {isUpdatingPass ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                            {isUpdatingPass ? 'SYNCHRONIZING...' : 'Apply Security Update'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default VolunteerDashboard;