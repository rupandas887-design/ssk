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
import { supabase, supabaseUrl, supabaseAnonKey } from '../../supabase/client';
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
  Edit,
  Camera,
  XCircle,
  PartyPopper,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

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
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<(Organisation & { email?: string }) | null>(null);
  const [editProfilePhoto, setEditProfilePhoto] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  
  const { addNotification } = useNotification();

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orgs, error: orgError } = await supabase.from('organisations').select('*').order('name');
      if (orgError) throw orgError;
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, organisation_id')
        .eq('role', 'Organisation');
        
      const merged = (orgs || []).map(org => ({
          ...org,
          authUserId: profiles?.find(p => p.organisation_id === org.id)?.id,
          email: profiles?.find(p => p.organisation_id === org.id)?.email || 'No email linked'
      }));
      setOrgs(merged);
    } catch (err: any) {
      addNotification(`Registry error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => { 
    fetchOrganisations();

    const channel = supabase
      .channel('manage-orgs-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organisations' }, () => {
        fetchOrganisations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchOrganisations();
      })
      .subscribe();

    const handleFocus = () => {
      fetchOrganisations();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [fetchOrganisations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOrg(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleAddOrganisation = async () => {
    const { email, password, name, mobile, secretaryName } = newOrg;
    setFormError(null);

    if (!email || !password || !name || !mobile || !secretaryName) {
        setFormError("Action Required: Please complete all mandatory fields.");
        return;
    }

    setIsSubmitting(true);
    try {
        // 1. Check for existing Organization mobile
        const { data: orgCheck } = await supabase
          .from('organisations')
          .select('id')
          .eq('mobile', mobile.trim())
          .maybeSingle();
        
        if (orgCheck) {
          throw new Error(`Registry Conflict: This mobile number is already linked to an authorized Organization.`);
        }

        // 2. Deployment of Organisation Media & Record
        let photoUrl = '';
        if (newOrg.profilePhoto) {
            const fileName = `org_profile_${uuidv4()}.jpg`;
            const { data, error: storageError } = await supabase.storage.from('member-images').upload(fileName, newOrg.profilePhoto);
            if (storageError) throw storageError;
            if (data) photoUrl = supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
        }

        const { data: orgData, error: orgError } = await supabase.from('organisations').insert({ 
            name: name.trim(), 
            mobile: mobile.trim(), 
            secretary_name: secretaryName.trim(), 
            status: 'Active', 
            profile_photo_url: photoUrl || undefined
        }).select().single();

        if (orgError) throw new Error(`Deployment failed: ${orgError.message}`);

        const authClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        const { data: authData, error: authError } = await authClient.auth.signUp({
          email: email.trim().toLowerCase(), 
          password,
          options: { data: { name: secretaryName.trim(), role: 'Organisation', organisation_id: orgData.id, mobile: mobile.trim() } }
        });

        if (authError) {
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw new Error(`Identity provisioning failed: ${authError.message}`);
        }

        if (authData.user) {
            await supabase.from('profiles').upsert({
                id: authData.user.id, 
                name: secretaryName.trim(), 
                email: email.trim().toLowerCase(), 
                role: 'Organisation',
                organisation_id: orgData.id, 
                mobile: mobile.trim(), 
                status: 'Active'
            });
        }

        await syncToSheets(SheetType.ORGANISATIONS, { 
          name, 
          secretary_name: secretaryName, 
          mobile, 
          email, 
          status: 'Active',
          registration_date: new Date().toLocaleDateString()
        });

        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '', profilePhoto: null });
        setPreviewUrl(null);
        fetchOrganisations();
        setShowSuccessSplash(true);
        addNotification(name, 'registry-success', photoUrl || undefined);
        setTimeout(() => setShowSuccessSplash(false), 3000);
    } catch (err: any) {
        setFormError(err.message || "An unexpected deployment failure occurred.");
        addNotification(err.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditClick = (org: OrganisationWithEmail) => {
    setEditingOrg({ ...org });
    setEditPreviewUrl(org.profile_photo_url || null);
    setEditProfilePhoto(null);
    setIsModalOpen(true);
  };

  const handleUpdateOrganisation = async () => {
    if (!editingOrg) return;
    setIsSubmitting(true);
    try {
        let finalPhotoUrl = editingOrg.profile_photo_url;

        // 1. Handle Photo Upload if changed
        if (editProfilePhoto) {
            const fileName = `org_profile_update_${uuidv4()}.jpg`;
            const { data, error: storageError } = await supabase.storage.from('member-images').upload(fileName, editProfilePhoto);
            if (storageError) throw storageError;
            if (data) {
                finalPhotoUrl = supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
            }
        }

        const { error: orgError } = await supabase
            .from('organisations')
            .update({ 
                name: editingOrg.name, 
                status: editingOrg.status,
                secretary_name: editingOrg.secretary_name,
                mobile: editingOrg.mobile,
                profile_photo_url: finalPhotoUrl
            })
            .eq('id', editingOrg.id);
            
        if (orgError) throw orgError;
        
        await supabase
            .from('profiles')
            .update({ 
                name: editingOrg.secretary_name,
                status: editingOrg.status,
                mobile: editingOrg.mobile,
                profile_photo_url: finalPhotoUrl
            })
            .eq('organisation_id', editingOrg.id);

        addNotification('Registry sync complete.', 'success');
        fetchOrganisations(); 
        setIsModalOpen(false);
        setEditProfilePhoto(null);
        setEditPreviewUrl(null);
    } catch (err: any) {
        addNotification(err.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Organization Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card title="Authorize New Organization" subtitle="Deploy a new organization node and administrative access" className="border-slate-200/80 shadow-card">
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-2 pb-2">
                <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group-hover:border-saffron-500 group-hover:bg-saffron-50/30 transition-all duration-200 shadow-inner">
                    {previewUrl ? (
                      <img src={previewUrl} className="h-full w-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-saffron-600 transition-colors">
                        <Camera size={24} />
                        <span className="text-[10px] font-bold">Logo</span>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setNewOrg(prev => ({ ...prev, profilePhoto: e.target.files![0] }));
                        setPreviewUrl(URL.createObjectURL(e.target.files![0]));
                      }
                  }} />
                </div>
                <p className="text-[11px] font-medium text-slate-400">Optional Identity Logo</p>
              </div>

              <div className="space-y-4">
                <Input label="Organization Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="Ex: SSK Bangalore Central" icon={<Building2 size={16} />} />
                <Input label="Primary Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" maxLength={10} icon={<Phone size={16} />} />
                <Input label="Administrative Lead" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Lead Name" icon={<User size={16} />} />
                <Input label="Lead Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="lead@org.com" icon={<Mail size={16} />} />
                <div className="relative">
                  <Input label="Predefined Access Key" name="password" type={showPassword ? "text" : "password"} value={newOrg.password} onChange={handleInputChange} placeholder="Min 6 characters" icon={<Lock size={16} />} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-[32px] text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {formError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 animate-in fade-in duration-200">
                        <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-rose-700 font-semibold leading-relaxed">{formError}</p>
                    </div>
                )}

                <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  {isSubmitting ? 'Establishing Node...' : 'Deploy Organization'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Operational Registry" subtitle="Active and registered organization nodes across the global Samaj network" className="border-slate-200/80 shadow-card p-0 overflow-hidden">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80">
                        <tr className="text-slate-600 text-xs font-bold tracking-wider">
                            <th className="px-6 py-4">Identity &amp; Lead</th>
                            <th className="px-6 py-4 text-right">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                             <tr><td colSpan={3} className="p-16 text-center animate-pulse text-xs text-slate-400 font-semibold">Synchronizing registry nodes...</td></tr>
                        ) : organisations.map(org => (
                        <tr key={org.id} className="hover:bg-saffron-50/20 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                      {org.profile_photo_url ? (
                                          <img src={org.profile_photo_url} className="h-full w-full object-cover" alt={org.name} />
                                      ) : (
                                          <Building2 size={20} className="text-saffron-500" />
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 text-sm truncate">{org.name}</span>
                                        <span className="text-xs text-slate-500">{org.secretary_name} · {org.mobile}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    org.status === 'Active' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${org.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    <span>{org.status}</span>
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => handleEditClick(org)} 
                                    className="p-2 rounded-lg bg-slate-50 hover:bg-saffron-50 text-slate-600 hover:text-saffron-600 border border-slate-200 hover:border-saffron-200 transition-colors"
                                    title="Edit Organization"
                                >
                                    <Edit size={16} />
                                </button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="relative animate-splash bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl">
                <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <PartyPopper size={32} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Registry Updated Successfully</h2>
            </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Organization Node">
          {editingOrg && (
            <div className="space-y-5">
                <div className="flex flex-col items-center gap-2 mb-4">
                    <div onClick={() => editFileInputRef.current?.click()} className="relative group cursor-pointer">
                        <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group-hover:border-saffron-500 transition-all shadow-sm">
                            {editPreviewUrl ? (
                                <img src={editPreviewUrl} className="h-full w-full object-cover" alt="Edit Preview" />
                            ) : (
                                <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-saffron-600">
                                    <Camera size={20} />
                                    <span className="text-[9px] font-bold">Logo</span>
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
                    <p className="text-xs text-slate-500">Update Organization Logo</p>
                </div>

                <Input label="Organization Name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} icon={<Building2 size={16} />} />
                <Input label="Administrative Lead" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} icon={<User size={16} />} />
                <Input label="Mobile Number" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} icon={<Phone size={16} />} />
                <Select label="Operational Status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                </Select>
                
                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleUpdateOrganisation} disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                        {isSubmitting ? "Updating..." : "Save Changes"}
                    </Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;