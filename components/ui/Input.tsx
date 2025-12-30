
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  description?: string;
}

const Input: React.FC<InputProps> = ({ label, id, icon, description, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-[0.2em] text-white mb-2 group-focus-within:text-orange-400 transition-colors">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`w-full bg-black/60 border border-gray-800 rounded-xl py-3 ${icon ? 'pl-11' : 'px-4'} pr-4 text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500/40 focus:border-orange-500 transition-all duration-200 font-medium text-sm sm:text-base ${className}`}
          {...props}
        />
      </div>
      {description && (
        <p className="mt-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest pl-1">
          {description}
        </p>
      )}
    </div>
  );
};

export default Input;
