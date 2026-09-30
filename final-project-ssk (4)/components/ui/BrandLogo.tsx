import React from 'react';

export interface BrandLogoProps {
  variant?: 'dark' | 'light' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  showIcon?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
  showSubtitle = false,
  className = '',
  showIcon = false,
}) => {
  // Dimensions for emblem
  const emblemSizes = {
    sm: { box: 28, text: 'text-base', sub: 'text-[8px]' },
    md: { box: 36, text: 'text-xl', sub: 'text-[9px]' },
    lg: { box: 44, text: 'text-2xl', sub: 'text-[10px]' },
  };

  const dim = emblemSizes[size];

  // SVG Emblem Mark recolored with Saffron/Kesari, Soft Saffron & White
  const Emblem = (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl transition-transform duration-300 ${
        variant === 'dark'
          ? 'shadow-[0_0_20px_rgba(255,138,0,0.25)]'
          : 'shadow-[0_4px_14px_rgba(255,138,0,0.15)]'
      }`}
      style={{ width: dim.box, height: dim.box }}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="emblem-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8A00" />
            <stop offset="50%" stopColor="#E87500" />
            <stop offset="100%" stopColor="#C65E00" />
          </linearGradient>
          <linearGradient id="emblem-grad-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB347" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF8A00" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="emblem-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF1DC" />
            <stop offset="60%" stopColor="#FFB347" />
            <stop offset="100%" stopColor="#FF8A00" />
          </radialGradient>
        </defs>

        {/* Outer shield/prism base */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#emblem-grad-primary)"
        />
        
        {/* Subtle inner highlight border */}
        <rect
          x="3.5"
          y="3.5"
          width="41"
          height="41"
          rx="11.5"
          stroke="url(#emblem-grad-glow)"
          strokeWidth="1.2"
        />

        {/* Geometric Community Interlocking Rings / Network Prism */}
        <g transform="translate(6, 6)">
          {/* Central Connection Core */}
          <circle cx="18" cy="18" r="4.5" fill="url(#emblem-core-glow)" />

          {/* Three Intersecting Community Orbits */}
          <circle
            cx="18"
            cy="12"
            r="6.5"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeOpacity="0.9"
          />
          <circle
            cx="12.5"
            cy="21.5"
            r="6.5"
            stroke="#FFF1DC"
            strokeWidth="2"
            strokeOpacity="0.85"
          />
          <circle
            cx="23.5"
            cy="21.5"
            r="6.5"
            stroke="#FFE2B8"
            strokeWidth="2"
            strokeOpacity="0.85"
          />

          {/* Dynamic Zenith Pulse Dot */}
          <circle cx="18" cy="12" r="2" fill="#FFFFFF" />
          <circle cx="12.5" cy="21.5" r="1.5" fill="#FFF1DC" />
          <circle cx="23.5" cy="21.5" r="1.5" fill="#FFF1DC" />
        </g>
      </svg>
    </div>
  );

  if (variant === 'icon') {
    if (!showIcon) return null;
    return (
      <div className={`inline-flex items-center justify-center ${className}`} title="SSK People Registry">
        {Emblem}
      </div>
    );
  }

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center ${showIcon ? 'gap-3' : ''} select-none ${className}`}>
      {showIcon && Emblem}
      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5 font-bold tracking-tight">
          <span
            className={`font-black tracking-tighter ${dim.text} ${
              isDark ? 'text-white' : 'text-[#0B1020]'
            }`}
          >
            SSK
          </span>
          <span
            className={`font-black tracking-tight ${dim.text} bg-gradient-to-r ${
              isDark
                ? 'from-[#FFB347] via-[#FF8A00] to-[#E87500] text-transparent bg-clip-text'
                : 'from-[#FF8A00] to-[#E87500] text-transparent bg-clip-text'
            }`}
          >
            PEOPLE
          </span>
        </div>
        {showSubtitle && (
          <span
            className={`mt-1 font-semibold uppercase tracking-[0.25em] ${dim.sub} ${
              isDark ? 'text-saffron-200/70' : 'text-slate-500'
            }`}
          >
            Community Registry
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
