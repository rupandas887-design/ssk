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
import { User, Building2, AlertTriangle, RefreshCw, ShieldAlert, Copy, ExternalLink, Database, Zap, Clock } from 'lucide-react';

const VolunteerDashboard: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [mySubmissions, setMySubmissions] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    const fetchSubmissions = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('volunteer_id', user.id)
                .order('submission_date', { ascending: false });
            if (error) throw error;
            if (data) setMySubmissions(data);
        } catch (err: any) {
            addNotification(`Sync Fault: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [user, addNotification]);
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        phone: '',
        area: '', 
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
            if (endDate) endDate.setHours(23, 59, 59, 999);
            if (startDate && submissionDate < startDate) return false;
            if (endDate && submissionDate > endDate) return false;
            if (filters.phone && !member.mobile.includes(filters.phone)) return false;
            if (filters.area && !member.pincode.includes(filters.area)) return false;
            return true;
        });
    }, [mySubmissions, filters]);

    return (
        <DashboardLayout title="Field Operations Hub">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-blue-900/10 border border-blue-900/20 rounded-3xl">
                    <div className="flex gap-6 items-center">
                         <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400">
                            <User size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400/60 mb-1">Operator Profile</p>
                            <h2 className="font-cinzel text-3xl text-white tracking-tight">{user?.name}</h2>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={fetchSubmissions} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/40 transition-all text-gray-500 hover:text-white">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <Button onClick={() => navigate('/volunteer/new-member')} className="flex-1 md:flex-none py-4 px-10 shadow-2xl">
                            Enroll New Member
                        </Button>
                    </div>
                </div>
                
                <Card className="border-white/5 bg-gray-900/40">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input label="From" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        <Input label="To" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                        <Input label="Phone" name="phone" placeholder="Search..." value={filters.phone} onChange={handleFilterChange} />
                        <Input label="Pincode" name="area" placeholder="Search..." value={filters.area} onChange={handleFilterChange} />
                    </div>
                </Card>

                <Card title="My Field Enrollments">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-gray-800">
                          <tr>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Member Identity</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">VOLUNTEER</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Date</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                              <tr><td colSpan={4} className="text-center p-20 animate-pulse text-[10px] uppercase tracking-[0.3em] text-gray-600 font-black">Scanning...</td></tr>
                          ) : (
                            <>
                            {filteredSubmissions.map(member => (
                              <tr key={member.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-colors">
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{member.name} {member.surname}</span>
                                        <span className="text-[10px] text-gray-600 font-mono">{member.mobile}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="px-3 py-1 bg-blue-500/5 border border-blue-500/10 rounded-lg inline-block">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{user?.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center text-xs text-gray-500">{member.submission_date.split('T')[0]}</td>
                                <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                      member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  }`}>
                                    {member.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {filteredSubmissions.length === 0 && (
                                <tr><td colSpan={4} className="text-center p-20 text-[10px] text-gray-600 font-black uppercase tracking-widest">No records found.</td></tr>
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