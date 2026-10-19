export interface Collocation {
  phrase: string;
  translation: string;
  note?: string;
}

export interface ExampleSentence {
  en: string;
  zh: string;
  scene: string;
}

export interface UserSentenceRecord {
  id: string;
  sentence: string;
  promptScenario?: string;
  score: number;
  status: 'perfect' | 'natural' | 'minor_slip' | 'needs_work';
  isGrammaticallyCorrect: boolean;
  isCollocationNatural: boolean;
  feedback: string;
  nativeAlternative: string;
  alternativeAnalysis: string;
  praisePoints?: string[];
  createdAt: string;
}

export type MasteryStage = 'new' | 'learning' | 'reviewing' | 'mastered';
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewHistoryItem {
  date: string;
  grade: ReviewGrade;
  previousInterval: number;
  newInterval: number;
}

export interface ExpressionCard {
  id: string;
  expression: string;
  phoneticUs: string;
  phoneticUk: string;
  partOfSpeech: string;
  chineseMeaning: string;
  englishDefinition?: string;
  register: string;
  level: string;
  nuance: string;
  collocations: Collocation[];
  examples: ExampleSentence[];
  memoryHook: string;
  sentencePrompt: string;
  sentenceScenarios?: string[];
  userSentences: UserSentenceRecord[];
  tags: string[];
  starred: boolean;
  createdAt: string;

  // SRS / Ebbinghaus fields
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: string; // ISO date string (YYYY-MM-DD)
  lastReviewedAt: string | null;
  reviewHistory: ReviewHistoryItem[];
  masteryStage: MasteryStage;
}

export interface SentenceEvaluationResult {
  score: number;
  status: 'perfect' | 'natural' | 'minor_slip' | 'needs_work';
  isGrammaticallyCorrect: boolean;
  isCollocationNatural: boolean;
  feedback: string;
  nativeAlternative: string;
  alternativeAnalysis: string;
  praisePoints?: string[];
}

export interface ComboScenario {
  scenarioTitle: string;
  scenarioCategory: string;
  scenarioDescription: string;
  thoughtStarter?: string;
  modelParagraph?: string;
}

export interface ComboExpressionFeedback {
  expression: string;
  isUsed: boolean;
  isNatural: boolean;
  comment: string;
}

export interface ComboEvaluationResult {
  overallScore: number;
  status: 'perfect' | 'natural' | 'minor_slip' | 'needs_work';
  isAllUsed: boolean;
  expressionFeedbacks: ComboExpressionFeedback[];
  cohesionAndFlow: string;
  nativeAlternative: string;
  alternativeAnalysis: string;
  praisePoints: string[];
}

export interface ComboPracticeRecord {
  id: string;
  expressions: string[];
  scenarioTitle: string;
  scenarioDescription: string;
  userParagraph: string;
  score: number;
  status: 'perfect' | 'natural' | 'minor_slip' | 'needs_work';
  nativeAlternative: string;
  alternativeAnalysis: string;
  createdAt: string;
}

