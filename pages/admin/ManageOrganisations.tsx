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
import { 
  ShieldCheck, 
  UserPlus, 
  Building2, 
  Loader2, 
  ShieldAlert, 
  Copy, 
  ExternalLink, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Settings,
  Database,
  ShieldQuestion,
  Wrench,
  Zap,
  Activity
} from 'lucide-react';

const ManageOrganisations: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [newOrg, setNewOrg] = useState({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRepairTool, setShowRepairTool] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  
  const { addNotification } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);

  const fetchOrganisations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('organisations').select('*').order('name');
    if (error) {
      addNotification(`Registry sync failed: ${error.message}`, 'error');
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

  const GOD_LEVEL_REPAIR_SQL = `-- 🔱 SSK "GOD-LEVEL" INTEGRITY REPAIR 🔱
-- 1. HARDEN PROFILE SCHEMA
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='organisation_id' AND data_type='text') THEN
    ALTER TABLE public.profiles ALTER COLUMN organisation_id TYPE uuid USING organisation_id::uuid;
  ELSE
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organisation_id uuid;
  END IF;
END $$;

-- 2. CREATE CRASH-PROOF SYNC LOGIC
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  raw_org_id text;
  final_org_id uuid;
BEGIN
  -- Inner block captures errors so Auth signup NEVER crashes
  BEGIN 
    raw_org_id := new.raw_user_meta_data->>'organisation_id';
    IF raw_org_id IS NOT NULL AND raw_org_id <> '' AND raw_org_id <> 'null' THEN
      BEGIN final_org_id := raw_org_id::uuid; EXCEPTION WHEN OTHERS THEN final_org_id := NULL; END;
    END IF;
    
    INSERT INTO public.profiles (id, name, email, role, organisation_id, mobile, status)
    VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'name', 'User Node'), 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'role', 'Volunteer'), 
      final_org_id, 
      new.raw_user_meta_data->>'mobile', 
      'Active'
    )
    ON CONFLICT (id) DO UPDATE SET 
      role = EXCLUDED.role, 
      organisation_id = EXCLUDED.organisation_id, 
      name = EXCLUDED.name, 
      mobile = EXCLUDED.mobile, 
      status = EXCLUDED.status;
  EXCEPTION WHEN OTHERS THEN
    -- If sync fails, the Auth system still succeeds. 
    -- We log it to the Postgres log for debugging.
    RAISE WARNING 'Sync failed for user %, but Auth signup allowed to proceed.', new.id;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RESET TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. FORCE PERMISSIONS
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;
GRANT SELECT ON public.profiles TO authenticated, anon;`;

  const handleAddOrganisation = async () => {
    const email = newOrg.email.trim().toLowerCase();
    const password = newOrg.password;
    const name = newOrg.name.trim();
    const mobile = newOrg.mobile.trim();
    const secretaryName = newOrg.secretaryName.trim();

    if (!email || !password || !name || !mobile || !secretaryName) {
        addNotification("Authorization parameters missing.", 'error');
        return;
    }
    
    setIsSubmitting(true);
    setShowRepairTool(false);
    setDiagnosticInfo(null);
    let createdOrgId: string | null = null;
    
    try {
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({ name, mobile, secretary_name: secretaryName, status: 'Active' })
          .select().single();

        if (orgError) throw new Error(`Registration Blocked: ${orgError.message}`);
        createdOrgId = orgData.id;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: secretaryName,
              role: 'Organisation',
              organisation_id: createdOrgId,
              mobile
            }
          }
        });

        if (authError) {
          const errMsg = authError.message.toLowerCase();
          const isTriggerFault = errMsg.includes("database error") || errMsg.includes("trigger") || errMsg.includes("saving new user");

          if (isTriggerFault) {
            setShowRepairTool(true);
            setDiagnosticInfo("Fatal Sync Collision: A background function crashed. This blocks user creation until the repair script is run.");
            if (createdOrgId) await supabase.from('organisations').delete().eq('id', createdOrgId);
            throw new Error(`Trigger Failure: ${authError.message}. Run the repair script.`);
          } else {
            if (createdOrgId) await supabase.from('organisations').delete().eq('id', createdOrgId);
            throw authError;
          }
        }

        if (authData?.user?.id) {
            const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', authData.user.id).maybeSingle();
            if (!profileCheck) {
                const { error: healError } = await supabase.from('profiles').upsert({
                    id: authData.user.id,
                    name: secretaryName,
                    email,
                    role: 'Organisation',
                    organisation_id: createdOrgId,
                    mobile,
                    status: 'Active'
                });
                if (healError) {
                   setShowRepairTool(true);
                   setDiagnosticInfo(`Manual sync failed: ${healError.message}`);
                }
            }
        }

        setNewOrg({ name: '', mobile: '', secretaryName: '', email: '', password: '' });
        fetchOrganisations();
        addNotification('Entity successfully authorized.', 'success');
    } catch (err: any) {
        addNotification(err.message || "System handshake failed.", 'error');
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
        addNotification(`Parameters updated.`, 'success');
        fetchOrganisations();
        setIsModalOpen(false);
    }
  };

  return (
    <DashboardLayout title="Entity Administration">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorize New Entity" className="border-orange-500/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <ShieldCheck size={100} />
            </div>
            <div className="space-y-6 relative z-10">
              <Input label="Organisation Name" name="name" value={newOrg.name} onChange={handleInputChange} placeholder="Ex: SSK Bangalore" />
              <Input label="Primary Mobile" name="mobile" value={newOrg.mobile} onChange={handleInputChange} placeholder="91XXXXXXXX" />
              <Input label="Secretary Name" name="secretaryName" value={newOrg.secretaryName} onChange={handleInputChange} />
              <Input label="Access Email" name="email" type="email" value={newOrg.email} onChange={handleInputChange} placeholder="admin@entity.com" />
              <Input label="Security Key" name="password" type="password" value={newOrg.password} onChange={handleInputChange} placeholder="Min 6 characters" />
              <Button type="button" onClick={handleAddOrganisation} disabled={isSubmitting} className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest shadow-xl">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />}
                {isSubmitting ? 'ESTABLISHING...' : 'Establish Entity'}
              </Button>
            </div>
          </Card>

          {showRepairTool && (
            <Card className="border-red-500 border-2 bg-red-950/20 p-8 shadow-3xl animate-in fade-in slide-in-from-top-4 ring-4 ring-red-500/10">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-red-500 rounded-2xl text-white shadow-lg">
                        <ShieldAlert size={28} className="animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-red-400 font-bold text-lg uppercase tracking-tight">SYSTEM INTEGRITY FAULT</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Database Logic Collision</p>
                    </div>
                </div>
                
                <div className="bg-black/80 p-5 rounded-2xl border border-red-500/30 mb-6">
                    <p className="text-[11px] text-red-200 leading-relaxed font-mono italic">
                        {diagnosticInfo || "The trigger 'handle_new_user' crashed. Run repair to continue."}
                    </p>
                </div>

                <div className="space-y-4">
                    <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-full text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 text-white shadow-2xl"
                        onClick={() => { navigator.clipboard.writeText(GOD_LEVEL_REPAIR_SQL); addNotification("Repair Script Copied.", "success"); }}
                    >
                        <Copy size={16} /> Copy Fix Script
                    </Button>
                    <a 
                        href="https://baetdjjzfqupdzsoecph.supabase.co/dashboard/project/baetdjjzfqupdzsoecph/sql/new" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full text-orange-500 text-[11px] font-black uppercase tracking-widest hover:underline py-3 bg-white/5 rounded-xl border border-white/5"
                    >
                        Supabase SQL Editor <ExternalLink size={12} />
                    </a>
                </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Active Entity Registry">
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4 text-gray-500">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                        <Activity size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Master Registry Sync</span>
                </div>
                <button onClick={fetchOrganisations} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-orange-500/40 text-gray-500 hover:text-white transition-all">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            
            {loading ? (
                <div className="p-40 flex flex-col items-center justify-center gap-6">
                    <div className="w-16 h-16 border-2 border-orange-500/10 border-t-orange-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest animate-pulse">Syncing Cache...</span>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-800">
                            <tr>
                                <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black">Entity Identity</th>
                                <th className="p-6 text-[10px] uppercase tracking-widest text-gray-500 font-black text-right">Verification</th>
                                <th className="p-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {organisations.map(org => (
                            <tr key={org.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-all">
                                <td className="p-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{org.name}</span>
                                            {org.status === 'Active' && <CheckCircle2 size={14} className="text-green-500/50" />}
                                        </div>
                                        <span className="text-[11px] text-gray-600 uppercase font-mono tracking-tighter">{org.secretary_name} • {org.mobile}</span>
                                    </div>
                                </td>
                                <td className="p-6 text-right">
                                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${ org.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20' }`}>
                                        {org.status}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <Button size="sm" variant="secondary" onClick={() => handleEditClick(org)} className="opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">Modify Node</Button>
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Entity Parameters">
          {editingOrg && (
            <div className="space-y-6 p-2">
                <div className="flex items-center gap-4 mb-6 p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl relative overflow-hidden">
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                        <Settings size={20} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-orange-500/60 font-black uppercase tracking-widest">Security Override</p>
                        <p className="text-sm font-bold text-white">Target Node: {editingOrg.name}</p>
                    </div>
                </div>
                <Input label="Organisation Name" name="name" value={editingOrg.name} onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})} />
                <Input label="Registry Mobile" name="mobile" value={editingOrg.mobile} onChange={(e) => setEditingOrg({...editingOrg, mobile: e.target.value})} />
                <Input label="Secretary Name" name="secretary_name" value={editingOrg.secretary_name} onChange={(e) => setEditingOrg({...editingOrg, secretary_name: e.target.value})} />
                <Select label="Access Status" name="status" value={editingOrg.status} onChange={(e) => setEditingOrg({...editingOrg, status: e.target.value as any})}>
                    <option value="Active">Active / Operational</option>
                    <option value="Deactivated">Locked / Deactivated</option>
                </Select>
                <div className="flex justify-end gap-4 pt-10">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="px-8 border-white/10 hover:bg-white/5 py-4 text-[10px] uppercase font-black tracking-widest">Cancel</Button>
                    <Button type="button" onClick={handleUpdateOrganisation} className="px-8 shadow-lg shadow-orange-950/20 py-4 text-[10px] uppercase font-black tracking-widest">Commit Update</Button>
                </div>
            </div>
          )}
      </Modal>
    </DashboardLayout>
  );
};

export default ManageOrganisations;