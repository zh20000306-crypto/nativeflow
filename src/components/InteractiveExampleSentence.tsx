import React, { useState, useRef } from 'react';
import { Volume2, Copy, Check, BookOpen } from 'lucide-react';
import { speakEnglish } from '../utils/audio';

interface InteractiveExampleSentenceProps {
  sentence: string;
  translation?: string;
  expression?: string;
  sceneTag?: string;
  scenarioDescription?: string;
  onOpenAnalysis: (sentence: string, translation?: string, expression?: string) => void;
  onCopy?: () => void;
  isCopied?: boolean;
}

export const InteractiveExampleSentence: React.FC<InteractiveExampleSentenceProps> = ({
  sentence,
  translation,
  expression,
  sceneTag,
  scenarioDescription,
  onOpenAnalysis,
  onCopy,
  isCopied = false,
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const startHold = (clientX?: number, clientY?: number) => {
    if (clientX !== undefined && clientY !== undefined) {
      startPosRef.current = { x: clientX, y: clientY };
    }
    setIsHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const duration = 450; // 450ms for long-press threshold

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);
    }, 20);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearHold();
      // Provide light haptic feedback on devices supporting it
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(35);
        } catch {
          // ignore
        }
      }
      onOpenAnalysis(sentence, translation, expression);
    }, duration);
  };

  const clearHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    startPosRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startHold(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If finger moves more than 10px, it's a scroll, not a long-press
    if (startPosRef.current && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearHold();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only primary button
    if (e.button !== 0) return;
    startHold(e.clientX, e.clientY);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={clearHold}
      onTouchCancel={clearHold}
      onMouseDown={handleMouseDown}
      onMouseUp={clearHold}
      onMouseLeave={clearHold}
      className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-2.5 relative select-none cursor-pointer group ${
        isHolding
          ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-500/20'
          : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200/70 dark:border-stone-800 hover:bg-stone-100/60 dark:hover:bg-stone-800/70 hover:border-amber-300 dark:hover:border-amber-800/70'
      }`}
    >
      {/* Long-press holding progress ring/bar */}
      {isHolding && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-200 dark:bg-amber-950/60 overflow-hidden rounded-t-2xl">
          <div
            className="h-full bg-amber-500 transition-all duration-75"
            style={{ width: `${holdProgress}%` }}
          />
        </div>
      )}

      {/* Top Header Row with Scene Tag and Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          {sceneTag && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/20">
              {sceneTag}
            </span>
          )}
          <span className="text-[10px] text-stone-400 hidden sm:inline-flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <BookOpen className="w-3 h-3 text-amber-500" />
            <span>长按例句查看词义读音</span>
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Direct Word/Sentence Analysis Trigger Button */}
          <button
            type="button"
            onClick={() => onOpenAnalysis(sentence, translation, expression)}
            className="p-1.5 px-2 rounded-lg bg-white/80 dark:bg-stone-700/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-400 border border-stone-200/60 dark:border-stone-700 transition-colors flex items-center space-x-1 text-xs cursor-pointer shadow-2xs"
            title="词义解析与发音 (支持长按)"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-[11px] hidden xs:inline">解析</span>
          </button>

          {/* Copy Button */}
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-stone-700 transition-colors cursor-pointer"
              title="复制例句"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Audio Button */}
          <button
            type="button"
            onClick={() => speakEnglish(sentence)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-stone-700 transition-colors cursor-pointer"
            title="朗读此例句"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scenario Description if present */}
      {scenarioDescription && (
        <div className="text-xs text-amber-800/90 dark:text-amber-400/90 font-medium bg-amber-500/5 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/15">
          <span className="font-semibold">💡 适用语境：</span>
          <span>{scenarioDescription}</span>
        </div>
      )}

      {/* English Sentence Text (Interactive & Responsive) */}
      <div className="relative">
        <p className="text-sm sm:text-base font-serif text-stone-900 dark:text-stone-100 leading-relaxed font-medium">
          {sentence}
        </p>
      </div>

      {/* Chinese Translation */}
      {translation && (
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-normal">
          {translation}
        </p>
      )}

      {/* Subtle Mobile/Desktop Hint */}
      <div className="flex items-center justify-between pt-1 text-[10px] text-stone-400 opacity-70 group-hover:opacity-100 transition-opacity">
        <span className="flex items-center space-x-1">
          <span>👆 长按例句或点击右上角「解析」· 查逐词词义与音标</span>
        </span>
      </div>
    </div>
  );
};
