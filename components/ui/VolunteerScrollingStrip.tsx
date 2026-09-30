import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase/client';
import { UserCircle, Zap } from 'lucide-react';

interface VolunteerNode {
    id: string;
    name: string;
    profile_photo_url?: string;
    organisation_name?: string;
}

const VolunteerScrollingStrip: React.FC = () => {
  const [vols, setVols] = useState<VolunteerNode[]>([]);
  const [newVolIds, setNewVolIds] = useState<Set<string>>(new Set());

  const fetchInitialVols = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, 
        name, 
        profile_photo_url,
        organisations (name)
      `)
      .eq('role', 'Volunteer')
      .order('name', { ascending: true });

    if (data) {
        const mapped = data.map((v: any) => ({
            id: v.id,
            name: v.name,
            profile_photo_url: v.profile_photo_url,
            organisation_name: v.organisations?.name
        }));
        setVols(mapped);
    }
  }, []);

  useEffect(() => {
    fetchInitialVols();

    const channel = supabase
      .channel('live-volunteer-ticker-v4')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles', filter: `role=eq.Volunteer` },
        async (payload) => {
          const { data } = await supabase
            .from('profiles')
            .select('id, name, profile_photo_url, organisations(name)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
              const newVol = {
                  id: data.id,
                  name: data.name,
                  profile_photo_url: data.profile_photo_url,
                  organisation_name: (data as any).organisations?.name
              };
              
              setVols(prev => [newVol, ...prev]);
              setNewVolIds(prev => {
                const next = new Set(prev);
                next.add(newVol.id);
                return next;
              });

              setTimeout(() => {
                setNewVolIds(prev => {
                  const next = new Set(prev);
                  next.delete(newVol.id);
                  return next;
                });
              }, 45000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialVols]);

  const displayVols = useMemo(() => {
    if (vols.length === 0) return [];
    
    const baseSet = vols;
    const itemWidth = 300; 
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    
    const minWidthNeeded = screenWidth;
    const currentWidth = baseSet.length * itemWidth;
    const repeats = Math.max(1, Math.ceil(minWidthNeeded / currentWidth));
    
    const repeatedBase = Array(repeats).fill(baseSet).flat();
    return [...repeatedBase, ...repeatedBase];
  }, [vols]);

  if (displayVols.length === 0) return null;

  return (
    <div className="w-full bg-white border-b border-slate-200 overflow-hidden relative h-14 flex items-center shadow-xs z-10">
      {/* Sidebar Label */}
      <div className="absolute left-0 top-0 bottom-0 z-30 bg-slate-50 w-64 sm:w-72 flex items-center gap-3 px-6 border-r border-slate-200 shadow-sm">
        <div className="relative flex-shrink-0">
          <Zap size={16} className="text-blue-600 animate-pulse" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 whitespace-nowrap">Personnel Live</span>
      </div>

      {/* Marquee Container */}
      <div className="pl-64 sm:pl-72 w-full">
        <div className="animate-marquee flex items-center group">
          <div className="flex items-center group-hover:[animation-play-state:paused]">
            {displayVols.map((vol, idx) => (
              <div 
                key={`${vol.id}-${idx}`}
                className={`
                    flex items-center gap-3.5 px-8 h-14 border-r border-slate-200 transition-colors duration-200
                    ${newVolIds.has(vol.id) ? 'bg-blue-50/80' : 'hover:bg-slate-50'}
                `}
              >
                <div className={`
                    h-8 w-8 rounded-lg overflow-hidden border bg-slate-50 flex-shrink-0 flex items-center justify-center
                    ${newVolIds.has(vol.id) ? 'border-blue-400 shadow-xs' : 'border-slate-200'}
                `}>
                  {vol.profile_photo_url ? (
                    <img src={vol.profile_photo_url} alt={vol.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle size={18} className={newVolIds.has(vol.id) ? 'text-blue-600' : 'text-slate-400'} />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-200 ${newVolIds.has(vol.id) ? 'text-blue-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {vol.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                      {newVolIds.has(vol.id) ? (
                        <>
                            <span className="h-1 w-1 rounded-full bg-blue-600 animate-pulse"></span>
                            <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">Authorized Agent</span>
                        </>
                      ) : (
                        <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                            {vol.organisation_name || 'Independent'}
                        </span>
                      )}
                  </div>
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

export default VolunteerScrollingStrip;
