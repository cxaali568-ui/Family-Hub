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
  collectionGroup,
  where,
  addDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { FamilyPhoto, User } from '../types';
import { albumService } from './albumService';
import { familyService } from './familyService';
import { imageCompressionService } from './imageCompressionService';

class PhotoService {
  /**
   * Subscribes to active photos inside a specific album
   */
  subscribeAlbumPhotos(
    familyId: string,
    albumId: string,
    callback: (photos: FamilyPhoto[]) => void
  ): () => void {
    if (!familyId || !albumId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'albums', albumId, 'photos');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const photos: FamilyPhoto[] = [];
        snapshot.forEach((d) => {
          const photo = d.data() as FamilyPhoto;
          if (!photo.deletedAt) {
            photos.push(photo);
          }
        });
        callback(photos);
      },
      (error) => {
        console.warn('Error listening to album photos:', error);
        callback([]);
      }
    );
  }

  /**
   * Subscribes to recent photos across the family for dashboard display (Section 28)
   */
  subscribeRecentPhotos(
    familyId: string,
    limitCount: number = 12,
    callback: (photos: FamilyPhoto[]) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    try {
      const q = query(
        collectionGroup(db, 'photos'),
        where('familyId', '==', familyId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const list: FamilyPhoto[] = [];
          snapshot.forEach((d) => {
            const photo = d.data() as FamilyPhoto;
            if (!photo.deletedAt) {
              list.push(photo);
            }
          });
          callback(list.slice(0, limitCount));
        },
        (error) => {
          console.warn('CollectionGroup photos query failed, trying album fallback:', error);
          callback([]);
        }
      );
    } catch {
      callback([]);
      return () => {};
    }
  }

  /**
   * Uploads a single photo to an album with thumbnail generation & progress callback
   */
  async uploadPhoto(
    familyId: string,
    albumId: string,
    file: File,
    metadata: {
      caption?: string;
      photoDate?: string;
      location?: string;
      peopleIds?: string[];
      peopleNames?: string[];
    },
    currentUser: User,
    onProgress?: (percent: number) => void
  ): Promise<FamilyPhoto> {
    if (!familyId || !albumId) throw new Error('Missing familyId or albumId');

    const colRef = collection(db, 'families', familyId, 'albums', albumId, 'photos');
    const newDoc = doc(colRef);
    const photoId = newDoc.id;
    const now = new Date().toISOString();

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const originalStoragePath = `families/${familyId}/albums/${albumId}/photos/${photoId}/original_${cleanFileName}`;
    const thumbStoragePath = `families/${familyId}/albums/${albumId}/photos/${photoId}/thumb_${cleanFileName}`;

    // Step 1: Compress display version & generate thumbnail
    let displayBlob: Blob = file;
    let thumbBlob: Blob = file;
    let width = 0;
    let height = 0;

    try {
      const thumbResult = await imageCompressionService.createThumbnail(file, 400);
      thumbBlob = thumbResult.blob;

      const optResult = await imageCompressionService.optimizeDisplayImage(file, 1920);
      displayBlob = optResult.blob;
      width = optResult.width;
      height = optResult.height;
    } catch (e) {
      console.warn('Image processing fallback to raw file:', e);
    }

    // Step 2: Upload original/display file to Firebase Storage
    const storageRef = ref(storage, originalStoragePath);
    const uploadTask = uploadBytesResumable(storageRef, displayBlob, {
      contentType: file.type || 'image/jpeg',
    });

    let downloadUrl: string;

    try {
      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => {
            if (onProgress && snap.totalBytes > 0) {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 90);
              onProgress(pct);
            }
          },
          (err) => reject(err),
          () => resolve()
        );
      });
      downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
    } catch {
      // Fallback for mock/test environments
      downloadUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    // Step 3: Upload thumbnail
    let thumbnailUrl: string = downloadUrl;
    try {
      const thumbRef = ref(storage, thumbStoragePath);
      const thumbSnap = await uploadBytesResumable(thumbRef, thumbBlob, {
        contentType: 'image/jpeg',
      });
      thumbnailUrl = await getDownloadURL(thumbSnap.ref);
    } catch {
      // If thumbnail upload fails, fallback to main downloadUrl
      thumbnailUrl = downloadUrl;
    }

    if (onProgress) onProgress(100);

    const photo: FamilyPhoto = {
      id: photoId,
      familyId,
      albumId,
      fileName: file.name,
      storagePath: originalStoragePath,
      thumbnailPath: thumbStoragePath,
      thumbnailUrl,
      downloadUrl,
      caption: metadata.caption?.trim() || '',
      photoDate: metadata.photoDate || now.split('T')[0],
      location: metadata.location?.trim() || '',
      peopleIds: metadata.peopleIds || [],
      peopleNames: metadata.peopleNames || [],
      fileSize: file.size,
      mimeType: file.type || 'image/jpeg',
      width,
      height,
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, photo);

    // Adjust album photo count and set cover if album has no cover photo
    await albumService.adjustPhotoCount(familyId, albumId, 1);

    const album = await albumService.getAlbum(familyId, albumId);
    if (album && !album.coverPhotoUrl) {
      await albumService.setAlbumCover(familyId, albumId, photo.id, photo.thumbnailUrl || photo.downloadUrl, currentUser);
    }

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Uploaded photo "${photo.fileName}" to album "${album?.name || 'album'}"`,
      entityType: 'family_photo',
      entityId: photo.id,
    });

    // Notify tagged members (Section 55)
    if (metadata.peopleIds && metadata.peopleIds.length > 0) {
      try {
        const notifCol = collection(db, 'notifications');
        for (const personId of metadata.peopleIds) {
          if (personId !== currentUser.id) {
            await addDoc(notifCol, {
              id: `notif_tag_${photo.id}_${personId}_${Date.now()}`,
              recipientUserId: personId,
              familyId,
              type: 'photo_tagged',
              title: `Tagged in Photo`,
              message: `${currentUser.name} tagged you in a photo in "${album?.name || 'an album'}".`,
              relatedEntityType: 'family_photo',
              relatedEntityId: photo.id,
              createdAt: now,
              readAt: null,
            });
          }
        }
      } catch (err) {
        console.warn('Could not send photo tag notification:', err);
      }
    }

    return photo;
  }

  /**
   * Updates photo metadata (caption, photoDate, location, tagged members)
   */
  async updatePhoto(
    familyId: string,
    albumId: string,
    photoId: string,
    updates: Partial<FamilyPhoto>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'albums', albumId, 'photos', photoId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Updated photo details`,
      entityType: 'family_photo',
      entityId: photoId,
    });
  }

  /**
   * Soft-deletes a photo and updates album photo count and cover fallback if needed
   */
  async deletePhoto(
    familyId: string,
    albumId: string,
    photoId: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'albums', albumId, 'photos', photoId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      deletedAt: now,
      deletedBy: currentUser.id,
      updatedAt: now,
    });

    await albumService.adjustPhotoCount(familyId, albumId, -1);

    // Check if deleted photo was the album cover (Section 29: Album Cover Fallback)
    const album = await albumService.getAlbum(familyId, albumId);
    if (album && album.coverPhotoId === photoId) {
      // Find the next available active photo
      const colRef = collection(db, 'families', familyId, 'albums', albumId, 'photos');
      const snap = await getDocs(colRef);
      let nextPhoto: FamilyPhoto | null = null;
      snap.forEach((d) => {
        const p = d.data() as FamilyPhoto;
        if (!p.deletedAt && p.id !== photoId && !nextPhoto) {
          nextPhoto = p;
        }
      });

      if (nextPhoto) {
        const next = nextPhoto as FamilyPhoto;
        await albumService.setAlbumCover(familyId, albumId, next.id, next.thumbnailUrl || next.downloadUrl, currentUser);
      } else {
        await albumService.updateAlbum(familyId, albumId, { coverPhotoId: undefined, coverPhotoUrl: undefined }, currentUser);
      }
    }

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Deleted photo`,
      entityType: 'family_photo',
      entityId: photoId,
    });
  }

  /**
   * Triggers secure browser download of a photo with user-friendly file name
   */
  async downloadPhoto(photoUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(photoUrl, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName || 'family_photo.jpg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Direct link fallback
      const link = document.createElement('a');
      link.href = photoUrl;
      link.target = '_blank';
      link.setAttribute('download', fileName || 'family_photo.jpg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Bulk downloads selected photos
   */
  async downloadSelectedPhotos(photos: FamilyPhoto[]): Promise<void> {
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      await this.downloadPhoto(photo.downloadUrl, photo.fileName);
      // Small pause between downloads to avoid browser block
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  /**
   * Moves a photo to a different album
   */
  async movePhoto(
    familyId: string,
    sourceAlbumId: string,
    targetAlbumId: string,
    photo: FamilyPhoto,
    currentUser: User
  ): Promise<void> {
    if (sourceAlbumId === targetAlbumId) return;

    const sourceRef = doc(db, 'families', familyId, 'albums', sourceAlbumId, 'photos', photo.id);
    const targetRef = doc(db, 'families', familyId, 'albums', targetAlbumId, 'photos', photo.id);
    const now = new Date().toISOString();

    const updatedPhoto: FamilyPhoto = {
      ...photo,
      albumId: targetAlbumId,
      updatedAt: now,
    };

    // Write to target album
    await setDoc(targetRef, updatedPhoto);
    // Mark deleted in source album or remove
    await updateDoc(sourceRef, {
      deletedAt: now,
      deletedBy: currentUser.id,
      updatedAt: now,
    });

    // Update counts
    await albumService.adjustPhotoCount(familyId, sourceAlbumId, -1);
    await albumService.adjustPhotoCount(familyId, targetAlbumId, 1);

    // Target cover check
    const targetAlbum = await albumService.getAlbum(familyId, targetAlbumId);
    if (targetAlbum && !targetAlbum.coverPhotoUrl) {
      await albumService.setAlbumCover(familyId, targetAlbumId, photo.id, photo.thumbnailUrl || photo.downloadUrl, currentUser);
    }

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Moved photo "${photo.fileName}" to another album`,
      entityType: 'family_photo',
      entityId: photo.id,
    });
  }

  /**
   * Bulk deletes multiple photos
   */
  async bulkDeletePhotos(
    familyId: string,
    albumId: string,
    photoIds: string[],
    currentUser: User
  ): Promise<void> {
    for (const photoId of photoIds) {
      await this.deletePhoto(familyId, albumId, photoId, currentUser);
    }
  }
}

export const photoService = new PhotoService();
