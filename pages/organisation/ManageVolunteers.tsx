import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Volunteer, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { Power, Download, UserPlus, UserCheck, Copy, ShieldCheck, Loader2, UserCircle, Zap, ShieldAlert } from 'lucide-react';

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
          addNotification("Registry sync failed. Check RLS policies.", 'error');
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
        addNotification("Session missing Organisation context.", 'error');
        return;
    }
    if (!email || !password || !name || !mobile) {
        addNotification("Identity parameters incomplete.", 'error');
        return;
    }

    setIsSubmitting(true);

    try {
        // 1. Create Auth Identity
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name,
              mobile: mobile,
              role: 'Volunteer', 
              organisation_id: user.organisationId
            }
          }
        });

        if (authError) throw authError;

        // 2. Immediate Profile Injection (Atomic Sync)
        if (authData.user) {
            const { error: upsertError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: name,
                email: email,
                role: 'Volunteer',
                organisation_id: user.organisationId,
                mobile: mobile,
                status: 'Active'
            });
            if (upsertError) throw upsertError;
        }

        addNotification('Field agent authorized and deployed.', 'success');
        setNewVol({ name: '', mobile: '', email: '', password: '' });
        fetchVolunteers(); 
    } catch (err: any) {
        console.error("Authorization fault:", err);
        addNotification(err.message || "Failed to establish agent identity.", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const copyVolunteerCreds = (v: VolunteerWithEnrollments) => {
      const text = `Agent: ${v.name}\nIdentity: ${v.email}\nSecurity: [Predefined]`;
      navigator.clipboard.writeText(text);
      addNotification("Identity parameters copied.", "success");
  };

  const handleToggleStatus = async (vol: VolunteerWithEnrollments) => {
    const newStatus = vol.status === 'Active' ? 'Deactivated' : 'Active';
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', vol.id);

    if (error) {
        addNotification("Override failed.", 'error');
    } else {
        addNotification(`Agent state set to: ${newStatus}`, 'success');
        fetchVolunteers();
    }
  };

  return (
    <DashboardLayout title="Field Force Command">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Authorization Panel */}
        <div className="lg:col-span-1">
          <Card title="Authorize New Agent" className="relative overflow-hidden border-blue-900/30">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap size={60} />
            </div>
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-4">
                 <ShieldCheck className="text-blue-500" size={24} />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 leading-tight">Identity Tier: Field Operator</span>
              </div>
              
              <Input label="OPERATOR FULL NAME" name="name" value={newVol.name} onChange={handleInputChange} placeholder="Ex: Anil Kumar" className="bg-black/50 border-gray-800 font-mono text-sm" />
              <Input label="REGISTRY MOBILE" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} placeholder="98XXXXXXXX" className="bg-black/50 border-gray-800 font-mono text-sm" />
              <Input label="ACCESS EMAIL" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="agent@ssk.com" className="bg-black/50 border-gray-800 font-mono text-sm" />
              <Input label="SECURITY KEY" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="••••••••" className="bg-black/50 border-gray-800 font-mono text-sm" />
              
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black tracking-[0.4em] uppercase mt-4 shadow-2xl shadow-blue-950/20"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {isSubmitting ? 'DEPLOYING...' : 'Authorize Operator'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Force Registry */}
        <div className="lg:col-span-2">
          <Card className="bg-[#050505] border-white/5">
            <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-500/10 rounded-3xl text-orange-500 border border-orange-500/10">
                        <UserCircle size={28} />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-3xl text-white tracking-tight">Active Force Registry</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Verified Personnel Records</p>
                    </div>
                </div>
                <button 
                  onClick={fetchVolunteers} 
                  className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/40 text-gray-500 hover:text-white transition-all shadow-xl"
                  title="Force Sync"
                >
                    <Download size={20} />
                </button>
            </div>

            {loading ? (
                <div className="p-40 flex flex-col items-center justify-center gap-8">
                    <div className="w-16 h-16 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin"></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-700">Accessing Cloud Registry...</span>
                </div>
            ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black">Operator Identity</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black text-center">Enrollment Matrix</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black text-right">Overrides</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="group border-b border-gray-900/50 hover:bg-white/[0.015] transition-all duration-500">
                      <td className="p-6">
                        <div className="flex flex-col gap-2">
                            <span className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{vol.name}</span>
                            <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                                <span className="text-gray-600">{vol.email}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-800"></span>
                                <span className={`font-black tracking-[0.2em] ${vol.status === 'Active' ? 'text-green-500/60' : 'text-red-500/60'}`}>
                                  {vol.status === 'Active' ? 'OPERATIONAL' : 'DEACTIVATED'}
                                </span>
                            </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem] group-hover:border-orange-500/20 transition-all duration-500">
                            <UserCheck size={18} className="text-orange-500" />
                            <span className="font-black text-xl text-white tracking-tighter">{vol.enrollments}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                            <button 
                                onClick={() => copyVolunteerCreds(vol)}
                                className="p-4 bg-gray-900 border border-white/5 hover:border-orange-500/40 text-gray-600 hover:text-orange-500 rounded-2xl transition-all shadow-2xl"
                                title="Copy Identity Parameters"
                            >
                                <Copy size={18} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                className={`p-4 rounded-2xl border transition-all shadow-2xl ${
                                    vol.status === 'Active' 
                                    ? 'bg-red-500/10 text-red-400 border-red-500/10 hover:bg-red-500/20 hover:border-red-500/30' 
                                    : 'bg-green-500/10 text-green-400 border-green-500/10 hover:bg-green-500/20 hover:border-green-500/30'
                                }`}
                                title={vol.status === 'Active' ? 'Revoke Authorization' : 'Restore Authorization'}
                            >
                                <Power size={18} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {volunteers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-gray-700">
                          <ShieldAlert size={48} strokeWidth={1} />
                          <p className="text-[11px] font-black uppercase tracking-[0.4em]">No Personnel Assigned to This Node</p>
                        </div>
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