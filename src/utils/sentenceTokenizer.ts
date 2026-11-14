import { WordTokenAnalysis, SentenceAnalysisResult } from '../types/card';

// Common grammatical words to classify automatically
const FUNCTION_WORDS: Record<string, { pos: string; meaning: string; ipa: string }> = {
  the: { pos: 'art.', meaning: '定冠词 (这/那)', ipa: '/ðə/' },
  a: { pos: 'art.', meaning: '不定冠词 (一个)', ipa: '/ə/' },
  an: { pos: 'art.', meaning: '不定冠词 (一个)', ipa: '/æn/' },
  and: { pos: 'conj.', meaning: '和，并且', ipa: '/ænd/' },
  but: { pos: 'conj.', meaning: '但是，然而', ipa: '/bʌt/' },
  or: { pos: 'conj.', meaning: '或者', ipa: '/ɔːr/' },
  in: { pos: 'prep.', meaning: '在...里面/在...期间', ipa: '/ɪn/' },
  on: { pos: 'prep.', meaning: '在...之上/关于', ipa: '/ɑːn/' },
  at: { pos: 'prep.', meaning: '在(某处/某时间)', ipa: '/æt/' },
  to: { pos: 'prep./inf.', meaning: '到，向 / 不定式标记', ipa: '/tuː/' },
  for: { pos: 'prep.', meaning: '为了，长达，因为', ipa: '/fɔːr/' },
  with: { pos: 'prep.', meaning: '和...一起，用，随着', ipa: '/wɪð/' },
  of: { pos: 'prep.', meaning: '...的', ipa: '/əv/' },
  by: { pos: 'prep.', meaning: '通过，被，在...旁', ipa: '/baɪ/' },
  from: { pos: 'prep.', meaning: '来自，从', ipa: '/frʌm/' },
  about: { pos: 'prep./adv.', meaning: '关于，大约', ipa: '/əˈbaʊt/' },
  it: { pos: 'pron.', meaning: '它 (代词/形式主语)', ipa: '/ɪt/' },
  this: { pos: 'pron./adj.', meaning: '这，这个', ipa: '/ðɪs/' },
  that: { pos: 'pron./conj.', meaning: '那 / 引导词', ipa: '/ðæt/' },
  we: { pos: 'pron.', meaning: '我们 (主格)', ipa: '/wiː/' },
  us: { pos: 'pron.', meaning: '我们 (宾格)', ipa: '/ʌs/' },
  our: { pos: 'pron.', meaning: '我们的 (物主代词)', ipa: '/ˈaʊər/' },
  you: { pos: 'pron.', meaning: '你 / 你们', ipa: '/juː/' },
  they: { pos: 'pron.', meaning: '他们 / 她们', ipa: '/ðeɪ/' },
  them: { pos: 'pron.', meaning: '他们 (宾格)', ipa: '/ðem/' },
  is: { pos: 'v.', meaning: '是 (第三人称单数)', ipa: '/ɪz/' },
  are: { pos: 'v.', meaning: '是 (复数/第二人称)', ipa: '/ɑːr/' },
  was: { pos: 'v.', meaning: '是/在 (过去式)', ipa: '/wʌz/' },
  were: { pos: 'v.', meaning: '是/在 (过去式复数)', ipa: '/wɜːr/' },
  have: { pos: 'v./aux.', meaning: '有 / 助动词', ipa: '/hæv/' },
  has: { pos: 'v./aux.', meaning: '有 (单三) / 助动词', ipa: '/hæz/' },
  had: { pos: 'v./aux.', meaning: '有 (过去式) / 助动词', ipa: '/hæd/' },
  will: { pos: 'aux.', meaning: '将要，愿意', ipa: '/wɪl/' },
  can: { pos: 'aux.', meaning: '能，可以', ipa: '/kæn/' },
  could: { pos: 'aux.', meaning: '能够，可以 (过去式/委婉)', ipa: '/kʊd/' },
  should: { pos: 'aux.', meaning: '应该，应当', ipa: '/ʃʊd/' },
  would: { pos: 'aux.', meaning: '将，会 (虚拟/过去)', ipa: '/wʊd/' },
  let: { pos: 'v.', meaning: '让，允许', ipa: '/let/' },
  not: { pos: 'adv.', meaning: '不，否定', ipa: '/nɑːt/' },
  so: { pos: 'adv./conj.', meaning: '所以，那么，如此', ipa: '/soʊ/' },
};

/**
 * Rapid client-side tokenization of an English sentence into interactive words
 */
export function tokenizeSentenceInstant(
  sentence: string,
  targetExpression?: string
): WordTokenAnalysis[] {
  if (!sentence) return [];

  // Match words, including hyphenated or contracted words
  const rawTokens = sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
  const targetLower = (targetExpression || '').toLowerCase();

  return rawTokens.map((rawWord) => {
    const cleanLower = rawWord.toLowerCase();
    const isTarget = targetLower ? targetLower.includes(cleanLower) : false;
    const known = FUNCTION_WORDS[cleanLower];

    return {
      word: rawWord,
      lemma: cleanLower,
      phonetic: known?.ipa || '',
      partOfSpeech: known?.pos || (rawWord.endsWith('ing') ? 'v.-ing / n.' : rawWord.endsWith('ed') ? 'v.-ed / adj.' : 'word'),
      meaning: known?.meaning || '点击查看深度释义与语法...',
      isTarget,
    };
  });
}

export interface SentenceSegment {
  text: string;
  isWord: boolean;
  cleanWord?: string;
  isTarget?: boolean;
}

/**
 * Splits a full sentence into alternating words and punctuations/spaces
 * so the sentence can be rendered naturally with clickable words.
 */
export function splitSentenceTokens(
  sentence: string,
  targetExpression?: string
): SentenceSegment[] {
  if (!sentence) return [];

  const targetLower = (targetExpression || '').toLowerCase();
  // Regex to match words (letters with apostrophes or hyphens) vs non-words
  const regex = /([A-Za-z]+(?:'[A-Za-z]+)?)|([^A-Za-z]+)/g;
  const segments: SentenceSegment[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sentence)) !== null) {
    if (match[1]) {
      const cleanWord = match[1];
      const isTarget = targetLower ? targetLower.includes(cleanWord.toLowerCase()) : false;
      segments.push({
        text: match[1],
        isWord: true,
        cleanWord,
        isTarget,
      });
    } else if (match[2]) {
      segments.push({
        text: match[2],
        isWord: false,
      });
    }
  }

  return segments;
}
