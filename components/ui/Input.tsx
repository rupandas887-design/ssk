import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`w-full bg-black/40 border border-gray-800 rounded-xl py-3 ${icon ? 'pl-10' : 'px-4'} pr-4 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-300 font-medium ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};

export default Input;