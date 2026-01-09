import React from 'react';
import Card from './Card';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <Card className="border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                <h3 className="font-cinzel text-2xl text-orange-500 font-bold uppercase tracking-widest leading-tight">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 -mr-2">
                    <X size={24} />
                </button>
            </div>
          {children}
        </Card>
      </div>
    </div>
  );
};

export default Modal;