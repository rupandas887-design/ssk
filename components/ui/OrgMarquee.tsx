import React from 'react';
import { Organisation } from '../../types';
import { Building2 } from 'lucide-react';

interface OrgMarqueeProps {
  organisations: Organisation[];
}

const OrgMarquee: React.FC<OrgMarqueeProps> = ({ organisations }) => {
  if (organisations.length === 0) return null;

  // Newest to Oldest sorting
  const sortedOrgs = [...organisations].reverse();
  
  // Standard marquee requirement: Exactly one clone set for a seamless loop
  // This ensures no visual "triplicates" appear on screen at once
  const displayOrgs = [...sortedOrgs, ...sortedOrgs];

  return (
    <div className="w-full bg-transparent py-8 md:py-12 overflow-hidden group relative">
      {/* Premium Edge Fades */}
      <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-black via-black/90 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-black via-black/90 to-transparent z-20 pointer-events-none"></div>

      <div className="flex animate-marquee-slow group-hover:[animation-play-state:paused] whitespace-nowrap items-start">
        {displayOrgs.map((org, idx) => (
          <div 
            key={`${org.id}-${idx}`}
            className="flex-shrink-0 w-[160px] md:w-[220px] px-3 md:px-5 group/card"
          >
            <div className="flex flex-col items-center transition-all duration-500 group-hover/card:-translate-y-2">
              
              {/* Photo/Logo Top Layer */}
              <div className="relative w-full aspect-square mb-4 md:mb-6 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900 border border-white/5 shadow-2xl group-hover/card:border-orange-500/30 transition-colors">
                {org.profile_photo_url ? (
                  <img 
                    src={org.profile_photo_url} 
                    alt={org.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-orange-500/10">
                    <Building2 size={48} strokeWidth={1} />
                  </div>
                )}
                
                {/* Micro Indicator - Only for unique set first pass */}
                {idx < sortedOrgs.length && idx < 4 && (
                  <div className="absolute top-4 right-4 h-2 w-2 bg-orange-500 rounded-full shadow-[0_0_12px_rgba(234,88,12,1)] animate-pulse z-10"></div>
                )}
              </div>

              {/* Name & Subtitle Bottom Layer */}
              <div className="text-center w-full px-2 space-y-1">
                <h4 className="text-[10px] md:text-[11px] font-black text-white uppercase tracking-[0.25em] leading-tight truncate group-hover/card:text-orange-500 transition-colors">
                  {org.name}
                </h4>
                <p className="text-[8px] md:text-[9px] font-bold text-gray-500 uppercase tracking-widest opacity-60 group-hover/card:opacity-100 transition-opacity">
                  {org.secretary_name || 'Verified Member'}
                </p>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrgMarquee;