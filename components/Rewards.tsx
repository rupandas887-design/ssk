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
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Logic to find the most recent completed Monday-Sunday window
    // If today is Monday (1), we want the week that ended yesterday (Sun).
    // If today is Sunday (0), we still want the week that ended last Sunday.
    
    // Step 1: Find the most recent Monday
    // If today is Monday (1), diff is 0. If Sun (0), diff is -6. If Tue (2), diff is 1.
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    // Step 2: Set the end of the window to the Sunday just passed (or yesterday if today is Monday)
    const endOfWindow = new Date(now);
    endOfWindow.setDate(now.getDate() - daysSinceMonday - 1);
    endOfWindow.setHours(23, 59, 59, 999);

    // Step 3: Set the start of the window to the Monday of that same week
    const startOfWindow = new Date(endOfWindow);
    startOfWindow.setDate(endOfWindow.getDate() - 6);
    startOfWindow.setHours(0, 0, 0, 0);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short' 
        }).toUpperCase();
    };
    
    const dateRangeStr = `${formatDate(startOfWindow)} — ${formatDate(endOfWindow)}`;

    // Filter members based on the Mon -> Sun window
    const weeklyMembers = members.filter(m => {
        const submissionDate = new Date(m.submission_date);
        return submissionDate >= startOfWindow && submissionDate <= endOfWindow;
    });

    // Calculate Top Volunteer
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

    // Calculate Top Organization
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
        winner: topVol ? topVol.name : (weeklyMembers.length > 0 ? 'Evaluating...' : 'No data available'),
        achievement: topVolCount > 0 ? `${topVolCount} Enrollments` : 'N/A',
        icon: <Trophy className="text-yellow-400" size={40} />,
        label: 'Individual Merit'
      },
      {
        title: 'Organization of the Week',
        winner: topOrg ? topOrg.name : (weeklyMembers.length > 0 ? 'Evaluating...' : 'No data available'),
        achievement: topOrgCount > 0 ? `${topOrgCount} Enrollments` : 'N/A',
        icon: <Shield className="text-orange-500" size={40} />,
        label: 'Institutional Excellence'
      }
    ];

    return { weeklyWinners: winners, dateRange: dateRangeStr };
  }, [members, volunteers, organisations]);

  return (
    <section className="px-2">
      <div className="flex flex-col items-center mb-10 md:mb-16">
        <h2 className="text-2xl md:text-4xl font-cinzel text-center uppercase tracking-[0.1em] md:tracking-widest">
          Weekly <span className="text-orange-500">Hall of Fame</span>
        </h2>
        
        <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-4 md:px-5 py-1.5 md:py-2 bg-orange-500/10 border border-orange-500/20 rounded-full shadow-[0_0_20px_rgba(234,88,12,0.1)]">
                <CalendarDays size={14} className="text-orange-500" />
                <span className="text-[8px] md:text-[10px] font-black text-orange-400 uppercase tracking-widest md:tracking-[0.3em]">
                    Window: {dateRange}
                </span>
            </div>
            <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest md:tracking-[0.4em] mt-1 text-center">Calculated MON – SUN • Updated every Monday</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-7xl mx-auto">
        {weeklyWinners.map((reward, index) => (
          <Card key={index} className="bg-[#080808] border-orange-500/10 hover:border-orange-500/30 transition-all duration-700 p-8 md:p-10 group overflow-hidden relative">
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-700">
               {reward.icon}
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="p-4 md:p-6 bg-orange-500/5 rounded-2xl md:rounded-[2rem] border border-orange-500/10 mb-6 md:mb-8 group-hover:scale-110 transition-transform">
                {reward.icon}
              </div>
              
              <p className="text-[8px] md:text-[10px] font-black text-orange-500/60 uppercase tracking-[0.5em] mb-3 md:mb-4">{reward.label}</p>
              <h3 className="font-cinzel text-xl md:text-2xl text-white mb-2">{reward.title}</h3>
              
              <div className="h-px w-10 md:w-12 bg-gray-800 my-5 md:my-6"></div>
              
              <p className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight uppercase truncate max-w-full">
                {reward.winner}
              </p>
              <p className="text-xs md:text-sm font-black text-orange-500 uppercase tracking-widest">
                {reward.achievement}
              </p>
              
              <div className="mt-6 md:mt-8 flex items-center gap-2 px-3 md:px-4 py-1.5 bg-white/[0.02] border border-white/5 rounded-full">
                <Star size={12} className="text-yellow-500 animate-pulse" />
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Verified Achievement</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Rewards;