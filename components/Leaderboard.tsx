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
    <div className="space-y-6 md:space-y-8">
      <div className="text-center px-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saffron-50 border border-saffron-200/60 text-saffron-700 text-xs font-semibold mb-2">
          Rankings
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Leading Community Contributors
        </h2>
        <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Recognizing the dedicated organizations and field volunteers driving registry growth.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto px-4">
        {/* Top Volunteers Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-card">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-saffron-50 text-saffron-600 border border-saffron-100">
                <Trophy size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top Field Volunteers</h3>
                <p className="text-[11px] text-slate-500">Highest individual enrollments</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entries</span>
          </div>

          <div className="space-y-2">
            {topVolunteers.map((volunteer, index) => (
              <div 
                key={volunteer.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-saffron-200 hover:bg-saffron-50/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0 ? 'bg-amber-100 text-amber-800' :
                    index === 1 ? 'bg-slate-200 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800 text-xs md:text-sm truncate group-hover:text-saffron-600 transition-colors">
                    {volunteer.name}
                  </span>
                </div>
                <span className="text-sm md:text-base font-extrabold text-saffron-600 tabular-nums shrink-0 ml-3">
                  {volunteer.enrollments}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Organisations Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-card">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-saffron-100 text-saffron-700 border border-saffron-200">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top Samaj Organisations</h3>
                <p className="text-[11px] text-slate-500">Highest collective verifications</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entries</span>
          </div>

          <div className="space-y-2">
            {topOrganisations.map((org, index) => (
              <div 
                key={org.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-saffron-200 hover:bg-saffron-50/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0 ? 'bg-amber-100 text-amber-800' :
                    index === 1 ? 'bg-slate-200 text-slate-700' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="font-semibold text-slate-800 text-xs md:text-sm truncate group-hover:text-saffron-600 transition-colors">
                    {org.name}
                  </span>
                </div>
                <span className="text-sm md:text-base font-extrabold text-saffron-600 tabular-nums shrink-0 ml-3">
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