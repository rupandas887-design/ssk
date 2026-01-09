import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, icon }) => {
  return (
    <div className={`glass-card rounded-[2rem] p-6 md:p-10 overflow-hidden relative flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center gap-4 mb-8">
          {icon && <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500">{icon}</div>}
          <h3 className="font-cinzel text-lg md:text-xl text-white tracking-[0.15em] uppercase font-bold">
            {title}
          </h3>
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
    </div>
  );
};

export default Card;