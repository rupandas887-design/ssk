import React from 'react';
import { Volunteer } from '../../types';
import { UserCircle } from 'lucide-react';

interface VolunteerMarqueeProps {
  volunteers: Volunteer[];
}

const VolunteerMarquee: React.FC<VolunteerMarqueeProps> = ({ volunteers }) => {
  if (volunteers.length === 0) return null;

  // Newest to Oldest sorting
  const sortedVols = [...volunteers].reverse();
  
  // Standard marquee requirement: Exactly one clone set for a seamless loop
  const displayVols = [...sortedVols, ...sortedVols];

  return (
    <div className="w-full bg-transparent py-8 md:py-12 overflow-hidden group relative">
      {/* Premium Edge Fades */}
      <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-black via-black/90 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-black via-black/90 to-transparent z-20 pointer-events-none"></div>

      <div className="flex animate-marquee-slow group-hover:[animation-play-state:paused] whitespace-nowrap items-start">
        {displayVols.map((vol, idx) => (
          <div 
            key={`${vol.id}-${idx}`}
            className="flex-shrink-0 w-[160px] md:w-[220px] px-3 md:px-5 group/card"
          >
            <div className="flex flex-col items-center transition-all duration-500 group-hover/card:-translate-y-2">
              
              {/* Photo/Logo Top Layer */}
              <div className="relative w-full aspect-square mb-4 md:mb-6 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900 border border-white/5 shadow-2xl group-hover/card:border-blue-500/30 transition-colors">
                {vol.profile_photo_url ? (
                  <img 
                    src={vol.profile_photo_url} 
                    alt={vol.name} 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-blue-500/10">
                    <UserCircle size={48} strokeWidth={1} />
                  </div>
                )}
                
                {/* Active Indicator */}
                {vol.enrollments > 0 && idx < sortedVols.length && (
                  <div className="absolute top-4 right-4 h-2 w-2 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,1)] animate-pulse z-10"></div>
                )}
              </div>

              {/* Name & Subtitle Bottom Layer */}
              <div className="text-center w-full px-2 space-y-1">
                <h4 className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-[0.25em] leading-tight truncate group-hover/card:text-blue-500 transition-colors">
                  {vol.name}
                </h4>
                <p className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest opacity-60 group-hover/card:opacity-100 transition-opacity">
                  {vol.organisationName || 'Volunteer'}
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VolunteerMarquee;