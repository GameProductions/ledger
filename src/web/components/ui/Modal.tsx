import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-deep-slate-80 border border-glass-border rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b border-glass-border">
          <h3 className="text-xl font-black tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8">
          {children}
        </div>
        
        {footer && (
          <div className="flex justify-end gap-4 p-6 bg-white/5 border-t border-glass-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
