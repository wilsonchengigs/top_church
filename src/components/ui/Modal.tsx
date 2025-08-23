import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '4xl',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className={`bg-white p-6 rounded-lg ${maxWidthClasses[maxWidth]} w-full shadow-lg relative`}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 rounded-full !px-4 !py-2"
        >
          ✕
        </Button>
        
        <h2 className="text-2xl font-bold mb-4 pr-12">
          {title}
        </h2>
        
        {children}
      </div>
    </div>
  );
};