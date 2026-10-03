import React, { useEffect, useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Gender, Member } from '../../types';
import CountUp from '../ui/CountUp';

interface GenderChartProps {
  members: Member[];
}

const GenderChart: React.FC<GenderChartProps> = ({ members }) => {
  const [isAnimated, setIsAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isAnimated) {
          setIsAnimated(true);
        }
      },
      { threshold: 0.15 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isAnimated]);

  const genderCounts = Object.values(Gender).reduce((acc, g) => {
    acc[g] = 0;
    return acc;
  }, {} as Record<string, number>);

  members.forEach(member => {
    const g = member.gender;
    if (g && genderCounts[g] !== undefined) {
      genderCounts[g]++;
    }
  });

  const total = members.length;
  const maleCount = genderCounts[Gender.Male] || 0;
  const femaleCount = genderCounts[Gender.Female] || 0;
  const otherCount = genderCounts[Gender.Other] || 0;

  const malePercent = total > 0 ? Math.round((maleCount / total) * 100) : 0;
  const femalePercent = total > 0 ? Math.round((femaleCount / total) * 100) : 0;
  const otherPercent = total > 0 ? Math.round((otherCount / total) * 100) : 0;

  // Refined palette: Saffron (#FF8A00) for Male, Deep Navy (#0B1020) for Female, Muted Emerald for Other
  const chartData = [
    { 
      name: 'Male', 
      value: maleCount, 
      color: '#FF8A00', 
      bg: 'bg-orange-50/70', 
      border: 'border-orange-200/80',
      dotColor: '#FF8A00'
    },
    { 
      name: 'Female', 
      value: femaleCount, 
      color: '#0B1020', 
      bg: 'bg-slate-50', 
      border: 'border-slate-200',
      dotColor: '#0B1020'
    },
    ...(otherCount > 0
      ? [{ 
          name: 'Other', 
          value: otherCount, 
          color: '#10B981', 
          bg: 'bg-emerald-50/70', 
          border: 'border-emerald-200',
          dotColor: '#10B981'
        }]
      : [])
  ];

  return (
    <div ref={containerRef} className="flex flex-col h-full justify-between">
      {/* Donut Chart with Centered Metric and subtle gold halo ring */}
      <div className="relative w-full h-[200px] flex items-center justify-center">
        {/* Subtle glowing ring behind donut during animation */}
        <div className={`absolute w-36 h-36 rounded-full bg-amber-400/10 blur-xl transition-opacity duration-1000 ${isAnimated ? 'opacity-80' : 'opacity-0'}`} />

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={4}
              dataKey="value"
              stroke="#FFFFFF"
              strokeWidth={3}
              isAnimationActive={isAnimated}
              animationDuration={1300}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  const percent = total > 0 ? ((Number(data.value) / total) * 100).toFixed(1) : '0';
                  return (
                    <div className="bg-[#0B1020] text-white text-xs px-3.5 py-2 rounded-xl shadow-xl border border-amber-500/20 font-medium transition-all duration-200">
                      <div className="text-slate-300 font-semibold">{data.name}</div>
                      <div className="text-[#FFB347] font-bold tabular-nums text-sm">
                        {data.value?.toLocaleString()} ({percent}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Callout with Count-up */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            TOTAL
          </span>
          <span className="text-2xl sm:text-3xl font-black text-[#0B1020] tracking-tight tabular-nums">
            <CountUp end={total} duration={1400} />
          </span>
          <span className="text-[9px] font-bold text-amber-700/80 uppercase tracking-widest">
            VERIFIED
          </span>
        </div>
      </div>

      {/* Refined SSK Legend with smooth delayed fade-in */}
      <div className={`pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5 transition-all duration-700 delay-300 ${isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100/90 flex items-center justify-between transition-all duration-300 hover:bg-orange-50/80 hover:shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A00] shadow-[0_0_8px_rgba(255,138,0,0.5)] shrink-0"></span>
            <span className="text-xs font-bold text-slate-800 truncate">Male</span>
          </div>
          <div className="text-right shrink-0 pl-1">
            <span className="text-xs font-black text-[#0B1020] tabular-nums block">
              <CountUp end={maleCount} duration={1200} />
            </span>
            <span className="text-[10px] text-slate-500 font-semibold tabular-nums">
              {malePercent}%
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 flex items-center justify-between transition-all duration-300 hover:bg-slate-100/70 hover:shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B1020] shrink-0"></span>
            <span className="text-xs font-bold text-slate-800 truncate">Female</span>
          </div>
          <div className="text-right shrink-0 pl-1">
            <span className="text-xs font-black text-[#0B1020] tabular-nums block">
              <CountUp end={femaleCount} duration={1200} />
            </span>
            <span className="text-[10px] text-slate-500 font-semibold tabular-nums">
              {femalePercent}%
            </span>
          </div>
        </div>

        {otherCount > 0 && (
          <div className="col-span-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex items-center justify-between text-xs transition-all duration-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-bold text-emerald-900">Other / Diverse</span>
            </div>
            <div className="text-right">
              <span className="font-black text-emerald-950 tabular-nums">
                <CountUp end={otherCount} duration={1200} />
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold ml-1.5 tabular-nums">
                ({otherPercent}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenderChart;
