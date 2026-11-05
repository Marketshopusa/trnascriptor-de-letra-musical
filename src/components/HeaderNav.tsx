import React, { useRef } from 'react';
import { 
  AudioWaveform, 
  Sparkles, 
  Download, 
  Keyboard, 
  Upload, 
  ChevronDown, 
  Radio, 
  Zap,
  Activity
} from 'lucide-react';
import { TrackMetadata } from '../types';
import { SAMPLE_PROJECTS } from '../data/sampleTracks';

interface HeaderNavProps {
  currentTrack: TrackMetadata;
  onSelectProject: (id: string) => void;
  onFileUpload: (file: File) => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
  onTriggerAiSync: () => void;
  isAiProcessing: boolean;
  isTapSyncActive: boolean;
  onToggleTapSync: () => void;
  verifiedCount: number;
  totalLinesCount: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentTrack,
  onSelectProject,
  onFileUpload,
  onOpenExport,
  onOpenShortcuts,
  onTriggerAiSync,
  isAiProcessing,
  isTapSyncActive,
  onToggleTapSync,
  verifiedCount,
  totalLinesCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="h-14 border-b border-[#272730] bg-[#0E0E12] px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#14141A] border border-[#3F3F4E] flex items-center justify-center text-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.25)]">
            <AudioWaveform className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm tracking-tight text-[#FFFFFF]">
                STUDIO SYNCHRONY
              </span>
              <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded bg-[#1E1E26] text-[#6366F1] border border-[#272730]">
                DAW v2.0
              </span>
            </div>
            <p className="text-[11px] text-[#71717A] font-sans -mt-0.5 hidden sm:block">
              Precision Audio Intelligence & LRC Workstation
            </p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-[#272730] hidden md:block" />

        {/* Project Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] hover:border-[#3F3F4E] transition-all text-xs font-mono text-[#F4F4F5]"
          >
            <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span className="max-w-[150px] sm:max-w-[180px] truncate font-medium">
              {currentTrack.title}
            </span>
            <ChevronDown className="w-3 h-3 text-[#71717A]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-[#14141A] border border-[#3F3F4E] rounded-md shadow-2xl p-1.5 z-50">
              <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#71717A] tracking-wider">
                Preset Studio Sessions
              </div>
              {SAMPLE_PROJECTS.map((proj) => (
                <button
                  key={proj.meta.id}
                  onClick={() => {
                    onSelectProject(proj.meta.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                    currentTrack.id === proj.meta.id
                      ? 'bg-[#1E1E26] text-[#FFFFFF] border border-[#6366F1]/40'
                      : 'text-[#A1A1AA] hover:bg-[#1E1E26] hover:text-[#FFFFFF]'
                  }`}
                >
                  <span className="truncate">{proj.meta.title}</span>
                  <span className="text-[10px] font-mono text-[#71717A]">{proj.meta.bpm} BPM</span>
                </button>
              ))}

              <div className="my-1 border-t border-[#272730]" />

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsDropdownOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded text-xs text-[#06B6D4] hover:bg-[#1E1E26] flex items-center gap-2 transition-colors font-mono"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Custom Audio File...</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Format Telemetry Pills */}
      <div className="hidden lg:flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded bg-[#14141A] text-[#A1A1AA] border border-[#272730] font-mono text-[11px] font-medium tracking-wide">
          {currentTrack.sampleRate}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#14141A] text-[#A1A1AA] border border-[#272730] font-mono text-[11px] font-medium tracking-wide">
          {currentTrack.bitDepth}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#14141A] text-[#8B5CF6] border border-[#272730] font-mono text-[11px] font-semibold tracking-wide">
          {currentTrack.format}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#14141A] text-[#06B6D4] border border-[#272730] font-mono text-[11px] font-semibold tracking-wide">
          {currentTrack.bpm} BPM • {currentTrack.key}
        </span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#14141A] border border-[#272730] text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-[#10B981] font-semibold">
            {verifiedCount}/{totalLinesCount} SYNCED
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Hidden Audio File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload Audio quick button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload audio (MP3, WAV, FLAC, OGG)"
          className="px-2.5 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] hover:border-[#3F3F4E] text-[#A1A1AA] hover:text-[#FFFFFF] text-xs font-mono flex items-center gap-1.5 transition-all"
        >
          <Upload className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span className="hidden xl:inline">Load Audio</span>
        </button>

        {/* Tap-to-Sync Mode Toggle */}
        <button
          onClick={onToggleTapSync}
          title="Tap [Spacebar] during playback to stamp lines & words in real-time"
          className={`px-2.5 py-1.5 rounded border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
            isTapSyncActive
              ? 'bg-[#8B5CF6] text-[#FFFFFF] border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.5)] animate-pulse'
              : 'bg-[#14141A] text-[#A1A1AA] hover:text-[#FFFFFF] border-[#272730] hover:border-[#3F3F4E]'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isTapSyncActive ? 'text-white' : 'text-[#8B5CF6]'}`} />
          <span>Tap Sync</span>
        </button>

        {/* AI Auto-Align Action */}
        <button
          onClick={onTriggerAiSync}
          disabled={isAiProcessing}
          className="px-3 py-1.5 rounded bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:brightness-110 active:scale-95 text-[#FFFFFF] text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(99,102,241,0.35)] disabled:opacity-50"
        >
          {isAiProcessing ? (
            <Zap className="w-3.5 h-3.5 animate-spin text-[#FFFFFF]" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#FFFFFF]" />
          )}
          <span className="hidden sm:inline">AI Align</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="px-3 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] hover:border-[#3F3F4E] text-[#FFFFFF] text-xs font-mono font-medium flex items-center gap-1.5 transition-all hover:border-[#6366F1]/50"
        >
          <Download className="w-3.5 h-3.5 text-[#6366F1]" />
          <span>Export</span>
        </button>

        {/* Keyboard Shortcuts Button */}
        <button
          onClick={onOpenShortcuts}
          title="DAW Keyboard Shortcuts"
          className="p-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-[#71717A] hover:text-[#FFFFFF] transition-all"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
