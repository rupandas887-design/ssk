import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Card from '../components/ui/Card';
import GenderChart from '../components/charts/GenderChart';
import OccupationChart from '../components/charts/OccupationChart';
import SupportChart from '../components/charts/SupportChart';
import Leaderboard from '../components/Leaderboard';
import Rewards from '../components/Rewards';
import { supabase } from '../supabase/client';
import { Member, Organisation, Role, Volunteer } from '../types';

const LandingPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: membersData } = await supabase.from('members').select('*');
      const { data: orgsData } = await supabase.from('organisations').select('*');
      const { data: volsData } = await supabase.from('profiles').select('*').eq('role', Role.Volunteer);

      if (membersData) setMembers(membersData);
      if (orgsData) setOrganisations(orgsData);

      if (volsData && membersData) {
        const volunteersWithEnrollments: Volunteer[] = volsData.map(v => ({
          id: v.id,
          name: v.name,
          email: v.email,
          role: v.role,
          organisationId: v.organisation_id,
          mobile: v.mobile,
          enrollments: membersData.filter(m => m.volunteer_id === v.id).length,
        }));
        setVolunteers(volunteersWithEnrollments);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const totalMembers = members.length;

  return (
    <div className="bg-black text-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16">
        <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-left">
                <h1 className="text-4xl md:text-5xl font-bold font-cinzel text-center mb-8">
                    The Somavamsha Sahasrarjuna <span className="text-orange-500">Kshatriya (SSK)</span>
                </h1>
                <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                    The Somavamsha Sahasrarjuna Kshatriya (SSK) community belongs to the Somavamsha or Chandravamsha (Lunar Dynasty), one of the three main Kshatriya lineages in India, alongside Surya and Agni Vamshas. Descended from Soma (the Moon), they are known as warriors of the Moon Dynasty.
                </p>
                <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                    The name Sahasrarjuna refers to the great emperor Kartavirya Arjuna, who was blessed by Lord Dattatreya with a thousand hands for his devotion and strength. “Sahasra” means a thousand, symbolizing his immense power and ability to protect the weak and defeat evil. He ruled the kingdom of Mahismati (present-day Maheshwar, Madhya Pradesh) and is celebrated as one of the greatest emperors in Indian mythology.
                </p>
                <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                    Sahasrarjuna is associated with Lord Vishnu’s Chakra, symbolizing the destruction of evil, which remains an important emblem of SSK heritage. Over time, stories of his valor spread through folklore across regions.
                </p>
                <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                    Due to historical migrations, members of the SSK community later settled in regions like Erandon in Khandesh, where local traditions recount that Kartavirya was blessed with his thousand hands by Lord Dattatreya, becoming the legendary Sahasrarjuna.
                </p>
                <div className="flex justify-center mt-12">
                    <img 
                        src="https://i.pinimg.com/736x/68/ac/f6/68acf6f32a216959c497c7a232b35551.jpg" 
                        alt="Sahasrarjuna Kshatriya" 
                        className="w-full max-w-md h-auto rounded-2xl shadow-2xl border border-orange-500/20 grayscale hover:grayscale-0 transition-all duration-1000 transform hover:scale-[1.02]"
                    />
                </div>
            </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 space-y-16">
        {/* Analytics Section */}
        <section>
          <h2 className="text-4xl font-cinzel text-center mb-10">
            Live <span className="text-orange-500">Analytics</span>
          </h2>
           {loading ? <p className="text-center">Loading analytics...</p> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card title="Total Members">
                    <p className="text-6xl font-bold text-center text-orange-500">{totalMembers}</p>
                </Card>
                <Card title="Men & Female Strength">
                    <GenderChart members={members} />
                </Card>
                <Card title="Occupation Demographics">
                    <OccupationChart members={members} />
                </Card>
              </div>
              <div className="mt-8">
                    <Card title="What support do people want?">
                        <SupportChart members={members} />
                    </Card>
              </div>
            </>
           )}
        </section>

        {/* Top Performers Section */}
        <section>
            <h2 className="text-4xl font-cinzel text-center mb-10">
                Top <span className="text-orange-500">Performers</span>
            </h2>
            {loading ? <p className="text-center">Loading leaderboards...</p> : <Leaderboard members={members} organisations={organisations} volunteers={volunteers} />}
        </section>

        {/* Rewards Section */}
        <section>
            <Rewards />
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-cinzel text-orange-500">Become a Volunteer</h2>
            <p className="mt-4 text-gray-300">
              Wish to participate in the membership drive? Reach out to SSK Samaj Bangalore Organisations.
            </p>
            <p className="mt-4 text-2xl font-bold text-white">
              Contact: <a href="tel:+918884449689" className="hover:underline">+91 888 444 9689</a>
            </p>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;