import { PhotoAlbum, FamilyPhoto, PhotosSummary, PhotoFilter } from '../types';

class PhotoReportService {
  /**
   * Computes dashboard statistics from albums, photos, and user favorites
   */
  calculateSummary(
    albums: PhotoAlbum[],
    photos: FamilyPhoto[],
    favoritePhotoIds: string[]
  ): PhotosSummary {
    const totalAlbums = albums.filter((a) => !a.deletedAt && !a.isArchived).length;
    let totalPhotos = 0;

    albums.forEach((a) => {
      if (!a.deletedAt && !a.isArchived) {
        totalPhotos += a.photoCount || 0;
      }
    });

    // If totalPhotos in albums is less than actual loaded photos, fallback to photo length
    if (totalPhotos === 0 && photos.length > 0) {
      totalPhotos = photos.filter((p) => !p.deletedAt).length;
    }

    // Recent uploads in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekIso = oneWeekAgo.toISOString();

    const recentUploadsCount = photos.filter(
      (p) => !p.deletedAt && p.createdAt >= oneWeekIso
    ).length;

    return {
      totalAlbums,
      totalPhotos,
      recentUploadsCount,
      favoritesCount: favoritePhotoIds.length,
    };
  }

  /**
   * Filters and sorts photos based on query, tags, category, and date range
   */
  filterAndSortPhotos(
    photos: FamilyPhoto[],
    filter: PhotoFilter,
    favoriteIds: string[] = []
  ): FamilyPhoto[] {
    const q = filter.searchQuery?.trim().toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    const yearAgo = new Date();
    yearAgo.setDate(yearAgo.getDate() - 365);
    const yearAgoStr = yearAgo.toISOString().split('T')[0];

    return photos.filter((p) => {
      if (p.deletedAt) return false;

      // Only favorites filter
      if (filter.onlyFavorites && !favoriteIds.includes(p.id)) {
        return false;
      }

      // Member ID (Tagged in photo)
      if (filter.memberId && (!p.peopleIds || !p.peopleIds.includes(filter.memberId))) {
        return false;
      }

      // Uploaded by (My uploads)
      if (filter.uploadedBy && p.uploadedBy !== filter.uploadedBy) {
        return false;
      }

      // Date Range
      if (filter.dateRange && filter.dateRange !== 'all') {
        const compareDate = p.photoDate || p.createdAt.split('T')[0];
        if (filter.dateRange === 'today' && compareDate !== today) return false;
        if (filter.dateRange === 'this_week' && compareDate < weekAgoStr) return false;
        if (filter.dateRange === 'this_month' && compareDate < monthAgoStr) return false;
        if (filter.dateRange === 'this_year' && compareDate < yearAgoStr) return false;
      }

      // Search query (file name, caption, location, people)
      if (q) {
        const nameMatch = (p.fileName || '').toLowerCase().includes(q);
        const captionMatch = (p.caption || '').toLowerCase().includes(q);
        const locMatch = (p.location || '').toLowerCase().includes(q);
        const peopleMatch = (p.peopleNames || []).some((n) => n.toLowerCase().includes(q));
        const uploaderMatch = (p.uploadedByName || '').toLowerCase().includes(q);

        if (!nameMatch && !captionMatch && !locMatch && !peopleMatch && !uploaderMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (filter.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'photo_date': {
          const dateA = a.photoDate || a.createdAt;
          const dateB = b.photoDate || b.createdAt;
          return dateB.localeCompare(dateA);
        }
        case 'recently_uploaded':
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }

  /**
   * Filters and sorts photo albums
   */
  filterAndSortAlbums(
    albums: PhotoAlbum[],
    searchQuery?: string,
    category?: string,
    isArchived: boolean = false,
    sortBy: 'newest' | 'oldest' | 'name' | 'recently_updated' = 'newest'
  ): PhotoAlbum[] {
    const q = searchQuery?.trim().toLowerCase();

    return albums.filter((a) => {
      if (a.deletedAt) return false;
      if (!!a.isArchived !== isArchived) return false;

      if (category && category !== 'all' && a.category !== category) {
        return false;
      }

      if (q) {
        const nameMatch = (a.name || '').toLowerCase().includes(q);
        const descMatch = (a.description || '').toLowerCase().includes(q);
        const catMatch = (a.category || '').toLowerCase().includes(q);
        const locMatch = (a.location || '').toLowerCase().includes(q);

        if (!nameMatch && !descMatch && !catMatch && !locMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recently_updated':
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }
}

export const photoReportService = new PhotoReportService();
