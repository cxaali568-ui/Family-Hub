import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, Family, FamilyMember } from '../../types';
import { collection, addDoc, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { familyService } from '../../services/familyService';
import { HelpCircle, Send, CheckCircle2, AlertCircle, Shield, RefreshCw } from 'lucide-react';

interface ForgotCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onReconnected?: (family: Family, membership: FamilyMember) => void;
}

export const ForgotCodeModal: React.FC<ForgotCodeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onReconnected,
}) => {
  const [familyName, setFamilyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingFound, setExistingFound] = useState<Array<{ family: Family; membership: FamilyMember }>>([]);

  const handleCheckExisting = async () => {
    if (!currentUser) return;
    setCheckingExisting(true);
    setErrorMessage(null);
    try {
      const userFams = await familyService.getUserFamilies(currentUser.id);
      if (userFams.length > 0) {
        setExistingFound(userFams);
      } else {
        setErrorMessage('No existing active family membership found for this account. Please submit a request below to your Family Admin.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not verify existing memberships.');
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!familyName.trim() && !adminEmail.trim()) {
      setErrorMessage('Please provide either your Family Name or your Family Admin’s email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const now = new Date().toISOString();

      // 1. Check if an admin with that email exists to link directly
      let matchedFamilyId: string | null = null;
      let matchedAdminId: string | null = null;

      if (adminEmail.trim()) {
        try {
          const qUsers = query(collection(db, 'users'), where('email', '==', adminEmail.trim().toLowerCase()));
          const userSnap = await getDocs(qUsers);
          if (!userSnap.empty) {
            matchedAdminId = userSnap.docs[0].id;
            // Lookup families created by this admin
            const qFam = query(collection(db, 'families'), where('createdBy', '==', matchedAdminId));
            const famSnap = await getDocs(qFam);
            if (!famSnap.empty) {
              matchedFamilyId = famSnap.docs[0].id;
            }
          }
        } catch {
          // Non-fatal lookup fallback
        }
      }

      // 2. Create the recovery request document in /familyJoinRequests
      const reqRef = doc(collection(db, 'familyJoinRequests'));
      await setDoc(reqRef, {
        id: reqRef.id,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.fullName || 'Family Member',
        userEmail: currentUser.email,
        targetFamilyName: familyName.trim() || 'My Family',
        targetAdminEmail: adminEmail.trim() ? adminEmail.trim().toLowerCase() : null,
        familyId: matchedFamilyId,
        note: note.trim() || 'Forgot family invitation code. Please provide access or new code.',
        status: 'pending',
        createdAt: now,
      });

      // 3. If matched admin found, send them an in-app notification
      if (matchedAdminId) {
        try {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            id: notifRef.id,
            recipientUserId: matchedAdminId,
            familyId: matchedFamilyId,
            type: 'code_request',
            title: 'Family Code Request',
            message: `${currentUser.name} (${currentUser.email}) has requested the joining code for your family space.`,
            relatedEntityType: 'familyJoinRequest',
            relatedEntityId: reqRef.id,
            createdAt: now,
            readAt: null,
          });
        } catch (notifErr) {
          console.warn('Could not post admin notification:', notifErr);
        }
      }

      setSuccessMessage(
        'Recovery request securely sent! Your Family Owner / Admin has been notified. They can approve your access or share your code directly.'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send recovery request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Forgot Family Code? Member Recovery"
      subtitle="Safely reconnect with your family or request assistance from your Family Owner/Admin."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Security Notice */}
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl flex items-start gap-2.5">
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
            <p className="font-bold">Zero-Leakage Privacy Policy</p>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
              For security, family invitation codes are never publicly revealed. If you are already an authorized member, you can restore your connection below, or request your Family Admin to share the code.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Existing family quick reconnect */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Already registered in a family?
              </p>
              <p className="text-[11px] text-slate-500">
                Check if your account is already authorized to enter a family space.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckExisting}
              loading={checkingExisting}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Check My Access
            </Button>
          </div>

          {existingFound.length > 0 && (
            <div className="pt-2 space-y-2 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ✓ Found authorized family membership:
              </p>
              {existingFound.map(({ family, membership }) => (
                <div
                  key={family.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {family.name}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Role: {membership.role.toUpperCase()}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (onReconnected) {
                        onReconnected(family, membership);
                      }
                      onClose();
                    }}
                    className="text-xs font-bold"
                  >
                    Enter Space
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request assistance form */}
        {!successMessage && (
          <form onSubmit={handleSubmitRequest} className="space-y-3 pt-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Or request help from your Family Admin:
            </p>

            <Input
              label="Family Name (e.g. Khan House)"
              placeholder="Enter your family space name"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />

            <Input
              label="Family Owner / Admin's Email (Optional)"
              type="email"
              placeholder="admin@example.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Message / Details for Admin
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Hi, this is Sarah. I lost my family code after resetting my phone."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={loading}
                icon={<Send className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                Send Request to Admin
              </Button>
            </div>
          </form>
        )}

        {successMessage && (
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={onClose} size="sm">
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
