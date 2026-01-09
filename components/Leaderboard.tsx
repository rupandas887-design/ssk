import React from 'react';
import { Trophy, Shield } from 'lucide-react';
import { Volunteer, Organisation, Member } from '../types';

interface LeaderboardProps {
    volunteers: Volunteer[];
    organisations: Organisation[];
    members: Member[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ volunteers, organisations, members }) => {
  const topVolunteers = [...volunteers]
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);

  const orgEnrollments = members.reduce((acc, member) => {
    acc[member.organisation_id] = (acc[member.organisation_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topOrganisations = [...organisations]
    .map(org => ({ ...org, enrollments: orgEnrollments[org.id] || 0 }))
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 5);

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="text-center px-2">
        <h2 className="text-2xl md:text-5xl font-cinzel uppercase tracking-[0.1em] md:tracking-[0.2em]">
          <span className="text-white">LEADING</span> <span className="text-[#FF6600]">CONTRIBUTORS</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-7xl mx-auto px-2">
        {/* Top Volunteers Card */}
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">
          <h3 className="text-[#FF6600] text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-6 md:mb-8 text-center md:text-left">
            TOP VOLUNTEERS
          </h3>
          <div className="space-y-3">
            {topVolunteers.map((volunteer) => (
              <div 
                key={volunteer.id} 
                className="flex items-center justify-between p-3 md:p-4 bg-[#1e293b] rounded-xl group hover:bg-[#2d3748] transition-colors"
              >
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <div className="text-orange-400 shrink-0">
                    <Trophy size={18} md:size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-white text-xs md:text-base truncate">
                    {volunteer.name}
                  </span>
                </div>
                <span className="text-base md:text-lg font-black text-[#FF6600] font-mono shrink-0 ml-4">
                  {volunteer.enrollments}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Organisations Card */}
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">
          <h3 className="text-[#FF6600] text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-6 md:mb-8 text-center md:text-left">
            TOP ORGANISATIONS
          </h3>
          <div className="space-y-3">
            {topOrganisations.map((org) => (
              <div 
                key={org.id} 
                className="flex items-center justify-between p-3 md:p-4 bg-[#1e293b] rounded-xl group hover:bg-[#2d3748] transition-colors"
              >
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <div className="text-orange-400 shrink-0">
                    <Shield size={18} md:size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-white text-xs md:text-base truncate">
                    {org.name}
                  </span>
                </div>
                <span className="text-base md:text-lg font-black text-[#FF6600] font-mono shrink-0 ml-4">
                  {org.enrollments}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;