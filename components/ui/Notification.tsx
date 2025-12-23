
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

export interface NotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: (id: string) => void;
}

const icons = {
  success: <CheckCircle className="text-green-400" />,
  error: <XCircle className="text-red-400" />,
  info: <Info className="text-blue-400" />,
};

const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
};

const Notification: React.FC<NotificationProps> = ({ id, message, type, onDismiss }) => {

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-md shadow-lg p-4 flex items-start space-x-3 relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors[type]}`}></div>
        <div className="flex-shrink-0 pl-1">{icons[type]}</div>
        <div className="flex-1">
            <p className="text-sm font-medium text-white">{message}</p>
        </div>
        <button onClick={() => onDismiss(id)} className="text-gray-400 hover:text-white">
            <XCircle size={18} />
        </button>
    </div>
  );
};

export default Notification;
