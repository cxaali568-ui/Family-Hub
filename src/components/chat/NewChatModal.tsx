import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useToast } from '../../context/ToastContext';
import { personalChatService } from '../../services/personalChatService';
import { User } from '../../types';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import {
  Search,
  Users,
  Smartphone,
  Upload,
  MessageCircle,
  Loader2,
  UserPlus,
  Phone,
  Mail,
  X,
  Share2,
} from 'lucide-react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChatWithMember: (member: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
    role?: string;
    isExternal?: boolean;
  }) => void;
  onOpenNewGroup: () => void;
}

function parseVcfContent(vcfText: string): Array<{ name: string; phones: string[]; emails: string[] }> {
  const cards = vcfText.split(/BEGIN:VCARD/i).slice(1);
  const parsed: Array<{ name: string; phones: string[]; emails: string[] }> = [];

  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    let name = '';
    const phones: string[] = [];
    const emails: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (/^FN[:;]/i.test(line)) {
        name = line.replace(/^FN[^:]*:/i, '').trim();
      } else if (/^TEL/i.test(line)) {
        const val = line.replace(/^TEL[^:]*:/i, '').trim();
        if (val) phones.push(val);
      } else if (/^EMAIL/i.test(line)) {
        const val = line.replace(/^EMAIL[^:]*:/i, '').trim();
        if (val) emails.push(val);
      }
    }

    if (name || phones.length > 0 || emails.length > 0) {
      parsed.push({
        name: name || phones[0] || emails[0] || 'Contact',
        phones,
        emails,
      });
    }
  }

  return parsed;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onStartChatWithMember,
  onOpenNewGroup,
}) => {
  const { user } = useAuth();
  const { members, currentFamily } = useFamily();
  const { showError, showSuccess } = useToast();

  const [query, setQuery] = useState('');
  const [directoryResults, setDirectoryResults] = useState<User[]>([]);
  const [searchingDirectory, setSearchingDirectory] = useState(false);

  const [syncingContacts, setSyncingContacts] = useState(false);
  const [matchedDeviceContacts, setMatchedDeviceContacts] = useState<
    Array<{ contactName: string; user: User }>
  >([]);
  const [unmatchedContacts, setUnmatchedContacts] = useState<
    Array<{ name: string; phone?: string; email?: string }>
  >([]);
  const [deviceSyncDone, setDeviceSyncDone] = useState(false);

  const vcfInputRef = useRef<HTMLInputElement>(null);

  const supportsContactPicker =
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof (navigator as any).contacts?.select === 'function';

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setDirectoryResults([]);
    }
  }, [isOpen]);

  const eligibleFamilyMembers = useMemo(() => {
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
    const q = query.trim().toLowerCase();
    if (!q) return eligibleFamilyMembers;
    return eligibleFamilyMembers.filter(
      (m) =>
        (m.userName || '').toLowerCase().includes(q) ||
        (m.userEmail || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q)
    );
  }, [eligibleFamilyMembers, query]);

  // Search registered FamilyHub users globally by phone number, email, or name
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setDirectoryResults([]);
      setSearchingDirectory(false);
      return;
    }

    let cancelled = false;
    setSearchingDirectory(true);
    const timer = setTimeout(async () => {
      try {
        const found = await personalChatService.findUsersByPhoneOrEmail(trimmed, user.id);
        if (!cancelled) {
          const familyMemberIds = new Set(eligibleFamilyMembers.map((m) => m.userId || m.id));
          setDirectoryResults(found.filter((u) => !familyMemberIds.has(u.id)));
        }
      } finally {
        if (!cancelled) setSearchingDirectory(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen, user?.id, eligibleFamilyMembers]);

  const handlePickDeviceContacts = async () => {
    if (!user?.id) return;
    if (!supportsContactPicker) {
      vcfInputRef.current?.click();
      return;
    }

    setSyncingContacts(true);
    try {
      const contacts = await (navigator as any).contacts.select(['name', 'email', 'tel'], {
        multiple: true,
      });

      if (!Array.isArray(contacts) || contacts.length === 0) {
        setSyncingContacts(false);
        return;
      }

      const formatted = contacts.map((c: any) => ({
        name: Array.isArray(c.name) ? c.name[0] || '' : c.name || '',
        phones: Array.isArray(c.tel) ? c.tel : [],
        emails: Array.isArray(c.email) ? c.email : [],
      }));

      const res = await personalChatService.matchDeviceContacts(formatted, user.id);
      setMatchedDeviceContacts(res.matched);
      setUnmatchedContacts(res.unmatched);
      setDeviceSyncDone(true);

      if (res.matched.length > 0) {
        showSuccess(`Found ${res.matched.length} contact(s) on FamilyHub!`);
      } else {
        showSuccess(`Checked ${formatted.length} contact(s). You can invite them below.`);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        showError('Could not access device contacts. You can search by phone/email or import a .vcf file.');
      }
    } finally {
      setSyncingContacts(false);
    }
  };

  const handleVcfFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setSyncingContacts(true);
    try {
      const text = await file.text();
      const parsed = parseVcfContent(text);
      if (parsed.length === 0) {
        showError('No valid contacts found in this .vcf file.');
        return;
      }
      const res = await personalChatService.matchDeviceContacts(parsed, user.id);
      setMatchedDeviceContacts(res.matched);
      setUnmatchedContacts(res.unmatched);
      setDeviceSyncDone(true);
      showSuccess(`Checked ${parsed.length} contacts (${res.matched.length} on FamilyHub).`);
    } catch {
      showError('Failed to read contacts file.');
    } finally {
      setSyncingContacts(false);
      if (vcfInputRef.current) vcfInputRef.current.value = '';
    }
  };

  const handleInviteContact = async (contact: { name: string; phone?: string; email?: string }) => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://familyhub.app';
    const inviteCode = currentFamily?.inviteCode ? ` (Family Code: ${currentFamily.inviteCode})` : '';
    const msg = `Assalam o Alaikum ${contact.name}! Let's chat on FamilyHub: ${url}${inviteCode}`;
    const phoneDigits = personalChatService.normalizePhone(contact.phone);

    if (phoneDigits.length >= 7) {
      const waLink = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(msg)}`;
      const a = document.createElement('a');
      a.href = waLink;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
      return;
    }

    try {
      await navigator.clipboard.writeText(msg);
      showSuccess('Invite link copied!');
    } catch {
      showError('Could not copy invite.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New chat" maxWidth="md">
      <div className="space-y-3">
        {/* Search by Name, Phone Number, or Email */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone number, or email..."
            className="w-full bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-10 pr-8 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* WhatsApp-style Quick Actions: New Group & Device Contacts Sync */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewGroup();
            }}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left border border-slate-200/70 dark:border-slate-800"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">New group</p>
              <p className="text-[11px] text-slate-400 truncate">Create a private group</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handlePickDeviceContacts}
            disabled={syncingContacts}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left border border-slate-200/70 dark:border-slate-800 disabled:opacity-60"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
              {syncingContacts ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {supportsContactPicker ? 'Device Contacts' : 'Import Contacts (.vcf)'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {supportsContactPicker ? 'Find saved phone numbers' : 'Find friends from contacts'}
              </p>
            </div>
          </button>

          <input
            ref={vcfInputRef}
            type="file"
            accept=".vcf,text/vcard"
            onChange={handleVcfFileSelected}
            className="hidden"
          />
        </div>

        {/* Fallback .vcf import link if mobile picker is also present */}
        {supportsContactPicker && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => vcfInputRef.current?.click()}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Or import .vcf contacts file</span>
            </button>
          </div>
        )}

        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* 1. Directory Search Results (Phone / Email users outside family) */}
          {query.trim().length >= 3 && (
            <div>
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>FamilyHub Directory (Phone / Email)</span>
                {searchingDirectory && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
              </div>
              {!searchingDirectory && directoryResults.length === 0 ? (
                <p className="px-3.5 py-3 text-xs text-slate-400">
                  No other FamilyHub account found matching "{query.trim()}".
                </p>
              ) : (
                directoryResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onStartChatWithMember({
                        id: u.id,
                        name: u.name || u.fullName || 'FamilyHub User',
                        avatar: u.avatar || u.profileImage,
                        email: u.email,
                        phone: u.phone,
                        isExternal: true,
                      });
                      onClose();
                    }}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/50 dark:hover:bg-slate-800/70 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.avatar || u.profileImage} name={u.name || 'User'} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {u.name || u.fullName}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                          {u.phone && (
                            <span className="inline-flex items-center gap-0.5">
                              <Phone className="w-3 h-3" /> {u.phone}
                            </span>
                          )}
                          {u.email && (
                            <span className="inline-flex items-center gap-0.5 truncate">
                              <Mail className="w-3 h-3" /> {u.email}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1 shrink-0">
                      <MessageCircle className="w-3 h-3" /> Chat
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 2. Matched Device Contacts on FamilyHub */}
          {deviceSyncDone && (
            <div>
              <div className="px-3.5 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Saved Contacts on FamilyHub ({matchedDeviceContacts.length})
              </div>
              {matchedDeviceContacts.map(({ contactName, user: u }) => (
                <div
                  key={u.id}
                  onClick={() => {
                    onStartChatWithMember({
                      id: u.id,
                      name: u.name || contactName,
                      avatar: u.avatar || u.profileImage,
                      email: u.email,
                      phone: u.phone,
                      isExternal: true,
                    });
                    onClose();
                  }}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/50 dark:hover:bg-slate-800/70 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={u.avatar || u.profileImage} name={u.name || contactName} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {u.name || contactName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {u.phone || u.email}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shrink-0">
                    Chat
                  </span>
                </div>
              ))}

              {unmatchedContacts.length > 0 && (
                <>
                  <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Invite to FamilyHub ({unmatchedContacts.length})
                  </div>
                  {unmatchedContacts.slice(0, 15).map((c, idx) => (
                    <div
                      key={`${c.name}-${idx}`}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {c.phone || c.email || 'Contact'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInviteContact(c)}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                      >
                        <Share2 className="w-3 h-3" /> Invite
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* 3. Family Space Members */}
          <div>
            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Contacts on FamilyHub ({filteredFamilyMembers.length})
            </div>
            {filteredFamilyMembers.length === 0 ? (
              <p className="p-4 text-xs text-slate-400 text-center">
                {query
                  ? 'No family member matches your search.'
                  : 'No other family members yet. Search any email or phone number above!'}
              </p>
            ) : (
              filteredFamilyMembers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onStartChatWithMember({
                      id: m.userId || m.id,
                      name: m.userName || 'Family Member',
                      avatar: m.userPhoto,
                      email: m.userEmail,
                      role: m.role,
                    });
                    onClose();
                  }}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={m.userPhoto} name={m.userName || 'Member'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {m.userName || 'Family Member'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate capitalize">
                        {m.role || 'member'}{m.userEmail ? ` • ${m.userEmail}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <MessageCircle className="w-3 h-3" /> Chat
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
