import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Camera3D, Shield3D } from '../ui/Icons3D';
import { Camera, Check, Shield, User, Mail, Phone, Sparkles, Trash2 } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const { currentFamily } = useFamily();

  const [name, setName] = useState(user?.name || user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || user?.profileImage || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || user.fullName || '');
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar || user.profileImage || '');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, user]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);
    setUploadProgress(15);

    try {
      const url = await uploadAvatar(file, (pct) => setUploadProgress(pct));
      setAvatarUrl(url);
      setSuccess('Profile photo updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setError(err?.message || 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setError(null);
    setSuccess(null);
    setAvatarUrl('');
    setSaving(true);
    try {
      await updateProfile({
        avatar: '',
        profileImage: '',
      });
      setSuccess('Profile photo removed.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove photo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full name cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        name: name.trim(),
        fullName: name.trim(),
        phone: phone.trim() || undefined,
        avatar: avatarUrl,
        profileImage: avatarUrl,
      });
      setSuccess('Profile details saved!');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personal Profile & Account" maxWidth="md">
      <form onSubmit={handleSave} className="space-y-5">
        {/* Avatar Hero Card with 3D Depth */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-100/60 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-100/80 dark:border-indigo-900/50 shadow-sm flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group shrink-0">
            <div className="ring-4 ring-white dark:ring-slate-800 shadow-lg rounded-full overflow-hidden transition-transform transform group-hover:scale-105">
              <Avatar
                src={avatarUrl}
                name={name || user?.name || 'User'}
                size="xl"
                className="w-20 h-20 text-xl font-bold"
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Change Profile Photo"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="text-center sm:text-left space-y-1 overflow-hidden flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {name || 'Your Profile'}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {user?.roleInFamily || 'Member'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email}
            </p>
            {currentFamily && (
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                <span>Family:</span>
                <span className="font-bold">{currentFamily.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Upload Progress Indicator */}
        {uploading && (
          <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <span className="flex items-center gap-1.5">
                <Camera3D className="w-4 h-4" />
                Uploading profile photo...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-indigo-200 dark:bg-indigo-900 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(10, uploadProgress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 font-medium animate-in fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Input Fields */}
        <div className="space-y-3.5">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sarah Jenkins"
            required
            icon={<User className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Email Address"
            value={user?.email || ''}
            disabled
            placeholder="email@example.com"
            icon={<Mail className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Phone Number (Optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555-0199"
            icon={<Phone className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploading || saving}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving || uploading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving} disabled={uploading}>
              Save Profile
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
