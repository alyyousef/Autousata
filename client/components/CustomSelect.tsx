import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

type SelectValue = string | number;

export type CustomSelectOption = {
  value: SelectValue;
  label: string;
};

interface CustomSelectProps {
  value: SelectValue;
  options: CustomSelectOption[];
  onChange: (value: SelectValue) => void;
  placeholder?: string;
  className?: string;
  panelClassName?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  placeholder,
  className,
  panelClassName,
  disabled = false,
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = useMemo(
    () => options.find(option => String(option.value) === String(value)),
    [options, value]
  );

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
        className={cn(
          "dropdown-shell w-full px-4 py-3 rounded-xl border text-left focus:outline-none focus:ring-2 focus:ring-indigo-600",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <span className="text-sm font-semibold">
          {selectedOption?.label ?? placeholder ?? 'Select'}
        </span>
        <span className="dropdown-chevron" aria-hidden="true"></span>
      </button>
      {isOpen && !disabled && (
        <div className={cn("dropdown-panel", panelClassName)} role="listbox">
          {options.map(option => {
            const isActive = String(option.value) === String(value);
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn("dropdown-option", isActive && "dropdown-option-active")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
