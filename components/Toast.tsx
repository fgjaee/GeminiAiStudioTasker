
import React from 'react';
import { XCircle, CheckCircle, Info } from 'lucide-react';
import Button from './Button'; // Assuming Button is available

interface ToastProps {
  id?: string; // Optional if not needed for direct interaction
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
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

export { Toast }; // Export as named export as per App.tsx usage
    