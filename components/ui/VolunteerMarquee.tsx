import React, { useMemo } from 'react';
import { Volunteer } from '../../types';
import { UserCircle } from 'lucide-react';

interface VolunteerMarqueeProps {
  volunteers: Volunteer[];
}

const VolunteerMarquee: React.FC<VolunteerMarqueeProps> = ({ volunteers }) => {
  const displayVols = useMemo(() => {
    if (!volunteers || volunteers.length === 0) return [];
    
    const baseSet = volunteers;
    const itemWidth = 220; 
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    
    const itemsNeededToCoverScreen = Math.ceil(screenWidth / itemWidth);
    
    let fillSet = [...baseSet];
    if (fillSet.length < itemsNeededToCoverScreen) {
        const repeats = Math.ceil(itemsNeededToCoverScreen / fillSet.length);
        fillSet = Array(repeats).fill(baseSet).flat();
    }
    
    return [...fillSet, ...fillSet];
  }, [volunteers]);

  if (displayVols.length === 0) return null;

  return (
    <div className="w-full bg-transparent py-6 md:py-10 overflow-hidden group relative">
      {/* Premium Edge Fades for #F5F7FB canvas */}
      <div className="absolute inset-y-0 left-0 w-20 md:w-40 bg-gradient-to-r from-[#F5F7FB] via-[#F5F7FB]/90 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-20 md:w-40 bg-gradient-to-l from-[#F5F7FB] via-[#F5F7FB]/90 to-transparent z-20 pointer-events-none"></div>

      <div className="flex animate-marquee-slow group-hover:[animation-play-state:paused] whitespace-nowrap items-start">
        {displayVols.map((vol, idx) => (
          <div 
            key={`${vol.id}-${idx}`}
            className="flex-shrink-0 w-[160px] md:w-[220px] px-3 md:px-5 group/card"
          >
            <div className="flex flex-col items-center transition-all duration-300 group-hover/card:-translate-y-1.5">
              
              <div className="relative w-full aspect-square mb-3 md:mb-4 overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm group-hover/card:shadow-md group-hover/card:border-saffron-400 transition-all">
                {vol.profile_photo_url ? (
                  <img 
                    src={vol.profile_photo_url} 
                    alt={vol.name} 
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-saffron-50/50 text-saffron-400">
                    <UserCircle size={40} strokeWidth={1.5} />
                  </div>
                )}
              </div>

              <div className="text-center w-full px-2 space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800 leading-tight truncate group-hover/card:text-saffron-600 transition-colors">
                  {vol.name}
                </h4>
                <p className="text-[10px] font-medium text-slate-500 truncate">
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