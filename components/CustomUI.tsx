
import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, Bell, Trash2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'danger' | 'info' | 'success';
}

export const CustomModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, type = 'info' }) => {
  if (!isOpen) return null;

  const headerColors = {
    danger: 'bg-rose-600',
    info: 'bg-emerald-700',
    success: 'bg-emerald-600'
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className={`p-6 ${headerColors[type]} text-white flex justify-between items-center`}>
          <h3 className="font-black text-lg">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8 text-right">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const CustomToast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="text-emerald-400" />,
    error: <AlertTriangle className="text-rose-400" />,
    info: <Info className="text-blue-400" />
  };

  return (
    <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-xs px-4 animate-in slide-in-from-top-full">
      <div className="bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-4">
        {icons[type]}
        <p className="font-black text-xs flex-1 leading-relaxed">{message}</p>
      </div>
    </div>
  );
};
