import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UpdateNotificationDto } from '../dto/update-notification.dto';
import { RegisterTokenDto } from '../dto/register-token.dto';
import { ApiResponse } from '../../../utils/interfaces';
import { documents } from '../../../utils/enums/documents.enum';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly col = documents.notifications;

  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck(): Promise<ApiResponse> {
    return { executed: true, message: 'OK', data: null };
  }

  async registerToken(dto: RegisterTokenDto): Promise<ApiResponse> {
    const db = this.firebaseService.returnFirestore();
    const userRef = db.collection('users').doc(dto.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new NotFoundException(`User ${dto.userId} not found`);
    }

    await userRef.update({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(dto.token),
      updated_at: admin.firestore.Timestamp.now(),
    });

    this.logger.log(`Registered token for user ${dto.userId}`);
    return { executed: true, message: 'Token registered', data: null };
  }

  /**
   * Create a new notification document
   */
  async create(dto: CreateNotificationDto): Promise<ApiResponse> {
    const now = admin.firestore.Timestamp.now();
    const sendAtTs = admin.firestore.Timestamp.fromDate(new Date(dto.sendAt));

    const payload = {
      ...dto,
      sendAt: sendAtTs,
      isSent: dto.isSent,
      sendCount: 0,
      createdAt: now,
      updatedAt: now,
      broadcast: dto.broadcast || false,
      recipients: dto.recipients || null,
    } as any;

    const result = await this.firebaseService.setOrAddDocument(
      this.col,
      payload,
    );
    return {
      executed: true,
      message: 'Notification created',
      data: { id: result.data.id, ...payload },
    };
  }

  async findAll(filter?: {
    recipientId?: string;
    isSent?: boolean;
  }): Promise<ApiResponse> {
    const db = this.firebaseService.returnFirestore();
    let q: FirebaseFirestore.Query = db.collection(this.col);

    if (filter?.recipientId) {
      q = q.where('recipientId', '==', filter.recipientId);
    }
    if (filter?.isSent !== undefined) {
      q = q.where('isSent', '==', filter.isSent);
    }

    const snap = await q.get();
    const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return { executed: true, message: '', data };
  }

  async findOne(id: string): Promise<ApiResponse> {
    const doc = await this.firebaseService.getDocumentById(this.col, id);
    if (!doc.executed || !doc.data) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return { executed: true, message: '', data: { id, ...doc.data } };
  }

  async update(id: string, dto: UpdateNotificationDto): Promise<ApiResponse> {
    const now = admin.firestore.Timestamp.now();
    const updateData: any = { ...dto, updatedAt: now };

    if (dto.sendAt) {
      updateData.sendAt = admin.firestore.Timestamp.fromDate(
        new Date(dto.sendAt),
      );
    }

    await this.firebaseService.updateDocument(this.col, id, updateData);
    const updated = await this.firebaseService.getDocumentById(this.col, id);

    return {
      executed: true,
      message: 'Notification updated',
      data: { id, ...updated.data },
    };
  }

  /**
   * Send immediately, usando broadcast/recipients o el recipientId por defecto.
   * Incrementa sendCount, actualiza lastSentAt e isSent.
   */
  async sendNow(id: string): Promise<ApiResponse> {
    const db = this.firebaseService.returnFirestore();

    // 1) Carga la notificación
    const notifSnap = await this.firebaseService.getDocumentById(this.col, id);
    if (!notifSnap.executed || !notifSnap.data) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    const notif = notifSnap.data as any;

    // 2) Determina la lista de userIds
    let userIds: string[];
    if (notif.broadcast) {
      const users = await db.collection('users').get();
      userIds = users.docs.map((d) => d.id);
    } else if (Array.isArray(notif.recipients) && notif.recipients.length) {
      userIds = notif.recipients;
    } else {
      userIds = [notif.recipientId];
    }

    // 3) Recoge **todos** los tokens de esos usuarios
    const tokens: string[] = [];
    for (const uid of userIds) {
      const uSnap = await db.collection('users').doc(uid).get();
      if (uSnap.exists) {
        tokens.push(...(uSnap.data().fcmTokens || []));
      }
    }
    if (!tokens.length) {
      return { executed: false, message: 'No tokens to send', data: null };
    }

    // 4) Envía en batches de 500 y limpia tokens inválidos
    let successCount = 0;
    let failureCount = 0;
    const messaging = this.firebaseService.getMessaging();

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      const resp = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: notif.title, body: notif.body },
        data: (notif.data || {}) as Record<string, string>,
      });

      successCount += resp.successCount;
      failureCount += resp.failureCount;

      // elimina tokens muertos
      resp.responses.forEach((r, idx) => {
        if (
          !r.success &&
          r.error?.code === 'messaging/invalid-registration-token'
        ) {
          db.collection('users')
            .doc(userIds[idx])
            .update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(batch[idx]),
            });
        }
      });
    }

    // 5) Guarda el resultado en la notificación
    const now = admin.firestore.Timestamp.now();
    await db
      .collection(this.col)
      .doc(id)
      .update({
        sendCount: (notif.sendCount || 0) + 1,
        lastSentAt: now,
        isSent: true,
        updatedAt: now,
      });

    return {
      executed: true,
      message: 'Notification sent',
      data: { successCount, failureCount },
    };
  }

  async remove(id: string): Promise<ApiResponse> {
    await this.firebaseService.deleteDocument(this.col, id);
    return { executed: true, message: 'Deleted', data: null };
  }

  async listUsers(): Promise<ApiResponse> {
    const db = this.firebaseService.returnFirestore();
    const snap = await db
      .collection(documents.users)
      .select('displayName', 'email')
      .get();

    const users = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));
    return { executed: true, message: '', data: users };
  }
}
