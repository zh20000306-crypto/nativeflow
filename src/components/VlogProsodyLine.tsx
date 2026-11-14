import React from 'react';
import { VlogTranscriptLine } from '../types/card';
import { Volume2, BookOpen, Plus, BookmarkCheck, Mic, Repeat } from 'lucide-react';
import { speakEnglish } from '../utils/audio';

interface VlogProsodyLineProps {
  line: VlogTranscriptLine;
  index: number;
  isActive: boolean;
  isLooping?: boolean;
  subtitleMode?: 'both' | 'en' | 'none';
  onJumpToTime: (seconds: number) => void;
  onToggleLoop?: (line: VlogTranscriptLine) => void;
  onOpenAnalysis?: (sentence: string, translation?: string, expression?: string) => void;
  onOpenShadowing?: (line: VlogTranscriptLine) => void;
  onSaveExpressionToCards?: (expressionData: {
    expression: string;
    chineseMeaning: string;
    nuance: string;
    exampleEn: string;
    exampleZh: string;
    register: '日常生活' | '职场';
  }) => void;
  isExpressionSaved?: boolean;
}

export const VlogProsodyLine: React.FC<VlogProsodyLineProps> = ({
  line,
  index,
  isActive,
  isLooping = false,
  subtitleMode = 'both',
  onJumpToTime,
  onToggleLoop,
  onOpenAnalysis,
  onOpenShadowing,
  onSaveExpressionToCards,
  isExpressionSaved = false,
}) => {
  const showEn = subtitleMode !== 'none';
  const showZh = subtitleMode === 'both';

  // Highlight key expression smoothly in the English text without clutter
  const renderCleanEnglishText = () => {
    if (!line.highlightedExpression) {
      return <span>{line.textEn}</span>;
    }

    const expr = line.highlightedExpression.expression;
    const lowerText = line.textEn.toLowerCase();
    const lowerExpr = expr.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerExpr);

    if (matchIndex === -1) {
      return <span>{line.textEn}</span>;
    }

    const before = line.textEn.slice(0, matchIndex);
    const matched = line.textEn.slice(matchIndex, matchIndex + expr.length);
    const after = line.textEn.slice(matchIndex + expr.length);

    return (
      <span>
        {before}
        <span
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-semibold border border-amber-300/60 dark:border-amber-700/60"
          title={`高频地道表达：${line.highlightedExpression.chineseMeaning}`}
        >
          {matched}
        </span>
        {after}
      </span>
    );
  };

  return (
    <div
      onClick={() => onJumpToTime(line.startSeconds)}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative group ${
        isActive
          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/60 shadow-md ring-2 ring-amber-500/25'
          : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-700/60'
      }`}
    >
      {/* Top Header: Index, Time & Action Toolbar */}
      <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
        <div className="flex items-center space-x-2 font-mono">
          <span className="font-bold text-stone-400 dark:text-stone-500 text-[11px]">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
              isActive
                ? 'bg-amber-500 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
            }`}
          >
            {formatSeconds(line.startSeconds)} - {formatSeconds(line.endSeconds)}
          </span>
          {isActive && (
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1 animate-pulse">
              <span>● 正在播放</span>
            </span>
          )}
          {isLooping && isActive && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
              单句循环中
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          {/* Shadowing Button (Opens popup with linking & rhythm marks) */}
          {onOpenShadowing && (
            <button
              type="button"
              onClick={() => onOpenShadowing(line)}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-[11px] flex items-center space-x-1 shadow-xs transition-all hover:scale-102 cursor-pointer"
              title="打开跟读弹窗，查看连读与节奏标记并录音比对"
            >
              <Mic className="w-3 h-3" />
              <span>跟读</span>
            </button>
          )}

          {/* Loop this line */}
          {onToggleLoop && (
            <button
              type="button"
              onClick={() => onToggleLoop(line)}
              className={`p-1 rounded-lg text-[11px] flex items-center space-x-0.5 transition-colors cursor-pointer ${
                isLooping && isActive
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-amber-600'
              }`}
              title="单句循环"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Word Analysis */}
          {onOpenAnalysis && (
            <button
              type="button"
              onClick={() =>
                onOpenAnalysis(line.textEn, line.textZh, line.highlightedExpression?.expression)
              }
              className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-600 dark:text-stone-300 hover:text-amber-600 text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
              title="逐词解析音标与词义"
            >
              <BookOpen className="w-3 h-3 text-amber-500" />
              <span>词义</span>
            </button>
          )}

          {/* Audio */}
          <button
            type="button"
            onClick={() => speakEnglish(line.textEn)}
            className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-amber-600 transition-colors cursor-pointer"
            title="试听发音"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clean English Subtitle (Clean SpeakVlog trial style without prosody clutter) */}
      {showEn && (
        <div className="text-base sm:text-lg font-serif text-stone-900 dark:text-stone-100 leading-snug">
          {renderCleanEnglishText()}
        </div>
      )}

      {/* Clean Chinese Translation */}
      {showZh && (
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1.5 font-sans leading-relaxed">
          {line.textZh}
        </p>
      )}

      {/* Clean Expression Bookmark Pill (SpeakVlog 彩标表达一键收藏) */}
      {line.highlightedExpression && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2"
        >
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              ⭐ {line.highlightedExpression.expression}
            </span>
            <span className="text-stone-400 text-[11px]">
              · {line.highlightedExpression.chineseMeaning}
            </span>
          </div>

          {onSaveExpressionToCards && (
            <button
              type="button"
              disabled={isExpressionSaved}
              onClick={() =>
                onSaveExpressionToCards({
                  expression: line.highlightedExpression!.expression,
                  chineseMeaning: line.highlightedExpression!.chineseMeaning,
                  nuance: line.highlightedExpression!.nuance || '',
                  exampleEn: line.textEn,
                  exampleZh: line.textZh,
                  register: '日常生活',
                })
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all shrink-0 cursor-pointer ${
                isExpressionSaved
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 cursor-default'
                  : 'bg-stone-100 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-300'
              }`}
            >
              {isExpressionSaved ? (
                <>
                  <BookmarkCheck className="w-3 h-3 text-emerald-600" />
                  <span>已收藏</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 text-amber-600" />
                  <span>收藏表达</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
