import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PhotoAlbum, AlbumCategory, User, FamilyMemberProfile } from '../../types';
import { albumService, DEFAULT_ALBUM_CATEGORIES } from '../../services/albumService';
import { FolderPlus, Calendar, MapPin, Tag, Shield, CheckCircle } from 'lucide-react';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  familyId: string;
  members: FamilyMemberProfile[];
  onSuccess: (album: PhotoAlbum) => void;
}

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  familyId,
  members,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Family');
  const [albumDate, setAlbumDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictedIds, setRestrictedIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an album name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const album = await albumService.createAlbum(
        familyId,
        {
          name: name.trim(),
          description: description.trim(),
          category,
          albumDate,
          location: location.trim(),
          restrictedMemberIds: isRestricted ? restrictedIds : undefined,
        },
        currentUser
      );

      onSuccess(album);
      onClose();
      // Reset
      setName('');
      setDescription('');
      setLocation('');
      setIsRestricted(false);
      setRestrictedIds([]);
    } catch (err: any) {
      console.error('Failed to create album:', err);
      setError(err.message || 'Failed to create album.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRestrictedMember = (memberId: string) => {
    setRestrictedIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Photo Album"
      subtitle="Group your family memories, holidays, events, and milestones."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Album Name (Required) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Album Name <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder="e.g. Summer Vacation 2026, Eid Mubarak, Kids Birthdays"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="What is this album about? Add notes or memories..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Category & Date in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-500" /> Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DEFAULT_ALBUM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Album Date
            </label>
            <input
              type="date"
              value={albumDate}
              onChange={(e) => setAlbumDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Location (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Lahore, Murree, Grandma's House"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Restricted Album Toggle (Section 50) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isRestricted}
              onChange={(e) => setIsRestricted(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-500" /> Restrict access to specific members
            </span>
          </label>

          {isRestricted && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <p className="text-[10px] text-slate-500 font-semibold">
                Select authorized family members who can view this album:
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                {members.map((m) => {
                  const id = m.userId || m.id;
                  const isChecked = restrictedIds.includes(id);
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRestrictedMember(id)}
                        className="rounded text-indigo-600"
                      />
                      <span className="truncate">{m.fullName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            variant="primary"
            icon={<CheckCircle className="w-4 h-4" />}
          >
            {loading ? 'Creating...' : 'Create Album'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
