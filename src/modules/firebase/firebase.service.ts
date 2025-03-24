import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '../../config/providers/config.service';
import { Configuration } from '../../config/utils/config.keys';
import { ApiResponse } from '../../utils/interfaces';

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
      console.log('Firebase Start');
    } else {
      this.firebaseApp = admin.app();
      console.log('Firebase Started');
    }
    this.firestore = this.firebaseApp.firestore();
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
}
