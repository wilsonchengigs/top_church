import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-base font-semibold mb-2 text-gray-800">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`
          w-full px-3 py-3 text-base bg-white border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500
          transition-all
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-400 bg-gray-50'}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
      />
      {error && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-gray-600 text-sm mt-1">{helperText}</p>
      )}
    </div>
  );
};