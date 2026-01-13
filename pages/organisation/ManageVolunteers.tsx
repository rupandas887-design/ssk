import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Volunteer, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import { 
  Power, 
  UserPlus, 
  UserCheck, 
  Copy, 
  ShieldCheck, 
  Loader2, 
  UserCircle, 
  Zap, 
  RefreshCw, 
  Activity,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert,
  Fingerprint,
  Mail,
  Phone,
  Building2,
  Lock,
  ShieldQuestion,
  Camera,
  XCircle
} from 'lucide-react';

type VolunteerWithEnrollments = Volunteer & { enrollments: number };

const supabaseUrl = "https://baetdjjzfqupdzsoecph.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

const ManageVolunteers: React.FC = () => {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerWithEnrollments[]>([]);
  const [newVol, setNewVol] = useState({ name: '', mobile: '', email: '', password: '', profilePhoto: null as File | null });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedVol, setSelectedVol] = useState<VolunteerWithEnrollments | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const { addNotification } = useNotification();

  const fetchVolunteers = useCallback(async () => {
    if (!user?.organisationId) return;
    setLoading(true);

    try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, members(id)')
          .eq('role', 'Volunteer')
          .eq('organisation_id', user.organisationId);

        if (profileError) throw profileError;
        
        setVolunteers(profileData.map((v: any) => ({
            id: v.id,
            name: v.name,
            email: v.email,
            mobile: v.mobile,
            role: Role.Volunteer,
            organisationId: v.organisation_id,
            organisationName: user.organisationName,
            status: v.status || 'Active',
            enrollments: v.members?.length || 0,
            profile_photo_url: v.profile_photo_url
        })) || []);
    } catch (e: any) {
        addNotification(`Uplink Error: ${e.message}`, 'error');
    } finally {
        setLoading(false);
    }
  }, [user, addNotification]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const filteredVolunteers = useMemo(() => {
    if (!searchTerm.trim()) return volunteers;
    const term = searchTerm.toLowerCase().trim();
    return volunteers.filter(v => 
      v.name.toLowerCase().includes(term) || 
      v.mobile?.includes(term)
    );
  }, [volunteers, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVol(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewVol(prev => ({ ...prev, profilePhoto: file }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setNewVol(prev => ({ ...prev, profilePhoto: null }));
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadProfilePhoto = async (file: File) => {
    const fileName = `agent_profile_${uuidv4()}.jpg`;
    const { data, error } = await supabase.storage.from('member-images').upload(fileName, file);
    if (error) throw new Error(`Storage Error: ${error.message}`);
    return supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
  };

  const handleExport = () => {
    const headers = ['Volunteer Name', 'Email', 'Mobile', 'Enrollments', 'Status'];
    const rows = filteredVolunteers.map(v => [v.name, v.email, v.mobile, v.enrollments, v.status]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Volunteer_Registry_${user?.organisationName || 'Organization'}.csv`;
    link.click();
  };

  const copyVolunteerCreds = (vol: VolunteerWithEnrollments) => {
    const creds = `Login Email: ${vol.email}\nStatus: ${vol.status}`;
    navigator.clipboard.writeText(creds).then(() => {
      addNotification('Volunteer credentials copied to clipboard.', 'info');
    });
  };

  const handleToggleStatus = async (vol: VolunteerWithEnrollments) => {
    const newStatus = vol.status === 'Active' ? 'Deactivated' : 'Active';
    const confirmMsg = newStatus === 'Deactivated' 
        ? `Are you sure you wish to Deactivate Volunteer "${vol.name}"? This will suspend their field access.`
        : `Activate Volunteer "${vol.name}"?`;
        
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', vol.id);

      if (error) throw error;
      addNotification(`Volunteer status updated to ${newStatus}.`, 'success');
      fetchVolunteers();
    } catch (e: any) {
      addNotification(`Status update failed: ${e.message}`, 'error');
    }
  };

  const handleViewProfile = (vol: VolunteerWithEnrollments) => {
    setSelectedVol(vol);
    setIsViewModalOpen(true);
  };

  const handleResetPasswordClick = (vol: VolunteerWithEnrollments) => {
    setSelectedVol(vol);
    setResetPassword('');
    setShowResetPassword(false);
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedVol || resetPassword.length < 6) {
        addNotification("Valid 6-character access key required.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    try {
        const { error: rpcError } = await supabase.rpc('admin_reset_password', {
            target_user_id: selectedVol.id,
            new_password: resetPassword
        });

        if (rpcError) throw rpcError;

        addNotification(`Network access key synchronized for ${selectedVol.name}.`, 'success');
        setIsResetModalOpen(false);
    } catch (err: any) {
        addNotification(`Override failed: ${err.message}`, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAddVolunteer = async () => {
    const email = newVol.email.trim().toLowerCase();
    const password = newVol.password;
    const name = newVol.name.trim();
    const mobile = newVol.mobile.trim();
    
    if (!user?.organisationId) return;
    if (!email || !password || !name || !mobile) {
        addNotification("Incomplete identity data. Please fill all fields.", 'error');
        return;
    }

    setIsSubmitting(true);
    try {
        // 1. CROSS-TABLE UNIQUENESS CHECKS (Mobile & Email)
        const [orgCheck, profileCheck] = await Promise.all([
          supabase.from('organisations').select('id').eq('mobile', mobile).maybeSingle(),
          supabase.from('profiles').select('id').or(`mobile.eq.${mobile},email.eq.${email}`).maybeSingle()
        ]);

        if (orgCheck.data || profileCheck.data) {
          addNotification("Duplicate email or primary phone number detected. Registration is not allowed for volunteers or organizations with existing details.", 'error');
          setIsSubmitting(false);
          return;
        }

        // 2. Profile Photo Process
        let photoUrl = '';
        if (newVol.profilePhoto) {
          try {
            photoUrl = await uploadProfilePhoto(newVol.profilePhoto);
          } catch (uploadErr: any) {
            throw new Error(`Media Uplink Failed: ${uploadErr.message}`);
          }
        }

        // 3. Authentication Node Deployment
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        const { data: authData, error: authError } = await authClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              mobile,
              role: 'Volunteer', 
              organisation_id: user.organisationId
            }
          }
        });

        if (authError) throw new Error(`Auth Provisioning Failed: ${authError.message}`);
        
        // 4. Profile Synchronization
        if (authData?.user?.id) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name,
                email,
                role: 'Volunteer',
                organisation_id: user.organisationId,
                mobile,
                status: 'Active',
                profile_photo_url: photoUrl || undefined
            });
            
            if (profileError) throw new Error(`Database Sync Failed: ${profileError.message}`);

            // 5. External Registry Sync
            await syncToSheets(SheetType.VOLUNTEERS, {
              name, email, mobile,
              organisation_name: user.organisationName,
              status: 'Active',
              authorized_date: new Date().toLocaleDateString()
            });

            addNotification('Volunteer authorized successfully.', 'success');
            setNewVol({ name: '', mobile: '', email: '', password: '', profilePhoto: null });
            setPreviewUrl(null);
            fetchVolunteers(); 
        }
    } catch (err: any) {
        addNotification(`Authorization Failed: ${err.message}`, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Volunteers management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorize New Volunteer" className="relative overflow-hidden border-blue-900/30 bg-[#020202]/80">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Zap size={100} />
            </div>
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-4">
                 <ShieldCheck className="text-blue-500" size={24} />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 leading-tight">Identity Tier</span>
                    <span className="text-xs font-bold text-white uppercase">Volunteer</span>
                 </div>
              </div>

              {/* Profile Image Section */}
              <div className="flex flex-col items-center gap-4 pb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="h-28 w-28 rounded-full border-2 border-dashed border-gray-800 bg-black/40 flex items-center justify-center overflow-hidden group-hover:border-blue-500/50 transition-all duration-300">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-600 group-hover:text-blue-500/70 transition-colors">
                        <Camera size={28} strokeWidth={1.5} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Add Photo</span>
                      </div>
                    )}
                  </div>
                  {previewUrl && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePhoto();
                      }}
                      className="absolute -top-1 -right-1 p-1.5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700">Profile Image (Optional)</p>
              </div>
              
              <Input label="FULL NAME" name="name" value={newVol.name} onChange={handleInputChange} placeholder="Ex: Rahul S" />
              <Input label="MOBILE IDENTITY" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" />
              <Input label="ACCESS EMAIL" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="volunteer@org.com" />
              <Input label="SECURITY KEY" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="Min 6 characters" />
              
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.4em]"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {isSubmitting ? 'AUTHORIZING...' : 'Authorize Volunteer'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="bg-[#050505] border-white/5 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-500/10 rounded-3xl text-orange-500 border border-orange-500/10">
                        <UserCircle size={28} />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-3xl text-white tracking-tight">Active Volunteers Registry</h3>
                      <div className="flex items-center gap-2 mt-1">
                          <Activity size={12} className="text-green-500 animate-pulse" />
                          <span className="text-[9px] text-white font-black uppercase tracking-widest">Network Node Active</span>
                      </div>
                    </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                    <button onClick={handleExport} className="flex-1 sm:flex-none p-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all shadow-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <FileSpreadsheet size={20} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button onClick={fetchVolunteers} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/40 text-white hover:text-white transition-all shadow-xl">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="mb-8 p-6 bg-black/40 border border-white/5 rounded-[2rem] shadow-inner relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4 text-white">
                    <Filter size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Query Parameters</span>
                </div>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/50 group-focus-within:text-orange-500 transition-colors">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search Identity by Name or Mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/60 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white focus:outline-none focus:ring-1 focus:ring-orange-500/40 focus:border-orange-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black">Volunteer Node</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-center">Enrollments</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="p-20 text-center text-[10px] font-black uppercase tracking-[0.5em] text-white animate-pulse">Syncing...</td>
                    </tr>
                  ) : filteredVolunteers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-20 text-center text-[10px] font-black uppercase tracking-[0.5em] text-white italic">No matching personnel records detected.</td>
                    </tr>
                  ) : filteredVolunteers.map(vol => (
                    <tr key={vol.id} className="group border-b border-gray-900/50 hover:bg-white/[0.015] transition-all">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-all shadow-lg bg-black/40">
                                {vol.profile_photo_url ? (
                                    <img 
                                        src={vol.profile_photo_url} 
                                        alt={vol.name} 
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-blue-500/50 bg-blue-500/5">
                                        <UserCircle size={24} />
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-white text-lg group-hover:text-blue-500 transition-colors">{vol.name}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-white font-mono tracking-tight">{vol.email}</span>
                                    <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                                    <span className="text-[10px] text-white font-mono tracking-tight">{vol.mobile}</span>
                                </div>
                            </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem]">
                            <UserCheck size={18} className="text-orange-500" />
                            <span className="font-black text-xl text-white tracking-tighter">{vol.enrollments}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 transition-all duration-500">
                            <button onClick={() => handleViewProfile(vol)} className="p-3 bg-white/5 border border-white/10 text-white hover:text-blue-400 rounded-xl transition-all" title="View Profile">
                                <Eye size={16} />
                            </button>
                            <button onClick={() => handleResetPasswordClick(vol)} className="p-3 bg-white/5 border border-white/10 text-white hover:text-orange-400 rounded-xl transition-all" title="Security Override">
                                <KeyRound size={16} />
                            </button>
                            <button onClick={() => copyVolunteerCreds(vol)} className="p-3 bg-white/5 border border-white/10 text-white hover:text-white rounded-xl transition-all" title="Copy Details">
                                <Copy size={16} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                className={`p-3 rounded-xl border transition-all ${vol.status === 'Active' ? 'text-red-400 border-red-500/10 bg-red-500/5' : 'text-green-400 border-green-500/10 bg-green-500/5'}`}
                                title={vol.status === 'Active' ? 'Deactivate Node' : 'Activate Node'}
                            >
                                <Power size={16} />
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
      </div>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Volunteer Intelligence Profile">
          {selectedVol && (
            <div className="space-y-8 p-2">
                <div className="flex items-center gap-6 p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2.5rem] relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Fingerprint size={100} />
                    </div>
                    <div className="h-20 w-20 rounded-[2rem] bg-black/60 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-2xl relative z-10 overflow-hidden">
                        {selectedVol.profile_photo_url ? (
                            <img src={selectedVol.profile_photo_url} className="h-full w-full object-cover" />
                        ) : (
                            <UserCircle size={40} />
                        )}
                    </div>
                    <div className="relative z-10 flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/70">Verified Volunteer</p>
                        </div>
                        <h4 className="text-3xl font-cinzel text-white leading-tight truncate">{selectedVol.name}</h4>
                        <span className={`mt-2 inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${selectedVol.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {selectedVol.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-white">
                            <Mail size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Access Email</span>
                        </div>
                        <p className="text-sm font-bold text-white font-mono truncate">{selectedVol.email}</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-white">
                            <Phone size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Mobile Identity</span>
                        </div>
                        <p className="text-sm font-bold text-white font-mono">{selectedVol.mobile}</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-white">
                            <Building2 size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Parent Node</span>
                        </div>
                        <p className="text-sm font-bold text-white truncate">{selectedVol.organisationName || 'Independent'}</p>
                    </div>
                    <div className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-orange-500/60">
                            <Activity size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Registry Syncs</span>
                        </div>
                        <p className="text-xl font-black text-white">{selectedVol.enrollments} Enrollments</p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={() => setIsViewModalOpen(false)} className="px-10 py-4 text-[10px] font-black uppercase tracking-widest">Close Intelligence File</Button>
                </div>
            </div>
          )}
      </Modal>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Security Override: Access Key Reset">
          {selectedVol && (
            <div className="space-y-8 p-2">
                <div className="p-6 bg-orange-600/10 border border-orange-500/20 rounded-2xl flex items-start gap-4">
                    <ShieldAlert className="text-orange-500 shrink-0 mt-1" size={24} />
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-orange-500">Network Sync Override</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                            Resetting access key for Volunteer <span className="text-white">"{selectedVol.name}"</span>. 
                            The update will be pushed directly to the authentication registry. No OTP required.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="relative">
                        <Input 
                            label="New Network Access Key" 
                            name="resetPassword" 
                            type={showResetPassword ? "text" : "password"} 
                            value={resetPassword} 
                            onChange={(e) => setResetPassword(e.target.value)} 
                            placeholder="Min 6 characters" 
                            icon={<Lock size={16} />} 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowResetPassword(!showResetPassword)} 
                            className="absolute right-3 top-[34px] text-gray-500 hover:text-white transition-colors"
                        >
                            {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                    <Button variant="secondary" onClick={() => setIsResetModalOpen(false)} className="px-8 py-4 text-[10px] font-black tracking-widest">Abort</Button>
                    <Button 
                        onClick={handleResetPassword} 
                        disabled={isSubmitting || resetPassword.length < 6} 
                        className="px-12 py-4 text-[10px] font-black uppercase tracking-widest bg-orange-600 hover:bg-orange-500 flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
                        {isSubmitting ? 'SYNCHRONIZING...' : 'Force Commit Key'}
                    </Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageVolunteers;