import React, { useMemo } from 'react';
import { Organisation } from '../../types';
import { Building2 } from 'lucide-react';

interface OrgMarqueeProps {
  organisations: Organisation[];
}

const OrgMarquee: React.FC<OrgMarqueeProps> = ({ organisations }) => {
  const displayOrgs = useMemo(() => {
    if (!organisations || organisations.length === 0) return [];
    
    const baseSet = organisations;
    const itemWidth = 220; 
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    
    const itemsNeededToCoverScreen = Math.ceil(screenWidth / itemWidth);
    
    let fillSet = [...baseSet];
    if (fillSet.length < itemsNeededToCoverScreen) {
        const repeats = Math.ceil(itemsNeededToCoverScreen / fillSet.length);
        fillSet = Array(repeats).fill(baseSet).flat();
    }
    
    return [...fillSet, ...fillSet];
  }, [organisations]);

  if (displayOrgs.length === 0) return null;

  return (
    <div className="w-full bg-transparent py-6 md:py-10 overflow-hidden group relative">
      {/* Edge Fades for #F5F7FB canvas */}
      <div className="absolute inset-y-0 left-0 w-20 md:w-40 bg-gradient-to-r from-[#F5F7FB] via-[#F5F7FB]/90 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-20 md:w-40 bg-gradient-to-l from-[#F5F7FB] via-[#F5F7FB]/90 to-transparent z-20 pointer-events-none"></div>

      <div className="flex animate-marquee-slow group-hover:[animation-play-state:paused] whitespace-nowrap items-start">
        {displayOrgs.map((org, idx) => (
          <div 
            key={`${org.id}-${idx}`}
            className="flex-shrink-0 w-[160px] md:w-[220px] px-3 md:px-5 group/card"
          >
            <div className="flex flex-col items-center transition-all duration-300 group-hover/card:-translate-y-1.5">
              
              <div className="relative w-full aspect-square mb-3 md:mb-4 overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm group-hover/card:shadow-md group-hover/card:border-saffron-400 transition-all">
                {org.profile_photo_url ? (
                  <img 
                    src={org.profile_photo_url} 
                    alt={org.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-saffron-50/50 text-saffron-400">
                    <Building2 size={40} strokeWidth={1.5} />
                  </div>
                )}
                
                {idx < 4 && (
                  <div className="absolute top-3 right-3 h-2 w-2 bg-saffron-500 rounded-full shadow-[0_0_8px_rgba(255,138,0,0.8)] animate-pulse z-10"></div>
                )}
              </div>

              <div className="text-center w-full px-2 space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800 leading-tight truncate group-hover/card:text-saffron-600 transition-colors">
                  {org.name}
                </h4>
                <p className="text-[10px] font-medium text-slate-500 truncate">
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