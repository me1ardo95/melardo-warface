/**
 * Валидация по правилам Warface и фильтр нецензурных слов.
 * Используется на клиенте и на сервере.
 */

// —— Ник в Warface: только русские буквы (а-я, А-Я, ё), цифры, _ - .
export const WARFACE_NICK_REGEX = /^[а-яА-ЯёЁ0-9_.\-]+$/;
export const WARFACE_NICK_MIN = 3;
export const WARFACE_NICK_MAX = 16;

// —— Название команды: только русские буквы, цифры, пробелы
export const TEAM_NAME_REGEX = /^[а-яА-ЯёЁ0-9\s]+$/;
export const TEAM_NAME_MIN = 3;
export const TEAM_NAME_MAX = 20;

export const WARFACE_NICK_FORMAT_ERROR =
  "Ник должен содержать только русские буквы, цифры и символы _ - .";
export const WARFACE_NICK_LENGTH_ERROR = "Длина ника от 3 до 16 символов";
export const WARFACE_NICK_TAKEN_ERROR = "Такой ник уже занят";

export const TEAM_NAME_FORMAT_ERROR =
  "Название команды должно содержать только русские буквы, цифры и пробелы";
export const TEAM_NAME_LENGTH_ERROR = "Длина названия от 3 до 20 символов";
export const TEAM_NAME_BANNED_ERROR =
  "Название команды содержит недопустимые слова";

/**
 * Запрещённые корни/слова (проверка без учёта регистра и как подстрока).
 */
const BANNED_ROOTS = [
  "бля",
  "бляд",
  "хуй",
  "хуя",
  "хуе",
  "пизд",
  "еба",
  "ебё",
  "ёба",
  "ёб",
  "ебу",
  "ебл",
  "муда",
  "муди",
  "муде",
  "мудо",
  "сука",
  "суки",
  "сучк",
  "гандон",
  "гондон",
  "долбо",
  "залуп",
  "мраз",
  "падл",
  "педик",
  "педераст",
  "срать",
  "сран",
  "дерьм",
  "говн",
  "шлюх",
  "шлюш",
  "выбляд",
  "уеб",
  "пидор",
  "пидар",
  "педри",
  "хер ",
  " хер",
  "херо",
  "хери",
];

/**
 * Проверяет ник в Warface: формат и длина.
 */
export function validateWarfaceNick(
  value: string
): { valid: true } | { valid: false; error: string } {
  const trimmed = value.trim();
  if (trimmed.length < WARFACE_NICK_MIN || trimmed.length > WARFACE_NICK_MAX) {
    return { valid: false, error: WARFACE_NICK_LENGTH_ERROR };
  }
  if (!WARFACE_NICK_REGEX.test(trimmed)) {
    return { valid: false, error: WARFACE_NICK_FORMAT_ERROR };
  }
  return { valid: true };
}

/**
 * Проверяет название команды: формат и длина.
 */
export function validateTeamName(
  value: string
): { valid: true } | { valid: false; error: string } {
  const trimmed = value.trim();
  if (trimmed.length < TEAM_NAME_MIN || trimmed.length > TEAM_NAME_MAX) {
    return { valid: false, error: TEAM_NAME_LENGTH_ERROR };
  }
  if (!TEAM_NAME_REGEX.test(trimmed)) {
    return { valid: false, error: TEAM_NAME_FORMAT_ERROR };
  }
  return { valid: true };
}

/**
 * Проверяет текст на наличие запрещённых слов (корней).
 * Без учёта регистра, совпадение по подстроке.
 */
export function containsBannedWords(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return BANNED_ROOTS.some((root) => lower.includes(root.toLowerCase()));
}

/**
 * Полная проверка названия команды: формат, длина и запрещённые слова.
 */
export function validateTeamNameFull(
  value: string
): { valid: true } | { valid: false; error: string } {
  const formatCheck = validateTeamName(value);
  if (!formatCheck.valid) return formatCheck;
  const trimmed = value.trim();
  if (containsBannedWords(trimmed)) {
    return { valid: false, error: TEAM_NAME_BANNED_ERROR };
  }
  return { valid: true };
}
