import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Heart, PlusCircle, Users, ArrowRight, Shield, Check, AlertCircle, LogOut } from 'lucide-react';
import { FamilyInvite } from '../../types';

interface OnboardingViewProps {
  onCancel?: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onCancel }) => {
  const { user, logout } = useAuth();
  const { currentFamily, createFamily, inspectInviteCode, joinFamilyWithCode } = useFamily();
  const { t } = useLanguage();

  const [mode, setMode] = useState<'welcome' | 'create' | 'join'>('welcome');

  // Create state
  const [familyName, setFamilyName] = useState('');
  const [familyPhoto, setFamilyPhoto] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join state
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [inspectedInvite, setInspectedInvite] = useState<FamilyInvite | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!familyName.trim()) {
      setCreateError('Please enter a family name.');
      return;
    }

    setCreateLoading(true);
    try {
      await createFamily(familyName.trim(), familyPhoto.trim() || undefined);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create family space. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInspectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!inviteCodeInput.trim()) {
      setJoinError('Please enter the family invitation code.');
      return;
    }

    setJoinLoading(true);
    try {
      const invite = await inspectInviteCode(inviteCodeInput.trim());
      setInspectedInvite(invite);
    } catch (err: any) {
      setJoinError(err?.message || 'Invalid or expired invitation code.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!inspectedInvite) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      await joinFamilyWithCode(inspectedInvite.inviteCode);
    } catch (err: any) {
      setJoinError(err?.message || 'Failed to join family.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white mb-1">
            <Heart className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            FamilyHub
          </h1>
          <p className="text-xs text-indigo-200">
            Signed in as <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10">
          {mode === 'welcome' && (
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  Welcome to FamilyHub 👋
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Let's get your family space ready. You can create a new family for your household or join an existing one using an invitation code.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setMode('create')}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-indigo-600/30 hover:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 hover:scale-[1.02] transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold">Create a Family</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Start a new household as the Owner
                  </p>
                </button>

                <button
                  onClick={() => setMode('join')}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 hover:scale-[1.02] transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold">Join a Family</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Use an invitation code (e.g. FAM-8K4P-29XQ)
                  </p>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {currentFamily && onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ← Back to {currentFamily.name}
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Create Your Family Space
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  You will be the family Owner with full administrative permissions.
                </p>
              </div>

              {createError && (
                <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <Input
                label="Family Name"
                placeholder="e.g. The Khan Household"
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Family Photo / Cover URL (optional)"
                placeholder="https://..."
                value={familyPhoto}
                onChange={e => setFamilyPhoto(e.target.value)}
              />

              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-xs text-indigo-900 dark:text-indigo-300">
                ✨ After creation, you can invite your spouse, children, and parents with a secure invitation code.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setCreateError('');
                    setMode('welcome');
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={createLoading}
                  className="flex-1 font-bold"
                >
                  Create Family
                </Button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Join an Existing Family
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter the invitation code provided by your family admin.
                </p>
              </div>

              {joinError && (
                <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              {!inspectedInvite ? (
                <form onSubmit={handleInspectCode} className="space-y-4">
                  <Input
                    label="Enter Invitation Code"
                    placeholder="FAM-XXXX-XXXX"
                    value={inviteCodeInput}
                    onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                    required
                    autoFocus
                  />

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setJoinError('');
                        setMode('welcome');
                      }}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      loading={joinLoading}
                      className="flex-1 font-bold"
                    >
                      Check Code
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center space-y-2">
                    <Avatar
                      src={inspectedInvite.familyPhoto}
                      name={inspectedInvite.familyName}
                      size="lg"
                      className="mx-auto shadow-sm"
                    />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {inspectedInvite.familyName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Invited by <strong>{inspectedInvite.invitedByName || 'Family Admin'}</strong>
                      </p>
                      <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 uppercase">
                        Role: {inspectedInvite.role}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-center text-slate-600 dark:text-slate-300">
                    Would you like to join <strong>{inspectedInvite.familyName}</strong> as a {inspectedInvite.role}?
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setInspectedInvite(null)}
                      className="flex-1"
                    >
                      Change Code
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleConfirmJoin}
                      loading={joinLoading}
                      className="flex-1 font-bold"
                    >
                      Confirm & Join
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
