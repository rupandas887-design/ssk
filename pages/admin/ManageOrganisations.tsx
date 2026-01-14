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
  Edit,
  Camera,
  XCircle,
  PartyPopper,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

const supabaseUrl = "https://baetdjjzfqupdzsoecph.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

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
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<(Organisation & { email?: string }) | null>(null);
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
        // 1. DUAL ROLE CHECK: Verify this mobile is NOT a Volunteer in the Profiles registry
        const { data: volunteerCheck } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('mobile', mobile.trim())
          .eq('role', 'Volunteer')
          .maybeSingle();

        if (volunteerCheck) {
          throw new Error(`Identity Conflict: Mobile "${mobile}" is already registered to Volunteer "${volunteerCheck.name}". One identity cannot hold dual roles.`);
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
    setIsModalOpen(true);
  };

  const handleUpdateOrganisation = async () => {
    if (!editingOrg) return;
    setIsSubmitting(true);
    try {
        const { error: orgError } = await supabase
            .from('organisations')
            .update({ 
                name: editingOrg.name, 
                status: editingOrg.status,
                secretary_name: editingOrg.secretary_name,
                mobile: editingOrg.mobile
            })
            .eq('id', editingOrg.id);
            
        if (orgError) throw orgError;
        
        await supabase
            .from('profiles')
            .update({ 
                name: editingOrg.secretary_name,
                status: editingOrg.status,
                mobile: editingOrg.mobile
            })
            .eq('organisation_id', editingOrg.id);

        addNotification('Registry sync complete.', 'success');
        fetchOrganisations(); 
        setIsModalOpen(false);
    } catch (err: any) {
        addNotification(err.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Organization Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorize New Organization" className="border-orange-500/10 relative overflow-hidden">
            <div className="space-y-6 relative z-10">
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
                  <div className="h-28 w-28 rounded-full border-2 border-dashed border-gray-800 bg-black/40 flex items-center justify-center overflow-hidden group-hover:border-orange-500/50 transition-all duration-300">
                    {previewUrl ? (
                      <img src={previewUrl} className="h-full w-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-600">
                        <Camera size={28} />
                        <span className="text-[8px] font-black uppercase">Add Photo</span>
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
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700">Optional Identity Logo</p>
              </div>

              <div className="space-y-6">
                <Input label="Organization Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="Ex: SSK Bangalore" icon={<Building2 size={16} />} />
                <Input label="Primary Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" maxLength={10} icon={<Phone size={16} />} />
                <Input label="Administrative Lead" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Lead Name" icon={<User size={16} />} />
                <Input label="Lead Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="lead@org.com" icon={<Mail size={16} />} />
                <div className="relative">
                  <Input label="Predefined Access Key" name="password" type={showPassword ? "text" : "password"} value={newOrg.password} onChange={handleInputChange} placeholder="Min 6 characters" icon={<Lock size={16} />} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-gray-500 hover:text-white">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {formError && (
                    <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                        <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={16} />
                        <p className="text-[11px] text-red-400 font-bold uppercase tracking-tight leading-relaxed">{formError}</p>
                    </div>
                )}

                <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.4em]">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                  {isSubmitting ? 'Establishing Node...' : 'Deploy Organization'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Operational Registry">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-800">
                        <tr>
                            <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black">Identity</th>
                            <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-right">Status</th>
                            <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan={3} className="p-20 text-center animate-pulse text-[10px] text-white font-black uppercase">Syncing...</td></tr>
                        ) : organisations.map(org => (
                        <tr key={org.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02]">
                            <td className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                                      {org.profile_photo_url ? (
                                          <img src={org.profile_photo_url} className="h-full w-full object-cover" alt={org.name} />
                                      ) : (
                                          <Building2 size={24} className="text-orange-500/50" />
                                      )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{org.name}</span>
                                        <span className="text-[11px] text-white uppercase font-mono tracking-tighter">{org.secretary_name} • {org.mobile}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-6 text-right">
                                <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                    {org.status}
                                </span>
                            </td>
                            <td className="p-6 text-right">
                                <button onClick={() => handleEditClick(org)} className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:border-orange-500/50 text-white">
                                    <Edit size={18} />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="relative animate-splash bg-[#0a0a0a] border border-orange-500/30 rounded-[3rem] p-12 flex flex-col items-center gap-6 shadow-2xl">
                <div className="h-24 w-24 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 border border-orange-500/20">
                    <PartyPopper size={48} />
                </div>
                <h2 className="text-3xl font-cinzel text-white uppercase tracking-widest">Registry Updated</h2>
            </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Parameters">
          {editingOrg && (
            <div className="space-y-6">
                <Input label="Organization Name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} />
                <Input label="Secretary Name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} />
                <Input label="Mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} />
                <Select label="Status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                </Select>
                <div className="flex gap-4 pt-4">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleUpdateOrganisation} disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? "Syncing..." : "Apply Changes"}
                    </Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;