import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Image as ImageIcon, FileText, Upload, Download, Eye, Calendar } from 'lucide-react';

interface FamilyPhotosDocsViewProps {
  mode: 'photos' | 'documents';
}

const SAMPLE_PHOTOS = [
  {
    id: 'p-1',
    title: 'Family Summer Trip 2026',
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80',
    date: '2026-07-20',
    uploadedBy: 'Tariq Khan',
  },
  {
    id: 'p-2',
    title: 'Zayd Robotics Science Fair',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
    date: '2026-05-14',
    uploadedBy: 'Ayesha Khan',
  },
  {
    id: 'p-3',
    title: 'Fatima Art Competition Ribbon',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    date: '2026-04-02',
    uploadedBy: 'Ayesha Khan',
  },
];

const SAMPLE_DOCS = [
  {
    id: 'd-1',
    title: 'Home Insurance Policy 2026.pdf',
    size: '1.8 MB',
    type: 'PDF Document',
    date: '2026-01-10',
    uploadedBy: 'Tariq Khan',
  },
  {
    id: 'd-2',
    title: 'Children Immunization Records.pdf',
    size: '840 KB',
    type: 'Medical PDF',
    date: '2026-03-12',
    uploadedBy: 'Ayesha Khan',
  },
  {
    id: 'd-3',
    title: 'School Registration Agreement 2026-2027.pdf',
    size: '2.1 MB',
    type: 'Education Document',
    date: '2026-08-15',
    uploadedBy: 'Tariq Khan',
  },
];

export const FamilyPhotosDocsView: React.FC<FamilyPhotosDocsViewProps> = ({ mode }) => {
  const isPhotos = mode === 'photos';
  const [items, setItems] = useState(isPhotos ? SAMPLE_PHOTOS : SAMPLE_DOCS);

  const handleUploadPlaceholder = () => {
    if (isPhotos) {
      const newPhoto = {
        id: `p-${Date.now()}`,
        title: 'New Family Memory',
        url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
        date: new Date().toISOString().split('T')[0],
        uploadedBy: 'You',
      };
      setItems([newPhoto as any, ...items]);
    } else {
      const newDoc = {
        id: `d-${Date.now()}`,
        title: 'New_Household_Document.pdf',
        size: '650 KB',
        type: 'PDF Document',
        date: new Date().toISOString().split('T')[0],
        uploadedBy: 'You',
      };
      setItems([newDoc as any, ...items]);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {isPhotos ? (
              <ImageIcon className="w-6 h-6 text-indigo-600" />
            ) : (
              <FileText className="w-6 h-6 text-amber-600" />
            )}
            {isPhotos ? 'Family Photo Memories' : 'Important Family Documents'}
          </h1>
          <p className="text-xs text-slate-500">
            {isPhotos
              ? 'Shared family album and treasured memories.'
              : 'Secure household policies, birth certificates, and warranties.'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleUploadPlaceholder}
          icon={<Upload className="w-4 h-4" />}
        >
          {isPhotos ? 'Upload Memory' : 'Upload Document'}
        </Button>
      </div>

      {isPhotos ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((photo: any) => (
            <Card key={photo.id} className="p-2 overflow-hidden group">
              <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-2.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {photo.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{photo.uploadedBy}</span>
                  <span>{photo.date}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((doc: any) => (
            <Card key={doc.id} className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{doc.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {doc.size} • {doc.type} • Uploaded by {doc.uploadedBy} on {doc.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" icon={<Download className="w-3.5 h-3.5" />}>
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
