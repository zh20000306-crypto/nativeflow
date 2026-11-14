import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Volume2,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Shuffle,
  X,
  Trophy,
  BookOpen,
  Coffee,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { ExpressionCard, ReviewGrade, SentenceEvaluationResult, UserSentenceRecord } from '../types/card';
import { getDueCards, updateCardWithReview, calculateNextReview } from '../utils/srs';
import { speakEnglish, stopSpeaking } from '../utils/audio';
import { CardView } from './CardView';
import { ComboSentenceChallenge } from './ComboSentenceChallenge';

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
  // 3 Review Modes on Review Home Page: 'daily_lite' (今日轻练) | 'flashcards' (翻卡速记) | 'combo' (多词串联)
  const [activeMode, setActiveMode] = useState<'daily_lite' | 'flashcards' | 'combo'>('daily_lite');

  // ==========================================
  // 1. 今日轻练 (Daily Lite 3-Card Micro-Dose) State
  // ==========================================
  const SESSION_BATCH_SIZE = 3;

  const [liteQueue, setLiteQueue] = useState<ExpressionCard[]>(() => {
    const due = getDueCards(cards);
    const pool = due.length > 0 ? due : cards;
    return pool.slice(0, SESSION_BATCH_SIZE);
  });
  const [liteIndex, setLiteIndex] = useState(0);
  const [completedInBatch, setCompletedInBatch] = useState(0);
  const [totalCompletedToday, setTotalCompletedToday] = useState(0);
  const [isBatchFinished, setIsBatchFinished] = useState(false);

  const liteCard = liteQueue[liteIndex];

  const validExamples = useMemo(() => {
    if (!liteCard) return [];
    if (liteCard.examples && liteCard.examples.length > 0) {
      return liteCard.examples;
    }
    return [
      {
        scene: `[${liteCard.register || '日常生活'} / 典型沟通]`,
        scenarioDescription: liteCard.nuance || '在真实母语者日常交流中自然运用此表达',
        zh: liteCard.chineseMeaning
          ? `在生活中想表达 “${liteCard.chineseMeaning}” 的真实情境。`
          : '在日常生活中运用此表达。',
        en: `Native speakers often say "${liteCard.expression}" in daily conversations.`,
      },
    ];
  }, [liteCard]);

  const [exampleIdx, setExampleIdx] = useState(0);
  const currentExample = validExamples[exampleIdx % (validExamples.length || 1)];

  const [userInput, setUserInput] = useState('');
  const [showClue, setShowClue] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<SentenceEvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [revealedSolution, setRevealedSolution] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Sync liteQueue if cards list updates (e.g., new cards added or migration)
  useEffect(() => {
    if (liteQueue.length === 0 && cards.length > 0) {
      const due = getDueCards(cards);
      const pool = due.length > 0 ? due : cards;
      setLiteQueue(pool.slice(0, SESSION_BATCH_SIZE));
    }
  }, [cards.length]);

  useEffect(() => {
    setUserInput('');
    setIsListening(false);
    setSpeechError(null);
    setIsEvaluating(false);
    setEvaluation(null);
    setEvalError(null);
    setRevealedSolution(false);
    setExampleIdx(0);
    setShowClue(true);
  }, [liteCard?.id]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setUserInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('麦克风权限未开启，请允许麦克风权限或直接打字。');
        } else if (event.error === 'no-speech') {
          setSpeechError('未检测到语音，可重新点击大声说出。');
        } else {
          setSpeechError('语音识别异常，可直接键盘输入。');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      setSpeechError('当前浏览器暂不支持语音听写，可直接在文本框输入。');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      setSpeechError(null);
      try {
        recognitionRef.current.start();
      } catch {
        setSpeechError('启动录音失败，请重试或直接输入。');
      }
    }
  };

  const handleEvaluateLite = async () => {
    if (!userInput.trim() || isEvaluating || !liteCard) return;

    setIsEvaluating(true);
    setEvalError(null);

    try {
      const res = await fetch('/api/evaluate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: liteCard.expression,
          userSentence: userInput.trim(),
          scenarioChinese: currentExample?.zh,
          scenarioDescription: `${currentExample?.scene} - ${currentExample?.scenarioDescription || ''}`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'AI 评测响应较慢，请点击重试');
      }

      const data: SentenceEvaluationResult = await res.json();
      setEvaluation(data);
    } catch (err: any) {
      console.error('Evaluate error:', err);
      setEvalError(err?.message || '评测超时，请重试');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleLiteProgress = (grade: 'good' | 'again') => {
    if (!liteCard) return;
    stopSpeaking();

    if (userInput.trim() && evaluation) {
      const record: UserSentenceRecord = {
        id: `sent-rec-${Date.now()}`,
        sentence: userInput.trim(),
        promptScenario: `${currentExample?.scene} | ${currentExample?.zh}`,
        score: evaluation.score,
        status: evaluation.status,
        isGrammaticallyCorrect: evaluation.isGrammaticallyCorrect,
        isCollocationNatural: evaluation.isCollocationNatural,
        feedback: evaluation.feedback,
        nativeAlternative: evaluation.nativeAlternative,
        alternativeAnalysis: evaluation.alternativeAnalysis,
        praisePoints: evaluation.praisePoints,
        createdAt: new Date().toISOString(),
      };

      const updated = updateCardWithReview(liteCard, grade);
      const withRecord: ExpressionCard = {
        ...updated,
        userSentences: [record, ...(updated.userSentences || [])],
      };
      onUpdateCard(withRecord);
      if (onSaveSentence) onSaveSentence(liteCard.id, record);
    } else {
      const updated = updateCardWithReview(liteCard, grade);
      onUpdateCard(updated);
    }

    setCompletedInBatch((prev) => prev + 1);
    setTotalCompletedToday((prev) => prev + 1);

    const nextIdx = liteIndex + 1;
    if (nextIdx >= liteQueue.length) {
      setIsBatchFinished(true);
    } else {
      setLiteIndex(nextIdx);
    }
  };

  const handleStartNextLiteBatch = () => {
    const due = getDueCards(cards);
    const finishedIds = new Set(liteQueue.map((c) => c.id));
    const remainingDue = due.filter((c) => !finishedIds.has(c.id));
    const pool = remainingDue.length > 0 ? remainingDue : cards;

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setLiteQueue(shuffled.slice(0, SESSION_BATCH_SIZE));
    setLiteIndex(0);
    setCompletedInBatch(0);
    setIsBatchFinished(false);
  };

  // ==========================================
  // 2. 翻卡速记 (Classic Flip Flashcard Mode) State
  // ==========================================
  const [flashQueueIds, setFlashQueueIds] = useState<string[]>(() => {
    const due = getDueCards(cards);
    return (due.length > 0 ? due : cards).map((c) => c.id);
  });
  const [flashIndex, setFlashIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showEnglishClue, setShowEnglishClue] = useState(false);
  const [flashCompletedCount, setFlashCompletedCount] = useState(0);

  const currentFlashCardId = flashQueueIds[flashIndex];
  const currentFlashCard = cards.find((c) => c.id === currentFlashCardId);
  const isFlashFinished = !currentFlashCardId || flashIndex >= flashQueueIds.length || !currentFlashCard;

  const handleFlashGrade = (grade: ReviewGrade) => {
    if (!currentFlashCard) return;

    const updated = updateCardWithReview(currentFlashCard, grade);
    onUpdateCard(updated);

    setIsRevealed(false);
    setShowEnglishClue(false);
    setFlashCompletedCount((prev) => prev + 1);

    if (grade === 'again') {
      setFlashQueueIds((prev) => [...prev, currentFlashCard.id]);
    }

    setFlashIndex((prev) => prev + 1);
  };

  const handleFlashRestart = (mode: 'due_only' | 'all') => {
    const newQueue = mode === 'due_only' ? getDueCards(cards) : cards;
    const pool = newQueue.length > 0 ? newQueue : cards;
    setFlashQueueIds(pool.map((c) => c.id));
    setFlashIndex(0);
    setIsRevealed(false);
    setShowEnglishClue(false);
    setFlashCompletedCount(0);
  };

  // Keyboard shortcuts ONLY active in Flashcards mode
  useEffect(() => {
    if (activeMode !== 'flashcards' || isFlashFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (!isRevealed) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          setIsRevealed(true);
        } else if (e.key === 'v' || e.key === 'V') {
          if (currentFlashCard) speakEnglish(currentFlashCard.expression);
        }
      } else {
        if (e.key === '1') {
          e.preventDefault();
          handleFlashGrade('again');
        } else if (e.key === '2') {
          e.preventDefault();
          handleFlashGrade('hard');
        } else if (e.key === '3' || e.code === 'Space') {
          e.preventDefault();
          handleFlashGrade('good');
        } else if (e.key === '4') {
          e.preventDefault();
          handleFlashGrade('easy');
        } else if (e.key === 'v' || e.key === 'V') {
          if (currentFlashCard) speakEnglish(currentFlashCard.expression);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, isRevealed, isFlashFinished, currentFlashCard, flashQueueIds, flashIndex]);

  // ==========================================
  // Top Lightweight 3-Mode Switcher
  // ==========================================
  const renderModeSwitcher = () => (
    <div className="flex p-1 rounded-2xl bg-[#F3ECE1] dark:bg-stone-800/80 border border-[#EAE2D6] dark:border-stone-700/80 max-w-lg mx-auto shadow-2xs">
      <button
        type="button"
        onClick={() => {
          stopSpeaking();
          setActiveMode('daily_lite');
        }}
        className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
          activeMode === 'daily_lite'
            ? 'bg-[#FFFEFA] dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
        }`}
      >
        <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>今日轻练</span>
      </button>

      <button
        type="button"
        onClick={() => {
          stopSpeaking();
          setActiveMode('flashcards');
        }}
        className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
          activeMode === 'flashcards'
            ? 'bg-[#FFFEFA] dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>翻卡速记</span>
      </button>

      <button
        type="button"
        onClick={() => {
          stopSpeaking();
          setActiveMode('combo');
        }}
        className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap ${
          activeMode === 'combo'
            ? 'bg-[#FFFEFA] dark:bg-stone-900 text-amber-900 dark:text-amber-300 shadow-xs'
            : 'text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>多词串联</span>
      </button>
    </div>
  );

  // ==========================================
  // VIEW C: 多词串联 (Combo Mode)
  // ==========================================
  if (activeMode === 'combo') {
    return (
      <div className="space-y-6">
        {renderModeSwitcher()}
        <ComboSentenceChallenge
          cards={cards}
          onSaveSentence={(cardId, record) => {
            if (onSaveSentence) onSaveSentence(cardId, record);
          }}
          onBackToFlashcards={() => setActiveMode('daily_lite')}
        />
      </div>
    );
  }

  // ==========================================
  // VIEW B: 翻卡速记 (Classic Flip Flashcard Mode)
  // ==========================================
  if (activeMode === 'flashcards') {
    if (isFlashFinished) {
      return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {renderModeSwitcher()}

          <div className="py-8 px-4 text-center space-y-6 bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl border border-[#EAE2D6] dark:border-stone-800 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-600 to-orange-500 flex items-center justify-center text-white mx-auto shadow-md shadow-amber-700/20">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-serif">
                {flashCompletedCount > 0 ? '🎉 翻卡复习完成！' : '当前词卡均在记忆保护期内'}
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                {flashCompletedCount > 0
                  ? `本轮成功复习了 ${flashCompletedCount} 个地道生活表达，艾宾浩斯复习曲线已同步更新。`
                  : '当前暂无到期翻卡任务，你可以自由重新通刷全库，或切换至「今日轻练」与「多词串联」。'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto p-4 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/50 border border-[#EAE2D6] dark:border-stone-800 text-center">
              <div>
                <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 font-serif">
                  {flashCompletedCount}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">本轮翻卡</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-serif">
                  {streak}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">连续打卡</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-serif">
                  {cards.length}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">总卡片量</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleFlashRestart('all')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>重新通刷全部表达 ({cards.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('combo')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#F3ECE1] hover:bg-[#EAE2D6] dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium text-sm transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>试试多词串联</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    const againPreview = calculateNextReview(currentFlashCard, 'again');
    const hardPreview = calculateNextReview(currentFlashCard, 'hard');
    const goodPreview = calculateNextReview(currentFlashCard, 'good');
    const easyPreview = calculateNextReview(currentFlashCard, 'easy');

    const sampleExample = currentFlashCard.examples?.[0];
    const maskedSentence = sampleExample
      ? sampleExample.en.replace(
          new RegExp(currentFlashCard.expression, 'gi'),
          '[ ______ ]'
        )
      : null;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {renderModeSwitcher()}

        {/* Session Progress */}
        <div className="space-y-2 max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>艾宾浩斯翻卡速记</span>
              </span>
              <span className="text-stone-400">·</span>
              <span className="font-mono font-medium text-stone-600 dark:text-stone-300">
                {flashIndex + 1} / {flashQueueIds.length}
              </span>
            </div>
            <span className="text-stone-500">
              待翻卡片: {Math.max(0, flashQueueIds.length - flashIndex)}
            </span>
          </div>

          <div className="w-full bg-[#EAE2D6] dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 dark:bg-amber-500 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${Math.min(100, ((flashIndex + 1) / flashQueueIds.length) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Card Front or Back */}
        {!isRevealed ? (
          <div className="max-w-3xl mx-auto bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-8 sm:p-12 border border-[#EAE2D6] dark:border-stone-800 shadow-sm text-center space-y-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
            {/* Concentric warm parchment halo matching screenshot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-[#F6EBDA]/45 dark:bg-amber-900/10 pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 rounded-full bg-[#FFFEFA]/70 dark:bg-stone-900/50 pointer-events-none" />

            <div className="flex justify-between items-center text-xs text-stone-400 relative z-10">
              <span className="px-2.5 py-1 rounded-md bg-[#F6EBDA] dark:bg-amber-950/60 text-[#8A4B0F] dark:text-amber-300 font-medium">
                {currentFlashCard.register}
              </span>
              <span className="font-mono text-stone-400">
                当前间隔：{currentFlashCard.intervalDays} 天
              </span>
            </div>

            <div className="space-y-4 my-auto relative z-10">
              <div className="text-xs uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
                你还记得这个表达的含义与生活用法吗？
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold font-serif text-stone-900 dark:text-stone-100 tracking-tight">
                {currentFlashCard.expression}
              </h1>

              <div className="flex items-center justify-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => speakEnglish(currentFlashCard.expression)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#F6EBDA] dark:bg-amber-950/40 text-[#8A4B0F] dark:text-amber-300 hover:bg-[#EFE0C9] dark:hover:bg-amber-900/60 transition-colors text-xs font-mono cursor-pointer border border-amber-200/70 dark:border-amber-800/60"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{currentFlashCard.phoneticUs || '试听发音'}</span>
                </button>
              </div>

              {maskedSentence && (
                <div className="max-w-lg mx-auto p-4 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/50 border border-[#EAE2D6] dark:border-stone-800 text-left mt-6">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    生活语境填空线索：
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

              {currentFlashCard.englishDefinition && (
                <div className="pt-1">
                  {!showEnglishClue ? (
                    <button
                      type="button"
                      onClick={() => setShowEnglishClue(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-[#FAF6F0] dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 hover:border-amber-500 hover:text-amber-800 dark:hover:text-amber-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      <span>💡 展开英文释义提示 (English Definition Clue)</span>
                    </button>
                  ) : (
                    <div className="max-w-lg mx-auto p-3.5 rounded-2xl bg-[#F6EBDA]/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-serif italic animate-in fade-in">
                      <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
                        🇬🇧 英文双解释义提示
                      </div>
                      "{currentFlashCard.englishDefinition}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 space-y-2 relative z-10">
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="w-full sm:w-80 mx-auto py-3.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer hover:scale-101"
              >
                <Eye className="w-4 h-4" />
                <span>翻开卡片 · 查看地道解析</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-amber-800/80 text-[10px] font-mono">
                  Space
                </kbd>
              </button>
              <div className="text-[11px] text-stone-400">
                💡 快捷键：按 <kbd className="px-1 py-0.5 rounded bg-[#F3ECE1] dark:bg-stone-800 border border-[#EAE2D6] dark:border-stone-700 font-mono text-[10px]">空格</kbd> 翻卡，按 <kbd className="px-1 py-0.5 rounded bg-[#F3ECE1] dark:bg-stone-800 border border-[#EAE2D6] dark:border-stone-700 font-mono text-[10px]">V</kbd> 听发音
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
            <CardView
              card={currentFlashCard}
              onToggleStar={onToggleStar}
              onOpenSentenceModal={onOpenSentenceModal}
              currentIndex={flashIndex}
              totalCards={flashQueueIds.length}
            />

            {/* SRS 4-tier Grading */}
            <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-6 border border-[#EAE2D6] dark:border-stone-800 shadow-sm space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  请评估对 "{currentFlashCard.expression}" 的掌握程度
                </h3>
                <p className="text-xs text-stone-500">
                  系统按艾宾浩斯曲线自动排定下次复习 · 快捷键 <span className="font-mono text-stone-700 dark:text-stone-300">1 / 2 / 3 / 4</span>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => handleFlashGrade('again')}
                  className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-900 dark:text-rose-200 transition-all text-center group cursor-pointer relative"
                >
                  <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">1</span>
                  <div className="text-sm font-bold group-hover:scale-102 transition-transform">🟥 遗忘</div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">末尾重练</div>
                  <div className="text-[10px] opacity-75 font-mono">+{againPreview.intervalDays}天后</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFlashGrade('hard')}
                  className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 transition-all text-center group cursor-pointer relative"
                >
                  <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">2</span>
                  <div className="text-sm font-bold group-hover:scale-102 transition-transform">🟨 模糊</div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-400 mt-1">费力想起</div>
                  <div className="text-[10px] opacity-75 font-mono">+{hardPreview.intervalDays}天后</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFlashGrade('good')}
                  className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 transition-all text-center group cursor-pointer relative"
                >
                  <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">3</span>
                  <div className="text-sm font-bold group-hover:scale-102 transition-transform">🟩 熟练</div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">准确回忆</div>
                  <div className="text-[10px] opacity-75 font-mono">+{goodPreview.intervalDays}天后</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFlashGrade('easy')}
                  className="p-3.5 rounded-2xl border border-[#EAE2D6] dark:border-stone-700 bg-[#FAF6F0] dark:bg-stone-800/40 hover:bg-[#F3ECE1] dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200 transition-all text-center group cursor-pointer relative"
                >
                  <span className="absolute top-2 right-2 text-[10px] font-mono px-1 rounded bg-[#EAE2D6] dark:bg-stone-700 text-stone-700 dark:text-stone-300">4</span>
                  <div className="text-sm font-bold group-hover:scale-102 transition-transform">🟦 简单</div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">脱口而出</div>
                  <div className="text-[10px] opacity-75 font-mono">+{easyPreview.intervalDays}天后</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW A: 今日轻练 (Default Stress-Free Micro-Review)
  // ==========================================
  if (isBatchFinished || !liteCard) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {renderModeSwitcher()}

        <div className="py-10 px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-700 via-amber-600 to-orange-500 flex items-center justify-center text-white mx-auto shadow-md shadow-amber-700/20">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>今日轻练已达标 · 零负担完成</span>
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 font-serif">
              太棒了！搞定 {completedInBatch || 3} 个真实生活语境
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
              记忆曲线已自动延后。语言重在细水长流，每天轻松练几句，就能自然形成开口语感！
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#FFFEFA] dark:bg-stone-900 border border-[#EAE2D6] dark:border-stone-800 shadow-xs max-w-md mx-auto">
            <div>
              <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 font-serif">
                {totalCompletedToday}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">今日轻练</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-serif">
                {streak} 天
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">连续打卡</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-serif">
                {cards.length}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">总收录表达</div>
            </div>
          </div>

          <div className="space-y-3 pt-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleStartNextLiteBatch}
              className="w-full py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer hover:scale-101 flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 text-amber-100" />
              <span>手感正热 · 再来 3 句轻练 (+3)</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setActiveMode('flashcards')}
                className="py-2.5 px-4 rounded-2xl bg-[#F3ECE1] hover:bg-[#EAE2D6] dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>翻卡速记</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('combo')}
                className="py-2.5 px-4 rounded-2xl bg-[#F3ECE1] hover:bg-[#EAE2D6] dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>多词串联</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top 3-Mode Switcher: 今日轻练 | 翻卡速记 | 多词串联 */}
      {renderModeSwitcher()}

      {/* Top Stress-Free Progress Indicator */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 font-semibold text-amber-900 dark:text-amber-300">
            <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>今日轻练</span>
          </span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <span className="text-stone-500 font-mono">
            {liteIndex + 1} / {liteQueue.length} 句
          </span>
        </div>

        {/* 3-Step Dots */}
        <div className="flex items-center space-x-1.5">
          {liteQueue.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx < liteIndex
                  ? 'w-4 bg-amber-500'
                  : idx === liteIndex
                  ? 'w-7 bg-amber-600 dark:bg-amber-400'
                  : 'w-2.5 bg-[#EAE2D6] dark:bg-stone-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Single-Canvas Card */}
      <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-[#EAE2D6] dark:border-stone-800 shadow-sm transition-all space-y-6 relative overflow-hidden">
        {/* Subtle concentric warm parchment halo behind the card prompt */}
        <div className="absolute left-1/2 -top-12 -translate-x-1/2 w-80 h-80 rounded-full bg-[#F6EBDA]/45 dark:bg-amber-900/10 pointer-events-none" />
        <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-56 h-56 rounded-full bg-[#FFFEFA]/70 dark:bg-stone-900/40 pointer-events-none" />

        {/* Scene header & Switch Scenario */}
        <div className="flex items-center justify-between text-xs text-stone-500 pb-3 border-b border-[#EFE8DC] dark:border-stone-800 relative z-10">
          <span className="px-2.5 py-1 rounded-lg bg-[#F6EBDA] dark:bg-amber-950/60 text-[#8A4B0F] dark:text-amber-300 font-medium border border-amber-200/70 dark:border-amber-800/50">
            {currentExample?.scene || '生活语境'}
          </span>

          {validExamples.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setExampleIdx((prev) => prev + 1);
                setEvaluation(null);
                setRevealedSolution(false);
              }}
              className="text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center space-x-1 transition-colors cursor-pointer"
              title="换一个生活场景"
            >
              <Shuffle className="w-3 h-3" />
              <span>换个场景 ({(exampleIdx % validExamples.length) + 1}/{validExamples.length})</span>
            </button>
          )}
        </div>

        {/* Communicative Context & Thought Prompt */}
        <div className="space-y-3 relative z-10">
          {currentExample?.scenarioDescription && (
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              💡 情境：{currentExample.scenarioDescription}
            </p>
          )}

          {/* Chinese Thought Sentence */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/60 border border-[#EAE2D6] dark:border-stone-700/70">
            <div className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 mb-1">
              此时你想表达：
            </div>
            <p className="text-lg sm:text-xl font-bold font-serif text-stone-900 dark:text-stone-100 leading-relaxed tracking-tight">
              “{currentExample?.zh}”
            </p>
          </div>
        </div>

        {/* Expression Clue Pill */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6F0]/90 dark:bg-stone-800/50 border border-[#EAE2D6] dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-stone-400">核心表达提示:</span>
            {showClue ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold font-serif text-amber-800 dark:text-amber-300">
                  {liteCard.expression}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  · {liteCard.chineseMeaning}
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglish(liteCard.expression)}
                  className="p-1 rounded-md text-amber-700 dark:text-amber-300 hover:bg-[#F6EBDA] dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                  title="朗读该表达发音"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-stone-400 italic">已隐藏（盲测模式中）</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {showClue && (
              <button
                type="button"
                onClick={() => {
                  setUserInput((prev) => {
                    if (!prev) return liteCard.expression;
                    return `${prev} ${liteCard.expression}`;
                  });
                }}
                className="text-[11px] px-2 py-0.5 rounded-md bg-[#FFFEFA] dark:bg-stone-700 text-amber-800 dark:text-amber-300 border border-[#EAE2D6] dark:border-stone-600 hover:border-amber-500 font-medium transition-all shadow-2xs cursor-pointer"
              >
                + 填入
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowClue(!showClue)}
              className="text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 flex items-center space-x-1 cursor-pointer"
            >
              {showClue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showClue ? '盲测' : '提示'}</span>
            </button>
          </div>
        </div>

        {/* Input & Voice Production Area */}
        <div className="space-y-3 relative z-10">
          <div className="relative rounded-2xl border border-[#EAE2D6] dark:border-stone-700 bg-white dark:bg-stone-950/60 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleEvaluateLite();
                }
              }}
              rows={2}
              placeholder="按下方按钮大声说出，或在此输入你的英文句子..."
              className="w-full p-4 pr-10 rounded-2xl bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm resize-none focus:outline-none leading-relaxed"
            />

            {userInput.length > 0 && (
              <button
                type="button"
                onClick={() => setUserInput('')}
                className="absolute top-3.5 right-3.5 p-1 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-[#F3ECE1] dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="清空"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="flex items-center justify-between px-3.5 py-2 border-t border-[#EFE8DC] dark:border-stone-800/80 text-xs">
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-sm'
                    : 'bg-[#F6EBDA] hover:bg-[#EFE0C9] dark:bg-amber-950/60 dark:hover:bg-amber-900 text-[#8A4B0F] dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 animate-spin" />
                    <span>倾听中... 点击完成</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>🎙️ 说出句子 (语音转文字)</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-stone-400 font-mono">
                {userInput.trim().split(/\s+/).filter(Boolean).length} 词
              </span>
            </div>
          </div>

          {speechError && (
            <p className="text-xs text-amber-700 dark:text-amber-300 px-1">
              {speechError}
            </p>
          )}

          {evalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <span>{evalError}</span>
              <button
                type="button"
                onClick={handleEvaluateLite}
                className="font-semibold underline cursor-pointer"
              >
                重试
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setRevealedSolution(true)}
              className="text-xs text-stone-500 hover:text-amber-800 dark:hover:text-amber-300 py-2 px-1 flex items-center space-x-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
              <span>想不到？直接看母语者怎么说</span>
            </button>

            <button
              type="button"
              onClick={handleEvaluateLite}
              disabled={!userInput.trim() || isEvaluating}
              className={`py-2 px-5 rounded-xl font-semibold text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
                userInput.trim() && !isEvaluating
                  ? 'bg-amber-600 hover:bg-amber-700 text-white hover:scale-101'
                  : 'bg-[#F3ECE1] dark:bg-stone-800 text-stone-400 cursor-not-allowed'
              }`}
            >
              {isEvaluating ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 评测中...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>提交 AI 检验语感</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Evaluation */}
        {evaluation && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/60 space-y-3 animate-in fade-in relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`text-base font-bold font-serif ${evaluation.score >= 90 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-300'}`}>
                  {evaluation.score} 分
                </span>
                <span className={`text-xs font-semibold ${evaluation.score >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {evaluation.score >= 90 ? '🌟 超地道运用！' : '✨ 表达很棒！'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => speakEnglish(evaluation.nativeAlternative)}
                className="inline-flex items-center space-x-1 text-xs text-amber-800 hover:text-amber-950 dark:text-amber-300 font-medium cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>听母语润色发音</span>
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {evaluation.feedback}
            </p>

            <div className="p-3 rounded-xl bg-[#FFFEFA] dark:bg-stone-900/80 border border-[#EAE2D6] dark:border-amber-900/50 space-y-1">
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-400">
                母语者地道润色：
              </div>
              <p className="text-sm font-serif font-semibold text-stone-900 dark:text-stone-100 italic">
                "{evaluation.nativeAlternative}"
              </p>
            </div>
          </div>
        )}

        {/* Peek Model Sentence */}
        {revealedSolution && !evaluation && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/60 border border-[#EAE2D6] dark:border-stone-700 space-y-3 animate-in fade-in relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                📖 母语者真实表达：
              </span>
              <button
                type="button"
                onClick={() => speakEnglish(currentExample?.en || liteCard.expression)}
                className="inline-flex items-center space-x-1 text-xs text-amber-800 hover:text-amber-950 dark:text-amber-300 font-medium cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>听原声朗读</span>
              </button>
            </div>

            <p className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 italic">
              "{currentExample?.en}"
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {currentExample?.zh}
            </p>
          </div>
        )}

        {/* 2-Option Progress Footer */}
        <div className="pt-2 border-t border-[#EFE8DC] dark:border-stone-800 flex items-center justify-between gap-3 relative z-10">
          <button
            type="button"
            onClick={() => handleLiteProgress('again')}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#EAE2D6] dark:border-amber-900/50 bg-[#FAF6F0] dark:bg-amber-950/20 hover:bg-[#F3ECE1] text-stone-700 dark:text-amber-200 text-xs font-medium transition-all text-center cursor-pointer"
          >
            <span>稍显迟疑 · 稍后巩固</span>
          </button>

          <button
            type="button"
            onClick={() => handleLiteProgress('good')}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center space-x-1 cursor-pointer hover:scale-101"
          >
            <span>已掌握 · 下一句</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
