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
  Lightbulb,
  BookOpen,
  ArrowRight,
  BookmarkCheck,
  Layers,
  HelpCircle,
  Award,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  ExpressionCard,
  ComboScenario,
  ComboEvaluationResult,
  UserSentenceRecord,
} from '../types/card';
import { speakEnglish } from '../utils/audio';
import { formatDate } from '../utils/srs';

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
  const [scenario, setScenario] = useState<ComboScenario | null>(null);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);

  // User writing state
  const [userParagraph, setUserParagraph] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<ComboEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [showModelExample, setShowModelExample] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Helper: Fetch scenario from AI backend
  const fetchScenarioForCards = async (exprCards: ExpressionCard[]) => {
    if (exprCards.length < 2) return;
    setIsGeneratingScenario(true);
    setErrorMsg(null);
    setEvaluation(null);
    setUserParagraph('');
    setHasSaved(false);
    setShowModelExample(false);

    try {
      const res = await fetch('/api/generate-combo-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expressions: exprCards.map((c) => ({
            expression: c.expression,
            chineseMeaning: c.chineseMeaning,
            register: c.register,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('情境生成服务暂时繁忙，已切换至智能备用场景');
      }

      const data = await res.json();
      setScenario(data);
    } catch (e: any) {
      console.warn('Fallback scenario due to error', e);
      const names = exprCards.map((c) => `"${c.expression}"`).join('、');
      setScenario({
        scenarioTitle: '职场与生活综合融汇演练',
        scenarioCategory: '综合实战',
        scenarioDescription: `在紧凑的团队工作或跨文化交流中，尝试写出2-3句英文，将【${names}】自然串联起来，展现地道母语思维。`,
        thoughtStarter: '构思思路：先交代面临的具体任务或讨论议题，再描述团队表现，最后顺理成章地引出总结或行动提议。',
        modelParagraph: '',
      });
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  // Initialize random selection on mount or when targetCount changes
  useEffect(() => {
    if (cards.length >= 2) {
      const sampled = sampleRandomCards(targetCount, cards);
      setSelectedCards(sampled);
      fetchScenarioForCards(sampled);
    }
  }, [targetCount]);

  // Re-roll all expressions
  const handleRerollAll = () => {
    if (cards.length < 2) return;
    const sampled = sampleRandomCards(targetCount, cards);
    setSelectedCards(sampled);
    fetchScenarioForCards(sampled);
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
    fetchScenarioForCards(newSelected);
  };

  // Real-time detection of which expressions the user has typed
  const detectedExpressions = useMemo(() => {
    const lower = userParagraph.toLowerCase();
    return selectedCards.map((card) => {
      const exprLower = card.expression.toLowerCase().trim();
      // Check full match or significant word match
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
          scenarioDescription: scenario?.scenarioDescription || '',
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
        promptScenario: `[多词串联挑战] ${scenario?.scenarioTitle || '实战串联'}`,
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
            <span>Expression Synergy Challenge · 串联造句挑战</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100">
            随机抽取表达 · 连词成段实战
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            母语者从不孤立背词。尝试在一个连贯生动的语境场景中，将这组表达浑然天成地融合在一起！
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
                      className="p-1 rounded-md text-stone-400 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-1"
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
                    className="p-0.5 text-stone-400 hover:text-amber-600 transition-colors"
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

      {/* AI Generated Scenario Arena */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4 relative overflow-hidden">
        {isGeneratingScenario && (
          <div className="absolute inset-0 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xs flex items-center justify-center space-x-2 text-xs font-bold text-amber-600 animate-in fade-in">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>AI 正在为您构想融合这几个表达的最佳母语语境...</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-bold">
              {scenario?.scenarioCategory || '真实场景模拟'}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-serif">
              {scenario?.scenarioTitle || '多词场景挑战'}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => fetchScenarioForCards(selectedCards)}
            className="text-xs text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3 h-3" />
            <span>刷新换一个情境</span>
          </button>
        </div>

        {/* Scenario Description */}
        <p className="text-sm sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed font-sans">
          {scenario?.scenarioDescription}
        </p>

        {/* Thought Starter Helper */}
        {scenario?.thoughtStarter && (
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-xs text-stone-700 dark:text-stone-300 flex items-start space-x-2">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-700 dark:text-amber-400 mr-1">
                构思提示：
              </span>
              <span>{scenario.thoughtStarter}</span>
            </div>
          </div>
        )}

        {/* User Writing Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
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
              placeholder="请用英语写下 2-3 句话的小段落，将上方全部高亮目标表达融汇贯通..."
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
                  AI 母语教练针对 {selectedCards.length} 个表达在该情境下的起承转合与语法语感进行了综合评估
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
                  onClick={() => speakEnglish(evaluation.nativeAlternative)}
                  className="p-1.5 rounded-xl bg-white/70 dark:bg-stone-800/70 hover:bg-white text-stone-600 dark:text-stone-300 hover:text-amber-600 transition-colors shadow-xs"
                  title="朗读重写范例"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyRewrite}
                  className="p-1.5 rounded-xl bg-white/70 dark:bg-stone-800/70 hover:bg-white text-stone-600 dark:text-stone-300 hover:text-amber-600 transition-colors shadow-xs"
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
    </div>
  );
};
