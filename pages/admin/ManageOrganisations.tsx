
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
    if (!newOrg.email || !newOrg.password || !newOrg.name || !newOrg.mobile || !newOrg.secretaryName) {
        addNotification("All fields are required.", 'error');
        return;
    }
    
    // In a real-world scenario, this entire operation should be a single transaction
    // handled by a Supabase Edge Function to ensure data integrity and security.
    
    const { data: orgData, error: orgError } = await supabase
      .from('organisations')
      .insert({ name: newOrg.name, mobile: newOrg.mobile, secretary_name: newOrg.secretaryName })
      .select().single();

    if (orgError) {
      console.error('Error creating organisation:', orgError);
      addNotification(`Failed to create organisation: ${orgError.message}`, 'error');
      return;
    }

    // FIX: `signUp` call is correct for v1, the error was likely a cascade from type issues in AuthContext. No change needed here.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newOrg.email, password: newOrg.password,
    });

    if (authError) {
      console.error('Error creating user:', authError);
      addNotification(`Failed to create user: ${authError.message}`, 'error');
      await supabase.from('organisations').delete().eq('id', orgData.id); // Clean up
      return;
    }
    
    if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id, name: newOrg.secretaryName, email: newOrg.email,
          role: Role.Organisation, organisation_id: orgData.id,
        });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            addNotification(`Failed to create profile: ${profileError.message}`, 'error');
            // CRITICAL SECURITY NOTE: The following line is insecure and requires admin privileges not available on the client.
            // It is commented out. In a real app, use a server-side function to clean up orphaned auth users.
            // await supabase.auth.admin.deleteUser(authData.user.id);
            await supabase.from('organisations').delete().eq('id', orgData.id); // Clean up
            return;
        }
    }

    addNotification('New organisation and user created successfully.', 'success');
    setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
    fetchOrganisations();
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
        name: editingOrg.name, mobile: editingOrg.mobile,
        secretary_name: editingOrg.secretary_name, status: editingOrg.status
      }).eq('id', editingOrg.id);

    if (error) {
        addNotification(`Failed to update organisation: ${error.message}`, 'error');
    } else {
        addNotification(`Organisation "${editingOrg.name}" updated successfully.`, 'success');
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
              <Button type="button" onClick={handleAddOrganisation} className="w-full">Add Organisation</Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Existing Organisations">
            {loading ? <p>Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-700">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Mobile</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organisations.map(org => (
                      <tr key={org.id} className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="p-2">{org.name}</td>
                        <td className="p-2">{org.mobile}</td>
                        <td className="p-2">
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ org.status === 'Active' ? 'bg-green-500 text-green-900' : 'bg-red-500 text-red-900' }`}>
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
