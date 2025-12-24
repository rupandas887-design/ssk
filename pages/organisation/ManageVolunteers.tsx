
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
              role: 'Volunteer', 
              organisation_id: String(user.organisationId) // Cast to string for metadata
            }
          }
        });

        if (authError) throw authError;

        // Forced Profile Sync for reliability against trigger failure
        if (authData.user) {
            await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: name,
                email: email,
                role: 'Volunteer',
                organisation_id: user.organisationId,
                mobile: mobile,
                status: 'Active'
            });
        }

        addNotification('Field agent successfully authorized.', 'success');
        setNewVol({ name: '', mobile: '', email: '', password: '' });
        fetchVolunteers(); 
    } catch (err: any) {
        console.error("Volunteer Authorization Error:", err);
        const msg = err.message || "";
        if (msg.includes("Database error")) {
            addNotification("Database Sync Failure: Please notify the Master Admin to run the SQL Repair script.", 'error');
        } else {
            addNotification(msg || "Volunteer registration failed.", 'error');
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const copyVolunteerCreds = (v: VolunteerWithEnrollments) => {
      const text = `Agent: ${v.name}\nLogin: ${v.email}\nOrg: ${user?.organisationName}`;
      navigator.clipboard.writeText(text);
      addNotification("Agent credentials copied.", "success");
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
        addNotification(`Volunteer identity ${newStatus === 'Active' ? 'Restored' : 'Locked'}.`, 'success');
        fetchVolunteers();
    }
  };

  return (
    <DashboardLayout title="Field Force Registry">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <Card title="Authorize New Agent">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl mb-4">
                 <ShieldCheck className="text-blue-500" size={20} />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 leading-tight">Identity Tier: Field Agent</span>
              </div>
              <Input label="Agent Full Name" name="name" value={newVol.name} onChange={handleInputChange} placeholder="Ex: Anil Kumar" />
              <Input label="Registry Mobile" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} placeholder="98XXXXXXXX" />
              <Input label="Access Email" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="agent@entity.com" />
              <Input label="Security Key" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="••••••••" />
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full py-4 flex items-center justify-center gap-2 text-xs font-black tracking-widest uppercase mt-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {isSubmitting ? 'ESTABLISHING...' : 'Authorize Agent'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-cinzel text-2xl text-white">Active Field Force</h3>
                <button onClick={fetchVolunteers} className="text-gray-600 hover:text-white transition-colors p-2 bg-white/5 rounded-lg border border-white/5">
                    <Download size={18} />
                </button>
            </div>

            {loading ? (
                <div className="p-32 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-orange-500" size={40} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Syncing Force Registry...</span>
                </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">Agent Details</th>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">Status</th>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black text-center">Enrollments</th>
                    <th className="p-4 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="border-b border-gray-900/50 hover:bg-white/5 transition-all duration-300">
                      <td className="p-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">{vol.name}</span>
                            <span className="text-[10px] text-gray-600 font-mono uppercase">{vol.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            vol.status === 'Active' 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                            {vol.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                            <UserCheck size={12} className="text-orange-500" />
                            <span className="font-black text-xs text-white">{vol.enrollments}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => copyVolunteerCreds(vol)}
                                className="p-2 bg-gray-900 border border-white/5 hover:border-orange-500/30 text-gray-500 hover:text-orange-500 rounded-lg transition-all"
                                title="Copy Credentials"
                            >
                                <Copy size={14} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                className={`p-2 rounded-lg border transition-all ${
                                    vol.status === 'Active' 
                                    ? 'bg-red-900/10 text-red-400 border-red-900/20 hover:bg-red-900/20' 
                                    : 'bg-green-900/10 text-green-400 border-green-900/20 hover:bg-green-900/20'
                                }`}
                                title={vol.status === 'Active' ? 'Lock Identity' : 'Unlock Identity'}
                            >
                                <Power size={14} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {volunteers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-32 text-center text-gray-700 uppercase tracking-[0.3em] font-black text-[10px]">No agents found.</td>
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
