import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PersonalNote } from '../../types';
import {
  BookOpen,
  Plus,
  Lock,
  Pin,
  Archive,
  Trash2,
  Edit2,
  Search,
  Tag,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  'Ideas',
  'Private Notes',
  'Study Notes',
  'Work Notes',
  'Important',
  'Journal',
  'Other',
];

export const PersonalNotebook: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote } = usePersonal();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('Journal');
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const openAdd = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setCategory('Journal');
    setIsPinned(false);
    setIsModalOpen(true);
  };

  const openEdit = (note: PersonalNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category || 'Journal');
    setIsPinned(!!note.isPinned);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          title: title.trim(),
          content: content.trim(),
          category,
          isPinned,
        });
      } else {
        await addNote({
          title: title.trim(),
          content: content.trim(),
          category,
          isPinned,
          isArchived: false,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.warn('Could not save note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (note: PersonalNote, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateNote(note.id, { isPinned: !note.isPinned });
  };

  const handleToggleArchive = async (note: PersonalNote, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateNote(note.id, { isArchived: !note.isArchived });
  };

  // Filter notes
  const filtered = notes.filter((n) => {
    if (showArchived) {
      if (!n.isArchived) return false;
    } else {
      if (n.isArchived) return false;
    }

    if (selectedCat !== 'all' && n.category !== selectedCat) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    }

    return true;
  });

  const pinnedNotes = filtered.filter((n) => n.isPinned);
  const otherNotes = filtered.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Secret Notebook & Notes
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Encrypted personal thoughts, journal entries, and private study notes.
          </p>
        </div>

        <Button size="sm" onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
          New Note
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCat === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({notes.length})
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCat === c
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              showArchived
                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived</span>
          </button>

          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-3.5 h-3.5" />}
            className="w-40 sm:w-48 text-xs"
          />
        </div>
      </div>

      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Pin className="w-3.5 h-3.5 text-indigo-600" /> Pinned Notes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinnedNotes.map((note) => (
              <Card
                key={note.id}
                onClick={() => openEdit(note)}
                className="p-4 flex flex-col justify-between gap-3 cursor-pointer border-indigo-300/60 dark:border-indigo-800/60 shadow-xs hover:border-indigo-500 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      {note.category}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(note, e)}
                      className="text-indigo-600"
                    >
                      <Pin className="w-3.5 h-3.5 fill-indigo-600" />
                    </button>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{note.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-3 mt-1 whitespace-pre-wrap">{note.content}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span>{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleToggleArchive(note, e)}
                      className="p-1 hover:text-slate-700 dark:hover:text-slate-200"
                      title={note.isArchived ? 'Unarchive' : 'Archive'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="p-1 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Notes */}
      <div className="space-y-2.5">
        {pinnedNotes.length > 0 && otherNotes.length > 0 && (
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Notes</h3>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {otherNotes.map((note) => (
            <Card
              key={note.id}
              onClick={() => openEdit(note)}
              className="p-4 flex flex-col justify-between gap-3 cursor-pointer shadow-xs hover:border-indigo-500 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {note.category}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleTogglePin(note, e)}
                    className="text-slate-300 hover:text-indigo-600"
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{note.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-3 mt-1 whitespace-pre-wrap">{note.content}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                <span>{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleToggleArchive(note, e)}
                    className="p-1 hover:text-slate-700 dark:hover:text-slate-200"
                    title={note.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="p-1 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No private notes found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Start writing private ideas, journal thoughts, or secret plans.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote ? 'Edit Private Note' : 'New Private Note'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Note Title *"
            placeholder="e.g. Personal Reflections, Business Idea, Password Hint"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs px-3 py-1 rounded-xl font-medium transition-all ${
                    category === c
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Note Content *
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your private note..."
              className="w-full text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              Pin to Top
            </label>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={loading}>
                {editingNote ? 'Save Note' : 'Create Note'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
