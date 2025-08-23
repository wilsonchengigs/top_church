import React from 'react';
import { Input } from '../ui';

interface SearchInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  resultCount?: number;
  showResultCount?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  query,
  onQueryChange,
  placeholder = '搜尋...',
  resultCount,
  showResultCount = false,
}) => {
  return (
    <div>
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      {showResultCount && query && resultCount !== undefined && (
        <p className="text-sm text-gray-600 -mt-3 mb-4">
          找到 {resultCount} 筆符合資料
        </p>
      )}
    </div>
  );
};