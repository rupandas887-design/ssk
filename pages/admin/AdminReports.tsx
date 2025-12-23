
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { supabase } from '../../supabase/client';
import { Member, Organisation } from '../../types';
import { useNotification } from '../../context/NotificationContext';

const AdminReports: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: membersData } = await supabase.from('members').select('*').limit(100); // Limiting for performance
            const { data: orgsData } = await supabase.from('organisations').select('*');
            if (membersData) setMembers(membersData);
            if (orgsData) setOrganisations(orgsData);
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleDownload = () => {
        // In a real app, this would generate and download a CSV/PDF file.
        console.log("Downloading report with current filters...");
        addNotification("Report download initiated (simulated).", 'info');
        console.table(members);
    };

    return (
        <DashboardLayout title="Membership Reports">
            <Card>
                <div className="flex flex-wrap gap-4 items-end mb-6 p-4 bg-gray-800 rounded-md">
                    <div className="flex-1 min-w-[150px]">
                        <Input label="Start Date" type="date" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <Input label="End Date" type="date" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <Select label="Organisation">
                            <option value="">All Organisations</option>
                            {organisations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </Select>
                    </div>
                    <Button onClick={handleDownload}>Download Report</Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Mobile</th>
                        <th className="p-2">Organisation</th>
                        <th className="p-2">Date</th>
                         <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} className="text-center p-4">Loading reports...</td></tr>
                      ) : (
                        members.slice(0, 20).map(member => (
                          <tr key={member.id} className="border-b border-gray-800 hover:bg-gray-800">
                            <td className="p-2">{member.name} {member.surname}</td>
                            <td className="p-2">{member.mobile}</td>
                            <td className="p-2">{organisations.find(o => o.id === member.organisation_id)?.name}</td>
                            <td className="p-2">{member.submission_date}</td>
                            <td className={`p-2 font-semibold ${member.status === 'Accepted' ? 'text-green-400' : 'text-yellow-400'}`}>{member.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
            </Card>
        </DashboardLayout>
    );
};

export default AdminReports;
