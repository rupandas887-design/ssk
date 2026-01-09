
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'error' | 'info' | 'registry-success';

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

  const addNotification = useCallback((message: string, type: NotificationType, imageUrl?: string, title?: string) => {
    const id = uuidv4();
    // We still maintain the state and auto-dismissal logic to prevent memory leaks 
    // and keep the context functional for any code that relies on it.
    setNotifications(prev => [...prev, { id, message, type, imageUrl, title }]);
    
    setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {/* 
          Visual notification section removed as requested. 
          Toasts will no longer appear in the UI. 
      */}
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
