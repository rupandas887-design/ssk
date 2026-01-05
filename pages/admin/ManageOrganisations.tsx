
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Organisation } from '../../types';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import { 
  ShieldCheck, 
  UserPlus, 
  Building2, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  Settings,
  Zap,
  Activity,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Phone,
  User,
  Trash2,
  AlertTriangle
} from 'lucide-react';

const supabaseUrl = "https://baetdjjzfqupdzsoecph.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

const ManageOrganisations: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [newOrg, setNewOrg] = useState({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organisation | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<(Organisation & { email?: string, newPassword?: string }) | null>(null);
  const { addNotification } = useNotification();

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('organisations').select('*').order('name');
    if (error) {
      addNotification(`Registry error: ${error.message}`, 'error');
    } else {
      setOrganisations(data || []);
    }
    setLoading(false);
  }, [addNotification]);

  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOrg(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrganisation = async () => {
    const email = newOrg.email.trim().toLowerCase();
    const password = newOrg.password;
    const name = newOrg.name.trim();
    const mobile = newOrg.mobile.trim();
    const secName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secName) {
        addNotification("Incomplete credentials.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    try {
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ name, mobile, secretary_name: secName, status: 'Active' })
          .select().single();

        if (orgError) throw orgError;

        // CRITICAL: Prevent session override
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data: authData, error: authError } = await authClient.auth.signUp({
          email, password,
          options: {
            data: { name: secName, role: 'Organisation', organisation_id: orgData.id, mobile }
          }
        });

        if (authError) throw authError;

        if (authData?.user?.id) {
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: secName,
                email,
                role: 'Organisation',
                organisation_id: orgData.id,
                mobile,
                status: 'Active'
            });
        }

        await syncToSheets(SheetType.ORGANISATIONS, {
          name, secretary_name: secName, mobile, email, status: 'Active',
          registration_date: new Date().toLocaleDateString()
        });

        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
        addNotification('Sector authorised successfully.', 'success');
    } catch (err: any) {
        addNotification(err?.message || 'Handshake failed.', 'error');
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

  const handleUpdateOrganisation = async () => {
    if (!editingOrg) return;
    setIsSubmitting(true);
    try {
      await supabase.from('organisations').update({
          name: editingOrg.name, mobile: editingOrg.mobile, secretary_name: editingOrg.secretary_name, status: editingOrg.status
      }).eq('id', editingOrg.id);

      await supabase.from('profiles').update({
          name: editingOrg.secretary_name, mobile: editingOrg.mobile, email: editingOrg.email, status: editingOrg.status
      }).eq('organisation_id', editingOrg.id).eq('role', 'Organisation');

      addNotification(`Sector parameters updated.`, 'success');
      fetchOrganisations();
      setIsModalOpen(false);
    } catch (err: any) {
        addNotification(`Update failed: ${err.message}`, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteOrganisation = async () => {
    if (!orgToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('organisations').delete().eq('id', orgToDelete.id);
      addNotification(`${orgToDelete.name} node purged.`, 'success');
      setOrgToDelete(null);
      fetchOrganisations();
    } catch (err: any) {
      addNotification(`Purge failed.`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Sector Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorise New Sector" className="border-orange-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <ShieldCheck size={100} />
            </div>
            <div className="space-y-6 relative z-10">
              <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="Ex: SSK Bangalore" icon={<Building2 size={16} />} />
              <Input label="Primary Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" icon={<Phone size={16} />} />
              <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} icon={<User size={16} />} />
              <Input label="Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@node.com" icon={<Mail size={16} />} />
              <div className="relative">
                <Input label="Access Key" name="password" type={showPassword ? "text" : "password"} value={newOrg.password} onChange={handleInputChange} placeholder="Min 6 characters" icon={<Lock size={16} />} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-gray-500 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest shadow-xl">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {isSubmitting ? 'ESTABLISHING...' : 'Deploy Sector'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Operational Sector Registry">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4 text-gray-500">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                        <Activity size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Master Node Synchronisation</span>
                </div>
                <button onClick={fetchOrganisations} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/40 text-gray-500 hover:text-white transition-all">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-gray-800">
                        <tr>
                            <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Organisation Identity</th>
                            <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black text-right">Verification</th>
                            <th className="p-6"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr><td colSpan={3} className="p-20 text-center animate-pulse uppercase tracking-[0.5em] text-[10px] text-gray-600 font-black">Syncing Network...</td></tr>
                        ) : organisations.map(org => (
                        <tr key={org.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all">
                            <td className="p-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{org.name}</span>
                                        {org.status === 'Active' && <CheckCircle2 size={14} className="text-green-500/50" />}
                                    </div>
                                    <span className="text-[11px] text-gray-600 uppercase font-mono tracking-tighter">{org.secretary_name} • {org.mobile}</span>
                                </div>
                            </td>
                            <td className="p-6 text-right">
                                <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                    {org.status}
                                </span>
                            </td>
                            <td className="p-6 text-right">
                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                    <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)}>Modify</Button>
                                    <button onClick={() => setOrgToDelete(org)} className="p-2 text-red-500/40 hover:text-red-500 rounded-lg transition-all"><Trash2 size={18} /></button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Sector">
          {editingOrg && (
            <div className="space-y-6">
                <Input label="ORGANISATION NAME" name="name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} icon={<Building2 size={16} />} />
                <Input label="SECRETARY NAME" name="secretary_name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} icon={<User size={16} />} />
                <Input label="CONTACT MOBILE" name="mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} icon={<Phone size={16} />} />
                <Select label="OPERATIONAL STATUS" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                </Select>
                <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateOrganisation} disabled={isSubmitting}>{isSubmitting ? "Syncing..." : "Apply Changes"}</Button>
                </div>
            </div>
          )}
      </Modal>

      <Modal isOpen={!!orgToDelete} onClose={() => setOrgToDelete(null)} title="Security Protocol: Purge Node">
        <div className="p-6 text-center space-y-8">
            <div className="p-6 bg-red-500/10 rounded-full w-24 h-24 mx-auto flex items-center justify-center text-red-500 border border-red-500/20">
                <AlertTriangle size={48} />
            </div>
            <div>
                <h4 className="text-2xl font-cinzel text-white mb-3">Irreversible Purge</h4>
                <p className="text-sm text-gray-500 leading-relaxed uppercase tracking-widest font-black">
                    Purge <span className="text-red-500">"{orgToDelete?.name}"</span>? 
                </p>
            </div>
            <div className="flex gap-4">
                <Button variant="secondary" onClick={() => setOrgToDelete(null)} className="flex-1">Abort</Button>
                <Button onClick={handleDeleteOrganisation} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700">
                    {isDeleting ? 'PURGING...' : 'Confirm Purge'}
                </Button>
            </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;
