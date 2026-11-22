import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'title' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'title' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={install}
          aria-label="Install Android App"
          title="Install App on Device"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/45 text-[#f7e7b4] hover:bg-[#d4af37]/25 text-[11px] font-semibold transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Install</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#1b1c22] hover:bg-[#24262f] border border-[#d4af37]/45 text-[#f7e7b4] font-semibold text-sm transition-colors cursor-pointer"
      >
        <Smartphone className="w-4 h-4 text-[#d4af37]" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install on iOS"
          className={
            variant === 'compact'
              ? 'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1d1f27] border border-[#343642] text-[#dfd8ca] hover:border-[#d4af37]/50 text-[11px] font-semibold transition-colors cursor-pointer'
              : 'inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1b1c22] hover:bg-[#24262f] border border-[#343642] text-[#cbc4b8] font-semibold text-sm transition-colors cursor-pointer'
          }
        >
          <Smartphone className="w-4 h-4 text-[#d4af37]" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#16171d] border border-[#2f323f] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#f4efe6]">Install Aurelia 3D Chess</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close Install Guide"
                  className="p-1 rounded-lg text-[#9c9589] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#cbc4b8] leading-relaxed">
                1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> for full-screen offline play.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#d4af37] text-[#14151a] font-bold text-sm cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-28 left-3 sm:top-auto sm:bottom-4 sm:left-4 z-40 pointer-events-none flex items-center gap-2 rounded-lg bg-[#191a20]/95 border border-[#d4af37]/50 px-3 py-1.5 text-xs font-medium text-[#f7e7b4] shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 text-[#d4af37]" />
      <span>Offline Mode · Stockfish Ready</span>
    </div>
  );
};
