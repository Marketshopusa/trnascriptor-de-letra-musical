import React, { useState } from 'react';
import { 
  Mic, 
  FileText, 
  Code, 
  Sparkles, 
  Plus, 
  Trash2, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Scissors,
  Zap,
  ArrowRight
} from 'lucide-react';
import { LrcLine, LrcWord, RightPaneMode, TrackMetadata } from '../types';
import { formatLrcTimestamp, formatPrecisionTimecode, exportToEnhancedLrc, exportToStandardLrc, parseLrcString } from '../utils/lrcParser';

interface RightLyricsPaneProps {
  lines: LrcLine[];
  currentTime: number;
  activeLineId: string | null;
  activeWordId: string | null;
  onSelectLine: (lineId: string) => void;
  onSeek: (seconds: number) => void;
  onUpdateLine: (lineId: string, updates: Partial<LrcLine>) => void;
  onUpdateWord: (lineId: string, wordId: string, updates: Partial<LrcWord>) => void;
  onAddLine: (startTime: number) => void;
  onDeleteLine: (lineId: string) => void;
  onSplitLine: (lineId: string, wordIndex: number) => void;
  onTriggerAiSync: () => void;
  isAiProcessing: boolean;
  meta: TrackMetadata;
  onImportRawLrc: (raw: string) => void;
}

export const RightLyricsPane: React.FC<RightLyricsPaneProps> = ({
  lines,
  currentTime,
  activeLineId,
  activeWordId,
  onSelectLine,
  onSeek,
  onUpdateLine,
  onUpdateWord,
  onAddLine,
  onDeleteLine,
  onSplitLine,
  onTriggerAiSync,
  isAiProcessing,
  meta,
  onImportRawLrc,
}) => {
  const [activeTab, setActiveTab] = useState<RightPaneMode>('karaoke');
  const [rawText, setRawText] = useState<string>('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // Selected line object for word-level inspector
  const selectedLine = lines.find((l) => l.id === activeLineId) || lines[0] || null;

  // Initialize raw text on tab change
  const handleTabChange = (tab: RightPaneMode) => {
    setActiveTab(tab);
    if (tab === 'raw') {
      setRawText(exportToEnhancedLrc(lines, meta));
    }
  };

  const handleApplyRaw = () => {
    onImportRawLrc(rawText);
  };

  // Nudge line time by delta
  const handleNudgeLine = (lineId: string, deltaSeconds: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const newStart = Math.max(0, line.startTime + deltaSeconds);
    const newEnd = Math.max(newStart + 0.5, line.endTime + deltaSeconds);
    const updatedWords = line.words.map((w) => ({
      ...w,
      startTime: Math.max(0, w.startTime + deltaSeconds),
      endTime: Math.max(0.1, w.endTime + deltaSeconds),
    }));
    onUpdateLine(lineId, {
      startTime: newStart,
      endTime: newEnd,
      words: updatedWords,
    });
  };

  return (
    <aside className="w-full lg:w-[380px] shrink-0 bg-[#0E0E12] border-l border-[#272730] flex flex-col h-full overflow-hidden select-none">
      {/* Pane Header with 4 Mode Tabs */}
      <div className="h-11 border-b border-[#272730] bg-[#14141A] px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTabChange('karaoke')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'karaoke'
                ? 'bg-[#1E1E26] text-[#FFFFFF] border border-[#6366F1]/50 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Karaoke</span>
          </button>

          <button
            onClick={() => handleTabChange('editor')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'editor'
                ? 'bg-[#1E1E26] text-[#FFFFFF] border border-[#6366F1]/50'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#6366F1]" />
            <span>Editor</span>
          </button>

          <button
            onClick={() => handleTabChange('raw')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'raw'
                ? 'bg-[#1E1E26] text-[#FFFFFF] border border-[#6366F1]/50'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>Raw LRC</span>
          </button>

          <button
            onClick={() => handleTabChange('ai')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'ai'
                ? 'bg-[#1E1E26] text-[#FFFFFF] border border-[#8B5CF6]/50'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>AI Align</span>
          </button>
        </div>

        {/* Add Line at Current Playhead */}
        <button
          onClick={() => onAddLine(currentTime)}
          title="Add Line at Current Playhead"
          className="p-1 rounded bg-[#1E1E26] hover:bg-[#6366F1] text-[#A1A1AA] hover:text-white border border-[#272730] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* TAB 1: KARAOKE SYNC (Word-by-word timed karaoke chips) */}
        {activeTab === 'karaoke' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#71717A] px-1">
              <span>REAL-TIME WORD TIMING</span>
              <span className="text-[#8B5CF6]">KARAOKE ENGINE v2.0</span>
            </div>

            {lines.map((line) => {
              const isPlayingLine = currentTime >= line.startTime && currentTime <= line.endTime;
              const isSelected = line.id === activeLineId;

              return (
                <div
                  key={line.id}
                  onClick={() => onSelectLine(line.id)}
                  className={`p-3 rounded transition-all cursor-pointer relative ${
                    isPlayingLine
                      ? 'bg-[#1E1E26] border-l-[3px] border-l-[#6366F1] border-y border-r border-[#3F3F4E] shadow-[0_0_16px_rgba(99,102,241,0.2)]'
                      : isSelected
                      ? 'bg-[#14141A] border-l-[3px] border-l-[#8B5CF6] border-y border-r border-[#272730]'
                      : 'bg-[#14141A] border border-[#272730] hover:border-[#3F3F4E]'
                  }`}
                >
                  {/* Timestamp & Confidence Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#71717A]">
                        {formatLrcTimestamp(line.startTime)}
                      </span>
                      {isPlayingLine && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-[#6366F1] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-ping" />
                          PLAYING
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
                          line.confidence > 95
                            ? 'bg-[#10B981]/15 text-[#10B981]'
                            : 'bg-[#EF4444]/15 text-[#EF4444]'
                        }`}
                      >
                        {line.confidence}% SYNC
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(line.startTime);
                        }}
                        title="Jump Playhead Here"
                        className="p-1 rounded bg-[#1E1E26] text-[#71717A] hover:text-[#FFFFFF]"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Word-by-Word Timed Karaoke Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {line.words.map((word) => {
                      const isWordActive =
                        currentTime >= word.startTime && currentTime <= word.endTime;
                      const isWordPast = currentTime > word.endTime;

                      return (
                        <button
                          key={word.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek(word.startTime);
                          }}
                          title={`Click to jump to ${word.word} (${formatLrcTimestamp(word.startTime)})`}
                          className={`px-2 py-1 rounded text-xs transition-all font-display ${
                            isWordActive
                              ? 'bg-[#8B5CF6] text-white font-bold shadow-[0_0_12px_rgba(139,92,246,0.7)] scale-105'
                              : isWordPast
                              ? 'bg-[#1E1E26] text-[#FFFFFF] font-medium border border-[#3F3F4E]'
                              : isPlayingLine
                              ? 'bg-[#14141A] text-[#A1A1AA] border border-[#272730]'
                              : 'bg-[#0E0E12] text-[#71717A] hover:text-[#FFFFFF] border border-[#272730]'
                          }`}
                        >
                          {word.word}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: LRC EDITOR (Inline Timestamp & Line Management) */}
        {activeTab === 'editor' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#71717A] px-1">
              <span>LRC TIMESTAMP BRACKETS</span>
              <span>{lines.length} LINES</span>
            </div>

            {lines.map((line, idx) => {
              const isSelected = line.id === activeLineId;
              const isEditing = editingLineId === line.id;

              return (
                <div
                  key={line.id}
                  onClick={() => onSelectLine(line.id)}
                  className={`p-2.5 rounded border transition-all ${
                    isSelected
                      ? 'bg-[#1E1E26] border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                      : 'bg-[#14141A] border-[#272730] hover:border-[#3F3F4E]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {/* Timestamp bracket & Nudge Controls */}
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-xs font-bold text-[#c0c1ff] bg-[#0E0E12] px-1.5 py-0.5 rounded border border-[#272730]">
                        {formatLrcTimestamp(line.startTime)}
                      </span>

                      {/* Millisecond Nudge Buttons */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNudgeLine(line.id, -0.05);
                        }}
                        title="-50ms"
                        className="px-1 py-0.5 rounded bg-[#0E0E12] hover:bg-[#6366F1] text-[10px] text-[#A1A1AA] hover:text-white border border-[#272730]"
                      >
                        -50ms
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNudgeLine(line.id, 0.05);
                        }}
                        title="+50ms"
                        className="px-1 py-0.5 rounded bg-[#0E0E12] hover:bg-[#6366F1] text-[10px] text-[#A1A1AA] hover:text-white border border-[#272730]"
                      >
                        +50ms
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateLine(line.id, { startTime: currentTime });
                        }}
                        title="Lock Start Time to Current Playhead"
                        className="px-1.5 py-0.5 rounded bg-[#0E0E12] hover:bg-[#10B981] text-[10px] text-[#10B981] hover:text-white border border-[#272730]"
                      >
                        Snap
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(line.startTime);
                        }}
                        title="Play from here"
                        className="p-1 rounded bg-[#0E0E12] text-[#71717A] hover:text-white"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLine(line.id);
                        }}
                        title="Delete line"
                        className="p-1 rounded bg-[#0E0E12] text-[#71717A] hover:text-[#EF4444]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Lyric Text Editor */}
                  {isEditing ? (
                    <input
                      type="text"
                      autoFocus
                      defaultValue={line.text}
                      onBlur={(e) => {
                        onUpdateLine(line.id, { text: e.target.value });
                        setEditingLineId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUpdateLine(line.id, { text: (e.target as any).value });
                          setEditingLineId(null);
                        }
                      }}
                      className="w-full bg-[#0E0E12] border border-[#6366F1] rounded px-2 py-1 text-xs text-white font-sans focus:outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => setEditingLineId(line.id)}
                      className="text-xs text-[#F4F4F5] font-sans hover:text-[#c0c1ff] transition-colors cursor-text"
                    >
                      {line.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: RAW LRC CODE */}
        {activeTab === 'raw' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#71717A]">
              <span>STANDARD & ENHANCED LRC CODE</span>
              <span className="text-[#06B6D4]">SYNTAX FORMAT</span>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={16}
              className="w-full bg-[#0E0E12] border border-[#272730] focus:border-[#6366F1] rounded p-2.5 font-mono text-xs text-[#F4F4F5] leading-relaxed resize-none focus:outline-none"
              placeholder="Paste or edit LRC text here..."
            />

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setRawText(exportToStandardLrc(lines, meta))}
                className="px-2.5 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-xs font-mono text-[#A1A1AA] hover:text-[#FFFFFF]"
              >
                Standard LRC
              </button>
              <button
                onClick={() => setRawText(exportToEnhancedLrc(lines, meta))}
                className="px-2.5 py-1.5 rounded bg-[#14141A] hover:bg-[#1E1E26] border border-[#272730] text-xs font-mono text-[#8B5CF6] hover:text-[#FFFFFF]"
              >
                Enhanced v2.0
              </button>
              <button
                onClick={handleApplyRaw}
                className="px-3 py-1.5 rounded bg-[#6366F1] hover:bg-[#4F46E5] text-xs font-mono text-white font-medium"
              >
                Apply to Workstation
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: AI SYNC ASSISTANT (Powered by Gemini) */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-gradient-to-br from-[#14141A] to-[#1E1E26] border border-[#8B5CF6]/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-[#8B5CF6] animate-pulse" />
                <span className="font-display font-semibold text-sm text-[#FFFFFF]">
                  Gemini Audio Intelligence
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed font-sans">
                Aligns unstructured lyrics to the audio beat-grid ({meta.bpm} BPM) and computes word-by-word timestamps down to the millisecond.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={onTriggerAiSync}
                disabled={isAiProcessing}
                className="w-full p-2.5 rounded bg-[#6366F1] hover:bg-[#4F46E5] active:scale-[0.98] text-white text-xs font-mono font-medium flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50"
              >
                {isAiProcessing ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing Cadence & Syllables...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Auto-Align All Timings with Gemini</span>
                  </>
                )}
              </button>

              <div className="p-2.5 rounded bg-[#14141A] border border-[#272730] space-y-1.5">
                <span className="font-mono text-[10px] uppercase text-[#71717A] tracking-wider">
                  Synchronization Metrics
                </span>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">Rhythmic Model:</span>
                  <span className="text-[#06B6D4]">Deterministic + Gemini 3.8</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">Beat Division:</span>
                  <span className="text-[#F4F4F5]">128 BPM (0.468s / beat)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#A1A1AA]">Alignment Quality:</span>
                  <span className="text-[#10B981] font-semibold">98.4% Confidence</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Docked Word Sync Inspector at Bottom */}
      {selectedLine && (
        <div className="p-3 border-t border-[#272730] bg-[#14141A] shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#71717A] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#6366F1]" />
              WORD INSPECTOR: &ldquo;{selectedLine.words[0]?.word || ''}...&rdquo;
            </span>
            <span className="font-mono text-[10px] text-[#c0c1ff]">
              {selectedLine.words.length} words
            </span>
          </div>

          {/* Micro Word Chips with Duration */}
          <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px]">
            {selectedLine.words.map((w) => {
              const durationMs = Math.round((w.endTime - w.startTime) * 1000);
              const isActive = activeWordId === w.id;

              return (
                <div
                  key={w.id}
                  onClick={() => onSeek(w.startTime)}
                  className={`px-2 py-1 rounded flex items-center justify-between cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#8B5CF6]/30 text-white border border-[#8B5CF6]'
                      : 'bg-[#0E0E12] text-[#A1A1AA] hover:text-white border border-[#272730]'
                  }`}
                >
                  <span className="font-medium text-white">{w.word}</span>
                  <div className="flex items-center gap-2 text-[10px] text-[#71717A]">
                    <span>{formatPrecisionTimecode(w.startTime).slice(3)}</span>
                    <span className="text-[#8B5CF6] font-semibold">{durationMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
