import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Organisation, Role } from '../../types';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { 
  ShieldCheck, 
  UserPlus, 
  Building2, 
  Loader2, 
  ShieldAlert, 
  Copy, 
  ExternalLink, 
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
  User
} from 'lucide-react';

const ManageOrganisations: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [newOrg, setNewOrg] = useState({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRepairTool, setShowRepairTool] = useState(false);
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditPasswordReveal, setShowEditPasswordReveal] = useState(false);
  
  const { addNotification } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<(Organisation & { email?: string, newPassword?: string }) | null>(null);

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('organisations').select('*').order('name');
      if (error) {
        addNotification(`Registry error: ${error.message}`, 'error');
      } else {
        setOrganisations(data || []);
      }
    } catch (err: any) {
      addNotification(`Sync failed: ${err?.message || 'Unknown network error'}`, 'error');
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
    const secretaryName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secretaryName) {
        addNotification("Incomplete credentials provided.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    let createdOrgId: string | null = null;
    
    try {
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ name, mobile, secretary_name: secretaryName, status: 'Active' })
          .select().single();

        if (orgError) throw orgError;
        createdOrgId = orgData.id;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: secretaryName,
              role: 'Organisation',
              organisation_id: createdOrgId,
              mobile
            }
          }
        });

        if (authError) {
          if (createdOrgId) await supabase.from('organisations').delete().eq('id', createdOrgId);
          throw authError;
        }

        if (authData?.user?.id) {
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: secretaryName,
                email,
                role: 'Organisation',
                organisation_id: createdOrgId,
                mobile,
                status: 'Active'
            });
        }

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('organisation_id', org.id)
        .eq('role', 'Organisation')
        .maybeSingle();

      setEditingOrg({ 
        ...org, 
        email: profile?.email || '',
        newPassword: ''
      });
      setShowEditPassword(false);
      setShowEditPasswordReveal(false);
      setIsModalOpen(true);
    } catch (err) {
      setEditingOrg({ ...org, email: '', newPassword: '' });
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrganisation = async () => {
    if (!editingOrg) return;
    setIsSubmitting(true);
    
    try {
      const { error: orgError } = await supabase.from('organisations').update({
          name: editingOrg.name, 
          mobile: editingOrg.mobile,
          secretary_name: editingOrg.secretary_name, 
          status: editingOrg.status
      }).eq('id', editingOrg.id);

      if (orgError) throw orgError;

      const { error: profileError } = await supabase.from('profiles').update({
          name: editingOrg.secretary_name,
          mobile: editingOrg.mobile,
          email: editingOrg.email,
          status: editingOrg.status
      }).eq('organisation_id', editingOrg.id).eq('role', 'Organisation');

      if (editingOrg.newPassword) {
          addNotification("Auth key rotation requires high-level privileges. Metadata synced.", "info");
      } else {
          addNotification(`Sector parameters updated.`, 'success');
      }
      
      fetchOrganisations();
      setIsModalOpen(false);
    } catch (err: any) {
        addNotification(`Update failed: ${err.message}`, 'error');
    } finally {
        setIsSubmitting(false);
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
                <Input 
                  label="Access Key" 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  value={newOrg.password} 
                  onChange={handleInputChange} 
                  placeholder="Min 6 characters" 
                  icon={<Lock size={16} />}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-500 hover:text-white transition-colors"
                >
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
                                <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)} className="opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">Modify Node</Button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Sector Parameters">
          {editingOrg && (
            <div className="space-y-6 p-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4 mb-6 p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl relative overflow-hidden">
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                        <Settings size={20} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-orange-500/60 font-black uppercase tracking-widest leading-none mb-1">Administrative Override</p>
                        <p className="text-sm font-bold text-white">Target Node: {editingOrg.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input 
                      label="ORGANISATION NAME" 
                      name="name" 
                      value={editingOrg.name} 
                      onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} 
                      icon={<Building2 size={16} />}
                    />
                  </div>
                  
                  <Input 
                    label="SECRETARY NAME" 
                    name="secretary_name" 
                    value={editingOrg.secretary_name} 
                    onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} 
                    icon={<User size={16} />}
                  />
                  
                  <Input 
                    label="CONTACT MOBILE" 
                    name="mobile" 
                    value={editingOrg.mobile} 
                    onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} 
                    icon={<Phone size={16} />}
                  />
                  
                  <div className="md:col-span-2">
                    <Input 
                      label="OPERATIONAL EMAIL" 
                      name="email" 
                      type="email"
                      value={editingOrg.email || ''} 
                      onChange={(e) => setEditingOrg({...editingOrg, email: e.target.value})} 
                      icon={<Mail size={16} />}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Key Override</label>
                      <button 
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 transition-colors"
                      >
                        {showEditPassword ? "Cancel" : "Modify Key"}
                      </button>
                    </div>
                    {showEditPassword && (
                      <div className="relative animate-in slide-in-from-top-2 fade-in">
                        <Input 
                          placeholder="New Security Key" 
                          type={showEditPasswordReveal ? "text" : "password"}
                          value={editingOrg.newPassword || ''}
                          onChange={(e) => setEditingOrg({...editingOrg, newPassword: e.target.value})}
                          icon={<Lock size={16} />}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowEditPasswordReveal(!showEditPasswordReveal)}
                          className="absolute right-3 top-[10px] text-gray-500 hover:text-white transition-colors"
                        >
                          {showEditPasswordReveal ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Select label="OPERATIONAL STATUS" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                        <option value="Active">Active / Online</option>
                        <option value="Deactivated">Deactivated / Locked</option>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-10 sticky bottom-0 bg-gray-900 pb-2 border-t border-white/5 mt-6 z-10">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="px-8 border-white/10 hover:bg-white/5 py-4 text-[10px] uppercase font-black tracking-widest">Cancel</Button>
                    <Button 
                      type="button" 
                      onClick={handleUpdateOrganisation} 
                      disabled={isSubmitting}
                      className="px-8 shadow-lg shadow-orange-950/20 py-4 text-[10px] uppercase font-black tracking-widest flex items-center gap-2"
                    >
                      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
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