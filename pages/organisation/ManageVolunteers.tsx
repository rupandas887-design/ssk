
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useNotification();

  const fetchVolunteers = useCallback(async () => {
    if (!user?.organisationId) return;
    setLoading(true);

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
          organisationName: user.organisationName,
          enrollments: v.members?.length || 0
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
    const trimmedEmail = newVol.email.trim().toLowerCase();
    
    if (!user?.organisationId) {
        addNotification("Organisation context missing. Please re-login.", 'error');
        return;
    }
    if (!trimmedEmail || !newVol.password || !newVol.name || !newVol.mobile) {
        addNotification("All volunteer details are mandatory.", 'error');
        return;
    }

    setIsSubmitting(true);

    // Create Auth User with precise Metadata for the Database Trigger
    const { error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: newVol.password,
      options: {
        data: {
          name: newVol.name.trim(),
          mobile: newVol.mobile.trim(),
          role: 'Volunteer',
          organisation_id: String(user.organisationId)
        }
      }
    });

    if (authError) {
      let msg = authError.message;
      if (msg.includes("Database error saving new user")) {
          msg = "Database sync failure. Verify that your SQL triggers are active and correct.";
      }
      addNotification(msg, 'error');
      setIsSubmitting(false);
      return;
    }
    
    addNotification('Volunteer identity synchronized successfully.', 'success');
    setNewVol({ name: '', mobile: '', email: '', password: '' });
    fetchVolunteers(); 
    setIsSubmitting(false);
  };
  
  const handleToggleAccess = (volunteerId: string) => {
      addNotification(`Access management for ${volunteerId} is restricted in this version.`, 'info');
  }

  return (
    <DashboardLayout title="Manage Volunteers">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card title="Register New Volunteer">
            <div className="space-y-4">
              <Input label="Volunteer Full Name" name="name" value={newVol.name} onChange={handleInputChange} />
              <Input label="Contact Mobile" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} />
              <Input label="Official Email" name="email" type="email" value={newVol.email} onChange={handleInputChange} />
              <Input label="Secure Password" name="password" type="password" value={newVol.password} onChange={handleInputChange} />
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full"
              >
                {isSubmitting ? 'REGISTERING...' : 'Add Volunteer Agent'}
              </Button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card title="Your Organisation's Team">
            {loading ? <p className="p-8 text-center animate-pulse">Syncing agent registry...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="p-2 text-xs uppercase tracking-widest text-gray-500">Name</th>
                    <th className="p-2 text-xs uppercase tracking-widest text-gray-500">Email</th>
                    <th className="p-2 text-xs uppercase tracking-widest text-gray-500 text-center">Enrollments</th>
                    <th className="p-2 text-xs uppercase tracking-widest text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                      <td className="p-2 font-medium">{vol.name}</td>
                      <td className="p-2 text-sm text-gray-400">{vol.email}</td>
                      <td className="p-2 text-center">
                        <span className="bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full border border-orange-500/20 font-black text-xs">
                            {vol.enrollments}
                        </span>
                      </td>
                      <td className="p-2">
                        <Button variant="secondary" size="sm" onClick={() => handleToggleAccess(vol.id)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                  {volunteers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-600 uppercase tracking-widest font-bold text-xs">
                        No active field agents found.
                      </td>
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
