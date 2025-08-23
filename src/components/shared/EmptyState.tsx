import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon = '🔍',
}) => {
  return (
    <div className="text-center py-8 text-gray-500">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-lg font-medium mb-2">{title}</p>
      {description && (
        <p className="text-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
};