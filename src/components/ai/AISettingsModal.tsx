import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { aiService, ProviderStatus } from '../../services/aiService';
import { Sparkles, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProvider: 'auto' | 'gemini' | 'openai';
  onSelectProvider: (p: 'auto' | 'gemini' | 'openai') => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  selectedProvider,
  onSelectProvider,
}) => {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      aiService
        .getStatus()
        .then((s) => setStatus(s))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Assistant Settings" maxWidth="md">
      <div className="space-y-5">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
            Provider Architecture
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            FamilyHub provides dual-provider AI support through an isolated, secure server proxy. API keys are strictly protected server-side and never exposed to the client.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Gemini Status Card */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Google Gemini</span>
                {status?.gemini.configured ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Not Set
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Fast, multimodal family assistant powered by gemini-3.8-flash.</p>
            </div>

            {/* OpenAI Status Card */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">OpenAI ChatGPT</span>
                {status?.openai.configured ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Not Set
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">General reasoning and document summaries via GPT-4o-mini.</p>
            </div>
          </div>
        </div>

        {/* User Choice Preference */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
            Active Provider Routing Preference
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'auto', label: 'Auto (Recommended)', desc: 'Best available' },
                { id: 'gemini', label: 'Google Gemini', desc: 'gemini-3.8-flash' },
                { id: 'openai', label: 'OpenAI ChatGPT', desc: 'gpt-4o-mini' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectProvider(opt.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  selectedProvider === opt.id
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-600'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{opt.label}</div>
                <div className="text-[10px] text-slate-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Security & Medical Privacy Guarantee Box */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>FamilyHub Security Guarantee:</strong> AI is strictly read-only and cannot delete records, modify bills, or alter family permissions. Medical context is strictly informational and is never a substitute for professional medical care.
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onClose}>
            Save Preferences
          </Button>
        </div>
      </div>
    </Modal>
  );
};
