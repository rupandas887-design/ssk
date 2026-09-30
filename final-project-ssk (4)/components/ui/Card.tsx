import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  gradient?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  title, 
  subtitle,
  icon, 
  action,
  gradient = false 
}) => {
  return (
    <div 
      className={`rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_25px_-5px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)] transition-all duration-300 relative overflow-hidden flex flex-col ${
        gradient 
          ? 'bg-gradient-to-br from-white via-white to-[#F8FAFF]' 
          : 'bg-white'
      } ${className}`}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-saffron-50 border border-saffron-100 flex items-center justify-center text-saffron-600 shadow-sm shrink-0">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6 flex-1 relative z-10">
        {children}
      </div>
      
      {/* Subtle Saffron ambient accent light in top corner */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-saffron-500/[0.04] to-saffron-400/[0.02] rounded-full blur-2xl pointer-events-none -mr-12 -mt-12"></div>
    </div>
  );
};

export default Card;