import React, { useState, useRef } from 'react';
import { Send, Check, Paperclip, X, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { submitSupportTicket } from '../../services/supportService';
import { SupportTicketResult } from '../../services/supportService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface SimpleTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewMyTickets?: () => void;
}

export const SimpleTicketModal: React.FC<SimpleTicketModalProps> = ({
  isOpen,
  onClose,
  onViewMyTickets,
}) => {
  const { user } = useAuth();
  const { currentFamily, familyRole } = useFamily();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; url: string; size?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SupportTicketResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Attachment file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        url: reader.result as string,
        size: file.size,
      });
      setError(null);
    };
    reader.onerror = () => {
      setError('Could not read the selected file. Please try another image or document.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to submit a support ticket.');
      return;
    }
    if (!subject.trim()) {
      setError('Please provide a short subject.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description of the problem.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await submitSupportTicket({
        userId: user.id,
        userEmail: user.email || '',
        userName: user.name || 'FamilyHub User',
        category: 'help',
        subject: subject.trim(),
        message: description.trim(),
        familyId: currentFamily?.id,
        familyRole: familyRole || undefined,
        attachments: attachment ? [attachment] : undefined,
      });

      setResult(res);
      // Reset form fields
      setSubject('');
      setDescription('');
      setAttachment(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Submit a Support Ticket"
      subtitle="Directly contact FamilyHub App Support for assistance."
      maxWidth="md"
    >
      {result ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Support Ticket Received!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your request has been delivered to the central FamilyHub Support Team. Your reference ID is:
          </p>
          <div className="inline-block px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
            {result.referenceId}
          </div>
          <p className="text-[11px] text-slate-400 pt-1">
            You can check back anytime under <strong>My Support Requests</strong> to see replies.
          </p>

          <div className="flex justify-center gap-2 pt-3">
            {onViewMyTickets && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  handleModalClose();
                  onViewMyTickets();
                }}
                className="text-xs font-bold"
              >
                View My Requests →
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleModalClose} className="text-xs">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subject *
            </label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary of your question or issue"
              required
              className="text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Please describe the issue or question in detail..."
              required
              rows={4}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          {/* Optional Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Optional Screenshot or Attachment
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
            />

            {attachment ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {attachment.name}
                  </span>
                  {attachment.size && (
                    <span className="text-[10px] text-slate-400">
                      ({Math.round(attachment.size / 1024)} KB)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<Paperclip className="w-3.5 h-3.5 text-slate-500" />}
                className="text-xs"
              >
                Attach File or Screenshot (Max 5MB)
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Private & Direct to Support
            </span>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleModalClose} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting || !subject.trim() || !description.trim()}
                loading={submitting}
                icon={<Send className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                Submit Ticket
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default SimpleTicketModal;
