
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
import { ShieldCheck, UserPlus, Building2, Loader2, AlertCircle } from 'lucide-react';

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
      console.error('Error fetching organisations:', error);
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
    const email = newOrg.email.trim().toLowerCase();
    const password = newOrg.password;
    const name = newOrg.name.trim();
    const mobile = newOrg.mobile.trim();
    const secretaryName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secretaryName) {
        addNotification("All fields are required.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        // 1. Create the Organisation entry
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ 
            name: name, 
            mobile: mobile, 
            secretary_name: secretaryName 
          })
          .select().single();

        if (orgError) throw orgError;

        // 2. Create Auth User
        // Passing 'Organisation' directly. The trigger MUST handle the ::uuid cast.
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: secretaryName,
              role: Role.Organisation, // This maps to the string 'Organisation'
              organisation_id: String(orgData.id), // Ensure it's a string
              mobile: mobile
            }
          }
        });

        if (authError) {
          // Cleanup org record if auth fails to avoid orphaned records
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw authError;
        }

        // 3. Defensive Profile Creation (In case Trigger is slow or failing)
        if (authData.user) {
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: secretaryName,
                email: email,
                role: Role.Organisation,
                organisation_id: orgData.id,
                mobile: mobile,
                status: 'Active'
            });
        }

        addNotification('Organisation access terminal initialized.', 'success');
        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
    } catch (err: any) {
        console.error("Organisation Registration Error:", err);
        const errorMessage = err.message || "Identity creation failed.";
        
        if (errorMessage.includes("Database error")) {
            addNotification("Database Sync Error: Please ensure the Supabase Trigger casts organisation_id to UUID.", 'error');
        } else {
            addNotification(errorMessage, 'error');
        }
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
        addNotification(`Organisation configuration updated.`, 'success');
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
    <DashboardLayout title="Entity Administration">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <Card title="Initialize New Entity">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-orange-500/5 border border-orange-500/10 rounded mb-4">
                 <ShieldCheck className="text-orange-500" size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Security Clearance: Organisation</span>
              </div>
              <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="SSK Samaj..." />
              <Input label="Primary Contact Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="9876543210" />
              <Input label="Admin / Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Full Name" />
              <Input label="System Login Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@entity.com" />
              <Input label="Access Secret (Password)" name="password" type="password" value={newOrg.password} onChange={handleInputChange} placeholder="••••••••" />
              <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-4 flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {isSubmitting ? 'SYNCHRONIZING...' : 'Establish Connection'}
              </Button>
            </div>
          </Card>

          <div className="mt-8 p-6 bg-orange-950/10 border border-orange-900/20 rounded-xl">
             <div className="flex items-center gap-2 text-orange-400 mb-3">
                <AlertCircle size={18} />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Technical Briefing</h4>
             </div>
             <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-widest">
                Each organisation receives a unique UUID linked to its registry entry. Field agents added by an entity will automatically inherit its hierarchy permissions.
             </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-center mb-6">
                 <h3 className="font-cinzel text-xl text-orange-500">Registry Snapshot</h3>
                 <Building2 className="text-gray-800" size={24} />
            </div>
            {loading ? (
                <div className="p-20 flex justify-center">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-800">
                    <tr>
                      <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Entity Identity</th>
                      <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Secure Mobile</th>
                      <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Operational Status</th>
                      <th className="p-4 text-right text-[10px] uppercase tracking-widest text-gray-500 font-black">Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organisations.map(org => (
                      <tr key={org.id} className="border-b border-gray-900 hover:bg-gray-800/30 transition-colors">
                        <td className="p-4">
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-white">{org.name}</span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{org.secretary_name}</span>
                            </div>
                        </td>
                        <td className="p-4 text-xs text-gray-400 font-mono tracking-tighter">{org.mobile}</td>
                        <td className="p-4">
                           <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                               {org.status}
                           </span>
                        </td>
                        <td className="p-4 text-right">
                            <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)} className="text-[10px] uppercase tracking-widest">Modify</Button>
                        </td>
                      </tr>
                    ))}
                    {organisations.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-20 text-center text-gray-600 uppercase tracking-[0.3em] font-black text-[10px]">Registry Empty. No entities established.</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={handleModalClose} title="Modify Entity Profile">
          {editingOrg && (
            <div className="space-y-4">
                <Input label="Organisation Name" name="name" value={editingOrg.name} onChange={handleEditingOrgChange} />
                <Input label="Organisation Mobile" name="mobile" value={editingOrg.mobile} onChange={handleEditingOrgChange} />
                <Input label="Secretary Name" name="secretary_name" value={editingOrg.secretary_name} onChange={handleEditingOrgChange} />
                <Select label="Entity Status" name="status" value={editingOrg.status} onChange={handleEditingOrgChange}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                </Select>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="secondary" onClick={handleModalClose}>Cancel</Button>
                    <Button type="button" onClick={handleUpdateOrganisation}>Commit Profile Update</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;
