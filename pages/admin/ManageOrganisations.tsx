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
import { ShieldCheck, UserPlus, Building2, Loader2, Settings, ShieldAlert, Zap, Copy, Info } from 'lucide-react';

const ManageOrganisations: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [newOrg, setNewOrg] = useState({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addNotification } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('organisations').select('*').order('name');
    if (error) {
      if (error.message.includes('recursion')) {
          addNotification('Security Loop detected. Run Repair SQL.', 'error');
      } else {
          addNotification('Failed to sync with master registry.', 'error');
      }
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
    const secretaryName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secretaryName) {
        addNotification("All identity parameters are mandatory.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        // 1. Create Organization Record
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ name, mobile, secretary_name: secretaryName, status: 'Active' })
          .select().single();

        if (orgError) throw orgError;

        // 2. Create Auth Account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: secretaryName,
              role: 'Organisation',
              organisation_id: orgData.id,
              mobile
            }
          }
        });

        if (authError) {
          // Cleanup if auth fails
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw authError;
        }

        // 3. Force Sync Profile (Sync Guard)
        if (authData.user) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: secretaryName,
                email,
                role: 'Organisation',
                organisation_id: orgData.id,
                mobile,
                status: 'Active'
            });

            if (profileError) {
                console.error("Manual sync warning:", profileError.message);
            }
        }

        addNotification('Organization authorized and synced successfully.', 'success');
        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
    } catch (err: any) {
        console.error("Auth Sequence Sync Failure:", err);
        addNotification(err.message || "Failed to authorize entity.", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditClick = (org: Organisation) => {
    setEditingOrg({ ...org });
    setIsModalOpen(true);
  };

  const handleUpdateOrganisation = async () => {
    if (!editingOrg) return;
    const { error } = await supabase.from('organisations').update({
        name: editingOrg.name, 
        mobile: editingOrg.mobile,
        secretary_name: editingOrg.secretary_name, 
        status: editingOrg.status
    }).eq('id', editingOrg.id);

    if (error) {
        addNotification(`Sync failed: ${error.message}`, 'error');
    } else {
        addNotification(`Organization parameters updated.`, 'success');
        fetchOrganisations();
        setIsModalOpen(false);
    }
  };

  return (
    <DashboardLayout title="Entity Administration">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <Card title="Authorize New Entity">
            <div className="space-y-6">
              <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="Ex: SSK Bangalore" />
              <Input label="Primary Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" />
              <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} />
              <Input label="Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@entity.com" />
              <Input label="Security Key" name="password" type="password" value={newOrg.password} onChange={handleInputChange} placeholder="Min 6 characters" />
              <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest shadow-xl">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {isSubmitting ? 'AUTHORIZING...' : 'Establish Entity'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Active Entity Registry">
            {loading ? (
                <div className="p-40 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={48} /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-800">
                            <tr>
                                <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Entity Identity</th>
                                <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black text-right">Verification</th>
                                <th className="p-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {organisations.map(org => (
                            <tr key={org.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all">
                                <td className="p-6">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{org.name}</span>
                                        <span className="text-[11px] text-gray-600 uppercase font-mono tracking-tighter">{org.secretary_name} • {org.mobile}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-right">
                                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                        {org.status}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)} className="opacity-0 group-hover:opacity-100 transition-opacity">Edit</Button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Entity Parameters">
          {editingOrg && (
            <div className="space-y-6">
                <Input label="Organisation Name" name="name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} />
                <Input label="Registry Mobile" name="mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} />
                <Input label="Secretary Name" name="secretary_name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} />
                <Select label="Access Status" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Active / Operational</option>
                    <option value="Deactivated">Locked / Deactivated</option>
                </Select>
                <div className="flex justify-end gap-4 pt-6">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleUpdateOrganisation}>Commit Changes</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;