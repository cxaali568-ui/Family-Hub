import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ExpenseCategory, User } from '../../types';
import { expenseCategoryService } from '../../services/expenseCategoryService';
import { Tag, AlertCircle } from 'lucide-react';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: User;
  onCategoryAdded: (category: ExpenseCategory) => void;
}

const AVAILABLE_ICONS = [
  'Utensils',
  'ShoppingCart',
  'GraduationCap',
  'HeartPulse',
  'Car',
  'Fuel',
  'Zap',
  'Flame',
  'Droplets',
  'Wifi',
  'Phone',
  'Home',
  'Sofa',
  'Shirt',
  'BookOpen',
  'Baby',
  'Pill',
  'Film',
  'Plane',
  'Wrench',
  'Gift',
  'Package',
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  onCategoryAdded,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a category name.');
      return;
    }

    setLoading(true);
    try {
      const created = await expenseCategoryService.addCategory(
        familyId,
        {
          name: name.trim(),
          icon,
          color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60',
        },
        currentUser
      );
      onCategoryAdded(created);
      setName('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not create category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Custom Category"
      subtitle="Create a custom category for your family household expenses."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Category Name *"
          placeholder="e.g. Pet Care, Gardening, Subscriptions"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Select Icon
          </label>
          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            {AVAILABLE_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`p-2.5 rounded-xl flex items-center justify-center text-xs transition-all ${
                  icon === ic
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {ic.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            Create Category
          </Button>
        </div>
      </form>
    </Modal>
  );
};
