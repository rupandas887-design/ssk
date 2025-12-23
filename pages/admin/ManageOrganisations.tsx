
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
    const trimmedEmail = newOrg.email.trim().toLowerCase();
    
    if (!trimmedEmail || !newOrg.password || !newOrg.name || !newOrg.mobile || !newOrg.secretaryName) {
        addNotification("All fields are required.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    
    // 1. Create the Organisation entry
    const { data: orgData, error: orgError } = await supabase
      .from('organisations')
      .insert({ 
        name: newOrg.name.trim(), 
        mobile: newOrg.mobile.trim(), 
        secretary_name: newOrg.secretaryName.trim() 
      })
      .select().single();

    if (orgError) {
      addNotification(`Failed to create organisation: ${orgError.message}`, 'error');
      setIsSubmitting(false);
      return;
    }

    // 2. Create Auth User with Explicit Metadata
    // Note: We force organisation_id to a string to ensure it's passed correctly to the trigger
    const { error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: newOrg.password,
      options: {
        data: {
          name: newOrg.secretaryName.trim(),
          role: 'Organisation', 
          organisation_id: String(orgData.id),
          mobile: newOrg.mobile.trim()
        }
      }
    });

    if (authError) {
      // If auth fails, try to clean up the orphaned organisation record
      await supabase.from('organisations').delete().eq('id', orgData.id);
      
      let msg = authError.message;
      if (msg.includes("Database error saving new user")) {
          msg = "Critical database sync error. Please check your SQL Trigger configuration.";
      }
      addNotification(msg, 'error');
      setIsSubmitting(false);
      return;
    }

    addNotification('Organisation identity established successfully!', 'success');
    setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
    fetchOrganisations();
    setIsSubmitting(false);
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
        addNotification(`Organisation updated successfully.`, 'success');
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
    <DashboardLayout title="Manage Organisations">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card title="Add New Organisation">
            <div className="space-y-4">
              <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} />
              <Input label="Organisation Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} />
              <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} />
              <Input label="Login Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} />
              <Input label="Predefined Password" name="password" type="password" value={newOrg.password} onChange={handleInputChange} />
              <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'ESTABLISHING...' : 'Add Organisation'}
              </Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Existing Organisations">
            {loading ? <p className="p-8 text-center animate-pulse">Scanning Registry...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="p-2 text-[10px] uppercase tracking-widest text-gray-500">Name</th>
                      <th className="p-2 text-[10px] uppercase tracking-widest text-gray-500">Mobile</th>
                      <th className="p-2 text-[10px] uppercase tracking-widest text-gray-500">Status</th>
                      <th className="p-2 text-[10px] uppercase tracking-widest text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organisations.map(org => (
                      <tr key={org.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                        <td className="p-2 font-medium">{org.name}</td>
                        <td className="p-2 text-sm text-gray-400 font-mono">{org.mobile}</td>
                        <td className="p-2">
                           <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' }`}>
                               {org.status}
                           </span>
                        </td>
                        <td className="p-2">
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
      
      <Modal isOpen={isModalOpen} onClose={handleModalClose} title="Edit Organisation">
          {editingOrg && (
            <div className="space-y-4">
                <Input label="Organisation Name" name="name" value={editingOrg.name} onChange={handleEditingOrgChange} />
                <Input label="Organisation Mobile" name="mobile" value={editingOrg.mobile} onChange={handleEditingOrgChange} />
                <Input label="Secretary Name" name="secretary_name" value={editingOrg.secretary_name} onChange={handleEditingOrgChange} />
                <Select label="Status" name="status" value={editingOrg.status} onChange={handleEditingOrgChange}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                </Select>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="secondary" onClick={handleModalClose}>Cancel</Button>
                    <Button type="button" onClick={handleUpdateOrganisation}>Save Changes</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;
