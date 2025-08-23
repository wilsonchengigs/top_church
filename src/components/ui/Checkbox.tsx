import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  description,
  className = '',
  ...props
}) => {
  return (
    <div className={`mb-2 px-2 ${className}`}>
      <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
        <input
          type="checkbox"
          {...props}
          className="cursor-pointer"
        />
        <span>{label}</span>
        {description && (
          <span className="text-xs text-gray-500">({description})</span>
        )}
      </label>
    </div>
  );
};