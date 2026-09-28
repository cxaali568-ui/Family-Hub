import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { Attachment } from '../../types';

interface MediaViewerModalProps {
  attachment: Attachment | null;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ attachment, onClose }) => {
  if (!attachment) return null;

  const isImage = attachment.fileType === 'image';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white">
          <div className="overflow-hidden">
            <h3 className="text-sm font-bold truncate">{attachment.fileName}</h3>
            <p className="text-[11px] text-slate-400">
              {(attachment.fileSize / 1024).toFixed(1)} KB • {attachment.fileType.toUpperCase()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachment.url}
              download={attachment.fileName}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black/40">
          {isImage ? (
            <img
              src={attachment.url}
              alt={attachment.fileName}
              className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-lg"
            />
          ) : (
            <div className="text-center p-8 space-y-4 max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <FileText className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{attachment.fileName}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Document files can be downloaded or viewed in a separate tab.
                </p>
              </div>
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
