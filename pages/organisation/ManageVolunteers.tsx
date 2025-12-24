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
import { Key, Power, Download, UserPlus, UserCheck, Copy, ShieldCheck, Loader2, UserCircle, AlertCircle } from 'lucide-react';

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

    try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, members(id)')
          .eq('role', Role.Volunteer)
          .eq('organisation_id', user.organisationId);

        if (profileError) {
          addNotification("Could not sync force registry.", 'error');
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
    } catch (e) {
        console.error("Fetch Error:", e);
    } finally {
        setLoading(false);
    }
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
        addNotification("Organisation context error.", 'error');
        return;
    }
    if (!email || !password || !name || !mobile) {
        addNotification("All fields are mandatory.", 'error');
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
              organisation_id: user.organisationId // Ensure it's passed clearly
            }
          }
        });

        if (authError) throw authError;

        // Forced Profile Backup: If the trigger is broken, we manually create the profile
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

        addNotification('Agent identity established.', 'success');
        setNewVol({ name: '', mobile: '', email: '', password: '' });
        fetchVolunteers(); 
    } catch (err: any) {
        console.error("Authorization Failure:", err);
        const msg = err.message || "";
        if (msg.includes("Database error") || msg.includes("uuid") || msg.includes("invalid input syntax")) {
            addNotification("Sync Error: Master Admin must run the Final SQL Repair script.", 'error');
        } else {
            addNotification(msg || "Volunteer registration failed.", 'error');
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const copyVolunteerCreds = (v: VolunteerWithEnrollments) => {
      const text = `Agent: ${v.name}\nEmail: ${v.email}\nOrg: ${user?.organisationName}`;
      navigator.clipboard.writeText(text);
      addNotification("Credentials copied to clipboard.", "success");
  };

  const handleToggleStatus = async (vol: VolunteerWithEnrollments) => {
    const newStatus = vol.status === 'Active' ? 'Deactivated' : 'Active';
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', vol.id);

    if (error) {
        addNotification("Update failed.", 'error');
    } else {
        addNotification(`Agent identity ${newStatus === 'Active' ? 'Restored' : 'Locked'}.`, 'success');
        fetchVolunteers();
    }
  };

  return (
    <DashboardLayout title="Field Force Management">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1">
          <Card title="Authorize New Agent">
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-4">
                 <ShieldCheck className="text-blue-500" size={24} />
                 <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400/80 leading-tight">Identity Tier: Field Agent</span>
              </div>
              <Input label="Agent Full Name" name="name" value={newVol.name} onChange={handleInputChange} placeholder="Ex: Anil Kumar" />
              <Input label="Registry Mobile" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} placeholder="98XXXXXXXX" />
              <Input label="Access Email" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="agent@entity.com" />
              <Input label="Security Key" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="••••••••" />
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black tracking-[0.2em] uppercase mt-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {isSubmitting ? 'ESTABLISHING...' : 'Authorize Agent'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl text-gray-400">
                        <UserCircle size={24} />
                    </div>
                    <h3 className="font-cinzel text-3xl text-white">Operational Force</h3>
                </div>
                <button onClick={fetchVolunteers} className="text-gray-600 hover:text-white transition-all p-3.5 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/40">
                    <Download size={20} />
                </button>
            </div>

            {loading ? (
                <div className="p-40 flex flex-col items-center justify-center gap-8">
                    <div className="w-14 h-14 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-600">Accessing personnel...</span>
                </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-6 text-[11px] uppercase tracking-[0.4em] text-gray-500 font-black">Agent Identity</th>
                    <th className="p-6 text-[11px] uppercase tracking-[0.4em] text-gray-500 font-black text-center">Enrollments</th>
                    <th className="p-6 text-[11px] uppercase tracking-[0.4em] text-gray-500 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all duration-500">
                      <td className="p-6">
                        <div className="flex flex-col gap-1">
                            <span className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">{vol.name}</span>
                            <div className="flex items-center gap-3 text-[10px] text-gray-600 font-mono uppercase tracking-tighter">
                                <span>{vol.email}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-800"></span>
                                <span className={`font-black tracking-widest ${vol.status === 'Active' ? 'text-green-500/70' : 'text-red-500/70'}`}>{vol.status}</span>
                            </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl group-hover:border-orange-500/30 transition-colors">
                            <UserCheck size={16} className="text-orange-500" />
                            <span className="font-black text-base text-white">{vol.enrollments}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                                onClick={() => copyVolunteerCreds(vol)}
                                className="p-3.5 bg-gray-900 border border-white/10 hover:border-orange-500/50 text-gray-500 hover:text-orange-500 rounded-xl transition-all shadow-xl"
                                title="Copy Params"
                            >
                                <Copy size={18} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                className={`p-3.5 rounded-xl border transition-all shadow-xl ${
                                    vol.status === 'Active' 
                                    ? 'bg-red-900/10 text-red-400 border-red-900/20 hover:bg-red-900/20' 
                                    : 'bg-green-900/10 text-green-400 border-green-900/20 hover:bg-green-900/20'
                                }`}
                                title={vol.status === 'Active' ? 'Revoke' : 'Restore'}
                            >
                                <Power size={18} />
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