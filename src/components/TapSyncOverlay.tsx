import React from 'react';
import { Radio, Check, X, ArrowRight, Sparkles } from 'lucide-react';
import { LrcLine, LrcWord } from '../types';
import { formatPrecisionTimecode } from '../utils/lrcParser';

interface TapSyncOverlayProps {
  isActive: boolean;
  onClose: () => void;
  onStamp: () => void;
  currentTime: number;
  currentLine: LrcLine | null;
  targetWord: LrcWord | null;
  nextWord: LrcWord | null;
  stampedCount: number;
  totalWords: number;
}

export const TapSyncOverlay: React.FC<TapSyncOverlayProps> = ({
  isActive,
  onClose,
  onStamp,
  currentTime,
  currentLine,
  targetWord,
  nextWord,
  stampedCount,
  totalWords,
}) => {
  if (!isActive) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-lg bg-[#14141A]/95 border border-[#8B5CF6] rounded-xl shadow-[0_0_32px_rgba(139,92,246,0.4)] backdrop-blur-md p-3.5 select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] animate-ping" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#8B5CF6]" />
            TAP-TO-SYNC MODE ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#c0c1ff]">
            {stampedCount} / {totalWords} words
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1E1E26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Target Word Display */}
      <div className="p-3 rounded-lg bg-[#0E0E12] border border-[#272730] flex flex-col items-center justify-center my-2 text-center">
        <span className="font-mono text-[10px] uppercase text-[#71717A] mb-1">
          Next Word to Stamp at Needle {formatPrecisionTimecode(currentTime)}:
        </span>
        <div className="text-2xl font-display font-bold text-[#FFFFFF] tracking-tight">
          &ldquo;{targetWord?.word || currentLine?.text || 'Next Phrase'}&rdquo;
        </div>
        {nextWord && (
          <div className="flex items-center gap-1 font-sans text-xs text-[#71717A] mt-1">
            <span>Upcoming:</span>
            <span className="text-[#A1A1AA] italic">&ldquo;{nextWord.word}&rdquo;</span>
          </div>
        )}
      </div>

      {/* Stamp Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onStamp}
          className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:brightness-110 active:scale-95 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(99,102,241,0.4)] transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>TAP [SPACEBAR] OR CLICK TO STAMP</span>
        </button>

        <button
          onClick={onClose}
          className="px-3 py-2.5 rounded-lg bg-[#1E1E26] hover:bg-[#272730] border border-[#3F3F4E] text-white font-mono text-xs flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
