import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import {
  Lock,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const PersonalSettings: React.FC = () => {
  const { profile, enableLock, disableLock, lockNow } = usePersonal();

  const isLockEnabled = !!profile?.isLockEnabled;

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    enableLock(pin);
    setSuccess('Personal Space lock configured successfully.');
    setIsPinModalOpen(false);
    setPin('');
    setConfirmPin('');
  };

  const handleToggleLock = () => {
    if (isLockEnabled) {
      disableLock();
      setSuccess('Personal Space lock disabled.');
    } else {
      setIsPinModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-6 h-6 text-indigo-600" />
            Personal Space Privacy & Lock Settings
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Encrypted
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure an additional security layer for your private notes, expenses, and documents.
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Lock Setting Card */}
      <Card className="p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Personal Space Lock
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Require a private PIN whenever entering your Personal Space.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleLock}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              isLockEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                isLockEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isLockEnabled && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Lock Status: <strong>Enabled</strong></span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsPinModalOpen(true)}>
                Change PIN
              </Button>
              <Button size="sm" variant="ghost" onClick={lockNow}>
                Lock Now
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Security Architecture Details */}
      <Card className="p-5 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-500" />
          Zero Data Leakage Guarantee
        </h4>
        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Owner Authorization:</strong> Every record is linked strictly to your Firebase Auth UID (`ownerId`).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>No Family Access:</strong> Family administrators and members cannot read, query, or edit your personal documents.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>
              <strong>Private Notifications:</strong> Personal reminders never send alerts to family chat or feeds.
            </span>
          </li>
        </ul>
      </Card>

      {/* PIN Setup Modal */}
      <Modal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} title="Configure Personal PIN" maxWidth="sm">
        <form onSubmit={handleSavePin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            type="password"
            label="New Private PIN (4+ digits) *"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            autoFocus
            maxLength={8}
            placeholder="••••"
          />

          <Input
            type="password"
            label="Confirm Private PIN *"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            required
            maxLength={8}
            placeholder="••••"
          />

          <p className="text-[11px] text-slate-400">
            PIN is stored locally using one-way cryptographic hashing. Never shared with servers.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPinModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save PIN
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
