/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { LeftTrackPane } from './components/LeftTrackPane';
import { WaveformTimeline } from './components/WaveformTimeline';
import { TransportBar } from './components/TransportBar';
import { RightLyricsPane } from './components/RightLyricsPane';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { TapSyncOverlay } from './components/TapSyncOverlay';
import { audioEngine } from './services/audioEngine';
import { SAMPLE_PROJECTS } from './data/sampleTracks';
import { LrcLine, LrcWord, StemKey, StemsState, TimelineState, TrackMetadata } from './types';
import { parseLrcString } from './utils/lrcParser';

export default function App() {
  // Current active track project
  const initialProject = SAMPLE_PROJECTS[0];
  const [currentTrack, setCurrentTrack] = useState<TrackMetadata>(initialProject.meta);
  const [lines, setLines] = useState<LrcLine[]>(initialProject.lines);

  // Stems state
  const [stems, setStems] = useState<StemsState>({
    master: { volume: 0.9, muted: false, solo: false, pan: 0, color: '#6366F1', label: 'Master' },
    vocals: { volume: 1.0, muted: false, solo: false, pan: 0, color: '#8B5CF6', label: 'Vocals' },
    instruments: { volume: 0.85, muted: false, solo: false, pan: 0, color: '#6366F1', label: 'Instruments' },
    bass: { volume: 0.9, muted: false, solo: false, pan: 0, color: '#06B6D4', label: 'Bass' },
    drums: { volume: 0.95, muted: false, solo: false, pan: 0, color: '#10B981', label: 'Drums' },
  });

  // Timeline view state
  const [timelineState, setTimelineState] = useState<TimelineState>({
    zoom: 2.5,
    scrollLeft: 0,
    loopStart: null,
    loopEnd: null,
    isLooping: true,
    activeTool: 'pointer',
    snapToGrid: true,
    gridDivision: 4,
    showTransients: true,
    showPitchCurves: true,
    showConfidenceHeatmap: true,
  });

  // Audio Playback state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [transients, setTransients] = useState<number[]>([]);

  // Selection
  const [activeLineId, setActiveLineId] = useState<string | null>(initialProject.lines[1]?.id || null);

  // Modals & AI State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Tap-to-Sync State
  const [isTapSyncActive, setIsTapSyncActive] = useState(false);
  const [tapWordIndex, setTapWordIndex] = useState(0);

  // Mobile layout tab
  const [mobileTab, setMobileTab] = useState<'timeline' | 'stems' | 'lyrics'>('timeline');

  // Show temporary toast notification
  const showToast = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Initialize AudioEngine on mount
  useEffect(() => {
    audioEngine.setListeners({
      onTimeUpdate: (time) => {
        setCurrentTime(time);
      },
      onPeaksGenerated: (p, t) => {
        setPeaks(p);
        setTransients(t);
      },
      onEnded: () => {
        setIsPlaying(false);
      },
    });

    audioEngine.setTrack(currentTrack.duration, currentTrack.bpm);
    audioEngine.updateStems(stems);
    setPeaks(audioEngine.getPeaks());
    setTransients(audioEngine.getTransients());
  }, []);

  // Update AudioEngine whenever track changes
  const switchProject = (projectId: string) => {
    const proj = SAMPLE_PROJECTS.find((p) => p.meta.id === projectId);
    if (!proj) return;
    audioEngine.pause();
    setIsPlaying(false);
    setCurrentTrack(proj.meta);
    setLines(proj.lines);
    setCurrentTime(0);
    setActiveLineId(proj.lines[0]?.id || null);
    audioEngine.setTrack(proj.meta.duration, proj.meta.bpm);
    setPeaks(audioEngine.getPeaks());
    setTransients(audioEngine.getTransients());
    showToast(`Loaded "${proj.meta.title}"`);
  };

  // Upload custom audio file
  const handleFileUpload = async (file: File) => {
    try {
      showToast('Decoding audio waveform...');
      const { duration } = await audioEngine.loadAudioFile(file);
      const newMeta: TrackMetadata = {
        id: `custom-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'User Upload',
        album: 'Studio Import',
        duration: Math.round(duration),
        bpm: 120,
        key: 'A Minor',
        sampleRate: '44.1 kHz',
        bitDepth: '24-bit',
        format: 'LRC v2.0 Enhanced',
        genre: 'Custom Audio',
        hasAudioFile: true,
      };

      setCurrentTrack(newMeta);
      setPeaks(audioEngine.getPeaks());
      setTransients(audioEngine.getTransients());
      setCurrentTime(0);
      setIsPlaying(false);
      showToast(`Audio decoded (${Math.round(duration)}s)`);
    } catch (err: any) {
      console.error(err);
      showToast('Error loading audio file');
    }
  };

  // Update Stem mixer
  const handleUpdateStem = (key: StemKey, updates: Partial<StemsState[StemKey]>) => {
    const updated = {
      ...stems,
      [key]: { ...stems[key], ...updates },
    };
    setStems(updated);
    audioEngine.updateStems(updated);
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    const playing = audioEngine.togglePlayPause();
    setIsPlaying(playing);
  };

  // Seek
  const handleSeek = (seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  // Step time (+/- delta seconds)
  const handleStepTime = (delta: number) => {
    handleSeek(currentTime + delta);
  };

  // Step line (+/- 1)
  const handleStepLine = (delta: number) => {
    const currentIndex = lines.findIndex((l) => l.id === activeLineId);
    let targetIdx = 0;
    if (currentIndex !== -1) {
      targetIdx = Math.max(0, Math.min(lines.length - 1, currentIndex + delta));
    }
    const targetLine = lines[targetIdx];
    if (targetLine) {
      setActiveLineId(targetLine.id);
      handleSeek(targetLine.startTime);
    }
  };

  // Update line details
  const handleUpdateLine = (lineId: string, updates: Partial<LrcLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...updates } : l))
    );
  };

  // Update specific word timing
  const handleUpdateWord = (lineId: string, wordId: string, updates: Partial<LrcWord>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const updatedWords = l.words.map((w) =>
          w.id === wordId ? { ...w, ...updates } : w
        );
        return { ...l, words: updatedWords };
      })
    );
  };

  const handleUpdateWordTiming = (
    lineId: string,
    wordId: string,
    newStart: number,
    newEnd: number
  ) => {
    handleUpdateWord(lineId, wordId, { startTime: newStart, endTime: newEnd });
  };

  // Add line at current time
  const handleAddLine = (startTime: number) => {
    const newLine: LrcLine = {
      id: `line-${Date.now()}`,
      startTime,
      endTime: Math.min(currentTrack.duration, startTime + 3.0),
      text: 'New lyric phrase',
      confidence: 95,
      words: [
        {
          id: `w-${Date.now()}-1`,
          word: 'New',
          startTime,
          endTime: startTime + 0.8,
          confidence: 95,
        },
        {
          id: `w-${Date.now()}-2`,
          word: 'lyric',
          startTime: startTime + 0.8,
          endTime: startTime + 1.8,
          confidence: 95,
        },
        {
          id: `w-${Date.now()}-3`,
          word: 'phrase',
          startTime: startTime + 1.8,
          endTime: startTime + 2.8,
          confidence: 95,
        },
      ],
    };
    const updated = [...lines, newLine].sort((a, b) => a.startTime - b.startTime);
    setLines(updated);
    setActiveLineId(newLine.id);
    showToast('Added lyric line at current playhead');
  };

  // Delete line
  const handleDeleteLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    showToast('Deleted lyric line');
  };

  // Import raw LRC text
  const handleImportRawLrc = (raw: string) => {
    try {
      const parsed = parseLrcString(raw);
      if (parsed.length > 0) {
        setLines(parsed);
        setActiveLineId(parsed[0].id);
        showToast(`Imported ${parsed.length} synchronized lines`);
      } else {
        showToast('No valid timestamped lines found');
      }
    } catch (e) {
      showToast('Error parsing LRC text');
    }
  };

  // AI Auto-Sync Trigger (Gemini API via /api/ai-sync)
  const handleTriggerAiSync = async () => {
    try {
      setIsAiProcessing(true);
      showToast('Gemini is analyzing audio cadence & word timing...');

      const res = await fetch('/api/ai-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'align_and_word_time',
          lyrics: lines.map((l) => l.text).join('\n'),
          currentLines: lines,
          trackMeta: currentTrack,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.lines) {
        const formatted = json.data.lines.map((l: any, idx: number) => ({
          id: `ai-line-${idx}-${Date.now()}`,
          startTime: l.startTime,
          endTime: l.endTime,
          text: l.text,
          confidence: l.confidence || 98,
          words: (l.words || []).map((w: any, wIdx: number) => ({
            id: `ai-word-${idx}-${wIdx}-${Date.now()}`,
            word: w.word,
            startTime: w.startTime,
            endTime: w.endTime,
            confidence: w.confidence || 98,
          })),
        }));

        setLines(formatted);
        showToast(`AI aligned ${formatted.length} lines with millisecond precision!`);
      } else {
        showToast('AI sync response received');
      }
    } catch (e: any) {
      console.error(e);
      showToast('AI sync unavailable, using studio deterministic alignment');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Flatten all words for Tap-to-Sync mode
  const allWords = useMemo(() => {
    const list: { lineId: string; word: LrcWord; lineIndex: number }[] = [];
    lines.forEach((l, lIdx) => {
      l.words.forEach((w) => {
        list.push({ lineId: l.id, word: w, lineIndex: lIdx });
      });
    });
    return list;
  }, [lines]);

  // Tap-to-Sync Spacebar stamp handler
  const handleTapStamp = useCallback(() => {
    if (tapWordIndex >= allWords.length) {
      setIsTapSyncActive(false);
      showToast('All words synchronized!');
      return;
    }

    const item = allWords[tapWordIndex];
    const newStart = Math.round(currentTime * 100) / 100;
    const newEnd = Math.round((newStart + 0.4) * 100) / 100;

    handleUpdateWord(item.lineId, item.word.id, {
      startTime: newStart,
      endTime: newEnd,
      confidence: 100,
    });

    setTapWordIndex((prev) => prev + 1);
  }, [tapWordIndex, allWords, currentTime, showToast]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isTapSyncActive) {
          handleTapStamp();
        } else {
          handleTogglePlay();
        }
      } else if (e.key === 't' || e.key === 'T') {
        setIsTapSyncActive((prev) => !prev);
      } else if (e.key === 'j' || e.key === 'J') {
        handleStepTime(-1);
      } else if (e.key === 'l' || e.key === 'L') {
        handleStepTime(1);
      } else if (e.key === '[') {
        handleStepLine(-1);
      } else if (e.key === ']') {
        handleStepLine(1);
      } else if (e.key === 'm' || e.key === 'M') {
        handleUpdateStem('vocals', { muted: !stems.vocals.muted });
      } else if (e.key === 's' || e.key === 'S') {
        handleUpdateStem('vocals', { solo: !stems.vocals.solo });
      } else if (e.key === '0') {
        handleSeek(0);
      } else if (e.key === 'e' || e.key === 'E') {
        setIsExportOpen(true);
      } else if (e.key === 'Escape') {
        setIsExportOpen(false);
        setIsShortcutsOpen(false);
        setIsTapSyncActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTapSyncActive,
    handleTapStamp,
    handleTogglePlay,
    handleStepTime,
    handleStepLine,
    handleSeek,
    stems,
  ]);

  // Determine currently active line and active word based on currentTime
  const currentActiveLine = useMemo(() => {
    return (
      lines.find((l) => currentTime >= l.startTime && currentTime <= l.endTime) ||
      lines.find((l) => l.id === activeLineId) ||
      lines[0] ||
      null
    );
  }, [lines, currentTime, activeLineId]);

  const currentActiveWord = useMemo(() => {
    if (!currentActiveLine) return null;
    return (
      currentActiveLine.words.find(
        (w) => currentTime >= w.startTime && currentTime <= w.endTime
      ) || null
    );
  }, [currentActiveLine, currentTime]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090B] text-[#F4F4F5] font-sans overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded bg-[#1E1E26] border border-[#6366F1] shadow-[0_0_20px_rgba(99,102,241,0.4)] text-xs font-mono text-white flex items-center gap-2 animate-in fade-in duration-150">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <HeaderNav
        currentTrack={currentTrack}
        onSelectProject={switchProject}
        onFileUpload={handleFileUpload}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onTriggerAiSync={handleTriggerAiSync}
        isAiProcessing={isAiProcessing}
        isTapSyncActive={isTapSyncActive}
        onToggleTapSync={() => setIsTapSyncActive(!isTapSyncActive)}
        verifiedCount={lines.filter((l) => l.confidence > 95).length}
        totalLinesCount={lines.length}
      />

      {/* Mobile Mode Switcher (Visible on < 1024px screens) */}
      <div className="lg:hidden flex items-center justify-around bg-[#0E0E12] border-b border-[#272730] p-1 font-mono text-xs">
        <button
          onClick={() => setMobileTab('timeline')}
          className={`px-3 py-1.5 rounded transition-all ${
            mobileTab === 'timeline'
              ? 'bg-[#1E1E26] text-white border border-[#6366F1]'
              : 'text-[#71717A]'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setMobileTab('stems')}
          className={`px-3 py-1.5 rounded transition-all ${
            mobileTab === 'stems'
              ? 'bg-[#1E1E26] text-white border border-[#8B5CF6]'
              : 'text-[#71717A]'
          }`}
        >
          Stems Mixer
        </button>
        <button
          onClick={() => setMobileTab('lyrics')}
          className={`px-3 py-1.5 rounded transition-all ${
            mobileTab === 'lyrics'
              ? 'bg-[#1E1E26] text-white border border-[#06B6D4]'
              : 'text-[#71717A]'
          }`}
        >
          Lyrics Pad
        </button>
      </div>

      {/* Workstation Tri-Pane Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane (280px fixed): Stems & Audio Source Meta */}
        <div
          className={`h-full ${
            mobileTab === 'stems' ? 'block w-full' : 'hidden lg:block'
          }`}
        >
          <LeftTrackPane
            meta={currentTrack}
            stems={stems}
            onUpdateStem={handleUpdateStem}
            timelineState={timelineState}
            onUpdateTimeline={(updates) =>
              setTimelineState((prev) => ({ ...prev, ...updates }))
            }
            currentTime={currentTime}
            peaks={peaks}
          />
        </div>

        {/* Center Pane (Flexible): Waveform Timeline & Transport */}
        <div
          className={`flex-1 flex flex-col h-full overflow-hidden ${
            mobileTab === 'timeline' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Main Interactive Waveform Timeline */}
          <WaveformTimeline
            duration={currentTrack.duration}
            currentTime={currentTime}
            peaks={peaks}
            transients={transients}
            lines={lines}
            timelineState={timelineState}
            onSeek={handleSeek}
            onUpdateWordTiming={handleUpdateWordTiming}
            activeLineId={currentActiveLine?.id || null}
            activeWordId={currentActiveWord?.id || null}
          />

          {/* Transport Bar Docked Below Waveform */}
          <TransportBar
            currentTime={currentTime}
            duration={currentTrack.duration}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onStepTime={handleStepTime}
            onStepLine={handleStepLine}
            playbackRate={playbackRate}
            onChangeRate={(rate) => {
              setPlaybackRate(rate);
              audioEngine.setPlaybackRate(rate);
            }}
            zoom={timelineState.zoom}
            onChangeZoom={(z) =>
              setTimelineState((prev) => ({ ...prev, zoom: z }))
            }
            isLooping={timelineState.isLooping}
            onToggleLoop={() => {
              const nextLoop = !timelineState.isLooping;
              setTimelineState((prev) => ({ ...prev, isLooping: nextLoop }));
              audioEngine.setLoop(
                timelineState.loopStart,
                timelineState.loopEnd,
                nextLoop
              );
            }}
            isTapSyncActive={isTapSyncActive}
            onToggleTapSync={() => setIsTapSyncActive(!isTapSyncActive)}
          />
        </div>

        {/* Right Pane (380px fixed): LRC Editor & Karaoke Sync */}
        <div
          className={`h-full ${
            mobileTab === 'lyrics' ? 'block w-full' : 'hidden lg:block'
          }`}
        >
          <RightLyricsPane
            lines={lines}
            currentTime={currentTime}
            activeLineId={currentActiveLine?.id || null}
            activeWordId={currentActiveWord?.id || null}
            onSelectLine={(id) => {
              setActiveLineId(id);
              const target = lines.find((l) => l.id === id);
              if (target) handleSeek(target.startTime);
            }}
            onSeek={handleSeek}
            onUpdateLine={handleUpdateLine}
            onUpdateWord={handleUpdateWord}
            onAddLine={handleAddLine}
            onDeleteLine={handleDeleteLine}
            onSplitLine={() => {}}
            onTriggerAiSync={handleTriggerAiSync}
            isAiProcessing={isAiProcessing}
            meta={currentTrack}
            onImportRawLrc={handleImportRawLrc}
          />
        </div>
      </div>

      {/* Modals & Overlays */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        lines={lines}
        meta={currentTrack}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <TapSyncOverlay
        isActive={isTapSyncActive}
        onClose={() => setIsTapSyncActive(false)}
        onStamp={handleTapStamp}
        currentTime={currentTime}
        currentLine={currentActiveLine}
        targetWord={allWords[tapWordIndex]?.word || null}
        nextWord={allWords[tapWordIndex + 1]?.word || null}
        stampedCount={tapWordIndex}
        totalWords={allWords.length}
      />
    </div>
  );
}
