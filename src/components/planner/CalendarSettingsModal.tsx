import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CalendarSettings } from '../../types';
import {
  Calendar,
  Gift,
  CreditCard,
  StickyNote,
  AlertTriangle,
  GraduationCap,
  HeartPulse,
  Bell,
  Check,
} from 'lucide-react';

interface CalendarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CalendarSettings;
  onSave: (newSettings: CalendarSettings) => void;
}

export const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = React.useState<CalendarSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const toggle = (key: keyof CalendarSettings) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const toggles = [
    { key: 'showBirthdays', label: 'Show Birthdays', desc: 'Display family members & children birthdays', icon: <Gift className="w-4 h-4 text-pink-500" /> },
    { key: 'showBills', label: 'Show Bills on Calendar', desc: 'Display pending and overdue bill deadlines', icon: <CreditCard className="w-4 h-4 text-amber-500" /> },
    { key: 'showMedical', label: 'Show Medical Appointments', desc: 'Display scheduled doctor and clinic visits', icon: <HeartPulse className="w-4 h-4 text-rose-500" /> },
    { key: 'showSchool', label: 'Show School Events & Fees', desc: 'Display school schedules and tuition fee due dates', icon: <GraduationCap className="w-4 h-4 text-emerald-500" /> },
    { key: 'showNotes', label: 'Show Notes with Due Dates', desc: 'Include family notes that have a scheduled deadline', icon: <StickyNote className="w-4 h-4 text-violet-500" /> },
    { key: 'showUrgentNeeds', label: 'Show Urgent Needs', desc: 'Highlight urgent family requirements on their due dates', icon: <AlertTriangle className="w-4 h-4 text-rose-600" /> },
    { key: 'showReminders', label: 'Show Reminders', desc: 'Display family reminders and chores', icon: <Bell className="w-4 h-4 text-orange-500" /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Calendar Settings & Integration" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Control which family modules automatically integrate into your unified family calendar.
        </p>

        <div className="space-y-2">
          {toggles.map((item) => {
            const isChecked = !!localSettings[item.key as keyof CalendarSettings];
            return (
              <div
                key={item.key}
                onClick={() => toggle(item.key as keyof CalendarSettings)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isChecked
                    ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-100 dark:border-slate-700">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.label}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    isChecked
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Default View & Week Start */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default View
            </label>
            <select
              value={localSettings.defaultView}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultView: e.target.value as any })}
              className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="month">Month View</option>
              <option value="week">Week View</option>
              <option value="day">Day View</option>
              <option value="agenda">Agenda View</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Week Starts On
            </label>
            <select
              value={localSettings.weekStartsOn}
              onChange={(e) => setLocalSettings({ ...localSettings, weekStartsOn: parseInt(e.target.value, 10) as any })}
              className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </Modal>
  );
};
