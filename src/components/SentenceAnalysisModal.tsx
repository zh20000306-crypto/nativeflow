import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  RefreshCw,
  Layers,
  ArrowRight,
  Plus,
  BookmarkCheck,
  HelpCircle,
} from 'lucide-react';
import { SentenceAnalysisResult, WordTokenAnalysis } from '../types/card';
import { speakEnglish } from '../utils/audio';
import { tokenizeSentenceInstant } from '../utils/sentenceTokenizer';

interface SentenceAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentence: string;
  translation?: string;
  expression?: string;
  onAddExpression?: (newExpr: string) => void;
}

export const SentenceAnalysisModal: React.FC<SentenceAnalysisModalProps> = ({
  isOpen,
  onClose,
  sentence,
  translation,
  expression,
  onAddExpression,
}) => {
  const [analysis, setAnalysis] = useState<SentenceAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accent, setAccent] = useState<'us' | 'uk'>('us');
  const [selectedWord, setSelectedWord] = useState<WordTokenAnalysis | null>(null);
  const [copied, setCopied] = useState(false);
  const [addedWord, setAddedWord] = useState<string | null>(null);
  const [isPlayingSentence, setIsPlayingSentence] = useState(false);
  const [activePlayingWord, setActivePlayingWord] = useState<string | null>(null);

  // Fetch or load analysis when modal opens with a new sentence
  useEffect(() => {
    if (!isOpen || !sentence.trim()) return;

    setSelectedWord(null);
    setAddedWord(null);
    setErrorMsg(null);

    // Initial instant fallback so UI is immediately interactive
    const instantTokens = tokenizeSentenceInstant(sentence, expression);
    setAnalysis({
      sentence,
      translation: translation || '',
      tokens: instantTokens,
      keyPhrases: [],
      grammarBreakdown: '正在生成语法主干与地道语感深度解析...',
      nuanceNote: '正在提炼母语者语境潜台词...',
    });

    let isMounted = true;
    setLoading(true);

    fetch('/api/analyze-sentence-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentence,
        expression: expression || undefined,
        translationHint: translation || undefined,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('解析服务繁忙，已显示基础词汇音标与发音');
        return res.json();
      })
      .then((data: SentenceAnalysisResult) => {
        if (!isMounted) return;
        setAnalysis(data);
        if (data.tokens && data.tokens.length > 0) {
          // Select first non-trivial or target word by default
          const firstMeaningful = data.tokens.find((t) => !t.isTarget && t.meaning && t.meaning.length > 2) || data.tokens[0];
          setSelectedWord(firstMeaningful || null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Sentence analysis fallback:', err);
        setErrorMsg('AI 深度解析请求稍缓，您仍可随时点击任意单词听原音与查看音标。');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, sentence, expression, translation]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePlaySentence = (rate: number = 0.92) => {
    setIsPlayingSentence(true);
    speakEnglish(
      sentence,
      accent,
      () => setIsPlayingSentence(false),
      rate
    );
  };

  const handlePlayWord = (wordText: string) => {
    const cleanWord = wordText.replace(/[^A-Za-z'-]/g, '');
    setActivePlayingWord(cleanWord);
    speakEnglish(
      cleanWord,
      accent,
      () => setActivePlayingWord(null),
      0.9
    );
  };

  const handleCopySentence = () => {
    navigator.clipboard.writeText(sentence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddWord = (wordToAdd: string) => {
    if (onAddExpression) {
      onAddExpression(wordToAdd);
      setAddedWord(wordToAdd);
      setTimeout(() => setAddedWord(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="max-w-2xl w-full bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl border border-[#EAE2D6] dark:border-stone-800 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-[#EAE2D6] dark:border-stone-800 flex items-center justify-between bg-[#FAF6F0]/90 dark:bg-stone-900/60 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  例句精读 · 逐词解析与读音
                </h3>
                {expression && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F6EBDA] dark:bg-amber-950/70 text-[#8A4B0F] dark:text-amber-300 font-semibold font-serif">
                    关联表达: {expression}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                点击任意单词即可试听原音与查看详细释义
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Accent toggle */}
            <div className="flex p-0.5 rounded-lg bg-[#F3ECE1] dark:bg-stone-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAccent('us')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                  accent === 'us'
                    ? 'bg-[#FFFEFA] dark:bg-stone-800 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'text-stone-500'
                }`}
              >
                美音
              </button>
              <button
                type="button"
                onClick={() => setAccent('uk')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                  accent === 'uk'
                    ? 'bg-[#FFFEFA] dark:bg-stone-800 text-amber-900 dark:text-amber-300 shadow-xs'
                    : 'text-stone-500'
                }`}
              >
                英音
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#F3ECE1] dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Sentence Hero Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] dark:bg-amber-950/20 border border-[#EAE2D6] dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8A4B0F] dark:text-amber-400 font-bold uppercase tracking-wider">
              <span>完整例句 (Sentence)</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={handleCopySentence}
                  className="p-1 rounded-md hover:bg-[#F6EBDA] text-stone-500 hover:text-[#8A4B0F] dark:hover:text-amber-300 transition-colors flex items-center space-x-1 text-[11px] cursor-pointer"
                  title="复制例句"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已复制' : '复制'}</span>
                </button>
              </div>
            </div>

            <p className="text-base sm:text-lg font-serif text-stone-900 dark:text-stone-100 leading-relaxed font-medium">
              {sentence}
            </p>

            {(analysis?.translation || translation) && (
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-normal pt-1 border-t border-[#EAE2D6] dark:border-amber-900/40">
                {analysis?.translation || translation}
              </p>
            )}

            {/* Sentence Playback Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handlePlaySentence(0.92)}
                disabled={isPlayingSentence}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-amber-600/20 cursor-pointer transition-all disabled:opacity-50"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>正常语速 (1.0x)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePlaySentence(0.72)}
                disabled={isPlayingSentence}
                className="px-3 py-1.5 rounded-xl bg-[#FFFEFA] dark:bg-stone-800 border border-[#EAE2D6] dark:border-stone-700 hover:border-amber-400 text-stone-700 dark:text-stone-300 font-semibold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
              >
                <span>🐢 慢速跟读 (0.75x)</span>
              </button>

              {loading && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center space-x-1 ml-auto">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>AI 正在提炼音标与深层语感...</span>
                </span>
              )}
            </div>
          </div>

          {/* Interactive Words Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>逐词精读与发音 (点击词汇查看词义)</span>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                {analysis?.tokens?.length || 0} 个词汇元
              </span>
            </div>

            {/* Interactive Word Chips */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/40 border border-[#EAE2D6] dark:border-stone-800">
              {(analysis?.tokens || []).map((token, idx) => {
                const isSelected = selectedWord?.word.toLowerCase() === token.word.toLowerCase();
                const isPlayingThis = activePlayingWord?.toLowerCase() === token.word.toLowerCase().replace(/[^a-z]/g, '');

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedWord(token);
                      handlePlayWord(token.word);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-serif transition-all cursor-pointer flex items-center space-x-1 border ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-semibold scale-105 z-10'
                        : token.isTarget
                        ? 'bg-[#F6EBDA] dark:bg-amber-950/60 text-[#8A4B0F] dark:text-amber-200 border-amber-300 dark:border-amber-800 font-medium'
                        : 'bg-[#FFFEFA] dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-[#EAE2D6] dark:border-stone-700 hover:border-amber-400 hover:text-amber-800'
                    }`}
                  >
                    <span>{token.word}</span>
                    {isPlayingThis ? (
                      <Volume2 className="w-3 h-3 animate-pulse text-amber-200" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Selected Word Detail Box */}
            {selectedWord && (
              <div className="p-4 rounded-2xl bg-[#F3ECE1]/65 dark:bg-stone-800/60 border border-[#EAE2D6] dark:border-stone-700 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-base sm:text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                      {selectedWord.lemma || selectedWord.word}
                    </span>
                    {selectedWord.phonetic && (
                      <span className="font-mono text-xs text-amber-800 dark:text-amber-400">
                        {selectedWord.phonetic}
                      </span>
                    )}
                    {selectedWord.partOfSpeech && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EAE2D6] dark:bg-stone-700 text-stone-600 dark:text-stone-300 font-mono">
                        {selectedWord.partOfSpeech}
                      </span>
                    )}
                    {selectedWord.isTarget && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F6EBDA] text-[#8A4B0F] dark:text-amber-300 font-semibold">
                        当前目标表达核心词
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handlePlayWord(selectedWord.word)}
                      className="p-1.5 rounded-lg bg-[#FFFEFA] dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:text-amber-800 transition-colors shadow-xs cursor-pointer flex items-center space-x-1 text-xs"
                      title="朗读该单词"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>发音</span>
                    </button>

                    {onAddExpression && !selectedWord.isTarget && (
                      <button
                        type="button"
                        onClick={() => handleAddWord(selectedWord.lemma || selectedWord.word)}
                        className="p-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs cursor-pointer flex items-center space-x-1 text-xs font-semibold"
                        title="将此单词加入生词卡片库"
                      >
                        {addedWord === (selectedWord.lemma || selectedWord.word) ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            <span>已录入</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>录入生词库</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-[#FFFEFA]/90 dark:bg-stone-900/60 p-2.5 rounded-xl border border-[#EAE2D6]/80 dark:border-stone-800">
                  <span className="font-semibold text-stone-900 dark:text-stone-100 mr-1.5">
                    语境释义：
                  </span>
                  <span>{selectedWord.meaning}</span>
                </div>
              </div>
            )}
          </div>

          {/* Key Collocations in Sentence */}
          {analysis?.keyPhrases && analysis.keyPhrases.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>句中核心短语与地道搭配 (Key Chunks)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analysis.keyPhrases.map((kp, idx) => (
                  <div
                    key={idx}
                    onClick={() => speakEnglish(kp.phrase, accent)}
                    className="p-2.5 rounded-xl bg-[#FAF6F0] dark:bg-stone-800/40 border border-[#EAE2D6] dark:border-stone-800 flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100 font-serif group-hover:text-amber-800">
                        {kp.phrase}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {kp.meaning}
                      </div>
                    </div>
                    <Volume2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grammar & Native Nuance Breakdown */}
          {(analysis?.grammarBreakdown || analysis?.nuanceNote) && (
            <div className="p-4 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/40 border border-[#EAE2D6] dark:border-stone-800 space-y-2 text-xs">
              {analysis.grammarBreakdown && (
                <div>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    📐 句法主干结构：
                  </span>
                  <span className="text-stone-600 dark:text-stone-400 ml-1 leading-relaxed">
                    {analysis.grammarBreakdown}
                  </span>
                </div>
              )}
              {analysis.nuanceNote && (
                <div className="pt-1.5 border-t border-[#EAE2D6]/60 dark:border-stone-800">
                  <span className="font-bold text-[#8A4B0F] dark:text-amber-300">
                    💡 母语语感点睛：
                  </span>
                  <span className="text-stone-600 dark:text-stone-400 ml-1 leading-relaxed">
                    {analysis.nuanceNote}
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-stone-400 text-center py-1">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EAE2D6] dark:border-stone-800 bg-[#FAF6F0]/90 dark:bg-stone-800/40 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>💡 提示：在任何例句上长按，随时唤出此解析面板</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all cursor-pointer shadow-xs"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
