import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  PhotoAlbum,
  FamilyPhoto,
  PhotoUploadQueueItem,
  User,
  FamilyMemberProfile,
} from '../../types';
import { photoService } from '../../services/photoService';
import {
  Upload,
  Image as ImageIcon,
  Camera,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  RotateCcw,
} from 'lucide-react';

interface UploadPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: PhotoAlbum[];
  defaultAlbumId?: string;
  members: FamilyMemberProfile[];
  currentUser: User;
  familyId: string;
  onSuccess: (uploadedCount: number) => void;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit

export const UploadPhotosModal: React.FC<UploadPhotosModalProps> = ({
  isOpen,
  onClose,
  albums,
  defaultAlbumId,
  members,
  currentUser,
  familyId,
  onSuccess,
}) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(
    defaultAlbumId || (albums.length > 0 ? albums[0].id : '')
  );
  const [queue, setQueue] = useState<PhotoUploadQueueItem[]>([]);
  const [commonCaption, setCommonCaption] = useState('');
  const [commonDate, setCommonDate] = useState(new Date().toISOString().split('T')[0]);
  const [commonLocation, setCommonLocation] = useState('');
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Sync album selection if defaultAlbumId changes
  React.useEffect(() => {
    if (defaultAlbumId) {
      setSelectedAlbumId(defaultAlbumId);
    } else if (albums.length > 0 && !selectedAlbumId) {
      setSelectedAlbumId(albums[0].id);
    }
  }, [defaultAlbumId, albums]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setValidationError(null);

    const newItems: PhotoUploadQueueItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate MIME type
      if (!file.type.startsWith('image/')) {
        setValidationError(`"${file.name}" is not a supported image file.`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError(`"${file.name}" is larger than 25MB. Please choose a smaller photo.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        progress: 0,
        status: 'pending',
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const toggleTaggedPerson = (personId: string) => {
    setSelectedPeopleIds((prev) =>
      prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]
    );
  };

  const startUpload = async () => {
    if (!selectedAlbumId) {
      setValidationError('Please select or create an album first.');
      return;
    }
    if (queue.length === 0) {
      setValidationError('Please select at least one photo to upload.');
      return;
    }

    setIsUploading(true);
    setValidationError(null);

    let completedCount = 0;

    // Resolve tagged member names
    const peopleNames = selectedPeopleIds.map((id) => {
      const m = members.find((mem) => mem.id === id || mem.userId === id);
      return m ? m.fullName : id;
    });

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'complete') {
        completedCount++;
        continue;
      }

      // Update item state to uploading
      setQueue((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', progress: 10 } : it))
      );

      try {
        await photoService.uploadPhoto(
          familyId,
          selectedAlbumId,
          item.file,
          {
            caption: commonCaption || item.caption,
            photoDate: commonDate,
            location: commonLocation,
            peopleIds: selectedPeopleIds,
            peopleNames,
          },
          currentUser,
          (pct) => {
            setQueue((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, progress: pct } : it))
            );
          }
        );

        completedCount++;
        setQueue((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'complete', progress: 100 } : it
          )
        );
      } catch (err: any) {
        console.error('Photo upload failed:', item.file.name, err);
        setQueue((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'failed', error: err.message || 'Failed' } : it
          )
        );
      }
    }

    setIsUploading(false);
    if (completedCount > 0) {
      onSuccess(completedCount);
      // Auto-close if all succeeded
      const hasFailures = queue.some((q) => q.status === 'failed');
      if (!hasFailures) {
        onClose();
        setQueue([]);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Photos"
      subtitle="Add photos to your family albums with tags, dates, and captions."
    >
      <div className="space-y-4">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Target Album Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Target Album <span className="text-rose-500">*</span>
          </label>
          {albums.length === 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
              No albums exist yet. Please create an album first before uploading photos.
            </p>
          ) : (
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.photoCount || 0} photos)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/40'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 shadow-xs">
            <Upload className="w-6 h-6" />
          </div>

          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Drag & drop photos here, or browse files
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Supports JPG, JPEG, PNG, WEBP (Up to 25MB each)
          </p>

          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              icon={<ImageIcon className="w-4 h-4 text-indigo-500" />}
            >
              Choose from Gallery
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              icon={<Camera className="w-4 h-4 text-indigo-500" />}
            >
              Take Photo
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>

        {/* Selected Photos Queue Preview */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Selected Photos ({queue.length})</span>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className="text-rose-600 hover:text-rose-700 text-[11px] font-semibold"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 flex items-center justify-center"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Remove Button */}
                  {!isUploading && item.status !== 'complete' && (
                    <button
                      type="button"
                      onClick={() => removeQueueItem(item.id)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}

                  {/* Progress / Status Overlay */}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 text-white">
                      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-200"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold">{item.progress}%</span>
                    </div>
                  )}

                  {item.status === 'complete' && (
                    <div className="absolute inset-0 bg-emerald-950/70 flex items-center justify-center text-emerald-400">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  )}

                  {item.status === 'failed' && (
                    <div className="absolute inset-0 bg-rose-950/80 flex flex-col items-center justify-center p-1 text-white text-[10px] text-center">
                      <AlertCircle className="w-4 h-4 text-rose-400 mb-0.5" />
                      <span>Failed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Metadata for Batch */}
        <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Optional Photo Details (Applied to Batch)
          </p>

          <div>
            <input
              type="text"
              placeholder="Caption (e.g. Family dinner at home, Eid celebration)"
              value={commonCaption}
              onChange={(e) => setCommonCaption(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <input
                type="date"
                value={commonDate}
                onChange={(e) => setCommonDate(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <input
                type="text"
                placeholder="Location (e.g. Lahore)"
                value={commonLocation}
                onChange={(e) => setCommonLocation(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Tag Family Members (Section 25) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-indigo-500" /> Tag People in these Photos
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {members.map((m) => {
                const id = m.userId || m.id;
                const isTagged = selectedPeopleIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleTaggedPerson(id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isTagged
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isTagged ? '✓ ' : '+ '}
                    {m.fullName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isUploading || queue.length === 0 || !selectedAlbumId}
            onClick={startUpload}
            variant="primary"
            icon={<Upload className="w-4 h-4" />}
          >
            {isUploading
              ? 'Uploading...'
              : `Upload ${queue.length} Photo${queue.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
