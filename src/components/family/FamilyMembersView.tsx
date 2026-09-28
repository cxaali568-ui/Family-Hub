import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import {
  Users,
  UserPlus,
  Shield,
  Phone,
  Mail,
  Calendar,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  UserCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { FamilyMember, Role, FamilyInvite } from '../../types';

export const FamilyMembersView: React.FC = () => {
  const {
    currentFamily,
    members,
    familyRole,
    familyPermissions,
    generateInvite,
    updateMemberRole,
    removeMember,
  } = useFamily();
  const { user: currentUser } = useAuth();

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<FamilyInvite | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Role change modal state
  const [roleModalMember, setRoleModalMember] = useState<FamilyMember | null>(null);
  const [targetRole, setTargetRole] = useState<Role>('member');
  const [roleLoading, setRoleLoading] = useState(false);

  // Remove confirmation modal state
  const [removeModalMember, setRemoveModalMember] = useState<FamilyMember | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Member inspect profile modal
  const [inspectedMember, setInspectedMember] = useState<FamilyMember | null>(null);

  const handleGenerateInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      const inv = await generateInvite(inviteRole, inviteEmail || undefined);
      setGeneratedInvite(inv);
    } catch (err: any) {
      alert(err?.message || 'Could not generate invite code.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRoleChangeSubmit = async () => {
    if (!roleModalMember) return;
    setRoleLoading(true);
    try {
      await updateMemberRole(roleModalMember.userId, targetRole);
      setRoleModalMember(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update member role.');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRemoveMemberSubmit = async () => {
    if (!removeModalMember) return;
    setRemoveLoading(true);
    try {
      await removeMember(
        removeModalMember.userId,
        removeModalMember.userName || 'Member'
      );
      setRemoveModalMember(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove member.');
    } finally {
      setRemoveLoading(false);
    }
  };

  if (!currentFamily) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active family space loaded.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Family Profile Header */}
      <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            src={currentFamily.photo || currentFamily.avatar}
            name={currentFamily.name}
            size="xl"
            className="ring-4 ring-indigo-500/10 shadow-sm shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {currentFamily.name}
              </h1>
              <Badge variant="primary">Active Household</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>{members.length} members</span>
              <span>•</span>
              <span>Created {new Date(currentFamily.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span>•</span>
              <span>Your Role: <strong className="uppercase text-indigo-600 dark:text-indigo-400">{familyRole || 'Member'}</strong></span>
            </p>
          </div>
        </div>

        {familyPermissions.canInvite && (
          <Button
            size="sm"
            onClick={() => {
              setGeneratedInvite(null);
              setInviteEmail('');
              setIsInviteModalOpen(true);
            }}
            icon={<UserPlus className="w-4 h-4" />}
            className="shrink-0"
          >
            Invite Member
          </Button>
        )}
      </div>

      {/* Member List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Family Members ({members.length})
          </h2>
          <span className="text-xs text-slate-400">
            Real-time Firestore synchronization
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map(member => {
            const isMe = member.userId === currentUser?.id;
            const canManageThisUser =
              (familyPermissions.isOwner || (familyPermissions.isAdmin && member.role === 'member')) && !isMe;

            return (
              <Card
                key={member.id}
                className={`p-4 transition-all ${
                  isMe ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => setInspectedMember(member)}
                    className="flex items-center gap-3 cursor-pointer group flex-1"
                  >
                    <Avatar
                      src={member.userPhoto}
                      name={member.userName || 'Member'}
                      size="lg"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">
                          {member.userName || 'Family Member'}
                        </h3>
                        {isMe && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-600 text-white rounded-full">
                            You
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            member.role === 'owner'
                              ? 'primary'
                              : member.role === 'admin'
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {member.role.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          Joined {new Date(member.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions dropdown/buttons if allowed */}
                  {canManageThisUser && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setTargetRole(member.role);
                          setRoleModalMember(member);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Change Member Role"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setRemoveModalMember(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {member.userEmail && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{member.userEmail}</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium">Active Member</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* --- Invite Member Modal --- */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Family Member"
        subtitle={`Generate a secure invitation code for ${currentFamily.name}.`}
      >
        {!generatedInvite ? (
          <form onSubmit={handleGenerateInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assign Role
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="member">Family Member (Standard)</option>
                <option value="admin">Family Admin (Can invite & manage shared data)</option>
              </select>
            </div>

            <Input
              label="Recipient Email (optional note)"
              placeholder="e.g. member@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={inviteLoading}>
                Generate Secure Code
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center space-y-2">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                Share this unguessable code with your family member:
              </p>
              <div className="text-2xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider py-1">
                {generatedInvite.inviteCode}
              </div>
              <p className="text-[11px] text-slate-400">
                Valid for 7 days • Role: <strong className="uppercase">{generatedInvite.role}</strong>
              </p>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleCopyCode}
              className="w-full font-bold"
              icon={copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            >
              {copiedCode ? 'Copied to Clipboard!' : 'Copy Invitation Code'}
            </Button>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsInviteModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- Change Role Modal --- */}
      <Modal
        isOpen={!!roleModalMember}
        onClose={() => setRoleModalMember(null)}
        title="Change Member Role"
        subtitle={`Update permissions for ${roleModalMember?.userName || 'Member'}.`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Role
            </label>
            <select
              value={targetRole}
              onChange={e => setTargetRole(e.target.value as Role)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Member — Standard access to Chat, Plans, and Notes</option>
              <option value="admin">Admin — Can invite members and manage shared content</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRoleModalMember(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRoleChangeSubmit} loading={roleLoading}>
              Save Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- Remove Member Confirmation Modal --- */}
      <Modal
        isOpen={!!removeModalMember}
        onClose={() => setRemoveModalMember(null)}
        title="Remove Member"
        subtitle="Confirm deactivation of family membership."
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Remove {removeModalMember?.userName || 'this member'} from {currentFamily.name}?
              </p>
              <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                This will deactivate their access to this family space. Their global account and personal vault will NOT be deleted.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRemoveModalMember(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveMemberSubmit}
              loading={removeLoading}
            >
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- Member Profile Details View Modal --- */}
      <Modal
        isOpen={!!inspectedMember}
        onClose={() => setInspectedMember(null)}
        title="Family Member Profile"
      >
        {inspectedMember && (
          <div className="space-y-4 text-center">
            <Avatar
              src={inspectedMember.userPhoto}
              name={inspectedMember.userName || 'Member'}
              size="xl"
              className="mx-auto shadow-md ring-4 ring-indigo-500/10"
            />
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {inspectedMember.userName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{inspectedMember.userEmail}</p>
              <div className="mt-2">
                <Badge variant={inspectedMember.role === 'owner' ? 'primary' : 'secondary'}>
                  {inspectedMember.role.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Family Joined Date:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(inspectedMember.joinedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Membership Status:</span>
                <span className="font-semibold text-emerald-600 capitalize">
                  {inspectedMember.status}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/50 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Strict Privacy Rule: Personal space notes and expenses are completely isolated and never exposed.</span>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setInspectedMember(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
