import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Code2, Film, Layers } from 'lucide-react';
import { LrcLine, TrackMetadata } from '../types';
import { exportToStandardLrc, exportToEnhancedLrc, exportToSrt, exportToJson } from '../utils/lrcParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: LrcLine[];
  meta: TrackMetadata;
}

type ExportType = 'standard' | 'enhanced' | 'srt' | 'json';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, lines, meta }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportType>('enhanced');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getContent = (): { text: string; ext: string; mime: string } => {
    switch (selectedFormat) {
      case 'standard':
        return {
          text: exportToStandardLrc(lines, meta),
          ext: 'lrc',
          mime: 'text/plain;charset=utf-8',
        };
      case 'enhanced':
        return {
          text: exportToEnhancedLrc(lines, meta),
          ext: 'lrc',
          mime: 'text/plain;charset=utf-8',
        };
      case 'srt':
        return {
          text: exportToSrt(lines),
          ext: 'srt',
          mime: 'application/x-subrip;charset=utf-8',
        };
      case 'json':
        return {
          text: exportToJson(lines, meta),
          ext: 'json',
          mime: 'application/json;charset=utf-8',
        };
    }
  };

  const { text: content, ext, mime } = getContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = meta.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `${cleanTitle}-${selectedFormat}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0E0E12] border border-[#3F3F4E] rounded-lg shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="h-12 border-b border-[#272730] bg-[#14141A] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#6366F1]" />
            <h2 className="font-display font-semibold text-sm text-white">
              Export Synchronized Lyrics & Telemetry
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1E1E26]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selectors */}
        <div className="p-4 border-b border-[#272730] bg-[#14141A]/50 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFormat('enhanced')}
            className={`px-3 py-2 rounded text-xs font-mono font-medium flex items-center gap-2 border transition-all ${
              selectedFormat === 'enhanced'
                ? 'bg-[#1E1E26] text-white border-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                : 'bg-[#0E0E12] text-[#A1A1AA] border-[#272730] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <div>
              <div className="font-bold">Enhanced LRC v2.0</div>
              <div className="text-[10px] text-[#71717A]">Word-by-word karaoke stamps</div>
            </div>
          </button>

          <button
            onClick={() => setSelectedFormat('standard')}
            className={`px-3 py-2 rounded text-xs font-mono font-medium flex items-center gap-2 border transition-all ${
              selectedFormat === 'standard'
                ? 'bg-[#1E1E26] text-white border-[#6366F1] shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'bg-[#0E0E12] text-[#A1A1AA] border-[#272730] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#6366F1]" />
            <div>
              <div className="font-bold">Standard LRC</div>
              <div className="text-[10px] text-[#71717A]">Line-level timestamps [mm:ss.xx]</div>
            </div>
          </button>

          <button
            onClick={() => setSelectedFormat('srt')}
            className={`px-3 py-2 rounded text-xs font-mono font-medium flex items-center gap-2 border transition-all ${
              selectedFormat === 'srt'
                ? 'bg-[#1E1E26] text-white border-[#06B6D4]'
                : 'bg-[#0E0E12] text-[#A1A1AA] border-[#272730] hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[#06B6D4]" />
            <div>
              <div className="font-bold">SubRip Subtitles (.srt)</div>
              <div className="text-[10px] text-[#71717A]">Video & YouTube player format</div>
            </div>
          </button>

          <button
            onClick={() => setSelectedFormat('json')}
            className={`px-3 py-2 rounded text-xs font-mono font-medium flex items-center gap-2 border transition-all ${
              selectedFormat === 'json'
                ? 'bg-[#1E1E26] text-white border-[#10B981]'
                : 'bg-[#0E0E12] text-[#A1A1AA] border-[#272730] hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-[#10B981]" />
            <div>
              <div className="font-bold">Structured JSON</div>
              <div className="text-[10px] text-[#71717A]">Game engines & web players</div>
            </div>
          </button>
        </div>

        {/* Preview Code View */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col bg-[#09090B]">
          <div className="flex items-center justify-between text-xs font-mono text-[#71717A] mb-2">
            <span>PREVIEW</span>
            <span>{lines.length} lines • {lines.reduce((acc, l) => acc + l.words.length, 0)} words</span>
          </div>
          <pre className="flex-1 p-3 bg-[#0E0E12] border border-[#272730] rounded overflow-auto font-mono text-xs text-[#F4F4F5] leading-relaxed max-h-[350px]">
            {content}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="h-14 border-t border-[#272730] bg-[#14141A] px-4 flex items-center justify-between">
          <span className="font-mono text-xs text-[#71717A]">
            Encoded with Studio Synchrony Audio Engine
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded bg-[#1E1E26] hover:bg-[#272730] border border-[#3F3F4E] text-xs font-mono text-white flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded bg-[#6366F1] hover:bg-[#4F46E5] text-xs font-mono text-white font-medium flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.3)] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{ext}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
