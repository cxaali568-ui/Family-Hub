import React, { useState, useEffect, useCallback } from 'react';
import {
  FamilyPhoto,
  PhotoAlbum,
  User,
  FamilyMemberProfile,
} from '../../types';
import { photoService } from '../../services/photoService';
import { photoFavoriteService } from '../../services/photoFavoriteService';
import { albumService } from '../../services/albumService';
import { Button } from '../ui/Button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Trash2,
  Calendar,
  MapPin,
  Users,
  Image as ImageIcon,
  FolderInput,
  Check,
  Edit2,
  AlertTriangle,
} from 'lucide-react';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: FamilyPhoto[];
  initialPhotoId?: string;
  albums: PhotoAlbum[];
  currentAlbumId?: string;
  currentUser: User;
  familyId: string;
  members: FamilyMemberProfile[];
  favoritePhotoIds: string[];
  onFavoriteToggled: (photoId: string, isFav: boolean) => void;
  onPhotoDeleted: (photoId: string) => void;
  onPhotoUpdated: (photo: FamilyPhoto) => void;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photos,
  initialPhotoId,
  albums,
  currentAlbumId,
  currentUser,
  familyId,
  members,
  favoritePhotoIds,
  onFavoriteToggled,
  onPhotoDeleted,
  onPhotoUpdated,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  // Sync initial index
  useEffect(() => {
    if (initialPhotoId && photos.length > 0) {
      const idx = photos.findIndex((p) => p.id === initialPhotoId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [initialPhotoId, photos]);

  const currentPhoto = photos[currentIndex];
  const isFavorite = currentPhoto
    ? favoritePhotoIds.includes(currentPhoto.id)
    : false;

  useEffect(() => {
    if (currentPhoto) {
      setEditedCaption(currentPhoto.caption || '');
      setIsEditingCaption(false);
      setConfirmDelete(false);
      setShowMoveDropdown(false);
    }
  }, [currentPhoto?.id]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // loop
    }
  }, [currentIndex, photos.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(photos.length - 1); // loop
    }
  }, [currentIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !currentPhoto) return null;

  const currentAlbum = albums.find(
    (a) => a.id === (currentPhoto.albumId || currentAlbumId)
  );

  const handleToggleFavorite = async () => {
    const nextState = !isFavorite;
    onFavoriteToggled(currentPhoto.id, nextState);
    try {
      await photoFavoriteService.toggleFavorite(
        familyId,
        currentUser.id,
        currentPhoto.id,
        isFavorite
      );
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // rollback
      onFavoriteToggled(currentPhoto.id, isFavorite);
    }
  };

  const handleSaveCaption = async () => {
    if (!currentPhoto) return;
    setActionLoading(true);
    try {
      const albumId = currentPhoto.albumId || currentAlbumId || '';
      await photoService.updatePhoto(
        familyId,
        albumId,
        currentPhoto.id,
        { caption: editedCaption.trim() },
        currentUser
      );
      const updated = { ...currentPhoto, caption: editedCaption.trim() };
      onPhotoUpdated(updated);
      setIsEditingCaption(false);
    } catch (err) {
      console.error('Error updating caption:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetCover = async () => {
    if (!currentPhoto) return;
    const albumId = currentPhoto.albumId || currentAlbumId;
    if (!albumId) return;

    setActionLoading(true);
    try {
      await albumService.setAlbumCover(
        familyId,
        albumId,
        currentPhoto.id,
        currentPhoto.thumbnailUrl || currentPhoto.downloadUrl,
        currentUser
      );
      setShowSuccessToast('Set as album cover!');
      setTimeout(() => setShowSuccessToast(null), 2500);
    } catch (err) {
      console.error('Error setting album cover:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveToAlbum = async (targetAlbumId: string) => {
    if (!currentPhoto) return;
    const sourceAlbumId = currentPhoto.albumId || currentAlbumId;
    if (!sourceAlbumId || sourceAlbumId === targetAlbumId) return;

    setActionLoading(true);
    try {
      await photoService.movePhoto(
        familyId,
        sourceAlbumId,
        targetAlbumId,
        currentPhoto,
        currentUser
      );
      setShowMoveDropdown(false);
      setShowSuccessToast('Moved to album!');
      setTimeout(() => setShowSuccessToast(null), 2500);
      onPhotoUpdated({ ...currentPhoto, albumId: targetAlbumId });
    } catch (err) {
      console.error('Error moving photo:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!currentPhoto) return;
    const albumId = currentPhoto.albumId || currentAlbumId;
    if (!albumId) return;

    setActionLoading(true);
    try {
      await photoService.deletePhoto(
        familyId,
        albumId,
        currentPhoto.id,
        currentUser
      );
      onPhotoDeleted(currentPhoto.id);
      if (photos.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
    } finally {
      setActionLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleDownload = () => {
    photoService.downloadPhoto(currentPhoto.downloadUrl, currentPhoto.fileName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-all select-none">
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />
          {showSuccessToast}
        </div>
      )}

      {/* Top Header / Bar */}
      <div className="absolute top-0 inset-x-0 h-16 px-4 md:px-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-40">
        <div className="flex items-center gap-3 text-white">
          <span className="text-xs font-mono font-medium text-slate-400">
            {currentIndex + 1} / {photos.length}
          </span>
          {currentAlbum && (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-200 border border-white/10">
              {currentAlbum.name}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-white">
          {/* Favorite */}
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-rose-500/20 text-rose-500'
                : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Download photo"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Set cover */}
          {currentAlbum && (
            <button
              onClick={handleSetCover}
              disabled={actionLoading}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Set as album cover"
            >
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              Make Cover
            </button>
          )}

          {/* Move to another album */}
          {albums.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowMoveDropdown((prev) => !prev)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                title="Move photo"
              >
                <FolderInput className="w-4 h-4 text-amber-400" />
                Move
              </button>

              {showMoveDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-left">
                  <p className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Move to Album:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {albums
                      .filter((a) => a.id !== currentPhoto.albumId)
                      .map((alb) => (
                        <button
                          key={alb.id}
                          onClick={() => handleMoveToAlbum(alb.id)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:bg-indigo-600 rounded-lg transition-colors truncate"
                        >
                          {alb.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Delete photo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-700 px-2 py-1 rounded-xl">
              <span className="text-[11px] text-rose-300 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Delete?
              </span>
              <button
                onClick={handleDeletePhoto}
                disabled={actionLoading}
                className="text-[11px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-slate-300 hover:text-white px-1 cursor-pointer"
              >
                No
              </button>
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer ml-2"
            title="Close viewer (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Viewer */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-14">
        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 md:left-6 z-40 p-2.5 md:p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-sm border border-white/10 transition-colors cursor-pointer"
            title="Previous (Left arrow)"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        )}

        {/* Active Photo */}
        <div className="max-w-full max-h-full flex items-center justify-center">
          <img
            src={currentPhoto.downloadUrl}
            alt={currentPhoto.caption || currentPhoto.fileName}
            className="max-h-[75vh] md:max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform"
          />
        </div>

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 md:right-6 z-40 p-2.5 md:p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/80 hover:text-white backdrop-blur-sm border border-white/10 transition-colors cursor-pointer"
            title="Next (Right arrow)"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        )}
      </div>

      {/* Bottom Info Bar / Metadata Panel */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 md:px-8 md:pb-6 z-40 text-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-3">
          {/* Caption & Metadata */}
          <div className="space-y-1.5 flex-1">
            {!isEditingCaption ? (
              <div className="flex items-center gap-2 group">
                <p className="text-sm md:text-base font-semibold text-slate-100">
                  {currentPhoto.caption || (
                    <span className="italic text-slate-400 font-normal">
                      No caption added
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setIsEditingCaption(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity text-slate-400 hover:text-white cursor-pointer"
                  title="Edit caption"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  value={editedCaption}
                  onChange={(e) => setEditedCaption(e.target.value)}
                  placeholder="Enter caption..."
                  className="w-full px-3 py-1 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveCaption}
                  disabled={actionLoading}
                  className="text-xs py-1 px-2.5"
                >
                  Save
                </Button>
                <button
                  onClick={() => setIsEditingCaption(false)}
                  className="text-xs text-slate-400 hover:text-white px-1 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Badges: Date, Location, People */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              {currentPhoto.photoDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {currentPhoto.photoDate}
                </span>
              )}

              {currentPhoto.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {currentPhoto.location}
                </span>
              )}

              {currentPhoto.uploadedByName && (
                <span className="text-slate-400">
                  Added by{' '}
                  <strong className="text-slate-200">
                    {currentPhoto.uploadedByName}
                  </strong>
                </span>
              )}
            </div>

            {/* Tagged people pills */}
            {currentPhoto.peopleNames && currentPhoto.peopleNames.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {currentPhoto.peopleNames.map((name, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-slate-200 border border-white/10"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
