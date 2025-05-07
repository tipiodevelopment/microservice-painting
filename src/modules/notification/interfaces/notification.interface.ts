import { Timestamp } from 'firebase-admin/firestore';

export interface Notification {
  id?: string;
  title: string;
  body: string;
  targetRoute: string;
  sendAt: Timestamp;
  isSent: boolean;
  recipientId: string;
  platforms: ('web' | 'mobile')[];
  data?: Record<string, any>;
  iconUrl?: string;
  priority?: 'low' | 'normal' | 'high';
  sendCount: number; // times this notification has been sent manually or automatically
  lastSentAt?: Timestamp; // timestamp of the last send
  createdAt: Timestamp;
  updatedAt: Timestamp;
  broadcast?: boolean; // true = send all
  recipients?: string[];
}
