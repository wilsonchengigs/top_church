import React from 'react';
import { Button } from '../ui';

export interface PersonData {
  uid?: string;
  name: string;
  phone: string;
  team?: string;
  group?: string;
  activityName?: string;
  activityPrice?: number;
  [key: string]: any;
}

interface PersonCardProps {
  person: PersonData;
  isPaid?: boolean;
  onSelect: () => void;
  showDetails?: boolean;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  isPaid = false,
  onSelect,
  showDetails = true,
}) => {
  return (
    <div className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-all hover:border-indigo-300">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{person.name}</p>
        {showDetails && (
          <div className="text-sm text-gray-500 space-y-1">
            <p>📱 {person.phone} {person.team && `│ 🏷️ ${person.team}`} {person.group && `│ 👥 ${person.group}`}</p>
            {person.activityName && (
              <p>📘 {person.activityName} {person.activityPrice && `│ 💰 NT$${person.activityPrice}`}</p>
            )}
          </div>
        )}
      </div>
      <Button
        variant={isPaid ? 'success' : 'primary'}
        size="sm"
        onClick={onSelect}
      >
        {isPaid ? '✓ 已繳費' : '標記繳費'}
      </Button>
    </div>
  );
};