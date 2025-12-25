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
import { User, Building2, AlertTriangle, RefreshCw } from 'lucide-react';

const VolunteerDashboard: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [mySubmissions, setMySubmissions] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!user?.id) return;
            setLoading(true);
            
            // Check if user has an organisation assigned. If not, the profile sync failed.
            if (!user.organisationId) {
                console.warn("Profile sync missing. Attempting emergency refresh.");
                await refreshProfile();
            }

            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('volunteer_id', user.id);
            
            if (error) {
                console.error("Submission Registry Error:", error);
                // Hard Fix: Access error.message to avoid [object Object] in notification
                addNotification(`Sync Error: ${error.message || 'Unknown Protocol Fault'}`, 'error');
            } else if (data) {
                setMySubmissions(data);
            }
            setLoading(false);
        };
        fetchSubmissions();
    }, [user, addNotification, refreshProfile]);
    
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

    if (!user?.organisationId && !loading) {
        return (
            <DashboardLayout title="Identity Sync Required">
                <Card className="border-red-500/30 bg-red-950/10 p-12 text-center max-w-2xl mx-auto mt-20">
                    <AlertTriangle className="text-red-500 mx-auto mb-6" size={64} />
                    <h2 className="text-2xl font-cinzel text-white mb-4">Identity Out of Sync</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        Your account has been verified, but your field profile is not yet linked to an organization. 
                        This usually happens if the background sync trigger encountered a database conflict.
                    </p>
                    <div className="flex flex-col gap-4">
                        <Button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2">
                            <RefreshCw size={18} /> Re-establish Handshake
                        </Button>
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                            Contact Master Admin if this persists
                        </p>
                    </div>
                </Card>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Field Operations Hub">
            <div className="space-y-6">
                {/* Identity Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 bg-blue-900/10 border border-blue-900/20 rounded-3xl backdrop-blur-sm">
                    <div className="flex gap-6 items-center">
                         <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 shadow-xl shadow-blue-950/40">
                            <User size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400/60 mb-1">Authenticated Field Force</p>
                            <h2 className="font-cinzel text-3xl text-white tracking-tight">{user?.name}</h2>
                        </div>
                    </div>
                    <div className="flex gap-6 items-center md:border-l border-white/5 md:pl-10">
                         <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-gray-500">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-1">Operational Sector</p>
                            <h2 className="font-cinzel text-xl text-white opacity-80">{user?.organisationName || 'Registry Pending'}</h2>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/volunteer/new-member')} className="w-full md:w-auto mt-2 md:mt-0 py-4 px-10 rounded-2xl shadow-2xl">
                        Enroll New Member
                    </Button>
                </div>
                
                <Card className="mb-6 border-white/5 bg-gray-900/40">
                    <div className="flex flex-wrap gap-6 items-end p-2">
                        <div className="flex-1 min-w-[200px]">
                            <Input label="Registry Start" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <Input label="Registry End" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <Input label="Search Mobile" type="text" name="phone" placeholder="91XXXXXXXX" value={filters.phone} onChange={handleFilterChange} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <Input label="Area Pincode" type="text" name="area" placeholder="560XXX" value={filters.area} onChange={handleFilterChange} />
                        </div>
                    </div>
                </Card>

                <Card title="My Field Enrollments">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-gray-800">
                          <tr>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Member Identity</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black">Mobile</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Date</th>
                            <th className="p-4 text-[10px] uppercase tracking-widest text-gray-500 font-black text-center">Status</th>
                            <th className="p-4 text-right"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                              <tr><td colSpan={5} className="text-center p-20 animate-pulse text-[10px] uppercase tracking-[0.3em] text-gray-600 font-black">Scanning Master Registry...</td></tr>
                          ) : (
                            <>
                            {filteredSubmissions.map(member => (
                              <tr key={member.id} className="group border-b border-gray-900/50 hover:bg-white/[0.02] transition-colors">
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white group-hover:text-orange-500 transition-colors">{member.name} {member.surname}</span>
                                        <span className="text-[10px] text-gray-600 uppercase tracking-wider">{member.pincode}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-gray-400">{member.mobile}</td>
                                <td className="p-4 text-center text-xs text-gray-500">{member.submission_date}</td>
                                <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                      member.status === MemberStatus.Accepted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  }`}>
                                    {member.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  {member.status === MemberStatus.Pending && (
                                      <Button variant="secondary" size="sm" onClick={() => addNotification(`Edit node for ${member.name} is not implemented.`, 'info')} className="text-[10px] px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                          Update
                                      </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {filteredSubmissions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-20 text-gray-700 font-black uppercase tracking-widest text-[10px]">
                                        No active records detected in current window.
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