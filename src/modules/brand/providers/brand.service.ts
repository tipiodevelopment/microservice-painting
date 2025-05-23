import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { documents } from 'src/utils/enums/documents.enum';

@Injectable()
export class BrandService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async healthCheck() {
    return { executed: true, message: 'OK', microservice: 'Painting' };
  }

  async getBrands() {
    const firestore = this.firebaseService.returnFirestore();
    const brandsRef = firestore.collection(documents.brands);
    const brandsSnapshot = await brandsRef.get();
    const brands = brandsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const paintsSnapshot = await firestore.collectionGroup('paints').get();
    const brandPaintCountMap: Record<string, number> = {};
    paintsSnapshot.forEach((doc) => {
      const brandId = doc.ref.parent.parent?.id;
      if (!brandId) return;

      if (!brandPaintCountMap[brandId]) {
        brandPaintCountMap[brandId] = 0;
      }
      brandPaintCountMap[brandId]++;
    });
    const brandsWithPaintCount = brands.map((brand) => {
      const paintCount = brandPaintCountMap[brand.id] ?? 0;
      return {
        ...brand,
        paintCount,
      };
    });

    return brandsWithPaintCount;
  }
}
