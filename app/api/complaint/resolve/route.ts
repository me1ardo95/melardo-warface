import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { complaint_id, action } = body as {
      complaint_id?: string;
      action?: "accept" | "reject";
    };

    if (!complaint_id || typeof complaint_id !== "string") {
      return NextResponse.json(
        { error: "Не указан идентификатор жалобы" },
        { status: 400 }
      );
    }

    const newStatus = action === "accept" ? "resolved" : "dismissed";

    const { error } = await supabase
      .from("complaints")
      .update({ status: newStatus })
      .eq("id", complaint_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Внутренняя ошибка сервера",
      },
      { status: 500 }
    );
  }
}
