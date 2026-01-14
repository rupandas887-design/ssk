import React, { useEffect } from 'react';
import Card from './Card';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = 'lg' }) => {
  // Prevent background scrolling when modal is open to avoid double-scroll confusion
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
      className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[200] p-4 sm:p-6 animate-in fade-in duration-300 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className={`w-full ${widthClasses[maxWidth]} animate-in zoom-in-95 duration-300 relative mx-auto flex flex-col max-h-[92dvh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-white/10 shadow-[0_32px_120px_-20px_rgba(0,0,0,1)] p-0 bg-[#050505] overflow-hidden flex flex-col h-full">
            {/* Sticky Header: Shrinks to content, never scrolls */}
            <div className="flex justify-between items-center p-5 sm:p-8 border-b border-white/5 bg-[#050505] z-30 shrink-0">
                <h3 className="font-cinzel text-sm sm:text-lg text-orange-500 font-bold uppercase tracking-widest leading-tight pr-4">{title}</h3>
                <button 
                  onClick={onClose} 
                  className="text-gray-600 hover:text-white transition-all p-2 bg-white/5 rounded-xl active:scale-95"
                  aria-label="Close modal"
                >
                    <X size={20} />
                </button>
            </div>
            
            {/* Independent Scrollable Content Area */}
            <div 
              className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 pt-4 sm:pt-6 overscroll-contain relative"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {children}
            </div>

            {/* Sticky Footer: Stationary buttons at bottom */}
            {footer && (
              <div className="shrink-0 border-t border-white/5 p-5 sm:p-8 bg-[#050505] z-30">
                {footer}
              </div>
            )}
        </Card>
      </div>
    </div>
  );
};

export default Modal;