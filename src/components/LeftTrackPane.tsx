import React from 'react';
import { 
  Sliders, 
  Volume2, 
  VolumeX, 
  Layers, 
  Compass, 
  Crosshair, 
  Mic2, 
  Music2, 
  Disc3, 
  Drum, 
  Grid, 
  Eye
} from 'lucide-react';
import { TrackMetadata, StemsState, StemKey, TimelineState } from '../types';
import { formatPrecisionTimecode } from '../utils/lrcParser';

interface LeftTrackPaneProps {
  meta: TrackMetadata;
  stems: StemsState;
  onUpdateStem: (key: StemKey, updates: Partial<StemsState[StemKey]>) => void;
  timelineState: TimelineState;
  onUpdateTimeline: (updates: Partial<TimelineState>) => void;
  currentTime: number;
  peaks: number[];
}

export const LeftTrackPane: React.FC<LeftTrackPaneProps> = ({
  meta,
  stems,
  onUpdateStem,
  timelineState,
  onUpdateTimeline,
  currentTime,
  peaks,
}) => {
  // Stem visual metadata
  const stemIcons: Record<StemKey, React.ReactNode> = {
    master: <Sliders className="w-3.5 h-3.5 text-[#6366F1]" />,
    vocals: <Mic2 className="w-3.5 h-3.5 text-[#8B5CF6]" />,
    instruments: <Music2 className="w-3.5 h-3.5 text-[#6366F1]" />,
    bass: <Disc3 className="w-3.5 h-3.5 text-[#06B6D4]" />,
    drums: <Drum className="w-3.5 h-3.5 text-[#10B981]" />,
  };

  const stemBadgeColors: Record<StemKey, string> = {
    master: 'bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/30',
    vocals: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30',
    instruments: 'bg-[#6366F1]/15 text-[#6366F1] border-[#6366F1]/30',
    bass: 'bg-[#06B6D4]/15 text-[#06B6D4] border-[#06B6D4]/30',
    drums: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
  };

  return (
    <aside className="w-full lg:w-[280px] shrink-0 bg-[#0E0E12] border-r border-[#272730] flex flex-col h-full overflow-y-auto overflow-x-hidden text-xs select-none">
      {/* Section 1: Track Source Meta Card */}
      <div className="p-3 border-b border-[#272730] bg-[#14141A]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-[#06B6D4]" />
            SOURCE TELEMETRY
          </span>
          <span className="font-mono text-[10px] text-[#10B981] font-semibold">
            {meta.hasAudioFile ? 'CUSTOM FILE' : 'SYNTH STEREO'}
          </span>
        </div>

        <h3 className="font-display font-semibold text-sm text-[#FFFFFF] truncate">
          {meta.title}
        </h3>
        <p className="font-sans text-xs text-[#A1A1AA] truncate -mt-0.5">
          {meta.artist} • <span className="text-[#71717A]">{meta.album}</span>
        </p>

        {/* Mini Waveform Radar Overview */}
        <div className="mt-2.5 h-7 w-full bg-[#121218] border border-[#272730] rounded relative overflow-hidden flex items-center px-1">
          <div className="w-full flex items-center gap-[1px] h-full py-1">
            {peaks.slice(0, 60).map((peak, idx) => {
              const played = (idx / 60) * meta.duration <= currentTime;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-[1px] transition-colors ${
                    played ? 'bg-[#818CF8]' : 'bg-[#312E81]'
                  }`}
                  style={{ height: `${Math.max(15, peak * 100)}%` }}
                />
              );
            })}
          </div>
          {/* Mini Playhead line */}
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-[#F43F5E] shadow-[0_0_6px_#F43F5E]"
            style={{
              left: `${Math.min(100, (currentTime / meta.duration) * 100)}%`,
            }}
          />
        </div>

        {/* Telemetry Grid */}
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 font-mono text-[11px]">
          <div className="bg-[#0E0E12] border border-[#272730] rounded p-1.5 flex flex-col">
            <span className="text-[9px] uppercase text-[#71717A]">Duration</span>
            <span className="font-semibold text-[#F4F4F5]">
              {formatPrecisionTimecode(meta.duration).split('.')[0]}
            </span>
          </div>
          <div className="bg-[#0E0E12] border border-[#272730] rounded p-1.5 flex flex-col">
            <span className="text-[9px] uppercase text-[#71717A]">Tempo / Key</span>
            <span className="font-semibold text-[#06B6D4]">
              {meta.bpm} BPM / {meta.key.split(' ')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: AI Stem Separation Mixer */}
      <div className="p-3 border-b border-[#272730] flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#8B5CF6]" />
            STEMS ISOLATION MIXER
          </span>
          <span className="text-[10px] font-mono text-[#8B5CF6] font-medium">4-BAND DSP</span>
        </div>

        {/* Stems list */}
        <div className="space-y-2">
          {(['master', 'vocals', 'instruments', 'bass', 'drums'] as StemKey[]).map((key) => {
            const stem = stems[key];
            const isMaster = key === 'master';

            return (
              <div
                key={key}
                className={`p-2 rounded border transition-all ${
                  stem.solo
                    ? 'bg-[#1E1E26] border-[#8B5CF6]'
                    : stem.muted
                    ? 'bg-[#0E0E12]/60 border-[#272730] opacity-50'
                    : 'bg-[#14141A] border-[#272730] hover:border-[#3F3F4E]'
                }`}
              >
                {/* Header row: Icon, Label, Solo, Mute */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {stemIcons[key]}
                    <span className="font-display font-medium text-xs text-[#FFFFFF] capitalize">
                      {key}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1 py-0.2 rounded border ${stemBadgeColors[key]}`}
                    >
                      {key === 'master' ? 'MAIN' : 'STEM'}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-1">
                    {!isMaster && (
                      <button
                        onClick={() => onUpdateStem(key, { solo: !stem.solo })}
                        title="Solo Stem"
                        className={`w-5 h-5 rounded font-mono text-[10px] font-bold flex items-center justify-center transition-all ${
                          stem.solo
                            ? 'bg-[#8B5CF6] text-white shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                            : 'bg-[#1E1E26] text-[#71717A] hover:text-[#FFFFFF] border border-[#272730]'
                        }`}
                      >
                        S
                      </button>
                    )}
                    <button
                      onClick={() => onUpdateStem(key, { muted: !stem.muted })}
                      title="Mute Stem"
                      className={`w-5 h-5 rounded font-mono text-[10px] font-bold flex items-center justify-center transition-all ${
                        stem.muted
                          ? 'bg-[#EF4444] text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                          : 'bg-[#1E1E26] text-[#71717A] hover:text-[#FFFFFF] border border-[#272730]'
                      }`}
                    >
                      {stem.muted ? <VolumeX className="w-3 h-3" /> : 'M'}
                    </button>
                  </div>
                </div>

                {/* Slider Row */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#71717A] w-5">VOL</span>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.02"
                    value={stem.volume}
                    onChange={(e) => onUpdateStem(key, { volume: parseFloat(e.target.value) })}
                    className="flex-1 h-1 bg-[#1E1E26] rounded appearance-none cursor-pointer accent-[#6366F1]"
                  />
                  <span className="font-mono text-[10px] text-[#A1A1AA] w-8 text-right">
                    {Math.round(stem.volume * 100)}%
                  </span>
                </div>

                {/* Stereo Pan Slider (for non-master stems) */}
                {!isMaster && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-mono text-[#71717A] w-5">PAN</span>
                    <input
                      type="range"
                      min="-1.0"
                      max="1.0"
                      step="0.05"
                      value={stem.pan}
                      onChange={(e) => onUpdateStem(key, { pan: parseFloat(e.target.value) })}
                      className="flex-1 h-1 bg-[#1E1E26] rounded appearance-none cursor-pointer accent-[#8B5CF6]"
                    />
                    <span className="font-mono text-[9px] text-[#71717A] w-8 text-right">
                      {stem.pan === 0 ? 'C' : stem.pan < 0 ? `L${Math.abs(Math.round(stem.pan * 100))}` : `R${Math.round(stem.pan * 100)}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Visual Analysis & Spectral Toggles */}
      <div className="p-3 bg-[#14141A]/60 border-t border-[#272730] space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
          <Crosshair className="w-3 h-3 text-[#06B6D4]" />
          TELEMETRY OVERLAYS
        </span>

        {/* Transient Markers Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
            <span className="text-xs text-[#F4F4F5] font-sans">Transient Markers</span>
          </div>
          <button
            onClick={() => onUpdateTimeline({ showTransients: !timelineState.showTransients })}
            className={`w-7 h-4 rounded-full transition-colors relative ${
              timelineState.showTransients ? 'bg-[#06B6D4]' : 'bg-[#1E1E26]'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                timelineState.showTransients ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Pitch Curves Toggle */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
            <span className="text-xs text-[#F4F4F5] font-sans">Pitch Curves</span>
          </div>
          <button
            onClick={() => onUpdateTimeline({ showPitchCurves: !timelineState.showPitchCurves })}
            className={`w-7 h-4 rounded-full transition-colors relative ${
              timelineState.showPitchCurves ? 'bg-[#8B5CF6]' : 'bg-[#1E1E26]'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                timelineState.showPitchCurves ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Beat Grid Snap */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5">
            <Grid className="w-3 h-3 text-[#71717A]" />
            <span className="text-xs text-[#F4F4F5] font-sans">Grid Division</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            {[4, 8, 16].map((div) => (
              <button
                key={div}
                onClick={() => onUpdateTimeline({ gridDivision: div, snapToGrid: true })}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  timelineState.snapToGrid && timelineState.gridDivision === div
                    ? 'bg-[#6366F1] text-white border-[#6366F1]'
                    : 'bg-[#1E1E26] text-[#71717A] border-[#272730] hover:text-[#FFFFFF]'
                }`}
              >
                1/{div}
              </button>
            ))}
            <button
              onClick={() => onUpdateTimeline({ snapToGrid: !timelineState.snapToGrid })}
              className={`px-1.5 py-0.5 rounded border ${
                !timelineState.snapToGrid
                  ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40'
                  : 'bg-[#1E1E26] text-[#71717A] border-[#272730]'
              }`}
            >
              Off
            </button>
          </div>
        </div>

        {/* Confidence Heatmap */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-[#10B981]" />
            <span className="text-xs text-[#F4F4F5] font-sans">Sync Confidence</span>
          </div>
          <button
            onClick={() => onUpdateTimeline({ showConfidenceHeatmap: !timelineState.showConfidenceHeatmap })}
            className={`w-7 h-4 rounded-full transition-colors relative ${
              timelineState.showConfidenceHeatmap ? 'bg-[#10B981]' : 'bg-[#1E1E26]'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                timelineState.showConfidenceHeatmap ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
};
