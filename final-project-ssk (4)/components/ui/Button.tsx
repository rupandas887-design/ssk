
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  disabled,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-saffron-500 active:scale-[0.98] select-none disabled:opacity-50 disabled:pointer-events-none disabled:scale-100';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#FF8A00] to-[#E87500] hover:from-[#E87500] hover:to-[#C65E00] text-black font-bold shadow-[0_4px_14px_rgba(255,138,0,0.25)] hover:shadow-[0_6px_20px_rgba(255,138,0,0.35)] border border-transparent',
    secondary: 'bg-white text-saffron-600 border border-saffron-200 hover:bg-saffron-50/60 hover:border-saffron-300 shadow-sm',
    ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100/80 hover:border-red-300 shadow-sm',
  };

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };

  return (
    <button 
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
