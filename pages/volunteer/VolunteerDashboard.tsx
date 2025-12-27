
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
import { User, RefreshCw, Clock, Filter, Search, MapPin, Phone, Building2, UserCircle } from 'lucide-react';

// Extended type for joined data
type MemberWithAttribution = Member & {
    agent?: {
        name: string;
        organisations?: {
            name: string;
        }
    }
};

const VolunteerDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [mySubmissions, setMySubmissions] = useState<MemberWithAttribution[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    const fetchSubmissions = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // Optimized Join: Member -> Volunteer Profile -> Organisation
            const { data, error } = await supabase
                .from('members')
                .select(`
                    *,
                    agent:profiles!volunteer_id (
                        name,
                        organisations (name)
                    )
                `)
                .eq('volunteer_id', user.id)
                .order('submission_date', { ascending: false });
                
            if (error) throw error;
            if (data) setMySubmissions(data as MemberWithAttribution[]);
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
            const start = filters.startDate ? new Date(filters.startDate) : null;
            const end = filters.endDate ? new Date(filters.endDate) : null;
            if (end) end.setHours(23, 59, 59, 999);
            
            if (start && submissionDate < start) return false;
            if (end && submissionDate > end) return false;
            if (filters.phone && !member.mobile.includes(filters.phone)) return false;
            if (filters.area && !member.pincode.includes(filters.area)) return false;
            return true;
        });
    }, [mySubmissions, filters]);

    return (
        <DashboardLayout title="Field Operations Hub">
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 p-10 bg-blue-900/10 border border-blue-900/20 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                        <User size={150} />
                    </div>
                    <div className="flex gap-8 items-center relative z-10">
                         <div className="p-6 bg-blue-500/10 rounded-3xl text-blue-400 border border-blue-400/20 shadow-xl group-hover:scale-105 transition-transform">
                            <User size={40} strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400/60 mb-2">Authenticated Operator</p>
                            <h2 className="font-cinzel text-4xl text-white tracking-tighter leading-none">{user?.name}</h2>
                        </div>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto relative z-10">
                        <button onClick={fetchSubmissions} className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/40 transition-all text-gray-500 hover:text-white shadow-lg">
                            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <Button onClick={() => navigate('/volunteer/new-member')} className="flex-1 md:flex-none py-5 px-12 text-[10px] font-black uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] bg-blue-600 hover:bg-blue-500">
                            Enroll New Member
                        </Button>
                    </div>
                </div>
                
                <Card className="border-white/5 bg-gray-900/20 backdrop-blur-md p-8 rounded-[2rem]">
                    <div className="flex items-center gap-2 mb-6 text-gray-500">
                        <Filter size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Query Parameters</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Input label="ENROLLMENT FROM" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        <Input label="ENROLLMENT TO" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                        <Input label="MEMBER MOBILE" name="phone" placeholder="91XXXXXXXX" value={filters.phone} onChange={handleFilterChange} icon={<Phone size={14} />} />
                        <Input label="SECTOR PINCODE" name="area" placeholder="560XXX" value={filters.area} onChange={handleFilterChange} icon={<MapPin size={14} />} />
                    </div>
                </Card>

                <Card title="My Field Enrollments" className="bg-[#050505] border-white/5 rounded-[2.5rem]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-white/5">
                          <tr>
                            <th className="p-6 text-[10px] uppercase tracking-widest text-gray-600 font-black">Member Identity</th>
                            <th className="p-6 text-[10px] uppercase tracking-widest text-blue-500 font-black">Enrolled By (Personnel)</th>
                            <th className="p-6 text-[10px] uppercase tracking-widest text-gray-600 font-black text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {loading ? (
                              <tr><td colSpan={3} className="text-center p-32 animate-pulse text-[10px] uppercase tracking-[0.4em] text-gray-700 font-black">Synchronizing Nodes...</td></tr>
                          ) : (
                            <>
                            {filteredSubmissions.map(member => (
                              <tr key={member.id} className="group hover:bg-white/[0.01] transition-all duration-300">
                                <td className="p-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{member.name} {member.surname}</span>
                                            <Search size={12} className="text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono tracking-tighter">
                                          <Phone size={10} /> {member.mobile}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-inner">
                                            <UserCircle size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-white uppercase tracking-widest">
                                                {member.agent?.name || user?.name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Building2 size={10} className="text-orange-500" />
                                                <span className="text-[9px] font-black text-orange-500/80 uppercase tracking-widest">
                                                    {member.agent?.organisations?.name || user?.organisationName || 'Independent'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                        member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}>
                                      {member.status}
                                    </span>
                                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-tighter">{member.submission_date.split('T')[0]}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredSubmissions.length === 0 && (
                                <tr><td colSpan={3} className="text-center p-40 text-[11px] text-gray-800 font-black uppercase tracking-[0.5em]">No activity logs in this quadrant.</td></tr>
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
