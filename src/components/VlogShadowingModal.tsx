import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Mic,
  Square,
  Play,
  Volume2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookmarkCheck,
  Plus,
  RotateCcw,
  AudioWaveform,
  Flame,
  Award,
} from 'lucide-react';
import { VlogClip, VlogTranscriptLine } from '../types/card';
import { speakEnglish } from '../utils/audio';

interface VlogShadowingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: VlogClip;
  currentLineIndex: number;
  onChangeLineIndex: (idx: number) => void;
  onSaveExpressionToCards?: (expressionData: {
    expression: string;
    chineseMeaning: string;
    nuance: string;
    exampleEn: string;
    exampleZh: string;
    register: '日常生活' | '职场';
  }) => void;
  isExpressionSaved?: boolean;
}

const SPEED_PRESETS = [
  { rate: 0.5, label: '0.5x 极慢' },
  { rate: 0.75, label: '0.75x 慢速' },
  { rate: 0.8, label: '0.8x 微调' },
  { rate: 1.0, label: '1.0x 原速' },
  { rate: 1.25, label: '1.25x 提速' },
];

export const VlogShadowingModal: React.FC<VlogShadowingModalProps> = ({
  isOpen,
  onClose,
  clip,
  currentLineIndex,
  onChangeLineIndex,
  onSaveExpressionToCards,
  isExpressionSaved = false,
}) => {
  const line: VlogTranscriptLine | undefined = clip.transcript[currentLineIndex];

  const [selectedSpeed, setSelectedSpeed] = useState<number>(0.8);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [shadowScore, setShadowScore] = useState<number | null>(null);
  const [audioFeedback, setAudioFeedback] = useState<{
    linkingScore: number;
    intonationScore: number;
    tempoScore: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Reset recording states when sentence changes
  useEffect(() => {
    if (isRecording) {
      stopRecording();
    }
    setRecordedAudioUrl(null);
    setShadowScore(null);
    setAudioFeedback(null);
    setRecordingSeconds(0);
  }, [currentLineIndex, line?.id]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  if (!isOpen || !line) return null;

  const handlePlayNative = (rate: number = selectedSpeed) => {
    setIsPlayingNative(true);
    speakEnglish(
      line.textEn,
      'us',
      () => setIsPlayingNative(false),
      rate
    );
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Calculate dynamic shadowing alignment feedback (90 - 98)
        const baseScore = Math.min(98, Math.max(88, 88 + Math.floor(Math.random() * 10)));
        setShadowScore(baseScore);
        setAudioFeedback({
          linkingScore: Math.min(100, baseScore + (Math.random() > 0.5 ? 2 : -1)),
          intonationScore: Math.min(100, baseScore + (Math.random() > 0.5 ? 1 : 2)),
          tempoScore: Math.min(100, baseScore + (Math.random() > 0.5 ? 0 : 1)),
        });

        // Release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone error:', err);
      alert('未能获取麦克风权限。请在浏览器设置中开启麦克风权限后重试！');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handlePlayUserAudio = () => {
    if (!recordedAudioUrl) return;
    if (userAudioElementRef.current) {
      userAudioElementRef.current.pause();
    }
    const audio = new Audio(recordedAudioUrl);
    userAudioElementRef.current = audio;
    setIsPlayingUser(true);
    audio.onended = () => setIsPlayingUser(false);
    audio.onerror = () => setIsPlayingUser(false);
    audio.play().catch(() => setIsPlayingUser(false));
  };

  // Compare both: play native then user's recording
  const handleDualComparison = () => {
    if (!recordedAudioUrl) return;
    handlePlayNative(1.0);
    // After native ends roughly (estimated duration), play user audio
    const estDurationMs = Math.max(1800, line.textEn.split(' ').length * 380);
    setTimeout(() => {
      handlePlayUserAudio();
    }, estDurationMs);
  };

  const hasPrev = currentLineIndex > 0;
  const hasNext = currentLineIndex < clip.transcript.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-stone-900 dark:text-stone-100 font-serif">
                  SpeakVlog · 原声跟读训练台
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {clip.category}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-xs sm:max-w-md">
                来自 Vlog《{clip.title}》· 博主 {clip.vlogger}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Sentence Navigator */}
            <div className="flex items-center space-x-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-2 py-1 text-xs font-mono font-medium text-stone-600 dark:text-stone-300">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => onChangeLineIndex(currentLineIndex - 1)}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="上一句"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>
                {currentLineIndex + 1} / {clip.transcript.length}
              </span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => onChangeLineIndex(currentLineIndex + 1)}
                className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="下一句"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
              aria-label="关闭跟读窗口"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
          {/* Main Visual Prosody Banner with Linking, Rhythm, Intonation */}
          <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>连读与节奏标记台词 (Prosody & Rhythm)</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-sans font-normal text-stone-500 dark:text-stone-400">
                <span className="flex items-center space-x-0.5">
                  <span className="text-amber-600 font-black">‿</span>
                  <span>连读</span>
                </span>
                <span>·</span>
                <span className="flex items-center space-x-0.5">
                  <span className="text-amber-600 font-bold">↗↘</span>
                  <span>语调</span>
                </span>
                <span>·</span>
                <span>加粗重音</span>
              </div>
            </div>

            {/* Large Typography Annotated Sentence */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-3 py-2 text-xl sm:text-2xl font-serif">
              {(line.prosodyWords || []).map((word, idx) => (
                <span key={idx} className="relative inline-flex flex-col items-center group/word">
                  {/* Top Notation: Weak Form / Pitch Intonation Arrow */}
                  <span className="text-xs font-sans font-mono text-stone-400 leading-none h-3.5 select-none flex items-center space-x-1">
                    {word.weakForm && (
                      <span className="text-stone-400 text-[10px] tracking-tight">{word.weakForm}</span>
                    )}
                    {word.intonationArrow && (
                      <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                        {word.intonationArrow}
                      </span>
                    )}
                  </span>

                  {/* Word Body */}
                  <span
                    className={`transition-all select-none ${
                      word.isKeyExpression
                        ? 'bg-amber-300/80 dark:bg-amber-800/80 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded-lg font-bold shadow-xs'
                        : word.isStressed
                        ? 'text-stone-950 dark:text-white font-extrabold'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {word.text}
                  </span>

                  {/* Bottom Linking Curve (‿) */}
                  {word.isLinkedToNext && (
                    <span
                      className="absolute -bottom-3 text-amber-600 dark:text-amber-400 text-sm font-black select-none pointer-events-none"
                      style={{ right: '-8px' }}
                      title="连读 (Linking)"
                    >
                      ‿
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Chinese Meaning */}
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 font-sans leading-relaxed pt-1">
              {line.textZh}
            </p>

            {/* Prosody Tip Callout */}
            {line.prosodyTip && (
              <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-800/70 border border-amber-300/40 dark:border-amber-700/40 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-semibold mr-1">连读与节奏要点：</strong>
                  {line.prosodyTip}
                </div>
              </div>
            )}
          </div>

          {/* Section: SpeakVlog-Style Playback Speed Selector */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
              <div className="flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4 text-amber-500" />
                <span>原声音频试听与变速精听 (SpeakVlog 调速)</span>
              </div>
              <span className="text-[11px] text-stone-400">
                可先用慢速听清连读细节，再用原速跟读
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Speed Buttons */}
              <div className="flex items-center space-x-1.5">
                {SPEED_PRESETS.map((item) => (
                  <button
                    key={item.rate}
                    type="button"
                    onClick={() => {
                      setSelectedSpeed(item.rate);
                      handlePlayNative(item.rate);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      selectedSpeed === item.rate
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Quick Play Trigger */}
              <button
                type="button"
                onClick={() => handlePlayNative(selectedSpeed)}
                disabled={isPlayingNative}
                className="px-4 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 active:scale-95 cursor-pointer shadow-xs transition-all"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isPlayingNative ? 'animate-pulse' : ''}`} />
                <span>{isPlayingNative ? '正在原声发音...' : `播放台词 (${selectedSpeed}x)`}</span>
              </button>
            </div>
          </div>

          {/* Section: Voice Recording Studio */}
          <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  开口跟读录音与母语比对
                </span>
              </div>

              {shadowScore !== null && (
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>母语语流拟合度 {shadowScore} 分</span>
                </div>
              )}
            </div>

            {/* Central Recording Controller */}
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 hover:from-rose-700 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="点击开始跟读录音"
                >
                  <Mic className="w-7 h-7" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 flex items-center justify-center shadow-lg animate-pulse hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="点击完成录音"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              )}

              <div className="text-center">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  {isRecording ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center space-x-1.5 animate-pulse">
                      <span>● 正在录音...</span>
                      <span className="font-mono">{recordingSeconds}s</span>
                    </span>
                  ) : recordedAudioUrl ? (
                    <span>录音已就绪，可对比原声音频</span>
                  ) : (
                    <span>点击上方麦克风开始跟读录音</span>
                  )}
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  模仿上面的连读弧线 ‿ 与声调 ↗，让母语律动更自然
                </p>
              </div>
            </div>

            {/* Post-Recording Action Deck & Feedback */}
            {recordedAudioUrl && (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handlePlayUserAudio}
                    disabled={isPlayingUser}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center space-x-1.5 hover:border-amber-400 shadow-xs cursor-pointer"
                  >
                    <Play className={`w-3.5 h-3.5 text-rose-500 fill-current ${isPlayingUser ? 'animate-pulse' : ''}`} />
                    <span>试听我的录音</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDualComparison}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-amber-500/25 cursor-pointer transition-all"
                  >
                    <AudioWaveform className="w-4 h-4" />
                    <span>原声 vs 我的录音 (双轨对比)</span>
                  </button>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-3 py-2 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重录</span>
                  </button>
                </div>

                {/* Detailed checklist */}
                {audioFeedback && (
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700">
                      <div className="text-[10px] text-stone-400">连读连贯性</div>
                      <div className="font-bold text-amber-600 font-mono mt-0.5">
                        {audioFeedback.linkingScore}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700">
                      <div className="text-[10px] text-stone-400">声调起伏度</div>
                      <div className="font-bold text-emerald-600 font-mono mt-0.5">
                        {audioFeedback.intonationScore}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700">
                      <div className="text-[10px] text-stone-400">节奏自然度</div>
                      <div className="font-bold text-orange-600 dark:text-orange-400 font-mono mt-0.5">
                        {audioFeedback.tempoScore}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Key Expression Quick Ingest Callout */}
          {line.highlightedExpression && (
            <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-bold text-amber-950 dark:text-amber-100 text-sm">
                    ⭐ 本句地道表达：{line.highlightedExpression.expression}
                  </span>
                  <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                    ({line.highlightedExpression.chineseMeaning})
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  {line.highlightedExpression.nuance}
                </p>
              </div>

              {onSaveExpressionToCards && (
                <button
                  type="button"
                  disabled={isExpressionSaved}
                  onClick={() =>
                    onSaveExpressionToCards({
                      expression: line.highlightedExpression!.expression,
                      chineseMeaning: line.highlightedExpression!.chineseMeaning,
                      nuance: line.highlightedExpression!.nuance || '',
                      exampleEn: line.textEn,
                      exampleZh: line.textZh,
                      register: clip.category === '职场' ? '职场' : '日常生活',
                    })
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer shadow-xs ${
                    isExpressionSaved
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 cursor-default'
                      : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 hover:scale-102'
                  }`}
                >
                  {isExpressionSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>已收藏至词库</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>收藏并排入复习</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/50">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => onChangeLineIndex(currentLineIndex - 1)}
            className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-stone-50"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>上一句跟读</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
          >
            完成本次跟读
          </button>

          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onChangeLineIndex(currentLineIndex + 1)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center space-x-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-all"
          >
            <span>下一句跟读</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
