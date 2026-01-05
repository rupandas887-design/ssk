
import React, { useMemo } from 'react';
import { Award, Trophy, Shield, Star } from 'lucide-react';
import Card from './ui/Card';
import { Member, Volunteer, Organisation } from '../types';

interface RewardsProps {
  members: Member[];
  volunteers: Volunteer[];
  organisations: Organisation[];
}

const Rewards: React.FC<RewardsProps> = ({ members, volunteers, organisations }) => {
  const weeklyWinners = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter members enrolled in the last 7 days
    const weeklyMembers = members.filter(m => new Date(m.submission_date) >= oneWeekAgo);

    // 1. Calculate Top Volunteer of the Week
    const volCounts: Record<string, number> = {};
    weeklyMembers.forEach(m => {
      if (m.volunteer_id) volCounts[m.volunteer_id] = (volCounts[m.volunteer_id] || 0) + 1;
    });

    let topVolId = '';
    let topVolCount = 0;
    Object.entries(volCounts).forEach(([id, count]) => {
      if (count > topVolCount) {
        topVolCount = count;
        topVolId = id;
      }
    });

    const topVol = volunteers.find(v => v.id === topVolId);

    // 2. Calculate Top Organisation of the Week
    const orgCounts: Record<string, number> = {};
    weeklyMembers.forEach(m => {
      if (m.organisation_id) orgCounts[m.organisation_id] = (orgCounts[m.organisation_id] || 0) + 1;
    });

    let topOrgId = '';
    let topOrgCount = 0;
    Object.entries(orgCounts).forEach(([id, count]) => {
      if (count > topOrgCount) {
        topOrgCount = count;
        topOrgId = id;
      }
    });

    const topOrg = organisations.find(o => o.id === topOrgId);

    return [
      {
        title: 'Top Enroller of the Week',
        winner: topVol ? topVol.name : 'Awaiting Data',
        achievement: topVolCount > 0 ? `${topVolCount} New Enrollments` : 'N/A',
        icon: <Trophy className="text-yellow-400" size={40} />,
        label: 'Individual Merit'
      },
      {
        title: 'Organization of the Week',
        winner: topOrg ? topOrg.name : 'Awaiting Data',
        achievement: topOrgCount > 0 ? `${topOrgCount} New Enrollments` : 'N/A',
        icon: <Shield className="text-orange-500" size={40} />,
        label: 'Institutional Excellence'
      }
    ];
  }, [members, volunteers, organisations]);

  return (
    <section>
      <div className="flex flex-col items-center mb-16">
        <h2 className="text-4xl font-cinzel text-center uppercase tracking-widest">
          Weekly <span className="text-orange-500">Hall of Fame</span>
        </h2>
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mt-4">Recognition of Outstanding Contribution</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {weeklyWinners.map((reward, index) => (
          <Card key={index} className="bg-[#080808] border-orange-500/10 hover:border-orange-500/30 transition-all duration-700 p-10 group overflow-hidden relative">
            <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-700">
               {reward.icon}
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="p-6 bg-orange-500/5 rounded-[2rem] border border-orange-500/10 mb-8 group-hover:scale-110 transition-transform">
                {reward.icon}
              </div>
              
              <p className="text-[10px] font-black text-orange-500/60 uppercase tracking-[0.5em] mb-4">{reward.label}</p>
              <h3 className="font-cinzel text-2xl text-white mb-2">{reward.title}</h3>
              
              <div className="h-px w-12 bg-gray-800 my-6"></div>
              
              <p className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
                {reward.winner}
              </p>
              <p className="text-sm font-black text-orange-500 uppercase tracking-widest">
                {reward.achievement}
              </p>
              
              <div className="mt-8 flex items-center gap-2 px-4 py-1.5 bg-white/[0.02] border border-white/5 rounded-full">
                <Star size={12} className="text-yellow-500 animate-pulse" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Verified Achievement</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Rewards;
