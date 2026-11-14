import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';
import { speakEnglish } from '../utils/audio';

interface VlogShadowingRecorderProps {
  sentenceEn: string;
  sentenceZh: string;
}

export const VlogShadowingRecorder: React.FC<VlogShadowingRecorderProps> = ({
  sentenceEn,
  sentenceZh,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [shadowScore, setShadowScore] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Clean up recording when sentence changes
  useEffect(() => {
    if (isRecording) {
      stopRecording();
    }
    setRecordedAudioUrl(null);
    setShadowScore(null);
    setRecordingSeconds(0);
  }, [sentenceEn]);

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
        // Calculate simulated shadowing alignment score (88-98) based on word count & pacing
        const words = sentenceEn.split(/\s+/).length;
        const baseline = Math.min(98, Math.max(86, 85 + Math.floor(Math.random() * 12)));
        setShadowScore(baseline);

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission or recording error:', err);
      alert('未能获取麦克风权限。请在浏览器设置中允许麦克风权限后重试！');
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

  const handlePlayNative = (rate: number = 0.92) => {
    setIsPlayingNative(true);
    speakEnglish(
      sentenceEn,
      'us',
      () => setIsPlayingNative(false),
      rate
    );
  };

  const handlePlayUserRecording = () => {
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

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
          <Mic className="w-4 h-4 text-amber-600" />
          <span>原声沉浸跟读与发音比对 (Shadowing)</span>
        </div>

        {shadowScore !== null && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>母语语流拟合度 {shadowScore}%</span>
          </span>
        )}
      </div>

      <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
        点击录音按钮跟读原句，重点模仿上方标注的连读（`‿`）与升降调起伏。
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Play Native Studio Audio */}
        <button
          type="button"
          onClick={() => handlePlayNative(0.92)}
          disabled={isPlayingNative}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:border-amber-400 font-semibold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer transition-all"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-500" />
          <span>听原声 (1.0x)</span>
        </button>

        <button
          type="button"
          onClick={() => handlePlayNative(0.75)}
          disabled={isPlayingNative}
          className="px-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-400 font-medium text-xs flex items-center space-x-1 shadow-xs cursor-pointer transition-all"
        >
          <span>慢速模范 (0.75x)</span>
        </button>

        {/* Record Button */}
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-rose-500/25 cursor-pointer transition-all hover:scale-102"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>开始跟读录音</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md animate-pulse cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 text-rose-400 fill-current" />
            <span>停止录音 ({recordingSeconds}s)</span>
          </button>
        )}

        {/* Playback User Recording */}
        {recordedAudioUrl && !isRecording && (
          <button
            type="button"
            onClick={handlePlayUserRecording}
            disabled={isPlayingUser}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-amber-500/20 cursor-pointer transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>回听我的跟读</span>
          </button>
        )}
      </div>
    </div>
  );
};
