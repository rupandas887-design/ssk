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
import { ShieldCheck, UserPlus, Building2, Loader2, AlertCircle, Terminal, Copy, Info, CheckCircle2 } from 'lucide-react';

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

  const sqlFixCode = `-- REPAIR SCRIPT FOR UUID CASTING ERROR
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, organisation_id, mobile, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    (COALESCE(NEW.raw_user_meta_data->>'role', 'Volunteer'))::user_role,
    (NULLIF(NEW.raw_user_meta_data->>'organisation_id', ''))::uuid, -- FIX: Explicit cast
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
    addNotification("SQL Fix Code copied! Execute in Supabase SQL Editor.", "success");
  };

  const handleAddOrganisation = async () => {
    const email = newOrg.email.trim().toLowerCase();
    const password = newOrg.password;
    const name = newOrg.name.trim();
    const mobile = newOrg.mobile.trim();
    const secretaryName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secretaryName) {
        addNotification("All fields are required.", 'error');
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
          await supabase.from('organisations').delete().eq('id', orgData.id);
          throw authError;
        }

        // 3. Forced Profile Creation as safety net
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
                throw new Error("Database Sync Conflict: UUID casting failed.");
            }
        }

        addNotification('Organisation terminal successfully authorized.', 'success');
        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
    } catch (err: any) {
        console.error("Critical Registration Error:", err);
        const msg = err.message || "";
        if (msg.includes("Database error") || msg.includes("UUID")) {
            setShowSqlFix(true);
            addNotification("Database Trigger failure. Please run the SQL Repair script.", 'error');
        } else {
            addNotification(msg || "Registration sequence interrupted.", 'error');
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
      <div className="space-y-8">
        {showSqlFix && (
          <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-8 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl">
             <div className="flex items-start gap-6">
                <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 border border-red-500/20">
                    <Terminal size={32} />
                </div>
                <div className="flex-1">
                    <h3 className="text-red-400 font-cinzel text-lg tracking-wider mb-2">Supabase Trigger Fix Required</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                        The "Database error" occurred because the <code>handle_new_user</code> function in your Supabase project is trying to save the <code>organisation_id</code> as a string into a UUID column. Execute the following script in your <b>SQL Editor</b> to fix this permanently.
                    </p>
                    <div className="relative group">
                        <pre className="bg-black/80 p-6 rounded-xl border border-gray-800 font-mono text-[11px] text-orange-400/80 overflow-x-auto whitespace-pre-wrap max-h-64">
                            {sqlFixCode}
                        </pre>
                        <button 
                            onClick={copySql}
                            className="absolute top-4 right-4 p-3 bg-gray-800 hover:bg-orange-600 text-white rounded-xl transition-all shadow-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-white/5"
                        >
                            <Copy size={14} />
                            <span>Copy Fix</span>
                        </button>
                    </div>
                </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1">
                <Card title="Register New Entity">
                    <div className="space-y-4">
                        <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl mb-4 flex items-center gap-3">
                             <ShieldCheck className="text-orange-500" size={20} />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400/80 leading-tight">Tier 1 Identity: Organisation</span>
                        </div>
                        <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="SSK Samaj..." />
                        <Input label="Primary Contact" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="98XXXXXXXX" />
                        <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} placeholder="Admin Full Name" />
                        <Input label="Login Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@entity.com" />
                        <Input label="Security Key" name="password" type="password" value={newOrg.password} onChange={handleInputChange} placeholder="••••••••" />
                        <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-4 flex items-center justify-center gap-2 text-xs font-black tracking-widest uppercase mt-4">
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                            {isSubmitting ? 'AUTHORIZING...' : 'Authorize Entity'}
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-2">
                <Card>
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-cinzel text-2xl text-white">Authorized Registry</h3>
                        <Building2 className="text-orange-500/20" size={32} />
                    </div>
                    {loading ? (
                        <div className="p-32 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="animate-spin text-orange-500" size={40} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Accessing Storage...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-800">
                                    <tr>
                                        <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Identity</th>
                                        <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Mobile</th>
                                        <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black text-right">Verification</th>
                                        <th className="p-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organisations.map(org => (
                                    <tr key={org.id} className="border-b border-gray-900/50 hover:bg-white/5 transition-all duration-300">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-white">{org.name}</span>
                                                <span className="text-[10px] text-gray-600 uppercase tracking-widest">{org.secretary_name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-gray-400 font-mono">{org.mobile}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                                {org.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)} className="text-[10px] font-black uppercase tracking-widest">Edit</Button>
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
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Entity Parameters">
          {editingOrg && (
            <div className="space-y-4">
                <Input label="Organisation Name" name="name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} />
                <Input label="Registry Mobile" name="mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} />
                <Input label="Secretary Name" name="secretary_name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} />
                <Select label="Security Status" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                </Select>
                <div className="flex justify-end space-x-4 pt-6">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Abort</Button>
                    <Button type="button" onClick={handleUpdateOrganisation}>Commit Changes</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;