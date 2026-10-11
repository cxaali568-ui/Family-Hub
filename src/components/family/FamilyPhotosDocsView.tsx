import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Filter,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import { FamilyPhotosDashboard } from '../photos/FamilyPhotosDashboard';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { documentService, FamilyDocument } from '../../services/documentService';

interface FamilyPhotosDocsViewProps {
  mode: 'photos' | 'documents';
}

export const FamilyPhotosDocsView: React.FC<FamilyPhotosDocsViewProps> = ({ mode }) => {
  if (mode === 'photos') {
    return <FamilyPhotosDashboard />;
  }

  const { currentFamily, familyPermissions } = useFamily();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<FamilyDocument['category']>('general');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentFamily?.id) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    const unsubscribe = documentService.subscribeDocuments(currentFamily.id, (docs) => {
      setDocuments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentFamily?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadTitle.trim()) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily?.id || !user || !selectedFile) return;

    setUploading(true);
    setUploadError(null);

    try {
      await documentService.uploadDocument(
        currentFamily.id,
        selectedFile,
        uploadTitle.trim(),
        uploadCategory,
        user
      );
      setIsUploadOpen(false);
      setSelectedFile(null);
      setUploadTitle('');
      setUploadCategory('general');
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: FamilyDocument) => {
    if (!currentFamily?.id) return;
    try {
      await documentService.deleteDocument(currentFamily.id, doc.id, doc.storagePath);
    } catch (err) {
      console.warn('Failed to delete document:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            Important Family Documents
          </h1>
          <p className="text-xs text-slate-500">
            Secure household policies, birth certificates, warranties, and medical forms.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setSelectedFile(null);
            setUploadTitle('');
            setUploadError(null);
            setIsUploadOpen(true);
          }}
          icon={<Upload className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'policy', label: 'Policies' },
            { id: 'medical', label: 'Medical' },
            { id: 'education', label: 'Education' },
            { id: 'finance', label: 'Finance' },
            { id: 'identity', label: 'Identity' },
            { id: 'general', label: 'General' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-slate-300 dark:text-slate-700" />}
          title="No documents yet"
          description={
            searchQuery || selectedCategory !== 'all'
              ? 'No documents match your search or filter.'
              : 'Upload your first family document to keep critical records accessible and safe.'
          }
          actionLabel={!searchQuery && selectedCategory === 'all' ? 'Upload Document' : undefined}
          onAction={!searchQuery && selectedCategory === 'all' ? () => setIsUploadOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const canDelete =
              familyPermissions.isAdmin ||
              familyPermissions.isOwner ||
              doc.uploadedById === user?.id;

            return (
              <Card key={doc.id} className="p-3.5 flex items-center justify-between hover:shadow-xs transition-shadow">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {doc.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {formatFileSize(doc.fileSize)} •{' '}
                      <span className="capitalize">{doc.category}</span> • Uploaded by{' '}
                      {doc.uploadedBy} on {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.fileName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => !uploading && setIsUploadOpen(false)}
        title="Upload Family Document"
        maxWidth="md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Document File (Max 20MB)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              required
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-950 dark:file:text-amber-300 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Supports PDF, Word (.docx), Excel (.xlsx), Images (.jpg, .png), and text.
            </p>
          </div>

          <Input
            label="Document Title"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="e.g. Health Insurance Policy 2026"
            required
          />

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Category
            </label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="policy">Policy & Insurance</option>
              <option value="medical">Medical & Immunization</option>
              <option value="education">Education & School</option>
              <option value="finance">Finance & Tax</option>
              <option value="identity">Identity & Certificates</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => setIsUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedFile || uploading}
              loading={uploading}
            >
              Upload
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
