import React from 'react';
import Card from './Card';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'lg' }) => {
  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className={`w-full ${widthClasses[maxWidth]} animate-in zoom-in-95 duration-300 relative max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-white/10 shadow-[0_32px_120px_-20px_rgba(0,0,0,1)] p-0 bg-[#050505] overflow-hidden flex flex-col h-full max-h-[92vh]">
            {/* Sticky Modal Header */}
            <div className="flex justify-between items-center p-5 sm:p-8 border-b border-white/5 bg-[#050505] z-10 shrink-0">
                <h3 className="font-cinzel text-base sm:text-lg text-orange-500 font-bold uppercase tracking-widest leading-tight">{title}</h3>
                <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors p-2 -mr-2">
                    <X size={20} />
                </button>
            </div>
            
            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 pt-2 sm:pt-4">
              {children}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default Modal;