import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  label,
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
  prefix = '',
}) => (
  <div>
    {label && <p className="text-sm text-gray-600 mb-1.5">{label}</p>}
    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white w-24">
      <span className="flex-1 text-center text-sm font-medium py-2.5 text-gray-800">
        {prefix}
        {value > 0 ? `+${value}` : value}
      </span>
      <div className="flex flex-col border-l border-gray-300">
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="px-1.5 py-0.5 hover:bg-gray-100 transition"
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="px-1.5 py-0.5 hover:bg-gray-100 transition border-t border-gray-300"
        >
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  </div>
);
