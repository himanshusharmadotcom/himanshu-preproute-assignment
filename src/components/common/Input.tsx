import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  iconPosition = 'right',
  className = '',
  id,
  ...rest
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400
            focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]/30 transition
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${className}`}
          {...rest}
        />
        {icon && (
          <span
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400
              ${iconPosition === 'right' ? 'right-3' : 'left-3'}`}
          >
            {icon}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
