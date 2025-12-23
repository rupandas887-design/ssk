
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Volunteer, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';

type VolunteerWithEnrollments = Volunteer & { enrollments: number };

const ManageVolunteers: React.FC = () => {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerWithEnrollments[]>([]);
  const [newVol, setNewVol] = useState({ name: '', mobile: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  const fetchVolunteers = useCallback(async () => {
    if (!user?.organisationId) return;
    setLoading(true);

    // This RPC is expected to exist in your Supabase to get counts efficiently
    const { data, error } = await supabase
      .rpc('get_volunteers_with_enrollment_counts', {
          org_id: user.organisationId
      });

    if (error) {
      // Fallback if RPC doesn't exist yet
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, members(id)')
        .eq('role', Role.Volunteer)
        .eq('organisation_id', user.organisationId);

      if (profileError) {
        console.error("Error fetching volunteers:", profileError);
        addNotification("Could not fetch volunteers.", 'error');
      } else {
        setVolunteers(profileData.map((v: any) => ({
            id: v.id,
            name: v.name,
            email: v.email,
            mobile: v.mobile,
            role: Role.Volunteer,
            organisationId: v.organisation_id,
            enrollments: v.members?.length || 0
        })) || []);
      }
    } else {
      setVolunteers(data.map((v: any) => ({
          id: v.id,
          name: v.name,
          email: v.email,
          mobile: v.mobile,
          role: Role.Volunteer,
          organisationId: v.organisation_id,
          enrollments: v.enrollments_count
      })) || []);
    }
    setLoading(false);
  }, [user, addNotification]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVol(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVolunteer = async () => {
    if (!user?.organisationId) {
        addNotification("Organisation identity missing.", 'error');
        return;
    }
    if (!newVol.email || !newVol.password || !newVol.name || !newVol.mobile) {
        addNotification("Please fill in all volunteer details.", 'error');
        return;
    }

    // Use metadata options - the SQL trigger will handle the 'profiles' table entry
    const { error: authError } = await supabase.auth.signUp({
      email: newVol.email,
      password: newVol.password,
      options: {
        data: {
          name: newVol.name,
          mobile: newVol.mobile,
          role: Role.Volunteer,
          organisation_id: user.organisationId
        }
      }
    });

    if (authError) {
      addNotification(`Failed to register volunteer: ${authError.message}`, 'error');
      return;
    }
    
    addNotification('Volunteer registered! Profile is being created automatically.', 'success');
    setNewVol({ name: '', mobile: '', email: '', password: '' });
    fetchVolunteers(); 
  };
  
  const handleToggleAccess = (volunteerId: string) => {
      addNotification(`Access controls for volunteers coming soon.`, 'info');
  }

  return (
    <DashboardLayout title="Manage Volunteers">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card title="Register New Volunteer">
            <div className="space-y-4">
              <Input label="Volunteer Name" name="name" value={newVol.name} onChange={handleInputChange} />
              <Input label="Mobile Number" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} />
              <Input label="Email Address" name="email" type="email" value={newVol.email} onChange={handleInputChange} />
              <Input label="Create Password" name="password" type="password" value={newVol.password} onChange={handleInputChange} />
              <Button type="button" onClick={handleAddVolunteer} className="w-full">Register Volunteer</Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Your Volunteer Team">
            {loading ? <p>Loading volunteers...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Enrollments</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                      <td className="p-2 font-medium">{vol.name}</td>
                      <td className="p-2 text-sm text-gray-400">{vol.email}</td>
                      <td className="p-2 text-center">
                        <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded font-bold">{vol.enrollments}</span>
                      </td>
                      <td className="p-2">
                        <Button variant="secondary" size="sm" onClick={() => handleToggleAccess(vol.id)}>Manage</Button>
                      </td>
                    </tr>
                  ))}
                  {volunteers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">No volunteers registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageVolunteers;
