import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  Repeat,
  CheckCircle2,
  BookmarkCheck,
  Plus,
  BookOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Mic,
  Subtitles,
  Award,
} from 'lucide-react';
import { VlogClip, VlogTranscriptLine, ExpressionCard } from '../types/card';
import { INITIAL_VLOG_CLIPS } from '../data/vlogClips';
import { VlogProsodyLine } from './VlogProsodyLine';
import { SentenceAnalysisModal } from './SentenceAnalysisModal';
import { VlogShadowingModal } from './VlogShadowingModal';
import { formatDate } from '../utils/srs';

interface VlogExplorationViewProps {
  onAddCard: (card: ExpressionCard) => void;
  cards: ExpressionCard[];
  onNavigateToReview?: () => void;
}

// SpeakVlog trial playback speed options
const SPEAKVLOG_SPEEDS = [0.5, 0.75, 0.8, 1.0, 1.25];

export const VlogExplorationView: React.FC<VlogExplorationViewProps> = ({
  onAddCard,
  cards,
  onNavigateToReview,
}) => {
  const [clips] = useState<VlogClip[]>(INITIAL_VLOG_CLIPS);
  const [selectedCategory, setSelectedCategory] = useState<'全部' | '日常生活' | '职场'>('全部');
  const [activeClipId, setActiveClipId] = useState<string>(INITIAL_VLOG_CLIPS[0].id);

  const activeClip = useMemo(() => {
    return clips.find((c) => c.id === activeClipId) || clips[0];
  }, [clips, activeClipId]);

  // Video playback states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLoopingLine, setIsLoopingLine] = useState(false);
  const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null);

  // SpeakVlog Subtitle Mode: 'both' (中英对照), 'en' (纯英文), 'none' (隐藏字幕/泛听)
  const [subtitleMode, setSubtitleMode] = useState<'both' | 'en' | 'none'>('both');

  // Analysis modal state
  const [analysisTarget, setAnalysisTarget] = useState<{
    sentence: string;
    translation?: string;
    expression?: string;
  } | null>(null);

  // Shadowing modal state (Dedicated SpeakVlog popup with prosody & linking marks)
  const [shadowingLineIndex, setShadowingLineIndex] = useState<number | null>(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Determine which transcript line is currently active
  const activeLineIndex = useMemo(() => {
    const idx = activeClip.transcript.findIndex(
      (line) => currentTime >= line.startSeconds && currentTime <= line.endSeconds
    );
    return idx >= 0 ? idx : 0;
  }, [activeClip, currentTime]);

  const activeLine = activeClip.transcript[activeLineIndex] || activeClip.transcript[0];

  // Filtered clips
  const filteredClips = useMemo(() => {
    if (selectedCategory === '全部') return clips;
    return clips.filter((c) => c.category === selectedCategory);
  }, [clips, selectedCategory]);

  // Handle video time updates & looping
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (isLoopingLine && loopRange) {
      if (t >= loopRange.end) {
        videoRef.current.currentTime = loopRange.start;
        videoRef.current.play();
      }
    }
  };

  const handleJumpToTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Skip to previous sentence
  const handlePrevSentence = () => {
    if (activeLineIndex > 0) {
      const prevLine = activeClip.transcript[activeLineIndex - 1];
      handleJumpToTime(prevLine.startSeconds);
      if (isLoopingLine) {
        setLoopRange({ start: prevLine.startSeconds, end: prevLine.endSeconds });
      }
    }
  };

  // Skip to next sentence
  const handleNextSentence = () => {
    if (activeLineIndex < activeClip.transcript.length - 1) {
      const nextLine = activeClip.transcript[activeLineIndex + 1];
      handleJumpToTime(nextLine.startSeconds);
      if (isLoopingLine) {
        setLoopRange({ start: nextLine.startSeconds, end: nextLine.endSeconds });
      }
    }
  };

  // Toggle single sentence loop
  const handleToggleLoopLine = () => {
    if (isLoopingLine) {
      setIsLoopingLine(false);
      setLoopRange(null);
    } else if (activeLine) {
      setIsLoopingLine(true);
      setLoopRange({
        start: activeLine.startSeconds,
        end: activeLine.endSeconds,
      });
      if (videoRef.current) {
        videoRef.current.currentTime = activeLine.startSeconds;
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleToggleSpecificLineLoop = (targetLine: VlogTranscriptLine) => {
    if (isLoopingLine && loopRange?.start === targetLine.startSeconds) {
      setIsLoopingLine(false);
      setLoopRange(null);
    } else {
      setIsLoopingLine(true);
      setLoopRange({
        start: targetLine.startSeconds,
        end: targetLine.endSeconds,
      });
      handleJumpToTime(targetLine.startSeconds);
    }
  };

  // Check if expression is saved
  const isExpressionInLibrary = (expr: string) => {
    return cards.some(
      (c) => c.expression.toLowerCase().trim() === expr.toLowerCase().trim()
    );
  };

  // Save expression to SRS
  const handleSaveVlogExpression = (data: {
    expression: string;
    chineseMeaning: string;
    nuance: string;
    exampleEn: string;
    exampleZh: string;
    register: '日常生活' | '职场';
  }) => {
    const today = formatDate();
    const newCard: ExpressionCard = {
      id: `card-vlog-${Date.now()}`,
      expression: data.expression,
      phoneticUs: '',
      phoneticUk: '',
      partOfSpeech: '地道表达 / idiom',
      chineseMeaning: data.chineseMeaning,
      englishDefinition: 'Authentic expression learned from overseas video vlog context.',
      register: data.register,
      level: activeClip.level || 'B2',
      nuance: `${data.nuance} (来源: 海外 Vlog《${activeClip.title}》博主 ${activeClip.vlogger})`,
      collocations: [
        {
          phrase: `use "${data.expression}" in daily communication`,
          translation: '在日常交流中地道运用',
        },
      ],
      examples: [
        {
          scene: `[海外Vlog精选 / ${activeClip.category}]`,
          scenarioDescription: `博主 ${activeClip.vlogger} 在真实海外生活视频中的纯正母语用法`,
          en: data.exampleEn,
          zh: data.exampleZh,
        },
      ],
      memoryHook: `结合 Vlog《${activeClip.title}》的真实人物语境，加深母语声音记忆！`,
      sentencePrompt: '',
      sentenceScenarios: [],
      userSentences: [],
      tags: [data.register],
      starred: true,
      createdAt: today,
      repetition: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: today,
      lastReviewedAt: null,
      reviewHistory: [],
      masteryStage: 'new',
    };

    onAddCard(newCard);
    showToast(`🎉 已成功将【${data.expression}】收藏并排入今日艾宾浩斯复习日程！`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs sm:text-sm font-semibold shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/10 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>SpeakVlog 试看精选 · 海外真实 Vlog 地道表达沉浸库</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 dark:text-stone-100">
            原声试看 · 像刷 Vlog 一样浸润地道母语口语
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xl">
            中英双语字幕随意切换，单句点读与循环。点击「跟读」弹出专属训练台，清晰掌握连读弧线与声调起伏！
          </p>
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 shrink-0 self-start md:self-auto text-xs font-semibold">
          {(['全部', '日常生活', '职场'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vlog Carousel / Selector Shelf */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-stone-600 dark:text-stone-400 px-1 flex items-center justify-between">
          <span>🎬 精选 Vlog 试看库 ({filteredClips.length})</span>
          <span className="text-[11px] text-stone-400">点击切换视频精读</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {filteredClips.map((clip) => {
            const isSelected = clip.id === activeClip.id;

            return (
              <div
                key={clip.id}
                onClick={() => {
                  setActiveClipId(clip.id);
                  setIsLoopingLine(false);
                  setLoopRange(null);
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                  }
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-sm ring-2 ring-amber-500/30'
                    : 'border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-300'
                }`}
              >
                <img
                  src={clip.thumbnailUrl}
                  alt={clip.title}
                  className="w-16 h-14 object-cover rounded-xl shrink-0"
                />
                <div className="overflow-hidden space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium">
                      {clip.category}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-semibold">
                      {clip.level}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                    {clip.title}
                  </h4>
                  <p className="text-[10px] text-stone-400 truncate">
                    博主: {clip.vlogger}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Workstation: SpeakVlog Trial Interface Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: SpeakVlog Video Player + Subtitle Toolbar + Video Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-800 shadow-xl space-y-4">
            {/* Top Subtitle Mode Selector (SpeakVlog Hallmark) */}
            <div className="flex items-center justify-between text-xs pb-1 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-stone-900 dark:text-stone-100 line-clamp-1 text-sm font-serif">
                  {activeClip.title}
                </span>
                <span className="text-[11px] text-stone-400 font-sans hidden sm:inline">
                  @{activeClip.vlogger}
                </span>
              </div>

              {/* Subtitle Switcher */}
              <div className="flex items-center space-x-1 p-0.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                <button
                  type="button"
                  onClick={() => setSubtitleMode('both')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    subtitleMode === 'both'
                      ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-300 shadow-2xs font-bold'
                      : 'hover:text-stone-900'
                  }`}
                >
                  中英对照
                </button>
                <button
                  type="button"
                  onClick={() => setSubtitleMode('en')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    subtitleMode === 'en'
                      ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-300 shadow-2xs font-bold'
                      : 'hover:text-stone-900'
                  }`}
                >
                  纯英文
                </button>
                <button
                  type="button"
                  onClick={() => setSubtitleMode('none')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    subtitleMode === 'none'
                      ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-300 shadow-2xs font-bold'
                      : 'hover:text-stone-900'
                  }`}
                >
                  隐藏字幕
                </button>
              </div>
            </div>

            {/* Video Container with Overlaid Subtitles */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center group shadow-inner">
              <video
                ref={videoRef}
                src={activeClip.videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
                playsInline
              />

              {/* In-Video Active Subtitle (Respects Subtitle Mode) */}
              {activeLine && subtitleMode !== 'none' && (
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/80 backdrop-blur-md text-white text-center pointer-events-none transition-all shadow-lg border border-white/10">
                  <p className="text-sm sm:text-base font-serif font-medium leading-snug">
                    {activeLine.textEn}
                  </p>
                  {subtitleMode === 'both' && (
                    <p className="text-xs text-stone-300 mt-1 font-sans">
                      {activeLine.textZh}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* SpeakVlog Player Toolbar: Play, Prev/Next Sentence, Loop, Shadowing & Speed Bar */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Left Controls: Play + Prev/Next Sentence + Loop */}
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1 shadow-sm shadow-amber-500/25 cursor-pointer transition-all hover:scale-102"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>暂停</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>播放</span>
                      </>
                    )}
                  </button>

                  {/* Prev Sentence */}
                  <button
                    type="button"
                    onClick={handlePrevSentence}
                    disabled={activeLineIndex <= 0}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="跳到上一句"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Next Sentence */}
                  <button
                    type="button"
                    onClick={handleNextSentence}
                    disabled={activeLineIndex >= activeClip.transcript.length - 1}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-400 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="跳到下一句"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Loop Single Sentence */}
                  <button
                    type="button"
                    onClick={handleToggleLoopLine}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      isLoopingLine
                        ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-500 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                    title="单句循环"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>单句循环 {isLoopingLine && '(开)'}</span>
                  </button>
                </div>

                {/* Right Action: Prominent SpeakVlog Shadowing Button */}
                <button
                  type="button"
                  onClick={() => setShadowingLineIndex(activeLineIndex)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:opacity-95 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-rose-500/20 cursor-pointer transition-all hover:scale-102"
                  title="弹出原声跟读窗口，显示连读标记、节奏语调并开始录音比对"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>跟读此句 (连读与节奏)</span>
                </button>
              </div>

              {/* Exact SpeakVlog Trial Playback Speed Bar (0.5x, 0.75x, 0.8x, 1.0x, 1.25x) */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-800 text-xs">
                <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400">
                  <span className="font-semibold text-[11px]">倍速播放:</span>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  {SPEAKVLOG_SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handleChangeSpeed(spd)}
                      className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer ${
                        playbackSpeed === spd
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Context & Video Narrative */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
              <span className="font-bold text-stone-800 dark:text-stone-200 mr-1.5">
                💡 场景语境背景：
              </span>
              {activeClip.contextDescription}
            </div>
          </div>

          {/* SpeakVlog Featured Expressions Shelf in this Video */}
          <div className="p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>本期 Vlog 重点地道表达与闪卡</span>
              </div>
              <span className="text-[11px] text-stone-400 font-normal">
                点击快速跳转定位
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeClip.transcript
                .filter((l) => Boolean(l.highlightedExpression))
                .map((lineItem) => {
                  const expr = lineItem.highlightedExpression!;
                  const isSaved = isExpressionInLibrary(expr.expression);

                  return (
                    <div
                      key={lineItem.id}
                      onClick={() => handleJumpToTime(lineItem.startSeconds)}
                      className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-amber-950 dark:text-amber-100 text-xs sm:text-sm">
                            ⭐ {expr.expression}
                          </span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                            {formatSeconds(lineItem.startSeconds)}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-1">
                          {expr.chineseMeaning} · {expr.nuance}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-amber-500/15 text-[11px]">
                        <span className="text-amber-700 dark:text-amber-400 group-hover:underline">
                          定位播放 →
                        </span>
                        {isSaved ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-0.5 font-semibold">
                            <BookmarkCheck className="w-3 h-3" />
                            <span>已在词库</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveVlogExpression({
                                expression: expr.expression,
                                chineseMeaning: expr.chineseMeaning,
                                nuance: expr.nuance || '',
                                exampleEn: lineItem.textEn,
                                exampleZh: lineItem.textZh,
                                register: activeClip.category === '职场' ? '职场' : '日常生活',
                              });
                            }}
                            className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all shadow-2xs cursor-pointer"
                          >
                            + 收藏至复习
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Column: Clean Synced Subtitle Transcripts (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-400 px-1">
            <div className="flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>逐句台词点读 · 精读与跟读</span>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">
              共 {activeClip.transcript.length} 句
            </span>
          </div>

          {/* Transcript Scrollable Deck (Clean SpeakVlog trial style without prosody marks) */}
          <div
            ref={transcriptScrollContainerRef}
            className="space-y-3 max-h-[720px] overflow-y-auto pr-1"
          >
            {activeClip.transcript.map((line, idx) => {
              const isActive = activeLine?.id === line.id;
              const hasKeyExpr = Boolean(line.highlightedExpression);
              const isSaved =
                hasKeyExpr && isExpressionInLibrary(line.highlightedExpression!.expression);

              return (
                <VlogProsodyLine
                  key={line.id}
                  line={line}
                  index={idx}
                  isActive={isActive}
                  isLooping={isLoopingLine && activeLine?.id === line.id}
                  subtitleMode={subtitleMode}
                  onJumpToTime={handleJumpToTime}
                  onToggleLoop={handleToggleSpecificLineLoop}
                  onOpenShadowing={() => setShadowingLineIndex(idx)}
                  onOpenAnalysis={(sent, trans, expr) =>
                    setAnalysisTarget({
                      sentence: sent,
                      translation: trans,
                      expression: expr,
                    })
                  }
                  onSaveExpressionToCards={(exprData) =>
                    handleSaveVlogExpression({
                      ...exprData,
                      register: activeClip.category === '职场' ? '职场' : '日常生活',
                    })
                  }
                  isExpressionSaved={isSaved}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* SpeakVlog Dedicated Shadowing Modal: ONLY place displaying linking & rhythm marks */}
      {shadowingLineIndex !== null && (
        <VlogShadowingModal
          isOpen={shadowingLineIndex !== null}
          onClose={() => setShadowingLineIndex(null)}
          clip={activeClip}
          currentLineIndex={shadowingLineIndex}
          onChangeLineIndex={(newIdx) => {
            setShadowingLineIndex(newIdx);
            const targetLine = activeClip.transcript[newIdx];
            if (targetLine) {
              handleJumpToTime(targetLine.startSeconds);
            }
          }}
          onSaveExpressionToCards={(exprData) =>
            handleSaveVlogExpression({
              ...exprData,
              register: activeClip.category === '职场' ? '职场' : '日常生活',
            })
          }
          isExpressionSaved={
            Boolean(activeClip.transcript[shadowingLineIndex]?.highlightedExpression) &&
            isExpressionInLibrary(
              activeClip.transcript[shadowingLineIndex]?.highlightedExpression!.expression
            )
          }
        />
      )}

      {/* Deep Word Analysis Modal */}
      <SentenceAnalysisModal
        isOpen={Boolean(analysisTarget)}
        onClose={() => setAnalysisTarget(null)}
        sentence={analysisTarget?.sentence || ''}
        translation={analysisTarget?.translation}
        expression={analysisTarget?.expression}
        onAddExpression={(newWord) => {
          showToast(`已成功录入词汇【${newWord}】！`);
        }}
      />
    </div>
  );
};

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
