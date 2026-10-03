import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Occupation, Member } from '../../types';
import CountUp from '../ui/CountUp';
import { 
  Briefcase, 
  Code, 
  Store, 
  GraduationCap, 
  Building, 
  TrendingUp, 
  HeartHandshake, 
  Layers,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Scale,
  Calculator,
  UserCheck
} from 'lucide-react';

interface OccupationChartProps {
  members: Member[];
}

const OCCUPATION_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  'IT / Software': Code,
  'Business': Store,
  'Business Owner': Store,
  'Private Job': Briefcase,
  'Government Job': Building,
  'Student': GraduationCap,
  'Professional': TrendingUp,
  'Self Employed': Layers,
  'Other': HeartHandshake,
  'Others': HeartHandshake,
  'Housewife': UserCheck,
  'Retired': HeartHandshake,
  'Employee / Job': Briefcase,
  'Engineer': Code,
  'Doctor': Stethoscope,
  'Lawyer': Scale,
  'Chartered Accountant': Calculator,
  'Social Worker': HeartHandshake,
  'IAS / KAS / Govt staff': Building,
  'IAS / KAS / Govt Clerk': Building
};

const OccupationChart: React.FC<OccupationChartProps> = ({ members }) => {
  const [mounted, setMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !mounted) {
          setMounted(true);
        }
      },
      { threshold: 0.15 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [mounted]);

  // Dynamically compute counts directly from member records in database
  const allOccupations = useMemo(() => {
    const counts: Record<string, number> = {};

    members.forEach(member => {
      const rawOcc = member.occupation ? member.occupation.trim() : '';
      if (!rawOcc) return;
      counts[rawOcc] = (counts[rawOcc] || 0) + 1;
    });

    // If database has records with occupations, sort them descending by count
    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return a.name.localeCompare(b.name);
      });

    // If database has fewer than occupations or zero records, ensure predefined list is available with 0 counts
    if (sorted.length === 0) {
      return Object.values(Occupation)
        .map(name => ({ name, value: 0 }))
        .slice(0, 6);
    }

    return sorted;
  }, [members]);

  const hasMoreThanSix = allOccupations.length > 6;
  const displayedOccupations = showAll ? allOccupations : allOccupations.slice(0, 6);
  const maxVal = Math.max(...displayedOccupations.map(d => d.value), 1);
  const totalInChart = members.length || 1;

  // Controlled SSK Palette: Saffron → Muted Gold → Deep Navy → Emerald
  const barStyles = [
    { 
      grad: 'from-[#FF8A00] to-[#FFB347]', 
      iconBg: 'bg-orange-50 border-orange-200 text-[#C65E00]', 
      accentDot: 'bg-[#FF8A00]' 
    },
    { 
      grad: 'from-[#F59E0B] to-[#FCD34D]', 
      iconBg: 'bg-amber-50 border-amber-200 text-amber-800', 
      accentDot: 'bg-[#F59E0B]' 
    },
    { 
      grad: 'from-[#D97706] to-[#F59E0B]', 
      iconBg: 'bg-amber-50/70 border-amber-200/70 text-amber-900', 
      accentDot: 'bg-[#D97706]' 
    },
    { 
      grad: 'from-[#1E293B] to-[#334155]', 
      iconBg: 'bg-slate-100 border-slate-200 text-slate-700', 
      accentDot: 'bg-[#1E293B]' 
    },
    { 
      grad: 'from-[#0B1020] to-[#1E293B]', 
      iconBg: 'bg-slate-50 border-slate-200 text-slate-800', 
      accentDot: 'bg-[#0B1020]' 
    },
    { 
      grad: 'from-[#0F766E] to-[#14B8A6]', 
      iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-800', 
      accentDot: 'bg-[#0F766E]' 
    },
    { 
      grad: 'from-[#C2410C] to-[#EA580C]', 
      iconBg: 'bg-orange-50/80 border-orange-200 text-[#EA580C]', 
      accentDot: 'bg-[#C2410C]' 
    },
    { 
      grad: 'from-[#475569] to-[#64748B]', 
      iconBg: 'bg-slate-100 border-slate-300 text-slate-700', 
      accentDot: 'bg-[#475569]' 
    },
  ];

  return (
    <div ref={containerRef} className="flex flex-col h-full justify-between space-y-3.5">
      <div className="space-y-3 transition-all duration-300">
        {displayedOccupations.map((item, index) => {
          const rawWidth = Math.max(Math.round((item.value / maxVal) * 100), item.value > 0 ? 5 : 0);
          const widthPercent = mounted ? rawWidth : 0;
          const sharePercent = ((item.value / totalInChart) * 100).toFixed(1);
          const style = barStyles[index % barStyles.length];
          const isTop = index === 0 && item.value > 0;
          const transitionDelay = `${Math.min(index * 80, 500)}ms`;
          const IconComp = OCCUPATION_ICONS[item.name] || Briefcase;

          return (
            <div key={item.name} className="group p-2 rounded-xl hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${style.iconBg} shadow-2xs`}>
                    <IconComp size={13} />
                  </div>
                  <span className="font-bold text-slate-800 truncate max-w-[170px] sm:max-w-[220px]" title={item.name}>
                    {item.name}
                  </span>
                  {isTop && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-100/80 text-[#C65E00] border border-orange-200/90 shadow-2xs">
                      Primary
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-[11px] text-slate-500 font-semibold tabular-nums">
                    {sharePercent}%
                  </span>
                  <span className="font-black text-[#0B1020] tabular-nums text-xs min-w-[32px] text-right">
                    {mounted ? <CountUp end={item.value} duration={1100} /> : '0'}
                  </span>
                </div>
              </div>

              {/* Progress Track with animated growth and moving highlight */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex items-center p-0.5 relative">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${style.grad} shadow-xs relative overflow-hidden`}
                  style={{ 
                    width: `${widthPercent}%`,
                    transition: `width 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${transitionDelay}` 
                  }}
                >
                  {/* Moving highlight along active bar */}
                  <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-bar-shine pointer-events-none" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View More / View Less Toggle Button */}
      {hasMoreThanSix && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
            aria-expanded={showAll}
            aria-label={showAll ? 'View Less career and vocation categories' : 'View More career and vocation categories'}
          >
            <span>{showAll ? 'View Less' : 'View More'}</span>
            {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-semibold text-slate-600">
          {showAll ? `All ${allOccupations.length} Professional Categories` : 'Top 6 Professional Segments'}
        </span>
        <span className="font-bold text-[#FF8A00]">Ranked by active enrolment</span>
      </div>
    </div>
  );
};

export default OccupationChart;
