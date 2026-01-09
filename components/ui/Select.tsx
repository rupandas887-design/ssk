import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
  description?: string;
}

const Select: React.FC<SelectProps> = ({ label, id, children, description, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-black uppercase tracking-[0.15em] text-white/90 mb-2.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className="w-full bg-black/80 border border-gray-700 rounded-2xl py-4 px-5 text-white font-bold text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all duration-300 appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ea580c' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
          {...props}
        >
          {children}
        </select>
      </div>
      {description && (
        <p className="mt-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest pl-2">
          {description}
        </p>
      )}
    </div>
  );
};

export default Select;