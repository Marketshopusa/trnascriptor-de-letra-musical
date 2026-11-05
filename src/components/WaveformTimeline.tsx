import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LrcLine, LrcWord, TimelineState } from '../types';
import { formatLrcTimestamp, formatPrecisionTimecode } from '../utils/lrcParser';

interface WaveformTimelineProps {
  duration: number;
  currentTime: number;
  peaks: number[];
  transients: number[];
  lines: LrcLine[];
  timelineState: TimelineState;
  onSeek: (seconds: number) => void;
  onUpdateWordTiming: (lineId: string, wordId: string, newStart: number, newEnd: number) => void;
  activeLineId: string | null;
  activeWordId: string | null;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  duration,
  currentTime,
  peaks,
  transients,
  lines,
  timelineState,
  onSeek,
  onUpdateWordTiming,
  activeLineId,
  activeWordId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dragging state for word handles or playhead scrubbing
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragHandle, setDragHandle] = useState<{
    lineId: string;
    wordId: string;
    type: 'start' | 'end';
  } | null>(null);

  // Hover state
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Calculate timeline width in pixels based on zoom
  const zoomFactor = timelineState.zoom; // 1.0 to 10.0
  const basePixelsPerSecond = 80 * zoomFactor;
  const timelinePixelWidth = Math.max(900, duration * basePixelsPerSecond);

  // Time to pixel conversion
  const timeToPx = useCallback(
    (seconds: number) => {
      return (seconds / duration) * timelinePixelWidth;
    },
    [duration, timelinePixelWidth]
  );

  // Pixel to time conversion
  const pxToTime = useCallback(
    (px: number) => {
      const t = (px / timelinePixelWidth) * duration;
      return Math.max(0, Math.min(duration, t));
    },
    [duration, timelinePixelWidth]
  );

  // Auto-scroll timeline to keep playhead in view when playing
  useEffect(() => {
    if (!containerRef.current) return;
    const playheadPx = timeToPx(currentTime);
    const container = containerRef.current;
    const viewWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;

    if (playheadPx > scrollLeft + viewWidth - 100 || playheadPx < scrollLeft) {
      container.scrollTo({
        left: playheadPx - viewWidth / 3,
        behavior: 'smooth',
      });
    }
  }, [currentTime, timeToPx]);

  // Draw main Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = timelinePixelWidth;
    const height = 160;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 1. Draw Waveform Background (#121218)
    ctx.fillStyle = '#121218';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Subtle Beat Grid divisions
    const beatInterval = 60 / 128; // default 128 bpm or adjust
    const subInterval = beatInterval / (timelineState.gridDivision / 4);
    ctx.strokeStyle = '#1E1E26';
    ctx.lineWidth = 1;
    if (timelineState.snapToGrid) {
      for (let t = 0; t <= duration; t += subInterval) {
        const x = timeToPx(t);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // 3. Draw Inactive vs Played Waveform Peaks
    // Unplayed: #312E81, Played: #818CF8
    const playheadPx = timeToPx(currentTime);
    const peakCount = peaks.length;
    const barWidth = Math.max(2, (width / peakCount) * 0.75);
    const barSpacing = width / peakCount;

    for (let i = 0; i < peakCount; i++) {
      const x = i * barSpacing;
      const peakVal = peaks[i];
      const barHeight = Math.max(4, peakVal * (height * 0.78));
      const y = (height - barHeight) / 2;

      const isPlayed = x <= playheadPx;
      ctx.fillStyle = isPlayed ? '#818CF8' : '#312E81';

      // Rounded peak bars
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    // 4. Draw Transient Markers (Cyan Laser #06B6D4)
    if (timelineState.showTransients) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
      ctx.lineWidth = 1.5;
      transients.forEach((t) => {
        const tx = timeToPx(t);
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, height);
        ctx.stroke();

        // Small transient diamond at top
        ctx.fillStyle = '#06B6D4';
        ctx.beginPath();
        ctx.moveTo(tx, 4);
        ctx.lineTo(tx + 3, 7);
        ctx.lineTo(tx, 10);
        ctx.lineTo(tx - 3, 7);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 5. Draw Pitch Curves (Violet bezier wave when enabled)
    if (timelineState.showPitchCurves) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.45)';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 10) {
        const t = pxToTime(x);
        const y = height / 2 + Math.sin(t * 4.5) * 25 + Math.cos(t * 1.8) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 6. Draw Confidence Heatmap if enabled
    if (timelineState.showConfidenceHeatmap) {
      lines.forEach((line) => {
        const startX = timeToPx(line.startTime);
        const endX = timeToPx(line.endTime);
        const w = endX - startX;
        ctx.fillStyle = line.confidence > 95 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
        ctx.fillRect(startX, 0, w, 4);
      });
    }
  }, [
    peaks,
    transients,
    currentTime,
    duration,
    timelinePixelWidth,
    timeToPx,
    pxToTime,
    timelineState,
    lines,
  ]);

  // Scrub ruler generator: ticks and timecodes
  const renderRulerTicks = () => {
    const ticks = [];
    const step = zoomFactor > 4 ? 0.5 : zoomFactor > 2 ? 1.0 : 2.0;

    for (let t = 0; t <= duration; t += step) {
      const x = timeToPx(t);
      const isMajor = Math.floor(t) % (step * 2) === 0;

      ticks.push(
        <div
          key={t}
          className="absolute top-0 bottom-0 pointer-events-none select-none flex flex-col justify-between"
          style={{ left: `${x}px` }}
        >
          <div className="flex items-center">
            <span
              className={`font-mono text-[10px] pl-1 font-semibold ${
                isMajor ? 'text-[#A1A1AA]' : 'text-[#71717A]'
              }`}
            >
              {formatPrecisionTimecode(t).slice(0, 5)}
            </span>
          </div>
          <div
            className={`w-[1px] ${
              isMajor ? 'h-3 bg-[#3F3F4E]' : 'h-1.5 bg-[#272730]'
            }`}
          />
        </div>
      );
    }
    return ticks;
  };

  // Mouse handlers for scrubbing & handle dragging
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragHandle) return; // Handle dragging takes precedence
    setIsScrubbing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = pxToTime(x);
    onSeek(newTime);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = pxToTime(x);
    setHoverTime(t);

    if (isScrubbing) {
      onSeek(t);
    } else if (dragHandle) {
      // Find the line & word being dragged
      const line = lines.find((l) => l.id === dragHandle.lineId);
      const word = line?.words.find((w) => w.id === dragHandle.wordId);
      if (line && word) {
        if (dragHandle.type === 'start') {
          const newStart = Math.min(word.endTime - 0.05, Math.max(0, t));
          onUpdateWordTiming(line.id, word.id, newStart, word.endTime);
        } else {
          const newEnd = Math.max(word.startTime + 0.05, Math.min(duration, t));
          onUpdateWordTiming(line.id, word.id, word.startTime, newEnd);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsScrubbing(false);
    setDragHandle(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#09090B] overflow-hidden select-none relative">
      {/* Scrollable Timeline Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsScrubbing(false);
          setDragHandle(null);
          setHoverTime(null);
        }}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#09090B] cursor-crosshair"
      >
        <div
          className="relative min-h-full"
          style={{ width: `${timelinePixelWidth}px` }}
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Top Millisecond Scrub Ruler (Height: 28px) */}
          <div className="h-7 border-b border-[#272730] bg-[#0E0E12] relative overflow-hidden">
            {renderRulerTicks()}

            {/* Hover ghost time indicator */}
            {hoverTime !== null && !isScrubbing && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none w-[1px] bg-[#6366F1]/50 flex items-center"
                style={{ left: `${timeToPx(hoverTime)}px` }}
              >
                <span className="font-mono text-[9px] bg-[#1E1E26] text-[#c0c1ff] px-1 rounded shadow -translate-y-2">
                  {formatPrecisionTimecode(hoverTime)}
                </span>
              </div>
            )}
          </div>

          {/* Main Waveform Canvas Section (Height: 160px) */}
          <div className="relative h-[160px] bg-[#121218] border-b border-[#272730] overflow-hidden">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: `${timelinePixelWidth}px`, height: '160px' }}
            />

            {/* Draggable Word Sync Segments Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {lines.map((line) => {
                const isLineActive = line.id === activeLineId;
                return (
                  <React.Fragment key={line.id}>
                    {line.words.map((word) => {
                      const startX = timeToPx(word.startTime);
                      const endX = timeToPx(word.endTime);
                      const width = Math.max(12, endX - startX);
                      const isWordActive = word.id === activeWordId;

                      return (
                        <div
                          key={word.id}
                          className={`absolute top-2 bottom-2 rounded border pointer-events-auto transition-colors group ${
                            isWordActive
                              ? 'bg-[#8B5CF6]/30 border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.35)]'
                              : isLineActive
                              ? 'bg-[#6366F1]/20 border-[#6366F1]/60'
                              : 'bg-[#6366F1]/10 border-[#3F3F4E]/40 hover:border-[#6366F1]/80 hover:bg-[#6366F1]/20'
                          }`}
                          style={{
                            left: `${startX}px`,
                            width: `${width}px`,
                          }}
                        >
                          {/* Word Text Label */}
                          <div className="absolute inset-0 flex items-center justify-center px-1 overflow-hidden pointer-events-none">
                            <span
                              className={`font-mono text-[11px] truncate font-semibold ${
                                isWordActive
                                  ? 'text-[#FFFFFF]'
                                  : 'text-[#c0c1ff] group-hover:text-[#FFFFFF]'
                              }`}
                            >
                              {word.word}
                            </span>
                          </div>

                          {/* Left Drag Handle */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDragHandle({ lineId: line.id, wordId: word.id, type: 'start' });
                            }}
                            title="Drag to adjust word start time"
                            className="absolute top-0 bottom-0 left-0 w-2.5 cursor-ew-resize hover:bg-[#06B6D4] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <div className="w-[1.5px] h-4 bg-white rounded-full" />
                          </div>

                          {/* Right Drag Handle */}
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDragHandle({ lineId: line.id, wordId: word.id, type: 'end' });
                            }}
                            title="Drag to adjust word end time"
                            className="absolute top-0 bottom-0 right-0 w-2.5 cursor-ew-resize hover:bg-[#06B6D4] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <div className="w-[1.5px] h-4 bg-white rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Playhead Vertical Bar (2px #F43F5E with Timestamp Locator Flag) */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20"
              style={{
                left: `${timeToPx(currentTime)}px`,
              }}
            >
              {/* 2px Solid Line */}
              <div className="w-[2px] h-full bg-[#F43F5E] shadow-[0_0_8px_#F43F5E]" />

              {/* Timestamp Locator Flag at Top */}
              <div className="absolute top-1 left-1 bg-[#F43F5E] text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap -translate-x-1/2">
                {formatLrcTimestamp(currentTime)}
              </div>
            </div>
          </div>

          {/* Word Marker Track (Enhanced Timing Visualizer) */}
          <div className="h-10 bg-[#0E0E12] border-b border-[#272730] relative overflow-hidden flex items-center">
            {lines.map((line) => {
              return line.words.map((word) => {
                const startX = timeToPx(word.startTime);
                const endX = timeToPx(word.endTime);
                const width = Math.max(8, endX - startX);
                const isWordPlayed = currentTime >= word.startTime;

                return (
                  <div
                    key={word.id}
                    title={`${word.word} (${Math.round((word.endTime - word.startTime) * 1000)}ms)`}
                    className={`absolute h-5 rounded px-1.5 flex items-center gap-1 border font-mono text-[10px] cursor-pointer transition-all ${
                      isWordPlayed
                        ? 'bg-[#8B5CF6]/30 border-[#8B5CF6] text-white'
                        : 'bg-[#1E1E26] border-[#272730] text-[#71717A] hover:text-[#A1A1AA]'
                    }`}
                    style={{
                      left: `${startX}px`,
                      width: `${width}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(word.startTime);
                    }}
                  >
                    <span className="truncate">{word.word}</span>
                    <span className="text-[8px] text-[#A1A1AA] hidden lg:inline">
                      {Math.round((word.endTime - word.startTime) * 1000)}ms
                    </span>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
