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

    // Mapeo inicial de todos los brands
    const brands = brandsSnapshot.docs.map((doc) => ({
      id: doc.id,
      active: true,
      ...doc.data(),
    }));

    // Cuento de paints por brand
    const paintsSnapshot = await firestore.collectionGroup('paints').get();
    const brandPaintCountMap: Record<string, number> = {};
    paintsSnapshot.forEach((doc) => {
      const brandId = doc.ref.parent.parent?.id;
      if (!brandId) return;
      brandPaintCountMap[brandId] = (brandPaintCountMap[brandId] || 0) + 1;
    });

    // Filtramos out aquellos brands con active === false
    const activeBrands = brands.filter((brand) => brand?.active !== false);

    // Añadimos paintCount y devolvemos
    const brandsWithPaintCount = activeBrands.map((brand) => ({
      ...brand,
      paintCount: brandPaintCountMap[brand.id] ?? 0,
    }));

    return brandsWithPaintCount;
  }
}
