import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  ChevronLeft, 
  ChevronRight, 
  Repeat, 
  ZoomIn, 
  ZoomOut, 
  Gauge, 
  Radio,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { formatPrecisionTimecode } from '../utils/lrcParser';

interface TransportBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onStepTime: (deltaSeconds: number) => void;
  onStepLine: (deltaLines: number) => void;
  playbackRate: number;
  onChangeRate: (rate: number) => void;
  zoom: number;
  onChangeZoom: (zoom: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  isTapSyncActive: boolean;
  onToggleTapSync: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onStepTime,
  onStepLine,
  playbackRate,
  onChangeRate,
  zoom,
  onChangeZoom,
  isLooping,
  onToggleLoop,
  isTapSyncActive,
  onToggleTapSync,
}) => {
  return (
    <div className="h-16 bg-[#0E0E12] border-t border-[#272730] px-4 flex items-center justify-between select-none shrink-0 z-20">
      {/* Left: High-Precision Monospace Timecode Display */}
      <div className="flex items-center gap-3">
        <div className="flex items-baseline bg-[#09090B] border border-[#272730] rounded px-3 py-1 font-mono font-tabular">
          <span className="text-xl md:text-2xl font-bold tracking-wider text-[#FFFFFF] drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
            {formatPrecisionTimecode(currentTime)}
          </span>
          <span className="text-xs text-[#71717A] ml-2 font-medium">
            / {formatPrecisionTimecode(duration).split('.')[0]}
          </span>
        </div>

        {/* Quick jump to start */}
        <button
          onClick={() => onSeek(0)}
          title="Return to Zero (Start)"
          className="p-2 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-[#A1A1AA] hover:text-[#FFFFFF] transition-all"
        >
          <SkipBack className="w-4 h-4" />
        </button>
      </div>

      {/* Center: DAW Transport Control Pads */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Step Line Back */}
        <button
          onClick={() => onStepLine(-1)}
          title="Jump to Previous Lyric Line ([)"
          className="p-2 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-[#A1A1AA] hover:text-[#FFFFFF] transition-all hidden sm:flex items-center"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Step 1s Back */}
        <button
          onClick={() => onStepTime(-1)}
          title="Rewind 1 Second (J)"
          className="px-2.5 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-xs font-mono text-[#A1A1AA] hover:text-[#FFFFFF] transition-all flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden md:inline">-1s</span>
        </button>

        {/* Master Play / Pause Pad (36x36px with luminescent neon pulse) */}
        <button
          onClick={onTogglePlay}
          title="Play / Pause (Spacebar)"
          className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-[#6366F1] text-white shadow-[0_0_18px_rgba(99,102,241,0.6)] ring-2 ring-[#818CF8]/50 animate-pulse'
              : 'bg-[#1E1E26] text-[#FFFFFF] hover:bg-[#6366F1] border border-[#3F3F4E] hover:border-[#6366F1]'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Step 1s Forward */}
        <button
          onClick={() => onStepTime(1)}
          title="Forward 1 Second (L)"
          className="px-2.5 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-xs font-mono text-[#A1A1AA] hover:text-[#FFFFFF] transition-all flex items-center gap-1"
        >
          <span className="hidden md:inline">+1s</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Step Line Forward */}
        <button
          onClick={() => onStepLine(1)}
          title="Jump to Next Lyric Line (])"
          className="p-2 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-[#A1A1AA] hover:text-[#FFFFFF] transition-all hidden sm:flex items-center"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* Loop Toggle */}
        <button
          onClick={onToggleLoop}
          title="Loop Playback"
          className={`p-2 rounded border transition-all ${
            isLooping
              ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
              : 'bg-[#14141A] border-[#272730] text-[#71717A] hover:text-[#FFFFFF]'
          }`}
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Playback Speed & Zoom Scrubber */}
      <div className="flex items-center gap-3">
        {/* Playback Rate Selector */}
        <div className="hidden lg:flex items-center gap-1 bg-[#14141A] border border-[#272730] rounded p-1">
          <Gauge className="w-3.5 h-3.5 text-[#71717A] ml-1" />
          {[0.5, 0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => onChangeRate(rate)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                playbackRate === rate
                  ? 'bg-[#6366F1] text-white font-bold'
                  : 'text-[#71717A] hover:text-[#FFFFFF]'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Timeline Zoom Slider */}
        <div className="flex items-center gap-1.5 bg-[#14141A] border border-[#272730] rounded px-2 py-1.5">
          <button
            onClick={() => onChangeZoom(Math.max(1, zoom - 0.5))}
            className="text-[#71717A] hover:text-[#FFFFFF]"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={zoom}
            onChange={(e) => onChangeZoom(parseFloat(e.target.value))}
            className="w-16 md:w-20 h-1 bg-[#1E1E26] rounded appearance-none cursor-pointer accent-[#6366F1]"
          />

          <button
            onClick={() => onChangeZoom(Math.min(10, zoom + 0.5))}
            className="text-[#71717A] hover:text-[#FFFFFF]"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <span className="font-mono text-[10px] text-[#A1A1AA] w-6 text-right">
            {zoom}x
          </span>
        </div>

        {/* Tap-to-Sync HUD indicator */}
        <div className="hidden xl:flex items-center">
          <button
            onClick={onToggleTapSync}
            className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border transition-all ${
              isTapSyncActive
                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#c4abff]'
                : 'bg-[#14141A] border-[#272730] text-[#71717A]'
            }`}
          >
            <Radio className="w-3 h-3 text-[#8B5CF6]" />
            <span>{isTapSyncActive ? 'TAP [SPACE] TO STAMP' : 'Tap Stamping'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
