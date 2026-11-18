import { createContext, useContext } from 'react';

export const PushNotificationContext = createContext(null);

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within App');
  }
  return context;
};
