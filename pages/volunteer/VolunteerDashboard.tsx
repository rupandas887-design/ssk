
import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { Member, MemberStatus } from '../../types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { useNotification } from '../../context/NotificationContext';
import { User, Building2 } from 'lucide-react';

const VolunteerDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [mySubmissions, setMySubmissions] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!user?.id) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('volunteer_id', user.id);
            
            if (error) {
                console.error("Error fetching submissions:", error);
            } else if (data) {
                setMySubmissions(data);
            }
            setLoading(false);
        };
        fetchSubmissions();
    }, [user]);
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        phone: '',
        area: '', // Pincode
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredSubmissions = useMemo(() => {
        return mySubmissions.filter(member => {
            const submissionDate = new Date(member.submission_date);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
            }
            if (startDate && submissionDate < startDate) return false;
            if (endDate && submissionDate > endDate) return false;

            if (filters.phone && !member.mobile.includes(filters.phone)) {
                return false;
            }

            if (filters.area && !member.pincode.includes(filters.area)) {
                return false;
            }

            return true;
        });
    }, [mySubmissions, filters]);

    return (
        <DashboardLayout title="Volunteer Dashboard">
            <div className="space-y-6">
                {/* Identity Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 bg-blue-900/10 border border-blue-900/20 rounded-lg">
                    <div className="flex gap-4 items-center">
                         <div className="p-3 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400">
                            <User size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/60">Active Field Agent</p>
                            <h2 className="font-cinzel text-2xl text-white">{user?.name}</h2>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center md:border-l border-blue-900/30 md:pl-8">
                         <div className="p-3 bg-white/5 rounded-full border border-white/10 text-gray-500">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Reporting To</p>
                            <h2 className="font-cinzel text-xl text-white">{user?.organisationName || 'Unknown Entity'}</h2>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/volunteer/new-member')} className="w-full md:w-auto mt-2 md:mt-0">
                        Add New Member
                    </Button>
                </div>
                
                <Card className="mb-6">
                    <div className="flex flex-wrap gap-4 items-end p-2">
                        <div className="flex-1 min-w-[150px]">
                            <Input label="Start Date" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <Input label="End Date" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <Input label="Phone Number" type="text" name="phone" placeholder="Search by phone..." value={filters.phone} onChange={handleFilterChange} />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <Input label="Area (Pincode)" type="text" name="area" placeholder="Search by pincode..." value={filters.area} onChange={handleFilterChange} />
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-gray-700">
                          <tr>
                            <th className="p-2">Name</th>
                            <th className="p-2">Mobile</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                              <tr><td colSpan={5} className="text-center p-4">Loading submissions...</td></tr>
                          ) : (
                            <>
                            {filteredSubmissions.map(member => (
                              <tr key={member.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                                <td className="p-2">{member.name} {member.surname}</td>
                                <td className="p-2">{member.mobile}</td>
                                <td className="p-2">{member.submission_date}</td>
                                <td className={`p-2 font-semibold ${member.status === MemberStatus.Accepted ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {member.status}
                                </td>
                                <td className="p-2">
                                  {member.status === MemberStatus.Pending && (
                                      <Button variant="secondary" size="sm" onClick={() => addNotification(`Editing for ${member.name} is not implemented yet.`, 'info')}>
                                          Edit
                                      </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {filteredSubmissions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-4 text-gray-500">
                                        No submissions match the current filters.
                                    </td>
                                </tr>
                            )}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default VolunteerDashboard;
