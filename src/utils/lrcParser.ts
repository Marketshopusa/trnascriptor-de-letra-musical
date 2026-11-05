import { LrcLine, LrcWord, TrackMetadata } from '../types';

/**
 * Format seconds to standard LRC timestamp: [mm:ss.xx]
 * Example: 74.32 => "[01:14.32]"
 */
export function formatLrcTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds % 1) * 100);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const xx = String(hundredths).padStart(2, '0');
  return `[${mm}:${ss}.${xx}]`;
}

/**
 * Format seconds to high precision timecode: mm:ss.xxx
 * Example: 74.325 => "01:14.325"
 */
export function formatPrecisionTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');
  return `${mm}:${ss}.${mmm}`;
}

/**
 * Parse an LRC timestamp like "[01:14.32]" or "<01:14.32>" to seconds
 */
export function parseTimestampToSeconds(tsString: string): number {
  const match = tsString.match(/[<\[](\d{2}):(\d{2})(?:\.(\d{2,3}))?[>\]]/);
  if (!match) return 0;
  const mins = parseInt(match[1], 10);
  const secs = parseInt(match[2], 10);
  let fraction = 0;
  if (match[3]) {
    fraction = match[3].length === 2 ? parseInt(match[3], 10) / 100 : parseInt(match[3], 10) / 1000;
  }
  return mins * 60 + secs + fraction;
}

/**
 * Export lines to Standard LRC format:
 * [ti:Title]
 * [ar:Artist]
 * [00:14.32] Electric shadows flicker in the rain
 */
export function exportToStandardLrc(lines: LrcLine[], meta: TrackMetadata): string {
  const headers = [
    `[ti:${meta.title}]`,
    `[ar:${meta.artist}]`,
    `[al:${meta.album}]`,
    `[by:Studio Synchrony]`,
    `[length:${formatPrecisionTimecode(meta.duration).split('.')[0]}]`,
    '',
  ];

  const body = lines.map((l) => `${formatLrcTimestamp(l.startTime)}${l.text}`);
  return headers.concat(body).join('\n');
}

/**
 * Export lines to Enhanced LRC v2.0 with word-level timestamps:
 * [00:14.32] <00:14.32> Electric <00:14.85> shadows <00:15.40> flicker...
 */
export function exportToEnhancedLrc(lines: LrcLine[], meta: TrackMetadata): string {
  const headers = [
    `[ti:${meta.title}]`,
    `[ar:${meta.artist}]`,
    `[al:${meta.album}]`,
    `[re:Studio Synchrony DAW]`,
    `[ve:2.0.0-Enhanced]`,
    '',
  ];

  const body = lines.map((l) => {
    if (!l.words || l.words.length === 0) {
      return `${formatLrcTimestamp(l.startTime)}${l.text}`;
    }
    const wordsFormatted = l.words
      .map((w) => `<${formatLrcTimestamp(w.startTime).slice(1, -1)}>${w.word}`)
      .join(' ');
    return `${formatLrcTimestamp(l.startTime)}${wordsFormatted}`;
  });

  return headers.concat(body).join('\n');
}

/**
 * Export lines to SRT subtitle format
 */
export function exportToSrt(lines: LrcLine[]): string {
  const formatSrtTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  };

  return lines
    .map((line, idx) => {
      return `${idx + 1}\n${formatSrtTime(line.startTime)} --> ${formatSrtTime(line.endTime)}\n${line.text}\n`;
    })
    .join('\n');
}

/**
 * Export lines to JSON format
 */
export function exportToJson(lines: LrcLine[], meta: TrackMetadata): string {
  return JSON.stringify(
    {
      meta: {
        ...meta,
        exportedAt: new Date().toISOString(),
        engine: 'Studio Synchrony v2.0',
      },
      lines,
    },
    null,
    2
  );
}

/**
 * Parse raw LRC string into LrcLine[]
 */
export function parseLrcString(rawLrc: string): LrcLine[] {
  const lines = rawLrc.split(/\r?\n/);
  const result: LrcLine[] = [];
  const lineTimeRegex = /^\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)$/;
  const enhancedWordRegex = /<(\d{2}):(\d{2}(?:\.\d{1,3})?)>([^<]+)/g;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('[ti:') || raw.startsWith('[ar:') || raw.startsWith('[al:') || raw.startsWith('[by:') || raw.startsWith('[re:') || raw.startsWith('[ve:')) {
      continue;
    }

    const match = raw.match(lineTimeRegex);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseFloat(match[2]);
      const startTime = mins * 60 + secs;
      const content = match[3].trim();

      // Check if line contains enhanced word tags <mm:ss.xx>
      const words: LrcWord[] = [];
      let wordMatch;
      let cleanText = '';

      if (content.includes('<') && content.includes('>')) {
        let lastEnd = startTime;
        while ((wordMatch = enhancedWordRegex.exec(content)) !== null) {
          const wMins = parseInt(wordMatch[1], 10);
          const wSecs = parseFloat(wordMatch[2]);
          const wStart = wMins * 60 + wSecs;
          const wWord = wordMatch[3].trim();

          words.push({
            id: `word-${i}-${words.length}-${Date.now()}`,
            word: wWord,
            startTime: wStart,
            endTime: wStart + 0.4, // initial estimate, adjusted on next word
            confidence: 95,
          });
          cleanText += (cleanText ? ' ' : '') + wWord;
          lastEnd = wStart;
        }

        // Adjust word end times to match next word's start time
        for (let w = 0; w < words.length; w++) {
          if (w < words.length - 1) {
            words[w].endTime = words[w + 1].startTime;
          } else {
            words[w].endTime = words[w].startTime + 0.6;
          }
        }
      } else {
        cleanText = content;
        // Distribute words automatically
        const rawWords = cleanText.split(/\s+/).filter(Boolean);
        const estDuration = Math.max(2.0, rawWords.length * 0.45);
        const wordSpan = estDuration / Math.max(1, rawWords.length);
        rawWords.forEach((rw, rwIdx) => {
          words.push({
            id: `word-${i}-${rwIdx}-${Date.now()}`,
            word: rw,
            startTime: startTime + rwIdx * wordSpan,
            endTime: startTime + (rwIdx + 1) * wordSpan,
            confidence: 90,
          });
        });
      }

      const endTime = words.length > 0 ? words[words.length - 1].endTime : startTime + 3.0;

      result.push({
        id: `line-${i}-${Date.now()}`,
        startTime,
        endTime,
        text: cleanText || content,
        confidence: 96,
        words,
      });
    }
  }

  // Ensure endTimes are sorted and non-overlapping
  result.sort((a, b) => a.startTime - b.startTime);
  for (let j = 0; j < result.length; j++) {
    if (j < result.length - 1) {
      if (result[j].endTime > result[j + 1].startTime) {
        result[j].endTime = Math.max(result[j].startTime + 0.5, result[j + 1].startTime - 0.05);
      }
    }
  }

  return result;
}
