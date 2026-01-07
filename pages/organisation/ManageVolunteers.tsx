
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Volunteer, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { syncToSheets, SheetType } from '../../services/googleSheets';
import { 
  Power, 
  UserPlus, 
  UserCheck, 
  Copy, 
  ShieldCheck, 
  Loader2, 
  UserCircle, 
  Zap, 
  RefreshCw, 
  Activity,
  FileSpreadsheet,
  Search,
  Filter
} from 'lucide-react';

type VolunteerWithEnrollments = Volunteer & { enrollments: number };

const supabaseUrl = "https://baetdjjzfqupdzsoecph.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZXRkamp6ZnF1cGR6c29lY3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzEwMTYsImV4cCI6MjA4MjA0NzAxNn0.MYrwQ7E4HVq7TwXpxum9ZukIz4ZAwyunlhpkwkpZ-bo";

const ManageVolunteers: React.FC = () => {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerWithEnrollments[]>([]);
  const [newVol, setNewVol] = useState({ name: '', mobile: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
        addNotification(`Uplink Error: ${e.message}`, 'error');
    } finally {
        setLoading(false);
    }
  }, [user, addNotification]);

  useEffect(() => {
    fetchVolunteers();
  }, [fetchVolunteers]);

  // Search Logic
  const filteredVolunteers = useMemo(() => {
    if (!searchTerm.trim()) return volunteers;
    const term = searchTerm.toLowerCase().trim();
    return volunteers.filter(v => 
      v.name.toLowerCase().includes(term) || 
      v.mobile?.includes(term)
    );
  }, [volunteers, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVol(prev => ({ ...prev, [name]: value }));
  };

  const handleExport = () => {
    const headers = ['Agent Name', 'Email', 'Mobile', 'Enrollments', 'Status'];
    // Export filtered results instead of full list for better UX
    const rows = filteredVolunteers.map(v => [v.name, v.email, v.mobile, v.enrollments, v.status]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Agent_Registry_${user?.organisationName || 'Organization'}.csv`;
    link.click();
  };

  const copyVolunteerCreds = (vol: VolunteerWithEnrollments) => {
    const creds = `Login Email: ${vol.email}\nStatus: ${vol.status}`;
    navigator.clipboard.writeText(creds).then(() => {
      addNotification('Agent credentials copied to clipboard.', 'info');
    });
  };

  const handleToggleStatus = async (vol: VolunteerWithEnrollments) => {
    const newStatus = vol.status === 'Active' ? 'Deactivated' : 'Active';
    const confirmMsg = newStatus === 'Deactivated' 
        ? `Are you sure you wish to Deactivate Agent "${vol.name}"? This will suspend their field access.`
        : `Activate Agent "${vol.name}"?`;
        
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', vol.id);

      if (error) throw error;
      addNotification(`Agent status updated to ${newStatus}.`, 'success');
      fetchVolunteers();
    } catch (e: any) {
      addNotification(`Status update failed: ${e.message}`, 'error');
    }
  };

  const handleAddVolunteer = async () => {
    const email = newVol.email.trim().toLowerCase();
    const password = newVol.password;
    const name = newVol.name.trim();
    const mobile = newVol.mobile.trim();
    
    if (!user?.organisationId) return;
    if (!email || !password || !name || !mobile) {
        addNotification("Incomplete identity data.", 'error');
        return;
    }

    setIsSubmitting(true);
    try {
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        });

        const { data: authData, error: authError } = await authClient.auth.signUp({
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

            await syncToSheets(SheetType.VOLUNTEERS, {
              name, email, mobile,
              organisation_name: user.organisationName,
              status: 'Active',
              authorized_date: new Date().toLocaleDateString()
            });

            addNotification('Agent authorized successfully.', 'success');
            setNewVol({ name: '', mobile: '', email: '', password: '' });
            fetchVolunteers(); 
        }
    } catch (err: any) {
        addNotification(err.message, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Agent Authorization Hub">
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
              <Input label="ACCESS EMAIL" name="email" type="email" value={newVol.email} onChange={handleInputChange} placeholder="agent@org.com" />
              <Input label="SECURITY KEY" name="password" type="password" value={newVol.password} onChange={handleInputChange} placeholder="Min 6 characters" />
              
              <Button 
                type="button" 
                onClick={handleAddVolunteer} 
                disabled={isSubmitting} 
                className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.4em]"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {isSubmitting ? 'AUTHORIZING...' : 'Authorize Agent'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="bg-[#050505] border-white/5 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-500/10 rounded-3xl text-orange-500 border border-orange-500/10">
                        <UserCircle size={28} />
                    </div>
                    <div>
                      <h3 className="font-cinzel text-3xl text-white tracking-tight">Active Agent Registry</h3>
                      <div className="flex items-center gap-2 mt-1">
                          <Activity size={12} className="text-green-500 animate-pulse" />
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Network Node Active</span>
                      </div>
                    </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                    <button onClick={handleExport} className="flex-1 sm:flex-none p-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all shadow-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        <FileSpreadsheet size={20} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button onClick={fetchVolunteers} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/40 text-gray-500 hover:text-white transition-all shadow-xl">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Search Filter Node */}
            <div className="mb-8 p-6 bg-black/40 border border-white/5 rounded-[2rem] shadow-inner relative overflow-hidden group">
                <div className="flex items-center gap-3 mb-4 text-gray-500">
                    <Filter size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Query Parameters</span>
                </div>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/50 group-focus-within:text-orange-500 transition-colors">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search Identity by Name or Mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/60 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500/40 focus:border-orange-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black">Personnel Node</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black text-center">Enrollments</th>
                    <th className="p-6 text-[10px] uppercase tracking-[0.4em] text-gray-500 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="p-20 text-center text-[10px] font-black uppercase tracking-[0.5em] text-gray-600 animate-pulse">Syncing...</td>
                    </tr>
                  ) : filteredVolunteers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-20 text-center text-[10px] font-black uppercase tracking-[0.5em] text-gray-700 italic">No matching personnel records detected.</td>
                    </tr>
                  ) : filteredVolunteers.map(vol => (
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
                        <div className="flex justify-end gap-3 transition-all duration-500">
                            <button onClick={() => copyVolunteerCreds(vol)} className="p-4 bg-gray-950 border border-white/5 text-gray-600 hover:text-orange-500 rounded-2xl transition-all" title="Copy Credentials">
                                <Copy size={18} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                className={`p-4 rounded-2xl border transition-all ${vol.status === 'Active' ? 'text-red-400 border-red-500/10 bg-red-500/5' : 'text-green-400 border-green-500/10 bg-green-500/5'}`}
                                title={vol.status === 'Active' ? 'Deactivate Node' : 'Activate Node'}
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
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageVolunteers;
