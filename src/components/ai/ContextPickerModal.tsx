import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  FileText,
  DollarSign,
  Calendar,
  CreditCard,
  HeartPulse,
  Users,
  GraduationCap,
  StickyNote,
  Check,
  FolderOpen,
} from 'lucide-react';
import { AIContextPayload } from '../../services/aiService';

export interface ContextPickerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'personal' | 'family';
  selectedContext: AIContextPayload[];
  onSelectContext: (items: AIContextPayload[]) => void;
  // Available data from hooks
  personalData?: {
    notes?: Array<{ id: string; title: string; content?: string }>;
    expenses?: Array<{ id: string; title: string; amount: number; category: string; date: string }>;
    plans?: Array<{ id: string; title: string; targetDate?: string; notes?: string }>;
    tasks?: Array<{ id: string; title: string; priority?: string; dueDate?: string }>;
  };
  familyData?: {
    members?: Array<{ id: string; name: string; role: string }>;
    children?: Array<{ id: string; name: string; ageGroup?: string; notes?: string }>;
    bills?: Array<{ id: string; title: string; amount: number; dueDate: string; isPaid: boolean }>;
    expenses?: Array<{ id: string; title: string; amount: number; category: string; date: string }>;
    events?: Array<{ id: string; title: string; startDate: string; category?: string; location?: string }>;
    notes?: Array<{ id: string; title: string; content?: string; isUrgent?: boolean }>;
    medical?: Array<{ id: string; doctorName?: string; specialistType?: string; appointmentDate?: string; notes?: string }>;
    documents?: Array<{ id: string; name: string; category?: string }>;
  };
}

export const ContextPickerModal: React.FC<ContextPickerProps> = ({
  isOpen,
  onClose,
  mode,
  selectedContext,
  onSelectContext,
  personalData,
  familyData,
}) => {
  const [activeTab, setActiveTab] = useState<string>(mode === 'personal' ? 'notes' : 'bills');

  const isSelected = (title: string, type: string) =>
    selectedContext.some((c) => c.title === title && c.type === type);

  const toggleItem = (item: AIContextPayload) => {
    if (isSelected(item.title, item.type)) {
      onSelectContext(selectedContext.filter((c) => !(c.title === item.title && c.type === item.type)));
    } else {
      onSelectContext([...selectedContext, item]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Attach Context to AI (${mode === 'personal' ? 'Private' : 'Family'})`} maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select specific authorized records to include as verified context. AI will strictly reference these records without accessing unrelated data.
        </p>

        {/* Tab selection */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs">
          {mode === 'personal' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'notes' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <StickyNote className="w-3.5 h-3.5" /> Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'expenses' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Expenses & Budget
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'plans' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Plans & Tasks
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('bills')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'bills' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Bills
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'events' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Planner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'expenses' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" /> Expenses
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'notes' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <StickyNote className="w-3.5 h-3.5" /> Notes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('family')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'family' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> Members & Care
              </button>
            </>
          )}
        </div>

        {/* Tab contents list */}
        <div className="max-h-60 overflow-y-auto space-y-2 p-1">
          {/* PERSONAL: Notes */}
          {mode === 'personal' && activeTab === 'notes' && (
            <div className="space-y-2">
              {(!personalData?.notes || personalData.notes.length === 0) && (
                <div className="text-center py-6 text-xs text-slate-400">No personal notes found.</div>
              )}
              {personalData?.notes?.map((n) => {
                const item: AIContextPayload = {
                  type: 'personal_note',
                  title: n.title,
                  content: `Title: ${n.title}\nContent: ${n.content || 'No content'}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => toggleItem(item)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{n.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{n.content}</div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* PERSONAL: Expenses & Calculation */}
          {mode === 'personal' && activeTab === 'expenses' && (
            <div className="space-y-2">
              {/* Summary item */}
              {(() => {
                const total = personalData?.expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
                const count = personalData?.expenses?.length || 0;
                const item: AIContextPayload = {
                  type: 'personal_expense_summary',
                  title: 'Verified Personal Expenses Total',
                  content: `Calculated Total: $${total.toFixed(2)} USD across ${count} recorded expenses.\nItems: ${personalData?.expenses?.map((e) => `${e.title}: $${e.amount} (${e.category})`).join(', ') || 'None'}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    onClick={() => toggleItem(item)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="w-3.5 h-3.5" /> Full Month Spending Summary
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Total: ${total.toFixed(2)} ({count} items)
                      </div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                );
              })()}

              {personalData?.expenses?.slice(0, 8).map((exp) => {
                const item: AIContextPayload = {
                  type: 'personal_expense',
                  title: `${exp.title} ($${exp.amount})`,
                  content: `Expense: ${exp.title}\nAmount: $${exp.amount}\nCategory: ${exp.category}\nDate: ${exp.date}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    key={exp.id}
                    onClick={() => toggleItem(item)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium">{exp.title} - ${exp.amount}</div>
                      <div className="text-[10px] text-slate-500">{exp.category} • {exp.date}</div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* FAMILY: Bills */}
          {mode === 'family' && activeTab === 'bills' && (
            <div className="space-y-2">
              {/* Summary bill calculation */}
              {(() => {
                const pendingBills = familyData?.bills?.filter((b) => !b.isPaid) || [];
                const pendingTotal = pendingBills.reduce((acc, b) => acc + (b.amount || 0), 0);
                const item: AIContextPayload = {
                  type: 'family_bills_summary',
                  title: 'Pending Bills Summary',
                  content: `Verified Pending Bills: ${pendingBills.length} bills totaling $${pendingTotal.toFixed(2)}.\nBreakdown:\n${pendingBills.map((b) => `- ${b.title}: $${b.amount} (Due: ${b.dueDate})`).join('\n')}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    onClick={() => toggleItem(item)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        All Pending Household Bills
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {pendingBills.length} pending • Total: ${pendingTotal.toFixed(2)}
                      </div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })()}

              {familyData?.bills?.map((bill) => {
                const item: AIContextPayload = {
                  type: 'family_bill',
                  title: `${bill.title} ($${bill.amount})`,
                  content: `Bill: ${bill.title}\nAmount: $${bill.amount}\nDue Date: ${bill.dueDate}\nStatus: ${bill.isPaid ? 'Paid' : 'Unpaid'}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    key={bill.id}
                    onClick={() => toggleItem(item)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{bill.title} - ${bill.amount}</div>
                      <div className="text-[10px] text-slate-500">Due: {bill.dueDate} • {bill.isPaid ? 'Paid' : 'Pending'}</div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* FAMILY: Events */}
          {mode === 'family' && activeTab === 'events' && (
            <div className="space-y-2">
              {familyData?.events?.map((ev) => {
                const item: AIContextPayload = {
                  type: 'family_event',
                  title: ev.title,
                  content: `Event: ${ev.title}\nDate: ${ev.startDate}\nCategory: ${ev.category || 'General'}\nLocation: ${ev.location || 'Home'}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    key={ev.id}
                    onClick={() => toggleItem(item)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{ev.title}</div>
                      <div className="text-[10px] text-slate-500">{ev.startDate} • {ev.location || 'Home'}</div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* FAMILY: Expenses */}
          {mode === 'family' && activeTab === 'expenses' && (
            <div className="space-y-2">
              {(() => {
                const total = familyData?.expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
                const item: AIContextPayload = {
                  type: 'family_expenses_summary',
                  title: 'Household Expenses Summary',
                  content: `Total recorded family expenses: $${total.toFixed(2)}.\nRecent: ${familyData?.expenses?.slice(0, 5).map((e) => `${e.title}: $${e.amount}`).join(', ') || 'None'}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    onClick={() => toggleItem(item)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">All Family Expenses Summary</div>
                      <div className="text-[11px] text-slate-500">Calculated Total: ${total.toFixed(2)}</div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })()}
            </div>
          )}

          {/* FAMILY: Notes */}
          {mode === 'family' && activeTab === 'notes' && (
            <div className="space-y-2">
              {familyData?.notes?.map((n) => {
                const item: AIContextPayload = {
                  type: 'family_note',
                  title: n.title,
                  content: `Note: ${n.title}\nContent: ${n.content || ''}\nUrgent: ${n.isUrgent ? 'Yes' : 'No'}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => toggleItem(item)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{n.title}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{n.content}</div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* FAMILY: Members & Care */}
          {mode === 'family' && activeTab === 'family' && (
            <div className="space-y-2">
              {familyData?.children?.map((ch) => {
                const item: AIContextPayload = {
                  type: 'child_care',
                  title: `Child: ${ch.name}`,
                  content: `Child: ${ch.name}\nAge Group: ${ch.ageGroup || 'Not specified'}\nNotes: ${ch.notes || 'None'}`,
                };
                const sel = isSelected(item.title, item.type);
                return (
                  <div
                    key={ch.id}
                    onClick={() => toggleItem(item)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sel
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                      <div>
                        <div className="text-xs font-semibold">{ch.name}</div>
                        <div className="text-[10px] text-slate-500">{ch.ageGroup || 'Child'}</div>
                      </div>
                    </div>
                    {sel && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected pills preview */}
        {selectedContext.length > 0 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
              {selectedContext.length} item(s) selected:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedContext.map((c, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[10px] font-medium"
                >
                  {c.title}
                  <button
                    type="button"
                    onClick={() => toggleItem(c)}
                    className="hover:text-rose-500 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
