import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PersonalPhoto, PersonalAlbum } from '../../types';
import {
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Download,
  Lock,
  Folder,
  Eye,
  X,
} from 'lucide-react';

export const PersonalPhotos: React.FC = () => {
  const { photos, albums, uploadPhoto, deletePhoto, createAlbum, deleteAlbum } = usePersonal();

  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAlbumOpen, setIsAlbumOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PersonalPhoto | null>(null);

  // Upload states
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // New Album state
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        await uploadPhoto(selectedFiles[i], selectedAlbumId || undefined, caption || undefined);
      }
      setIsUploadOpen(false);
      setSelectedFiles(null);
      setCaption('');
    } catch (err) {
      console.warn('Could not upload photos:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumTitle.trim()) return;

    await createAlbum(albumTitle.trim(), albumDesc.trim() || undefined);
    setAlbumTitle('');
    setAlbumDesc('');
    setIsAlbumOpen(false);
  };

  const filtered = photos.filter((p) => {
    if (activeTab === 'all') return true;
    return p.albumId === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-indigo-600" />
              Personal Photos & Vault
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Private memories, confidential photos, and albums only visible to you.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAlbumOpen(true)} icon={<Folder className="w-4 h-4" />}>
            New Album
          </Button>
          <Button size="sm" onClick={() => setIsUploadOpen(true)} icon={<Upload className="w-4 h-4" />}>
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Album filter tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          All Photos ({photos.length})
        </button>
        {albums.map((alb) => (
          <button
            key={alb.id}
            onClick={() => setActiveTab(alb.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === alb.id
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>{alb.title}</span>
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer shadow-xs"
          >
            <img
              src={photo.url}
              alt={photo.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              <span className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white">
                <Eye className="w-4 h-4" />
              </span>
            </div>
            {photo.caption && (
              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[11px] text-white truncate font-medium">
                {photo.caption}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No private photos yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Upload photos to keep them safe in your encrypted vault.
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Private Photos" maxWidth="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Assign to Album (optional)
            </label>
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="">No Album (General)</option>
              {albums.map((alb) => (
                <option key={alb.id} value={alb.id}>
                  {alb.title}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Caption (optional)"
            placeholder="e.g. Hiking trip summit, Confidential doc snapshot"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Photos
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="w-full text-xs p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={uploading}>
              Upload Photos
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Album Modal */}
      <Modal isOpen={isAlbumOpen} onClose={() => setIsAlbumOpen(false)} title="Create Private Album" maxWidth="sm">
        <form onSubmit={handleCreateAlbum} className="space-y-4">
          <Input
            label="Album Title *"
            placeholder="e.g. Travel 2026, Work Receipts, Personal Ideas"
            value={albumTitle}
            onChange={(e) => setAlbumTitle(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Description (optional)"
            placeholder="Album notes..."
            value={albumDesc}
            onChange={(e) => setAlbumDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAlbumOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Create Album
            </Button>
          </div>
        </form>
      </Modal>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-xs font-semibold truncate max-w-md">
                {selectedPhoto.caption || selectedPhoto.name}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedPhoto.url}
                  download={selectedPhoto.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    deletePhoto(selectedPhoto.id, selectedPhoto.storagePath);
                    setSelectedPhoto(null);
                  }}
                  className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.name}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
