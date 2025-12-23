
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import Notification, { NotificationProps } from '../components/ui/Notification';
import { v4 as uuidv4 } from 'uuid';

type NotificationData = Omit<NotificationProps, 'id' | 'onDismiss'>;

interface NotificationContextType {
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Omit<NotificationProps, 'onDismiss'>[]>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-5 right-5 z-50 space-y-3 w-full max-w-sm">
        {notifications.map((notification) => (
          <Notification key={notification.id} {...notification} onDismiss={dismissNotification} />
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
