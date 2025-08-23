import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  placeholder,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-base font-semibold mb-2 text-gray-800">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`
          w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-md
          focus:outline-none focus:border-blue-500 transition-colors
          ${props.disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'border-red-400' : ''}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}
    </div>
  );
};