import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Bill, BillPayment, BillDocument, User } from '../../types';
import { billPaymentService } from '../../services/billPaymentService';
import { billDocumentService } from '../../services/billDocumentService';
import { getBillTypeIcon } from './AddBillModal';
import {
  Calendar,
  Clock,
  User as UserIcon,
  CreditCard,
  FileText,
  Paperclip,
  Download,
  Edit2,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  Plus,
  Repeat,
  DollarSign,
  Upload,
} from 'lucide-react';

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  bill: Bill | null;
  currentUser: User;
  canManage: boolean;
  onPay: (bill: Bill) => void;
  onEdit: (bill: Bill) => void;
  onCancelBill: (bill: Bill) => Promise<void>;
  currency?: string;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  isOpen,
  onClose,
  familyId,
  bill,
  currentUser,
  canManage,
  onPay,
  onEdit,
  onCancelBill,
  currency = 'PKR',
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'documents'>('details');
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [documents, setDocuments] = useState<BillDocument[]>([]);
  const [revealAccountNumber, setRevealAccountNumber] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Document Upload State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<BillDocument['docType']>('bill');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to payments & documents
  useEffect(() => {
    if (!bill?.id || !familyId) {
      setPayments([]);
      setDocuments([]);
      return;
    }

    const unsubPayments = billPaymentService.subscribePayments(familyId, bill.id, (list) => {
      setPayments(list);
    });

    const unsubDocs = billDocumentService.subscribeDocuments(familyId, bill.id, (docs) => {
      setDocuments(docs);
    });

    return () => {
      unsubPayments();
      unsubDocs();
    };
  }, [bill?.id, familyId]);

  if (!bill) return null;

  const handleCancelSubmit = async () => {
    setCancelLoading(true);
    try {
      await onCancelBill(bill);
      setShowCancelConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Could not cancel bill.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;

    setDocLoading(true);
    try {
      await billDocumentService.uploadDocument({
        familyId,
        billId: bill.id,
        file: docFile,
        title: docTitle.trim() || docFile.name,
        docType,
        currentUser,
      });
      setIsDocModalOpen(false);
      setDocFile(null);
      setDocTitle('');
    } catch (err: any) {
      alert(err?.message || 'Could not upload document.');
    } finally {
      setDocLoading(false);
    }
  };

  const getStatusBadge = (status: Bill['status']) => {
    switch (status) {
      case 'Paid':
        return <Badge variant="success">Paid</Badge>;
      case 'Partially Paid':
        return <Badge variant="warning">Partially Paid</Badge>;
      case 'Overdue':
        return <Badge variant="danger">Overdue</Badge>;
      case 'Cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="primary">Pending</Badge>;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Bill Details"
        subtitle={`${bill.providerName} • ${bill.billTypeName}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Top Summary Banner */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-2xs border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                {getBillTypeIcon(bill.billTypeIcon || bill.billTypeName)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {bill.providerName}
                  </h3>
                  {getStatusBadge(bill.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Due: <strong className="text-slate-700 dark:text-slate-200">{bill.dueDate}</strong>
                  {bill.isRecurringInstance && ' • Recurring'}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Amount</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                {bill.currency} {bill.amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Outstanding Balance Breakdown */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Paid So Far</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                {bill.currency} {(bill.paidAmount || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Remaining Due</span>
              <span
                className={`text-sm font-black ${
                  bill.remainingAmount > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {bill.currency} {(bill.remainingAmount || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 transition-colors cursor-pointer ${
                activeTab === 'details'
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Account & Info
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>Payment History</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">
                {payments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>Documents</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">
                {documents.length}
              </span>
            </button>
          </div>

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              {/* Account Number (Section 63: Masked by default) */}
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Account / Consumer No.</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {revealAccountNumber
                      ? bill.accountNumberFull || bill.accountNumberMasked || 'Not set'
                      : bill.accountNumberMasked || 'Not set'}
                  </span>
                  {bill.accountNumberFull && canManage && (
                    <button
                      type="button"
                      onClick={() => setRevealAccountNumber(!revealAccountNumber)}
                      className="text-slate-400 hover:text-indigo-600"
                      title={revealAccountNumber ? 'Hide' : 'Reveal full number'}
                    >
                      {revealAccountNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Reference */}
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Reference / Tariff</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {bill.referenceNumber || 'N/A'}
                </span>
              </div>

              {/* Recurrence Schedule */}
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Billing Schedule</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {bill.isRecurringInstance ? `Recurring (${bill.frequency || 'Monthly'})` : 'One-time Bill'}
                </span>
              </div>

              {/* Notes */}
              {bill.notes && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-1">Notes</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {bill.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No payments recorded for this bill yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{bill.currency} {p.amount.toLocaleString()}</span>
                          <span className="text-[10px] font-normal text-slate-400">({p.paymentMethod})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Paid by {p.paidByName} on {p.paymentDate}
                          {p.referenceNumber && ` • Ref: ${p.referenceNumber}`}
                        </p>
                      </div>

                      {p.receiptUrl && (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={p.receiptFileName || 'receipt'}
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Receipt
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Attached Invoices & Receipts
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsDocModalOpen(true)}
                  icon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload File
                </Button>
              </div>

              {documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No documents attached yet. You can attach PDF bills or paper invoice scans.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{d.title}</p>
                          <span className="text-[10px] text-slate-400">
                            Uploaded {new Date(d.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} by {d.uploadedBy}
                          </span>
                        </div>
                      </div>

                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cancel Confirmation Box */}
          {showCancelConfirm && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-200">
                    Cancel this bill?
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    This bill will be marked as Cancelled and will not count towards your pending or overdue obligations.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setShowCancelConfirm(false)} disabled={cancelLoading}>
                  Keep Bill
                </Button>
                <Button variant="danger" size="sm" onClick={handleCancelSubmit} loading={cancelLoading}>
                  Yes, Cancel Bill
                </Button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              {canManage && bill.status !== 'Cancelled' && !showCancelConfirm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Cancel Bill
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>

              {canManage && bill.status !== 'Cancelled' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEdit(bill);
                  }}
                  icon={<Edit2 className="w-4 h-4" />}
                >
                  Edit
                </Button>
              )}

              {bill.status !== 'Paid' && bill.status !== 'Cancelled' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onPay(bill);
                  }}
                  icon={<DollarSign className="w-4 h-4" />}
                  className="font-bold"
                >
                  Pay Bill
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Upload Bill Document"
        subtitle="Attach bill invoice, statement, or official receipt."
        maxWidth="sm"
      >
        <form onSubmit={handleUploadDocSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Title
            </label>
            <input
              type="text"
              placeholder="e.g. October 2026 LESCO Electricity Bill"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Type
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            >
              <option value="bill">Official Bill / Invoice</option>
              <option value="receipt">Payment Receipt / Confirmation</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div>
            <input
              ref={docFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setDocFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => docFileInputRef.current?.click()}
              icon={<Upload className="w-3.5 h-3.5" />}
            >
              {docFile ? docFile.name : 'Choose File (PDF, Image)'}
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={docLoading} disabled={!docFile}>
              Upload
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
