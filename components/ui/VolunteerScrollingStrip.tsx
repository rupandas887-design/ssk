import React, { useEffect, useState, useCallback } from 'react';
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

  if (vols.length === 0) return null;

  const displayVols = [...vols, ...vols];

  return (
    <div className="w-full bg-[#050505] border-b border-white/5 overflow-hidden relative h-16 flex items-center shadow-2xl z-10">
      {/* Sidebar Label - Width 72 to match dashboard layout exactly */}
      <div className="absolute left-0 top-0 bottom-0 z-30 bg-[#050505] w-72 flex items-center gap-4 px-8 border-r border-blue-500/20 shadow-[10px_0_30px_rgba(0,0,0,1)]">
        <div className="relative flex-shrink-0">
          <Zap size={18} className="text-blue-500 animate-pulse" />
          <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20"></div>
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white whitespace-nowrap">Personnel Live</span>
      </div>

      {/* Marquee with matching 72 margin-left */}
      <div className="animate-marquee ml-72 flex items-center">
        {displayVols.map((vol, idx) => (
          <div 
            key={`${vol.id}-${idx}`}
            className={`
                flex items-center gap-4 px-12 h-16 border-r border-white/5 transition-all duration-1000
                ${newVolIds.has(vol.id) ? 'personnel-node-glow bg-blue-500/[0.04]' : 'hover:bg-white/[0.02]'}
            `}
          >
            <div className={`
                h-10 w-10 rounded-xl overflow-hidden border bg-black/60 flex-shrink-0 flex items-center justify-center transition-all duration-500
                ${newVolIds.has(vol.id) ? 'border-blue-500/50 scale-105 shadow-lg shadow-blue-500/10' : 'border-white/10'}
            `}>
              {vol.profile_photo_url ? (
                <img src={vol.profile_photo_url} alt={vol.name} className="h-full w-full object-cover" />
              ) : (
                <UserCircle size={20} className={newVolIds.has(vol.id) ? 'text-blue-500' : 'text-gray-700'} />
              )}
            </div>
            
            <div className="flex flex-col">
              <span className={`text-[12px] font-black uppercase tracking-wider whitespace-nowrap transition-colors duration-500 ${newVolIds.has(vol.id) ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                {vol.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                  {newVolIds.has(vol.id) ? (
                    <>
                        <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Authorized Agent</span>
                    </>
                  ) : (
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest truncate max-w-[140px]">
                        {vol.organisation_name || 'Independent'}
                    </span>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default VolunteerScrollingStrip;