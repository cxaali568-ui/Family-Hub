import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PhotoAlbum, AlbumCategory, User, FamilyMemberProfile } from '../../types';
import { albumService, DEFAULT_ALBUM_CATEGORIES } from '../../services/albumService';
import {
  FolderEdit,
  Calendar,
  MapPin,
  Tag,
  Shield,
  Archive,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface EditAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: PhotoAlbum;
  currentUser: User;
  familyId: string;
  members: FamilyMemberProfile[];
  onUpdated: (updatedAlbum: PhotoAlbum) => void;
  onDeleted?: () => void;
}

export const EditAlbumModal: React.FC<EditAlbumModalProps> = ({
  isOpen,
  onClose,
  album,
  currentUser,
  familyId,
  members,
  onUpdated,
  onDeleted,
}) => {
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description || '');
  const [category, setCategory] = useState<string>(album.category || 'Family');
  const [albumDate, setAlbumDate] = useState(
    album.albumDate || new Date().toISOString().split('T')[0]
  );
  const [location, setLocation] = useState(album.location || '');
  const [isRestricted, setIsRestricted] = useState(
    Boolean(album.restrictedMemberIds && album.restrictedMemberIds.length > 0)
  );
  const [restrictedIds, setRestrictedIds] = useState<string[]>(
    album.restrictedMemberIds || []
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(album.name);
    setDescription(album.description || '');
    setCategory(album.category || 'Family');
    setAlbumDate(album.albumDate || new Date().toISOString().split('T')[0]);
    setLocation(album.location || '');
    setIsRestricted(Boolean(album.restrictedMemberIds && album.restrictedMemberIds.length > 0));
    setRestrictedIds(album.restrictedMemberIds || []);
    setConfirmDelete(false);
    setError(null);
  }, [album, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an album name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updates: Partial<PhotoAlbum> = {
        name: name.trim(),
        description: description.trim(),
        category,
        albumDate,
        location: location.trim(),
        restrictedMemberIds: isRestricted ? restrictedIds : undefined,
      };

      await albumService.updateAlbum(familyId, album.id, updates, currentUser);

      onUpdated({
        ...album,
        ...updates,
      });
      onClose();
    } catch (err: any) {
      console.error('Error updating album:', err);
      setError(err?.message || 'Failed to update album. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    setLoading(true);
    setError(null);
    try {
      await albumService.toggleArchiveAlbum(
        familyId,
        album.id,
        album.isArchived,
        currentUser
      );
      onUpdated({
        ...album,
        isArchived: !album.isArchived,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle archive status.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await albumService.softDeleteAlbum(familyId, album.id, currentUser);
      if (onDeleted) onDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete album.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberRestriction = (id: string) => {
    setRestrictedIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Photo Album" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Album Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Vacation, Birthday Party..."
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DEFAULT_ALBUM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Album Date
            </label>
            <Input
              type="date"
              value={albumDate}
              onChange={(e) => setAlbumDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            Location (Optional)
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Banff National Park, Grandparents' House"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description / Memories (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes or story behind this album..."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Member Access Restriction */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Restrict Album Visibility
                </p>
                <p className="text-[11px] text-slate-500">
                  Only selected family members will have access to view this album.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              id="isRestrictedEdit"
              checked={isRestricted}
              onChange={(e) => setIsRestricted(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
          </div>

          {isRestricted && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Select permitted family members:
              </p>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                {members.map((m) => {
                  const memberId = m.userId || m.id;
                  const selected = restrictedIds.includes(memberId);
                  return (
                    <button
                      type="button"
                      key={memberId}
                      onClick={() => toggleMemberRestriction(memberId)}
                      className={`px-3 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer border ${
                        selected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      {m.fullName || m.nickname || m.email || 'Member'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dangerous actions: Archive & Delete */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleArchive}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
          >
            <Archive className="w-3.5 h-3.5" />
            {album.isArchived ? 'Unarchive Album' : 'Archive Album'}
          </Button>

          {!confirmDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Album
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Are you sure?
              </span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="text-xs"
              >
                Yes, Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Form action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="gap-1.5">
            <FolderEdit className="w-4 h-4" />
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
