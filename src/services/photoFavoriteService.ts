import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PhotoFavorite } from '../types';

class PhotoFavoriteService {
  /**
   * Subscribes to the authenticated user's private favorites in real-time
   */
  subscribeUserFavorites(
    familyId: string,
    userId: string,
    callback: (favoritePhotoIds: string[]) => void
  ): () => void {
    if (!familyId || !userId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'photoFavorites');
    const q = query(colRef, where('userId', '==', userId));

    return onSnapshot(
      q,
      (snapshot) => {
        const photoIds: string[] = [];
        snapshot.forEach((d) => {
          const fav = d.data() as PhotoFavorite;
          if (fav.photoId) photoIds.push(fav.photoId);
        });
        callback(photoIds);
      },
      (error) => {
        console.warn('Error reading photo favorites:', error);
        callback([]);
      }
    );
  }

  /**
   * Toggles a photo favorite for the current user
   */
  async toggleFavorite(
    familyId: string,
    userId: string,
    photoId: string,
    currentlyFavorite: boolean
  ): Promise<boolean> {
    if (!familyId || !userId || !photoId) return currentlyFavorite;

    const favoriteId = `${userId}_${photoId}`;
    const docRef = doc(db, 'families', familyId, 'photoFavorites', favoriteId);

    if (currentlyFavorite) {
      await deleteDoc(docRef);
      return false;
    } else {
      const fav: PhotoFavorite = {
        id: favoriteId,
        familyId,
        userId,
        photoId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, fav);
      return true;
    }
  }
}

export const photoFavoriteService = new PhotoFavoriteService();
