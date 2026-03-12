/**
 * Trust Score System
 * 0-100, начальное 80
 * +1 за завершённый матч без спора
 * -10 за спор
 * -30 за подтверждённое мошенничество
 * +5 за 10 честных матчей подряд
 */

export const TRUST_SCORE_INITIAL = 80;
export const TRUST_SCORE_MIN = 0;
export const TRUST_SCORE_MAX = 100;
export const TRUST_SCORE_MIN_FOR_CHALLENGE = 40;

export const TRUST_DELTA = {
  COMPLETED_NO_DISPUTE: 1,
  DISPUTE: -10,
  CONFIRMED_CHEATING: -30,
  HONEST_STREAK_10: 5,
} as const;

export const HONEST_STREAK_THRESHOLD = 10;

export function clampTrustScore(score: number): number {
  return Math.max(TRUST_SCORE_MIN, Math.min(TRUST_SCORE_MAX, Math.round(score)));
}
