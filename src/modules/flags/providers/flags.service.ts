import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../../modules/firebase/firebase.service';

const PATH_GUEST = `flags/guest`;

@Injectable()
export class FlagsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async GetGuestLogic(): Promise<{ value: boolean }> {
    const firestore = this.firebaseService.returnFirestore();
    const flagsSnap = await firestore.doc(PATH_GUEST).get();
    return { value: flagsSnap.data().apply_is_guest_logic };
  }

  async SetGuestLogic(value: boolean): Promise<{
    executed: boolean;
    message: string;
  }> {
    const firestore = this.firebaseService.returnFirestore();
    try {
      await firestore.doc(PATH_GUEST).update({
        apply_is_guest_logic: value,
      });
      return { executed: true, message: '' };
    } catch (error) {
      return {
        executed: false,
        message: error.message,
      };
    }
  }
}
