import React, { useState, useEffect, useMemo } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { AddMemberModal } from './AddMemberModal';
import { MemberDetailModal } from './MemberDetailModal';
import { AddChildModal } from './AddChildModal';
import { ChildDetailModal } from './ChildDetailModal';
import { memberProfileService } from '../../services/memberProfileService';
import { childService } from '../../services/childService';
import {
  FamilyMemberProfile,
  Child,
  FamilyMember,
  Role,
  FamilyInvite,
} from '../../types';
import {
  Users,
  UserPlus,
  GraduationCap,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  PhoneCall,
  UserCheck,
  Trash2,
  Copy,
  Check,
  Shield,
  Heart,
  ChevronRight,
  User,
  SlidersHorizontal,
} from 'lucide-react';
import { Modal } from '../ui/Modal';

export const FamilyMembersView: React.FC = () => {
  const {
    currentFamily,
    members: familyMemberships,
    familyRole,
    familyPermissions,
    generateInvite,
    updateMemberRole,
    removeMember,
  } = useFamily();
  const { user: currentUser } = useAuth();

  // Primary top tab: 'members' | 'children' | 'invitations'
  const [activeTab, setActiveTab] = useState<'members' | 'children' | 'invitations'>('members');

  // Real-time Member Profiles
  const [memberProfiles, setMemberProfiles] = useState<FamilyMemberProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Real-time Children
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Modals for Members
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMemberProfile | null>(null);
  const [inspectedMember, setInspectedMember] = useState<FamilyMemberProfile | null>(null);

  // Modals for Children
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [inspectedChild, setInspectedChild] = useState<Child | null>(null);

  // Search & Filter state for Members
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'adults' | 'children'>('all');
  const [memberSort, setMemberSort] = useState<'az' | 'za' | 'birth' | 'recent'>('recent');

  // Search & Filter state for Children
  const [childSearch, setChildSearch] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  // Invitations & Role modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<FamilyInvite | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Change Role Modal
  const [roleModalMember, setRoleModalMember] = useState<FamilyMember | null>(null);
  const [targetRole, setTargetRole] = useState<Role>('member');
  const [roleLoading, setRoleLoading] = useState(false);

  // Subscribe to Member Profiles
  useEffect(() => {
    if (!currentFamily?.id) return;

    if (currentUser) {
      memberProfileService.ensureOwnerProfile(currentFamily.id, currentUser, familyRole || 'owner');
    }

    setLoadingProfiles(true);
    const unsubProfiles = memberProfileService.subscribeMemberProfiles(
      currentFamily.id,
      (list) => {
        setMemberProfiles(list);
        setLoadingProfiles(false);
      }
    );

    return () => unsubProfiles();
  }, [currentFamily?.id, currentUser?.id]);

  // Subscribe to Children
  useEffect(() => {
    if (!currentFamily?.id) return;

    setLoadingChildren(true);
    const unsubChildren = childService.subscribeChildren(
      currentFamily.id,
      (list) => {
        setChildren(list);
        setLoadingChildren(false);
      }
    );

    return () => unsubChildren();
  }, [currentFamily?.id]);

  // Filtered & Sorted Members
  const filteredMembers = useMemo(() => {
    let list = [...memberProfiles];

    // Filter by type
    if (memberFilter === 'adults') {
      list = list.filter((m) => !m.isChild);
    } else if (memberFilter === 'children') {
      list = list.filter((m) => m.isChild);
    }

    // Search query
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.nickname?.toLowerCase().includes(q) ||
          m.relationship.toLowerCase().includes(q) ||
          m.phone?.includes(q) ||
          m.email?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (memberSort === 'az') {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (memberSort === 'za') {
      list.sort((a, b) => b.fullName.localeCompare(a.fullName));
    } else if (memberSort === 'birth') {
      list.sort((a, b) => (a.dateOfBirth || '').localeCompare(b.dateOfBirth || ''));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [memberProfiles, memberFilter, memberSearch, memberSort]);

  // Distinct schools and classes for children filtering
  const distinctSchools = useMemo(() => {
    const s = new Set<string>();
    children.forEach((c) => c.schoolName && s.add(c.schoolName));
    return Array.from(s);
  }, [children]);

  const distinctClasses = useMemo(() => {
    const s = new Set<string>();
    children.forEach((c) => c.classGrade && s.add(c.classGrade));
    return Array.from(s);
  }, [children]);

  // Filtered Children
  const filteredChildren = useMemo(() => {
    let list = [...children];

    if (selectedSchoolFilter !== 'all') {
      list = list.filter((c) => c.schoolName === selectedSchoolFilter);
    }
    if (selectedClassFilter !== 'all') {
      list = list.filter((c) => c.classGrade === selectedClassFilter);
    }

    if (childSearch.trim()) {
      const q = childSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.nickname?.toLowerCase().includes(q) ||
          c.schoolName?.toLowerCase().includes(q) ||
          c.classGrade?.toLowerCase().includes(q) ||
          c.teacherName?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [children, childSearch, selectedSchoolFilter, selectedClassFilter]);

  if (!currentFamily) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active family space loaded.
      </div>
    );
  }

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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Family Header */}
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
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
                {currentFamily.name}
              </h1>
              <Badge variant="primary">Active Family</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>{memberProfiles.length} Member Profiles</span>
              <span>•</span>
              <span>{children.length} Children</span>
              <span>•</span>
              <span>
                Your Role: <strong className="uppercase text-indigo-600 dark:text-indigo-400">{familyRole || 'Member'}</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {familyPermissions.canManageMembers && (
            <>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingMember(null);
                  setIsAddMemberOpen(true);
                }}
                icon={<UserPlus className="w-4 h-4" />}
                className="font-bold"
              >
                Add Member
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEditingChild(null);
                  setIsAddChildOpen(true);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Add Child
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1 text-sm font-bold">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Family Members ({memberProfiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('children')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'children'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Children & School ({children.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'invitations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>App Users & Invites ({familyMemberships.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: ALL FAMILY MEMBERS                             */}
      {/* ========================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Controls: Search, Filter, Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, nickname, phone, relationship..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setMemberFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    memberFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setMemberFilter('adults')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    memberFilter === 'adults'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Adults
                </button>
                <button
                  onClick={() => setMemberFilter('children')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    memberFilter === 'children'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Children
                </button>
              </div>

              {/* Sort Selector */}
              <select
                value={memberSort}
                onChange={(e) => setMemberSort(e.target.value as any)}
                className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 border-0 font-medium text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="recent">Recently Added</option>
                <option value="az">Name A-Z</option>
                <option value="za">Name Z-A</option>
                <option value="birth">Date of Birth</option>
              </select>
            </div>
          </div>

          {/* Members Grid Cards */}
          {loadingProfiles ? (
            <LoadingState message="Loading family members..." />
          ) : filteredMembers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-8 h-8 text-indigo-500" />}
              title={memberSearch ? 'No matching members found' : 'No family members added yet'}
              description={
                memberSearch
                  ? 'Try searching with a different name or relationship.'
                  : 'Add adults, children, elderly relatives, and household members to build your family directory.'
              }
              actionLabel={familyPermissions.canManageMembers ? 'Add First Member' : undefined}
              onAction={
                familyPermissions.canManageMembers
                  ? () => {
                      setEditingMember(null);
                      setIsAddMemberOpen(true);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className="p-4 rounded-3xl hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Avatar & Relationship */}
                    <div className="flex items-start justify-between gap-3">
                      <Avatar
                        src={member.profileImage}
                        name={member.fullName}
                        size="lg"
                        className="ring-2 ring-indigo-500/20 shadow-xs shrink-0"
                      />
                      <div className="flex flex-col items-end">
                        <Badge variant="primary">{member.relationship}</Badge>
                        {member.isChild && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                            Child
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Member Details */}
                    <div className="mt-3 space-y-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {member.fullName}
                      </h3>
                      {member.nickname && (
                        <p className="text-xs text-slate-400 font-medium truncate">
                          "{member.nickname}"
                        </p>
                      )}

                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-mono hover:underline flex items-center gap-1.5 pt-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{member.phone}</span>
                        </a>
                      )}

                      {member.email && (
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: View Profile Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {member.dateOfBirth
                        ? `Born ${new Date(member.dateOfBirth).toLocaleDateString([], { month: 'short', year: 'numeric' })}`
                        : 'Family Member'}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectedMember(member)}
                      icon={<ChevronRight className="w-4 h-4" />}
                      className="text-indigo-600 font-bold"
                    >
                      View Profile
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: CHILDREN & SCHOOL                              */}
      {/* ========================================================= */}
      {activeTab === 'children' && (
        <div className="space-y-4">
          {/* Controls: Search, School & Class Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search children by name, school, class, or teacher..."
                value={childSearch}
                onChange={(e) => setChildSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* School Filter */}
              {distinctSchools.length > 0 && (
                <select
                  value={selectedSchoolFilter}
                  onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 border-0 font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Schools</option>
                  {distinctSchools.map((sch) => (
                    <option key={sch} value={sch}>
                      {sch}
                    </option>
                  ))}
                </select>
              )}

              {/* Class Filter */}
              {distinctClasses.length > 0 && (
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 border-0 font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Classes</option>
                  {distinctClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Children Cards Grid */}
          {loadingChildren ? (
            <LoadingState message="Loading children records..." />
          ) : filteredChildren.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="w-8 h-8 text-indigo-500" />}
              title={childSearch ? 'No matching children found' : 'No children added yet'}
              description={
                childSearch
                  ? 'Try searching with a different name or school.'
                  : 'Add child profiles to manage school details, tuition fees, teacher contacts, and documents.'
              }
              actionLabel={familyPermissions.canManageMembers ? 'Add Child' : undefined}
              onAction={
                familyPermissions.canManageMembers
                  ? () => {
                      setEditingChild(null);
                      setIsAddChildOpen(true);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChildren.map((child) => (
                <Card
                  key={child.id}
                  className="p-5 rounded-3xl hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Photo & Monthly Fee */}
                    <div className="flex items-start justify-between gap-3">
                      <Avatar
                        src={child.photo}
                        name={child.fullName}
                        size="xl"
                        className="ring-4 ring-indigo-500/10 shadow-xs shrink-0"
                      />

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Monthly Fee
                        </span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          Rs. {child.totalMonthlyFee.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Child & School details */}
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                          {child.fullName}
                        </h3>
                        {child.nickname && (
                          <span className="text-xs text-slate-400 font-semibold">
                            ("{child.nickname}")
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">
                          {child.classGrade || 'Class'} {child.schoolName ? `• ${child.schoolName}` : ''}
                        </span>
                      </div>

                      {child.teacherName && (
                        <p className="text-[11px] text-slate-500 truncate">
                          Teacher: <strong>{child.teacherName}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: View Details & Call Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {child.emergencyContactPhone ? (
                      <a
                        href={`tel:${child.emergencyContactPhone}`}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        title="Emergency Contact"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Emergency</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        {child.relationship}
                      </span>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setInspectedChild(child)}
                      className="font-bold text-xs"
                    >
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: APP USERS & INVITATIONS                        */}
      {/* ========================================================= */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Registered Application Members ({familyMemberships.length})
              </h2>
              <p className="text-xs text-slate-400">
                Family members with active FamilyHub login credentials
              </p>
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
              >
                Generate Invite Code
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyMemberships.map((m) => {
              const isMe = m.userId === currentUser?.id;
              const canManageThisUser =
                (familyPermissions.isOwner || (familyPermissions.isAdmin && m.role === 'member')) && !isMe;

              return (
                <Card
                  key={m.id}
                  className={`p-4 rounded-2xl ${
                    isMe ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={m.userPhoto} name={m.userName || 'Member'} size="lg" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {m.userName || 'Family Member'}
                          </h4>
                          {isMe && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-600 text-white rounded-full">
                              You
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              m.role === 'owner' ? 'primary' : m.role === 'admin' ? 'success' : 'secondary'
                            }
                          >
                            {m.role.toUpperCase()}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            Joined {new Date(m.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManageThisUser && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setTargetRole(m.role);
                            setRoleModalMember(m);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Change Role"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {m.userEmail && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">{m.userEmail}</span>
                      <span className="text-emerald-600 font-semibold">Active Login</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* --- ADD / EDIT MEMBER MODAL --- */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => {
          setIsAddMemberOpen(false);
          setEditingMember(null);
        }}
        familyId={currentFamily.id}
        currentUser={currentUser!}
        existingMembers={familyMemberships}
        editProfile={editingMember}
        onMemberAdded={(saved) => {
          // Live onSnapshot handles state update
        }}
      />

      {/* --- MEMBER DETAIL MODAL --- */}
      <MemberDetailModal
        isOpen={Boolean(inspectedMember)}
        onClose={() => setInspectedMember(null)}
        profile={inspectedMember}
        currentUser={currentUser!}
        canManage={familyPermissions.canManageMembers}
        onEdit={(prof) => {
          setInspectedMember(null);
          setEditingMember(prof);
          setIsAddMemberOpen(true);
        }}
        onRemove={async (prof) => {
          await memberProfileService.removeMemberProfile(
            currentFamily.id,
            prof.id,
            prof.fullName,
            currentUser!
          );
        }}
      />

      {/* --- ADD / EDIT CHILD MODAL --- */}
      <AddChildModal
        isOpen={isAddChildOpen}
        onClose={() => {
          setIsAddChildOpen(false);
          setEditingChild(null);
        }}
        familyId={currentFamily.id}
        currentUser={currentUser!}
        editChild={editingChild}
        onChildSaved={(saved) => {
          // Live onSnapshot handles state update
        }}
      />

      {/* --- CHILD DETAIL MODAL --- */}
      <ChildDetailModal
        isOpen={Boolean(inspectedChild)}
        onClose={() => setInspectedChild(null)}
        child={inspectedChild}
        currentUser={currentUser!}
        canManage={familyPermissions.canManageMembers}
        onEdit={(c) => {
          setInspectedChild(null);
          setEditingChild(c);
          setIsAddChildOpen(true);
        }}
        onDelete={async (c) => {
          await childService.deleteChild(currentFamily.id, c.id, c.fullName, currentUser!);
        }}
      />

      {/* --- INVITE MODAL --- */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Family Member"
        subtitle={`Generate a secure invitation code for ${currentFamily.name}.`}
      >
        {!generatedInvite ? (
          <form onSubmit={handleGenerateInviteSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Assign Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5"
              >
                <option value="member">Family Member (Standard)</option>
                <option value="admin">Family Admin (Can manage profiles & invite)</option>
              </select>
            </div>

            <Input
              label="Recipient Email (optional note)"
              placeholder="e.g. relative@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={inviteLoading}>
                Generate Code
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center space-y-2">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                Share this secure code with your family member:
              </p>
              <div className="text-2xl font-mono font-extrabold text-indigo-600 dark:text-indigo-400 py-1">
                {generatedInvite.inviteCode}
              </div>
              <p className="text-[11px] text-slate-400">
                Valid for 7 days • Role: <strong className="uppercase">{generatedInvite.role}</strong>
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleCopyCode}
              className="w-full font-bold"
              icon={copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            >
              {copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}
            </Button>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setIsInviteModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- CHANGE ROLE MODAL --- */}
      <Modal
        isOpen={Boolean(roleModalMember)}
        onClose={() => setRoleModalMember(null)}
        title="Change Member Role"
        subtitle={`Update access permissions for ${roleModalMember?.userName || 'Member'}.`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Select Role</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as Role)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5"
            >
              <option value="member">Member — Standard access</option>
              <option value="admin">Admin — Can add/edit profiles and manage shared data</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRoleModalMember(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRoleChangeSubmit} loading={roleLoading}>
              Save Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
