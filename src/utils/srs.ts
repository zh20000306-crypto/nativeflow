import { ExpressionCard, ReviewGrade, MasteryStage, ReviewHistoryItem } from '../types/card';

// Format Date to YYYY-MM-DD
export function formatDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return formatDate();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0])) return formatDate();
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function isDue(nextReviewDate: string): boolean {
  const today = formatDate();
  return nextReviewDate <= today;
}

/**
 * Calculates next interval and ease factor based on SM-2 / Ebbinghaus intervals
 * Grades:
 * - 'again' (0): Failed recall -> Reset interval to 1 day, repetition to 0, easeFactor decreases
 * - 'hard' (1): Strained recall -> Interval grows slowly (1.2x), easeFactor slightly decreases
 * - 'good' (2): Standard successful recall -> Interval grows with ease factor (1 -> 3 -> 7 -> 15 -> 30...)
 * - 'easy' (3): Effortless recall -> Interval bonus (1.3x), easeFactor increases
 */
export function calculateNextReview(
  card: ExpressionCard,
  grade: ReviewGrade
): {
  intervalDays: number;
  repetition: number;
  easeFactor: number;
  nextReviewDate: string;
  masteryStage: MasteryStage;
} {
  let { repetition, intervalDays, easeFactor } = card;
  const today = formatDate();

  // Ensure baseline ease factor
  if (!easeFactor || easeFactor < 1.3) easeFactor = 2.5;

  let newInterval = 1;
  let newRepetition = repetition;
  let newEase = easeFactor;

  switch (grade) {
    case 'again':
      newRepetition = 0;
      newInterval = 1;
      newEase = Math.max(1.3, easeFactor - 0.2);
      break;

    case 'hard':
      newRepetition = Math.max(1, repetition);
      newInterval = Math.max(1, Math.round(intervalDays * 1.2));
      newEase = Math.max(1.3, easeFactor - 0.15);
      break;

    case 'good':
      if (repetition === 0) {
        newInterval = 1;
      } else if (repetition === 1) {
        newInterval = 3;
      } else if (repetition === 2) {
        newInterval = 7;
      } else {
        newInterval = Math.round(intervalDays * easeFactor);
      }
      newRepetition += 1;
      break;

    case 'easy':
      if (repetition === 0) {
        newInterval = 2;
      } else if (repetition === 1) {
        newInterval = 4;
      } else {
        newInterval = Math.round(intervalDays * easeFactor * 1.3);
      }
      newRepetition += 1;
      newEase = Math.min(3.0, easeFactor + 0.15);
      break;
  }

  // Derive mastery stage
  let masteryStage: MasteryStage = 'learning';
  if (newRepetition === 0) {
    masteryStage = 'learning';
  } else if (newInterval >= 21 || newRepetition >= 4) {
    masteryStage = 'mastered';
  } else if (newInterval >= 7) {
    masteryStage = 'reviewing';
  } else {
    masteryStage = 'learning';
  }

  const nextReviewDate = addDays(today, newInterval);

  return {
    intervalDays: newInterval,
    repetition: newRepetition,
    easeFactor: Number(newEase.toFixed(2)),
    nextReviewDate,
    masteryStage,
  };
}

export function updateCardWithReview(card: ExpressionCard, grade: ReviewGrade): ExpressionCard {
  const today = formatDate();
  const next = calculateNextReview(card, grade);

  const historyItem: ReviewHistoryItem = {
    date: today,
    grade,
    previousInterval: card.intervalDays,
    newInterval: next.intervalDays,
  };

  return {
    ...card,
    repetition: next.repetition,
    intervalDays: next.intervalDays,
    easeFactor: next.easeFactor,
    nextReviewDate: next.nextReviewDate,
    lastReviewedAt: today,
    masteryStage: next.masteryStage,
    reviewHistory: [...(card.reviewHistory || []), historyItem],
  };
}

export function getDueCards(cards: ExpressionCard[]): ExpressionCard[] {
  return cards.filter((c) => isDue(c.nextReviewDate));
}

export function getStats(cards: ExpressionCard[]) {
  const total = cards.length;
  const due = cards.filter((c) => isDue(c.nextReviewDate)).length;
  const mastered = cards.filter((c) => c.masteryStage === 'mastered').length;
  const reviewing = cards.filter((c) => c.masteryStage === 'reviewing').length;
  const learning = cards.filter((c) => c.masteryStage === 'learning' || c.masteryStage === 'new').length;
  const totalSentences = cards.reduce((acc, c) => acc + (c.userSentences?.length || 0), 0);

  return {
    total,
    due,
    mastered,
    reviewing,
    learning,
    totalSentences,
  };
}
