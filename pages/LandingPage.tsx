import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import GenderChart from '../components/charts/GenderChart';
import OccupationChart from '../components/charts/OccupationChart';
import SupportChart from '../components/charts/SupportChart';
import Leaderboard from '../components/Leaderboard';
import Rewards from '../components/Rewards';
import OrgMarquee from '../components/ui/OrgMarquee';
import VolunteerMarquee from '../components/ui/VolunteerMarquee';
import { supabase } from '../supabase/client';
import { Member, Organisation, Role } from '../types';
import { Users, Globe, HeartPulse } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [volsData, setVolsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [mRes, oRes, pRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('organisations').select('*'),
        supabase.from('profiles').select('*, organisations(name)')
      ]);
      if (mRes.data) setMembers(mRes.data);
      if (oRes.data) setOrganisations(oRes.data);
      if (pRes.data) {
        setVolsData(pRes.data.filter(p => String(p.role).toLowerCase() === 'volunteer'));
      }
    } catch (err) {
      console.error("Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const volunteers = useMemo(() => {
    const enrollmentMap = members.reduce((acc, m) => {
      if (m.volunteer_id) acc[m.volunteer_id] = (acc[m.volunteer_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return volsData.map(v => ({
      id: v.id,
      name: v.name || 'Anonymous',
      email: v.email,
      role: Role.Volunteer,
      organisationId: v.organisation_id,
      organisationName: v.organisations?.name || 'Independent',
      mobile: v.mobile,
      enrollments: enrollmentMap[v.id] || 0,
      profile_photo_url: v.profile_photo_url, 
    }));
  }, [volsData, members]);

  return (
    <div className="bg-black text-white min-h-screen selection:bg-[#FF6600]/30 overflow-x-hidden font-jost">
      <Header isLandingPage />

      {/* Hero Section */}
      <section className="pt-16 md:pt-24 pb-12 md:pb-20 px-4 md:px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <h1 className="font-cinzel font-bold uppercase tracking-tight leading-tight mb-12 md:mb-16">
            <span className="text-xl sm:text-2xl md:text-4xl lg:text-5xl text-white block truncate">
              THE SOMAVAMSHA SAHASRARJUNA
            </span>
            <span className="text-lg sm:text-xl md:text-3xl lg:text-4xl text-[#FF6600] block mt-2">
              KSHATRIYA (SSK)
            </span>
          </h1>
          
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 text-white text-base md:text-xl font-normal leading-relaxed mb-16 md:mb-20 text-left px-2">
            <p>
              The Somavamsha Sahasrarjuna Kshatriya (SSK) community belongs to the Somavamsha or Chandravamsha (Lunar Dynasty), one of the three main Kshatriya lineages in India. Descended from Soma (the Moon), they are known as warriors of the Moon Dynasty.
            </p>
            <p>
              The name Sahasrarjuna refers to the great emperor Kartavirya Arjuna, who was blessed with a thousand hands for his devotion and strength.
            </p>
          </div>

          <div className="flex justify-center mt-8 md:mt-12">
            <div className="max-w-xl w-full px-4">
              <img 
                src="https://i.pinimg.com/736x/68/ac/f6/68acf6f32a216959c497c7a232b35551.jpg" 
                alt="Sahasrarjuna Illustration" 
                className="w-full h-auto rounded-2xl border border-white/5 shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Modern Registry Marquees - The "Announcement Slider" */}
      <section className="mt-12 md:mt-24 border-t border-white/5 pt-12">
        <div className="container mx-auto px-4 md:px-6 mb-8">
           <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-[0.6em] text-orange-500/60 mb-2">Network Nodes</span>
              <h2 className="text-xl md:text-3xl font-cinzel uppercase tracking-[0.2em] text-white">Registry Activity</h2>
           </div>
        </div>
        
        <OrgMarquee organisations={organisations} />
      </section>

      {/* Analytics Section */}
      <main className="container mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-white/5">
        <section id="analytics" className="space-y-8 md:space-y-10">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-2xl md:text-5xl font-cinzel text-center uppercase tracking-widest text-[#FF6600] flex items-center justify-center gap-3 md:gap-4">
              <span className="text-[#FF6600]">•</span> LIVE ANALYTICS
            </h2>
            <p className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-[0.4em] mt-4 md:mt-6 font-mono opacity-80">
              REAL-TIME UPLINK: {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }).toUpperCase()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-4 analytics-card p-8 md:p-12 flex flex-col items-center justify-center min-h-[360px] md:min-h-[420px]">
              <Globe className="globe-watermark" size={140} />
              <div className="mb-6 md:mb-10 text-gray-700">
                <Users size={40} md:size={48} strokeWidth={1} />
              </div>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white mb-6 md:mb-8 text-center">TOTAL VERIFIED MEMBERS</p>
              <p className="text-8xl md:text-9xl font-normal text-[#FF6600] font-cinzel leading-none">
                {members.length}
              </p>
            </div>

            <div className="md:col-span-4 analytics-card p-8 md:p-12 min-h-[360px] md:min-h-[420px]">
              <h3 className="chart-title mb-8 md:mb-12 text-center md:text-left">GENDER DISTRIBUTION</h3>
              <GenderChart members={members} />
            </div>

            <div className="md:col-span-4 analytics-card p-8 md:p-12 min-h-[360px] md:min-h-[420px]">
              <h3 className="chart-title mb-8 md:mb-12 text-center md:text-left">PROFESSIONAL DEMOGRAPHICS</h3>
              <OccupationChart members={members} />
            </div>

            <div className="md:col-span-8 analytics-card p-8 md:p-12 min-h-[400px] md:min-h-[480px]">
              <h3 className="chart-title mb-8 md:mb-12 text-center md:text-left">GLOBAL SUPPORT DEMAND MATRIX</h3>
              <SupportChart members={members} />
            </div>

            <div className="md:col-span-4 analytics-card p-8 md:p-12 flex flex-col min-h-[400px] md:min-h-[480px]">
              <h3 className="chart-title mb-10 md:mb-14 text-center">NETWORK ACTIVITY</h3>
              <div className="flex-1 flex flex-col items-center justify-center space-y-10 md:space-y-12">
                <div className="flex flex-col items-center">
                  <div className="activity-icon-container mb-6 md:mb-8">
                    <HeartPulse size={32} md:size={40} className="text-[#FF6600] animate-pulse-soft" />
                  </div>
                  <p className="text-5xl md:text-6xl font-black text-[#FF6600] font-cinzel leading-none">{volunteers.length}</p>
                  <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.4em] mt-2 md:mt-3">VOLUNTEERS</p>
                </div>
                <div className="w-1/2 h-px bg-white/5"></div>
                <div className="flex flex-col items-center">
                  <p className="text-5xl md:text-6xl font-black text-[#FF6600] font-cinzel leading-none">{organisations.length}</p>
                  <p className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.4em] mt-2 md:mt-3">ORGANIZATIONS</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hall of Fame */}
        <section className="mt-24 md:mt-40">
           <Rewards members={members} volunteers={volunteers} organisations={organisations} />
        </section>

        <section className="mt-24 md:mt-40">
           <Leaderboard members={members} organisations={organisations} volunteers={volunteers} />
        </section>

        {/* Join Registry CTA */}
        <section className="text-center pt-24 md:pt-32 pb-8 md:pb-12 px-2 md:px-4">
          <div className="max-w-4xl mx-auto py-10 md:py-12 px-4 md:px-12 bg-[#000000] border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="text-xl md:text-3xl lg:text-4xl font-cinzel text-white uppercase tracking-[0.2em] mb-6">
                JOIN THE REGISTRY
              </h2>
              <p className="text-white/70 font-normal text-sm md:text-lg mb-10 md:mb-12 max-w-lg mx-auto px-4">
                Become a verified contributor to the global SSK database.
              </p>
              <div className="flex justify-center">
                <a 
                  href="tel:+918884449689" 
                  className="inline-flex items-center justify-center px-8 md:px-14 py-4 md:py-6 bg-[#E65100] hover:bg-[#FF6600] rounded-full text-base md:text-2xl font-bold tracking-tight transition-all shadow-[0_15px_40px_-10px_rgba(230,81,0,0.5)] active:scale-[0.98]"
                >
                  +91 888 444 9689
                </a>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          </div>
        </section>

        {/* Volunteer Announcement Bar - Positioned directly below Join Registry */}
        <section className="pb-16 md:pb-24">
          <div className="container mx-auto px-4 md:px-6 mb-4 mt-8">
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-blue-500/60 mb-1">Our Dedicated Personnel</span>
                <h2 className="text-lg md:text-2xl font-cinzel uppercase tracking-[0.2em] text-white">Active Field Agents</h2>
             </div>
          </div>
          <VolunteerMarquee volunteers={volunteers} />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;