
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
      // Fetching from tables that now have public read access via RLS
      const [mRes, oRes, pRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('organisations').select('*'),
        supabase.from('profiles').select('*')
      ]);

      if (mRes.data) setMembers(mRes.data);
      if (oRes.data) setOrganisations(oRes.data);
      
      if (pRes.data) {
        // We filter for volunteers. We check specifically for 'Volunteer' string 
        // regardless of how it was typed in the database (case-insensitive)
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

    // Establish Live Realtime Sync via Supabase Channel
    const channel = supabase
      .channel('public-registry-monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organisations' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const volunteers = useMemo(() => {
    if (!volsData.length) return [];
    
    // Map of volunteer_id -> enrollment count
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
    <div className="bg-black text-white min-h-screen selection:bg-orange-500/30">
      <Header isLandingPage />

      {/* Community Heritage Section */}
      <section className="relative pt-48 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-16">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-cinzel font-bold uppercase tracking-tight leading-[1.2]">
              <span className="text-white block">THE SOMAVAMSHA SAHASRARJUNA</span>
              <span className="text-[#FF6600] block mt-1 drop-shadow-[0_2px_8px_rgba(255,102,0,0.25)]">KSHATRIYA (SSK)</span>
            </h1>
          </div>
          
          <div className="space-y-8 text-gray-300 text-lg leading-relaxed text-left max-w-4xl mx-auto font-light">
            <p>
              The Somavamsha Sahasrarjuna Kshatriya (SSK) community belongs to the Somavamsha or Chandravamsha (Lunar Dynasty), one of the three main Kshatriya lineages in India. Descended from Soma (the Moon), they are known as warriors of the Moon Dynasty.
            </p>
            <p>
              The name Sahasrarjuna refers to the great emperor Kartavirya Arjuna, who was blessed with a thousand hands for his devotion and strength. 
            </p>
          </div>

          <div className="mt-20 flex justify-center">
            {/* Reduced max-width from 3xl to md */}
            <div className="relative group max-w-md">
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
      <main className="container mx-auto px-6 py-24 space-y-32">
        <section id="analytics">
          <div className="flex flex-col items-center mb-16">
            <div className="flex items-center gap-3">
               <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              <h2 className="text-4xl font-cinzel text-center uppercase tracking-widest">
                Live <span className="text-orange-500">Analytics</span>
              </h2>
            </div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mt-4">
              Real-time Uplink: {lastSync.toLocaleTimeString()}
            </p>
          </div>

          {!loading ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="flex flex-col items-center justify-center p-12 bg-[#050505] border-white/5 group hover:border-orange-500/30 transition-all duration-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
                      <Globe size={120} />
                  </div>
                  <Users className="text-orange-500/20 group-hover:text-orange-500 transition-colors mb-6" size={64} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 mb-2">Total Verified Members</p>
                  <p className="text-8xl font-black text-white tracking-tighter leading-none font-cinzel">{totalMembers}</p>
                </Card>
                
                <Card title="Gender Distribution" className="bg-[#050505] border-white/5">
                  <GenderChart members={members} />
                </Card>
                
                <Card title="Professional Demographics" className="bg-[#050505] border-white/5">
                  <OccupationChart members={members} />
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <Card title="Global Support Demand Matrix" className="lg:col-span-3 bg-[#050505] border-white/5">
                    <SupportChart members={members} />
                  </Card>
                  
                  <Card title="Network Activity" className="bg-[#050505] border-white/5 flex flex-col justify-center items-center text-center p-10">
                      <div className="p-6 bg-orange-500/10 rounded-full text-orange-500 mb-6">
                          <Activity size={48} />
                      </div>
                      <p className="text-4xl font-black text-white mb-2">{volunteers.length}</p>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Field Nodes</p>
                      
                      <div className="mt-8 pt-8 border-t border-white/5 w-full">
                          <p className="text-4xl font-black text-white mb-2">{organisations.length}</p>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sector Units</p>
                      </div>
                  </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-32 gap-6">
              <RefreshCw className="animate-spin text-orange-500" size={48} />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">Syncing Master Node...</p>
            </div>
          )}
        </section>

        {/* Top Performers Section */}
        <section>
          <div className="flex flex-col items-center mb-16">
            <h2 className="text-4xl font-cinzel text-center uppercase tracking-widest">
              Master <span className="text-orange-500">Nodes</span>
            </h2>
          </div>
          {!loading ? (
            <Leaderboard members={members} organisations={organisations} volunteers={volunteers} />
          ) : (
            <p className="text-center text-gray-700 animate-pulse font-black text-[10px] uppercase tracking-widest">Calculating Performance...</p>
          )}
        </section>

        {!loading && (
          <Rewards 
            members={members} 
            volunteers={volunteers} 
            organisations={organisations} 
          />
        )}

        <section className="text-center pb-20">
          <div className="max-w-4xl mx-auto p-16 bg-gradient-to-br from-[#080808] to-black rounded-[3rem] border border-orange-500/10 relative overflow-hidden group">
            <h2 className="text-4xl font-cinzel text-white uppercase tracking-widest mb-8">Join the Registry</h2>
            <p className="text-gray-400 font-light text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
              Become a verified contributor to the global SSK database.
            </p>
            <div className="inline-block px-12 py-6 bg-orange-600 hover:bg-orange-500 rounded-full shadow-[0_20px_50px_-10px_rgba(255,100,0,0.2)] transition-all duration-500 active:scale-95">
              <a href="tel:+918884449689" className="text-2xl font-black text-white tracking-widest">
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
