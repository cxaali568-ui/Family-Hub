import React, { useState, useEffect } from 'react';
import {
  PhotoAlbum,
  FamilyPhoto,
  User,
  FamilyMemberProfile,
} from '../../types';
import { photoService } from '../../services/photoService';
import { photoFavoriteService } from '../../services/photoFavoriteService';
import { albumService } from '../../services/albumService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { UploadPhotosModal } from './UploadPhotosModal';
import { EditAlbumModal } from './EditAlbumModal';
import { PhotoLightboxModal } from './PhotoLightboxModal';
import {
  ArrowLeft,
  Upload,
  FolderEdit,
  Calendar,
  MapPin,
  Tag,
  Shield,
  Heart,
  CheckSquare,
  Square,
  Download,
  Trash2,
  Image as ImageIcon,
  Share2,
  Search,
  Filter,
} from 'lucide-react';

interface AlbumDetailViewProps {
  album: PhotoAlbum;
  onBack: () => void;
  currentUser: User;
  familyId: string;
  members: FamilyMemberProfile[];
  albums: PhotoAlbum[];
  favoritePhotoIds: string[];
  onFavoriteToggled: (photoId: string, isFav: boolean) => void;
  onAlbumUpdated: (album: PhotoAlbum) => void;
  onAlbumDeleted: (albumId: string) => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({
  album: initialAlbum,
  onBack,
  currentUser,
  familyId,
  members,
  albums,
  favoritePhotoIds,
  onFavoriteToggled,
  onAlbumUpdated,
  onAlbumDeleted,
}) => {
  const [album, setAlbum] = useState<PhotoAlbum>(initialAlbum);
  const [photos, setPhotos] = useState<FamilyPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & View States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Multi-select mode
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  useEffect(() => {
    setAlbum(initialAlbum);
  }, [initialAlbum]);

  // Subscribe to album's photos
  useEffect(() => {
    setLoading(true);
    const unsubscribe = photoService.subscribeAlbumPhotos(
      familyId,
      album.id,
      (loaded) => {
        setPhotos(loaded);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [familyId, album.id]);

  // Filtered photos
  const filteredPhotos = photos.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCaption = p.caption?.toLowerCase().includes(q);
      const matchLocation = p.location?.toLowerCase().includes(q);
      const matchFileName = p.fileName.toLowerCase().includes(q);
      const matchPeople = p.peopleNames?.some((n) => n.toLowerCase().includes(q));
      if (!matchCaption && !matchLocation && !matchFileName && !matchPeople) {
        return false;
      }
    }

    if (selectedTag !== 'all') {
      if (!p.peopleNames?.includes(selectedTag)) return false;
    }

    return true;
  });

  // Unique tagged people in this album for quick filters
  const uniquePeople = Array.from(
    new Set(photos.flatMap((p) => p.peopleNames || []))
  );

  const toggleSelectPhoto = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPhotoIds.length === filteredPhotos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(filteredPhotos.map((p) => p.id));
    }
  };

  const handleBatchDownload = async () => {
    const selected = photos.filter((p) => selectedPhotoIds.includes(p.id));
    if (selected.length === 0) return;
    setBatchActionLoading(true);
    try {
      await photoService.downloadSelectedPhotos(selected);
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedPhotoIds.length} selected photos?`
      )
    ) {
      return;
    }
    setBatchActionLoading(true);
    try {
      await photoService.bulkDeletePhotos(
        familyId,
        album.id,
        selectedPhotoIds,
        currentUser
      );
      setSelectedPhotoIds([]);
      setMultiSelectMode(false);
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handlePhotoDeleted = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handlePhotoUpdated = (updated: FamilyPhoto) => {
    setPhotos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Photo Albums
        </button>

        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMultiSelectMode((prev) => !prev);
                setSelectedPhotoIds([]);
              }}
              className="text-xs"
            >
              {multiSelectMode ? 'Cancel Selection' : 'Select Photos'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <FolderEdit className="w-3.5 h-3.5" />
            Edit Album
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Album Header Banner Card */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {album.category || 'Family'}
              </span>

              {album.albumDate && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {album.albumDate}
                </span>
              )}

              {album.location && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {album.location}
                </span>
              )}

              {album.restrictedMemberIds && album.restrictedMemberIds.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-500" />
                  Restricted
                </span>
              )}

              {album.isArchived && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                  Archived
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {album.name}
            </h1>

            {album.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {album.description}
              </p>
            )}

            <p className="text-xs text-slate-500">
              Created by {album.createdByName || 'Family Member'} •{' '}
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </p>
          </div>

          {/* Quick upload trigger box in header */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-2 cursor-pointer font-semibold text-xs shadow-xs"
            >
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Add Photos Here</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Album Filters & Search Bar */}
      {photos.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this album..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter by tagged people */}
          {uniquePeople.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              <span className="text-xs font-semibold text-slate-500 shrink-0">
                People:
              </span>
              <button
                onClick={() => setSelectedTag('all')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer shrink-0 ${
                  selectedTag === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                All
              </button>
              {uniquePeople.map((person) => (
                <button
                  key={person}
                  onClick={() => setSelectedTag(person)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer shrink-0 ${
                    selectedTag === person
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {person}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-Select Floating Bar */}
      {multiSelectMode && (
        <div className="sticky top-4 z-30 p-3 bg-indigo-900 text-white rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold hover:text-indigo-200 cursor-pointer"
            >
              {selectedPhotoIds.length === filteredPhotos.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-300" />
              ) : (
                <Square className="w-4 h-4 text-indigo-300" />
              )}
              {selectedPhotoIds.length === filteredPhotos.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
            <span className="text-xs font-medium text-indigo-200">
              {selectedPhotoIds.length} of {filteredPhotos.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedPhotoIds.length === 0 || batchActionLoading}
              onClick={handleBatchDownload}
              className="text-xs py-1 px-3 bg-indigo-800 text-white border-indigo-700 hover:bg-indigo-700 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>

            <Button
              size="sm"
              variant="danger"
              disabled={selectedPhotoIds.length === 0 || batchActionLoading}
              onClick={handleBatchDelete}
              className="text-xs py-1 px-3 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Photo Grid / Content */}
      {loading ? (
        <div className="py-16">
          <LoadingState message="Loading album photos..." />
        </div>
      ) : filteredPhotos.length === 0 ? (
        photos.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="w-7 h-7" />}
            title="No photos in this album yet"
            description="Start building your family memory collection by uploading photos to this album."
            actionLabel="Upload Photos"
            onAction={() => setIsUploadOpen(true)}
          />
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No photos match your filter
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('all');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {filteredPhotos.map((photo) => {
            const isFav = favoritePhotoIds.includes(photo.id);
            const isSelected = selectedPhotoIds.includes(photo.id);

            return (
              <div
                key={photo.id}
                onClick={() => {
                  if (multiSelectMode) {
                    toggleSelectPhoto(photo.id, { stopPropagation: () => {} } as any);
                  } else {
                    setLightboxPhotoId(photo.id);
                  }
                }}
                className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800 border transition-all ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500 scale-[0.98]'
                    : 'border-slate-200 dark:border-slate-800 hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                {/* Image */}
                <img
                  src={photo.thumbnailUrl || photo.downloadUrl}
                  alt={photo.caption || photo.fileName}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Multi-select indicator */}
                {multiSelectMode && (
                  <button
                    onClick={(e) => toggleSelectPhoto(photo.id, e)}
                    className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/50 text-white backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                )}

                {/* Heart Favorite button on hover or if active */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextFav = !isFav;
                    onFavoriteToggled(photo.id, nextFav);
                    photoFavoriteService.toggleFavorite(
                      familyId,
                      currentUser.id,
                      photo.id,
                      isFav
                    );
                  }}
                  className={`absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-xs transition-all cursor-pointer ${
                    isFav
                      ? 'bg-rose-500/80 text-white'
                      : 'bg-black/40 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100'
                  }`}
                  title={isFav ? 'Favorited' : 'Add to favorites'}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
                </button>

                {/* Bottom gradient caption overlay on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end text-white pointer-events-none">
                  {photo.caption ? (
                    <p className="text-xs font-semibold truncate leading-tight">
                      {photo.caption}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-300 truncate">
                      {photo.photoDate || photo.fileName}
                    </p>
                  )}

                  {photo.location && (
                    <p className="text-[10px] text-slate-300 flex items-center gap-1 truncate mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-rose-400" />
                      {photo.location}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhotoId && (
        <PhotoLightboxModal
          isOpen={Boolean(lightboxPhotoId)}
          onClose={() => setLightboxPhotoId(null)}
          photos={filteredPhotos}
          initialPhotoId={lightboxPhotoId}
          albums={albums}
          currentAlbumId={album.id}
          currentUser={currentUser}
          familyId={familyId}
          members={members}
          favoritePhotoIds={favoritePhotoIds}
          onFavoriteToggled={onFavoriteToggled}
          onPhotoDeleted={handlePhotoDeleted}
          onPhotoUpdated={handlePhotoUpdated}
        />
      )}

      {/* Upload Photos Modal */}
      {isUploadOpen && (
        <UploadPhotosModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          albums={albums}
          defaultAlbumId={album.id}
          members={members}
          currentUser={currentUser}
          familyId={familyId}
          onSuccess={() => {
            setIsUploadOpen(false);
          }}
        />
      )}

      {/* Edit Album Modal */}
      {isEditOpen && (
        <EditAlbumModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          album={album}
          currentUser={currentUser}
          familyId={familyId}
          members={members}
          onUpdated={(updated) => {
            setAlbum(updated);
            onAlbumUpdated(updated);
          }}
          onDeleted={() => {
            onAlbumDeleted(album.id);
            onBack();
          }}
        />
      )}
    </div>
  );
};
