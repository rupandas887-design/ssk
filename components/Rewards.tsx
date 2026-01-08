
import React, { useMemo } from 'react';
import { Award, Trophy, Shield, Star, CalendarDays } from 'lucide-react';
import Card from './ui/Card';
import { Member, Volunteer, Organisation } from '../types';

interface RewardsProps {
  members: Member[];
  volunteers: Volunteer[];
  organisations: Organisation[];
}

const Rewards: React.FC<RewardsProps> = ({ members, volunteers, organisations }) => {
  const { weeklyWinners, dateRange } = useMemo(() => {
    // Current timestamp
    const now = new Date();
    // To get exactly 7 days including today, we go back 6 full days.
    // E.g., Sunday back to Monday is 7 days: Sun, Sat, Fri, Thu, Wed, Tue, Mon.
    const startOfWindow = new Date(now);
    startOfWindow.setDate(now.getDate() - 6);
    startOfWindow.setHours(0, 0, 0, 0); // Start at the beginning of the 7th day back

    // Format Date Range for Display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short' 
        }).toUpperCase();
    };
    const dateRangeStr = `${formatDate(startOfWindow)} — ${formatDate(now)}`;

    // Filter members enrolled within the strict 7-day window
    const weeklyMembers = members.filter(m => {
        const submissionDate = new Date(m.submission_date);
        return submissionDate >= startOfWindow && submissionDate <= now;
    });

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

    const winners = [
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

    return { weeklyWinners: winners, dateRange: dateRangeStr };
  }, [members, volunteers, organisations]);

  return (
    <section>
      <div className="flex flex-col items-center mb-16">
        <h2 className="text-4xl font-cinzel text-center uppercase tracking-widest">
          Weekly <span className="text-orange-500">Hall of Fame</span>
        </h2>
        
        <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-5 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                <CalendarDays size={14} className="text-orange-500" />
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em]">
                    Rolling 7-Day Window: {dateRange}
                </span>
            </div>
            <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em] mt-1">Recognition of Outstanding Contribution</p>
        </div>
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
