import React from 'react';
import { Checkbox } from '../ui';

interface CheckboxItem {
  id: string;
  label: string;
  description?: string;
}

interface CheckboxGroupProps {
  title: string;
  items: CheckboxItem[];
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  selectAllLabel?: string;
  deselectAllLabel?: string;
  maxHeight?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  title,
  items,
  selectedItems,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  selectAllLabel = '全選',
  deselectAllLabel = '全部取消',
  maxHeight = 'max-h-96',
}) => {
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  
  return (
    <div className="mb-6">
      <label className="block text-base font-semibold mb-2">
        {title}
      </label>
      <div className={`${maxHeight} overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-inner py-2`}>
        {items.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            暫無資料
          </div>
        ) : (
          <>
            {onSelectAll && (
              <div className="mb-3 px-2">
                <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        onDeselectAll?.();
                      } else {
                        onSelectAll();
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {allSelected ? deselectAllLabel : selectAllLabel}
                </label>
              </div>
            )}
            
            {items.map((item) => (
              <Checkbox
                key={item.id}
                label={item.label}
                description={item.description}
                checked={selectedItems.includes(item.id)}
                onChange={() => onToggleItem(item.id)}
              />
            ))}
            
            {onDeselectAll && (
              <div className="mb-3 px-2 border-t pt-3 mt-3">
                <label className="flex items-center gap-2 font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={onDeselectAll}
                    className="cursor-pointer"
                  />
                  {deselectAllLabel}
                </label>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};