import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1️⃣ Обработка /register — ставим cookie и сразу возвращаем
  if (pathname === "/register" || pathname.startsWith("/register/")) {
    const ref = request.nextUrl.searchParams.get("ref");
    const response = NextResponse.next();

    if (ref?.trim()) {
      response.cookies.set("ref_code", ref.trim(), {
        httpOnly: false,
        path: "/",
        maxAge: THIRTY_DAYS_SEC,
        sameSite: "lax",
      });
    }

    // Возвращаем response сразу, без дальнейшей логики
    return response;
  }

  // 2️⃣ Асинхронная проверка Supabase для других страниц (например /admin)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Protect /admin routes: redirect unauthorized users to /login
    if (pathname.startsWith("/admin") && !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/register", "/register/:path*", "/admin/:path*"],
};
