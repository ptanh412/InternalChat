import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useUser } from './UserContext'; // Assuming you have a user context

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { socket } = useUser();

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      console.log('New notification received in context:', data);
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await axios.get('http://localhost:5000/api/notification', {
        params: {
          limit: 20,
          skip: 0
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setNotifications(response.data.data.notifications);
      // console.log('Notifications fetched:', response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
      // console.log('Unread count fetched:', response.data.data.unreadCount);
      setLoading(false);
    } catch (error) {
      console.error('Notification fetch error:', error);
      setError('Failed to fetch notifications');
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/notification/unread-count', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUnreadCount(response.data.data);
      // console.log('Unread count fetched 1:', response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(
        'http://localhost:5000/api/notification/read-all',
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setNotifications(notifications.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      setError('Failed to mark notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`http://localhost:5000/api/notification/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
      fetchUnreadCount(); // Refresh unread count after deletion
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setError('Failed to delete notification');
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};