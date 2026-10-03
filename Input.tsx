import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  description?: string;
  isError?: boolean;
  isSuccess?: boolean;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  id, 
  icon, 
  rightElement,
  description, 
  isError = false,
  isSuccess = false,
  className = '', 
  disabled,
  ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-[#0B1020] mb-1.5 transition-colors">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF8A00] transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          disabled={disabled}
          className={`w-full bg-white text-[#0B1020] rounded-xl py-2.5 ${icon ? 'pl-10' : 'px-3.5'} ${rightElement ? 'pr-24 sm:pr-28' : 'pr-3.5'} placeholder:text-slate-400 font-medium text-sm transition-all duration-200 shadow-xs ${
            disabled 
              ? 'bg-slate-50/80 text-slate-600 border border-slate-200 cursor-not-allowed'
              : isError
              ? 'border border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 text-red-900'
              : isSuccess
              ? 'border border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15'
              : 'border border-slate-200 hover:border-slate-300 focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15 focus:outline-none'
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
            {rightElement}
          </div>
        )}
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
};

export default Input;
