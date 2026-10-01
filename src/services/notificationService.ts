import axiosInstance from '@/api/axiosInstance';

export type NotificationType =
  | 'task_assigned'
  | 'compliance_expiring'
  | 'compliance_expired'
  | 'task_overdue'
  | 'approval_pending'
  | 'compliance_approved'
  | 'compliance_rejected'
  | 'system';

export interface NotificationItem {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  relatedTask?: string;
  relatedComplianceRecord?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: NotificationItem[];
  unreadCount: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const notificationService = {
  async getNotifications(page = 1, limit = 20, unreadOnly = false): Promise<NotificationListResponse> {
    const res = await axiosInstance.get('/notifications', {
      params: { page, limit, unreadOnly: unreadOnly ? 'true' : 'false' },
    });
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await axiosInstance.get('/notifications/unread-count');
    return res.data.data.count;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await axiosInstance.patch(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<number> {
    const res = await axiosInstance.patch('/notifications/read-all');
    return res.data.data.updatedCount;
  },

  async deleteNotification(id: string): Promise<void> {
    await axiosInstance.delete(`/notifications/${id}`);
  },
};
