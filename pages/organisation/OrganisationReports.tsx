
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
import { FileSpreadsheet, Filter, Search } from 'lucide-react';

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
        volunteerId: '',
        search: ''
    });

    const filteredMembers = useMemo(() => {
        return myMembers.filter(member => {
            const submissionDate = new Date(member.submission_date);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            if (endDate) endDate.setHours(23, 59, 59, 999);

            if (startDate && submissionDate < startDate) return false;
            if (endDate && submissionDate > endDate) return false;
            if (filters.volunteerId && member.volunteer_id !== filters.volunteerId) return false;
            
            if (filters.search) {
                const term = filters.search.toLowerCase();
                return member.name.toLowerCase().includes(term) || 
                       member.surname.toLowerCase().includes(term) || 
                       member.mobile.includes(term);
            }
            
            return true;
        });
    }, [myMembers, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDownload = () => {
        if (filteredMembers.length === 0) {
            addNotification("No data available for export with current filters.", "error");
            return;
        }

        const headers = ['Aadhaar', 'Name', 'Surname', 'Mobile', 'Submission Date', 'Volunteer', 'Occupation', 'Support Need', 'Status'];
        const rows = filteredMembers.map(m => [
            m.aadhaar,
            m.name,
            m.surname,
            m.mobile,
            m.submission_date,
            myVolunteers.find(v => v.id === m.volunteer_id)?.name || 'Unknown',
            m.occupation,
            m.support_need,
            m.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `SSK_Report_${user?.organisationName || 'Org'}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addNotification("Membership drive data downloaded successfully.", 'success');
    };

    return (
        <DashboardLayout title="Drive Intelligence">
            <Card className="mb-8">
                <div className="flex items-center gap-2 mb-6 text-orange-500">
                    <Filter size={18} />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em]">Filter Parameters</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                    <Input label="Search Agent/Member" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Name or Phone..." />
                    <Input label="Start Date" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                    <Input label="End Date" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                    <Select label="Filter by Agent" name="volunteerId" value={filters.volunteerId} onChange={handleFilterChange}>
                        <option value="">All Field Agents</option>
                        {myVolunteers.map(vol => (
                            <option key={vol.id} value={vol.id}>{vol.name}</option>
                        ))}
                    </Select>
                </div>
                
                <div className="mt-8 flex justify-end">
                    <Button onClick={handleDownload} className="flex items-center gap-2 px-8 py-3 text-xs font-black tracking-widest uppercase shadow-xl shadow-orange-900/10">
                        <FileSpreadsheet size={16} /> Export Master Dataset
                    </Button>
                </div>
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Search size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Dataset results: {filteredMembers.length} records</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-gray-800">
                      <tr>
                        <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Member Identity</th>
                        <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Processing Agent</th>
                        <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500">Submission Node</th>
                        <th className="p-3 text-[10px] uppercase tracking-widest text-gray-500 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                          <tr><td colSpan={4} className="text-center p-12 animate-pulse text-xs text-gray-500 font-black uppercase tracking-widest">Scanning Storage...</td></tr>
                      ) : (
                        <>
                        {filteredMembers.slice(0, 50).map(member => (
                          <tr key={member.id} className="border-b border-gray-900 hover:bg-gray-800/50 transition-colors">
                            <td className="p-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{member.name} {member.surname}</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{member.mobile}</span>
                                </div>
                            </td>
                            <td className="p-3">
                                <span className="text-xs text-gray-400 font-medium">
                                    {myVolunteers.find(v => v.id === member.volunteer_id)?.name || 'System Agent'}
                                </span>
                            </td>
                            <td className="p-3">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{member.submission_date}</span>
                            </td>
                            <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                    member.status === 'Accepted' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                }`}>
                                    {member.status}
                                </span>
                            </td>
                          </tr>
                        ))}
                        {filteredMembers.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-16 text-gray-600 uppercase tracking-widest font-black text-[10px]">No matches found within the organization's dataset.</td>
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
