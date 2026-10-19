import React, { useState } from 'react';
import {
  Volume2,
  Star,
  Sparkles,
  PenTool,
  Bookmark,
  Share2,
  Clock,
  Layers,
  Lightbulb,
  CheckCircle2,
  Quote,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { ExpressionCard, UserSentenceRecord } from '../types/card';
import { speakEnglish } from '../utils/audio';

interface CardViewProps {
  card: ExpressionCard;
  onToggleStar: (id: string) => void;
  onOpenSentenceModal: (card: ExpressionCard) => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCards?: number;
  compact?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  onToggleStar,
  onOpenSentenceModal,
  onNext,
  onPrev,
  currentIndex,
  totalCards,
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'sentences'>('details');
  const [sentenceIdx, setSentenceIdx] = useState(0);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xl overflow-hidden transition-all duration-300">
      {/* Top Bar */}
      <div className="px-6 py-4 bg-stone-50/70 dark:bg-stone-800/40 border-b border-stone-200/60 dark:border-stone-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-xs font-semibold">
            {card.register || '地道表达'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-700/60 text-stone-700 dark:text-stone-300 text-[11px] font-mono font-medium">
            {card.level || 'B2'}
          </span>
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {card.partOfSpeech}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {currentIndex !== undefined && totalCards !== undefined && (
            <span className="text-xs text-stone-400 dark:text-stone-500 font-mono font-medium mr-2">
              {currentIndex + 1} / {totalCards}
            </span>
          )}

          <button
            onClick={() => onToggleStar(card.id)}
            className={`p-2 rounded-xl transition-all ${
              card.starred
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title="收藏此卡片"
          >
            <Star className={`w-4 h-4 ${card.starred ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero Expression Header */}
      <div className="px-6 sm:px-8 pt-7 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif text-stone-900 dark:text-stone-100">
              {card.expression}
            </h1>

            {/* Pronunciations */}
            <div className="flex flex-wrap items-center gap-3 mt-2.5">
              {card.phoneticUs && (
                <button
                  type="button"
                  onClick={() => speakEnglish(card.expression, 'us')}
                  className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-300 transition-all text-xs font-mono"
                >
                  <span className="font-sans font-bold text-amber-600 dark:text-amber-400 text-[10px]">
                    US
                  </span>
                  <span>{card.phoneticUs}</span>
                  <Volume2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </button>
              )}

              {card.phoneticUk && (
                <button
                  type="button"
                  onClick={() => speakEnglish(card.expression, 'uk')}
                  className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-300 transition-all text-xs font-mono"
                >
                  <span className="font-sans font-bold text-amber-600 dark:text-amber-400 text-[10px]">
                    UK
                  </span>
                  <span>{card.phoneticUk}</span>
                  <Volume2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Sentence CTA */}
          <button
            onClick={() => onOpenSentenceModal(card)}
            className="sm:self-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/25 transition-all hover:scale-105 cursor-pointer shrink-0"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>造句实战 (AI批改)</span>
          </button>
        </div>

        {/* Bilingual Definition Box */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1 flex items-center space-x-1.5">
              <span>🇨🇳 核心中文释义</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
              {card.chineseMeaning}
            </p>
          </div>

          {card.englishDefinition && (
            <div className="pt-2.5 border-t border-amber-500/15">
              <div className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <span>🇬🇧 英文释义 · English Definition</span>
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglish(card.englishDefinition!)}
                  className="text-stone-400 hover:text-amber-600 transition-colors p-0.5"
                  title="朗读英文释义"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm sm:text-base font-serif italic text-stone-700 dark:text-stone-300 leading-relaxed">
                "{card.englishDefinition}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-stone-200 dark:border-stone-800 flex items-center space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 font-semibold relative transition-colors ${
            activeTab === 'details'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          语境例句与拆解
          {activeTab === 'details' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('sentences')}
          className={`pb-3 font-semibold relative transition-colors flex items-center space-x-1.5 ${
            activeTab === 'sentences'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <span>我的造句集</span>
          <span className="px-1.5 py-0.2 rounded-full text-xs bg-stone-100 dark:bg-stone-800 font-normal">
            {card.userSentences?.length || 0}
          </span>
          {activeTab === 'sentences' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Details */}
      {activeTab === 'details' && (
        <div className="p-6 sm:p-8 space-y-6">
          {/* Nuance & Cultural Context */}
          {card.nuance && (
            <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>为什么老外这么说？(Nuance & 深度语境)</span>
              </div>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                {card.nuance}
              </p>
            </div>
          )}

          {/* Collocations */}
          {card.collocations && card.collocations.length > 0 && (
            <div>
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>高频地道搭配 (Collocations)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {card.collocations.map((rawItem: any, i: number) => {
                  const phrase = typeof rawItem === 'string'
                    ? rawItem.replace(/[\(（].*?[\)）]/, '').trim()
                    : (rawItem.phrase || rawItem.collocation || rawItem.en || '');
                  const translation = typeof rawItem === 'string'
                    ? (rawItem.match(/[\(（](.*?)[\)）]/)?.[1] || '')
                    : (rawItem.translation || rawItem.meaning || rawItem.zh || rawItem.chinese || '');

                  return (
                    <div
                      key={i}
                      onClick={() => speakEnglish(phrase)}
                      className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-800 hover:border-amber-300 dark:hover:border-amber-800 cursor-pointer transition-all group flex items-start justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {phrase}
                        </div>
                        {translation && (
                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {translation}
                          </div>
                        )}
                      </div>
                      <Volume2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Authentic Real-World Examples */}
          {card.examples && card.examples.length > 0 && (
            <div>
              <div className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                <Quote className="w-3.5 h-3.5" />
                <span>原声感真实场景例句 (Context Examples)</span>
              </div>
              <div className="space-y-3">
                {card.examples.map((rawEg: any, i: number) => {
                  const enText = typeof rawEg === 'string'
                    ? rawEg
                    : (rawEg.en || rawEg.sentence || rawEg.english || rawEg.example || '');
                  const zhText = typeof rawEg === 'string'
                    ? ''
                    : (rawEg.zh || rawEg.chinese || rawEg.translation || rawEg.meaning || '');
                  const sceneTag = typeof rawEg === 'string'
                    ? '真实场景'
                    : (rawEg.scene || rawEg.category || rawEg.tag || '真实场景');

                  return (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 hover:bg-stone-100/60 dark:hover:bg-stone-800/70 transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-700/50 text-stone-700 dark:text-stone-300">
                          {sceneTag}
                        </span>
                        {enText && (
                          <button
                            type="button"
                            onClick={() => speakEnglish(enText)}
                            className="p-1 rounded text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-white dark:hover:bg-stone-700 transition-colors"
                            title="朗读此例句"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-sm sm:text-base font-serif text-stone-900 dark:text-stone-100 leading-relaxed font-medium">
                        {enText}
                      </p>
                      {zhText && (
                        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-normal">
                          {zhText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Memory Hook */}
          {card.memoryHook && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider mb-1">
                  助记小妙招 / 词源故事 (Memory Hook)
                </div>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {card.memoryHook}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: User Sentences */}
      {activeTab === 'sentences' && (
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              你在该卡片下的实战造句记录
            </h3>
            <button
              onClick={() => onOpenSentenceModal(card)}
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center space-x-1"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>新建造句</span>
            </button>
          </div>

          {!card.userSentences || card.userSentences.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-6">
              <PenTool className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
              <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                还没有为此表达造过句
              </p>
              <p className="text-xs text-stone-400 mt-1">
                “语境输入 + 自主造句”是掌握地道表达最有效的路径
              </p>
              <button
                onClick={() => onOpenSentenceModal(card)}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-500/20"
              >
                立即开始第一次造句
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {card.userSentences.length > 1 && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSentenceIdx((prev) => Math.max(0, prev - 1))}
                    disabled={sentenceIdx === 0}
                    className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 shadow-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>上一句</span>
                  </button>

                  <span className="font-mono font-bold text-stone-600 dark:text-stone-300">
                    造句 {sentenceIdx + 1} / {card.userSentences.length}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setSentenceIdx((prev) =>
                        Math.min(card.userSentences.length - 1, prev + 1)
                      )
                    }
                    disabled={sentenceIdx >= card.userSentences.length - 1}
                    className="px-2.5 py-1 rounded bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 shadow-xs"
                  >
                    <span>下一句</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {card.userSentences.map((sent, idx) => (
                <div
                  key={sent.id}
                  className={`p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border transition-all space-y-3 ${
                    card.userSentences.length > 1 && idx === sentenceIdx
                      ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20 shadow-md'
                      : 'border-stone-200 dark:border-stone-800'
                  }`}
                >
                  {/* Scenario prompt tag if present */}
                  {sent.promptScenario && (
                    <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200">
                      <span className="font-bold">场景语境：</span>
                      {sent.promptScenario}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono">
                        {sent.score}分
                      </span>
                      <span className="text-xs text-stone-400">
                        {sent.createdAt}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(sent.sentence)}
                      className="p-1 rounded text-stone-400 hover:text-amber-600"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm font-serif font-medium text-stone-900 dark:text-stone-100">
                    "{sent.sentence}"
                  </p>

                  <div className="text-xs text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200/50 dark:border-stone-800">
                    <div className="font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      导师解析：
                    </div>
                    <p className="leading-relaxed">{sent.feedback}</p>
                  </div>

                  {sent.nativeAlternative && (
                    <div className="text-xs text-indigo-900 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40">
                      <div className="font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">
                        母语者润色版本：
                      </div>
                      <p className="font-serif italic font-medium">
                        "{sent.nativeAlternative}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Navigation */}
      {(onNext || onPrev) && (
        <div className="px-6 py-4 bg-stone-50/50 dark:bg-stone-800/30 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            ← 上一个表达
          </button>
          <div className="flex items-center space-x-1.5 text-xs text-stone-400">
            <Clock className="w-3.5 h-3.5" />
            <span>复习周期：{card.intervalDays}天后</span>
          </div>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            下一个表达 →
          </button>
        </div>
      )}
    </div>
  );
};
