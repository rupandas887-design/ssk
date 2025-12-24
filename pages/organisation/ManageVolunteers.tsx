
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Volunteer, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { Key, Power, Download, UserPlus, UserCheck, ShieldAlert, Copy, ShieldCheck, Loader2 } from 'lucide-react';

type VolunteerWithEnrollments = Volunteer & { enrollments: number };

const ManageVolunteers: React.FC = () => {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerWithEnrollments[]>([]);
  const [newVol, setNewVol] = useState({ name: '', mobile: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useNotification();

  const [selectedVol, setSelectedVol] = useState<VolunteerWithEnrollments | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const fetchVolunteers = useCallback(async () => {
    if (!user?.organisationId) return;
    setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*, members(id)')
      .eq('role', Role.Volunteer)
      .eq('organisation_id', user.organisationId);

    if (profileError) {
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
          status: v.status || 'Active',
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
    const email = newVol.email.trim().toLowerCase();
    const password = newVol.password;
    const name = newVol.name.trim();
    const mobile = newVol.mobile.trim();
    
    if (!user?.organisationId) {
        addNotification("Organisation context missing.", 'error');
        return;
    }
    if (!email || !password || !name || !mobile) {
        addNotification("All fields are required.", 'error');
        return;
    }

    setIsSubmitting(true);

    try {
        // Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name,
              mobile: mobile,
              role: Role.Volunteer, 
              organisation_id: user.organisationId
            }
          }
        });

        if (authError) throw authError;

        // Forced Profile Sync for reliability
        if (authData.user) {
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: name,
                email: email,
                role: Role.Volunteer,
                organisation_id: user.organisationId,
                mobile: mobile,
                status: 'Active'
            });
        }

        addNotification('Field agent registered successfully.', 'success');
        setNewVol({ name: '', mobile: '', email: '', password: '' });
        fetchVolunteers(); 
    } catch (err: any) {
        console.error("Volunteer Registration Error:", err);
        addNotification(err.message || "Volunteer registration failed.", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const copyVolunteerCreds = (v: VolunteerWithEnrollments) => {
      const text = `Agent: ${v.name}\nLogin: ${v.email}\nOrg: ${user?.organisationName}`;
      navigator.clipboard.writeText(text);
      addNotification("Agent info copied.", "success");
  };

  const handleToggleStatus = async (vol: VolunteerWithEnrollments) => {
    const newStatus = vol.status === 'Active' ? 'Deactivated' : 'Active';
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', vol.id);

    if (error) {
        addNotification("Failed to update status.", 'error');
    } else {
        addNotification(`Volunteer ${newStatus}.`, 'success');
        fetchVolunteers();
    }
  };

  return (
    <DashboardLayout title="Agent Registry">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card title="Register Field Agent">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded mb-4">
                 <ShieldCheck className="text-blue-500" size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Target Role: Volunteer</span>
              </div>
              <Input label="Agent Name" name="name" value={newVol.name} onChange={handleInputChange} placeholder="Ex: Anil Kumar" />
              <Input label="Mobile Number" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} placeholder="10-digit number" />
              <Input label="Agent Email" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="agent@ssk.com" />
              <Input label="Initial Password" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="••••••••" />
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full h-12 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {isSubmitting ? 'PROCESSING...' : 'Register Agent'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-cinzel text-xl text-orange-500">Active Field Force</h3>
                <button onClick={fetchVolunteers} className="text-gray-600 hover:text-white transition-colors">
                    <Download size={18} />
                </button>
            </div>

            {loading ? <p className="p-12 text-center animate-pulse text-gray-500 uppercase tracking-widest font-black text-xs">Syncing Registry...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Agent Details</th>
                    <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Status</th>
                    <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500 text-center">Drive Progress</th>
                    <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="border-b border-gray-900 hover:bg-gray-800/50 transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">{vol.name}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{vol.mobile}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            vol.status === 'Active' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            {vol.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/5 border border-orange-500/10 rounded">
                            <UserCheck size={12} className="text-orange-500" />
                            <span className="font-black text-xs text-orange-400">{vol.enrollments}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => copyVolunteerCreds(vol)}
                                className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded transition-colors"
                            >
                                <Copy size={14} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                className={`p-2 rounded transition-colors ${
                                    vol.status === 'Active' 
                                    ? 'bg-red-900/10 text-red-400' 
                                    : 'bg-green-900/10 text-green-400'
                                }`}
                            >
                                <Power size={14} />
                            </button>
                        </div>
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
