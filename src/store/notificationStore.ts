import { create } from 'zustand';

interface NotificationState {
  notifications: any[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
}

interface NotificationStore extends NotificationState {
  setNotifications: (notifications: any[]) => void;
  setUnreadCount: (count: number) => void;
  markReadLocally: (id: string) => void;
  markAllReadLocally: () => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,

  // Set notifications from DB
  setNotifications: (notifications) => {
    set({ notifications });
  },

  // Set unread count
  setUnreadCount: (count) => {
    set({ unreadCount: count });
  },

  // Mark a notification as read locally (optimistic update)
  markReadLocally: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;

      return { notifications, unreadCount };
    });
  },

  // Mark all notifications as read locally (optimistic update)
  markAllReadLocally: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Toggle notification center open/closed
  toggleOpen: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  // Set notification center open state
  setOpen: (open) => {
    set({ isOpen: open });
  },

  // Set loading state
  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
