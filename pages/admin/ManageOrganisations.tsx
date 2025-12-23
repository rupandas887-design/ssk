
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
import { Building2, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';

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
      addNotification('Could not fetch organisations.', 'error');
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
    const trimmedEmail = newOrg.email.trim().toLowerCase();
    
    if (!trimmedEmail || !newOrg.password || !newOrg.name || !newOrg.mobile || !newOrg.secretaryName) {
        addNotification("All fields are required.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        // 1. Create the Organisation entry
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ 
            name: newOrg.name.trim(), 
            mobile: newOrg.mobile.trim(), 
            secretary_name: newOrg.secretaryName.trim() 
          })
          .select().single();

        if (orgError) throw orgError;

        // 2. Create Auth User - explicitly use 'Organisation'
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: newOrg.password,
          options: {
            data: {
              name: newOrg.secretaryName.trim(),
              role: 'Organisation', // Explicit string
              organisation_id: String(orgData.id),
              mobile: newOrg.mobile.trim()
            }
          }
        });

        if (authError) {
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw authError;
        }

        // 3. Immediately upsert profile to ensure role is correct
        if (authData.user) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: newOrg.secretaryName.trim(),
                role: 'Organisation', // Must match mapStringToRole
                organisation_id: orgData.id,
                email: trimmedEmail,
                mobile: newOrg.mobile.trim(),
                status: 'Active'
            });
            if (profileError) console.error("Profile sync error:", profileError);
        }

        addNotification('Organisation established successfully.', 'success');
        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
    } catch (err: any) {
        addNotification(err.message || "Registration failed.", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditClick = (org: Organisation) => {
    setEditingOrg({ ...org });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingOrg(null);
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
        addNotification(`Update failed: ${error.message}`, 'error');
    } else {
        addNotification(`Organisation updated.`, 'success');
        fetchOrganisations();
    }
    handleModalClose();
  };

  const handleEditingOrgChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editingOrg) return;
    const { name, value } = e.target;
    setEditingOrg(prev => prev ? { ...prev, [name]: value } : null);
  };

  return (
    <DashboardLayout title="Entity Registry">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card title="Add New Entity">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-orange-500/5 border border-orange-500/10 rounded mb-4">
                 <ShieldCheck className="text-orange-500" size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Assigned Role: Organisation</span>
              </div>
              <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="SSK Samaj..." />
              <Input label="Contact Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="9876543210" />
              <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Full Name" />
              <Input label="Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@org.com" />
              <Input label="Access Password" name="password" type="password" value={newOrg.password} onChange={handleInputChange} placeholder="••••••••" />
              <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-4">
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                {isSubmitting ? 'PROCESSING...' : 'Register Entity'}
              </Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-center mb-6">
                 <h3 className="font-cinzel text-xl text-orange-500">Organisation Registry</h3>
                 <Building2 className="text-gray-800" size={24} />
            </div>
            {loading ? <p className="p-8 text-center animate-pulse text-xs uppercase font-black text-gray-500">Syncing...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-800">
                    <tr>
                      <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Name</th>
                      <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Contact</th>
                      <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Status</th>
                      <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organisations.map(org => (
                      <tr key={org.id} className="border-b border-gray-900 hover:bg-gray-800/30 transition-colors">
                        <td className="p-3 font-bold text-sm">{org.name}</td>
                        <td className="p-3 text-xs text-gray-400 font-mono">{org.mobile}</td>
                        <td className="p-3">
                           <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                               {org.status}
                           </span>
                        </td>
                        <td className="p-3 text-right">
                            <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)}>Edit</Button>
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
      
      <Modal isOpen={isModalOpen} onClose={handleModalClose} title="Modify Entity">
          {editingOrg && (
            <div className="space-y-4">
                <Input label="Name" name="name" value={editingOrg.name} onChange={handleEditingOrgChange} />
                <Input label="Mobile" name="mobile" value={editingOrg.mobile} onChange={handleEditingOrgChange} />
                <Input label="Secretary" name="secretary_name" value={editingOrg.secretary_name} onChange={handleEditingOrgChange} />
                <Select label="Status" name="status" value={editingOrg.status} onChange={handleEditingOrgChange}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                </Select>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="secondary" onClick={handleModalClose}>Cancel</Button>
                    <Button type="button" onClick={handleUpdateOrganisation}>Apply Changes</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;
