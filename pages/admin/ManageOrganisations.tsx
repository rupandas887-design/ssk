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
import { ShieldCheck, UserPlus, Building2, Loader2, Database, Terminal, Copy, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

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
      addNotification('Could not fetch organisations.', 'error');
    } else {
      setOrganisations(data || []);
    }
    setLoading(false);
  }, [addNotification]);

  useEffect(() => {
    fetchOrganisations();
  }, [fetchOrganisations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewOrg(prev => ({ ...prev, [name]: value }));
  };

  const sqlFixCode = `-- REPAIR SCRIPT: FIX UUID CASTING IN AUTH TRIGGER
-- Run this in your Supabase SQL Editor to fix 'Database error saving new user'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organisation_id, mobile, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    (COALESCE(NEW.raw_user_meta_data->>'role', 'Volunteer'))::user_role,
    (NULLIF(NEW.raw_user_meta_data->>'organisation_id', ''))::uuid, -- CRITICAL: Explicit UUID cast
    NEW.raw_user_meta_data->>'mobile',
    'Active'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    organisation_id = EXCLUDED.organisation_id,
    name = EXCLUDED.name,
    mobile = EXCLUDED.mobile;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlFixCode);
    addNotification("SQL Script copied. Paste it in your Supabase SQL Editor and click RUN.", "success");
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
    setShowSqlFix(false);
    
    try {
        // 1. Create the Organisation entry
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ name, mobile, secretary_name: secretaryName })
          .select().single();

        if (orgError) throw orgError;

        // 2. Create Auth User
        // Note: 'Database error saving new user' happens here because the DB trigger crashes
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: secretaryName,
              role: 'Organisation',
              organisation_id: String(orgData.id), 
              mobile
            }
          }
        });

        if (authError) {
          // Attempt cleanup of the orphaned org record
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw authError;
        }

        // 3. Fallback Profile Creation (Safety net for trigger latency)
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

            if (profileError && profileError.message.includes("uuid")) {
                setShowSqlFix(true);
                throw new Error("Database Sync Failure: The profile trigger requires a UUID cast repair.");
            }
        }

        addNotification('Entity authorized and registered.', 'success');
        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
    } catch (err: any) {
        console.error("Registration Failure:", err);
        const msg = err.message || "";
        // This is where we catch the Supabase internal trigger error
        if (msg.includes("Database error saving new user") || msg.includes("uuid") || msg.includes("invalid input syntax")) {
            setShowSqlFix(true);
            addNotification("Database Trigger Conflict: Repair required in Supabase.", 'error');
        } else {
            addNotification(msg || "Registration sequence failed.", 'error');
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
      <div className="space-y-10">
        {showSqlFix && (
          <div className="bg-[#0a0505] border border-red-500/30 rounded-[2rem] p-10 animate-in fade-in slide-in-from-top-6 duration-700 shadow-[0_0_60px_-15px_rgba(239,68,68,0.3)]">
             <div className="flex items-start gap-8">
                <div className="p-5 bg-red-500/10 rounded-3xl text-red-500 border border-red-500/20 shadow-lg">
                    <Database size={40} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4 text-red-400">
                        <AlertTriangle size={20} className="animate-pulse" />
                        <h3 className="font-cinzel text-xl tracking-[0.1em]">Database Trigger Fix Required</h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-2xl">
                        The <b>"Database error saving new user"</b> is a known Postgres type-mismatch in your Supabase <code>handle_new_user()</code> function. It is trying to insert the Organisation ID as a string into a UUID column. 
                        <br/><br/>
                        <span className="text-white font-bold">Solution:</span> Copy the script below, open your <b>Supabase SQL Editor</b>, paste it, and click <b>RUN</b>.
                    </p>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-red-500/5 blur-xl group-hover:bg-red-500/10 transition-all duration-700"></div>
                        <pre className="relative bg-black/90 p-8 rounded-2xl border border-gray-800 font-mono text-[11px] text-red-400/80 overflow-x-auto whitespace-pre-wrap max-h-72 shadow-inner scrollbar-hide">
                            {sqlFixCode}
                        </pre>
                        <button 
                            onClick={copySql}
                            className="absolute top-6 right-6 p-4 bg-gray-800 hover:bg-red-600 text-white rounded-2xl transition-all shadow-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-white/5 active:scale-95"
                        >
                            <Copy size={16} />
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
                             <ShieldCheck className="text-orange-500" size={24} />
                             <span className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-400/80 leading-tight">Master Admin Authorization</span>
                        </div>
                        <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="SSK Samaj Hubli" />
                        <Input label="Registry Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="98XXXXXXXX" />
                        <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Principal Admin Name" />
                        <Input label="Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@entity.com" />
                        <Input label="Security Key" name="password" type="password" value={newOrg.password} onChange={handleInputChange} placeholder="••••••••" />
                        <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black tracking-[0.2em] uppercase mt-4">
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                            {isSubmitting ? 'AUTHORIZING...' : 'Establish Entity'}
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card>
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="font-cinzel text-3xl text-white">Authorized Registry</h3>
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Live Sync</span>
                        </div>
                    </div>
                    {loading ? (
                        <div className="p-40 flex flex-col items-center justify-center gap-6">
                            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">Syncing Registry...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-800">
                                    <tr>
                                        <th className="p-5 text-[10px] uppercase tracking-[0.3em] text-gray-500 font-black">Identity</th>
                                        <th className="p-5 text-[10px] uppercase tracking-[0.3em] text-gray-500 font-black text-right">Status</th>
                                        <th className="p-5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organisations.map(org => (
                                    <tr key={org.id} className="group border-b border-gray-900/50 hover:bg-white/5 transition-all duration-500">
                                        <td className="p-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-base text-white group-hover:text-orange-500 transition-colors">{org.name}</span>
                                                <span className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">{org.secretary_name} • {org.mobile}</span>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border shadow-sm ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                                {org.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)} className="text-[9px] font-black uppercase tracking-widest px-4 py-2">Edit</Button>
                                        </td>
                                    </tr>
                                    ))}
                                    {organisations.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-40 text-center text-gray-700 uppercase tracking-[0.5em] font-black text-[10px]">No entities registered.</td>
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
            <div className="space-y-6 p-2">
                <Input label="Organisation Name" name="name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} />
                <Input label="Registry Mobile" name="mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} />
                <Input label="Secretary Name" name="secretary_name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} />
                <Select label="Security Status" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Operational</option>
                    <option value="Deactivated">Locked</option>
                </Select>
                <div className="flex justify-end space-x-4 pt-8">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest">Abort</Button>
                    <Button type="button" onClick={handleUpdateOrganisation} className="text-[10px] font-black uppercase tracking-widest">Commit Changes</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;