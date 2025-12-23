
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { Shield, Users, UserCheck } from 'lucide-react';
import { Organisation, Volunteer, Member, Role } from '../../types';
import { supabase } from '../../supabase/client';

interface OrgPerformance extends Organisation {
    enrollments: number;
}

const AdminDashboard: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <DashboardLayout title="Master Admin Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="flex items-center space-x-4">
                    <Shield className="text-orange-500" size={40} />
                    <div>
                        <p className="text-gray-400">Total Organisations</p>
                        <p className="text-2xl font-bold">{organisations.length}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-4">
                    <Users className="text-orange-500" size={40} />
                    <div>
                        <p className="text-gray-400">Total Volunteers</p>
                        <p className="text-2xl font-bold">{volunteers.length}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-4">
                    <UserCheck className="text-orange-500" size={40} />
                    <div>
                        <p className="text-gray-400">Total Memberships</p>
                        <p className="text-2xl font-bold">{members.length}</p>
                    </div>
                </Card>
            </div>
             <div className="mt-8">
                <Card title="Performance Overview">
                    <div className="mb-4">
                        <Input
                            placeholder="Search by organisation mobile number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {loading ? <p>Loading performance data...</p> : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-cinzel text-lg text-orange-400 mb-3">Organisation Performance</h4>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left">
                                    <thead className="border-b border-gray-700 sticky top-0 bg-gray-900">
                                        <tr>
                                            <th className="p-2">Organisation</th>
                                            <th className="p-2">Mobile</th>
                                            <th className="p-2">Members</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrgs.map(org => (
                                            <tr key={org.id} className="border-b border-gray-800 hover:bg-gray-800">
                                                <td className="p-2">{org.name}</td>
                                                <td className="p-2">{org.mobile}</td>
                                                <td className="p-2 font-bold text-orange-400">{org.enrollments}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-cinzel text-lg text-orange-400 mb-3">Volunteer Performance</h4>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left">
                                    <thead className="border-b border-gray-700 sticky top-0 bg-gray-900">
                                        <tr>
                                            <th className="p-2">Volunteer</th>
                                            <th className="p-2">Organisation</th>
                                            <th className="p-2">Members</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredVolunteers.map(vol => (
                                            <tr key={vol.id} className="border-b border-gray-800 hover:bg-gray-800">
                                                <td className="p-2">{vol.name}</td>
                                                <td className="p-2 text-sm text-gray-400">{organisations.find(o => o.id === vol.organisationId)?.name}</td>
                                                <td className="p-2 font-bold text-orange-400">{vol.enrollments}</td>
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
        </DashboardLayout>
    );
};

export default AdminDashboard;
