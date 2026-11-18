import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useToast } from '../../context/ToastContext';
import { personalChatService } from '../../services/personalChatService';
import { User } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Search, Users, Loader2 } from 'lucide-react';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (params: {
    groupName: string;
    selectedMembers: Array<{ id: string; name: string; avatar?: string; email?: string; role?: string }>;
  }) => Promise<void>;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
}) => {
  const { user } = useAuth();
  const { members } = useFamily();
  const { showError, showSuccess } = useToast();

  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<
    Record<string, { id: string; name: string; avatar?: string; email?: string; role?: string }>
  >({});
  const [directoryMatches, setDirectoryMatches] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setSearchQuery('');
      setSelectedMap({});
      setDirectoryMatches([]);
    }
  }, [isOpen]);

  const eligibleMembers = useMemo(() => {
    if (!user) return [];
    return members.filter((m) => {
      const mId = m.userId || m.id;
      if (!mId || mId === user.id) return false;
      if (m.userEmail && user.email && m.userEmail.toLowerCase() === user.email.toLowerCase()) return false;
      if (m.status === 'removed') return false;
      return true;
    });
  }, [members, user]);

  const filteredFamilyMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eligibleMembers;
    return eligibleMembers.filter(
      (m) =>
        (m.userName || '').toLowerCase().includes(q) ||
        (m.userEmail || '').toLowerCase().includes(q)
    );
  }, [eligibleMembers, searchQuery]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const q = searchQuery.trim();
    if (q.length < 3) {
      setDirectoryMatches([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await personalChatService.findUsersByPhoneOrEmail(q, user.id);
        if (!cancelled) {
          const familyIds = new Set(eligibleMembers.map((m) => m.userId || m.id));
          setDirectoryMatches(res.filter((u) => !familyIds.has(u.id)));
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, isOpen, user?.id, eligibleMembers]);

  const toggleMember = (item: { id: string; name: string; avatar?: string; email?: string; role?: string }) => {
    setSelectedMap((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return next;
    });
  };

  const selectedCount = Object.keys(selectedMap).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showError('Please enter a group name.');
      return;
    }
    if (selectedCount === 0) {
      showError('Please select at least one member.');
      return;
    }

    setCreating(true);
    try {
      await onCreateGroup({
        groupName: groupName.trim(),
        selectedMembers: Object.values(selectedMap),
      });
      showSuccess('Group created');
      onClose();
    } catch (err: any) {
      showError(err?.message || 'Could not create group.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !creating && onClose()} title="New Group" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Group Subject
          </label>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Add Participants ({selectedCount} selected)
            </label>
          </div>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone or email..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            {filteredFamilyMembers.map((m) => {
              const mId = m.userId || m.id;
              const checked = Boolean(selectedMap[mId]);
              return (
                <label
                  key={m.id}
                  className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Avatar src={m.userPhoto} name={m.userName || 'Member'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {m.userName || 'Family Member'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate capitalize">
                        {m.role || 'Member'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggleMember({
                        id: mId,
                        name: m.userName || 'Family Member',
                        avatar: m.userPhoto,
                        email: m.userEmail,
                        role: m.role,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              );
            })}

            {searching && (
              <div className="p-2.5 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching directory...</span>
              </div>
            )}

            {directoryMatches.map((u) => {
              const checked = Boolean(selectedMap[u.id]);
              return (
                <label
                  key={u.id}
                  className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Avatar src={u.avatar || u.profileImage} name={u.name || 'User'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {u.name || u.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {u.phone || u.email}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggleMember({
                        id: u.id,
                        name: u.name || u.fullName || 'FamilyHub User',
                        avatar: u.avatar || u.profileImage,
                        email: u.email,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              );
            })}

            {filteredFamilyMembers.length === 0 && directoryMatches.length === 0 && !searching && (
              <p className="p-4 text-xs text-slate-400 text-center">No contacts found.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={creating}
            disabled={!groupName.trim() || selectedCount === 0}
          >
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
