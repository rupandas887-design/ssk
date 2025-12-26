import React, { useState, useEffect, useMemo } from 'react';
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
import { Users, BarChart3, TrendingUp, RefreshCw } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [volsData, setVolsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [mRes, oRes, vRes] = await Promise.all([
          supabase.from('members').select('*'),
          supabase.from('organisations').select('*'),
          supabase.from('profiles').select('*').eq('role', Role.Volunteer)
        ]);

        if (mRes.data) setMembers(mRes.data);
        if (oRes.data) setOrganisations(oRes.data);
        if (vRes.data) setVolsData(vRes.data);
      } catch (err) {
        console.error("Data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const volunteers = useMemo(() => {
    if (!volsData.length) return [];
    
    const enrollmentMap = members.reduce((acc, m) => {
      acc[m.volunteer_id] = (acc[m.volunteer_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return volsData.map(v => ({
      id: v.id,
      name: v.name,
      email: v.email,
      role: v.role,
      organisationId: v.organisation_id,
      mobile: v.mobile,
      enrollments: enrollmentMap[v.id] || 0,
    }));
  }, [volsData, members]);

  const totalMembers = members.length;

  return (
    <div className="bg-black text-white min-h-screen selection:bg-orange-500/30">
      <Header isLandingPage />

      {/* Community Heritage Section (Precisely Matched to Reference) */}
      <section className="relative pt-48 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Main Title - Centered as per screenshot */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-cinzel font-bold text-white uppercase tracking-tight leading-tight">
              THE SOMAVAMSHA SAHASRARJUNA <br />
              <span className="text-orange-500">KSHATRIYA (SSK)</span>
            </h1>
          </div>
          
          {/* Narrative Content - Left Aligned as per screenshot */}
          <div className="space-y-8 text-gray-300 text-lg leading-relaxed text-left max-w-4xl mx-auto font-light">
            <p>
              The Somavamsha Sahasrarjuna Kshatriya (SSK) community belongs to the Somavamsha or Chandravamsha (Lunar Dynasty), one of the three main Kshatriya lineages in India, alongside Surya and Agni Vamshas. Descended from Soma (the Moon), they are known as warriors of the Moon Dynasty.
            </p>
            <p>
              The name Sahasrarjuna refers to the great emperor Kartavirya Arjuna, who was blessed by Lord Dattatreya with a thousand hands for his devotion and strength. "Sahasra" means a thousand, symbolizing his immense power and ability to protect the weak and defeat evil. He ruled the kingdom of Mahismati (present-day Maheshwar, Madhya Pradesh) and is celebrated as one of the greatest emperors in Indian mythology.
            </p>
            <p>
              Sahasrarjuna is associated with Lord Vishnu's Chakra, symbolizing the destruction of evil, which remains an important emblem of SSK heritage. Over time, stories of his valor spread through folklore across regions.
            </p>
            <p>
              Due to historical migrations, members of the SSK community later settled in regions like Erandol in Khandesh, where local traditions recount that Kartavirya was blessed with his thousand hands by Lord Dattatreya, becoming the legendary Sahasrarjuna.
            </p>
          </div>

          {/* Centered Image below text */}
          <div className="mt-24 flex justify-center">
            <div className="relative group max-w-3xl">
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

      {/* Analytics & Registry Tools */}
      <main className="container mx-auto px-6 py-24 space-y-32">
        {/* Analytics Section */}
        <section>
          <div className="flex flex-col items-center mb-16">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-orange-500 to-transparent mb-8"></div>
            <h2 className="text-4xl font-cinzel text-center uppercase tracking-widest">
              Live <span className="text-orange-500">Analytics</span>
            </h2>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mt-4">Real-time Registry Intelligence</p>
          </div>

          {!loading && (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="flex flex-col items-center justify-center p-12 bg-[#050505] border-white/5 group hover:border-orange-500/30 transition-all duration-700">
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
              
              <Card title="Global Support Demand Matrix" className="bg-[#050505] border-white/5">
                <SupportChart members={members} />
              </Card>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-32 gap-6">
              <RefreshCw className="animate-spin text-orange-500" size={48} />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">Synchronizing Master Registry...</p>
            </div>
          )}
        </section>

        {/* Top Contributors */}
        <section>
          <div className="flex flex-col items-center mb-16">
            <h2 className="text-4xl font-cinzel text-center uppercase tracking-widest">
              Master <span className="text-orange-500">Nodes</span>
            </h2>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mt-4">Top Enrollment Performance</p>
          </div>
          {loading ? (
             <p className="text-center text-gray-700 animate-pulse font-black text-[10px] uppercase tracking-widest">Establishing Uplink...</p>
          ) : (
            <Leaderboard members={members} organisations={organisations} volunteers={volunteers} />
          )}
        </section>

        {/* Recognition */}
        <section>
          <Rewards />
        </section>

        {/* Global CTA */}
        <section className="text-center pb-20">
          <div className="max-w-4xl mx-auto p-16 bg-gradient-to-br from-[#080808] to-black rounded-[3rem] border border-orange-500/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-orange-500/[0.01] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-4xl font-cinzel text-white uppercase tracking-widest mb-8">Join the Registry</h2>
            <p className="text-gray-400 font-light text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
              Become a verified contributor to the global SSK database. Contact your local organisation node to receive authorized access credentials.
            </p>
            <div className="inline-block px-12 py-6 bg-orange-600 hover:bg-orange-500 rounded-full shadow-[0_20px_50px_-10px_rgba(255,100,0,0.2)] transition-all duration-500 active:scale-95">
              <a href="tel:+918884449689" className="text-2xl font-black text-white tracking-widest">
                +91 888 444 9689
              </a>
            </div>
            <p className="mt-10 text-[10px] text-gray-600 font-black uppercase tracking-[0.5em]">SSK Samaj Bangalore Global HQ</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;