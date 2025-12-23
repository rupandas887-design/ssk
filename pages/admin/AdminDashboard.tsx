
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Shield, Users, UserCheck, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { Organisation, Volunteer, Member, Role } from '../../types';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface OrgPerformance extends Organisation {
    enrollments: number;
}

const AdminDashboard: React.FC = () => {
    const { updatePassword } = useAuth();
    const { addNotification } = useNotification();
    const [searchTerm, setSearchTerm] = useState('');
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    // Password Update State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: orgsData } = await supabase.from('organisations').select('*');
            const { data: membersData } = await supabase.from('members').select('*');
            const { data: volsData } = await supabase.from('profiles').select('*').eq('role', Role.Volunteer);

            if (orgsData) setOrganisations(orgsData);
            if (membersData) setMembers(membersData);
            if (volsData && membersData) {
                const volunteersWithEnrollments: Volunteer[] = volsData.map(v => ({
                    id: v.id,
                    name: v.name,
                    email: v.email,
                    role: v.role,
                    organisationId: v.organisation_id,
                    mobile: v.mobile,
                    enrollments: membersData.filter(m => m.volunteer_id === v.id).length,
                }));
                setVolunteers(volunteersWithEnrollments);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const orgPerformanceData = useMemo<OrgPerformance[]>(() => {
        const orgEnrollments = members.reduce((acc, member) => {
            acc[member.organisation_id] = (acc[member.organisation_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return organisations.map(org => ({
            ...org,
            enrollments: orgEnrollments[org.id] || 0,
        })).sort((a, b) => b.enrollments - a.enrollments);
    }, [members, organisations]);

    const volunteerPerformanceData = useMemo<Volunteer[]>(() => {
        return [...volunteers].sort((a, b) => b.enrollments - a.enrollments);
    }, [volunteers]);

    const filteredOrgs = useMemo(() => {
        if (!searchTerm) return orgPerformanceData;
        return orgPerformanceData.filter(org => org.mobile.includes(searchTerm));
    }, [searchTerm, orgPerformanceData]);

    const filteredVolunteers = useMemo(() => {
        if (!searchTerm) return volunteerPerformanceData;
        const matchingOrgIds = organisations.filter(org => org.mobile.includes(searchTerm)).map(org => org.id);
        return volunteerPerformanceData.filter(vol => matchingOrgIds.includes(vol.organisationId));
    }, [searchTerm, volunteerPerformanceData, organisations]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="flex items-center space-x-4 border-l-4 border-orange-500">
                    <Shield className="text-orange-500" size={40} />
                    <div>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Organisations</p>
                        <p className="text-2xl font-bold">{organisations.length}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-4 border-l-4 border-blue-500">
                    <Users className="text-blue-500" size={40} />
                    <div>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Volunteers</p>
                        <p className="text-2xl font-bold">{volunteers.length}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-4 border-l-4 border-green-500">
                    <UserCheck className="text-green-500" size={40} />
                    <div>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold">Memberships</p>
                        <p className="text-2xl font-bold">{members.length}</p>
                    </div>
                </Card>
            </div>

            <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Performance Table Section */}
                <div className="xl:col-span-2">
                    <Card title="Performance Overview">
                        <div className="mb-6">
                            <Input
                                placeholder="Search by organisation mobile number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-black/50 border-gray-800"
                            />
                        </div>
                        {loading ? <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-orange-500" size={32} /></div> : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-cinzel text-lg text-orange-400 mb-3 flex items-center gap-2">
                                    <Shield size={18} /> Organisation Performance
                                </h4>
                                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-gray-700 sticky top-0 bg-gray-900">
                                            <tr>
                                                <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500">Entity</th>
                                                <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500">Mobile</th>
                                                <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500 text-right">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredOrgs.map(org => (
                                                <tr key={org.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                                    <td className="p-2 text-sm font-medium">{org.name}</td>
                                                    <td className="p-2 text-xs text-gray-400 font-mono">{org.mobile}</td>
                                                    <td className="p-2 font-black text-orange-400 text-right">{org.enrollments}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-cinzel text-lg text-blue-400 mb-3 flex items-center gap-2">
                                    <Users size={18} /> Volunteer Performance
                                </h4>
                                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-gray-700 sticky top-0 bg-gray-900">
                                            <tr>
                                                <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500">Agent</th>
                                                <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500">Parent Org</th>
                                                <th className="p-2 text-[10px] uppercase tracking-wider text-gray-500 text-right">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredVolunteers.map(vol => (
                                                <tr key={vol.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                                    <td className="p-2 text-sm font-medium">{vol.name}</td>
                                                    <td className="p-2 text-[10px] text-gray-500 uppercase truncate max-w-[120px]">
                                                        {organisations.find(o => o.id === vol.organisationId)?.name}
                                                    </td>
                                                    <td className="p-2 font-black text-blue-400 text-right">{vol.enrollments}</td>
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

                {/* Account Security Section */}
                <div className="xl:col-span-1">
                    <Card title="Security Configuration">
                        <div className="flex items-center gap-3 mb-6 p-4 bg-orange-500/5 rounded border border-orange-500/10">
                            <AlertCircle className="text-orange-500 flex-shrink-0" size={20} />
                            <p className="text-[10px] text-orange-200/70 leading-relaxed uppercase tracking-widest font-bold">
                                Updating your security key will immediate affect your next terminal login session.
                            </p>
                        </div>
                        
                        <form onSubmit={handlePasswordUpdate} className="space-y-4">
                            <Input 
                                label="NEW SECURITY KEY"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-black/40 border-gray-800 text-sm font-mono"
                                required
                            />
                            <Input 
                                label="CONFIRM SECURITY KEY"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-black/40 border-gray-800 text-sm font-mono"
                                required
                            />
                            
                            <Button 
                                type="submit" 
                                disabled={isUpdatingPassword || !newPassword}
                                className="w-full py-4 text-[10px] tracking-[0.2em] font-black uppercase flex items-center justify-center gap-2"
                            >
                                {isUpdatingPassword ? (
                                    <RefreshCw className="animate-spin" size={14} />
                                ) : (
                                    <Key size={14} />
                                )}
                                {isUpdatingPassword ? 'SYNCHRONIZING...' : 'UPDATE SECURITY KEY'}
                            </Button>
                        </form>
                    </Card>

                    <Card className="mt-8 border-gray-800 bg-black/40">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">System Identity</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">Active Profile:</span>
                                <span className="text-white font-bold underline decoration-orange-500/50 underline-offset-4">Master Admin</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">Access Tier:</span>
                                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20 font-black">UNRESTRICTED</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
