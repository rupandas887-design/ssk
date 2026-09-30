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
import { supabase, supabaseUrl, supabaseAnonKey } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import { 
  UserPlus, 
  UserCheck, 
  Copy, 
  ShieldCheck, 
  Loader2, 
  UserCircle, 
  Zap, 
  RefreshCw, 
  Search, 
  KeyRound, 
  ShieldAlert, 
  Mail, 
  Phone, 
  Lock, 
  Camera, 
  Edit3, 
  Trash2,
  Users
} from 'lucide-react';

type VolunteerWithEnrollments = Volunteer & { enrollments: number };

const ManageVolunteers: React.FC = () => {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerWithEnrollments[]>([]);
  const [newVol, setNewVol] = useState({ name: '', mobile: '', email: '', password: '', profilePhoto: null as File | null });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVol, setSelectedVol] = useState<VolunteerWithEnrollments | null>(null);
  const [editingVol, setEditingVol] = useState<VolunteerWithEnrollments | null>(null);
  
  // Edit Specific States
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [editProfilePhoto, setEditProfilePhoto] = useState<File | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  
  const { addNotification } = useNotification();

  const fetchVolunteers = useCallback(async () => {
    if (!user?.organisationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*, members(id)')
          .eq('role', 'Volunteer')
          .eq('organisation_id', user.organisationId);

        if (error) {
          console.error("Fetch volunteers error:", error);
        }

        if (profileData) {
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
          })));
        }
    } catch (err: any) {
        console.error("ManageVolunteers exception:", err);
    } finally { 
      setLoading(false); 
    }
  }, [user]);

  useEffect(() => { 
    fetchVolunteers();

    const channel = supabase
      .channel('manage-volunteers-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchVolunteers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        fetchVolunteers();
      })
      .subscribe();

    const handleFocus = () => {
      fetchVolunteers();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [fetchVolunteers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVol(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleAddVolunteer = async () => {
    const { name, mobile, email, password } = newVol;
    setFormError(null);

    if (!name || !mobile || !email || !password) {
        setFormError("Please fill in all volunteer details.");
        return;
    }

    if (!/^\d{10}$/.test(mobile.trim())) {
        setFormError("Mobile number must be exactly 10 digits.");
        return;
    }

    if (!user?.organisationId) {
        setFormError("Missing organization credentials. Re-login required.");
        return;
    }

    setIsSubmitting(true);
    try {
        let photoUrl: string | undefined = undefined;

        if (newVol.profilePhoto) {
            const fileName = `vol_profile_${uuidv4()}.jpg`;
            const { data, error: storageError } = await supabase.storage.from('member-images').upload(fileName, newVol.profilePhoto);
            if (storageError) throw storageError;
            if (data) {
                photoUrl = supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
            }
        }

        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    name: name.trim(),
                    role: Role.Volunteer,
                    organisation_id: user.organisationId,
                    mobile: mobile.trim(),
                    status: 'Active',
                    profile_photo_url: photoUrl
                }
            }
        });

        if (authError) throw authError;

        if (authData.user) {
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                email: email.trim(),
                name: name.trim(),
                role: Role.Volunteer,
                organisation_id: user.organisationId,
                mobile: mobile.trim(),
                status: 'Active',
                profile_photo_url: photoUrl
            });

            syncToSheets(SheetType.VOLUNTEERS, {
                volunteer_id: authData.user.id,
                volunteer_name: name.trim(),
                email: email.trim(),
                mobile: mobile.trim(),
                organisation_name: user.organisationName,
                status: 'Active'
            }).catch(err => console.error("Sheets Sync Error:", err));

            addNotification("Volunteer deployed successfully.", "success");
            setNewVol({ name: '', mobile: '', email: '', password: '', profilePhoto: null });
            setPreviewUrl(null);
            fetchVolunteers();
        }
    } catch (err: any) {
        setFormError(err.message || "Failed to create volunteer.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditClick = (vol: VolunteerWithEnrollments) => {
    setEditingVol({ ...vol });
    setEditPreviewUrl(vol.profile_photo_url || null);
    setEditProfilePhoto(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateVolunteer = async () => {
    if (!editingVol) return;
    setIsSubmitting(true);
    try {
        let finalPhotoUrl = editingVol.profile_photo_url;

        if (editProfilePhoto) {
            const fileName = `vol_profile_update_${uuidv4()}.jpg`;
            const { data, error: storageError } = await supabase.storage.from('member-images').upload(fileName, editProfilePhoto);
            if (storageError) throw storageError;
            if (data) {
                finalPhotoUrl = supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                name: editingVol.name.trim(),
                mobile: editingVol.mobile?.trim(),
                email: editingVol.email.trim(),
                profile_photo_url: finalPhotoUrl
            })
            .eq('id', editingVol.id);

        if (error) throw error;

        addNotification("Volunteer updated successfully.", "success");
        setIsEditModalOpen(false);
        fetchVolunteers();
    } catch (err: any) {
        addNotification(err.message, "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRemoveEditPhoto = () => {
    if (editingVol) {
        setEditingVol({ ...editingVol, profile_photo_url: undefined });
        setEditPreviewUrl(null);
        setEditProfilePhoto(null);
    }
  };

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.mobile?.includes(searchTerm)
    );
  }, [volunteers, searchTerm]);

  return (
    <DashboardLayout title="Volunteers Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        
        {/* ADD VOLUNTEER CARD */}
        <div className="lg:col-span-1 space-y-6">
          <Card 
            title="Deploy Volunteer" 
            subtitle="Register field agent access for this organization node"
            className="border-slate-200/80 shadow-card"
          >
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-2 pb-2">
                <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group-hover:border-saffron-500 group-hover:bg-saffron-50/30 transition-all shadow-inner">
                    {previewUrl ? (
                        <img src={previewUrl} className="h-full w-full object-cover" alt="Preview" />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-saffron-600 transition-colors">
                            <Camera size={24} />
                            <span className="text-[10px] font-bold">Photo</span>
                        </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files?.[0]) {
                          setNewVol(prev => ({ ...prev, profilePhoto: e.target.files![0] }));
                          setPreviewUrl(URL.createObjectURL(e.target.files![0]));
                      }
                  }} />
                </div>
                <p className="text-[11px] font-medium text-slate-400">Optional Volunteer Photo</p>
              </div>

              <Input label="Full Name *" name="name" value={newVol.name} onChange={handleInputChange} placeholder="Agent Name" icon={<UserCircle size={16} />} />
              <Input label="Mobile Number *" name="mobile" value={newVol.mobile} onChange={handleInputChange} placeholder="10-digit mobile" maxLength={10} icon={<Phone size={16} />} />
              <Input label="Email Login *" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="agent@org.com" icon={<Mail size={16} />} />
              <Input label="Security Password *" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="Min 6 characters" icon={<Lock size={16} />} />

              {formError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                      <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-rose-700 font-semibold leading-relaxed">{formError}</p>
                  </div>
              )}

              <Button onClick={handleAddVolunteer} disabled={isSubmitting} className="w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                <span>{isSubmitting ? 'Deploying...' : 'Deploy Field Agent'}</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* PERSONNEL REGISTRY LIST */}
        <div className="lg:col-span-2 space-y-6">
          <Card 
            title="Personnel Ledger" 
            subtitle="Active field volunteers affiliated with your organization"
            className="border-slate-200/80 shadow-card p-0 overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                <Input 
                  placeholder="Search volunteers by name or mobile..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  icon={<Search size={16} />} 
                />
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm min-w-[550px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/80">
                  <tr className="text-slate-600 text-xs font-bold tracking-wider">
                    <th className="px-6 py-4">Field Volunteer</th>
                    <th className="px-6 py-4 text-center">Enrollments</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center text-xs font-semibold text-slate-500">
                        <Loader2 className="animate-spin inline-block mr-2" size={18} />
                        Synchronizing personnel list...
                      </td>
                    </tr>
                  ) : filteredVolunteers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center text-xs font-medium text-slate-500">
                        No field volunteers found matching your query.
                      </td>
                    </tr>
                  ) : filteredVolunteers.map(vol => (
                    <tr key={vol.id} className="hover:bg-saffron-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                            <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 shadow-sm">
                                {vol.profile_photo_url ? (
                                  <img src={vol.profile_photo_url} className="h-full w-full object-cover" alt={vol.name} />
                                ) : (
                                  <UserCircle size={22} className="text-saffron-600" />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 text-sm truncate">{vol.name}</span>
                                <span className="text-xs text-slate-500 font-mono">{vol.mobile || vol.email}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-saffron-50 text-saffron-700 border border-saffron-100">
                          {vol.enrollments} Verified
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleEditClick(vol)} 
                              className="p-2 text-slate-600 hover:text-saffron-600 hover:bg-saffron-50 rounded-lg transition-colors border border-slate-200 hover:border-saffron-200"
                              title="Edit Agent"
                            >
                                <Edit3 size={15} />
                            </button>
                            <button 
                              onClick={() => { setSelectedVol(vol); setIsResetModalOpen(true); }} 
                              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200 hover:border-amber-200"
                              title="Reset Password"
                            >
                                <KeyRound size={15} />
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

      {/* EDIT VOLUNTEER MODAL */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Volunteer Details"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button onClick={handleUpdateVolunteer} disabled={isSubmitting} className="text-xs font-bold gap-2">
              {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
              <span>Save Changes</span>
            </Button>
          </div>
        }
      >
          {editingVol && (
            <div className="space-y-5">
                <div className="flex flex-col items-center gap-2 pb-2">
                    <div className="relative">
                        <div onClick={() => editFileInputRef.current?.click()} className="relative group cursor-pointer">
                            <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group-hover:border-saffron-500 transition-all shadow-inner">
                                {editPreviewUrl ? (
                                    <img src={editPreviewUrl} className="h-full w-full object-cover" alt="Edit Preview" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-slate-400">
                                        <Camera size={24} />
                                        <span className="text-[10px] font-bold">Change Photo</span>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    setEditProfilePhoto(e.target.files[0]);
                                    setEditPreviewUrl(URL.createObjectURL(e.target.files[0]));
                                }
                            }} />
                        </div>
                        {editPreviewUrl && (
                            <button 
                                onClick={handleRemoveEditPhoto}
                                className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition-colors z-10"
                                title="Remove photo"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                </div>

                <Input label="Full Name" value={editingVol.name} onChange={(e) => setEditingVol({...editingVol, name: e.target.value})} icon={<UserCircle size={16} />} />
                <Input label="Primary Mobile" value={editingVol.mobile} onChange={(e) => setEditingVol({...editingVol, mobile: e.target.value})} maxLength={10} icon={<Phone size={16} />} />
                <Input label="Email Address" value={editingVol.email} onChange={(e) => setEditingVol({...editingVol, email: e.target.value})} icon={<Mail size={16} />} />
            </div>
          )}
      </Modal>

      {/* SECURITY PASSWORD RESET MODAL */}
      <Modal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
        title="Reset Access Key"
      >
          <div className="space-y-5">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <Lock className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                      <p className="text-xs font-bold text-amber-900">Security Override</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                          Enter a new password for <strong className="text-amber-900">{selectedVol?.name}</strong>. Their previous password will immediately cease to function.
                      </p>
                  </div>
              </div>
              <Input 
                label="New Password" 
                type="password" 
                placeholder="Min 6 characters"
                value={resetPassword} 
                onChange={(e) => setResetPassword(e.target.value)} 
                icon={<KeyRound size={16} />} 
              />
              <Button 
                onClick={async () => {
                  setIsSubmitting(true);
                  const { error } = await supabase.rpc('admin_reset_password', { target_user_id: selectedVol?.id, new_password: resetPassword });
                  if (!error) { 
                    setIsResetModalOpen(false); 
                    setResetPassword('');
                    addNotification('Password reset successfully.', 'success'); 
                  } else {
                    addNotification(`Override error: ${error.message}`, 'error');
                  }
                  setIsSubmitting(false);
                }} 
                disabled={isSubmitting || resetPassword.length < 6} 
                className="w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                <span>Set New Password</span>
              </Button>
          </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ManageVolunteers;
