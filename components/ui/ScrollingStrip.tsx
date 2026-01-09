
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabase/client';
import { Organisation } from '../../types';
import { Building2, Zap } from 'lucide-react';

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

    // Subscribe to real-time additions
    const channel = supabase
      .channel('scrolling-strip-updates')
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

          // Remove glow after 30 seconds (roughly one or two full passes depending on speed)
          setTimeout(() => {
            setNewOrgIds(prev => {
              const next = new Set(prev);
              next.delete(newOrg.id);
              return next;
            });
          }, 30000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialOrgs]);

  if (orgs.length === 0) return null;

  // Duplicate the list for seamless looping
  const displayOrgs = [...orgs, ...orgs];

  return (
    <div className="w-full bg-[#050505] border-b border-orange-500/10 overflow-hidden relative h-14 flex items-center group">
      {/* Label/Indicator */}
      <div className="absolute left-0 top-0 bottom-0 z-20 bg-[#050505] px-4 flex items-center gap-2 border-r border-orange-500/20 shadow-[10px_0_20px_rgba(0,0,0,0.8)]">
        <Zap size={14} className="text-orange-500 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Live Registry</span>
      </div>

      <div className="animate-marquee ml-32">
        {displayOrgs.map((org, idx) => (
          <div 
            key={`${org.id}-${idx}`}
            className={`flex items-center gap-3 px-8 py-2 border-r border-white/5 transition-all duration-700 ${newOrgIds.has(org.id) ? 'new-node-glow' : ''}`}
          >
            <div className="h-8 w-8 rounded-lg overflow-hidden border border-white/10 bg-black flex-shrink-0 flex items-center justify-center">
              {org.profile_photo_url ? (
                <img src={org.profile_photo_url} alt={org.name} className="h-full w-full object-contain" />
              ) : (
                <Building2 size={16} className="text-orange-500/40" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white uppercase tracking-wider whitespace-nowrap">
                {org.name}
              </span>
              {newOrgIds.has(org.id) && (
                <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest animate-pulse">
                  Newly Established
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fade Gradients for visual blend */}
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default ScrollingStrip;
