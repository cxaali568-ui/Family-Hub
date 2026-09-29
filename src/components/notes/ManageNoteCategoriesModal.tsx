import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { NoteCategory, User } from '../../types';
import { noteCategoryService } from '../../services/noteCategoryService';
import { Tag, Plus, Check, Shield } from 'lucide-react';

interface ManageNoteCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NoteCategory[];
  familyId: string;
  currentUser: User;
  onUpdate: () => void;
}

export const ManageNoteCategoriesModal: React.FC<ManageNoteCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  familyId,
  currentUser,
  onUpdate,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await noteCategoryService.addCategory(
        familyId,
        newCatName.trim(),
        'Tag',
        'indigo',
        currentUser
      );
      setNewCatName('');
      onUpdate();
    } catch (err: any) {
      console.warn('Could not add category:', err);
      setError(err.message || 'Failed to add category.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (cat: NoteCategory) => {
    try {
      await noteCategoryService.toggleCategoryActive(
        familyId,
        cat.id,
        !cat.active,
        currentUser
      );
      onUpdate();
    } catch (err) {
      console.warn('Could not toggle category:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Note Categories"
      subtitle="Organize family notes with custom tags and topics."
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Add New Category Input */}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="e.g. Garden & Plants, Pet Care, Taxes"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={loading || !newCatName.trim()}
            icon={<Plus className="w-4 h-4" />}
          >
            Add
          </Button>
        </form>

        {/* Categories List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Active Categories ({categories.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {cat.name}
                    </p>
                    {cat.isDefault && (
                      <span className="text-[9px] text-slate-400 font-semibold uppercase">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {!cat.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleToggleActive(cat)}
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button size="sm" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
