// Audio synthesis utility using Web Speech API

let currentUtterance: SpeechSynthesisUtterance | null = null;

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

export function speakEnglish(text: string, accent: 'us' | 'uk' = 'us', onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported on this browser');
    if (onEnd) onEnd();
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
  utterance.rate = 0.92; // Slightly natural pace for language learners
  utterance.pitch = 1.0;

  // Try to find a high quality English voice
  const voices = window.speechSynthesis.getVoices();
  const targetLang = accent === 'uk' ? 'en-GB' : 'en-US';
  const naturalVoice = voices.find(
    (v) => (v.lang === targetLang || v.lang.startsWith(targetLang.slice(0, 2))) &&
           (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
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

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}
