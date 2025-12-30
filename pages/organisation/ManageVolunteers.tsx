
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Volunteer, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { 
  Power, 
  Download, 
  UserPlus, 
  UserCheck, 
  Copy, 
  ShieldCheck, 
  Loader2, 
  UserCircle, 
  Zap, 
  RefreshCw, 
  Activity,
  FileSpreadsheet
} from 'lucide-react';

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
          .eq('role', 'Volunteer')
          .eq('organisation_id', user.organisationId);

        if (profileError) throw profileError;
        
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
    } catch (e: any) {
        console.error("Volunteer Fetch Error:", e);
        addNotification(`Registry error: ${e.message}`, 'error');
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

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Mobile', 'Enrollments', 'Status'];
    const rows = volunteers.map(v => [
        v.name,
        v.email,
        v.mobile,
        v.enrollments,
        v.status
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Volunteers_List_${user?.organisationName || 'Sector'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleAddVolunteer = async () => {
    const email = newVol.email.trim().toLowerCase();
    const password = newVol.password;
    const name = newVol.name.trim();
    const mobile = newVol.mobile.trim();
    
    if (!user?.organisationId) {
        addNotification("Session context lost.", 'error');
        return;
    }
    if (!email || !password || !name || !mobile) {
        addNotification("Incomplete identity data.", 'error');
        return;
    }

    setIsSubmitting(true);
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              mobile,
              role: 'Volunteer', 
              organisation_id: user.organisationId
            }
          }
        });

        if (authError) throw authError;
        
        if (authData?.user?.id) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name,
                email,
                role: 'Volunteer',
                organisation_id: user.organisationId,
                mobile,
                status: 'Active'
            });
            
            if (profileError) throw profileError;

            addNotification('Agent authorized and added to registry.', 'success');
            setNewVol({ name: '', mobile: '', email: '', password: '' });
            fetchVolunteers(); 
        }
    } catch (err: any) {
        console.error("Agent Authorization Error:", err);
        addNotification(err.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const copyVolunteerCreds = (v: VolunteerWithEnrollments) => {
      const text = `Agent Identity: ${v.name} | ${v.email}`;
      navigator.clipboard.writeText(text);
      addNotification("Identity copied.", "success");
  };

  const handleToggleStatus = async (vol: VolunteerWithEnrollments) => {
    const newStatus = vol.status === 'Active' ? 'Deactivated' : 'Active';
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', vol.id);

    if (error) {
        addNotification(`Status update failed.`, 'error');
    } else {
        addNotification(`Operator status set to ${newStatus}.`, 'success');
        fetchVolunteers();
    }
  };

  return (
    <DashboardLayout title="Field Force Command">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorize New Agent" className="relative overflow-hidden border-blue-900/30 bg-[#020202]/80">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Zap size={100} />
            </div>
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl mb-4">
                 <ShieldCheck className="text-blue-500" size={24} />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 leading-tight">Identity Tier</span>
                    <span className="text-xs font-bold text-white uppercase">Field Operator</span>
                 </div>
              </div>
              
              <Input label="FULL NAME" name="name" value={newVol.name} onChange={handleInputChange} placeholder="Ex: Rahul S" />
              <Input label="MOBILE IDENTITY" name="mobile" type="tel" value={newVol.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" />
              <Input label="ACCESS EMAIL" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="agent@ssk.com" />
              <Input label="SECURITY KEY" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="Min 6 characters" />
              
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.4em]"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {isSubmitting ? 'AUTHORIZING...' : 'Authorize Operator'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="bg-[#050505] border-white/5 h-full">
            <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-500/10 rounded-3xl text-orange-500 border border-orange-500/10">
                        <UserCircle size={28} />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-3xl text-white tracking-tight">Active Force Registry</h3>
                      <div className="flex items-center gap-2 mt-1">
                          <Activity size={12} className="text-green-500 animate-pulse" />
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Live Node Sync Active</span>
                      </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button 
                      onClick={handleExport}
                      className="p-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all shadow-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      title="Download Volunteers CSV"
                    >
                        <FileSpreadsheet size={20} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button 
                      onClick={fetchVolunteers} 
                      className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/40 text-gray-500 hover:text-white transition-all shadow-xl"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black">Operator Node</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black text-center">Enrollments</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black text-right">Terminal Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="p-20 text-center animate-pulse uppercase tracking-[0.5em] text-[10px] text-gray-700 font-black">Syncing Node Data...</td></tr>
                  ) : (
                  <>
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="group border-b border-gray-900/50 hover:bg-white/[0.015] transition-all">
                      <td className="p-6">
                        <div className="flex flex-col gap-2">
                            <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{vol.name}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-600 font-mono tracking-tight">{vol.email}</span>
                                <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                                <span className="text-[10px] text-gray-600 font-mono tracking-tight">{vol.mobile}</span>
                            </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem]">
                            <UserCheck size={18} className="text-orange-500" />
                            <span className="font-black text-xl text-white tracking-tighter">{vol.enrollments}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                            <button onClick={() => copyVolunteerCreds(vol)} className="p-4 bg-gray-950 border border-white/5 text-gray-600 hover:text-orange-500 rounded-2xl transition-all">
                                <Copy size={18} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                className={`p-4 rounded-2xl border transition-all ${vol.status === 'Active' ? 'text-red-400 border-red-500/10 bg-red-500/5' : 'text-green-400 border-green-500/10 bg-green-500/5'}`}
                            >
                                <Power size={18} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {volunteers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-32 text-center text-gray-800 uppercase tracking-widest font-black text-[11px]">
                            No authorized field agents detected in this sector.
                        </td>
                      </tr>
                  )}
                  </>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageVolunteers;
