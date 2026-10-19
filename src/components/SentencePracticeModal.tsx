import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  Volume2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Shuffle,
  History,
  PenTool,
} from 'lucide-react';
import { ExpressionCard, SentenceEvaluationResult, UserSentenceRecord } from '../types/card';
import { speakEnglish } from '../utils/audio';

interface SentencePracticeModalProps {
  card: ExpressionCard;
  isOpen: boolean;
  onClose: () => void;
  onSaveSentence: (cardId: string, record: UserSentenceRecord) => void;
}

export const SentencePracticeModal: React.FC<SentencePracticeModalProps> = ({
  card,
  isOpen,
  onClose,
  onSaveSentence,
}) => {
  // Scenarios state
  const defaultScenarios =
    card.sentenceScenarios && card.sentenceScenarios.length > 0
      ? card.sentenceScenarios
      : [card.sentencePrompt || '请在真实工作或日常语境中写一个地道的句子。'];

  const [scenariosList, setScenariosList] = useState<string[]>(defaultScenarios);
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [isGeneratingExtraScenarios, setIsGeneratingExtraScenarios] = useState(false);

  // Input & Evaluation State
  const [userSentence, setUserSentence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SentenceEvaluationResult | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // History Browsing (上一句 / 下一句)
  const historySentences = card.userSentences || [];
  const [historyIdx, setHistoryIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write');

  if (!isOpen) return null;

  const currentScenario = scenariosList[currentScenarioIdx] || card.sentencePrompt;

  const handleNextScenario = async () => {
    if (currentScenarioIdx + 1 < scenariosList.length) {
      setCurrentScenarioIdx((idx) => idx + 1);
    } else {
      // If reached the end of list, cycle back or fetch new ones
      setCurrentScenarioIdx(0);
    }
  };

  const handleFetchExtraScenarios = async () => {
    setIsGeneratingExtraScenarios(true);
    try {
      const res = await fetch('/api/generate-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: card.expression }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.scenarios) && data.scenarios.length > 0) {
          setScenariosList((prev) => [...prev, ...data.scenarios]);
          setCurrentScenarioIdx(scenariosList.length); // switch to the first new scenario
        }
      }
    } catch (e) {
      console.warn('Failed to fetch extra scenarios', e);
    } finally {
      setIsGeneratingExtraScenarios(false);
    }
  };

  const handleInsertPhrase = (phrase: string) => {
    setUserSentence((prev) => {
      if (!prev) return phrase;
      return `${prev} ${phrase}`;
    });
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSentence.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/evaluate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: card.expression,
          userSentence: userSentence.trim(),
          promptScenario: currentScenario,
        }),
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('AI 服务响应超时，系统已自动优化通道，请点击立即重试');
      }

      if (!res.ok) {
        let rawErr = data?.error || '批改服务暂时不可用，请稍后重试';
        if (typeof rawErr === 'object') {
          rawErr = rawErr?.message || JSON.stringify(rawErr);
        }
        if (
          rawErr &&
          (rawErr.includes('503') ||
            rawErr.includes('high demand') ||
            rawErr.includes('UNAVAILABLE') ||
            rawErr.includes('overloaded') ||
            rawErr.includes('timed out'))
        ) {
          throw new Error('AI 模型当前高峰繁忙，请点击右侧按钮立即重试');
        }
        throw new Error(rawErr);
      }

      setEvaluation(data as SentenceEvaluationResult);
      setHasSaved(false);
    } catch (err: any) {
      console.error(err);
      let message = err.message || '批改失败，请重试';
      if (
        message.includes('Unexpected token') ||
        message.includes('<!doctype') ||
        message.includes('is not valid JSON')
      ) {
        message = 'AI 节点响应超时，已切换备用通道，请点击右侧按钮重试';
      }
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToCard = () => {
    if (!evaluation) return;

    const newRecord: UserSentenceRecord = {
      id: `sent-${Date.now()}`,
      sentence: userSentence.trim(),
      promptScenario: currentScenario,
      score: evaluation.score,
      status: evaluation.status,
      isGrammaticallyCorrect: evaluation.isGrammaticallyCorrect,
      isCollocationNatural: evaluation.isCollocationNatural,
      feedback: evaluation.feedback,
      nativeAlternative: evaluation.nativeAlternative,
      alternativeAnalysis: evaluation.alternativeAnalysis,
      praisePoints: evaluation.praisePoints,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveSentence(card.id, newRecord);
    setHasSaved(true);
    setHistoryIdx(0); // point to newest
  };

  const handleResetForAnother = () => {
    setUserSentence('');
    setEvaluation(null);
    setHasSaved(false);
    setErrorMsg(null);
    // Automatically advance to the next scene for fresh practice!
    handleNextScenario();
  };

  const currentHistorySentence = historySentences[historyIdx];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-2xl max-w-2xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base">
                语境实战造句与 AI 批改
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                切换不同场景提示 · 自主造句 · 极速批改 · 保留历史句子
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {historySentences.length > 0 && (
              <div className="flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'write'
                      ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    <PenTool className="w-3 h-3" />
                    <span>写新句子</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeTab === 'history'
                      ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-400 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    <History className="w-3 h-3" />
                    <span>历史造句 ({historySentences.length})</span>
                  </span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Write New Sentence */}
        {activeTab === 'write' && (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {/* Target expression summary */}
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
                      {card.expression}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakEnglish(card.expression)}
                      className="p-1 rounded text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      title="播放发音"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-stone-500 font-mono">
                      {card.phoneticUs}
                    </span>
                  </div>
                  <div className="text-xs text-stone-700 dark:text-stone-300 mt-1 font-medium">
                    释义：{card.chineseMeaning}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                  {card.register}
                </span>
              </div>

              {/* Dynamic Scenario Switcher */}
              <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900 dark:text-amber-300">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      情景提示 ({currentScenarioIdx + 1}/{scenariosList.length})
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={handleNextScenario}
                      className="px-2 py-1 rounded bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      title="切换到下一个情境"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>换个场景</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFetchExtraScenarios}
                      disabled={isGeneratingExtraScenarios}
                      className="px-2 py-1 rounded bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-medium transition-colors"
                      title="AI 生成更多现实场景"
                    >
                      {isGeneratingExtraScenarios ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <span>+ 生成新场景</span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-amber-200/50 dark:border-amber-900/30 text-xs sm:text-sm text-stone-800 dark:text-stone-200 font-medium leading-relaxed">
                  {currentScenario}
                </div>
              </div>

              {/* Quick collocation chips */}
              {card.collocations && card.collocations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    推荐搭配：
                  </span>
                  {card.collocations.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertPhrase(col.phrase)}
                      className="text-xs px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-amber-400 transition-colors"
                    >
                      + {col.phrase}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleEvaluate} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  你的英语造句 (English Sentence)
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleInsertPhrase(card.expression)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    + 插入目标词
                  </button>
                  {userSentence && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserSentence('');
                        setEvaluation(null);
                        setErrorMsg(null);
                        setHasSaved(false);
                      }}
                      className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    >
                      清空
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={userSentence}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserSentence(val);
                    if (!val.trim()) {
                      setEvaluation(null);
                      setErrorMsg(null);
                      setHasSaved(false);
                    } else if (hasSaved) {
                      setHasSaved(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleEvaluate(e);
                    }
                  }}
                  placeholder={`根据上方场景，用 "${card.expression}" 写一句完整地道的英语句子... (支持按 Cmd/Ctrl + Enter 快捷提交)`}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-sans leading-relaxed"
                  disabled={isSubmitting}
                />
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleEvaluate(e)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shrink-0 cursor-pointer shadow-sm"
                  >
                    立即重试
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !userSentence.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 dark:disabled:bg-stone-800 disabled:text-stone-400 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI 极速深度批改中 (语法 · 地道度 · 润色)...</span>
                  </>
                ) : evaluation ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>重新提交 AI 智能批改</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>提交 AI 智能批改</span>
                  </>
                )}
              </button>
            </form>

            {/* Evaluation Result View */}
            {evaluation && (
              <div className="space-y-4 pt-2 border-t border-stone-200 dark:border-stone-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Score banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-stone-900 to-stone-800 dark:from-stone-800 dark:to-stone-950 text-white flex items-center justify-between shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-stone-900 font-extrabold text-xl shadow-inner font-serif">
                      {evaluation.score}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm">地道度评分</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            evaluation.score >= 90
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : evaluation.score >= 75
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {evaluation.score >= 90
                            ? '🌟 极度地道'
                            : evaluation.score >= 75
                            ? '👍 自然流畅'
                            : '💡 尚有提升空间'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-stone-300 mt-1">
                        <span className="flex items-center space-x-1">
                          {evaluation.isGrammaticallyCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span>语法正确</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          {evaluation.isCollocationNatural ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>搭配地道</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakEnglish(userSentence)}
                    className="p-2 rounded-lg bg-stone-700/60 hover:bg-stone-700 text-stone-200 transition-colors"
                    title="朗读你的造句"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Feedback */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-1.5">
                  <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    👨‍🏫 导师点评与语感解析
                  </div>
                  <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
                    {evaluation.feedback}
                  </p>
                  {evaluation.praisePoints && evaluation.praisePoints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {evaluation.praisePoints.map((point, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                        >
                          ✓ {point}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Native Polish Alternative */}
                {evaluation.nativeAlternative && (
                  <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>母语者地道润色版本 (Native Polish)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglish(evaluation.nativeAlternative)}
                        className="p-1 rounded text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                        title="朗读润色句子"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-indigo-950 dark:text-indigo-100 italic font-serif">
                      "{evaluation.nativeAlternative}"
                    </p>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                      <span className="font-semibold">升级亮点：</span>
                      {evaluation.alternativeAnalysis}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-2">
                  {!hasSaved ? (
                    <button
                      type="button"
                      onClick={handleSaveToCard}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <BookmarkCheck className="w-4 h-4" />
                      <span>保存此场景造句到卡片</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center flex items-center justify-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>已保存至该表达的历史造句库！</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleResetForAnother}
                    className="py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-sm font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                    title="换一个场景继续造句"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>换个场景再造一句</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Historical Sentences Navigation (上一句 / 下一句) */}
        {activeTab === 'history' && (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {historySentences.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <BookOpen className="w-8 h-8 mx-auto opacity-50" />
                <p className="text-sm font-medium">暂无历史造句记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Navigation Bar: 上一句 / 下一句 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                  <button
                    type="button"
                    onClick={() => setHistoryIdx((prev) => Math.max(0, prev - 1))}
                    disabled={historyIdx === 0}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 shadow-sm transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>上一句</span>
                  </button>

                  <div className="text-xs font-bold font-mono text-stone-600 dark:text-stone-300">
                    造句记录 {historyIdx + 1} / {historySentences.length}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setHistoryIdx((prev) =>
                        Math.min(historySentences.length - 1, prev + 1)
                      )
                    }
                    disabled={historyIdx >= historySentences.length - 1}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 shadow-sm transition-all"
                  >
                    <span>下一句</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Current Active Historical Sentence Card */}
                {currentHistorySentence && (
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-3">
                    {/* Scenario */}
                    {currentHistorySentence.promptScenario && (
                      <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200">
                        <span className="font-bold">场景语境：</span>
                        {currentHistorySentence.promptScenario}
                      </div>
                    )}

                    {/* Sentence text */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-xs text-stone-400">
                          造句时间：{currentHistorySentence.createdAt}
                        </div>
                        <p className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                          "{currentHistorySentence.sentence}"
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-full bg-amber-500 text-white">
                          {currentHistorySentence.score}分
                        </span>
                        <button
                          type="button"
                          onClick={() => speakEnglish(currentHistorySentence.sentence)}
                          className="p-1.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-200"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        导师批改反馈：
                      </span>
                      <p className="leading-relaxed">{currentHistorySentence.feedback}</p>
                    </div>

                    {/* Native polish */}
                    {currentHistorySentence.nativeAlternative && (
                      <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            母语者润色版本：
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              speakEnglish(currentHistorySentence.nativeAlternative)
                            }
                            className="text-indigo-600 dark:text-indigo-400"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-serif italic font-semibold text-sm">
                          "{currentHistorySentence.nativeAlternative}"
                        </p>
                        {currentHistorySentence.alternativeAnalysis && (
                          <p className="text-[11px] opacity-80 pt-0.5">
                            亮点：{currentHistorySentence.alternativeAnalysis}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
