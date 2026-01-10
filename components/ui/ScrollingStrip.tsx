import React, { useEffect, useState, useCallback } from 'react';
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

  if (orgs.length === 0) return null;

  // Duplicate for seamless loop
  const displayOrgs = [...orgs, ...orgs];

  return (
    <div className="w-full bg-[#050505] border-b border-white/5 overflow-hidden relative h-16 flex items-center shadow-2xl z-20">
      {/* Sidebar Label */}
      <div className="absolute left-0 top-0 bottom-0 z-30 bg-[#050505] w-72 flex items-center gap-4 px-8 border-r border-orange-500/20 shadow-[10px_0_30px_rgba(0,0,0,1)]">
        <div className="relative flex-shrink-0">
          <Globe size={18} className="text-orange-500 animate-[spin_15s_linear_infinite]" />
          <div className="absolute inset-0 bg-orange-500 blur-lg opacity-20"></div>
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white whitespace-nowrap">Registry Live</span>
      </div>

      {/* Marquee Container with fixed offset */}
      <div className="pl-72 w-full">
        <div className="animate-marquee flex items-center group">
          <div className="flex items-center group-hover:[animation-play-state:paused]">
            {displayOrgs.map((org, idx) => (
              <div 
                key={`${org.id}-${idx}`}
                className={`
                    flex items-center gap-4 px-12 h-16 border-r border-white/5 transition-all duration-1000
                    ${newOrgIds.has(org.id) ? 'registry-node-glow bg-orange-500/[0.04]' : 'hover:bg-white/[0.02]'}
                `}
              >
                <div className={`
                    h-10 w-10 rounded-xl overflow-hidden border bg-black/60 flex-shrink-0 flex items-center justify-center transition-all duration-500
                    ${newOrgIds.has(org.id) ? 'border-orange-500/50 scale-105 shadow-lg shadow-orange-500/10' : 'border-white/10'}
                `}>
                  {org.profile_photo_url ? (
                    <img src={org.profile_photo_url} alt={org.name} className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <Building2 size={18} className={newOrgIds.has(org.id) ? 'text-orange-500' : 'text-gray-700'} />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className={`text-[12px] font-black uppercase tracking-wider whitespace-nowrap transition-colors duration-500 ${newOrgIds.has(org.id) ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {org.name}
                  </span>
                  {newOrgIds.has(org.id) && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1 w-1 rounded-full bg-orange-500 animate-pulse"></span>
                      <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Authorized Node</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default ScrollingStrip;