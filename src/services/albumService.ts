import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PhotoAlbum, AlbumCategory, User } from '../types';
import { familyService } from './familyService';

export const DEFAULT_ALBUM_CATEGORIES: AlbumCategory[] = [
  'Family',
  'Events',
  'Travel',
  'Birthdays',
  'School',
  'Kids',
  'Holidays',
  'Memories',
  'Other',
];

class AlbumService {
  /**
   * Subscribes to real-time albums for a family
   */
  subscribeAlbums(
    familyId: string,
    callback: (albums: PhotoAlbum[]) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'albums');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const albums: PhotoAlbum[] = [];
        snapshot.forEach((d) => {
          const album = d.data() as PhotoAlbum;
          if (!album.deletedAt) {
            albums.push(album);
          }
        });
        callback(albums);
      },
      (error) => {
        console.warn('Error listening to photo albums:', error);
        callback([]);
      }
    );
  }

  /**
   * Gets a single album by ID
   */
  async getAlbum(familyId: string, albumId: string): Promise<PhotoAlbum | null> {
    if (!familyId || !albumId) return null;
    const docRef = doc(db, 'families', familyId, 'albums', albumId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const album = snap.data() as PhotoAlbum;
    if (album.deletedAt) return null;
    return album;
  }

  /**
   * Creates a new photo album
   */
  async createAlbum(
    familyId: string,
    data: {
      name: string;
      description?: string;
      category?: AlbumCategory | string;
      albumDate?: string;
      location?: string;
      restrictedMemberIds?: string[];
    },
    currentUser: User
  ): Promise<PhotoAlbum> {
    if (!familyId) throw new Error('Missing familyId');
    if (!data.name.trim()) throw new Error('Album name is required');

    const colRef = collection(db, 'families', familyId, 'albums');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const album: PhotoAlbum = {
      id: newDoc.id,
      familyId,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      category: data.category || 'Family',
      albumDate: data.albumDate || now.split('T')[0],
      location: data.location?.trim() || '',
      coverPhotoId: undefined,
      coverPhotoUrl: undefined,
      isArchived: false,
      photoCount: 0,
      restrictedMemberIds: data.restrictedMemberIds || undefined,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, album);

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Created album: "${album.name}"`,
      entityType: 'photo_album',
      entityId: album.id,
    });

    return album;
  }

  /**
   * Updates an existing album
   */
  async updateAlbum(
    familyId: string,
    albumId: string,
    updates: Partial<PhotoAlbum>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'albums', albumId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Updated album "${updates.name || 'details'}"`,
      entityType: 'photo_album',
      entityId: albumId,
    });
  }

  /**
   * Sets the album cover photo
   */
  async setAlbumCover(
    familyId: string,
    albumId: string,
    photoId: string,
    photoUrl: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'albums', albumId);
    await updateDoc(docRef, {
      coverPhotoId: photoId,
      coverPhotoUrl: photoUrl,
      updatedAt: new Date().toISOString(),
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Set new cover photo for album`,
      entityType: 'photo_album',
      entityId: albumId,
    });
  }

  /**
   * Toggles archive status for an album
   */
  async toggleArchiveAlbum(
    familyId: string,
    albumId: string,
    currentArchived: boolean,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'albums', albumId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      isArchived: !currentArchived,
      archivedAt: !currentArchived ? now : null,
      archivedBy: !currentArchived ? currentUser.id : null,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `${!currentArchived ? 'Archived' : 'Unarchived'} album`,
      entityType: 'photo_album',
      entityId: albumId,
    });
  }

  /**
   * Soft-deletes an album
   */
  async softDeleteAlbum(
    familyId: string,
    albumId: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'albums', albumId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      deletedAt: now,
      deletedBy: currentUser.id,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Deleted album`,
      entityType: 'photo_album',
      entityId: albumId,
    });
  }

  /**
   * Updates photo count for an album
   */
  async adjustPhotoCount(
    familyId: string,
    albumId: string,
    delta: number
  ): Promise<void> {
    try {
      const docRef = doc(db, 'families', familyId, 'albums', albumId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      const album = snap.data() as PhotoAlbum;
      const newCount = Math.max(0, (album.photoCount || 0) + delta);
      await updateDoc(docRef, {
        photoCount: newCount,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not adjust photo count:', err);
    }
  }
}

export const albumService = new AlbumService();
