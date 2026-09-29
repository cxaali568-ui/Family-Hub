import React, { useState, useEffect } from 'react';
import {
  PhotoAlbum,
  FamilyPhoto,
  PhotosSummary,
  PhotoFilter,
  User,
  FamilyMemberProfile,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { albumService } from '../../services/albumService';
import { photoService } from '../../services/photoService';
import { photoFavoriteService } from '../../services/photoFavoriteService';
import { photoReportService } from '../../services/photoReportService';
import { memberProfileService } from '../../services/memberProfileService';

import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';

import { CreateAlbumModal } from './CreateAlbumModal';
import { UploadPhotosModal } from './UploadPhotosModal';
import { AlbumDetailView } from './AlbumDetailView';
import { PhotoLightboxModal } from './PhotoLightboxModal';

import {
  Image as ImageIcon,
  FolderPlus,
  Upload,
  Heart,
  Calendar,
  MapPin,
  Tag,
  Search,
  Folder,
  Layers,
  Sparkles,
  Archive,
  Clock,
  Shield,
  Filter,
} from 'lucide-react';

type PhotoDashboardTab = 'albums' | 'all_photos' | 'favorites' | 'archive';

export const FamilyPhotosDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const familyId = currentFamily?.id || '';

  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<FamilyPhoto[]>([]);
  const [favoritePhotoIds, setFavoritePhotoIds] = useState<string[]>([]);
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab & View States
  const [activeTab, setActiveTab] = useState<PhotoDashboardTab>('albums');
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);

  // Modals
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'this_year'>('all');

  // Subscriptions
  useEffect(() => {
    if (!familyId) return;
    setLoading(true);

    const unsubAlbums = albumService.subscribeAlbums(familyId, (loadedAlbums) => {
      setAlbums(loadedAlbums);
      setLoading(false);
    });

    const unsubRecentPhotos = photoService.subscribeRecentPhotos(
      familyId,
      80,
      (photos) => {
        setRecentPhotos(photos);
      }
    );

    const unsubMembers = memberProfileService.subscribeMemberProfiles(
      familyId,
      (loadedMembers) => {
        setMembers(loadedMembers);
      }
    );

    let unsubFavorites = () => {};
    if (user?.id) {
      unsubFavorites = photoFavoriteService.subscribeUserFavorites(
        familyId,
        user.id,
        (favs) => {
          setFavoritePhotoIds(favs);
        }
      );
    }

    return () => {
      unsubAlbums();
      unsubRecentPhotos();
      unsubMembers();
      unsubFavorites();
    };
  }, [familyId, user?.id]);

  if (!user || !familyId) {
    return (
      <div className="p-8 text-center">
        <LoadingState message="Connecting to family photo vault..." />
      </div>
    );
  }

  // Summary statistics
  const summary: PhotosSummary = photoReportService.calculateSummary(
    albums,
    recentPhotos,
    favoritePhotoIds
  );

  // Filtered Albums
  const activeAlbums = albums.filter((a) => !a.isArchived);
  const archivedAlbums = albums.filter((a) => a.isArchived);

  const displayedAlbums = (activeTab === 'archive' ? archivedAlbums : activeAlbums).filter(
    (album) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = album.name.toLowerCase().includes(q);
        const matchDesc = album.description?.toLowerCase().includes(q);
        const matchLoc = album.location?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchLoc) return false;
      }

      if (selectedCategory !== 'all') {
        if (album.category !== selectedCategory) return false;
      }

      return true;
    }
  );

  // Filtered Stream Photos
  const displayedPhotos = recentPhotos.filter((photo) => {
    if (activeTab === 'favorites') {
      if (!favoritePhotoIds.includes(photo.id)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCaption = photo.caption?.toLowerCase().includes(q);
      const matchLoc = photo.location?.toLowerCase().includes(q);
      const matchFile = photo.fileName.toLowerCase().includes(q);
      const matchPeople = photo.peopleNames?.some((p) => p.toLowerCase().includes(q));
      if (!matchCaption && !matchLoc && !matchFile && !matchPeople) return false;
    }

    return true;
  });

  const handleFavoriteToggled = (photoId: string, isFav: boolean) => {
    setFavoritePhotoIds((prev) =>
      isFav ? [...prev, photoId] : prev.filter((id) => id !== photoId)
    );
  };

  const handleAlbumUpdated = (updated: PhotoAlbum) => {
    setAlbums((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    if (selectedAlbum?.id === updated.id) {
      setSelectedAlbum(updated);
    }
  };

  const handleAlbumDeleted = (albumId: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    if (selectedAlbum?.id === albumId) {
      setSelectedAlbum(null);
    }
  };

  // If viewing an individual album
  if (selectedAlbum) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <AlbumDetailView
          album={selectedAlbum}
          onBack={() => setSelectedAlbum(null)}
          currentUser={user}
          familyId={familyId}
          members={members}
          albums={albums}
          favoritePhotoIds={favoritePhotoIds}
          onFavoriteToggled={handleFavoriteToggled}
          onAlbumUpdated={handleAlbumUpdated}
          onAlbumDeleted={handleAlbumDeleted}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ImageIcon className="w-6 h-6" />
            </span>
            Family Photo Vault
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Capture, organize, and cherish high-resolution shared memories across the family.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateAlbumOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            + New Album
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <Upload className="w-3.5 h-3.5" />
            + Upload Photos
          </Button>
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card
          onClick={() => setActiveTab('albums')}
          className={`p-4 border transition-all cursor-pointer ${
            activeTab === 'albums'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Albums
            </span>
            <Folder className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {summary.totalAlbums}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Organized collections</p>
        </Card>

        <Card
          onClick={() => setActiveTab('all_photos')}
          className={`p-4 border transition-all cursor-pointer ${
            activeTab === 'all_photos'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Photos
            </span>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {summary.totalPhotos}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Stored securely</p>
        </Card>

        <Card className="p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Recent (7d)
            </span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {summary.recentUploadsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">New uploads this week</p>
        </Card>

        <Card
          onClick={() => setActiveTab('favorites')}
          className={`p-4 border transition-all cursor-pointer ${
            activeTab === 'favorites'
              ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 ring-1 ring-rose-500'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              My Favorites
            </span>
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {summary.favoritesCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Bookmarked memories</p>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('albums')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'albums'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            Albums ({activeAlbums.length})
          </button>

          <button
            onClick={() => setActiveTab('all_photos')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all_photos'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All Photos ({recentPhotos.length})
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Favorites ({favoritePhotoIds.length})
          </button>

          {archivedAlbums.length > 0 && (
            <button
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archived ({archivedAlbums.length})
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'albums'
                ? 'Search albums by title or location...'
                : 'Search photos by caption, location, or tag...'
            }
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Categories for Albums */}
        {activeTab === 'albums' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              Category:
            </span>
            {['all', 'Family', 'Events', 'Travel', 'Birthdays', 'School', 'Kids', 'Holidays'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer shrink-0 capitalize ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20">
          <LoadingState message="Loading photo memories..." />
        </div>
      ) : activeTab === 'albums' || activeTab === 'archive' ? (
        displayedAlbums.length === 0 ? (
          <EmptyState
            icon={<Folder className="w-7 h-7" />}
            title={activeTab === 'archive' ? 'No archived albums' : 'No photo albums yet'}
            description={
              activeTab === 'archive'
                ? 'You have not archived any albums.'
                : 'Create your first photo album to start organizing family memories.'
            }
            actionLabel={activeTab === 'archive' ? undefined : '+ Create First Album'}
            onAction={activeTab === 'archive' ? undefined : () => setIsCreateAlbumOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {displayedAlbums.map((album) => (
              <Card
                key={album.id}
                onClick={() => setSelectedAlbum(album)}
                className="overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group flex flex-col"
              >
                {/* Album Cover Thumbnail */}
                <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {album.coverPhotoUrl ? (
                    <img
                      src={album.coverPhotoUrl}
                      alt={album.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Folder className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <span className="text-[11px] font-semibold mt-1">
                        Empty Album
                      </span>
                    </div>
                  )}

                  {/* Category Pill */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                    {album.category || 'Family'}
                  </span>

                  {/* Photo count pill */}
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {album.photoCount || 0}
                  </span>

                  {/* Restricted badge */}
                  {album.restrictedMemberIds && album.restrictedMemberIds.length > 0 && (
                    <span className="absolute top-2.5 right-2.5 p-1 rounded-full bg-amber-500 text-white shadow-xs">
                      <Shield className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Album Info */}
                <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {album.name}
                    </h3>
                    {album.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {album.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {album.albumDate || 'Recent'}
                    </span>
                    {album.location && (
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        {album.location}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Stream of All Photos or Favorites */
        displayedPhotos.length === 0 ? (
          <EmptyState
            icon={
              activeTab === 'favorites' ? (
                <Heart className="w-7 h-7" />
              ) : (
                <ImageIcon className="w-7 h-7" />
              )
            }
            title={
              activeTab === 'favorites'
                ? 'No favorite photos yet'
                : 'No family photos found'
            }
            description={
              activeTab === 'favorites'
                ? 'Click the heart icon on any photo to save your favorite family moments here.'
                : 'Upload photos directly or into albums to view your photo stream.'
            }
            actionLabel={activeTab === 'favorites' ? undefined : '+ Upload Photos'}
            onAction={activeTab === 'favorites' ? undefined : () => setIsUploadOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {displayedPhotos.map((photo) => {
              const isFav = favoritePhotoIds.includes(photo.id);

              return (
                <div
                  key={photo.id}
                  onClick={() => setLightboxPhotoId(photo.id)}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all hover:scale-[1.01]"
                >
                  <img
                    src={photo.thumbnailUrl || photo.downloadUrl}
                    alt={photo.caption || photo.fileName}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Heart Favorite */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextFav = !isFav;
                      handleFavoriteToggled(photo.id, nextFav);
                      photoFavoriteService.toggleFavorite(
                        familyId,
                        user.id,
                        photo.id,
                        isFav
                      );
                    }}
                    className={`absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-xs transition-all cursor-pointer ${
                      isFav
                        ? 'bg-rose-500/80 text-white'
                        : 'bg-black/40 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
                  </button>

                  {/* Bottom caption overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end text-white pointer-events-none">
                    {photo.caption ? (
                      <p className="text-xs font-semibold truncate">
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
        )
      )}

      {/* Lightbox Modal */}
      {lightboxPhotoId && (
        <PhotoLightboxModal
          isOpen={Boolean(lightboxPhotoId)}
          onClose={() => setLightboxPhotoId(null)}
          photos={displayedPhotos}
          initialPhotoId={lightboxPhotoId}
          albums={albums}
          currentUser={user}
          familyId={familyId}
          members={members}
          favoritePhotoIds={favoritePhotoIds}
          onFavoriteToggled={handleFavoriteToggled}
          onPhotoDeleted={(photoId) => {
            setRecentPhotos((prev) => prev.filter((p) => p.id !== photoId));
          }}
          onPhotoUpdated={(updated) => {
            setRecentPhotos((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
          }}
        />
      )}

      {/* Create Album Modal */}
      {isCreateAlbumOpen && (
        <CreateAlbumModal
          isOpen={isCreateAlbumOpen}
          onClose={() => setIsCreateAlbumOpen(false)}
          currentUser={user}
          familyId={familyId}
          members={members}
          onSuccess={(newAlbum) => {
            setAlbums((prev) => [newAlbum, ...prev]);
            setSelectedAlbum(newAlbum);
            setIsCreateAlbumOpen(false);
          }}
        />
      )}

      {/* Upload Photos Modal */}
      {isUploadOpen && (
        <UploadPhotosModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          albums={albums}
          members={members}
          currentUser={user}
          familyId={familyId}
          onSuccess={() => {
            setIsUploadOpen(false);
          }}
        />
      )}
    </div>
  );
};
