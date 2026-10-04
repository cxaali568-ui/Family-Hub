import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PersonalFile } from '../../types';
import { personalService } from '../../services/personalService';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Edit2,
  Search,
  Lock,
  File,
  FileCode,
  Image,
  Check,
} from 'lucide-react';

const CATEGORIES: Array<PersonalFile['category']> = [
  'documents',
  'receipts',
  'id_cards',
  'certificates',
  'other',
];

export const PersonalDocuments: React.FC = () => {
  const { files, uploadFile, deleteFile } = usePersonal();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<PersonalFile['category']>('documents');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  // Rename modal
  const [renamingFile, setRenamingFile] = useState<PersonalFile | null>(null);
  const [newName, setNewName] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        await uploadFile(selectedFiles[i], uploadCategory);
      }
      setIsUploadOpen(false);
      setSelectedFiles(null);
    } catch (err) {
      console.warn('Could not upload file:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFile || !newName.trim()) return;

    await personalService.renameFile(renamingFile.ownerId, renamingFile.id, newName.trim());
    setRenamingFile(null);
    setNewName('');
  };

  const filtered = files.filter((f) => {
    if (selectedCat !== 'all' && f.category !== selectedCat) return false;
    if (search.trim()) {
      return f.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="w-5 h-5 text-indigo-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Personal Documents
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private Storage
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Passports, tax records, private IDs, and confidential certificates.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsUploadOpen(true)} icon={<Upload className="w-4 h-4" />}>
          Upload Document
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCat === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Files ({files.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c || 'other')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCat === c
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {c?.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((file) => (
          <Card key={file.id} className="p-4 flex flex-col justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                {getFileIcon(file.fileType)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={file.name}>
                  {file.name}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                  <span>{formatSize(file.size)}</span>
                  <span>•</span>
                  <span className="uppercase font-semibold">{file.category}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                download={file.name}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1.5"
                  onClick={() => {
                    setRenamingFile(file);
                    setNewName(file.name);
                  }}
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1.5 text-rose-500 hover:text-rose-700"
                  onClick={() => deleteFile(file.id, file.storagePath)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No personal documents uploaded yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Store your passports, tax returns, and private receipts securely.
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Private Document" maxWidth="md">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Document Category
            </label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="documents">General Document</option>
              <option value="receipts">Receipt / Invoice</option>
              <option value="id_cards">ID Card / Passport</option>
              <option value="certificates">Certificate / Degree</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Files
            </label>
            <input
              type="file"
              multiple
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
              Upload
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal isOpen={!!renamingFile} onClose={() => setRenamingFile(null)} title="Rename Document" maxWidth="sm">
        <form onSubmit={handleRename} className="space-y-4">
          <Input
            label="File Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRenamingFile(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save Name
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
