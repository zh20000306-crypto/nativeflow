// High-Fidelity Audio Utility combining Gemini TTS (Studio-grade human speech) & Web Speech API fallback

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudioElement: HTMLAudioElement | null = null;

// In-memory cache for base64 audio URLs to enable 0ms instant repeated playback
const clientAudioCache = new Map<string, string>();

// Pre-warm voices on browsers that load them asynchronously
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    try {
      window.speechSynthesis.getVoices();
    } catch {
      // ignore
    }
  };
}

/**
 * Fallback to browser's SpeechSynthesis with curated high-quality voices & humanized prosody
 */
function speakWithBrowserSynth(
  text: string,
  accent: 'us' | 'uk' = 'us',
  onEnd?: () => void,
  rate: number = 0.92
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1.02; // Slightly warmer pitch to remove robotic flatness

  const voices = window.speechSynthesis.getVoices();
  const targetLang = accent === 'uk' ? 'en-GB' : 'en-US';

  // Prioritize premium/natural voices (Google, Apple Natural, Samantha, Daniel, Karen)
  const premiumVoice =
    voices.find(
      (v) =>
        (v.lang === targetLang || v.lang.startsWith(targetLang.slice(0, 2))) &&
        (v.name.includes('Natural') ||
          v.name.includes('Online') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Siri') ||
          v.name.includes('Daniel') ||
          v.name.includes('Karen') ||
          v.name.includes('Alex'))
    ) ||
    voices.find((v) => v.lang === targetLang) ||
    voices.find((v) => v.lang.startsWith('en'));

  if (premiumVoice) {
    utterance.voice = premiumVoice;
  }

  utterance.onend = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Primary English Speech function:
 * First attempts to play studio-quality native AI speech (Gemini TTS) with human intonation and breath.
 * Seamlessly falls back to optimized browser speech if offline or during network latency.
 */
export function speakEnglish(
  text: string,
  accent: 'us' | 'uk' = 'us',
  onEnd?: () => void,
  rate: number = 0.92,
  voiceName: string = 'Kore' // 'Kore' (warm female) | 'Puck' (clear male)
): void {
  const cleanText = text.trim();
  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  // Stop any currently playing audio or speech
  stopSpeaking();

  const cacheKey = `${voiceName}_${cleanText.toLowerCase()}`;
  const cachedUrl = clientAudioCache.get(cacheKey);

  // If already cached in memory, play immediately
  if (cachedUrl) {
    const audio = new Audio(cachedUrl);
    currentAudioElement = audio;
    if (rate !== 0.92) {
      audio.playbackRate = rate / 0.92;
    }
    audio.onended = () => {
      currentAudioElement = null;
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      currentAudioElement = null;
      speakWithBrowserSynth(cleanText, accent, onEnd, rate);
    };
    audio.play().catch(() => {
      speakWithBrowserSynth(cleanText, accent, onEnd, rate);
    });
    return;
  }

  // Fast single words (< 15 chars) can play instantly, but for full sentences (> 15 chars),
  // fetching Gemini TTS produces remarkably natural, authentic native intonation!
  let hasHandledPlayback = false;

  // Set up an abort controller for the fetch with a 2.5s threshold
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => {
    if (!hasHandledPlayback) {
      hasHandledPlayback = true;
      controller.abort();
      speakWithBrowserSynth(cleanText, accent, onEnd, rate);
    }
  }, 2500);

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: cleanText, voice: voiceName }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error('TTS API not ready');
      return res.json();
    })
    .then((data) => {
      clearTimeout(fetchTimeout);
      if (hasHandledPlayback) return;
      hasHandledPlayback = true;

      if (data?.audio) {
        const audioSrc = `data:audio/wav;base64,${data.audio}`;
        clientAudioCache.set(cacheKey, audioSrc);

        const audio = new Audio(audioSrc);
        currentAudioElement = audio;
        if (rate && rate !== 0.92) {
          audio.playbackRate = rate / 0.92;
        }
        audio.onended = () => {
          currentAudioElement = null;
          if (onEnd) onEnd();
        };
        audio.onerror = () => {
          currentAudioElement = null;
          speakWithBrowserSynth(cleanText, accent, onEnd, rate);
        };
        audio.play().catch(() => {
          speakWithBrowserSynth(cleanText, accent, onEnd, rate);
        });
      } else {
        speakWithBrowserSynth(cleanText, accent, onEnd, rate);
      }
    })
    .catch(() => {
      clearTimeout(fetchTimeout);
      if (!hasHandledPlayback) {
        hasHandledPlayback = true;
        speakWithBrowserSynth(cleanText, accent, onEnd, rate);
      }
    });
}

export function stopSpeaking(): void {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}
