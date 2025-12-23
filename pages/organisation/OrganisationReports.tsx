
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { supabase } from '../../supabase/client';
import { Member, Role, User as VolunteerUser } from '../../types';
import { useNotification } from '../../context/NotificationContext';

const OrganisationReports: React.FC = () => {
    const { user } = useAuth();
    const [myMembers, setMyMembers] = useState<Member[]>([]);
    const [myVolunteers, setMyVolunteers] = useState<VolunteerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    useEffect(() => {
        const fetchData = async () => {
            if (!user?.organisationId) return;
            setLoading(true);
            const { data: membersData } = await supabase.from('members').select('*').eq('organisation_id', user.organisationId);
            const { data: volsData } = await supabase.from('profiles').select('*').eq('role', Role.Volunteer).eq('organisation_id', user.organisationId);
            if (membersData) setMyMembers(membersData);
            if (volsData) setMyVolunteers(volsData);
            setLoading(false);
        };
        fetchData();
    }, [user]);

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        volunteerId: '' // Empty string for 'All'
    });

    const filteredMembers = useMemo(() => {
        return myMembers.filter(member => {
            const submissionDate = new Date(member.submission_date);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
            }

            if (startDate && submissionDate < startDate) {
                return false;
            }
            if (endDate && submissionDate > endDate) {
                return false;
            }
            if (filters.volunteerId && member.volunteer_id !== filters.volunteerId) {
                return false;
            }
            return true;
        });
    }, [myMembers, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDownload = () => {
        console.log("Downloading report for organisation:", user?.organisationId, "with filters:", filters);
        addNotification("Report download initiated (simulated).", 'info');
        console.table(filteredMembers);
    };

    return (
        <DashboardLayout title="Your Membership Reports">
            <Card>
                <div className="flex flex-wrap gap-4 items-end mb-6 p-4 bg-gray-800 rounded-md">
                    <div className="flex-1 min-w-[150px]">
                        <Input label="Start Date" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <Input label="End Date" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <Select label="Volunteer" name="volunteerId" value={filters.volunteerId} onChange={handleFilterChange}>
                            <option value="">All Volunteers</option>
                            {myVolunteers.map(vol => (
                                <option key={vol.id} value={vol.id}>{vol.name} ({vol.email})</option>
                            ))}
                        </Select>
                    </div>
                    <Button onClick={handleDownload}>Download Report</Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th className="p-2">Member Name</th>
                        <th className="p-2">Volunteer</th>
                        <th className="p-2">Submission Date</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                          <tr><td colSpan={4} className="text-center p-4">Loading reports...</td></tr>
                      ) : (
                        <>
                        {filteredMembers.slice(0, 50).map(member => ( // Display up to 50 records for performance
                          <tr key={member.id} className="border-b border-gray-800 hover:bg-gray-800">
                            <td className="p-2">{member.name} {member.surname}</td>
                            <td className="p-2">{myVolunteers.find(v => v.id === member.volunteer_id)?.name}</td>
                            <td className="p-2">{member.submission_date}</td>
                            <td className={`p-2 font-semibold ${member.status === 'Accepted' ? 'text-green-400' : 'text-yellow-400'}`}>{member.status}</td>
                          </tr>
                        ))}
                        {filteredMembers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-4 text-gray-500">No members match the current filters.</td>
                            </tr>
                        )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
            </Card>
        </DashboardLayout>
    );
};

export default OrganisationReports;
