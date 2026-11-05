export interface LrcWord {
  id: string;
  word: string;
  startTime: number; // in seconds, e.g. 4.250
  endTime: number;   // in seconds, e.g. 4.850
  confidence: number; // 0-100
}

export interface LrcLine {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  confidence: number; // 0-100
  words: LrcWord[];
}

export type StemKey = 'master' | 'vocals' | 'instruments' | 'bass' | 'drums';

export interface StemConfig {
  volume: number; // 0.0 to 1.5
  muted: boolean;
  solo: boolean;
  pan: number;    // -1.0 to 1.0
  color: string;
  label: string;
}

export type StemsState = Record<StemKey, StemConfig>;

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  bpm: number;
  key: string;
  sampleRate: string; // e.g. "44.1 kHz"
  bitDepth: string;   // e.g. "24-bit"
  format: string;     // e.g. "LRC v2.0"
  genre: string;
  hasAudioFile?: boolean;
}

export interface TimelineState {
  zoom: number;       // 1.0 to 10.0
  scrollLeft: number; // in pixels
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  activeTool: 'pointer' | 'cut' | 'transient' | 'loop';
  snapToGrid: boolean;
  gridDivision: number; // 4 (1/4), 8 (1/8), 16 (1/16)
  showTransients: boolean;
  showPitchCurves: boolean;
  showConfidenceHeatmap: boolean;
}

export type RightPaneMode = 'karaoke' | 'editor' | 'raw' | 'ai';
