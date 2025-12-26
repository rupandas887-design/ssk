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
    <div className="bg-black text-white min-h-screen">
      <Header isLandingPage />

      {/* Community Heritage Section (Based on Screenshot) */}
      <section className="relative pt-40 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-cinzel font-bold text-white mb-4 uppercase tracking-tight">
            THE SOMAVAMSHA SAHASRARJUNA <br />
            <span className="text-orange-500">KSHATRIYA (SSK)</span>
          </h1>
          
          <div className="mt-12 space-y-8 text-gray-300 text-lg leading-relaxed text-left md:text-center max-w-3xl mx-auto">
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

          <div className="mt-16 flex justify-center">
            <div className="relative max-w-2xl rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,100,0,0.1)] border border-white/5">
              <img 
                src="https://i.pinimg.com/736x/68/ac/f6/68acf6f32a216959c497c7a232b35551.jpg" 
                alt="Sahasrarjuna Illustration" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Platform Analytics & Utilities Section */}
      <main className="container mx-auto px-4 py-20 space-y-24">
        {/* Analytics Section */}
        <section>
          <div className="flex items-center justify-between mb-12 border-b border-gray-800 pb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-orange-500" />
              <h2 className="text-2xl font-cinzel text-white uppercase tracking-widest">Registry Insights</h2>
            </div>
            {loading && <RefreshCw className="animate-spin text-orange-500" size={20} />}
          </div>

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="flex flex-col items-center justify-center p-12 bg-gray-900/30 border-gray-800 group hover:border-orange-500/30 transition-all duration-500">
                <Users className="text-orange-500/40 group-hover:text-orange-500 transition-colors mb-4" size={56} strokeWidth={1} />
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Verified Nodes</p>
                <p className="text-7xl font-black text-white font-cinzel leading-none">{totalMembers}</p>
              </Card>
              
              <Card title="Gender Distribution" className="bg-gray-900/30 border-gray-800">
                <GenderChart members={members} />
              </Card>
              
              <Card title="Professional Demographics" className="bg-gray-900/30 border-gray-800">
                <OccupationChart members={members} />
              </Card>
            </div>
          )}

          {!loading && (
            <div className="mt-8">
              <Card title="Community Support Matrix" className="bg-gray-900/30 border-gray-800">
                <SupportChart members={members} />
              </Card>
            </div>
          )}
        </section>

        {/* Leaderboard Section */}
        <section>
          <div className="flex items-center gap-3 mb-12 border-b border-gray-800 pb-6">
            <TrendingUp className="text-orange-500" />
            <h2 className="text-2xl font-cinzel text-white uppercase tracking-widest">Top Contributors</h2>
          </div>
          {loading ? (
             <div className="flex justify-center p-20">
               <RefreshCw className="animate-spin text-orange-500" size={32} />
             </div>
          ) : (
            <Leaderboard members={members} organisations={organisations} volunteers={volunteers} />
          )}
        </section>

        {/* Rewards Section */}
        <section>
          <Rewards />
        </section>

        {/* Join CTA */}
        <section className="text-center py-20 bg-gradient-to-b from-transparent to-gray-900/40 rounded-[3rem] border border-gray-800/50">
          <h2 className="text-3xl font-cinzel text-white mb-6 uppercase tracking-[0.2em]">Join the Registry</h2>
          <p className="text-gray-400 mb-10 max-w-xl mx-auto text-lg font-light leading-relaxed">
            Support our community by becoming a verified contributor. Contact your local node for access credentials.
          </p>
          <div className="inline-block px-12 py-5 bg-orange-600 rounded-full hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/20 active:scale-95">
            <a href="tel:+918884449689" className="text-xl font-bold text-white tracking-widest">
              HELPLINE: +91 888 444 9689
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;