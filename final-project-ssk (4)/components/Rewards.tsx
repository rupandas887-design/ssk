import React, { useMemo } from 'react';
import { Trophy, Shield, Star, CalendarDays } from 'lucide-react';
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
    const currentDay = now.getDay();
    
    const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
    const endOfWindow = new Date(now);
    endOfWindow.setDate(now.getDate() - daysSinceMonday - 1);
    endOfWindow.setHours(23, 59, 59, 999);

    const startOfWindow = new Date(endOfWindow);
    startOfWindow.setDate(endOfWindow.getDate() - 6);
    startOfWindow.setHours(0, 0, 0, 0);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short' 
        });
    };
    
    const dateRangeStr = `${formatDate(startOfWindow)} — ${formatDate(endOfWindow)}`;

    const weeklyMembers = members.filter(m => {
        const submissionDate = new Date(m.submission_date);
        return submissionDate >= startOfWindow && submissionDate <= endOfWindow;
    });

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
        achievement: topVolCount > 0 ? `${topVolCount} Verified Enrollments` : 'N/A',
        icon: <Trophy className="text-amber-500" size={32} />,
        label: 'Individual Merit',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        accentBg: 'bg-amber-500/10'
      },
      {
        title: 'Organization of the Week',
        winner: topOrg ? topOrg.name : (weeklyMembers.length > 0 ? 'Evaluating...' : 'No data available'),
        achievement: topOrgCount > 0 ? `${topOrgCount} Verified Enrollments` : 'N/A',
        icon: <Shield className="text-saffron-600" size={32} />,
        label: 'Institutional Excellence',
        badgeBg: 'bg-saffron-50 text-saffron-700 border-saffron-200',
        accentBg: 'bg-saffron-500/10'
      }
    ];

    return { weeklyWinners: winners, dateRange: dateRangeStr };
  }, [members, volunteers, organisations]);

  return (
    <section className="px-4">
      <div className="flex flex-col items-center mb-8 md:mb-12 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saffron-50 border border-saffron-200/60 text-saffron-700 text-xs font-semibold mb-2">
          Weekly Honors
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Weekly Hall of Fame
        </h2>
        
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200/90 rounded-full shadow-sm text-xs font-medium text-slate-600">
            <CalendarDays size={14} className="text-saffron-600" />
            <span>Audit Window: {dateRange}</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Calculated Mon – Sun • Updated every Monday</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
        {weeklyWinners.map((reward, index) => (
          <div 
            key={index} 
            className="bg-white rounded-2xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-300 p-7 md:p-8 flex flex-col items-center text-center relative overflow-hidden group"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              {reward.icon}
            </div>
            
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border mb-2.5 ${reward.badgeBg}`}>
              {reward.label}
            </span>
            <h3 className="text-base font-bold text-slate-700 mb-2">{reward.title}</h3>
            
            <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase truncate max-w-full">
              {reward.winner}
            </p>
            <p className="text-xs md:text-sm font-bold text-saffron-600 mt-1">
              {reward.achievement}
            </p>
            
            <div className="mt-6 flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[11px] font-semibold text-slate-500">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              <span>Verified Achievement</span>
            </div>

            {/* Subtle corner light */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-saffron-500/[0.03] rounded-full blur-2xl pointer-events-none -mr-12 -mt-12"></div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Rewards;