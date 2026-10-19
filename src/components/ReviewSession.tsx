import React, { useState } from 'react';
import {
  Calendar,
  Volume2,
  CheckCircle2,
  RefreshCw,
  Eye,
  PenTool,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { ExpressionCard, ReviewGrade, UserSentenceRecord } from '../types/card';
import { CardView } from './CardView';
import { ComboSentenceChallenge } from './ComboSentenceChallenge';
import { getDueCards, updateCardWithReview, calculateNextReview } from '../utils/srs';
import { speakEnglish } from '../utils/audio';

interface ReviewSessionProps {
  cards: ExpressionCard[];
  onUpdateCard: (updatedCard: ExpressionCard) => void;
  onOpenSentenceModal: (card: ExpressionCard) => void;
  onSaveSentence?: (cardId: string, record: UserSentenceRecord) => void;
  onToggleStar: (id: string) => void;
  onNavigateToAdd: () => void;
  streak: number;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({
  cards,
  onUpdateCard,
  onOpenSentenceModal,
  onSaveSentence,
  onToggleStar,
  onNavigateToAdd,
  streak,
}) => {
  const [activeReviewType, setActiveReviewType] = useState<'flashcards' | 'combo'>('flashcards');
  const [reviewMode, setReviewMode] = useState<'due_only' | 'all'>('due_only');
  const [queueIds, setQueueIds] = useState<string[]>(() => {
    const due = getDueCards(cards);
    return (due.length > 0 ? due : cards).map((c) => c.id);
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showEnglishClue, setShowEnglishClue] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const currentCardId = queueIds[currentIndex];
  const currentCard = cards.find((c) => c.id === currentCardId);
  const isFinished = !currentCardId || currentIndex >= queueIds.length || !currentCard;

  const handleGrade = (grade: ReviewGrade) => {
    if (!currentCard) return;

    const updated = updateCardWithReview(currentCard, grade);
    onUpdateCard(updated);

    setIsRevealed(false);
    setShowEnglishClue(false);
    setCompletedCount((prev) => prev + 1);

    // If 'again', add to the end of the current session queue for reinforcement!
    if (grade === 'again') {
      setQueueIds((prev) => [...prev, currentCard.id]);
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const handleRestart = (mode: 'due_only' | 'all') => {
    setReviewMode(mode);
    const newQueue = mode === 'due_only' ? getDueCards(cards) : cards;
    setQueueIds(newQueue.map((c) => c.id));
    setCurrentIndex(0);
    setIsRevealed(false);
    setShowEnglishClue(false);
    setCompletedCount(0);
  };

  // Keyboard shortcuts for power users (Space = flip, 1-4 = grade, V = speak)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (!isRevealed) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          setIsRevealed(true);
        } else if (e.key === 'v' || e.key === 'V') {
          if (currentCard) speakEnglish(currentCard.expression);
        }
      } else {
        if (e.key === '1') {
          e.preventDefault();
          handleGrade('again');
        } else if (e.key === '2') {
          e.preventDefault();
          handleGrade('hard');
        } else if (e.key === '3' || e.code === 'Space') {
          e.preventDefault();
          handleGrade('good');
        } else if (e.key === '4') {
          e.preventDefault();
          handleGrade('easy');
        } else if (e.key === 'v' || e.key === 'V') {
          if (currentCard) speakEnglish(currentCard.expression);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, currentCard, queueIds, currentIndex]);

  // If user selected Combo Synthesis Challenge Mode
  if (activeReviewType === 'combo') {
    return (
      <div className="space-y-6">
        {/* Mode Switcher */}
        <div className="flex p-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveReviewType('flashcards')}
            className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>艾宾浩斯单卡复习</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReviewType('combo')}
            className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all bg-amber-500 text-white shadow-sm shadow-amber-500/25 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>多词串联造句挑战</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
              NEW
            </span>
          </button>
        </div>

        <ComboSentenceChallenge
          cards={cards}
          onSaveSentence={(cardId, record) => {
            if (onSaveSentence) onSaveSentence(cardId, record);
          }}
          onBackToFlashcards={() => setActiveReviewType('flashcards')}
        />
      </div>
    );
  }

  // Completion Screen
  if (isFinished) {
    const totalDue = getDueCards(cards).length;

    return (
      <div className="max-w-2xl mx-auto py-8 px-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Mode Switcher */}
        <div className="flex p-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveReviewType('flashcards')}
            className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>艾宾浩斯单卡复习</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveReviewType('combo')}
            className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>多词串联造句挑战</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400/30 text-amber-900 dark:text-amber-100 font-mono">
              NEW
            </span>
          </button>
        </div>

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-amber-500/25">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-serif">
            {completedCount > 0 ? '🎉 今日复习圆满达成！' : '太棒了，当前暂无到期复习任务'}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
            {completedCount > 0
              ? `你刚才高效复习了 ${completedCount} 个地道表达，记忆曲线已成功按艾宾浩斯规律推迟更新！`
              : '当前词库里的所有卡片都在艾宾浩斯记忆保护期内。你可以继续录入新表达，或尝试多词串联造句！'}
          </p>
        </div>

        {/* Stats card */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-lg text-center">
          <div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-serif">
              {completedCount}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              本次复习
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 font-serif">
              {streak}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              连续打卡天数
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-serif">
              {cards.length}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              总卡片量
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <button
            onClick={() => setActiveReviewType('combo')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer hover:scale-102"
          >
            <Sparkles className="w-4 h-4" />
            <span>进入多词串联造句挑战</span>
          </button>

          <button
            onClick={() => handleRestart('all')}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-sm transition-colors flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重新通刷单卡 ({cards.length})</span>
          </button>
        </div>
      </div>
    );
  }

  // Pre-calculate interval previews for the current card
  const againPreview = calculateNextReview(currentCard, 'again');
  const hardPreview = calculateNextReview(currentCard, 'hard');
  const goodPreview = calculateNextReview(currentCard, 'good');
  const easyPreview = calculateNextReview(currentCard, 'easy');

  // Find a masking sentence for the front card if available
  const sampleExample = currentCard.examples?.[0];
  const maskedSentence = sampleExample
    ? sampleExample.en.replace(
        new RegExp(currentCard.expression, 'gi'),
        '[ ______ ]'
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Mode Switcher */}
      <div className="flex p-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setActiveReviewType('flashcards')}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>艾宾浩斯单卡复习</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReviewType('combo')}
          className="flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-1.5 transition-all text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>多词串联造句挑战</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400/30 text-amber-900 dark:text-amber-100 font-mono">
            NEW
          </span>
        </button>
      </div>

      {/* Session Header / Progress bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            艾宾浩斯复习中
          </span>
          <span className="text-xs text-stone-400">·</span>
          <span className="text-xs font-mono font-medium text-stone-600 dark:text-stone-300">
            {currentIndex + 1} / {queueIds.length}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-stone-500">
          <span>待复习卡片: {Math.max(0, queueIds.length - currentIndex)}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-amber-500 h-full transition-all duration-300 rounded-full"
          style={{
            width: `${Math.min(100, ((currentIndex + 1) / queueIds.length) * 100)}%`,
          }}
        />
      </div>

      {/* Card Arena */}
      {!isRevealed ? (
        /* Front of the Card: Active Recall Prompt */
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 sm:p-12 border border-stone-200 dark:border-stone-800 shadow-xl text-center space-y-8 min-h-[420px] flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-stone-400">
            <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
              {currentCard.register}
            </span>
            <span className="font-mono">
              上次复习间隔：{currentCard.intervalDays} 天
            </span>
          </div>

          {/* Central Question */}
          <div className="space-y-4 my-auto">
            <div className="text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
              你还记得这个表达的释义与地道语境吗？
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold font-serif text-stone-900 dark:text-stone-100 tracking-tight">
              {currentCard.expression}
            </h1>

            <div className="flex items-center justify-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => speakEnglish(currentCard.expression)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors text-xs font-mono"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{currentCard.phoneticUs || '试听发音'}</span>
              </button>
            </div>

            {/* Context fill-in hint */}
            {maskedSentence && (
              <div className="max-w-lg mx-auto p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-800 text-left mt-6">
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  语境例句填空线索：
                </div>
                <p className="text-sm font-serif text-stone-800 dark:text-stone-200 italic leading-relaxed">
                  "{maskedSentence}"
                </p>
                {sampleExample && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {sampleExample.zh}
                  </p>
                )}
              </div>
            )}

            {/* Optional English Definition Clue */}
            {currentCard.englishDefinition && (
              <div className="pt-1">
                {!showEnglishClue ? (
                  <button
                    type="button"
                    onClick={() => setShowEnglishClue(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50/80 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 hover:border-amber-400 hover:text-amber-600 text-xs font-medium transition-all cursor-pointer"
                  >
                    <span>💡 展开英文释义提示 (English Definition Clue)</span>
                  </button>
                ) : (
                  <div className="max-w-lg mx-auto p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-serif italic animate-in fade-in">
                    <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                      🇬🇧 英文双解释义提示
                    </div>
                    "{currentCard.englishDefinition}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Flip Button */}
          <div className="pt-6 space-y-2">
            <button
              onClick={() => setIsRevealed(true)}
              className="w-full sm:w-80 mx-auto py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-102 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>翻开卡片 · 查看地道解析</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-amber-600/60 text-[10px] font-mono">Space</kbd>
            </button>
            <div className="text-[11px] text-stone-400">
              💡 快捷键提示：按 <kbd className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-[10px]">空格</kbd> 翻卡，按 <kbd className="px-1 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-[10px]">V</kbd> 听发音
            </div>
          </div>
        </div>
      ) : (
        /* Back of the Card: Revealed Card + SRS Grading Buttons */
        <div className="space-y-6 animate-in fade-in duration-200">
          <CardView
            card={currentCard}
            onToggleStar={onToggleStar}
            onOpenSentenceModal={onOpenSentenceModal}
            currentIndex={currentIndex}
            totalCards={queueIds.length}
          />

          {/* SRS Difficulty Evaluation Buttons (Ebbinghaus Grades) */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                请评估刚才对 "{currentCard.expression}" 的掌握记忆难度
              </h3>
              <p className="text-xs text-stone-500">
                系统将根据艾宾浩斯曲线自动排定下一次复习时间 · 快捷键 <span className="font-mono text-stone-700 dark:text-stone-300">1 / 2 / 3 / 4</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Again */}
              <button
                onClick={() => handleGrade('again')}
                className="p-3.5 rounded-2xl border-2 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-800 dark:text-rose-300 transition-all text-center group cursor-pointer relative"
              >
                <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">1</span>
                <div className="text-sm font-extrabold group-hover:scale-105 transition-transform">
                  🟥 遗忘 (Again)
                </div>
                <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                  末尾再入队强化
                </div>
                <div className="text-[10px] opacity-75 font-mono">
                  +1天后
                </div>
              </button>

              {/* Hard */}
              <button
                onClick={() => handleGrade('hard')}
                className="p-3.5 rounded-2xl border-2 border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-orange-800 dark:text-orange-300 transition-all text-center group cursor-pointer relative"
              >
                <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-orange-200/60 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300">2</span>
                <div className="text-sm font-extrabold group-hover:scale-105 transition-transform">
                  🟨 模糊 (Hard)
                </div>
                <div className="text-[11px] text-orange-600 dark:text-orange-400 mt-1">
                  需费力回忆
                </div>
                <div className="text-[10px] opacity-75 font-mono">
                  +{hardPreview.intervalDays}天后
                </div>
              </button>

              {/* Good */}
              <button
                onClick={() => handleGrade('good')}
                className="p-3.5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 transition-all text-center group cursor-pointer relative"
              >
                <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">3 / 空格</span>
                <div className="text-sm font-extrabold group-hover:scale-105 transition-transform">
                  🟩 熟练 (Good)
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  能准确回忆
                </div>
                <div className="text-[10px] opacity-75 font-mono">
                  +{goodPreview.intervalDays}天后
                </div>
              </button>

              {/* Easy */}
              <button
                onClick={() => handleGrade('easy')}
                className="p-3.5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 transition-all text-center group cursor-pointer relative"
              >
                <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">4</span>
                <div className="text-sm font-extrabold group-hover:scale-105 transition-transform">
                  🟦 简单 (Easy)
                </div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">
                  毫无压力已掌握
                </div>
                <div className="text-[10px] opacity-75 font-mono">
                  +{easyPreview.intervalDays}天后
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
