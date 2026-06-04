import React from 'react';

interface RadioButtonProps {
  label: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  name: string;
}

export const RadioButton: React.FC<RadioButtonProps> = ({ label, value, checked, onChange, name }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none">
    <div
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
        ${checked ? 'border-[#4361EE]' : 'border-gray-300'}`}
      onClick={() => onChange(value)}
    >
      {checked && <div className="w-2.5 h-2.5 rounded-full bg-[#4361EE]" />}
    </div>
    <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="sr-only" />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);
