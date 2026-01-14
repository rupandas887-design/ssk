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
  success: <CheckCircle className="text-green-400" size={20} />,
  error: <XCircle className="text-red-400" size={20} />,
  info: <Info className="text-blue-400" size={20} />,
  'registry-success': <CheckCircle className="text-orange-500" size={20} />
};

const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    'registry-success': 'bg-orange-500'
};

const borderColors = {
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
    'registry-success': 'border-orange-500/50'
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
      <div className={`
          group relative overflow-hidden flex items-center space-x-5 p-6 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(234,88,12,0.3)] backdrop-blur-2xl border
          bg-[#050505]/95 ${borderColors[type]} w-[400px] transition-all duration-500
      `}>
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.6)]"></div>
          
          <div className="flex-shrink-0 flex items-center justify-center">
              <div className="h-14 w-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/60 flex items-center justify-center p-1">
                  {imageUrl ? (
                      <img 
                          src={imageUrl} 
                          alt="Org Logo" 
                          className="h-full w-full object-contain"
                      />
                  ) : (
                      <Building2 size={28} className="text-orange-500/50" />
                  )}
              </div>
          </div>

          <div className="flex-1 min-w-0">
              <h4 className="text-lg font-black text-white leading-tight truncate">
                  {message}
              </h4>
              <p className="text-[10px] text-orange-500 font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-orange-500 animate-pulse"></span>
                  Registry Node Operational
              </p>
          </div>

          <button 
              onClick={() => onDismiss(id)} 
              className="absolute top-4 right-4 text-gray-700 hover:text-white transition-colors p-1"
          >
              <X size={12} />
          </button>
      </div>
    );
  }

  return (
    <div className={`
        group relative overflow-hidden flex items-start space-x-4 p-5 rounded-2xl shadow-2xl backdrop-blur-xl border
        bg-[#0a0a0a]/95
        ${borderColors[type]} 
        transition-all duration-300
    `}>
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors[type]} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}></div>
        
        <div className="flex-shrink-0 pt-0.5">{icons[type]}</div>

        <div className="flex-1 min-w-0">
            <h4 className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                {title || (type === 'success' ? 'System Cleared' : type === 'error' ? 'Handshake Error' : 'Uplink Message')}
            </h4>
            <p className="text-sm leading-relaxed text-white font-bold">
                {message}
            </p>
        </div>

        <button 
            onClick={() => onDismiss(id)} 
            className="text-gray-600 hover:text-white transition-colors bg-white/5 p-1 rounded-lg"
        >
            <X size={14} />
        </button>
    </div>
  );
};

export default Notification;