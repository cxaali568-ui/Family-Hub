import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Users, UserPlus, Heart, Shield, Phone, Mail, Award } from 'lucide-react';
import { User, Role } from '../../types';

export const FamilyMembersView: React.FC = () => {
  const { family, members } = useFamily();
  const { switchUser, user: currentUser } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            {family.name} Members
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {members.length} registered members • Invite Code:{' '}
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
              {family.inviteCode}
            </span>
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Add Family Member
        </Button>
      </div>

      {/* Demo Multi-user Switcher Notice */}
      <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-indigo-900 dark:text-indigo-200 mr-1.5">
            👥 Demo Role Switcher:
          </span>
          <span className="text-indigo-700 dark:text-indigo-300">
            Click any member below to switch accounts and test permissions & isolated personal spaces.
          </span>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map(member => {
          const isCurrent = member.id === currentUser?.id;
          return (
            <Card
              key={member.id}
              className={`p-4 transition-all ${
                isCurrent
                  ? 'ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                  : 'hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatar}
                    name={member.name}
                    size="lg"
                    status={member.status}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {member.name}
                      </h3>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                          You
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          member.roleInFamily === 'owner'
                            ? 'primary'
                            : member.roleInFamily === 'admin'
                            ? 'success'
                            : 'secondary'
                        }
                      >
                        {member.roleInFamily.toUpperCase()}
                      </Badge>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {member.status}
                      </span>
                    </div>

                    {member.bio && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {member.bio}
                      </p>
                    )}
                  </div>
                </div>

                {!isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => switchUser(member.id)}
                    className="text-xs shrink-0"
                  >
                    Switch To
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{member.phone}</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Invite Family Member"
        subtitle="Add a child, parent, or spouse to your FamilyHub."
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Omar Khan"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label="Email or Phone"
            placeholder="omar.khan@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Role in Family
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Family Member (Standard)</option>
              <option value="admin">Family Admin (Can manage bills/plans)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500">
            Or share your Family Invite Code:{' '}
            <strong className="text-indigo-600 font-mono">{family.inviteCode}</strong>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsAddModalOpen(false);
                setName('');
                setEmail('');
              }}
            >
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
