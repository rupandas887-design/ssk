
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck } from 'lucide-react';
import { supabase } from '../../supabase/client';
import { Member, Role, User as VolunteerUser } from '../../types';

const OrganisationDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myVolunteers, setMyVolunteers] = useState<VolunteerUser[]>([]);
    const [myMembers, setMyMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.organisationId) return;
            setLoading(true);
            const { data: volsData } = await supabase.from('profiles')
                .select('*')
                .eq('role', Role.Volunteer)
                .eq('organisation_id', user.organisationId);

            const { data: membersData } = await supabase.from('members')
                .select('*')
                .eq('organisation_id', user.organisationId);
            
            if (volsData) setMyVolunteers(volsData);
            if (membersData) setMyMembers(membersData);
            setLoading(false);
        }
        fetchData();
    }, [user]);

    return (
        <DashboardLayout title="Admin Dashboard">
             {loading ? <p>Loading dashboard...</p> : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex items-center space-x-4">
                    <Users className="text-orange-500" size={40} />
                    <div>
                        <p className="text-gray-400">Your Volunteers</p>
                        <p className="text-2xl font-bold">{myVolunteers.length}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-4">
                    <UserCheck className="text-orange-500" size={40} />
                    <div>
                        <p className="text-gray-400">Your Memberships</p>
                        <p className="text-2xl font-bold">{myMembers.length}</p>
                    </div>
                </Card>
            </div>
             <div className="mt-8">
                <Card title="Your Volunteer Performance">
                    <p className="text-gray-400">Performance insights for {user?.name} volunteers.</p>
                </Card>
             </div>
             </>
             )}
        </DashboardLayout>
    );
};

export default OrganisationDashboard;
