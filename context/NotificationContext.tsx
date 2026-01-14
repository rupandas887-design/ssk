import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Notification, { NotificationType } from '../components/ui/Notification';

interface ExtendedNotificationProps {
    id: string;
    message: string;
    type: NotificationType;
    imageUrl?: string;
    title?: string;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType, imageUrl?: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ExtendedNotificationProps[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: NotificationType, imageUrl?: string, title?: string) => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, message, type, imageUrl, title }]);
    
    const duration = type === 'registry-success' ? 6000 : 5000;
    setTimeout(() => {
        dismissNotification(id);
    }, duration);
  }, [dismissNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[300] space-y-4 max-w-full sm:max-w-md pointer-events-none">
          {notifications.map(n => (
              <div key={n.id} className="pointer-events-auto">
                  <Notification 
                      {...n} 
                      onDismiss={dismissNotification} 
                  />
              </div>
          ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};