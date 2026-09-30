import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
  description?: string;
  isError?: boolean;
}

const Select: React.FC<SelectProps> = ({ 
  label, 
  id, 
  children, 
  description, 
  isError = false,
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
        <select
          id={id}
          disabled={disabled}
          className={`w-full bg-white text-[#0B1020] border rounded-xl py-2.5 px-3.5 pr-10 font-medium text-sm transition-all duration-200 appearance-none cursor-pointer shadow-xs ${
            disabled
              ? 'bg-slate-50/80 text-slate-600 border-slate-200 cursor-not-allowed'
              : isError 
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/15'
              : 'border-slate-200 hover:border-slate-300 focus:border-[#FF8A00] focus:ring-4 focus:ring-[#FF8A00]/15 focus:outline-none'
          } ${className}`}
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23FF8A00' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`, 
            backgroundRepeat: 'no-repeat', 
            backgroundPosition: 'right 0.875rem center', 
            backgroundSize: '1rem',
            colorScheme: 'light'
          }}
          {...props}
        >
          {children}
        </select>
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
};

export default Select;
