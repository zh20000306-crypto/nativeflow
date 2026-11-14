import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  BookOpen,
  Plus,
  BookmarkCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DictionaryLookupResult } from '../types/card';
import { speakEnglish } from '../utils/audio';

interface WordDictionaryPopoverProps {
  word: string;
  sentenceContext?: string;
  onClose: () => void;
  onAddExpression?: (newExpr: string) => void;
  // Position info
  position?: { top: number; left: number };
}

export const WordDictionaryPopover: React.FC<WordDictionaryPopoverProps> = ({
  word,
  sentenceContext,
  onClose,
  onAddExpression,
}) => {
  const [data, setData] = useState<DictionaryLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [accent, setAccent] = useState<'us' | 'uk'>('us');
  const [isSaved, setIsSaved] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanWord = word.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');

  useEffect(() => {
    if (!cleanWord) return;

    let isMounted = true;
    setLoading(true);
    setIsSaved(false);

    // Immediate fallback skeleton with fast word pronunciation
    speakEnglish(cleanWord, accent);

    fetch('/api/lookup-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: cleanWord,
        sentenceContext,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('词典查询暂时较慢');
        return res.json();
      })
      .then((resData: DictionaryLookupResult) => {
        if (!isMounted) return;
        setData(resData);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Word lookup error:', err);
        // Fallback display
        setData({
          word: cleanWord,
          lemma: cleanWord,
          phoneticUs: '',
          contextualMeaning: '网络词典请求中，可直接试听发音或录入词库',
          definitions: [],
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanWord, sentenceContext]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handlePlay = (targetWord?: string, acc: 'us' | 'uk' = accent) => {
    const textToSpeak = targetWord || data?.lemma || cleanWord;
    setActiveSpeech(true);
    speakEnglish(textToSpeak, acc, () => setActiveSpeech(false));
  };

  const handleAdd = () => {
    if (onAddExpression) {
      onAddExpression(data?.lemma || cleanWord);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-stone-900 sm:rounded-3xl rounded-t-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>每日词典 · 选词速查</span>
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Accent toggle */}
            <div className="flex p-0.5 rounded-lg bg-stone-200/80 dark:bg-stone-700/60 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAccent('us');
                  handlePlay(undefined, 'us');
                }}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  accent === 'us'
                    ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-stone-500'
                }`}
              >
                美音
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccent('uk');
                  handlePlay(undefined, 'uk');
                }}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  accent === 'uk'
                    ? 'bg-white dark:bg-stone-800 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-stone-500'
                }`}
              >
                英音
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700/60 transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Word Info Core Card */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Headword and IPA */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-baseline space-x-2">
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 dark:text-stone-100 tracking-tight">
                  {data?.lemma || cleanWord}
                </h2>
                {cleanWord.toLowerCase() !== (data?.lemma || '').toLowerCase() && (
                  <span className="text-xs text-stone-400 italic">
                    (原形: {data?.lemma})
                  </span>
                )}
              </div>

              {/* Phonetics row */}
              <div className="flex items-center space-x-3 mt-1 text-xs">
                {(data?.phoneticUs || accent === 'us') && (
                  <button
                    type="button"
                    onClick={() => handlePlay(undefined, 'us')}
                    className="flex items-center space-x-1 text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="font-mono">{data?.phoneticUs || '/.../'}</span>
                    <span className="text-[10px] text-stone-400">美</span>
                  </button>
                )}
                {data?.phoneticUk && (
                  <button
                    type="button"
                    onClick={() => handlePlay(undefined, 'uk')}
                    className="flex items-center space-x-1 text-stone-500 hover:text-amber-600 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="font-mono">{data.phoneticUk}</span>
                    <span className="text-[10px] text-stone-400">英</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Add to Vocabulary Button */}
            {onAddExpression && (
              <button
                type="button"
                onClick={handleAdd}
                className={`p-2 px-3 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer shrink-0 ${
                  isSaved
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                }`}
                title="加入我的生词卡片库"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>已加入词库</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>生词本</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Contextual Meaning Box (欧路/每日英语听力核心特色: 语境释义) */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <span>当前例句语境释义</span>
              {loading && (
                <span className="flex items-center space-x-1 text-amber-600">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>词典解析中...</span>
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug">
              {data?.contextualMeaning || (loading ? '正在根据上下文匹配精准词义...' : '查看词典释义')}
            </p>
          </div>

          {/* Dictionary Definitions List */}
          {data?.definitions && data.definitions.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                词典详释 (Definitions)
              </div>
              <div className="space-y-2">
                {data.definitions.map((def, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-xs space-y-0.5"
                  >
                    <div className="flex items-baseline space-x-2">
                      {def.pos && (
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                          {def.pos}
                        </span>
                      )}
                      <span className="text-stone-800 dark:text-stone-200 font-medium">
                        {def.meaning}
                      </span>
                    </div>
                    {def.enDef && (
                      <p className="text-[11px] text-stone-500 font-serif italic pl-4">
                        {def.enDef}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Collocations */}
          {data?.commonPhrases && data.commonPhrases.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                常见短语与搭配 (Phrases)
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {data.commonPhrases.map((cp, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePlay(cp.phrase)}
                    className="p-2 px-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/50 dark:border-stone-800 flex items-center justify-between text-xs cursor-pointer hover:border-amber-300 transition-colors group"
                  >
                    <div className="flex items-baseline space-x-2">
                      <span className="font-serif font-semibold text-stone-900 dark:text-stone-100 group-hover:text-amber-600">
                        {cp.phrase}
                      </span>
                      <span className="text-stone-500 dark:text-stone-400 text-[11px]">
                        {cp.meaning}
                      </span>
                    </div>
                    <Volume2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inflections if available */}
          {data?.inflections && (
            <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800 font-mono">
              变形: {data.inflections}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between text-[11px] text-stone-400 shrink-0">
          <span>点击句子中任意其他单词即可即时切换</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
