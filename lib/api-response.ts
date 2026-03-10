import { NextResponse } from "next/server";

/** Единый формат ошибки API */
export function apiError(
  message: string,
  status: number = 400
): NextResponse<{ success: false; error: string }> {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

/** Успешный ответ */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
