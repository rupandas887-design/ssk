import React, { useEffect, useState, useRef } from 'react';
import { SupportNeed, Member } from '../../types';
import { 
  GraduationCap, 
  Stethoscope, 
  Heart, 
  Home, 
  Briefcase, 
  TrendingUp, 
  Building, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import CountUp from '../ui/CountUp';

interface SupportChartProps {
  members: Member[];
}

const CATEGORY_META: Record<SupportNeed, { 
  label: string; 
  icon: React.ComponentType<{ size?: number | string; className?: string }>; 
  color: string; 
  barGrad: string;
  pillBg: string;
}> = {
  [SupportNeed.Education]: { 
    label: 'Education & Academic Support', 
    icon: GraduationCap, 
    color: '#FF8A00',
    barGrad: 'from-[#FF8A00] to-[#FFB347]',
    pillBg: 'bg-orange-50 border-orange-200 text-[#C65E00]' 
  },
  [SupportNeed.Medical]: { 
    label: 'Healthcare & Medical Aid', 
    icon: Stethoscope, 
    color: '#E11D48',
    barGrad: 'from-rose-500 to-rose-400',
    pillBg: 'bg-rose-50 border-rose-200 text-rose-700' 
  },
  [SupportNeed.Marriage]: { 
    label: 'Matrimonial & Family Welfare', 
    icon: Heart, 
    color: '#D97706',
    barGrad: 'from-amber-600 to-amber-400',
    pillBg: 'bg-amber-50 border-amber-200 text-amber-800' 
  },
  [SupportNeed.Housing]: { 
    label: 'Housing & Settlement Assistance', 
    icon: Home, 
    color: '#0B1020',
    barGrad: 'from-[#0B1020] to-[#1E293B]',
    pillBg: 'bg-slate-100 border-slate-200 text-slate-800' 
  },
  [SupportNeed.Job]: { 
    label: 'Employment & Career Opportunities', 
    icon: Briefcase, 
    color: '#10B981',
    barGrad: 'from-emerald-600 to-teal-400',
    pillBg: 'bg-emerald-50 border-emerald-200 text-emerald-800' 
  },
  [SupportNeed.Investment]: { 
    label: 'Business & Investment Guidance', 
    icon: TrendingUp, 
    color: '#8B5CF6',
    barGrad: 'from-violet-600 to-indigo-400',
    pillBg: 'bg-violet-50 border-violet-200 text-violet-800' 
  },
  [SupportNeed.GovtAssistance]: { 
    label: 'Government Scheme Facilitation', 
    icon: Building, 
    color: '#0284C7',
    barGrad: 'from-sky-600 to-cyan-500',
    pillBg: 'bg-sky-50 border-sky-200 text-sky-800' 
  },
  [SupportNeed.Other]: { 
    label: 'General Community Welfare', 
    icon: HelpCircle, 
    color: '#64748B',
    barGrad: 'from-slate-600 to-slate-400',
    pillBg: 'bg-slate-100 border-slate-200 text-slate-700' 
  },
};

const SupportChart: React.FC<SupportChartProps> = ({ members }) => {
  const [mounted, setMounted] = useState(false);
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

  const supportCounts = Object.values(SupportNeed).reduce((acc, need) => {
    acc[need] = 0;
    return acc;
  }, {} as Record<string, number>);

  members.forEach(member => {
    const need = member.support_need;
    if (need && supportCounts[need] !== undefined) {
      supportCounts[need]++;
    }
  });

  const rawList = Object.entries(supportCounts).map(([needKey, count]) => {
    const need = needKey as SupportNeed;
    const meta = CATEGORY_META[need] || {
      label: needKey,
      icon: HelpCircle,
      color: '#FF8A00',
      barGrad: 'from-[#FF8A00] to-[#FFB347]',
      pillBg: 'bg-orange-50 border-orange-200 text-[#C65E00]'
    };
    return {
      key: needKey,
      label: meta.label,
      count,
      icon: meta.icon,
      color: meta.color,
      barGrad: meta.barGrad,
      pillBg: meta.pillBg
    };
  });

  // Sort by count descending so highest-value categories appear at the top
  const sortedData = [...rawList].sort((a, b) => b.count - a.count);
  const maxVal = Math.max(...sortedData.map(d => d.count), 1);
  const totalRequests = sortedData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div ref={containerRef} className="flex flex-col h-full justify-between space-y-5">
      {/* 2-Column Responsive Analytical Layout with smooth staggered entrance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {sortedData.map((item, idx) => {
          const rawWidth = Math.max(Math.round((item.count / maxVal) * 100), item.count > 0 ? 5 : 0);
          const widthPercent = mounted ? rawWidth : 0;
          const percentOfTotal = totalRequests > 0 ? ((item.count / totalRequests) * 100).toFixed(1) : '0';
          const Icon = item.icon;
          const isHighest = idx === 0 && item.count > 0;
          const transitionDelay = `${idx * 85}ms`;

          return (
            <div 
              key={item.key} 
              className={`p-3.5 rounded-2xl border transition-all duration-500 analytics-card-elevated ${
                isHighest 
                  ? 'bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-transparent border-amber-300/80 shadow-[0_4px_16px_-4px_rgba(255,138,0,0.18)]' 
                  : 'bg-white border-slate-100 hover:border-slate-200/90'
              } ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
              style={{ transitionDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border shadow-xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${item.color}15`,
                      borderColor: `${item.color}30`,
                      color: item.color
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <span className="font-bold text-slate-800 truncate" title={item.label}>
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-[11px] text-slate-500 font-semibold tabular-nums">
                    {percentOfTotal}%
                  </span>
                  <span className="font-black text-[#0B1020] tabular-nums text-xs min-w-[24px] text-right">
                    {mounted ? <CountUp end={item.count} duration={1200} /> : '0'}
                  </span>
                </div>
              </div>

              {/* Progress bar track with smooth growth and gleam */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex items-center p-0.5 relative">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${item.barGrad} shadow-xs relative overflow-hidden`}
                  style={{ 
                    width: `${widthPercent}%`,
                    transition: `width 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${transitionDelay}` 
                  }}
                >
                  {isHighest && (
                    <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-bar-shine pointer-events-none" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Total Support Needs Recorded:</span>
          <span className="font-black text-[#0B1020] text-sm tabular-nums">
            {mounted ? <CountUp end={totalRequests} duration={1400} /> : totalRequests.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] animate-pulse"></span>
          <span>Priorities aggregated for targeted Samaj welfare &amp; education schemes</span>
        </div>
      </div>
    </div>
  );
};

export default SupportChart;
