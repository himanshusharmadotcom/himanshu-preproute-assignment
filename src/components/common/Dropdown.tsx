import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { MultiSelect } from 'react-multi-select-component';

interface Option { label: string; value: string }

interface DropdownProps {
  label?: string;
  placeholder?: string;
  options: Option[];
  value?: string | string[];
  onChange: (value: string) => void;
  multiple?: boolean;
  error?: string;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  placeholder = 'Choose from Drop-down',
  options,
  value,
  onChange,
  multiple = false,
  error,
  disabled,
}) => {
  const selectedValues = Array.isArray(value)
    ? value
    : value ? value.toString().split(',').filter(Boolean) : [];

  /* ── multi-select via react-multi-select-component ── */
  if (multiple) {
    const selectedOptions = selectedValues
      .map((val) => options.find((o) => o.value === val))
      .filter((o): o is Option => o !== undefined);

    const handleChange = (selected: Option[]) => {
      onChange(selected.map((o) => o.value).join(','));
    };

    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
        <MultiSelect
          options={options}
          value={selectedOptions}
          onChange={handleChange}
          labelledBy={placeholder}
          overrideStrings={{ selectSomeItems: placeholder, allItemsAreSelected: placeholder, selectAll: 'Select All', search: 'Search...' }}
          disabled={disabled}
          hasSelectAll={false}
          className={error ? 'rmsc-error' : ''}
          valueRenderer={(selected) => {
            if (selected.length === 0) return <span className="text-gray-400">{placeholder}</span>;
            return (
              <span className="block truncate text-gray-800">
                {selected.map((o) => o.label).join(', ')}
              </span>
            );
          }}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  /* ── single-select (unchanged) ── */
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayLabel = () => {
    if (selectedValues.length === 0) return null;
    const found = options.find((o) => o.value === selectedValues[0]);
    return found?.label ?? selectedValues[0];
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className="w-full relative" ref={ref}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between border ${error ? 'border-red-400' : 'border-gray-300'} rounded-lg px-3.5 py-2.5 text-sm
          bg-white text-left focus:outline-none focus:border-[#4361EE] transition disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className={displayLabel() ? 'text-gray-800' : 'text-gray-400'}>
          {displayLabel() ?? placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px] max-h-56 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">No options available</div>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition flex items-center justify-between
                ${selectedValues.includes(opt.value) ? 'text-[#4361EE] font-medium bg-blue-50' : 'text-gray-700'}`}
            >
              {opt.label}
              {selectedValues.includes(opt.value) && (
                <span className="text-[#4361EE] text-xs ml-2">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
