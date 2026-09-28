import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Input } from '../ui/Input';
import { childService } from '../../services/childService';
import {
  Child,
  ChildGuardian,
  SchoolFeePayment,
  ChildDocument,
  User,
} from '../../types';
import {
  GraduationCap,
  DollarSign,
  PhoneCall,
  User as UserIcon,
  Shield,
  FileText,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  Download,
  AlertTriangle,
  Upload,
  Check,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface ChildDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child | null;
  currentUser: User;
  canManage: boolean;
  onEdit: (child: Child) => void;
  onDelete: (child: Child) => Promise<void>;
}

export const ChildDetailModal: React.FC<ChildDetailModalProps> = ({
  isOpen,
  onClose,
  child,
  currentUser,
  canManage,
  onEdit,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'school' | 'fees' | 'guardians' | 'documents' | 'notes'>('profile');

  // Subcollections data
  const [guardians, setGuardians] = useState<ChildGuardian[]>([]);
  const [fees, setFees] = useState<SchoolFeePayment[]>([]);
  const [documents, setDocuments] = useState<ChildDocument[]>([]);

  // Fee payment modal
  const [isAddFeeModalOpen, setIsAddFeeModalOpen] = useState(false);
  const [feeMonth, setFeeMonth] = useState('September');
  const [feeYear, setFeeYear] = useState(new Date().getFullYear());
  const [feeAmount, setFeeAmount] = useState<number | string>('');
  const [feeStatus, setFeeStatus] = useState<SchoolFeePayment['status']>('Paid');
  const [feePaymentDate, setFeePaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [feePayer, setFeePayer] = useState(currentUser.name);
  const [feeNotes, setFeeNotes] = useState('');
  const [feeLoading, setFeeLoading] = useState(false);

  // Add Guardian modal
  const [isAddGuardianOpen, setIsAddGuardianOpen] = useState(false);
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Mother');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianPrimary, setGuardianPrimary] = useState(false);
  const [guardianLoading, setGuardianLoading] = useState(false);

  // Document upload state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<ChildDocument['docType']>('result_card');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Subscriptions to guardians, fees, documents
  useEffect(() => {
    if (!child?.id || !child.familyId) return;

    const unsubGuardians = childService.subscribeGuardians(
      child.familyId,
      child.id,
      (list) => setGuardians(list)
    );

    const unsubFees = childService.subscribeFeePayments(
      child.familyId,
      child.id,
      (list) => setFees(list)
    );

    const unsubDocs = childService.subscribeChildDocuments(
      child.familyId,
      child.id,
      (list) => setDocuments(list)
    );

    return () => {
      unsubGuardians();
      unsubFees();
      unsubDocs();
    };
  }, [child?.id, child?.familyId]);

  if (!child) return null;

  // Calculate age
  let ageString = '';
  if (child.dateOfBirth) {
    const dob = new Date(child.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const diffMs = Date.now() - dob.getTime();
      const ageYears = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      ageString = `${ageYears} years old`;
    }
  }

  const handleAddFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeLoading(true);
    try {
      await childService.addFeePayment(
        child.familyId,
        child.id,
        {
          month: feeMonth,
          year: Number(feeYear),
          amount: Number(feeAmount) || child.totalMonthlyFee,
          paymentDate: feePaymentDate,
          paidBy: feePayer,
          status: feeStatus,
          notes: feeNotes.trim() || undefined,
        },
        currentUser
      );
      setIsAddFeeModalOpen(false);
      setFeeNotes('');
    } catch (err: any) {
      alert(err?.message || 'Could not record fee payment.');
    } finally {
      setFeeLoading(false);
    }
  };

  const handleAddGuardianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianName.trim()) return;
    setGuardianLoading(true);
    try {
      await childService.addGuardian(child.familyId, child.id, {
        memberName: guardianName.trim(),
        relationship: guardianRelation,
        phone: guardianPhone.trim() || undefined,
        isPrimary: guardianPrimary,
      });
      setIsAddGuardianOpen(false);
      setGuardianName('');
      setGuardianPhone('');
    } catch (err: any) {
      alert(err?.message || 'Could not add guardian.');
    } finally {
      setGuardianLoading(false);
    }
  };

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a document or photo file.');
      return;
    }
    setDocUploading(true);
    try {
      await childService.uploadChildDocument({
        familyId: child.familyId,
        childId: child.id,
        file: selectedFile,
        title: docTitle.trim() || selectedFile.name,
        docType,
        currentUser,
      });
      setIsDocModalOpen(false);
      setSelectedFile(null);
      setDocTitle('');
    } catch (err: any) {
      alert(err?.message || 'Could not upload document.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleDeleteChildSubmit = async () => {
    setDeleteLoading(true);
    try {
      await onDelete(child);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete child record.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Child Profile & Education"
        maxWidth="lg"
      >
      <div className="space-y-4">
        {/* Child Header Card */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Avatar
            src={child.photo}
            name={child.fullName}
            size="xl"
            className="ring-4 ring-indigo-500/20 shadow-md shrink-0"
          />

          <div className="text-center sm:text-left flex-1 overflow-hidden">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                {child.fullName}
              </h3>
              {child.nickname && (
                <span className="text-xs font-semibold text-slate-400">
                  ("{child.nickname}")
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
              <Badge variant="primary">{child.relationship}</Badge>
              {ageString && <Badge variant="secondary">{ageString}</Badge>}
              {child.bloodGroup && (
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                  {child.bloodGroup}
                </span>
              )}
            </div>

            {child.schoolName && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 flex items-center justify-center sm:justify-start gap-1.5 font-medium truncate">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{child.classGrade || 'Class'} • {child.schoolName}</span>
              </p>
            )}
          </div>

          <div className="shrink-0 text-center sm:text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Monthly Fee</p>
            <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
              Rs. {child.totalMonthlyFee.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Profile & Emergency
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'school'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            School & Teacher
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'fees'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Fees & History ({fees.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guardians')}
            className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'guardians'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Guardians ({guardians.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Documents ({documents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Notes
          </button>
        </div>

        {/* TAB: PROFILE & EMERGENCY */}
        {activeTab === 'profile' && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Gender</span>
                <span className="font-semibold capitalize">{child.gender}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Date of Birth</span>
                <span className="font-semibold">
                  {new Date(child.dateOfBirth).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Blood Group</span>
                <span className="font-semibold">{child.bloodGroup || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Child Phone / Device</span>
                {child.phone ? (
                  <a href={`tel:${child.phone}`} className="font-bold text-indigo-600 hover:underline">
                    {child.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">None</span>
                )}
              </div>
            </div>

            {/* Emergency Contact Block */}
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                  Emergency Contact
                </h5>
                {child.emergencyContactPhone && (
                  <a
                    href={`tel:${child.emergencyContactPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Call Now
                  </a>
                )}
              </div>

              <div className="text-xs text-amber-950 dark:text-amber-200 space-y-1">
                <p>
                  <strong>{child.emergencyContactName || 'Family Contact'}</strong>
                  {child.emergencyContactRelation && ` (${child.emergencyContactRelation})`}
                </p>
                <p className="font-mono">{child.emergencyContactPhone || 'No phone set'}</p>
                {child.emergencyContactAltPhone && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Alt Phone: {child.emergencyContactAltPhone}
                  </p>
                )}
                {child.emergencyNotes && (
                  <p className="text-[11px] italic mt-1 text-slate-600 dark:text-slate-300">
                    Notes: {child.emergencyNotes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: SCHOOL & TEACHER */}
        {activeTab === 'school' && (
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">School Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{child.schoolName || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Campus / Address</span>
                <span>{child.schoolAddress || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Class & Section</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {child.classGrade || 'N/A'} {child.section && `(Sec ${child.section})`}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Roll No / Admission ID</span>
                <span className="font-mono">
                  {child.rollNumber ? `Roll #${child.rollNumber}` : ''} {child.admissionNumber ? `• Adm: ${child.admissionNumber}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">School Timing</span>
                <span>{child.schoolTiming || 'Standard'}</span>
              </div>
            </div>

            {/* Teacher Details Block with CALL TEACHER button */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-indigo-900 dark:text-indigo-200">
                    Teacher / Class In-charge
                  </h5>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                    {child.teacherName || 'Teacher details not added'}
                  </p>
                </div>
                {child.teacherPhone && (
                  <a
                    href={`tel:${child.teacherPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Call Teacher
                  </a>
                )}
              </div>

              {child.teacherPhone && (
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                  Phone: <strong>{child.teacherPhone}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB: FEES & PAYMENT HISTORY */}
        {activeTab === 'fees' && (
          <div className="space-y-4 pt-1">
            {/* Fee Breakdown Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span>Monthly School Fee Structure</span>
                <span className="text-emerald-600 font-extrabold text-sm">
                  Total: Rs. {child.totalMonthlyFee.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Tuition Fee</span>
                <span>Rs. {child.tuitionFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Transport / Van</span>
                <span>Rs. {child.transportFee.toLocaleString()}</span>
              </div>
              {child.otherFee > 0 && (
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Other Activities</span>
                  <span>Rs. {child.otherFee.toLocaleString()}</span>
                </div>
              )}
              {child.feeDueDate && (
                <p className="text-[11px] text-amber-600 font-medium pt-1">
                  Due date: {child.feeDueDate}
                </p>
              )}
            </div>

            {/* Payment History Header */}
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Fee Payment History
              </h5>
              {canManage && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setFeeAmount(child.totalMonthlyFee);
                    setIsAddFeeModalOpen(true);
                  }}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Record Payment
                </Button>
              )}
            </div>

            {fees.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                No fee payment records recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fees.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {f.month} {f.year}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            f.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : f.status === 'Partial'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Paid by {f.paidBy} on {f.paymentDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        Rs. {f.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: GUARDIANS */}
        {activeTab === 'guardians' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Parents & Guardians
              </h5>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddGuardianOpen(true)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Guardian
                </Button>
              )}
            </div>

            {guardians.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                No guardians linked yet. Add parents or relatives who can pick up or represent the child.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {guardians.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{g.memberName}</span>
                        {g.isPrimary && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.2 rounded-full font-bold">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{g.relationship}</p>
                      {g.phone && (
                        <a href={`tel:${g.phone}`} className="text-indigo-600 font-semibold hover:underline">
                          {g.phone}
                        </a>
                      )}
                    </div>

                    {canManage && (
                      <button
                        onClick={() => childService.removeGuardian(child.familyId, child.id, g.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  School Documents & Certificates
                </h5>
                <p className="text-[10px] text-slate-400">
                  Admission forms, result cards, fee challans, certificates
                </p>
              </div>
              {canManage && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsDocModalOpen(true)}
                  icon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload File
                </Button>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                No documents uploaded yet. Keep school admission cards, certificates, and report cards safe here.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{d.title}</p>
                        <p className="text-[10px] text-slate-400">
                          {d.docType.replace('_', ' ').toUpperCase()} • {(d.fileSize / 1024).toFixed(0)} KB • Uploaded by {d.uploadedBy}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Open Document"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {canManage && (
                        <button
                          onClick={() => childService.deleteChildDocument(child.familyId, child.id, d.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: NOTES */}
        {activeTab === 'notes' && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {child.generalNotes || 'No notes added yet for this child.'}
          </div>
        )}

        {/* Delete Confirmation Box */}
        {showDeleteConfirm && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 space-y-2 animate-in fade-in">
            <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
              Permanently delete child profile for {child.fullName}?
            </p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300">
              This will remove all associated school, fee, and document records for this child.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={handleDeleteChildSubmit} loading={deleteLoading}>
                Confirm Delete
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            {canManage && !showDeleteConfirm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete Child
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onEdit(child);
                }}
                icon={<Edit2 className="w-4 h-4" />}
                className="font-bold"
              >
                Edit Child
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>

    {/* --- Nested Modal: Record Fee Payment --- */}
      <Modal
        isOpen={isAddFeeModalOpen}
        onClose={() => setIsAddFeeModalOpen(false)}
        title="Record Fee Payment"
        subtitle={`Log school fee payment for ${child.fullName}.`}
      >
        <form onSubmit={handleAddFeeSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Month</label>
              <select
                value={feeMonth}
                onChange={(e) => setFeeMonth(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5"
              >
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <Input
              label="Year"
              type="number"
              value={feeYear}
              onChange={(e) => setFeeYear(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Paid (Rs.) *"
              type="number"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              required
            />
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Status</label>
              <select
                value={feeStatus}
                onChange={(e) => setFeeStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5"
              >
                <option value="Paid">Paid in Full</option>
                <option value="Partial">Partial Payment</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              value={feePaymentDate}
              onChange={(e) => setFeePaymentDate(e.target.value)}
            />
            <Input
              label="Paid By"
              value={feePayer}
              onChange={(e) => setFeePayer(e.target.value)}
            />
          </div>

          <Input
            label="Challan / Receipt Notes (Optional)"
            placeholder="e.g. Paid via Bank Alfalah app"
            value={feeNotes}
            onChange={(e) => setFeeNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddFeeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={feeLoading}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- Nested Modal: Add Guardian --- */}
      <Modal
        isOpen={isAddGuardianOpen}
        onClose={() => setIsAddGuardianOpen(false)}
        title="Add Guardian"
        subtitle={`Add a parent or authorized guardian for ${child.fullName}.`}
      >
        <form onSubmit={handleAddGuardianSubmit} className="space-y-4">
          <Input
            label="Guardian Name *"
            placeholder="e.g. Sara Khan"
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Relationship</label>
              <select
                value={guardianRelation}
                onChange={(e) => setGuardianRelation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5"
              >
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Grandmother">Grandmother</option>
                <option value="Grandfather">Grandfather</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Legal Guardian">Legal Guardian</option>
              </select>
            </div>
            <Input
              label="Contact Phone"
              placeholder="e.g. +92 300 1234567"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimaryGuardian"
              checked={guardianPrimary}
              onChange={(e) => setGuardianPrimary(e.target.checked)}
              className="rounded text-indigo-600"
            />
            <label htmlFor="isPrimaryGuardian" className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              Mark as Primary Guardian
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddGuardianOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={guardianLoading}>
              Add Guardian
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- Nested Modal: Upload Child Document --- */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Upload Child Document"
        subtitle="Store admission documents, result cards, and fee challans securely."
      >
        <form onSubmit={handleUploadDocSubmit} className="space-y-4">
          <Input
            label="Document Title *"
            placeholder="e.g. Grade 5 Final Result Card 2026"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5"
            >
              <option value="result_card">Result Card / Marksheet</option>
              <option value="fee_receipt">Fee Receipt / Challan</option>
              <option value="admission">Admission Document</option>
              <option value="certificate">Certificate / Award</option>
              <option value="school_letter">School Letter / Notice</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Select File (PDF, Image, DOC)</label>
            <input
              ref={docFileInputRef}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setSelectedFile(f);
              }}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsDocModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={docUploading}>
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
