import React from 'react';
import { Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy Policy & Data Security"
      subtitle="How FamilyHub protects your family records and personal data."
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto pr-1">
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
              Strict Household Isolation & Zero Public Profiling
            </h4>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
              FamilyHub enforces isolated Firebase Firestore Security Rules. Your family's data belongs solely to your household and is never sold, published, or shared with third-party advertisers.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            1. Data Ownership
          </h5>
          <p className="text-slate-600 dark:text-slate-300">
            All photos, chat messages, voice memos, calendar schedules, expense receipts, medical logs, and notes uploaded to FamilyHub belong entirely to your household. We never claim ownership of your family records.
          </p>
        </div>

        <div className="space-y-2">
          <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            2. Personal Space Privacy & PIN Protection
          </h5>
          <p className="text-slate-600 dark:text-slate-300">
            Notes and budget items stored inside your Personal Space are partitioned by your authenticated user ID. Other family members cannot view or search your private records. Optional PIN security prevents unauthorized physical access.
          </p>
        </div>

        <div className="space-y-2">
          <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            3. AI Assistant Privacy
          </h5>
          <p className="text-slate-600 dark:text-slate-300">
            AI queries sent to Google Gemini are processed securely and transiently for answering household questions, meal planning, and study guides. Private family messages and documents are never used to train public language models.
          </p>
        </div>

        <div className="space-y-2">
          <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            4. Support Ticket Privacy
          </h5>
          <p className="text-slate-600 dark:text-slate-300">
            Support tickets submitted by you reach only the central FamilyHub Support Team. Family owners or members cannot view other members' private support inquiries.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button size="sm" variant="primary" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
