import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase/client';
import { Organisation } from '../../types';
import { Building2, Globe } from 'lucide-react';

const ScrollingStrip: React.FC = () => {
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [newOrgIds, setNewOrgIds] = useState<Set<string>>(new Set());

  const fetchInitialOrgs = useCallback(async () => {
    const { data } = await supabase
      .from('organisations')
      .select('*')
      .order('name', { ascending: true });
    if (data) setOrgs(data);
  }, []);

  useEffect(() => {
    fetchInitialOrgs();

    const channel = supabase
      .channel('live-registry-ticker-v4')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'organisations' },
        (payload) => {
          const newOrg = payload.new as Organisation;
          setOrgs(prev => [newOrg, ...prev]);
          setNewOrgIds(prev => {
            const next = new Set(prev);
            next.add(newOrg.id);
            return next;
          });

          setTimeout(() => {
            setNewOrgIds(prev => {
              const next = new Set(prev);
              next.delete(newOrg.id);
              return next;
            });
          }, 45000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialOrgs]);

  const displayOrgs = useMemo(() => {
    if (orgs.length === 0) return [];
    
    const baseSet = orgs;
    const itemWidth = 300;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    
    const minWidthNeeded = screenWidth;
    const currentWidth = baseSet.length * itemWidth;
    const repeats = Math.max(1, Math.ceil(minWidthNeeded / currentWidth));
    
    const repeatedBase = Array(repeats).fill(baseSet).flat();
    return [...repeatedBase, ...repeatedBase];
  }, [orgs]);

  if (displayOrgs.length === 0) return null;

  return (
    <div className="w-full bg-white border-b border-slate-200 overflow-hidden relative h-14 flex items-center shadow-xs z-20">
      {/* Sidebar Label */}
      <div className="absolute left-0 top-0 bottom-0 z-30 bg-slate-50 w-64 sm:w-72 flex items-center gap-3 px-6 border-r border-slate-200 shadow-sm">
        <div className="relative flex-shrink-0">
          <Globe size={16} className="text-blue-600 animate-[spin_15s_linear_infinite]" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 whitespace-nowrap">Registry Live</span>
      </div>

      {/* Marquee Container */}
      <div className="pl-64 sm:pl-72 w-full">
        <div className="animate-marquee flex items-center group">
          <div className="flex items-center group-hover:[animation-play-state:paused]">
            {displayOrgs.map((org, idx) => (
              <div 
                key={`${org.id}-${idx}`}
                className={`
                    flex items-center gap-3.5 px-8 h-14 border-r border-slate-200 transition-colors duration-200
                    ${newOrgIds.has(org.id) ? 'bg-blue-50/80' : 'hover:bg-slate-50'}
                `}
              >
                <div className={`
                    h-8 w-8 rounded-lg overflow-hidden border bg-slate-50 flex-shrink-0 flex items-center justify-center
                    ${newOrgIds.has(org.id) ? 'border-blue-400 shadow-xs' : 'border-slate-200'}
                `}>
                  {org.profile_photo_url ? (
                    <img src={org.profile_photo_url} alt={org.name} className="h-full w-full object-contain p-1" />
                  ) : (
                    <Building2 size={16} className={newOrgIds.has(org.id) ? 'text-blue-600' : 'text-slate-400'} />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-200 ${newOrgIds.has(org.id) ? 'text-blue-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {org.name}
                  </span>
                  {newOrgIds.has(org.id) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="h-1 w-1 rounded-full bg-blue-600 animate-pulse"></span>
                      <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">Authorized Node</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default ScrollingStrip;
