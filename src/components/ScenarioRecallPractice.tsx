import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Shuffle,
  X,
  MessageSquare,
  Award,
  Zap,
} from 'lucide-react';
import { ExpressionCard, ExampleSentence, ReviewGrade, SentenceEvaluationResult, UserSentenceRecord } from '../types/card';
import { speakEnglish, stopSpeaking } from '../utils/audio';
import { calculateNextReview, updateCardWithReview } from '../utils/srs';

interface ScenarioRecallPracticeProps {
  card: ExpressionCard;
  currentIndex: number;
  totalCards: number;
  onGrade: (grade: ReviewGrade, record?: UserSentenceRecord) => void;
  onOpenCardDetail?: (card: ExpressionCard) => void;
}

export const ScenarioRecallPractice: React.FC<ScenarioRecallPracticeProps> = ({
  card,
  currentIndex,
  totalCards,
  onGrade,
  onOpenCardDetail,
}) => {
  // Scenario selection for this card
  const validExamples: ExampleSentence[] =
    card.examples && card.examples.length > 0
      ? card.examples
      : [
          {
            scene: `[${card.register || '真实生活'} / 典型沟通]`,
            scenarioDescription: card.nuance || '在真实母语者交流中自然运用此表达',
            zh: card.chineseMeaning ? `在日常中表达 “${card.chineseMeaning}” 的真实情境。` : '在日常沟通中运用此表达。',
            en: `Native speakers naturally use "${card.expression}" in this context.`,
          },
        ];

  const [exampleIndex, setExampleIndex] = useState(0);
  const currentExample = validExamples[exampleIndex % validExamples.length];

  // User input & Voice dictation state
  const [userInput, setUserInput] = useState('');
  const [showClue, setShowClue] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Evaluation & Solution states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<SentenceEvaluationResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [surrendered, setSurrendered] = useState(false);

  // Reset local state when switching to another card
  useEffect(() => {
    setUserInput('');
    setShowClue(false);
    setIsListening(false);
    setSpeechError(null);
    setIsEvaluating(false);
    setEvaluation(null);
    setEvalError(null);
    setSurrendered(false);
    setExampleIndex(0);
  }, [card.id]);

  // Speech Recognition setup (Web Speech API)
  const recognitionRef = useRef<any>(null);

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
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('麦克风权限未开启，请允许浏览器麦克风权限，或直接在文本框输入。');
        } else if (event.error === 'no-speech') {
          setSpeechError('未检测到语音，请靠近麦克风重新大声说出。');
        } else {
          setSpeechError('语音识别异常，建议直接打字输入。');
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
      setSpeechError('当前浏览器暂不支持 Web Speech API 实时录音，可直接打字作答。');
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
      } catch (err: any) {
        console.warn('Start recognition error:', err);
        setSpeechError('无法启动麦克风录音，请重试或直接键盘输入。');
      }
    }
  };

  // Submit and evaluate user sentence against this specific real-life scenario
  const handleEvaluate = async () => {
    if (!userInput.trim() || isEvaluating) return;

    setIsEvaluating(true);
    setEvalError(null);

    try {
      const res = await fetch('/api/evaluate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: card.expression,
          userSentence: userInput.trim(),
          scenarioChinese: currentExample.zh,
          scenarioDescription: `${currentExample.scene} - ${currentExample.scenarioDescription || ''}`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'AI 评测服务响应较慢，请点击重试');
      }

      const data: SentenceEvaluationResult = await res.json();
      setEvaluation(data);
    } catch (err: any) {
      console.error('Evaluate sentence error:', err);
      setEvalError(err?.message || '评估网络连接超时，请点击重新提交');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Surrender / Show Native Model Sentence
  const handleSurrender = () => {
    setSurrendered(true);
    setShowClue(true);
  };

  // Handle grade and advance to next card
  const handleGradeSelection = (grade: ReviewGrade) => {
    stopSpeaking();

    // Construct a UserSentenceRecord if user submitted a sentence
    let record: UserSentenceRecord | undefined;
    if (userInput.trim() && evaluation) {
      record = {
        id: `sent-rec-${Date.now()}`,
        sentence: userInput.trim(),
        promptScenario: `${currentExample.scene} | ${currentExample.zh}`,
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
    }

    onGrade(grade, record);
  };

  // Calculate SRS interval previews for buttons
  const againPreview = calculateNextReview(card, 'again');
  const hardPreview = calculateNextReview(card, 'hard');
  const goodPreview = calculateNextReview(card, 'good');
  const easyPreview = calculateNextReview(card, 'easy');

  const isEvaluatedOrSurrendered = evaluation !== null || surrendered;

  return (
    <div className="space-y-6">
      {/* Scenario Challenge Card */}
      <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-[#EAE2D6] dark:border-stone-800 shadow-sm transition-all relative overflow-hidden">
        {/* Subtle warm cream halo backdrop */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#F6EBDA]/60 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#EAE2D6] dark:border-stone-800/80">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#F6EBDA] dark:bg-amber-950/40 text-[#8A4B0F] dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/60 text-xs font-semibold flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>真实情境唤醒造句</span>
            </span>

            <span className="text-xs px-2 py-0.5 rounded-md bg-[#FAF6F0] dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium border border-[#EAE2D6]/60 dark:border-stone-700">
              {currentExample.scene}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {validExamples.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setExampleIndex((prev) => prev + 1);
                  setEvaluation(null);
                  setSurrendered(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F3ECE1] dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-300 transition-colors flex items-center space-x-1 cursor-pointer"
                title="切换同一表达的其他真实语境"
              >
                <Shuffle className="w-3 h-3" />
                <span>换个情境 ({(exampleIndex % validExamples.length) + 1}/{validExamples.length})</span>
              </button>
            )}

            <span className="font-mono text-stone-400">
              第 {currentIndex + 1} / {totalCards} 张
            </span>
          </div>
        </div>

        {/* Central Scenario Sentence */}
        <div className="py-6 space-y-4">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-[#8A4B0F] dark:text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <span>🎯 真实生活交流意图 · 我会不会在这个情境想到并用它？</span>
            </div>
            {currentExample.scenarioDescription && (
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                情境背景：{currentExample.scenarioDescription}
              </p>
            )}
          </div>

          {/* Real-life Chinese Sentence to be converted into spoken English */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/60 border border-[#EAE2D6] dark:border-amber-900/40">
            <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
              请组织并说出对应的地道英文句子：
            </div>
            <p className="text-lg sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 leading-relaxed tracking-tight">
              “{currentExample.zh}”
            </p>
          </div>
        </div>

        {/* Expression Clue Drawer (Blind Recall vs Clue Mode) */}
        <div className="py-2">
          {!showClue ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/40 border border-dashed border-[#D6CBB9] dark:border-stone-800">
              <div className="flex items-center space-x-2 text-xs text-stone-600 dark:text-stone-300">
                <span className="text-base">🙈</span>
                <span className="font-semibold">当前为盲测模式</span>
                <span className="text-stone-400 hidden sm:inline">（考验在现实语境中能否主动本能想到该表达）</span>
              </div>

              <button
                type="button"
                onClick={() => setShowClue(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FFFEFA] dark:bg-stone-800 border border-[#EAE2D6] dark:border-stone-700 hover:border-amber-500 text-amber-800 dark:text-amber-300 text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>显示已收录表达线索提示</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#F6EBDA]/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#8A4B0F] dark:text-amber-300 uppercase tracking-wider flex items-center space-x-1">
                    <span>💡 收录表达提示：</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => speakEnglish(card.expression)}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#FFFEFA] dark:bg-amber-900/50 text-[#8A4B0F] dark:text-amber-200 hover:bg-[#F6EBDA] text-xs font-mono transition-colors cursor-pointer border border-amber-200/60 dark:border-amber-800/50"
                    title="朗读该表达发音"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>{card.phoneticUs || '发音'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowClue(false)}
                  className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center space-x-1 cursor-pointer"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>隐藏提示</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-extrabold font-serif text-[#8A4B0F] dark:text-amber-200">
                  {card.expression}
                </span>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  · {card.chineseMeaning}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setUserInput((prev) => {
                      if (!prev) return card.expression;
                      return `${prev} ${card.expression}`;
                    });
                  }}
                  className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-all cursor-pointer shadow-xs"
                >
                  + 填入此表达
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Area: Voice Dictation + Typing */}
        <div className="pt-4 space-y-3">
          <div className="relative rounded-2xl border border-[#EAE2D6] dark:border-stone-700 bg-[#FAF6F0] dark:bg-stone-950/60 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleEvaluate();
                }
              }}
              rows={3}
              placeholder="在此大声说出或输入你想到的英文句子...（尝试在这个情境自然运用收录的表达）"
              className="w-full p-4 pr-12 rounded-2xl bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm sm:text-base resize-none focus:outline-none leading-relaxed"
            />

            {/* Clear "X" button */}
            {userInput.length > 0 && (
              <button
                type="button"
                onClick={() => setUserInput('')}
                className="absolute top-3.5 right-3.5 p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-[#EFE8DC] dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="清空输入"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Bottom bar inside textarea container */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#EAE2D6]/80 dark:border-stone-800/80 text-xs text-stone-400">
              <div className="flex items-center space-x-2">
                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                      : 'bg-[#F6EBDA] hover:bg-[#EFE0C7] dark:bg-amber-950/50 dark:hover:bg-amber-900 text-[#8A4B0F] dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 animate-spin" />
                      <span>正在倾听... 点击完成录入</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>🎙️ 语音说出句子 (Speech-to-Text)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-mono text-[11px]">
                  {userInput.trim().split(/\s+/).filter(Boolean).length} 词 · {userInput.length} 字符
                </span>
                <span className="hidden sm:inline text-stone-400 text-[11px]">
                  Cmd/Ctrl + Enter 提交
                </span>
              </div>
            </div>
          </div>

          {/* Speech error toast */}
          {speechError && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Evaluation Error */}
          {evalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{evalError}</span>
              </div>
              <button
                type="button"
                onClick={handleEvaluate}
                className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-semibold cursor-pointer"
              >
                重试
              </button>
            </div>
          )}

          {/* Action buttons (Submit / Surrender) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleSurrender}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 py-2.5 px-3 rounded-xl hover:bg-[#F3ECE1] dark:hover:bg-stone-800 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>一时想不到？查看母语者真实例句</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleEvaluate}
                disabled={!userInput.trim() || isEvaluating}
                className={`py-2.5 px-6 rounded-xl font-semibold text-xs sm:text-sm flex items-center space-x-2 transition-all shadow-sm cursor-pointer ${
                  userInput.trim() && !isEvaluating
                    ? 'bg-amber-600 hover:bg-amber-700 text-white hover:scale-101'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isEvaluating ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>AI 正在评估情境契合度...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>提交 AI 检验情境唤醒度</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Evaluation Coaching Result */}
      {evaluation && (
        <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-[#EAE2D6] dark:border-amber-900/70 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header & Score */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EAE2D6] dark:border-stone-800">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg font-serif ${
                  evaluation.score >= 90
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60'
                    : evaluation.score >= 80
                    ? 'bg-[#F6EBDA] text-[#8A4B0F] dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60'
                }`}
              >
                {evaluation.score}
              </div>

              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
                  <span>
                    {evaluation.score >= 90
                      ? '🌟 超地道！情境唤醒与运用极为出色'
                      : evaluation.score >= 80
                      ? '✨ 表达自然！准确把握了情境意图'
                      : '💡 表达意图已传达，仍有更地道的母语习惯'}
                  </span>
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  AI 语境教练已针对「{currentExample.scene}」给出深度指导
                </div>
              </div>
            </div>

            {/* Praise tags */}
            {evaluation.praisePoints && evaluation.praisePoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {evaluation.praisePoints.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-[#F6EBDA] dark:bg-amber-950/50 text-[#8A4B0F] dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 text-xs font-medium"
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Coaching Feedback */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              情境沟通实效分析 (Situational Coaching)：
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed bg-[#FAF6F0] dark:bg-stone-800/40 p-4 rounded-2xl border border-[#EAE2D6] dark:border-stone-800">
              {evaluation.feedback}
            </p>
          </div>

          {/* Native Polish Alternative */}
          <div className="p-5 rounded-2xl bg-[#F6EBDA]/55 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8A4B0F] dark:text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>母语者地道润色 (Native Polish · 必须保留目标表达)</span>
              </span>

              <button
                type="button"
                onClick={() => speakEnglish(evaluation.nativeAlternative)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>听原声发音</span>
              </button>
            </div>

            <p className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 italic">
              "{evaluation.nativeAlternative}"
            </p>

            {evaluation.alternativeAnalysis && (
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed border-t border-amber-200/60 dark:border-amber-900/40 pt-2">
                💡 地道亮点：{evaluation.alternativeAnalysis}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Surrendered Model Sentence View */}
      {surrendered && !evaluation && (
        <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-[#EAE2D6] dark:border-stone-800 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8A4B0F] dark:text-amber-400 uppercase tracking-wider">
              📖 母语者真实表达示范 (Native Speaker Model)
            </span>

            <button
              type="button"
              onClick={() => speakEnglish(currentExample.en)}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>听母语原声</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6F0] dark:bg-stone-800/50 border border-[#EAE2D6] dark:border-stone-800 space-y-2">
            <p className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 italic">
              "{currentExample.en}"
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {currentExample.zh}
            </p>
          </div>

          <div className="text-xs text-stone-500 dark:text-stone-400">
            💡 核心启示：在「{currentExample.scene}」中，母语者会本能使用 “{card.expression}”。记住这个情境与语感！
          </div>
        </div>
      )}

      {/* SRS Difficulty Evaluation & Advance to Next Card */}
      {isEvaluatedOrSurrendered && (
        <div className="bg-[#FFFEFA] dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-[#EAE2D6] dark:border-stone-800 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              刚才在真实生活情境中，你能够自然想到并用出 “{card.expression}” 吗？
            </h3>
            <p className="text-xs text-stone-500">
              点击下方评估记忆唤醒难度，系统将自动推进到下一张卡片并更新艾宾浩斯复习周期
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* Again */}
            <button
              type="button"
              onClick={() => handleGradeSelection('again')}
              className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-900 dark:text-rose-200 transition-all text-center group cursor-pointer relative"
            >
              <div className="text-sm font-bold group-hover:scale-102 transition-transform">
                🟥 遗忘 / 没想出
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                完全卡壳或需看提示
              </div>
              <div className="text-[10px] opacity-75 font-mono">
                +1天后末尾重练
              </div>
            </button>

            {/* Hard */}
            <button
              type="button"
              onClick={() => handleGradeSelection('hard')}
              className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 transition-all text-center group cursor-pointer relative"
            >
              <div className="text-sm font-bold group-hover:scale-102 transition-transform">
                🟨 较费力 / 稍迟疑
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                思考良久才勉强想到
              </div>
              <div className="text-[10px] opacity-75 font-mono">
                +{hardPreview.intervalDays}天后
              </div>
            </button>

            {/* Good */}
            <button
              type="button"
              onClick={() => handleGradeSelection('good')}
              className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 transition-all text-center group cursor-pointer relative"
            >
              <div className="text-sm font-bold group-hover:scale-102 transition-transform">
                🟩 顺利想到且准确
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                情境契合，流利说出
              </div>
              <div className="text-[10px] opacity-75 font-mono">
                +{goodPreview.intervalDays}天后
              </div>
            </button>

            {/* Easy */}
            <button
              type="button"
              onClick={() => handleGradeSelection('easy')}
              className="p-3.5 rounded-2xl border border-[#EAE2D6] dark:border-stone-700 bg-[#FAF6F0] dark:bg-stone-800/40 hover:bg-[#F3ECE1] dark:hover:bg-stone-800/80 text-stone-800 dark:text-stone-200 transition-all text-center group cursor-pointer relative"
            >
              <div className="text-sm font-bold group-hover:scale-102 transition-transform">
                🟦 肌肉记忆 / 秒用
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                本能脱口而出
              </div>
              <div className="text-[10px] opacity-75 font-mono">
                +{easyPreview.intervalDays}天后
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
