
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import Notification, { NotificationProps } from '../components/ui/Notification';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'error' | 'info' | 'registry-success';

interface ExtendedNotificationProps extends Omit<NotificationProps, 'onDismiss'> {
    imageUrl?: string;
    title?: string;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType, imageUrl?: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ExtendedNotificationProps[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType, imageUrl?: string, title?: string) => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, message, type, imageUrl, title }]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-3 w-full max-w-sm pointer-events-none">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <Notification {...notification} onDismiss={dismissNotification} />
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
