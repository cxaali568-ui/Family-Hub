import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  PhoneCall,
  Calendar,
  Sparkles,
  Cake,
  Palette,
  ChevronRight,
  ShieldAlert,
  Clock,
  DollarSign,
  User,
  Heart,
  BookOpen,
} from 'lucide-react';
import { Child } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useToast } from '../../context/ToastContext';
import { childService } from '../../services/childService';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { AddChildModal } from './AddChildModal';
import { ChildDetailModal } from './ChildDetailModal';
import { BirthdayCardModal } from './BirthdayCardModal';

export const ChildrenProfilesView: React.FC = () => {
  const { user } = useAuth();
  const { currentFamily, familyPermissions } = useFamily();
  const { showSuccess, showError } = useToast();

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Modal states
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [selectedChildDetail, setSelectedChildDetail] = useState<Child | null>(null);

  // Birthday Card Studio state
  const [isBirthdayCardOpen, setIsBirthdayCardOpen] = useState(false);
  const [birthdayCardTargetChild, setBirthdayCardTargetChild] = useState<Child | null>(null);

  // Subscribe to real-time children records
  useEffect(() => {
    if (!currentFamily?.id) {
      setChildren([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = childService.subscribeChildren(
      currentFamily.id,
      (liveChildren) => {
        setChildren(liveChildren);
        setLoading(false);
      },
      (err) => {
        console.warn('Could not load children records:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentFamily?.id]);

  // Distinct schools and classes for quick filters
  const distinctSchools = Array.from(
    new Set(children.map((c) => c.schoolName?.trim()).filter(Boolean) as string[])
  ).sort();

  const distinctClasses = Array.from(
    new Set(children.map((c) => c.classGrade?.trim()).filter(Boolean) as string[])
  ).sort();

  // Upcoming Children Birthdays
  const upcomingBirthdays = children
    .filter((c) => Boolean(c.dateOfBirth))
    .map((c) => {
      const now = new Date();
      const dob = new Date(c.dateOfBirth);
      const bMonth = dob.getMonth();
      const bDay = dob.getDate();

      let nextBday = new Date(now.getFullYear(), bMonth, bDay);
      if (nextBday < now && nextBday.toDateString() !== now.toDateString()) {
        nextBday = new Date(now.getFullYear() + 1, bMonth, bDay);
      }

      const diffTime = nextBday.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const turningAge = nextBday.getFullYear() - dob.getFullYear();

      return {
        child: c,
        daysRemaining,
        turningAge,
        dateFormatted: dob.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Filtered children list
  const filteredChildren = children.filter((child) => {
    if (selectedSchool !== 'all' && child.schoolName?.trim() !== selectedSchool) {
      return false;
    }
    if (selectedClass !== 'all' && child.classGrade?.trim() !== selectedClass) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = child.fullName.toLowerCase().includes(q);
      const nickMatch = child.nickname?.toLowerCase().includes(q);
      const schoolMatch = child.schoolName?.toLowerCase().includes(q);
      const classMatch = child.classGrade?.toLowerCase().includes(q);
      const teacherMatch = child.teacherName?.toLowerCase().includes(q);
      return nameMatch || nickMatch || schoolMatch || classMatch || teacherMatch;
    }
    return true;
  });

  const handleOpenBirthdayCardForChild = (child: Child) => {
    setBirthdayCardTargetChild(child);
    setIsBirthdayCardOpen(true);
  };

  const handleOpenGeneralBirthdayCard = () => {
    setBirthdayCardTargetChild(children[0] || null);
    setIsBirthdayCardOpen(true);
  };

  const handleDeleteChild = async (child: Child) => {
    if (!currentFamily?.id || !user) return;
    try {
      await childService.deleteChild(currentFamily.id, child.id, child.fullName, user);
      showSuccess(`Profile for ${child.fullName} deleted.`);
      setSelectedChildDetail(null);
    } catch (err: any) {
      showError(err?.message || 'Could not delete child record.');
    }
  };

  const calculateAge = (dobString?: string): string => {
    if (!dobString) return '';
    const birth = new Date(dobString);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age} yrs` : '< 1 yr';
  };

  return (
    <div className="p-4 md:p-6 pb-28 lg:pb-12 max-w-6xl mx-auto space-y-6">
      {/* ========================================================= */}
      {/* DEDICATED CLEAN CHILDREN & SCHOOL PROFILES HEADER        */}
      {/* ========================================================= */}
      <div className="p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Children & School Profiles
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                {children.length} {children.length === 1 ? 'Child' : 'Children'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dedicated space for children records, tuition fees, teachers, milestones, and celebration cards.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={handleOpenGeneralBirthdayCard}
            icon={<Cake className="w-4 h-4 text-rose-500" />}
            className="text-xs font-bold border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-2xs"
          >
            🎨 Birthday Card Studio
          </Button>

          {familyPermissions.canManageMembers && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingChild(null);
                setIsAddChildOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
              className="text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-sm"
            >
              Add Child Profile
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* UPCOMING CHILDREN BIRTHDAYS & CELEBRATION CARDS           */}
      {/* ========================================================= */}
      {upcomingBirthdays.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-50/80 via-pink-50/60 to-amber-50/70 dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-900 border border-rose-200/70 dark:border-rose-900/50 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Upcoming Birthdays & Milestone Cards</span>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Design beautiful custom birthday cards with photo, themes, and share directly to Family Chat!
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenGeneralBirthdayCard}
              icon={<Palette className="w-3.5 h-3.5 text-rose-600" />}
              className="text-xs font-bold border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 self-start sm:self-center"
            >
              Create Birthday Card
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {upcomingBirthdays.slice(0, 3).map((item) => (
              <div
                key={item.child.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-rose-200/60 dark:border-rose-900/60 shadow-xs flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar
                    src={item.child.photo}
                    name={item.child.fullName}
                    size="md"
                    className="ring-2 ring-rose-400/30 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                      {item.child.fullName}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>{item.child.classGrade || 'Child'}</span>
                      <span>•</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        Turning {item.turningAge}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400">{item.dateFormatted}</p>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                      item.daysRemaining === 0
                        ? 'bg-rose-500 text-white animate-pulse'
                        : item.daysRemaining <= 7
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {item.daysRemaining === 0 ? 'Today! 🎂' : `In ${item.daysRemaining}d`}
                  </span>

                  <button
                    onClick={() => handleOpenBirthdayCardForChild(item.child)}
                    className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Card</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SEARCH AND SCHOOL/CLASS FILTERS                          */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search children by name, school, class, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* School Filter */}
          {distinctSchools.length > 0 && (
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 border-0 font-medium text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Schools ({distinctSchools.length})</option>
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
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-2 border-0 font-medium text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Classes ({distinctClasses.length})</option>
              {distinctClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CHILDREN PROFILE CARDS GRID                               */}
      {/* ========================================================= */}
      {loading ? (
        <LoadingState message="Loading children records..." />
      ) : filteredChildren.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-8 h-8 text-amber-500" />}
          title={searchQuery ? 'No matching children found' : 'No children added yet'}
          description={
            searchQuery
              ? 'Try searching with a different child name, school, or teacher.'
              : 'Add your children to track school schedules, tuition fee records, emergency contacts, and design birthday celebration cards.'
          }
          actionLabel={familyPermissions.canManageMembers ? 'Add First Child' : undefined}
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
          {filteredChildren.map((child) => {
            const ageDisplay = calculateAge(child.dateOfBirth);

            return (
              <Card
                key={child.id}
                className="p-5 rounded-3xl hover:shadow-lg transition-all flex flex-col justify-between border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 group"
              >
                <div>
                  {/* Top Row: Photo & Monthly Fee */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      <Avatar
                        src={child.photo}
                        name={child.fullName}
                        size="xl"
                        className="ring-4 ring-amber-500/20 shadow-xs shrink-0"
                      />
                      {ageDisplay && (
                        <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-900 text-white dark:bg-indigo-600 shadow-2xs">
                          {ageDisplay}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Monthly Fee
                      </span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        Rs. {(child.totalMonthlyFee || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Child & School details */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {child.fullName}
                      </h3>
                      {child.nickname && (
                        <span className="text-xs text-slate-400 font-semibold truncate">
                          ("{child.nickname}")
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <GraduationCap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        {child.classGrade || 'Class Grade'}{' '}
                        {child.section ? `(${child.section})` : ''}{' '}
                        {child.schoolName ? `• ${child.schoolName}` : ''}
                      </span>
                    </div>

                    {child.teacherName && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Teacher: <strong>{child.teacherName}</strong></span>
                      </p>
                    )}

                    {child.dateOfBirth && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>
                          Born {new Date(child.dateOfBirth).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Birthday Card + View Full Details */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenBirthdayCardForChild(child)}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                    title={`Design a Birthday Card for ${child.fullName}`}
                  >
                    <Cake className="w-3.5 h-3.5 text-rose-500" />
                    <span>Birthday Card</span>
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedChildDetail(child)}
                    icon={<ChevronRight className="w-4 h-4" />}
                    className="text-indigo-600 dark:text-indigo-400 font-bold text-xs"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS                                                    */}
      {/* ========================================================= */}
      {/* 1. Add / Edit Child Modal */}
      {user && currentFamily && (
        <AddChildModal
          isOpen={isAddChildOpen}
          onClose={() => {
            setIsAddChildOpen(false);
            setEditingChild(null);
          }}
          familyId={currentFamily.id}
          currentUser={user}
          editChild={editingChild}
          onChildSaved={() => {
            setIsAddChildOpen(false);
            setEditingChild(null);
            showSuccess(editingChild ? 'Child profile updated.' : 'Child profile created.');
          }}
        />
      )}

      {/* 2. Full Child Detail Modal */}
      {user && (
        <ChildDetailModal
          isOpen={Boolean(selectedChildDetail)}
          onClose={() => setSelectedChildDetail(null)}
          child={selectedChildDetail}
          currentUser={user}
          canManage={familyPermissions.canManageMembers}
          onEdit={(c) => {
            setSelectedChildDetail(null);
            setEditingChild(c);
            setIsAddChildOpen(true);
          }}
          onDelete={handleDeleteChild}
        />
      )}

      {/* 3. Birthday Card Studio Modal */}
      <BirthdayCardModal
        isOpen={isBirthdayCardOpen}
        onClose={() => setIsBirthdayCardOpen(false)}
        selectedChild={birthdayCardTargetChild}
        allChildren={children}
      />
    </div>
  );
};
