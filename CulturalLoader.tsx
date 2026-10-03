import React, { useState, useEffect } from 'react';

interface CulturalLoaderProps {
  /** Optional custom message shown beneath the Sanskrit verse during operations */
  message?: string;
  /** Whether this is a fast loader (skips to shloka directly for snappy actions) */
  compact?: boolean;
  /** Optional callback when full animation sequence completes (if controlled) */
  onComplete?: () => void;
  /** Optional full screen or container overlay (defaults to fixed inset-0) */
  overlay?: boolean;
}

/**
 * Premium Cultural SSK Samaj Loading Animation
 * Sequence:
 * 1. Saffron sacred Om symbol appears with gentle golden glow
 * 2. Shloka 1: "कृतवीर्यसुतो राजा कार्तवीर्योऽभवद् बली।"
 * 3. Shloka 2: "दत्तात्रेयप्रसादेन बाहुसाहस्रवान् प्रभुः॥"
 * 4. Warm golden light expand and smooth fade-out
 */
export const CulturalLoader: React.FC<CulturalLoaderProps> = ({
  message,
  compact = false,
  onComplete,
  overlay = true,
}) => {
  // 1 = Symbol entrance, 2 = Shloka 1, 3 = Shloka 2, 4 = Golden transition/fade-out
  const [step, setStep] = useState<number>(compact ? 2 : 1);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  useEffect(() => {
    // If compact mode, accelerate the timeline for snappy interactions
    const t1Duration = compact ? 400 : 750;
    const t2Duration = compact ? 1200 : 1600;
    const t3Duration = compact ? 1200 : 1600;

    const timer1 = setTimeout(() => {
      setStep(2);
    }, t1Duration);

    const timer2 = setTimeout(() => {
      setStep(3);
    }, t1Duration + t2Duration);

    const timer3 = setTimeout(() => {
      setStep(4);
      setIsFinishing(true);
      if (onComplete) {
        setTimeout(onComplete, 400);
      }
    }, t1Duration + t2Duration + t3Duration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [compact, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        overlay ? 'fixed inset-0 z-50' : 'relative w-full min-h-[420px]'
      } flex flex-col items-center justify-center bg-[#FAF9F5] select-none overflow-hidden transition-opacity duration-500 ${
        isFinishing ? 'opacity-95' : 'opacity-100'
      }`}
    >
      {/* ━━━ BACKGROUND ATMOSPHERE: Warm Ivory, Sacred Mandala & Floating Gold Particles ━━━ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {/* Soft radial golden sunlight */}
        <div className="w-[520px] sm:w-[720px] h-[520px] sm:h-[720px] rounded-full bg-gradient-to-tr from-amber-400/12 via-[#FF8A00]/15 to-yellow-300/10 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        
        {/* Very faint sacred geometric mandala pattern */}
        <svg
          className="absolute w-[380px] sm:w-[540px] h-[380px] sm:h-[540px] opacity-[0.06] animate-solar-ray"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="90" stroke="#FF8A00" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="70" stroke="#F59E0B" strokeWidth="1" />
          <circle cx="100" cy="100" r="50" stroke="#D97706" strokeWidth="0.8" strokeDasharray="2 4" />
          <polygon points="100,15 125,85 195,85 138,125 160,195 100,155 40,195 62,125 5,85 75,85" stroke="#FF8A00" strokeWidth="0.6" />
          <polygon points="100,25 120,80 180,80 132,118 150,175 100,140 50,175 68,118 20,80 80,80" stroke="#F59E0B" strokeWidth="0.5" />
        </svg>

        {/* Floating subtle golden particles */}
        <div className="absolute top-[22%] left-[28%] w-1.5 h-1.5 rounded-full bg-amber-400/50 shadow-[0_0_8px_#F59E0B] animate-drift-slow" />
        <div className="absolute top-[32%] right-[24%] w-2 h-2 rounded-full bg-[#FF8A00]/40 shadow-[0_0_10px_#FF8A00] animate-drift-slow" style={{ animationDelay: '1.2s' }} />
        <div className="absolute bottom-[28%] left-[22%] w-1.5 h-1.5 rounded-full bg-yellow-400/50 shadow-[0_0_8px_#FBBF24] animate-drift-slow" style={{ animationDelay: '2.4s' }} />
        <div className="absolute bottom-[35%] right-[27%] w-1 h-1 rounded-full bg-amber-300/60 shadow-[0_0_6px_#F59E0B] animate-drift-slow" style={{ animationDelay: '0.8s' }} />
      </div>

      {/* ━━━ FOREGROUND CONTENT CONTAINER ━━━ */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-lg mx-auto">
        
        {/* STEP 1: Saffron / Golden Sacred Om Symbol */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center">
          {/* Subtle glowing halo behind Om */}
          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-r from-amber-400/25 via-[#FF8A00]/30 to-orange-500/20 blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
          
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/20 to-amber-600/10 border border-amber-300/50 backdrop-blur-xs flex items-center justify-center shadow-[0_8px_24px_-6px_rgba(255,138,0,0.3)] transition-all duration-700 transform hover:scale-105">
            {/* Sacred Om Symbol */}
            <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FF8A00] via-[#E87500] to-[#C65E00] drop-shadow-[0_2px_8px_rgba(255,138,0,0.4)] select-none">
              ॐ
            </span>

            {/* Corner ornamental accents */}
            <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-amber-400/60 rounded-tl" />
            <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-amber-400/60 rounded-br" />
          </div>
        </div>

        {/* STEP 2 & 3: Sanskrit Shlokas of Lord Sahasrarjuna */}
        <div className="min-h-[70px] sm:min-h-[85px] flex flex-col items-center justify-center relative w-full px-2">
          
          {/* Shloka 1: कृतवीर्यसुतो राजा कार्तवीर्योऽभवद् बली। */}
          <div
            className={`transition-all duration-700 ease-out absolute inset-0 flex flex-col items-center justify-center ${
              step === 2
                ? 'opacity-100 translate-y-0 blur-0 scale-100'
                : step < 2
                ? 'opacity-0 translate-y-3 blur-xs scale-98 pointer-events-none'
                : 'opacity-0 -translate-y-3 blur-xs scale-98 pointer-events-none'
            }`}
          >
            <p className="font-sanskrit text-lg sm:text-2xl md:text-[26px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#9E4600] via-[#C65E00] to-[#FF8A00] tracking-wide leading-relaxed drop-shadow-[0_1px_2px_rgba(255,138,0,0.2)]">
              कृतवीर्यसुतो राजा कार्तवीर्योऽभवद् बली।
            </p>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-amber-700/70 mt-1">
              • श्री कार्तवीर्य अर्जुन •
            </span>
          </div>

          {/* Shloka 2: दत्तात्रेयप्रसादेन बाहुसाहस्रवान् प्रभुः॥ */}
          <div
            className={`transition-all duration-700 ease-out absolute inset-0 flex flex-col items-center justify-center ${
              step >= 3
                ? 'opacity-100 translate-y-0 blur-0 scale-100'
                : 'opacity-0 translate-y-3 blur-xs scale-98 pointer-events-none'
            }`}
          >
            <p className="font-sanskrit text-lg sm:text-2xl md:text-[26px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#9E4600] via-[#C65E00] to-[#FF8A00] tracking-wide leading-relaxed drop-shadow-[0_1px_2px_rgba(255,138,0,0.2)]">
              दत्तात्रेयप्रसादेन बाहुसाहस्रवान् प्रभुः॥
            </p>
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-amber-700/70 mt-1">
              • सोमवंश सहस्रार्जुन क्षत्रिय •
            </span>
          </div>

        </div>

        {/* Dynamic Action / Progress Status Pill */}
        <div className="mt-6 flex flex-col items-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-amber-200 shadow-xs backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#FF8A00] animate-ping" />
            <span className="text-xs font-bold text-[#0B1020] tracking-wide">
              {message || 'Connecting to SSK Samaj Network...'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 font-medium">
            Somavamsha Sahasrarjuna Kshatriya Community
          </p>
        </div>

      </div>
    </div>
  );
};

export default CulturalLoader;
