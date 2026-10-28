import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface PWAInstallPromptProps {
  variant?: 'button' | 'banner' | 'menu-item';
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running inside installed standalone PWA, suppress the prompt
  if (isInstalled) {
    return null;
  }

  // If neither standard install prompt nor mobile device, suppress
  if (!isInstallable && !isIOS && !isAndroid) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
      return;
    }
    if (isAndroid) {
      setShowAndroidModal(true);
      return;
    }
  };

  const renderContent = () => {
    if (variant === 'menu-item') {
      return (
        <button
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition-colors border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Download className="w-4 h-4" />
            </span>
            <div className="text-left">
              <p className="font-extrabold text-slate-900 dark:text-slate-100">
                {isIOS ? 'Add to Home Screen (iOS)' : 'Install FamilyHub App'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                Fast 1-tap launch from your phone home screen
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-900 text-[10px] font-extrabold text-indigo-800 dark:text-indigo-200 uppercase">
            {isIOS ? 'Guide' : 'Install'}
          </span>
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <div
          className={`p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-black tracking-tight">
                {isIOS ? 'Install on iPhone / iPad' : 'Install FamilyHub Web App'}
              </h4>
              <p className="text-[11px] text-indigo-100 truncate">
                Get full-screen mobile experience with instant access
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={isInstalling}
            onClick={handleInstallClick}
            className="shrink-0 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {isIOS ? 'Instructions' : 'Install'}
          </Button>
        </div>
      );
    }

    // Default compact button
    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all shadow-2xs cursor-pointer ${className}`}
        title={isIOS ? 'Install on iOS Home Screen' : 'Install FamilyHub'}
      >
        <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Guided iOS Safari Instructions Modal */}
      {showIOSModal && (
        <Modal
          isOpen={showIOSModal}
          onClose={() => setShowIOSModal(false)}
          title="Install FamilyHub on iOS"
          subtitle="Add FamilyHub to your iPhone or iPad Home Screen in 2 steps"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3">
              <img src="/apple-touch-icon.png" alt="FamilyHub" className="w-12 h-12 rounded-xl shadow-xs" />
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">FamilyHub</h4>
                <p className="text-[11px] text-slate-500">Standalone Home Screen App</p>
              </div>
            </div>

            <ol className="space-y-3 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  1
                </span>
                <div>
                  <p className="leading-relaxed">
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-600" /> at the bottom of Safari's toolbar.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  2
                </span>
                <div>
                  <p className="leading-relaxed">
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-800 dark:text-slate-200" />.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  3
                </span>
                <div>
                  <p className="leading-relaxed">
                    Tap <strong>Add</strong> in the top-right corner. FamilyHub will launch like a native app from your Home Screen!
                  </p>
                </div>
              </li>
            </ol>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => setShowIOSModal(false)}
                className="w-full font-bold"
              >
                Got It
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Guided Android Instructions Modal (when native 1-tap banner is delayed or dismissed) */}
      {showAndroidModal && (
        <Modal
          isOpen={showAndroidModal}
          onClose={() => setShowAndroidModal(false)}
          title="Install FamilyHub on Android"
          subtitle="Add FamilyHub to your Android Home Screen and App Drawer"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3">
              <img src="/pwa-192x192.png" alt="FamilyHub" className="w-12 h-12 rounded-xl shadow-xs" />
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">FamilyHub PWA</h4>
                <p className="text-[11px] text-slate-500">Full-Screen Android Experience</p>
              </div>
            </div>

            <ol className="space-y-3 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  1
                </span>
                <div>
                  <p className="leading-relaxed">
                    Tap the <strong>three dots menu (⋮)</strong> in the top-right corner of Chrome, Samsung Internet, or your browser.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  2
                </span>
                <div>
                  <p className="leading-relaxed">
                    Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> from the menu options.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0">
                  3
                </span>
                <div>
                  <p className="leading-relaxed">
                    Confirm <strong>Install</strong>. FamilyHub will be added to your Android Home Screen and App Drawer, opening full-screen with offline caching!
                  </p>
                </div>
              </li>
            </ol>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => setShowAndroidModal(false)}
                className="w-full font-bold"
              >
                Got It
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
