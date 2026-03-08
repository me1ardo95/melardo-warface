import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOPICS = [
  "Проблема с матчем",
  "Жалоба на игрока",
  "Оплата/Донаты",
  "Техническая проблема",
  "Сотрудничество",
  "Другое",
];

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const {
      name,
      email,
      topic,
      message,
      attachment_path,
    } = body as {
      name?: string;
      email?: string;
      topic?: string;
      message?: string;
      attachment_path?: string;
    };

    const nameTrim = typeof name === "string" ? name.trim() : "";
    const emailTrim = typeof email === "string" ? email.trim() : "";
    const topicTrim = typeof topic === "string" ? topic.trim() : "";
    const messageTrim = typeof message === "string" ? message.trim() : "";

    if (!nameTrim) {
      return NextResponse.json(
        { error: "Укажите имя" },
        { status: 400 }
      );
    }
    if (!emailTrim) {
      return NextResponse.json(
        { error: "Укажите email" },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 }
      );
    }
    if (!topicTrim || !TOPICS.includes(topicTrim)) {
      return NextResponse.json(
        { error: "Выберите тему обращения" },
        { status: 400 }
      );
    }
    if (!messageTrim) {
      return NextResponse.json(
        { error: "Напишите сообщение" },
        { status: 400 }
      );
    }

    const attachmentUrl =
      typeof attachment_path === "string" && attachment_path.trim()
        ? attachment_path.trim()
        : null;

    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        user_id: user?.id ?? null,
        name: nameTrim,
        email: emailTrim,
        topic: topicTrim,
        message: messageTrim,
        attachment_url: attachmentUrl,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка сервера" },
      { status: 500 }
    );
  }
}
