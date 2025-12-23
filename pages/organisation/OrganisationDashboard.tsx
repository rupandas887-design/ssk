
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { Users, UserCheck, Building2, User as UserIcon } from 'lucide-react';
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
            <div className="space-y-8">
                {/* Identity Banner */}
                <div className="p-6 rounded-lg border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-black to-black flex flex-col md:flex-row gap-6 md:items-center">
                    <div className="flex items-center gap-4 border-r border-orange-500/10 pr-6">
                        <div className="p-3 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500/60">Managing Entity</p>
                            <h2 className="font-cinzel text-2xl text-white">{user?.organisationName || 'Not Set'}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-full border border-white/10 text-white/40">
                            <UserIcon size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Access Identity</p>
                            <h2 className="font-cinzel text-xl text-white">{user?.name}</h2>
                        </div>
                    </div>
                </div>

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
                        <p className="text-gray-400">Performance insights for {user?.name} volunteers at {user?.organisationName}.</p>
                    </Card>
                </div>
             </div>
             )}
        </DashboardLayout>
    );
};

export default OrganisationDashboard;
