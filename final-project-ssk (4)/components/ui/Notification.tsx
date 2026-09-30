import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X, Building2 } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'registry-success';

export interface NotificationProps {
  id: string;
  message: string;
  type: NotificationType;
  imageUrl?: string;
  title?: string;
  onDismiss: (id: string) => void;
}

const icons = {
  success: <CheckCircle className="text-emerald-500" size={20} />,
  error: <XCircle className="text-rose-500" size={20} />,
  info: <Info className="text-saffron-500" size={20} />,
  'registry-success': <CheckCircle className="text-saffron-600" size={20} />
};

const accents = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  info: 'bg-saffron-500',
  'registry-success': 'bg-gradient-to-b from-saffron-500 to-saffron-600'
};

const titles = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  info: 'text-saffron-600',
  'registry-success': 'text-saffron-600'
};

const Notification: React.FC<NotificationProps> = ({ id, message, type, imageUrl, title, onDismiss }) => {
  useEffect(() => {
    const duration = type === 'registry-success' ? 6000 : 5000;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, type, onDismiss]);

  const isRegistryType = type === 'registry-success';

  if (isRegistryType) {
    return (
      <div className="group relative overflow-hidden flex items-center space-x-4 p-5 rounded-2xl shadow-[0_12px_36px_-6px_rgba(15,23,42,0.12)] border border-slate-200/90 bg-white w-[380px] transition-all duration-300">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-saffron-500 to-saffron-600"></div>
        
        <div className="flex-shrink-0 flex items-center justify-center">
          <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center p-1">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Org Logo" 
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 size={24} className="text-saffron-500" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
            {message}
          </h4>
          <p className="text-[11px] text-saffron-600 font-semibold tracking-wide mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-saffron-500 animate-pulse"></span>
            Registry Node Synchronized
          </p>
        </div>

        <button 
          onClick={() => onDismiss(id)} 
          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden flex items-start space-x-3.5 p-4 rounded-xl shadow-[0_10px_30px_-5px_rgba(15,23,42,0.1)] border border-slate-200/90 bg-white w-[360px] transition-all duration-300">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accents[type]}`}></div>
      
      <div className="flex-shrink-0 pt-0.5">{icons[type]}</div>

      <div className="flex-1 min-w-0">
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${titles[type]}`}>
          {title || (type === 'success' ? 'Completed' : type === 'error' ? 'Notice' : 'Information')}
        </h4>
        <p className="text-xs text-slate-700 font-medium leading-relaxed">
          {message}
        </p>
      </div>

      <button 
        onClick={() => onDismiss(id)} 
        className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default Notification;