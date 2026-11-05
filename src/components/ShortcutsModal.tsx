import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause (or Stamp current word when Tap-Sync is active)' },
    { key: 'T', desc: 'Toggle Tap-to-Sync Spacebar stamping mode' },
    { key: 'J / L', desc: 'Step playhead back / forward 1.0 second' },
    { key: '[ / ]', desc: 'Jump to previous / next lyric line' },
    { key: 'M', desc: 'Mute / unmute active vocal stem' },
    { key: 'S', desc: 'Solo / unsolo active vocal stem' },
    { key: '+ / -', desc: 'Zoom in / out on waveform timeline' },
    { key: '0', desc: 'Return playhead to 00:00.00' },
    { key: 'E', desc: 'Open Export Synchronized Lyrics modal' },
    { key: 'Esc', desc: 'Close open dialogs or exit Tap-Sync' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0E0E12] border border-[#3F3F4E] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-12 border-b border-[#272730] bg-[#14141A] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#8B5CF6]" />
            <h2 className="font-display font-semibold text-sm text-white">
              DAW Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1E1E26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-2 bg-[#09090B]">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded bg-[#14141A] border border-[#272730]"
            >
              <span className="text-xs text-[#A1A1AA] font-sans">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#1E1E26] border border-[#3F3F4E] font-mono text-xs font-bold text-[#c0c1ff] shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-[#272730] bg-[#14141A] px-4 flex items-center justify-between text-xs font-mono text-[#71717A]">
          <span>Studio Synchrony Ergonomic Control</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#1E1E26] hover:bg-[#272730] text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
