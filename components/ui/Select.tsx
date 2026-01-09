import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
  description?: string;
}

const Select: React.FC<SelectProps> = ({ label, id, children, description, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2.5">
          {label}
        </label>
      )}
      <div className="relative group">
        <select
          id={id}
          className={`w-full bg-[#050505] border border-gray-800 rounded-xl py-3 px-4 text-white font-bold text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/40 focus:border-orange-500 transition-all duration-200 appearance-none cursor-pointer ${className}`}
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ea580c' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`, 
            backgroundRepeat: 'no-repeat', 
            backgroundPosition: 'right 1rem center', 
            backgroundSize: '1rem',
            colorScheme: 'dark'
          }}
          {...props}
        >
          {children}
        </select>
      </div>
      {description && (
        <p className="mt-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest pl-1">
          {description}
        </p>
      )}
    </div>
  );
};

export default Select;