import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export interface AutocompleteOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
  onCustomInput?: (input: string) => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select or type...',
  className,
  error = false,
  disabled = false,
  allowCustom = false,
  customPlaceholder = 'Type to search or add custom...',
  onCustomInput
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the display label for the current value
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            handleSelect(filteredOptions[highlightedIndex].value);
          } else if (allowCustom && searchTerm.trim()) {
            handleCustomInput();
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions, searchTerm, allowCustom]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleCustomInput = () => {
    if (searchTerm.trim()) {
      if (onCustomInput) {
        onCustomInput(searchTerm.trim());
      }
      onChange(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setHighlightedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "relative flex items-center w-full px-4 py-3 bg-slate-50 border rounded-xl transition-all cursor-text",
          "focus-within:ring-2 focus-within:ring-indigo-600 focus-within:border-indigo-600",
          error ? "border-rose-300 bg-rose-50/50" : "border-slate-200",
          disabled && "opacity-50 cursor-not-allowed bg-slate-100",
          isOpen && "ring-2 ring-indigo-600 border-indigo-600"
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={allowCustom ? customPlaceholder : placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400"
          autoComplete="off"
        />
        
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              aria-label="Clear selection"
            >
              <X size={14} className="text-slate-400" />
            </button>
          )}
          <ChevronDown 
            size={16} 
            className={cn(
              "text-slate-400 transition-transform",
              isOpen && "transform rotate-180"
            )} 
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500 mb-2">No options found</p>
              {allowCustom && searchTerm.trim() && (
                <button
                  type="button"
                  onClick={handleCustomInput}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  Use "{searchTerm.trim()}"
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  disabled={option.disabled}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors",
                    "first:rounded-t-xl last:rounded-b-xl",
                    option.disabled && "opacity-50 cursor-not-allowed",
                    !option.disabled && "hover:bg-slate-50",
                    highlightedIndex === index && "bg-slate-100",
                    value === option.value && "bg-indigo-50 text-indigo-700 font-semibold"
                  )}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check size={16} className="text-indigo-600" />
                  )}
                </button>
              ))}
              {allowCustom && searchTerm.trim() && !filteredOptions.some(opt => 
                opt.value.toLowerCase() === searchTerm.trim().toLowerCase()
              ) && (
                <button
                  type="button"
                  onClick={handleCustomInput}
                  className="w-full px-4 py-2.5 text-left text-sm border-t border-slate-200 hover:bg-indigo-50 text-indigo-600 font-semibold transition-colors"
                >
                  + Use "{searchTerm.trim()}"
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Autocomplete;
