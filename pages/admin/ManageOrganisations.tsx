import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Organisation, Role } from '../../types';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import { 
  Building2, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  Activity,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Phone,
  User,
  UserPlus,
  Map,
  Edit,
  Camera,
  XCircle,
  PartyPopper,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

// Supabase Credentials for independent auth client
const supabaseUrl = "https://baetdjjzfqupdzsoecph.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

// Extended type for internal state
type OrganisationWithEmail = Organisation & { email?: string, authUserId?: string };

const ManageOrganisations: React.FC = () => {
  const [organisations, setOrgs] = useState<OrganisationWithEmail[]>([]);
  const [newOrg, setNewOrg] = useState({ 
    name: '', 
    mobile: '', 
    secretaryName: '', 
    email: '', 
    password: '',
    profilePhoto: null as File | null
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  const [editingOrg, setEditingOrg] = useState<(Organisation & { email?: string }) | null>(null);
  const [selectedOrgForReset, setSelectedOrgForReset] = useState<OrganisationWithEmail | null>(null);
  
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const { addNotification } = useNotification();

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orgs, error: orgError } = await supabase.from('organisations').select('*').order('name');
      if (orgError) throw orgError;

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, organisation_id')
        .eq('role', 'Organisation');
      
      if (profileError) throw profileError;

      const merged = (orgs || []).map(org => {
        const profile = profiles?.find(p => p.organisation_id === org.id);
        return {
          ...org,
          authUserId: profile?.id,
          email: profile?.email || 'No access email linked'
        };
      });

      setOrgs(merged);
    } catch (err: any) {
      addNotification(`Registry sync error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOrg(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewOrg(prev => ({ ...prev, profilePhoto: file }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setNewOrg(prev => ({ ...prev, profilePhoto: null }));
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadProfilePhoto = async (file: File) => {
    const fileName = `org_profile_${uuidv4()}.jpg`;
    const { data, error } = await supabase.storage.from('member-images').upload(fileName, file);
    if (error) throw new Error(`Storage Error: ${error.message}`);
    return supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
  };

  const handleAddOrganisation = async () => {
    const email = newOrg.email.trim().toLowerCase();
    const password = newOrg.password;
    const name = newOrg.name.trim();
    const mobile = newOrg.mobile.trim();
    const secName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secName) {
        addNotification("Required: Please complete all identity fields before deployment.", 'error');
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
        if (newOrg.profilePhoto) {
          try {
            photoUrl = await uploadProfilePhoto(newOrg.profilePhoto);
          } catch (uploadErr: any) {
            throw new Error(`Media Uplink Failed: ${uploadErr.message}`);
          }
        }

        // 3. Organisation Record Creation
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ 
            name, 
            mobile, 
            secretary_name: secName, 
            status: 'Active',
            profile_photo_url: photoUrl || undefined
          })
          .select().single();

        if (orgError) throw new Error(`Database Error: ${orgError.message}`);

        // 4. Authentication Node Deployment - Use independent client to prevent session takeover
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        const { data: authData, error: authError } = await authClient.auth.signUp({
          email, password,
          options: {
            data: { name: secName, role: 'Organisation', organisation_id: orgData.id, mobile }
          }
        });

        if (authError) {
          // Rollback Organization creation if auth fails
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw new Error(`Authentication Provisioning Failed: ${authError.message}`);
        }

        // 5. Profile Synchronization (Backup Upsert)
        if (authData?.user?.id) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: secName,
                email,
                role: 'Organisation',
                organisation_id: orgData.id,
                mobile,
                status: 'Active'
            });
            if (profileError) {
                console.error("Profile Sync Warning:", profileError);
            }
        }

        // 6. External Registry Sync (Sheets)
        await syncToSheets(SheetType.ORGANISATIONS, {
          name, secretary_name: secName, mobile, email, status: 'Active',
          registration_date: new Date().toLocaleDateString()
        });

        // 7. Success Lifecycle
        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '', profilePhoto: null });
        setPreviewUrl(null);
        fetchOrganisations();
        addNotification(name, 'registry-success', photoUrl || undefined);
        setShowSuccessSplash(true);
        setTimeout(() => setShowSuccessSplash(false), 3000);
    } catch (err: any) {
        addNotification(`Registration Failed: ${err.message || 'System handshake failure.'}`, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditClick = async (org: Organisation) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('email').eq('organisation_id', org.id).eq('role', 'Organisation').maybeSingle();
      setEditingOrg({ ...org, email: profile?.email || '' });
      setIsModalOpen(true);
    } catch (err) {
      setEditingOrg({ ...org, email: '' });
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetClick = (org: OrganisationWithEmail) => {
    setSelectedOrgForReset(org);
    setResetPassword('');
    setIsResetModalOpen(true);
  };

  const handleExecuteReset = async () => {
    if (!selectedOrgForReset?.authUserId || resetPassword.length < 6) {
      addNotification("Validation Error: Access keys must be at least 6 characters.", 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_reset_password', {
        target_user_id: selectedOrgForReset.authUserId,
        new_password: resetPassword
      });

      if (rpcError) throw rpcError;

      addNotification(`Network access key synchronized for ${selectedOrgForReset.name}.`, 'success');
      setIsResetModalOpen(false);
    } catch (err: any) {
      addNotification(`Security Override Failed: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrganisation = async () => {
    if (!editingOrg) return;
    setIsSubmitting(true);
    try {
      const { error: orgUpdateError } = await supabase.from('organisations').update({
          name: editingOrg.name, mobile: editingOrg.mobile, secretary_name: editingOrg.secretary_name, status: editingOrg.status
      }).eq('id', editingOrg.id);
      
      if (orgUpdateError) throw orgUpdateError;

      const { error: profileUpdateError } = await supabase.from('profiles').update({
          name: editingOrg.secretary_name, mobile: editingOrg.mobile, email: editingOrg.email, status: editingOrg.status
      }).eq('organisation_id', editingOrg.id).eq('role', 'Organisation');
      
      if (profileUpdateError) throw profileUpdateError;

      addNotification(`Organization parameters updated.`, 'success');
      fetchOrganisations();
      setIsModalOpen(false);
    } catch (err: any) {
        addNotification(`Update Failed: ${err.message}`, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Organization Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorize New Organization" className="border-orange-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Map size={100} />
            </div>
            
            <div className="space-y-8 relative z-10">
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="h-28 w-28 rounded-full border-2 border-dashed border-gray-800 bg-black/40 flex items-center justify-center overflow-hidden group-hover:border-orange-500/50 transition-all duration-300">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-600 group-hover:text-orange-500/70 transition-colors">
                        <Camera size={28} strokeWidth={1.5} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Add Logo</span>
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
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700">Optional Identity Logo</p>
              </div>

              <div className="space-y-6">
                <Input label="Organization Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="Ex: SSK Bangalore North" icon={<Building2 size={16} />} />
                <Input label="Primary Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" icon={<Phone size={16} />} />
                <Input label="Administrative Lead" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Lead Name" icon={<User size={16} />} />
                <Input label="Lead Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="lead@org.com" icon={<Mail size={16} />} />
                <div className="relative">
                  <Input label="Predefined Access Key" name="password" type={showPassword ? "text" : "password"} value={newOrg.password} onChange={handleInputChange} placeholder="Min 6 characters" icon={<Lock size={16} />} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-gray-500 hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] shadow-xl">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                  {isSubmitting ? 'Establishing Node...' : 'Deploy Organization'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Operational Registry">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4 text-white">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                        <Activity size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">LEADING CONTRIBUTORS Sync</span>
                </div>
                <button onClick={fetchOrganisations} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/40 text-white hover:text-white transition-all shadow-lg">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-800">
                        <tr>
                            <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black">Organization Identity</th>
                            <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-right">Verification</th>
                            <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan={3} className="p-20 text-center animate-pulse uppercase tracking-[0.5em] text-[10px] text-white font-black">Syncing Network Ledger...</td></tr>
                        ) : organisations.map(org => (
                        <tr key={org.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all">
                            <td className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 group-hover:border-orange-500/50 transition-all shadow-lg bg-black/40">
                                      {org.profile_photo_url ? (
                                        <img src={org.profile_photo_url} alt={org.name} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center text-orange-500/50">
                                          <Building2 size={24} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{org.name}</span>
                                            {org.status === 'Active' && <CheckCircle2 size={14} className="text-green-500/50" />}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-[11px] text-white uppercase font-mono tracking-tighter">{org.secretary_name} • {org.mobile}</span>
                                          <span className="text-[10px] text-orange-500/80 font-mono lowercase tracking-tight mt-0.5">{org.email}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-6 text-right">
                                <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                    {org.status}
                                </span>
                            </td>
                            <td className="p-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleResetClick(org)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:border-orange-500/50 text-gray-500 hover:text-orange-500 transition-all" title="Security Override">
                                        <KeyRound size={18} />
                                    </button>
                                    <button onClick={() => handleEditClick(org)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:border-orange-500/50 text-white hover:text-white transition-all" title="Edit Parameters">
                                        <Edit size={18} />
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

      {showSuccessSplash && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"></div>
            <div className="relative animate-splash bg-[#0a0a0a] border border-orange-500/30 rounded-[3rem] p-12 flex flex-col items-center gap-6 shadow-[0_0_100px_rgba(234,88,12,0.2)]">
                <div className="absolute inset-0 animate-celebrate bg-orange-500/20 rounded-[3rem]"></div>
                <div className="h-24 w-24 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner mb-2">
                    <PartyPopper size={48} strokeWidth={1.5} />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-cinzel text-white uppercase tracking-widest">Registry Updated</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-orange-500">Node Deployment Complete</p>
                </div>
            </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Organization Parameters">
          {editingOrg && (
            <div className="space-y-8">
                <div className="flex flex-col items-center justify-center pb-2">
                    <div className="h-24 w-24 rounded-2xl overflow-hidden border border-orange-500/30 bg-black shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                        {editingOrg.profile_photo_url ? (
                          <img src={editingOrg.profile_photo_url} alt={editingOrg.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-orange-500/30 bg-orange-500/5">
                            <Building2 size={32} />
                          </div>
                        )}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mt-3">Current Identity Profile</p>
                </div>

                <div className="space-y-6">
                    <Input label="Organization Name" name="name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} icon={<Building2 size={16} />} />
                    <Input label="Administrative Lead" name="secretary_name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} icon={<User size={16} />} />
                    <Input label="Primary Mobile" name="mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} icon={<Phone size={16} />} />
                    <Select label="Operational Status" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                        <option value="Active">Active</option>
                        <option value="Deactivated">Deactivated</option>
                    </Select>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="text-[10px] font-black tracking-widest">Abort</Button>
                    <Button onClick={handleUpdateOrganisation} disabled={isSubmitting} className="text-[10px] font-black tracking-widest">{isSubmitting ? "Syncing..." : "Apply Changes"}</Button>
                </div>
            </div>
          )}
      </Modal>

      {/* SECURITY OVERRIDE (PASSWORD RESET) MODAL */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Security Override: Access Key Reset">
          {selectedOrgForReset && (
            <div className="space-y-8">
                <div className="p-6 bg-orange-600/10 border border-orange-500/20 rounded-2xl flex items-start gap-4">
                    <ShieldAlert className="text-orange-500 shrink-0 mt-1" size={24} />
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-widest text-orange-500">Mandatory Synchronization</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                            Resetting access key for <span className="text-white">"{selectedOrgForReset.email}"</span>. 
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
                    <Button variant="secondary" onClick={() => setIsResetModalOpen(false)} className="text-[10px] font-black tracking-widest">Abort</Button>
                    <Button 
                        onClick={handleExecuteReset} 
                        disabled={isSubmitting || resetPassword.length < 6} 
                        className="bg-orange-600 hover:bg-orange-500 text-[10px] font-black tracking-widest uppercase flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
                        {isSubmitting ? "Synchronizing..." : "Force Commit Key"}
                    </Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;