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
import { ShieldCheck, UserPlus, Building2, Loader2, Settings, ShieldAlert, Zap, Copy, Info } from 'lucide-react';

const ManageOrganisations: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [newOrg, setNewOrg] = useState({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSqlFix, setShowSqlFix] = useState(false);
  
  const { addNotification } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('organisations').select('*').order('name');
    if (error) {
      console.error('Error fetching organisations:', error);
      if (error.message.includes('recursion')) {
          setShowSqlFix(true);
          addNotification('Security Protocol Conflict: Infinite RLS Recursion detected.', 'error');
      } else {
          addNotification('Could not fetch organisations.', 'error');
      }
    } else {
      setOrganisations(data || []);
      setShowSqlFix(false);
    }
    setLoading(false);
  }, [addNotification]);

  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

  const sqlFixCode = `-- RECURSION REPAIR PROTOCOL (Run in Supabase SQL Editor)
-- 1. Create a Security Definer function to break the RLS loop
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  -- SECURITY DEFINER bypasses RLS to break recursion
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Apply non-recursive policies
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Admins have full access" 
ON public.profiles FOR ALL 
USING (public.get_my_role() = 'MasterAdmin');`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlFixCode);
    addNotification("Recursion Repair Script copied to clipboard.", "success");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOrg(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrganisation = async () => {
    const email = newOrg.email.trim().toLowerCase();
    const password = newOrg.password;
    const name = newOrg.name.trim();
    const mobile = newOrg.mobile.trim();
    const secretaryName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secretaryName) {
        addNotification("All fields are mandatory.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ name, mobile, secretary_name: secretaryName })
          .select().single();

        if (orgError) throw orgError;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: secretaryName,
              role: 'Organisation',
              organisation_id: orgData.id,
              mobile
            }
          }
        });

        if (authError) {
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw authError;
        }

        if (authData.user) {
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name: secretaryName,
                email,
                role: 'Organisation',
                organisation_id: orgData.id,
                mobile,
                status: 'Active'
            });

            if (profileError && profileError.message.includes('recursion')) {
                setShowSqlFix(true);
            }
        }

        addNotification('Organisation authorized successfully.', 'success');
        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
    } catch (err: any) {
        console.error("Master Registration Failure:", err);
        if (err.message.includes('recursion')) {
            setShowSqlFix(true);
            addNotification("Security conflict: Infinite recursion detected.", 'error');
        } else {
            addNotification(err.message || "Authorization sequence interrupted.", 'error');
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditClick = (org: Organisation) => {
    setEditingOrg({ ...org });
    setIsModalOpen(true);
  };

  const handleUpdateOrganisation = async () => {
    if (!editingOrg) return;
    const { error } = await supabase.from('organisations').update({
        name: editingOrg.name, 
        mobile: editingOrg.mobile,
        secretary_name: editingOrg.secretary_name, 
        status: editingOrg.status
    }).eq('id', editingOrg.id);

    if (error) {
        addNotification(`Update failed: ${error.message}`, 'error');
    } else {
        addNotification(`Registry entry updated.`, 'success');
        fetchOrganisations();
        setIsModalOpen(false);
    }
  };

  return (
    <DashboardLayout title="Entity Administration">
      <div className="space-y-12">
        {showSqlFix && (
          <div className="bg-[#050000] border border-red-500/40 rounded-[2.5rem] p-10 animate-in fade-in slide-in-from-top-10 duration-700 shadow-[0_0_80px_-20px_rgba(239,68,68,0.5)] relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <ShieldAlert size={160} className="text-red-500" />
             </div>
             <div className="flex flex-col lg:flex-row items-start gap-10 relative z-10">
                <div className="p-7 bg-red-500/10 rounded-[2rem] text-red-500 border border-red-500/20 shadow-2xl">
                    <Zap size={56} strokeWidth={1} className="animate-pulse" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-4 w-4 rounded-full bg-red-500 animate-ping"></div>
                        <h3 className="font-cinzel text-3xl text-red-400 tracking-[0.1em] uppercase">RLS Recursion Conflict</h3>
                    </div>
                    <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-4xl">
                        Your database policies are caught in an infinite loop. This happens when the <b className="text-white">profiles</b> table tries to query itself to verify your permissions.
                        <br/><br/>
                        <span className="text-red-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                           <Info size={14} /> Resolution Protocol:
                        </span>
                        Copy the script below and run it in your <b>Supabase SQL Editor</b> to create a non-recursive security helper.
                    </p>
                    <div className="relative group">
                        <div className="bg-black/95 rounded-[2rem] border border-gray-800 overflow-hidden shadow-2xl">
                            <div className="bg-gray-900 px-8 py-3 flex items-center justify-between border-b border-gray-800">
                                <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">Recursion Repair Script</span>
                            </div>
                            <pre className="p-8 font-mono text-[11px] text-red-400/90 overflow-x-auto whitespace-pre-wrap max-h-[400px] scrollbar-hide">
                                {sqlFixCode}
                            </pre>
                        </div>
                        <button 
                            onClick={copySql}
                            className="absolute bottom-8 right-8 p-6 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.5)] flex items-center gap-4 text-xs font-black uppercase tracking-widest border border-white/10 active:scale-95 group-hover:scale-105"
                        >
                            <Copy size={20} />
                            <span>Copy Repair Script</span>
                        </button>
                    </div>
                </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1">
                <Card title="Authorize New Entity">
                    <div className="space-y-6">
                        <div className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl mb-2 flex items-center gap-4">
                             <ShieldCheck className="text-orange-500" size={28} />
                             <span className="text-[11px] font-black uppercase tracking-[0.3em] text-orange-400/80 leading-tight">Identity Tier:<br/>Organisation Admin</span>
                        </div>
                        <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="SSK Samaj Hubli" />
                        <Input label="Registry Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="98XXXXXXXX" />
                        <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Full Name" />
                        <Input label="Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@entity.com" />
                        <Input label="Security Key" name="password" type="password" value={newOrg.password} onChange={handleInputChange} placeholder="••••••••" />
                        <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black tracking-[0.3em] uppercase mt-4 shadow-xl">
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                            {isSubmitting ? 'AUTHORIZING NODE...' : 'Authorize Entity'}
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card>
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-2xl text-orange-500">
                                <Building2 size={24} />
                            </div>
                            <h3 className="font-cinzel text-3xl text-white">Authorized Registry</h3>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5">
                            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Secure Sync</span>
                        </div>
                    </div>
                    {loading ? (
                        <div className="p-40 flex flex-col items-center justify-center gap-8">
                            <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-600">Accessing Master Registry...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-800">
                                    <tr>
                                        <th className="p-6 text-[11px] uppercase tracking-[0.4em] text-gray-500 font-black">Identity</th>
                                        <th className="p-6 text-[11px] uppercase tracking-[0.4em] text-gray-500 font-black text-right">Verification</th>
                                        <th className="p-6"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organisations.map(org => (
                                    <tr key={org.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all duration-500">
                                        <td className="p-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-lg text-white group-hover:text-orange-500 transition-colors">{org.name}</span>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-600 uppercase tracking-widest">
                                                    <span>{org.secretary_name}</span>
                                                    <span className="h-1 w-1 rounded-full bg-gray-800"></span>
                                                    <span className="font-mono">{org.mobile}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm transition-all ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                                {org.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)} className="text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl">Edit</Button>
                                        </td>
                                    </tr>
                                    ))}
                                    {organisations.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-40 text-center text-gray-700 uppercase tracking-[0.6em] font-black text-[11px]">No entities registered.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Entity Identity">
          {editingOrg && (
            <div className="space-y-6 p-4">
                <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <Settings className="text-orange-500" size={20} />
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Parameter Configuration</span>
                </div>
                <Input label="Organisation Name" name="name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} />
                <Input label="Registry Mobile" name="mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} />
                <Input label="Secretary Name" name="secretary_name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} />
                <Select label="Security Status" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Operational - Active</option>
                    <option value="Deactivated">Locked - Deactivated</option>
                </Select>
                <div className="flex justify-end gap-4 pt-10">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="text-[11px] font-black uppercase tracking-widest px-8">Abort</Button>
                    <Button type="button" onClick={handleUpdateOrganisation} className="text-[11px] font-black uppercase tracking-widest px-8 shadow-lg shadow-orange-900/20">Commit Changes</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;