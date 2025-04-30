import { Injectable } from '@nestjs/common';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { ConfigService } from '../../config/providers/config.service';
import { Configuration } from '../../config/utils/config.keys';
import { ApiResponse } from '../../utils/interfaces';
import { v1 as firestoreAdmin } from '@google-cloud/firestore';

@Injectable()
export class FirebaseService {
  private firebaseApp: admin.app.App;
  private firestore: admin.firestore.Firestore;

  constructor(private readonly _configService: ConfigService) {
    if (!admin.apps.length) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(this._configService.get(Configuration.FIREBASE_JSON)),
        ),
      });
      console.log('Firebase App initialized');
    } else {
      this.firebaseApp = admin.app();
      console.log('Firebase App reused');
    }

    const dbId = this._configService.get(Configuration.FIRESTORE_DB_ID);

    this.firestore = dbId
      ? getFirestore(this.firebaseApp, dbId)
      : getFirestore(this.firebaseApp);

    console.log(`Using Firestore DB: ${dbId || '(default)'}`);
  }

  returnFirestore() {
    return this.firestore;
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return await this.firebaseApp.auth().verifyIdToken(token);
  }

  async verifyEmail(email: string): Promise<boolean> {
    try {
      await this.firebaseApp.auth().getUserByEmail(email);
      return true;
    } catch {
      return false;
    }
  }

  async createUser(
    email: string,
    password: string,
    username: string,
  ): Promise<ApiResponse> {
    console.log(
      `[firebaseService.createUser] email:${email} password:${password} username:${username}`,
    );

    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const existingUser = await this.verifyEmail(email);
      if (existingUser) {
        throw new Error(
          `An account with this email address is already registered.`,
        );
      }

      const userRecord = await this.firebaseApp.auth().createUser({
        email,
        password,
        displayName: username,
      });

      response.data = userRecord;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async signInWithGoogle(idToken) {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(idToken);
      const { uid, email, name } = decodedToken;

      await this.firebaseApp.auth().createUser({
        email,
        displayName: name,
      });

      response.data = { uid, email, name };
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getCollection(collectionName: string): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const firebaseResponse = await this.firestore
        .collection(collectionName)
        .get();
      const documents = firebaseResponse.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      response.data = documents;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getDocumentById(
    collectionName: string,
    docId: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const doc = await this.firestore
        .collection(collectionName)
        .doc(docId)
        .get();
      response.data = doc.exists ? doc.data() : null;
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getDocumentsByIds(
    collectionName: string,
    ids: any[],
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const querySnapshot = await this.firestore
        .collection(collectionName)
        .where(admin.firestore.FieldPath.documentId(), 'in', ids)
        .get();

      if (!querySnapshot.empty) {
        response.data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } else {
        response.data = [];
      }
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getDocumentByProperty(
    collectionName: string,
    fieldName: string,
    value: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const querySnapshot = await this.firestore
        .collection(collectionName)
        .where(fieldName, '==', value)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        response.data = querySnapshot.docs[0].data();
      } else {
        throw new Error('No User found');
      }
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async getDocumentsByProperty(
    collectionName: string,
    fieldName: string,
    value: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      const querySnapshot = await this.firestore
        .collection(collectionName)
        .where(fieldName, '==', value)
        .orderBy(fieldName)
        .get();

      if (!querySnapshot.empty) {
        response.data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } else {
        throw new Error('No User found');
      }
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async setOrAddDocument(
    collectionName: string,
    data: any,
    docId?: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      let firebaseResponse;
      if (docId) {
        firebaseResponse = await this.firestore
          .collection(collectionName)
          .doc(docId)
          .set(data, { merge: true });
        response.data = firebaseResponse;
      } else {
        firebaseResponse = await this.firestore
          .collection(collectionName)
          .add(data);
        response.data = firebaseResponse;
      }
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async deleteDocument(
    collectionName: string,
    docId: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      await this.firestore.collection(collectionName).doc(docId).delete();
    } catch (error) {
      response.message = error.message;
      response.executed = false;
    } finally {
      return response;
    }
  }

  async createCustomToken(uid: string): Promise<string> {
    return await this.firebaseApp.auth().createCustomToken(uid);
  }

  async sendMulticastNotification(
    tokens: string[],
    notification: { title: string; body: string },
  ): Promise<ApiResponse> {
    const response: ApiResponse = {
      executed: true,
      message: '',
      data: null,
    };

    try {
      if (!tokens.length) {
        response.message = 'No tokens provided for push notification.';
        return response;
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        tokens,
      };

      const batchResponse = await this.firebaseApp
        .messaging()
        .sendEachForMulticast(message);

      response.data = {
        successCount: batchResponse.successCount,
        failureCount: batchResponse.failureCount,
        responses: batchResponse.responses.map((r) => ({
          success: r.success,
          error: r.error?.message,
        })),
      };

      console.log(
        `✅ Push notification sent: ${batchResponse.successCount} success, ${batchResponse.failureCount} failures.`,
      );
    } catch (error) {
      console.error('⚠️ Error sending push notification:', error.message);
      response.executed = false;
      response.message = error.message;
    } finally {
      return response;
    }
  }

  async copyCollectionBetweenDatabases(
    collectionPath: string,
    sourceDbId: string,
    targetDbId: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: null };
    try {
      // Instancias de Firestore para cada databaseId
      const srcFs = getFirestore(this.firebaseApp, sourceDbId || '(default)');
      const dstFs = getFirestore(this.firebaseApp, targetDbId || '(default)');
      // Llamada recursiva
      await this.copyCollectionRecursive(
        srcFs,
        dstFs,
        collectionPath,
        collectionPath,
      );
    } catch (err) {
      response.executed = false;
      response.message = err.message;
    }
    return response;
  }

  private async copyCollectionRecursive(
    srcFs: admin.firestore.Firestore,
    dstFs: admin.firestore.Firestore,
    srcPath: string,
    dstPath: string,
  ): Promise<void> {
    const snapshot = await srcFs.collection(srcPath).get();

    for (const docSnap of snapshot.docs) {
      // 1) Copia el documento
      const data = docSnap.data();
      const dstDocRef = dstFs.doc(`${dstPath}/${docSnap.id}`);
      await dstDocRef.set(data);

      // 2) Busca sub-colecciones y recórrelas
      const subcols = await docSnap.ref.listCollections();
      for (const subcol of subcols) {
        await this.copyCollectionRecursive(
          srcFs,
          dstFs,
          `${srcPath}/${docSnap.id}/${subcol.id}`,
          `${dstPath}/${docSnap.id}/${subcol.id}`,
        );
      }
    }
  }

  async listCompositeIndexes(
    databaseId: string, // p.ej. 'default' o 'qa-paints'
  ): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: null };

    try {
      // 1) Carga credenciales desde tu FIREBASE_JSON
      const firebaseJson = this._configService.get(Configuration.FIREBASE_JSON);
      const creds = JSON.parse(firebaseJson) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };
      const projectId = creds.project_id;

      // 2) Inicializa el cliente de Admin API CON tus credenciales
      const adminClient = new firestoreAdmin.FirestoreAdminClient({
        projectId,
        credentials: {
          client_email: creds.client_email,
          private_key: creds.private_key,
        },
      });

      // 3) Ruta para listar todos los collectionGroups
      const parent = `projects/${projectId}/databases/${databaseId}/collectionGroups/-`;

      // 4) Obtén la lista de índices compuestos
      const [indexes] = await adminClient.listIndexes({ parent });

      // 5) Mapea y devuelve solo la configuración relevante
      response.data = indexes.map((idx) => {
        const { ...config } = idx;
        return config;
      });
    } catch (err: any) {
      response.executed = false;
      response.message = err.message;
    }

    return response;
  }

  async copyIndexesBetweenDatabases(
    sourceDbId: string,
    targetDbId: string,
  ): Promise<ApiResponse> {
    const response: ApiResponse = { executed: true, message: '', data: null };

    try {
      // 1) Leer y parsear credenciales desde FIREBASE_JSON
      const firebaseJson = this._configService.get(Configuration.FIREBASE_JSON);
      const {
        project_id: projectId,
        client_email,
        private_key,
      } = JSON.parse(firebaseJson) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };

      // 2) Cliente Admin API con credenciales
      const adminClient = new firestoreAdmin.FirestoreAdminClient({
        projectId,
        credentials: { client_email, private_key },
      });

      // 3) Rutas parent
      const sourceParent = `projects/${projectId}/databases/${sourceDbId}/collectionGroups/-`;
      const targetParent = `projects/${projectId}/databases/${targetDbId}/collectionGroups/-`;

      // 4) Listar índices en ORIGEN y DESTINO
      const [sourceIndexes] = await adminClient.listIndexes({
        parent: sourceParent,
      });
      const [targetIndexes] = await adminClient.listIndexes({
        parent: targetParent,
      });

      // 5) Construir un set de “firmas” de los índices ya existentes
      const existingSignatures = new Set<string>(
        targetIndexes.map((idx) => {
          const sigFields = idx.fields
            .map((f) => `${f.fieldPath}:${f.order}`)
            .join(',');
          return `${idx.queryScope}|${sigFields}`;
        }),
      );

      // 6) Recrear solo los índices que no existan
      for (const idx of sourceIndexes) {
        const { ...config } = idx;
        const sigFields = idx.fields
          .map((f) => `${f.fieldPath}:${f.order}`)
          .join(',');
        const signature = `${idx.queryScope}|${sigFields}`;

        if (existingSignatures.has(signature)) {
          // ya existe, omitimos
          continue;
        }

        try {
          await adminClient.createIndex({
            parent: targetParent,
            index: config,
          });
        } catch (err: any) {
          // si ya existe entre el list y el create, ignoramos
          if (err.code === 6 /* ALREADY_EXISTS */) continue;
          throw err;
        }
      }
    } catch (err: any) {
      response.executed = false;
      response.message = err.message;
    }

    return response;
  }
}
