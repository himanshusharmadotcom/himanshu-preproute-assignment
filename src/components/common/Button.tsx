import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClass: Record<string, string> = {
  primary: 'bg-[#4361EE] hover:bg-[#3451D1] text-white',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-[#EF4444] hover:bg-[#DC2626] text-white',
  ghost: 'bg-transparent text-[#4361EE] hover:bg-blue-50',
};

const sizeClass: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...rest
}) => (
  <button
    className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#4361EE]/40 disabled:opacity-50 disabled:cursor-not-allowed
      ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    disabled={disabled}
    {...rest}
  >
    {children}
  </button>
);
