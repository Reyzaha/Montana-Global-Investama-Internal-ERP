import { Notification } from "../types/notification.types";

export interface NotificationRepository {
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(
    notification: Omit<Notification, "id" | "createdAt" | "isRead">,
  ): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}
