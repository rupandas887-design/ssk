
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
        <label htmlFor={id} className="block text-[12px] font-black uppercase tracking-[0.25em] text-white mb-3 group-focus-within:text-orange-400 transition-colors">
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
          className={`w-full bg-black/80 border border-gray-700 rounded-2xl py-4 ${icon ? 'pl-12' : 'px-5'} pr-5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all duration-300 font-bold text-base sm:text-lg ${className}`}
          {...props}
        />
      </div>
      {description && (
        <p className="mt-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest pl-2">
          {description}
        </p>
      )}
    </div>
  );
};

export default Input;
