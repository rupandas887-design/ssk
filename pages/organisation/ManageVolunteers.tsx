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
  const [formError, setFormError] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedVol, setSelectedVol] = useState<VolunteerWithEnrollments | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const { addNotification } = useNotification();

  const fetchVolunteers = useCallback(async () => {
    if (!user?.organisationId) return;
    setLoading(true);
    try {
        const { data: profileData } = await supabase.from('profiles').select('*, members(id)').eq('role', 'Volunteer').eq('organisation_id', user.organisationId);
        if (profileData) setVolunteers(profileData.map((v: any) => ({
            id: v.id, name: v.name, email: v.email, mobile: v.mobile, role: Role.Volunteer, organisationId: v.organisation_id, organisationName: user.organisationName, status: v.status || 'Active', enrollments: v.members?.length || 0, profile_photo_url: v.profile_photo_url
        })));
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchVolunteers(); }, [fetchVolunteers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVol(prev => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleAddVolunteer = async () => {
    const { name, mobile, email, password } = newVol;
    setFormError(null);

    if (!name || !mobile || !email || !password) {
        setFormError("Action Required: Please complete all identity fields.");
        return;
    }

    setIsSubmitting(true);
    try {
        // 1. Check for cross-role conflict (Organization registry)
        const { data: orgCheck } = await supabase.from('organisations').select('id, name').eq('mobile', mobile.trim()).maybeSingle();
        if (orgCheck) {
          throw new Error(`Identity Conflict: Mobile "${mobile}" is already registered as the Organization "${orgCheck.name}". One identity cannot hold dual roles.`);
        }

        // 2. Authorization
        let photoUrl = '';
        if (newVol.profilePhoto) {
            const fileName = `agent_profile_${uuidv4()}.jpg`;
            const { data } = await supabase.storage.from('member-images').upload(fileName, newVol.profilePhoto);
            if (data) photoUrl = supabase.storage.from('member-images').getPublicUrl(data.path).data.publicUrl;
        }

        const authClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        const { data: authData, error: authError } = await authClient.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: { data: { name: name.trim(), mobile: mobile.trim(), role: 'Volunteer', organisation_id: user?.organisationId } }
        });

        if (authError) throw new Error(`Security provisioning failed: ${authError.message}`);
        
        if (authData.user) {
            await supabase.from('profiles').upsert({
                id: authData.user.id, name: name.trim(), email: email.trim().toLowerCase(), role: 'Volunteer',
                organisation_id: user?.organisationId, mobile: mobile.trim(), status: 'Active', profile_photo_url: photoUrl || undefined
            });
            await syncToSheets(SheetType.VOLUNTEERS, { name, email, mobile, organisation_name: user?.organisationName, status: 'Active' });
            setNewVol({ name: '', mobile: '', email: '', password: '', profilePhoto: null });
            setPreviewUrl(null);
            fetchVolunteers();
            addNotification('Volunteer authorized.', 'success');
        }
    } catch (err: any) {
        setFormError(err.message || "An unexpected failure occurred.");
    } finally { setIsSubmitting(false); }
  };

  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.mobile?.includes(searchTerm));
  }, [volunteers, searchTerm]);

  return (
    <DashboardLayout title="Volunteers management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorize New Volunteer">
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div onClick={() => fileInputRef.current?.click()} className="relative cursor-pointer">
                  <div className="h-28 w-28 rounded-full border-2 border-dashed border-gray-800 bg-black/40 flex items-center justify-center overflow-hidden">
                    {previewUrl ? <img src={previewUrl} className="h-full w-full object-cover" /> : <Camera size={28} className="text-gray-600" />}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files?.[0]) {
                          setNewVol(prev => ({ ...prev, profilePhoto: e.target.files![0] }));
                          setPreviewUrl(URL.createObjectURL(e.target.files![0]));
                      }
                  }} />
                </div>
              </div>

              <Input label="FULL NAME" name="name" value={newVol.name} onChange={handleInputChange} icon={<UserCircle size={16} />} />
              <Input label="MOBILE IDENTITY" name="mobile" value={newVol.mobile} onChange={handleInputChange} maxLength={10} icon={<Phone size={16} />} />
              <Input label="ACCESS EMAIL" name="email" value={newVol.email} onChange={handleInputChange} icon={<Mail size={16} />} />
              <Input label="SECURITY KEY" name="password" type="password" value={newVol.password} onChange={handleInputChange} icon={<Lock size={16} />} />

              {formError && (
                  <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                      <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-[11px] text-red-400 font-bold uppercase tracking-tight leading-relaxed">{formError}</p>
                  </div>
              )}

              <Button onClick={handleAddVolunteer} disabled={isSubmitting} className="w-full py-5 text-[11px] font-black uppercase tracking-[0.4em]">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {isSubmitting ? 'AUTHORIZING...' : 'Authorize Volunteer'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Personnel Registry">
            <div className="mb-8">
                <Input placeholder="Search Identity..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={<Search size={18} />} />
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black">Agent Node</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-center">Enrollments</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-white font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="p-20 text-center text-[10px] font-black uppercase text-white animate-pulse">Syncing...</td></tr>
                  ) : filteredVolunteers.map(vol => (
                    <tr key={vol.id} className="group border-b border-gray-900/50 hover:bg-white/[0.015]">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                                {vol.profile_photo_url ? <img src={vol.profile_photo_url} className="h-full w-full object-cover" /> : <UserCircle size={24} className="text-blue-500/50" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-white text-lg group-hover:text-blue-500 transition-colors">{vol.name}</span>
                                <span className="text-[10px] text-white font-mono tracking-tight">{vol.mobile}</span>
                            </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="font-black text-xl text-white tracking-tighter">{vol.enrollments}</span>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => { setSelectedVol(vol); setIsResetModalOpen(true); }} className="p-3 bg-white/5 border border-white/10 text-white hover:text-orange-400 rounded-xl">
                            <KeyRound size={16} />
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

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Security Override">
          <div className="space-y-6">
              <Input label="NEW ACCESS KEY" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
              <Button onClick={async () => {
                  setIsSubmitting(true);
                  const { error } = await supabase.rpc('admin_reset_password', { target_user_id: selectedVol?.id, new_password: resetPassword });
                  if (!error) { setIsResetModalOpen(false); addNotification('Key Synchronized.', 'success'); }
                  setIsSubmitting(false);
              }} disabled={isSubmitting || resetPassword.length < 6} className="w-full">Synchronize Key</Button>
          </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ManageVolunteers;