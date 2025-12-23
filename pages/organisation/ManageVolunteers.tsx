
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

    const { data, error } = await supabase
      .rpc('get_volunteers_with_enrollment_counts', {
          org_id: user.organisationId
      });

    if (error) {
      console.error("Error fetching volunteers:", error);
      addNotification("Could not fetch volunteers.", 'error');
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
        addNotification("Cannot register volunteer: your organisation is not identified.", 'error');
        return;
    }
    if (!newVol.email || !newVol.password || !newVol.name || !newVol.mobile) {
        addNotification("All fields are required.", 'error');
        return;
    }

    // FIX: `signUp` call is correct for v1, the error was likely a cascade from type issues in AuthContext. No change needed here.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newVol.email,
      password: newVol.password,
    });

    if (authError) {
      console.error('Error creating volunteer user:', authError);
      addNotification(`Failed to create user: ${authError.message}`, 'error');
      return;
    }
    
    if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          name: newVol.name,
          email: newVol.email,
          mobile: newVol.mobile,
          role: Role.Volunteer,
          organisation_id: user.organisationId,
        });

        if (profileError) {
            console.error('Error creating volunteer profile:', profileError);
            addNotification(`Failed to create profile: ${profileError.message}`, 'error');
            // CRITICAL SECURITY NOTE: The following line is insecure and requires admin privileges not available on the client.
            // It is commented out. In a real app, use a server-side function to clean up orphaned auth users.
            // await supabase.auth.admin.deleteUser(authData.user.id);
            return;
        }
    }

    addNotification('New volunteer registered successfully.', 'success');
    setNewVol({ name: '', mobile: '', email: '', password: '' });
    fetchVolunteers(); // Refresh the list
  };
  
  const handleToggleAccess = (volunteerId: string) => {
      addNotification(`Toggled access for volunteer (simulated).`, 'info');
  }

  return (
    <DashboardLayout title="Manage Volunteers">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card title="Register New Volunteer">
            <div className="space-y-4">
              <Input label="Volunteer Name" name="name" value={newVol.name} onChange={handleInputChange} />
              <Input label="Mobile Number" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} />
              <Input label="Email" name="email" type="email" value={newVol.email} onChange={handleInputChange} />
              <Input label="Password" name="password" type="password" value={newVol.password} onChange={handleInputChange} />
              <Button type="button" onClick={handleAddVolunteer} className="w-full">Register Volunteer</Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Your Volunteers">
            {loading ? <p>Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Mobile</th>
                    <th className="p-2">Enrollments</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="p-2">{vol.name}</td>
                      <td className="p-2">{vol.email}</td>
                      <td className="p-2">{vol.mobile}</td>
                      <td className="p-2 font-bold text-orange-400">{vol.enrollments}</td>
                      <td className="p-2">
                        <Button variant="secondary" size="sm" onClick={() => handleToggleAccess(vol.id)}>Toggle Access</Button>
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
    </DashboardLayout>
  );
};

export default ManageVolunteers;
