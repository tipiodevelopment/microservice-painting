import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '../../config/providers/config.service';
import { Configuration } from '../../config/utils/config.keys';

@Injectable()
export class FirebaseService {
  private firebaseApp: admin.app.App;

  constructor(private readonly _configService: ConfigService) {
    if (!admin.apps.length) {
      // const firebaseConfig = {
      //   apiKey: this._configService.get(Configuration.FIREBASE_APIKEY),
      //   authDomain: this._configService.get(Configuration.FIREBASE_AUTHDOMAIN),
      //   projectId: this._configService.get(Configuration.FIREBASE_PROJECTID),
      //   storageBucket: this._configService.get(
      //     Configuration.FIREBASE_STORAGEBUCKET,
      //   ),
      //   messagingSenderId: this._configService.get(
      //     Configuration.FIREBASE_MESSAGINGSENDERID,
      //   ),
      //   appId: this._configService.get(Configuration.FIREBASE_APPID),
      //   measurementId: this._configService.get(
      //     Configuration.FIREBASE_MEASUREMENTID,
      //   ),
      // };
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
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return await this.firebaseApp.auth().verifyIdToken(token);
  }
}
