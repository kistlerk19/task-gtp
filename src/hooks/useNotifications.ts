// hooks/useNotifications.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/lib/types';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const safeParseJSON = async (response: Response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/notifications');

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await safeParseJSON(response);
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId],
          markAsRead: true
        }),
      });

      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || 'Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);

      if (unreadNotifications.length === 0) return;

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: unreadNotifications.map(n => n.id),
          markAsRead: true
        }),
      });

      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || 'Failed to mark all notifications as read');
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await safeParseJSON(response);
        throw new Error(errorData.error || 'Failed to delete notification');
      }

      setNotifications(prev =>
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    deleteNotification
  };
};