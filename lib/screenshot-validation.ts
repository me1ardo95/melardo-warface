/**
 * Screenshot Validation
 * Проверки: размер, дубликаты, метаданные, Match ID в названии комнаты
 */

const MIN_SIZE = 10 * 1024; // 10 KB
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export type ScreenshotValidationResult = {
  valid: boolean;
  reason?: string;
};

export function validateScreenshotBasic(
  file: { size: number; type: string },
  matchLobbyCode: string | null
): ScreenshotValidationResult {
  if (file.size < MIN_SIZE) {
    return { valid: false, reason: "size_too_small" };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, reason: "size_too_large" };
  }
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { valid: false, reason: "invalid_type" };
  }
  return { valid: true };
}
