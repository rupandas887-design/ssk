
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Card from '../components/ui/Card';
import GenderChart from '../components/charts/GenderChart';
import OccupationChart from '../components/charts/OccupationChart';
import SupportChart from '../components/charts/SupportChart';
import Leaderboard from '../components/Leaderboard';
import Rewards from '../components/Rewards';
import { supabase } from '../supabase/client';
import { Member, Organisation, Role } from '../types';
import { Users, RefreshCw, Globe, Activity } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [volsData, setVolsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [mRes, oRes, pRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('organisations').select('*'),
        supabase.from('profiles').select('*')
      ]);

      if (mRes.data) setMembers(mRes.data);
      if (oRes.data) setOrganisations(oRes.data);
      
      if (pRes.data) {
        const filteredVols = pRes.data.filter(p => {
          if (!p.role) return false;
          const roleStr = String(p.role).toLowerCase();
          return roleStr === 'volunteer';
        });
        setVolsData(filteredVols);
      }
      
      setLastSync(new Date());
    } catch (err) {
      console.error("Master Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('public-registry-monitor')
      .on(
        'postgres_changes',
        'public',
        'members',
        () => fetchData()
      )
      .on(
        'postgres_changes',
        'public',
        'profiles',
        () => fetchData()
      )
      .on(
        'postgres_changes',
        'public',
        'organisations',
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const volunteers = useMemo(() => {
    if (!volsData.length) return [];
    
    const enrollmentMap = members.reduce((acc, m) => {
      if (m.volunteer_id) {
        acc[m.volunteer_id] = (acc[m.volunteer_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return volsData.map(v => ({
      id: v.id,
      name: v.name || 'Anonymous Agent',
      email: v.email,
      role: Role.Volunteer,
      organisationId: v.organisation_id,
      mobile: v.mobile,
      enrollments: enrollmentMap[v.id] || 0,
    }));
  }, [volsData, members]);

  const totalMembers = members.length;

  return (
    <div className="bg-black text-white min-h-screen selection:bg-orange-500/30 overflow-x-hidden">
      <Header isLandingPage />

      {/* Community Heritage Section */}
      <section className="relative pt-32 md:pt-48 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-12 md:mb-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-cinzel font-bold uppercase tracking-tight leading-[1.2]">
              <span className="text-white block">THE SOMAVAMSHA SAHASRARJUNA</span>
              <span className="text-[#FF6600] block mt-1 drop-shadow-[0_2px_8px_rgba(255,102,0,0.25)]">KSHATRIYA (SSK)</span>
            </h1>
          </div>
          
          <div className="space-y-6 md:space-y-8 text-white text-sm sm:text-base md:text-lg leading-relaxed text-left max-w-4xl mx-auto font-light">
            <p>
              The Somavamsha Sahasrarjuna Kshatriya (SSK) community belongs to the Somavamsha or Chandravamsha (Lunar Dynasty), one of the three main Kshatriya lineages in India. Descended from Soma (the Moon), they are known as warriors of the Moon Dynasty.
            </p>
            <p>
              The name Sahasrarjuna refers to the great emperor Kartavirya Arjuna, who was blessed with a thousand hands for his devotion and strength. 
            </p>
          </div>

          <div className="mt-12 md:mt-20 flex justify-center">
            <div className="relative group max-w-xs md:max-w-md w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-orange-900/10 rounded-2xl blur opacity-25"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(255,100,0,0.08)] border border-white/5">
                <img 
                  src="https://i.pinimg.com/736x/68/ac/f6/68acf6f32a216959c497c7a232b35551.jpg" 
                  alt="Sahasrarjuna Illustration" 
                  className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Analytics Dashboard */}
      <main className="container mx-auto px-4 md:px-6 py-12 md:py-24 space-y-24 md:space-y-32">
        <section id="analytics">
          <div className="flex flex-col items-center mb-12 md:mb-16">
            <div className="flex items-center gap-3">
               <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <h2 className="text-2xl md:text-4xl font-cinzel text-center uppercase tracking-widest">
                Live <span className="text-orange-500">Analytics</span>
              </h2>
            </div>
            <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.4em] mt-4">
              Real-time Uplink: {lastSync.toLocaleTimeString()}
            </p>
          </div>

          {!loading ? (
            <div className="space-y-8 md:space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <Card className="flex flex-col items-center justify-center p-8 md:p-12 bg-[#050505] border-white/5 group hover:border-orange-500/30 transition-all duration-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
                      <Globe size={120} />
                  </div>
                  <Users className="text-orange-500/20 group-hover:text-orange-500 transition-colors mb-4 md:mb-6" size={48} strokeWidth={1} />
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-white mb-2 text-center">Total Verified Members</p>
                  <p className="text-6xl md:text-8xl font-black text-orange-500 tracking-tighter leading-none font-cinzel">{totalMembers}</p>
                </Card>
                
                <Card title="Gender Distribution" className="bg-[#050505] border-white/5 overflow-hidden">
                  <GenderChart members={members} />
                </Card>
                
                <Card title="Professional Demographics" className="bg-[#050505] border-white/5 overflow-hidden">
                  <OccupationChart members={members} />
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                  <Card title="Global Support Demand Matrix" className="lg:col-span-3 bg-[#050505] border-white/5 overflow-hidden">
                    <SupportChart members={members} />
                  </Card>
                  
                  <Card title="Network Activity" className="bg-[#050505] border-white/5 flex flex-col justify-center items-center text-center p-8 md:p-10">
                      <div className="p-4 md:p-6 bg-orange-500/10 rounded-full text-orange-500 mb-4 md:mb-6">
                          <Activity size={32} />
                      </div>
                      <p className="text-3xl md:text-4xl font-black text-orange-500 mb-1 md:mb-2">{volunteers.length}</p>
                      <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest text-center">Volunteers</p>
                      
                      <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/5 w-full">
                          <p className="text-3xl md:text-4xl font-black text-orange-500 mb-1 md:mb-2">{organisations.length}</p>
                          <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest text-center">ORGANIZATIONS</p>
                      </div>
                  </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 md:p-32 gap-6">
              <RefreshCw className="animate-spin text-orange-500" size={40} />
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-white">Syncing Master Node...</p>
            </div>
          )}
        </section>

        {/* Top Performers Section */}
        <section>
          <div className="flex flex-col items-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl font-cinzel text-center uppercase tracking-widest">
              Master <span className="text-orange-500">Nodes</span>
            </h2>
          </div>
          {!loading ? (
            <Leaderboard members={members} organisations={organisations} volunteers={volunteers} />
          ) : (
            <p className="text-center text-white animate-pulse font-black text-[9px] md:text-[10px] uppercase tracking-widest">Calculating Performance...</p>
          )}
        </section>

        {!loading && (
          <Rewards 
            members={members} 
            volunteers={volunteers} 
            organisations={organisations} 
          />
        )}

        <section className="text-center pb-12 md:pb-20">
          <div className="max-w-4xl mx-auto p-8 md:p-16 bg-gradient-to-br from-[#080808] to-black rounded-[2rem] md:rounded-[3rem] border border-orange-500/10 relative overflow-hidden group">
            <h2 className="text-2xl md:text-4xl font-cinzel text-white uppercase tracking-widest mb-6 md:mb-8">Join the Registry</h2>
            <p className="text-white font-light text-base md:text-lg mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed">
              Become a verified contributor to the global SSK database.
            </p>
            <div className="inline-block px-8 md:px-12 py-4 md:py-6 bg-orange-600 hover:bg-orange-500 rounded-full shadow-[0_20px_50px_-10px_rgba(255,100,0,0.2)] transition-all duration-500 active:scale-95">
              <a href="tel:+918884449689" className="text-lg md:text-2xl font-black text-white tracking-widest">
                +91 888 444 9689
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
