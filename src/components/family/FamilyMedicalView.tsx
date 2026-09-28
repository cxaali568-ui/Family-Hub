import React from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { HeartPulse, AlertTriangle, Pill, Phone, User, Calendar, FileText } from 'lucide-react';

export const FamilyMedicalView: React.FC = () => {
  const { medicalRecords, family } = useFamily();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-rose-500" />
          Family Medical & Child Care
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Emergency health records, allergies, doctors, and ongoing prescriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {medicalRecords.map(record => (
          <Card key={record.id} className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
                  {record.bloodGroup}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {record.memberName}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Blood Type: <strong>{record.bloodGroup}</strong>
                  </p>
                </div>
              </div>
              <Badge variant="outline">Health Profile</Badge>
            </div>

            {/* Allergies */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Known Allergies:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {record.allergies.map((all, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 font-medium"
                  >
                    {all}
                  </span>
                ))}
              </div>
            </div>

            {/* Medications */}
            {record.medications.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Pill className="w-3.5 h-3.5 text-indigo-500" /> Daily Medications:
                </h4>
                <div className="space-y-1.5">
                  {record.medications.map((med, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{med.name} ({med.dosage})</span>
                      <span className="text-slate-400 text-[11px]">{med.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor & Notes */}
            {record.primaryDoctor && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div className="overflow-hidden">
                  <p className="font-semibold truncate text-slate-800 dark:text-slate-200">{record.primaryDoctor.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{record.primaryDoctor.clinic}</p>
                </div>
                <a
                  href={`tel:${record.primaryDoctor.phone}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-100"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
