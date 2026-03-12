/**
 * Константы для системы матчей Warface
 */

export const WARFACE_MAPS = [
  "Стройка",
  "Крепость",
  "Убежище",
  "Депозит",
  "Руины",
  "Вилла",
  "Лаборатория",
  "Резиденция",
  "Мосты",
  "Мосты 2037",
  "Объект Д-17",
  "Пункт назначения",
  "Окраина",
  "Окраина 2.0",
  "Фабрика",
  "Галерея",
  "Дворец",
  "Пирамида",
  "Трейлерный парк",
  "Портовый город",
  "Антенна",
  "Переулки",
] as const;

export type WarfaceMap = (typeof WARFACE_MAPS)[number];

export const TEAM_SIZES = ["3x3", "4x4", "5x5", "6x6", "7x7", "8x8"] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export const FORMAT = "BO1";
export const ROUNDS = "6 раундов, овертайм включен";

/** Слова для Secret Phrase */
const SECRET_WORDS_1 = [
  "RED",
  "BLUE",
  "GOLD",
  "BLACK",
  "GREEN",
  "SILVER",
  "WHITE",
  "CRIMSON",
  "STEEL",
  "SHADOW",
];
const SECRET_WORDS_2 = [
  "FALCON",
  "TIGER",
  "PHANTOM",
  "WOLF",
  "EAGLE",
  "VIPER",
  "HAWK",
  "RAPTOR",
  "GHOST",
  "STRIKE",
];

/**
 * Генерирует Secret Phrase: два слова + число (1-99)
 * Пример: RED FALCON 91
 */
export function generateSecretPhrase(): string {
  const w1 = SECRET_WORDS_1[Math.floor(Math.random() * SECRET_WORDS_1.length)];
  const w2 = SECRET_WORDS_2[Math.floor(Math.random() * SECRET_WORDS_2.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${w1} ${w2} ${num}`;
}

/**
 * Нормализует Secret Phrase для сравнения (trim, uppercase)
 */
export function normalizeSecretPhrase(phrase: string): string {
  return phrase.trim().toUpperCase().replace(/\s+/g, " ");
}

export const MIN_RANK_MATCH = 26;
export const MIN_RANK_TOURNAMENT = 55;
export const PENALTY_POINTS = 50;
