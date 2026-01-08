
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { Member, MemberStatus } from '../../types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { User, RefreshCw, Filter, MapPin, Phone, Building2, UserCircle, Activity, UserPlus, Lock, KeyRound, ShieldAlert, Eye, EyeOff, Loader2 } from 'lucide-react';

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
            } else {
                addNotification(error || "Update failed.", "error");
            }
        } finally {
            setIsUpdatingPass(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [user, addNotification]);
    
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
            if (filters.phone && !member.mobile.includes(filters.phone)) return false;
            if (filters.area && !member.pincode.includes(filters.area)) return false;
            return true;
        });
    }, [mySubmissions, filters]);

    const isLocked = user?.passwordResetPending;

    return (
        <DashboardLayout title="Agent Terminal">
            <div className={`space-y-4 md:space-y-6 pb-6 transition-all duration-700 ${isLocked ? 'blur-xl grayscale pointer-events-none opacity-40' : ''}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 md:p-8 bg-blue-900/10 border border-blue-900/20 rounded-2xl md:rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:rotate-6 transition-transform duration-700 pointer-events-none">
                        <User size={100} className="md:size-[120px]" />
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center text-center md:text-left relative z-10">
                         <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-400/10 shadow-lg shrink-0">
                            <User size={28} className="md:size-8" strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-blue-400/50 mb-1">Authenticated Field Agent</p>
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
                      <table className="w-full text-left min-w-[500px]">
                        <thead className="border-b border-white/5">
                          <tr className="text-gray-600 text-[8px] sm:text-[9px] uppercase tracking-widest font-black">
                            <th className="pb-4 pl-2">Member Node</th>
                            <th className="pb-4 text-blue-500">Agent Attribution</th>
                            <th className="pb-4 text-center pr-2">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {loading ? (
                              <tr><td colSpan={3} className="text-center p-20 animate-pulse text-[10px] uppercase tracking-[0.3em] text-gray-700 font-black">Syncing...</td></tr>
                          ) : (
                            <>
                            {filteredSubmissions.length === 0 ? (
                                <tr><td colSpan={3} className="text-center p-12 text-gray-700 text-[9px] font-black uppercase tracking-widest">No matching records.</td></tr>
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
                                <td className="py-4 text-center pr-2">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                        member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/10' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/10'
                                    }`}>
                                      {member.status}
                                    </span>
                                    <span className="text-[8px] font-mono text-gray-700 uppercase">{member.submission_date.split('T')[0]}</span>
                                  </div>
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

            {/* MANDATORY SECURITY UPDATE MODAL */}
            <Modal isOpen={!!isLocked} onClose={() => {}} title="Critical Security Update Required">
                <div className="space-y-8 p-4">
                    <div className="p-6 bg-red-600/10 border border-red-500/20 rounded-3xl flex items-center gap-4">
                        <ShieldAlert className="text-red-500 shrink-0" size={32} />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest text-red-500">Node Compromised / Flagged</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                                Your organization has initiated a mandatory security key update for your agent profile. Access to the Field Terminal is suspended until a new key is established.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="relative">
                            <Input 
                                label="NEW SECURITY KEY" 
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
                            disabled={isUpdatingPass || !newPass} 
                            className="w-full py-5 text-[11px] font-black uppercase tracking-[0.4em] bg-red-600 hover:bg-red-500 flex items-center justify-center gap-3"
                        >
                            {isUpdatingPass ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                            {isUpdatingPass ? 'SYNCHRONIZING...' : 'Establish New Security Key'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    );
};

export default VolunteerDashboard;
