import React from 'react';
import { PersonData } from './PersonCard';

interface PersonTableProps {
  person: PersonData;
  excludedKeys?: string[];
  keyMap?: Record<string, string>;
}

const DEFAULT_EXCLUDED_KEYS = ['uid', 'activityName', 'activityId', 'activityPrice'];
const DEFAULT_KEY_MAP = {
  name: '姓名',
  phone: '電話',
  team: '小組',
  group: '團契',
};

export const PersonTable: React.FC<PersonTableProps> = ({
  person,
  excludedKeys = DEFAULT_EXCLUDED_KEYS,
  keyMap = DEFAULT_KEY_MAP,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US');
  };

  const entries = Object.entries(person).filter(([key]) => !excludedKeys.includes(key));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max table-auto border-collapse">
        <thead>
          <tr>
            {entries.map(([key]) => {
              const formattedKey = !isNaN(Date.parse(key)) ? formatDate(key) : key;
              const displayKey = keyMap[formattedKey as keyof typeof keyMap] || formattedKey;
              
              return (
                <th className="px-4 py-2 border bg-gray-50 font-semibold" key={`th-${key}`}>
                  {displayKey}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            {entries.map(([key, value]) => (
              <td key={`td-${key}`} className="px-4 py-2 border">
                {String(value || '')}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};