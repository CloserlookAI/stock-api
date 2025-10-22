"use client";

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[300px]">
        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        <p className="text-sm text-neutral-200 flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setIsVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    message,
    showToast,
    hideToast,
  };
}
