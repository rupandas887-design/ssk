import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Volunteer, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { Power, Download, UserPlus, UserCheck, Copy, ShieldCheck, Loader2, UserCircle, Zap, ShieldAlert, RefreshCw, ExternalLink, Activity, Database } from 'lucide-react';

type VolunteerWithEnrollments = Volunteer & { enrollments: number };

const ManageVolunteers: React.FC = () => {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerWithEnrollments[]>([]);
  const [newVol, setNewVol] = useState({ name: '', mobile: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRepairTool, setShowRepairTool] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  
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
          const errorMsg = profileError.message || (typeof profileError === 'string' ? profileError : JSON.stringify(profileError));
          console.error("Registry Sync Fault:", profileError);
          setDiagnosticInfo(`Database Access Denied: ${errorMsg}`);
          setShowRepairTool(true);
          addNotification(`Registry sync failed: ${errorMsg}`, 'error');
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
          setShowRepairTool(false);
        }
    } catch (e: any) {
        const errorMsg = e?.message || (typeof e === 'string' ? e : 'Unknown Protocol Fault');
        addNotification(`Protocol Error: ${errorMsg}`, 'error');
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

  const GOD_LEVEL_REPAIR_SQL = `-- 🔱 SSK "GOD-LEVEL" INTEGRITY & RLS REPAIR 🔱
-- 1. HARDEN PROFILE SCHEMA
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organisation_id uuid;

-- 2. CRASH-PROOF SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  raw_org_id text;
  final_org_id uuid;
BEGIN
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
    RAISE WARNING 'Sync failed for user %, but Auth allowed to proceed.', new.id;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RESET RLS POLICIES (THE CRITICAL FIX FOR ORG ADMINS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for admins" ON public.profiles;
DROP POLICY IF EXISTS "Org Admins Manage Own Volunteers" ON public.profiles;
DROP POLICY IF EXISTS "Users view own" ON public.profiles;
DROP POLICY IF EXISTS "MasterAdmin Full Access" ON public.profiles;
DROP POLICY IF EXISTS "Users View Own Profile" ON public.profiles;

-- Policy: Master Admin can do anything
CREATE POLICY "MasterAdmin Full Access" ON public.profiles FOR ALL 
TO authenticated
USING ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'MasterAdmin' )
WITH CHECK ( (auth.jwt() -> 'app_metadata' ->> 'role') = 'MasterAdmin' );

-- Policy: Organisation Admins can manage their own volunteers
CREATE POLICY "Org Admins Manage Own Volunteers" ON public.profiles FOR ALL
TO authenticated
USING (
  organisation_id = (auth.jwt() -> 'user_metadata' ->> 'organisation_id')::uuid
  OR 
  organisation_id = (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid
)
WITH CHECK (
  organisation_id = (auth.jwt() -> 'user_metadata' ->> 'organisation_id')::uuid
  OR 
  organisation_id = (auth.jwt() -> 'app_metadata' ->> 'organisation_id')::uuid
);

-- Policy: Everyone can view their own profile
CREATE POLICY "Users View Own Profile" ON public.profiles FOR SELECT
TO authenticated
USING ( auth.uid() = id );

-- 4. GRANT PERMISSIONS
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO postgres;`;

  const handleAddVolunteer = async () => {
    const email = newVol.email.trim().toLowerCase();
    const password = newVol.password;
    const name = newVol.name.trim();
    const mobile = newVol.mobile.trim();
    
    if (!user?.organisationId) {
        addNotification("Session missing context. Re-login required.", 'error');
        return;
    }
    if (!email || !password || !name || !mobile) {
        addNotification("All identity parameters are mandatory.", 'error');
        return;
    }

    setIsSubmitting(true);
    setDiagnosticInfo(null);

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

        if (authError) {
            const errMsg = authError.message.toLowerCase();
            const isTriggerFault = errMsg.includes("database error") || errMsg.includes("trigger") || errMsg.includes("saving new user");

            if (isTriggerFault) {
                setShowRepairTool(true);
                setDiagnosticInfo(`Trigger Collision: ${authError.message}. The database trigger 'handle_new_user' is blocking the Auth operation.`);
                throw new Error("Trigger Fault: Background sync crashed.");
            } else {
                throw authError;
            }
        } 
        
        if (authData?.user?.id) {
            const { error: healError } = await supabase.from('profiles').upsert({
                id: authData.user.id,
                name,
                email,
                role: 'Volunteer',
                organisation_id: user.organisationId,
                mobile,
                status: 'Active'
            });
            
            if (healError) {
                console.warn("Manual sync heal failed. This is likely an RLS Policy issue.", healError);
                setShowRepairTool(true);
                const healMsg = healError.message || JSON.stringify(healError);
                setDiagnosticInfo(`Access Policy Violation: ${healMsg}. Your account does not have permission to insert into the profiles table.`);
            } else {
                addNotification('Volunteer operator successfully deployed.', 'success');
                setNewVol({ name: '', mobile: '', email: '', password: '' });
                fetchVolunteers(); 
            }
        }
    } catch (err: any) {
        const errorMsg = err?.message || (typeof err === 'string' ? err : 'System handshake failed.');
        addNotification(errorMsg, 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const copyVolunteerCreds = (v: VolunteerWithEnrollments) => {
      const text = `Agent Identity:\nName: ${v.name}\nEmail: ${v.email}\nMobile: ${v.mobile}`;
      navigator.clipboard.writeText(text);
      addNotification("Identity data copied to clipboard.", "success");
  };

  const handleToggleStatus = async (vol: VolunteerWithEnrollments) => {
    const newStatus = vol.status === 'Active' ? 'Deactivated' : 'Active';
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', vol.id);

    if (error) {
        const errorMsg = error.message || JSON.stringify(error);
        addNotification(`Override failed: ${errorMsg}`, 'error');
    } else {
        addNotification(`Agent status updated to ${newStatus}.`, 'success');
        fetchVolunteers();
    }
  };

  return (
    <DashboardLayout title="Field Force Command">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <Card title="Authorize New Agent" className="relative overflow-hidden border-blue-900/30 bg-[#020202]/80 backdrop-blur-xl">
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
                className="w-full py-5 flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-950/20"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {isSubmitting ? 'AUTHORIZING...' : 'Authorize Operator'}
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
                        <h4 className="text-red-400 font-bold text-lg uppercase tracking-tight leading-none mb-1">ACCESS BLOCKED</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Database Rules Violation</p>
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="p-4 bg-black/60 rounded-xl border border-red-500/20">
                        <p className="text-[11px] text-red-200/80 leading-relaxed font-mono italic">
                        {diagnosticInfo || "Your organization account lacks permission to create volunteer profiles. This requires a 'Database Rule' update via SQL."}
                        </p>
                    </div>
                    <div className="space-y-3">
                        <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-full text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-500 text-white shadow-2xl"
                            onClick={() => { navigator.clipboard.writeText(GOD_LEVEL_REPAIR_SQL); addNotification("Integrity fix copied.", "success"); }}
                        >
                            <Copy size={16} /> Copy Integrity Fix
                        </Button>
                        <a 
                            href="https://baetdjjzfqupdzsoecph.supabase.co/dashboard/project/baetdjjzfqupdzsoecph/sql/new" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full text-orange-500 text-[11px] font-black uppercase tracking-widest hover:underline py-3 bg-white/5 rounded-xl border border-white/5"
                        >
                            Open SQL Editor <ExternalLink size={12} />
                        </a>
                    </div>
                    <div className="pt-4 border-t border-red-500/10">
                        <p className="text-[9px] text-gray-500 font-bold uppercase text-center leading-relaxed">
                            Instructions: Copy script &rarr; Paste in Supabase SQL Editor &rarr; Run &rarr; Refresh this page
                        </p>
                    </div>
                </div>
            </Card>
          )}
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
                <button 
                  onClick={fetchVolunteers} 
                  className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-orange-500/40 text-gray-500 hover:text-white transition-all shadow-xl"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div className="p-40 flex flex-col items-center justify-center gap-8">
                    <div className="w-16 h-16 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest animate-pulse">Scanning Agent Nodes...</span>
                </div>
            ) : (
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
                  {volunteers.map(vol => (
                    <tr key={vol.id} className="group border-b border-gray-900/50 hover:bg-white/[0.015] transition-all">
                      <td className="p-6">
                        <div className="flex flex-col gap-2">
                            <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{vol.name}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-600 font-mono tracking-tight">{vol.email}</span>
                                <div className="h-1 w-1 rounded-full bg-gray-700"></div>
                                <span className="text-[10px] text-gray-600 font-mono tracking-tight">{vol.mobile}</span>
                            </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/[0.03] border border-white/5 rounded-[1.5rem] group-hover:bg-orange-500/5 group-hover:border-orange-500/20 transition-all duration-500">
                            <UserCheck size={18} className="text-orange-500" />
                            <span className="font-black text-xl text-white tracking-tighter">{vol.enrollments}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                            <button onClick={() => copyVolunteerCreds(vol)} className="p-4 bg-gray-950 border border-white/5 text-gray-600 hover:text-orange-500 hover:border-orange-500/40 rounded-2xl transition-all">
                                <Copy size={18} />
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(vol)}
                                title={vol.status === 'Active' ? 'Deactivate Operator' : 'Activate Operator'}
                                className={`p-4 rounded-2xl border transition-all ${vol.status === 'Active' ? 'text-red-400 border-red-500/10 bg-red-500/5 hover:bg-red-500/20 hover:border-red-500/40' : 'text-green-400 border-green-500/10 bg-green-500/5 hover:bg-green-500/20 hover:border-green-500/40'}`}
                            >
                                <Power size={18} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {volunteers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-32 text-center">
                            <div className="relative inline-block mb-6">
                                <UserCircle className="text-gray-900" size={80} strokeWidth={1} />
                                <Database className="absolute bottom-0 right-0 text-gray-800" size={24} />
                            </div>
                            <p className="text-[11px] text-gray-600 font-black uppercase tracking-widest">No field agents detected in current sector.</p>
                            <p className="text-[9px] text-gray-800 uppercase tracking-widest mt-2">Check database RLS rules if agents exist but are hidden.</p>
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