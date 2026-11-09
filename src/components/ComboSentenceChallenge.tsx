import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Shuffle,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  RefreshCw,
  BookmarkCheck,
  Layers,
  Award,
  ArrowRight,
  PenTool,
  BookOpen,
} from 'lucide-react';
import {
  ExpressionCard,
  ComboEvaluationResult,
  UserSentenceRecord,
} from '../types/card';
import { speakEnglish } from '../utils/audio';
import { formatDate } from '../utils/srs';
import { SentenceAnalysisModal } from './SentenceAnalysisModal';

interface ComboSentenceChallengeProps {
  cards: ExpressionCard[];
  onSaveSentence: (cardId: string, record: UserSentenceRecord) => void;
  onBackToFlashcards?: () => void;
}

export const ComboSentenceChallenge: React.FC<ComboSentenceChallengeProps> = ({
  cards,
  onSaveSentence,
  onBackToFlashcards,
}) => {
  // Configurable number of expressions to connect: 2, 3, or 4
  const [targetCount, setTargetCount] = useState<number>(() => {
    return Math.min(3, Math.max(2, cards.length));
  });

  const [selectedCards, setSelectedCards] = useState<ExpressionCard[]>([]);

  // User writing state
  const [userParagraph, setUserParagraph] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ComboEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [analysisSentence, setAnalysisSentence] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper: Sample N distinct random cards from pool
  const sampleRandomCards = (count: number, currentPool: ExpressionCard[]): ExpressionCard[] => {
    if (currentPool.length <= count) return [...currentPool];
    const shuffled = [...currentPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Initialize random selection on mount or when targetCount changes
  useEffect(() => {
    if (cards.length >= 2) {
      const sampled = sampleRandomCards(targetCount, cards);
      setSelectedCards(sampled);
      setUserParagraph('');
      setEvaluation(null);
      setErrorMsg(null);
      setHasSaved(false);
    }
  }, [targetCount]);

  // Re-roll all expressions
  const handleRerollAll = () => {
    if (cards.length < 2) return;
    const sampled = sampleRandomCards(targetCount, cards);
    setSelectedCards(sampled);
    setUserParagraph('');
    setEvaluation(null);
    setErrorMsg(null);
    setHasSaved(false);
  };

  // Swap out a single expression card
  const handleSwapCard = (indexToSwap: number) => {
    const unselectedCards = cards.filter(
      (c) => !selectedCards.some((sc) => sc.id === c.id)
    );
    if (unselectedCards.length === 0) {
      showToast('词库卡片已全部在当前组合中，可录入更多表达以增加组合多样性！');
      return;
    }

    const randomPick = unselectedCards[Math.floor(Math.random() * unselectedCards.length)];
    const newSelected = [...selectedCards];
    newSelected[indexToSwap] = randomPick;
    setSelectedCards(newSelected);
    setEvaluation(null);
    setErrorMsg(null);
    setHasSaved(false);
  };

  // Real-time detection of which expressions the user has typed
  const detectedExpressions = useMemo(() => {
    const lower = userParagraph.toLowerCase();
    return selectedCards.map((card) => {
      const exprLower = card.expression.toLowerCase().trim();
      const isIncluded = lower.includes(exprLower);
      return {
        card,
        isIncluded,
      };
    });
  }, [userParagraph, selectedCards]);

  const detectedCount = detectedExpressions.filter((d) => d.isIncluded).length;

  // Handle evaluation submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userParagraph.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setEvaluation(null);
    setHasSaved(false);

    try {
      const res = await fetch('/api/evaluate-combo-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expressions: selectedCards.map((c) => c.expression),
          scenarioDescription: '用户纯自主构思造句，无任何预设场景或命题限制',
          userParagraph: userParagraph.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('AI 批改暂时繁忙，请点击重试');
      }

      const result: ComboEvaluationResult = await res.json();
      setEvaluation(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '批改失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save the result to each card's userSentences
  const handleSaveToCards = () => {
    if (!evaluation || hasSaved) return;

    const today = formatDate();
    selectedCards.forEach((card) => {
      const record: UserSentenceRecord = {
        id: `combo-sent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sentence: userParagraph.trim(),
        promptScenario: '自主多词串联实战',
        score: evaluation.overallScore,
        status: evaluation.status,
        isGrammaticallyCorrect: true,
        isCollocationNatural: evaluation.isAllUsed,
        feedback: evaluation.cohesionAndFlow,
        nativeAlternative: evaluation.nativeAlternative,
        alternativeAnalysis: evaluation.alternativeAnalysis,
        praisePoints: evaluation.praisePoints,
        createdAt: today,
      };
      onSaveSentence(card.id, record);
    });

    setHasSaved(true);
    showToast(`🎉 已成功将这段串联造句同步存入 ${selectedCards.length} 个表达的历史造句集中！`);
  };

  const handleCopyRewrite = () => {
    if (!evaluation?.nativeAlternative) return;
    navigator.clipboard.writeText(evaluation.nativeAlternative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (cards.length < 2) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6 text-center space-y-6 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
          <Layers className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100">
            多词串联造句挑战
          </h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            串联造句需要词库中积累至少 2 个已学表达。当前词库卡片较少，快去录入几个地道表达再来挑战吧！
          </p>
        </div>
        {onBackToFlashcards && (
          <button
            onClick={onBackToFlashcards}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            返回单卡复习
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs sm:text-sm font-semibold shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/20">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Expression Synergy Challenge · 自主多词串联实战</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100">
            随机抽取表达 · 自主连词成段
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            无任何预设场景与命题限制。自由发挥灵感，将抽取的表达自然融合进你自己的英文段落中。
          </p>
        </div>

        {/* Count Selector & Re-roll */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex p-1 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold">
            {[2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                disabled={cards.length < num}
                onClick={() => setTargetCount(num)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  targetCount === num
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                } ${cards.length < num ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {num} 词串联
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRerollAll}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 hover:text-amber-600 transition-colors shadow-sm cursor-pointer group"
            title="换一组随机表达"
          >
            <Shuffle className="w-4 h-4 text-stone-500 group-hover:text-amber-600 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Target Expressions Selected Shelf */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-400 px-1">
          <div className="flex items-center space-x-2">
            <span>🎯 本轮需串联融入的 {selectedCards.length} 个目标表达：</span>
            <span className="font-mono text-amber-600 dark:text-amber-400">
              ({detectedCount} / {selectedCards.length} 已检测到)
            </span>
          </div>
          <span className="text-[11px] text-stone-400">
            💡 支持点击单个词卡替换或试听发音
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {detectedExpressions.map(({ card, isIncluded }, idx) => (
            <div
              key={card.id}
              className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isIncluded
                  ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-md ring-1 ring-emerald-500/40'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:border-amber-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                    #{idx + 1} · {card.register || '日常'}
                  </span>
                  <div className="flex items-center space-x-1">
                    {isIncluded ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                        <span>已融入</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">待融入</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSwapCard(idx)}
                      className="p-1 rounded-md text-stone-400 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-1 cursor-pointer"
                      title="单独更换这个词"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline space-x-1.5">
                  <h4 className="text-base sm:text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                    {card.expression}
                  </h4>
                  <button
                    type="button"
                    onClick={() => speakEnglish(card.expression)}
                    className="p-0.5 text-stone-400 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>

                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 mt-1 line-clamp-1">
                  {card.chineseMeaning}
                </p>

                {card.englishDefinition && (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-serif italic mt-0.5 line-clamp-2">
                    "{card.englishDefinition}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Writing Arena */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            <PenTool className="w-3.5 h-3.5 text-amber-600" />
            <span>纯自主串联造句 · 无命题场景限制</span>
          </div>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
            根据你想表达的任何真实工作、生活经历或自由观点，写下 1-3 句英文将上方的目标表达连缀成段。AI 导师将直接基于你的句子和用词优化为纯正母语表达，并严格保留全部目标表达！
          </p>
        </div>

        {/* User Writing Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div className="relative">
            <textarea
              rows={4}
              required
              value={userParagraph}
              onChange={(e) => {
                const val = e.target.value;
                setUserParagraph(val);
                if (!val.trim()) {
                  setEvaluation(null);
                  setErrorMsg(null);
                  setHasSaved(false);
                } else if (hasSaved) {
                  setHasSaved(false);
                }
              }}
              placeholder="请用英语写下 1-3 句话的小段落，将上方目标表达自然融入..."
              className="w-full p-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/70 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 text-sm sm:text-base font-serif focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed placeholder:font-sans placeholder:text-stone-400"
            />
            <div className="absolute right-3 bottom-3 flex items-center space-x-2 text-xs text-stone-400">
              <span>{userParagraph.trim().split(/\s+/).filter(Boolean).length} 词</span>
              {userParagraph && (
                <button
                  type="button"
                  onClick={() => {
                    setUserParagraph('');
                    setEvaluation(null);
                    setErrorMsg(null);
                    setHasSaved(false);
                  }}
                  className="hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  清空
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-stone-500 flex items-center space-x-1.5">
              <span>完成度：</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                已融入 {detectedCount} / {selectedCards.length} 个表达
              </span>
              {detectedCount === selectedCards.length && (
                <span className="text-emerald-600 font-bold">✨ 全部目标已就位！</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !userParagraph.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-102 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI 正在对齐母语语感批改与润色中...</span>
                </>
              ) : evaluation ? (
                <>
                  <Send className="w-4 h-4" />
                  <span>重新提交 AI 智能批改 & 串联润色</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>提交 AI 智能批改 & 串联润色</span>
                </>
              )}
            </button>
          </div>
        </form>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* AI Evaluation Result Card */}
      {evaluation && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Header Score & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-stone-100 dark:border-stone-800 gap-4">
            <div className="flex items-center space-x-4">
              <div
                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-serif text-white font-black shadow-lg ${
                  evaluation.overallScore >= 90
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/20'
                    : evaluation.overallScore >= 80
                    ? 'bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/20'
                    : 'bg-gradient-to-tr from-rose-500 to-orange-500 shadow-rose-500/20'
                }`}
              >
                <span className="text-2xl leading-none">{evaluation.overallScore}</span>
                <span className="text-[10px] font-sans opacity-90">分</span>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-serif">
                    {evaluation.status === 'perfect' && '🎉 极度地道 · 融会贯通'}
                    {evaluation.status === 'natural' && '👏 表达流畅 · 语意纯熟'}
                    {evaluation.status === 'minor_slip' && '💡 表达基本到位 · 偶有瑕疵'}
                    {evaluation.status === 'needs_work' && '🌱 仍需打磨 · 建议参考范例'}
                  </h3>
                  {evaluation.isAllUsed && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                      全词融合达成
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  AI 母语教练针对 {selectedCards.length} 个表达的起承转合、语法与地道语感进行了综合评估
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveToCards}
              disabled={hasSaved}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
                hasSaved
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 cursor-default'
                  : 'bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 shadow-md'
              }`}
            >
              {hasSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  <span>已保存至各卡片造句集</span>
                </>
              ) : (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  <span>保存至全部涉及卡片</span>
                </>
              )}
            </button>
          </div>

          {/* Praise Points Pills */}
          {evaluation.praisePoints && evaluation.praisePoints.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 mr-1 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5" />
                <span>表现亮点：</span>
              </span>
              {evaluation.praisePoints.map((point, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold"
                >
                  ✓ {point}
                </span>
              ))}
            </div>
          )}

          {/* Expression-by-expression Feedback Checklist */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>目标表达运用逐项诊断</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {evaluation.expressionFeedbacks.map((fb, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    fb.isUsed && fb.isNatural
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : fb.isUsed
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                      : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-stone-900 dark:text-stone-100 font-serif">
                      "{fb.expression}"
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        fb.isUsed && fb.isNatural
                          ? 'bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : fb.isUsed
                          ? 'bg-amber-200/60 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : 'bg-rose-200/60 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                      }`}
                    >
                      {fb.isUsed ? (fb.isNatural ? '运用地道' : '可用但略生硬') : '未检测到'}
                    </span>
                  </div>
                  <p className="text-stone-600 dark:text-stone-300 leading-normal">
                    {fb.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Cohesion & Flow Analysis */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-1.5">
            <div className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>段落行文连贯性与母语节奏点评 (Cohesion & Flow)</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              {evaluation.cohesionAndFlow}
            </p>
          </div>

          {/* Native Speaker Rewrite Showcase */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 fill-current" />
                <span>母语者高阶重构范例 (Native Speaker Rewrite)</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setAnalysisSentence(evaluation.nativeAlternative)}
                  className="p-1.5 px-2 rounded-xl bg-white/70 dark:bg-stone-800/70 hover:bg-white text-stone-600 dark:text-stone-300 hover:text-amber-600 transition-colors shadow-xs cursor-pointer flex items-center space-x-1 text-xs"
                  title="逐词解析词义与读音 (支持长按)"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>解析词义</span>
                </button>
                <button
                  type="button"
                  onClick={() => speakEnglish(evaluation.nativeAlternative)}
                  className="p-1.5 rounded-xl bg-white/70 dark:bg-stone-800/70 hover:bg-white text-stone-600 dark:text-stone-300 hover:text-amber-600 transition-colors shadow-xs cursor-pointer"
                  title="朗读重写范例"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyRewrite}
                  className="p-1.5 rounded-xl bg-white/70 dark:bg-stone-800/70 hover:bg-white text-stone-600 dark:text-stone-300 hover:text-amber-600 transition-colors shadow-xs cursor-pointer"
                  title="复制范例"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base font-serif italic text-stone-900 dark:text-stone-100 leading-relaxed font-medium">
              "{evaluation.nativeAlternative}"
            </p>

            <div className="pt-2 border-t border-amber-500/20 text-xs text-stone-600 dark:text-stone-300 flex items-start space-x-2">
              <span className="font-bold text-amber-700 dark:text-amber-400 shrink-0">
                💎 润色解析：
              </span>
              <span>{evaluation.alternativeAnalysis}</span>
            </div>
          </div>

          {/* Next Challenge CTA */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={handleRerollAll}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center space-x-2 transition-all hover:scale-102 cursor-pointer"
            >
              <span>抽取下一组表达挑战</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sentence Analysis Modal */}
      <SentenceAnalysisModal
        isOpen={Boolean(analysisSentence)}
        onClose={() => setAnalysisSentence(null)}
        sentence={analysisSentence || ''}
      />
    </div>
  );
};
