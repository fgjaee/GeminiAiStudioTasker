import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { XCircle, CheckCircle, Info } from 'lucide-react';
import Button from './Button'; // Assuming Button is available
import { uuid } from '../utils/helpers';

interface ToastProps {
  id?: string; // Optional if not needed for direct interaction
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const icon = {
    success: <CheckCircle size={18} className="text-green-500" />,
    error: <XCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const backgroundColor = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    info: 'bg-blue-50',
  };

  const borderColor = {
    success: 'border-green-400',
    error: 'border-red-400',
    info: 'border-blue-400',
  };

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg shadow-md border ${backgroundColor[type]} ${borderColor[type]} ${textColor[type]} w-full max-w-sm`}
      role="alert"
    >
      <div className="flex items-center">
        <div className="mr-2">{icon[type]}</div>
        <p className="text-sm font-medium">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClose} className={`ml-3 p-1 rounded-full ${textColor[type]} hover:${textColor[type]}/80`} title="Dismiss">
        <XCircle size={16} />
      </Button>
    </div>
  );
};

// New Toast Context and Provider
interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    setToasts(prev => [...prev, { ...toast, id: uuid() }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export { Toast, ToastProvider, useToast }; // Export as named export as per App.tsx usage