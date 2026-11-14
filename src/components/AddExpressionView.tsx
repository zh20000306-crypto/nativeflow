import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  X,
} from 'lucide-react';
import { ExpressionCard } from '../types/card';
import { CardView } from './CardView';
import { formatDate } from '../utils/srs';

interface AddExpressionViewProps {
  onAddCard: (card: ExpressionCard) => void;
  onOpenSentenceModal: (card: ExpressionCard) => void;
  onToggleStar: (id: string) => void;
}

const QUICK_PRESETS = [
  { text: 'sleep on it', label: '睡一觉明天再决定' },
  { text: 'take a rain check', label: '改天再约/这次先放鸽子' },
  { text: 'hit the spot', label: '正合心意/太解馋太爽了' },
  { text: 'down to earth', label: '接地气/随和好相处' },
  { text: 'ring a bell', label: '听起来耳熟/好像听过' },
  { text: 'once in a blue moon', label: '难得一遇/稀罕事' },
  { text: 'on cloud nine', label: '乐开花/开心到飞起' },
];

export const AddExpressionView: React.FC<AddExpressionViewProps> = ({
  onAddCard,
  onOpenSentenceModal,
  onToggleStar,
}) => {
  const [inputExpression, setInputExpression] = useState('');
  const [contextHint, setContextHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedCard, setGeneratedCard] = useState<ExpressionCard | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const LOADING_STEPS = [
    '⚡ 正在提取国际音标 (IPA) 与地道中文释义...',
    '🎯 正在精选 2-3 个最高频典型的应用场景与例句...',
    '💡 正在拆解使用语感 (Nuance) 与高频地道搭配...',
    '🇬🇧 正在生成柯林斯/牛津级英英双解释义...',
  ];

  const handleGenerate = async (exprToAnalyze?: string) => {
    const expr = (exprToAnalyze || inputExpression).trim();
    if (!expr) return;

    setIsLoading(true);
    setErrorMsg(null);
    setGeneratedCard(null);
    setIsSaved(false);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 700);

    try {
      const res = await fetch('/api/analyze-expression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: expr,
          contextHint: contextHint.trim() || undefined,
        }),
      });

      const responseText = await res.text();
      let raw: any = null;
      try {
        raw = JSON.parse(responseText);
      } catch {
        throw new Error('AI 服务响应超时，系统已自动优化通道，请点击立即重试');
      }

      if (!res.ok) {
        let rawErr = raw?.error || '解析服务暂时不可用，请稍后再试';
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
          throw new Error('AI 解析模型当前高频繁忙（已自动切换高速通道），请点击右侧按钮立即重试');
        }
        throw new Error(rawErr);
      }

      const today = formatDate();

      // Defensive normalization for collocations
      const normalizedCollocations = (Array.isArray(raw.collocations) ? raw.collocations : []).map((item: any) => {
        if (typeof item === 'string') {
          const parenMatch = item.match(/^(.*?)\s*[\(（](.*?)[\)）]\s*$/);
          if (parenMatch) {
            return { phrase: parenMatch[1].trim(), translation: parenMatch[2].trim() };
          }
          const dashMatch = item.split(/\s*[-–—:]\s*/);
          if (dashMatch.length > 1) {
            return { phrase: dashMatch[0].trim(), translation: dashMatch.slice(1).join(' ').trim() };
          }
          return { phrase: item.trim(), translation: '' };
        }
        return {
          phrase: item?.phrase || item?.collocation || item?.en || '',
          translation: item?.translation || item?.chinese || item?.zh || item?.meaning || '',
          note: item?.note || '',
        };
      }).filter((c: any) => c.phrase);

      // Defensive normalization for examples (including all scenarios & scenarioDescription)
      const normalizedExamples = (Array.isArray(raw.examples) ? raw.examples : []).map((eg: any) => {
        if (typeof eg === 'string') {
          const parenMatch = eg.match(/^(.*?)\s*[\(（](.*?)[\)）]\s*$/);
          if (parenMatch) {
            return { en: parenMatch[1].trim(), zh: parenMatch[2].trim(), scene: '真实语境', scenarioDescription: '' };
          }
          return { en: eg.trim(), zh: '', scene: '真实语境', scenarioDescription: '' };
        }
        return {
          en: eg?.en || eg?.sentence || eg?.english || eg?.example || '',
          zh: eg?.zh || eg?.chinese || eg?.translation || eg?.meaning || '',
          scene: eg?.scene || eg?.category || eg?.tag || '真实语境',
          scenarioDescription: eg?.scenarioDescription || eg?.context || eg?.description || '',
        };
      }).filter((e: any) => e.en).slice(0, 3);

      const newCard: ExpressionCard = {
        id: `card-${Date.now()}`,
        expression: raw.expression || expr,
        phoneticUs: raw.phoneticUs || '',
        phoneticUk: raw.phoneticUk || '',
        partOfSpeech: raw.partOfSpeech || '短语 / phrase',
        chineseMeaning: raw.chineseMeaning || '',
        englishDefinition: raw.englishDefinition || '',
        register: raw.register === '职场' ? '职场' : '日常生活',
        level: raw.level || 'B2',
        nuance: raw.nuance || '该表达在母语者交流中极为常用，能传递精准的语气与色彩。',
        collocations: normalizedCollocations.length > 0 ? normalizedCollocations : [
          { phrase: `use "${raw.expression || expr}" properly`, translation: '恰当地运用该表达' },
        ],
        examples: normalizedExamples.length > 0 ? normalizedExamples : [
          {
            scene: '日常语境',
            en: `It's always helpful to practice "${raw.expression || expr}" in context.`,
            zh: `在真实语境中练习 "${raw.expression || expr}" 总是大有裨益。`,
          },
        ],
        memoryHook: raw.memoryHook || '',
        sentencePrompt: raw.sentencePrompt || '',
        sentenceScenarios:
          raw.sentenceScenarios && raw.sentenceScenarios.length > 0
            ? raw.sentenceScenarios
            : [raw.sentencePrompt || `请在真实场景中用 "${raw.expression || expr}" 写一个句子。`],
        userSentences: [],
        tags: [raw.register === '职场' ? '职场' : '日常生活'],
        starred: false,
        createdAt: today,
        repetition: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: today,
        lastReviewedAt: null,
        reviewHistory: [],
        masteryStage: 'new',
      };

      setGeneratedCard(newCard);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '分析失败，请检查输入或重试');
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const handleSaveCard = () => {
    if (!generatedCard) return;
    onAddCard(generatedCard);
    setIsSaved(true);
  };

  const handleSelectPreset = (presetText: string) => {
    setInputExpression(presetText);
    handleGenerate(presetText);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Intro Box */}
      <div className="text-center space-y-2 py-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-serif">
          录入你想掌握的英语表达
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
          输入任何单词、俚语或习语短语。AI
          将像专业词典编纂者一样，深度拆解地道语感、原声音频与生活情境例句，并自动排入艾宾浩斯复习日程。
        </p>
      </div>

      {/* Input Card Container */}
      <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-[#EAE2D6] dark:border-stone-800 shadow-sm space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
            英语表达 / 单词 / 习语 (English Expression)
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputExpression}
              onChange={(e) => setInputExpression(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="例如：call it a day, sleep on it, hit the spot..."
              className="w-full px-4 py-3.5 pr-36 rounded-2xl border border-[#EAE2D6] dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-base font-serif focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              disabled={isLoading}
            />

            {/* Clear input button */}
            {inputExpression && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setInputExpression('');
                  setGeneratedCard(null);
                  setErrorMsg(null);
                }}
                className="absolute right-30 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-[#F3ECE1] dark:hover:bg-stone-700/60 transition-colors cursor-pointer"
                title="清空输入"
                aria-label="清空输入"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => handleGenerate()}
              disabled={isLoading || !inputExpression.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 dark:disabled:bg-stone-800 text-white font-semibold text-xs sm:text-sm flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>智能解析</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Context Input */}
        <div className="space-y-1.5">
          <label className="text-xs text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>附加语境说明 (可选，比如你是在哪里看到的、想在什么场合使用)</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={contextHint}
              onChange={(e) => setContextHint(e.target.value)}
              placeholder="例如：在美剧《老友记》里听到、或者打算周末和朋友聚餐/出国旅行时用到..."
              className="w-full px-3.5 py-2 pr-9 rounded-xl border border-[#EAE2D6] dark:border-stone-800 bg-[#FAF6F0]/40 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300 placeholder-stone-400 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              disabled={isLoading}
            />
            {contextHint && !isLoading && (
              <button
                type="button"
                onClick={() => setContextHint('')}
                className="absolute right-2.5 p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-[#F3ECE1] dark:hover:bg-stone-700/60 transition-colors cursor-pointer"
                title="清空附加语境"
                aria-label="清空附加语境"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Quick presets */}
        <div className="pt-2">
          <div className="text-xs text-stone-400 dark:text-stone-500 mb-2 font-medium">
            🔥 快速体验高频地道表达：
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(p.text)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-xl bg-[#FAF6F0] dark:bg-stone-800 hover:bg-[#F6EBDA] dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 hover:text-amber-900 dark:hover:text-amber-300 border border-[#EAE2D6] dark:border-stone-700/60 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <span className="font-serif font-semibold">{p.text}</span>
                <span className="text-stone-400 text-[10px]">({p.label})</span>
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => handleGenerate()}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shrink-0 cursor-pointer shadow-sm"
            >
              立即重试
            </button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-8 border border-[#EAE2D6] dark:border-stone-800 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F6EBDA] dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-bold text-base text-stone-800 dark:text-stone-200">
              极速深度解析中："{inputExpression}"
            </h3>
            <div className="inline-block px-3 py-1 rounded-full bg-[#F6EBDA] dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-[#8A4B0F] dark:text-amber-300 text-xs font-medium animate-pulse">
              {LOADING_STEPS[loadingStep]}
            </div>
            <p className="text-[11px] text-stone-400 pt-1">
              已启用极速轻量模型与零等待推理，通常仅需 1~2 秒
            </p>
          </div>
        </div>
      )}

      {/* Generated Result Preview */}
      {generatedCard && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2 text-xs text-stone-600 dark:text-stone-300 font-semibold">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>卡片解析完成！请确认并保存至复习词库</span>
            </div>

            <div className="flex items-center space-x-2">
              {!isSaved ? (
                <button
                  onClick={handleSaveCard}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>加入我的复习词库</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>已保存到词库</span>
                </div>
              )}
            </div>
          </div>

          <CardView
            card={generatedCard}
            onToggleStar={() => {
              setGeneratedCard((prev) =>
                prev ? { ...prev, starred: !prev.starred } : null
              );
            }}
            onOpenSentenceModal={(c) => {
              if (!isSaved) {
                handleSaveCard();
              }
              onOpenSentenceModal(c);
            }}
          />
        </div>
      )}
    </div>
  );
};
