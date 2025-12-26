
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Shield, Users, UserCheck, Key, RefreshCw, AlertCircle, Activity, User as UserIcon, Building2, Clock, UserCircle, Phone } from 'lucide-react';
import { Organisation, Volunteer, Member, Role, User as ProfileUser } from '../../types';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface OrgPerformance extends Organisation {
    enrollments: number;
}

type MemberWithAgent = Member & {
    agent_profile?: { name: string, mobile: string }
};

const AdminDashboard: React.FC = () => {
    const { updatePassword } = useAuth();
    const { addNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [members, setMembers] = useState<MemberWithAgent[]>([]);
    const [volsRaw, setVolsRaw] = useState<any[]>([]);
    const [allProfiles, setAllProfiles] = useState<ProfileUser[]>([]);
    const [loading, setLoading] = useState(true);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orgsRes, membersRes, profilesRes] = await Promise.all([
                supabase.from('organisations').select('*'),
                supabase
                    .from('members')
                    .select('*, agent_profile:profiles!volunteer_id(name, mobile)')
                    .order('submission_date', { ascending: false }),
                supabase.from('profiles').select('*')
            ]);

            if (orgsRes.data) setOrganisations(orgsRes.data);
            if (membersRes.data) setMembers(membersRes.data);
            if (profilesRes.data) {
                setVolsRaw(profilesRes.data);
                const mappedProfiles: ProfileUser[] = profilesRes.data.map(p => ({
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    role: p.role as Role,
                    organisationId: p.organisation_id,
                    mobile: p.mobile,
                    status: p.status
                }));
                setAllProfiles(mappedProfiles);
            }
        } catch (err) {
            addNotification("Sync fault in master dashboard.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Performance Optimized Calculations
    const enrollmentMap = useMemo(() => {
        return members.reduce((acc, m) => {
            acc.vol[m.volunteer_id] = (acc.vol[m.volunteer_id] || 0) + 1;
            acc.org[m.organisation_id] = (acc.org[m.organisation_id] || 0) + 1;
            return acc;
        }, { vol: {} as Record<string, number>, org: {} as Record<string, number> });
    }, [members]);

    const orgPerformanceData = useMemo<OrgPerformance[]>(() => {
        return organisations.map(org => ({
            ...org,
            enrollments: enrollmentMap.org[org.id] || 0,
        })).sort((a, b) => b.enrollments - a.enrollments);
    }, [organisations, enrollmentMap]);

    const volunteers = useMemo<Volunteer[]>(() => {
        return allProfiles
            .filter(p => p.role === Role.Volunteer)
            .map(v => ({
                ...v,
                organisationId: v.organisationId || '',
                enrollments: enrollmentMap.vol[v.id] || 0,
            })).sort((a, b) => b.enrollments - a.enrollments);
    }, [allProfiles, enrollmentMap]);

    const filteredOrgs = useMemo(() => {
        if (!searchTerm) return orgPerformanceData;
        const term = searchTerm.toLowerCase();
        return orgPerformanceData.filter(org => org.mobile.includes(term) || org.name.toLowerCase().includes(term));
    }, [searchTerm, orgPerformanceData]);

    const filteredVolunteers = useMemo(() => {
        if (!searchTerm) return volunteers;
        const term = searchTerm.toLowerCase();
        return volunteers.filter(vol => vol.name.toLowerCase().includes(term) || vol.mobile.includes(term));
    }, [searchTerm, volunteers]);

    const recentMembers = useMemo(() => members.slice(0, 10), [members]);

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            addNotification("Security key must be at least 6 characters.", "error");
            return;
        }
        if (newPassword !== confirmPassword) {
            addNotification("Security keys do not match.", "error");
            return;
        }

        setIsUpdatingPassword(true);
        const result = await updatePassword(newPassword);
        
        if (result.success) {
            addNotification("Security key updated successfully.", "success");
            setNewPassword('');
            setConfirmPassword('');
        } else {
            addNotification(result.error || "Failed to update security key.", "error");
        }
        setIsUpdatingPassword(false);
    };

    return (
        <DashboardLayout title="Master Admin Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="p-8 border-l-4 border-orange-600 bg-[#080808] hover:bg-[#0a0a0a] transition-all group">
                    <div className="flex justify-between items-center mb-4">
                      <Shield className="text-orange-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-black text-orange-600/50 uppercase tracking-[0.2em]">Registered Sectors</span>
                    </div>
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Total Organisations</p>
                        <p className="text-4xl font-black text-white">{organisations.length}</p>
                    </div>
                </Card>
                <Card className="p-8 border-l-4 border-blue-600 bg-[#080808] hover:bg-[#0a0a0a] transition-all group">
                    <div className="flex justify-between items-center mb-4">
                      <Users className="text-blue-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-black text-blue-600/50 uppercase tracking-[0.2em]">Field Personnel</span>
                    </div>
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Active Volunteers</p>
                        <p className="text-4xl font-black text-white">{volunteers.length}</p>
                    </div>
                </Card>
                <Card className="p-8 border-l-4 border-green-600 bg-[#080808] hover:bg-[#0a0a0a] transition-all group">
                    <div className="flex justify-between items-center mb-4">
                      <UserCheck className="text-green-600 group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />
                      <span className="text-[9px] font-black text-green-600/50 uppercase tracking-[0.2em]">Identity Database</span>
                    </div>
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">Total Enrollments</p>
                        <p className="text-4xl font-black text-white">{members.length}</p>
                    </div>
                </Card>
            </div>

            <div className="mt-12 grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2 space-y-10">
                    <Card className="border-white/5 bg-[#050505] p-10 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                            <Activity size={200} />
                        </div>
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-orange-600/10 rounded-2xl text-orange-600">
                                    <Activity size={24} />
                                </div>
                                <div>
                                  <h4 className="font-cinzel text-2xl text-white uppercase tracking-widest">Live Identity Stream</h4>
                                  <p className="text-[9px] text-orange-600/60 font-black uppercase tracking-[0.3em] mt-1">Real-time Global Sync</p>
                                </div>
                            </div>
                            <button onClick={fetchData} className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-orange-600/40 text-gray-500 hover:text-white transition-all">
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto relative z-10">
                            <table className="w-full text-left">
                                <thead className="border-b border-white/5">
                                    <tr>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-gray-500 font-black">Member Identity</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-blue-500 font-black">Source Authentication</th>
                                        <th className="p-5 text-[10px] uppercase tracking-widest text-gray-500 font-black text-right">Registry Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-24 text-center text-xs text-gray-600 animate-pulse tracking-[0.3em] font-black uppercase">Establishing Uplink...</td></tr>
                                    ) : recentMembers.map(m => (
                                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white text-lg group-hover:text-orange-500 transition-colors">{m.name} {m.surname}</span>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono tracking-tighter">
                                                        <span>{m.mobile}</span>
                                                        <span className="h-0.5 w-0.5 rounded-full bg-gray-800"></span>
                                                        <span>{organisations.find(o => o.id === m.organisation_id)?.name || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                                        <UserCircle size={22} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-white uppercase tracking-widest">
                                                            {m.agent_profile?.name || allProfiles.find(p => p.id === m.volunteer_id)?.name || 'System Operator'}
                                                        </span>
                                                        <span className="text-[9px] text-blue-500/60 font-mono font-bold tracking-widest flex items-center gap-1.5 mt-0.5">
                                                            <Phone size={10} /> {m.agent_profile?.mobile || 'PH: N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500 font-mono font-bold">
                                                    <Clock size={12} className="text-gray-700" />
                                                    {m.submission_date.split('T')[0]}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card title="Performance Intelligence" className="bg-[#050505] border-white/5">
                        <div className="mb-10">
                            <Input
                                placeholder="Universal Search (Name, Sector, Mobile)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-black/50 border-white/5 focus:border-orange-500/50"
                            />
                        </div>
                        {loading ? <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-orange-500" size={32} /></div> : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div>
                                <h4 className="font-cinzel text-xl text-orange-500 mb-6 flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-widest">
                                    <Shield size={20} /> Organisation Ranking
                                </h4>
                                <div className="overflow-x-auto max-h-96 custom-scrollbar pr-2">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-white/5 sticky top-0 bg-[#050505] z-10">
                                            <tr>
                                                <th className="p-3 text-[9px] uppercase tracking-widest text-gray-600 font-black">Entity</th>
                                                <th className="p-3 text-[9px] uppercase tracking-widest text-gray-600 font-black text-right">Enrollments</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02]">
                                            {filteredOrgs.map(org => (
                                                <tr key={org.id} className="hover:bg-white/[0.01] transition-colors">
                                                    <td className="p-3 text-sm font-bold text-gray-200">{org.name}</td>
                                                    <td className="p-3 font-black text-orange-500 text-right font-mono">{org.enrollments}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-cinzel text-xl text-blue-500 mb-6 flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-widest">
                                    <Users size={20} /> Field Force Performance
                                </h4>
                                <div className="overflow-x-auto max-h-96 custom-scrollbar pr-2">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-white/5 sticky top-0 bg-[#050505] z-10">
                                            <tr>
                                                <th className="p-3 text-[9px] uppercase tracking-widest text-gray-600 font-black">Agent Node</th>
                                                <th className="p-3 text-[9px] uppercase tracking-widest text-gray-600 font-black text-right">Enrollments</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02]">
                                            {filteredVolunteers.map(vol => (
                                                <tr key={vol.id} className="hover:bg-white/[0.01] transition-colors">
                                                    <td className="p-3 text-sm font-bold text-gray-200">{vol.name}</td>
                                                    <td className="p-3 font-black text-blue-500 text-right font-mono">{vol.enrollments}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        )}
                    </Card>
                </div>

                <div className="xl:col-span-1 space-y-10">
                    <Card title="Security Override Terminal" className="bg-[#050505] border-white/5">
                        <div className="flex items-start gap-4 mb-8 p-6 bg-orange-600/5 rounded-2xl border border-orange-600/10">
                            <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={24} />
                            <p className="text-[10px] text-orange-200/50 leading-relaxed uppercase tracking-widest font-black">
                                Master security key rotation protocol. This affects your root administrative terminal access immediately.
                            </p>
                        </div>
                        
                        <form onSubmit={handlePasswordUpdate} className="space-y-6">
                            <Input 
                                label="NEW SECURITY KEY"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-black/40 border-white/5 text-sm font-mono tracking-widest"
                                required
                            />
                            <Input 
                                label="CONFIRM SECURITY KEY"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-black/40 border-white/5 text-sm font-mono tracking-widest"
                                required
                            />
                            
                            <Button 
                                type="submit" 
                                disabled={isUpdatingPassword || !newPassword}
                                className="w-full py-5 text-[10px] tracking-[0.4em] font-black uppercase flex items-center justify-center gap-3 shadow-2xl bg-orange-600 hover:bg-orange-500"
                            >
                                {isUpdatingPassword ? (
                                    <RefreshCw className="animate-spin" size={16} />
                                ) : (
                                    <Key size={16} />
                                )}
                                {isUpdatingPassword ? 'ROTATING...' : 'APPLY SECURITY OVERRIDE'}
                            </Button>
                        </form>
                    </Card>

                    <Card className="border-white/5 bg-black/40 p-8 rounded-[2rem]">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-8">System Handshake Identity</h4>
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600 uppercase tracking-widest font-bold">Active Principal:</span>
                                <span className="text-white font-black underline decoration-orange-600/40 underline-offset-8">MASTER ADMIN</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600 uppercase tracking-widest font-bold">Access Node:</span>
                                <span className="px-4 py-1.5 bg-orange-600/10 text-orange-500 rounded-full border border-orange-600/20 font-black uppercase tracking-widest">Global Root</span>
                            </div>
                            <div className="pt-6 border-t border-white/5">
                                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest leading-relaxed">
                                  System Uptime: Verified<br/>
                                  Last Sync: {new Date().toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
