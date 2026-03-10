"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const TOPICS = [
  "Проблема с матчем",
  "Жалоба на игрока",
  "Оплата/Донаты",
  "Техническая проблема",
  "Сотрудничество",
  "Другое",
] as const;

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user: u } }) => setUser(u ?? null));
  }, []);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Укажите имя";
    if (!email.trim()) next.email = "Укажите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Некорректный email";
    if (!topic) next.topic = "Выберите тему";
    if (!message.trim()) next.message = "Напишите сообщение";
    if (file && file.size > MAX_FILE_SIZE)
      next.file = "Файл не должен превышать 5 МБ";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || sending) return;

    setSending(true);
    setErrors({});

    try {
      let attachmentPath: string | null = null;
      if (file && user) {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "";
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("support")
          .upload(path, file, { upsert: false });
        if (uploadError) {
          setErrors({ file: "Не удалось загрузить файл. Попробуйте ещё раз." });
          setSending(false);
          return;
        }
        attachmentPath = path;
      }

      const res = await fetch("/api/support/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          message: message.trim(),
          ...(attachmentPath && { attachment_path: attachmentPath }),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ form: (data as { error?: string }).error || "Ошибка отправки" });
        setSending(false);
        return;
      }

      setSent(true);
      setName("");
      setEmail("");
      setTopic("");
      setMessage("");
      setFile(null);
    } catch {
      setErrors({ form: "Ошибка отправки. Попробуйте позже." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. ЗАГОЛОВОК */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl tracking-[0.18em] text-white [font-family:var(--font-display-primary)]">
          ПОДДЕРЖКА MELARDO WARFACE
        </h1>
        <p className="mt-2 text-sm text-[#B0B8C5]">
          Если у вас возникли проблемы, вопросы или предложения — свяжитесь с нами.
        </p>
      </div>

      {/* 2. КОНТАКТЫ */}
      <div className="grid gap-4 sm:grid-cols-3">
        <a
          href="mailto:melardo.warface@mail.ru"
          className="card-surface flex items-center gap-4 p-5 transition-colors hover:border-[#F97316]"
        >
          <span className="text-2xl">📧</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#E5E7EB] [font-family:var(--font-display-primary)]">
              Эл. почта
            </div>
            <div className="text-sm text-[#B0B8C5]">melardo.warface@mail.ru</div>
          </div>
        </a>
        <a
          href="https://t.me/melardo_warface"
          target="_blank"
          rel="noreferrer"
          className="card-surface flex items-center gap-4 p-5 transition-colors hover:border-[#F97316]"
        >
          <span className="text-2xl">💬</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#E5E7EB] [font-family:var(--font-display-primary)]">
              Telegram-канал
            </div>
            <div className="text-sm text-[#B0B8C5]">t.me/melardo_warface</div>
          </div>
        </a>
        <a
          href="https://t.me/+xFhbpMORFhdhNGRi"
          target="_blank"
          rel="noreferrer"
          className="card-surface flex items-center gap-4 p-5 transition-colors hover:border-[#F97316]"
        >
          <span className="text-2xl">🗣️</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#E5E7EB] [font-family:var(--font-display-primary)]">
              Чат игроков
            </div>
            <div className="text-sm text-[#B0B8C5]">Telegram</div>
          </div>
        </a>
      </div>

      {/* 3. СРОЧНАЯ ПОМОЩЬ */}
      <div className="card-surface p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-[0.12em] text-white [font-family:var(--font-display-primary)]">
          🚨 СРОЧНАЯ ПОМОЩЬ
        </h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[#2A2F3A] bg-[#0f141b] p-4">
            <h3 className="text-sm font-semibold text-[#E5E7EB]">Проблемы с оплатой</h3>
            <p className="mt-1 text-sm text-[#B0B8C5]">
              Если платёж прошёл, но очки не начислились — укажите в комментарии ник
              или название команды и дату платежа. Напишите на{" "}
              <a href="mailto:melardo.warface@mail.ru" className="text-[#F97316] hover:underline">
                melardo.warface@mail.ru
              </a>{" "}
              или через форму ниже.
            </p>
          </div>
          <div className="rounded-xl border border-[#2A2F3A] bg-[#0f141b] p-4">
            <h3 className="text-sm font-semibold text-[#E5E7EB]">Сайт не работает</h3>
            <p className="mt-1 text-sm text-[#B0B8C5]">
              Опишите, что именно не открывается или выдаёт ошибку. Напишите в{" "}
              <a href="https://t.me/melardo_warface" target="_blank" rel="noreferrer" className="text-[#F97316] hover:underline">
                Telegram-канал
              </a>{" "}
              или на эл. почту.
            </p>
          </div>
          <div className="rounded-xl border border-[#2A2F3A] bg-[#0f141b] p-4">
            <h3 className="text-sm font-semibold text-[#E5E7EB]">Блокировка аккаунта</h3>
            <p className="mt-1 text-sm text-[#B0B8C5]">
              Если считаете блокировку ошибочной — подайте обращение через форму
              ниже с темой «Другое» или напишите на{" "}
              <a href="mailto:melardo.warface@mail.ru" className="text-[#F97316] hover:underline">
                melardo.warface@mail.ru
              </a>
              . Укажите ваш ник и суть ситуации.
            </p>
          </div>
        </div>
      </div>

      {/* 4. ФОРМА ОБРАТНОЙ СВЯЗИ */}
      <div className="card-surface p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-[0.12em] text-white [font-family:var(--font-display-primary)]">
          ФОРМА ОБРАТНОЙ СВЯЗИ
        </h2>

        {sent ? (
          <p className="mt-6 rounded-lg bg-[#0f141b] p-4 text-sm text-[#10b981]">
            Спасибо! Мы ответим вам в ближайшее время.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {errors.form && (
              <p className="text-sm text-[#ef4444]">{errors.form}</p>
            )}

            <div>
              <label htmlFor="support-name" className="mb-1 block text-xs font-medium text-[#E5E7EB]">
                Имя <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="support-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#2A2F3A] bg-[#0f141b] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                placeholder="Ваше имя"
                suppressHydrationWarning
              />
              {errors.name && <p className="mt-1 text-xs text-[#ef4444]">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="support-email" className="mb-1 block text-xs font-medium text-[#E5E7EB]">
                Эл. почта <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#2A2F3A] bg-[#0f141b] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                placeholder="ваш@email.com"
                suppressHydrationWarning
              />
              {errors.email && <p className="mt-1 text-xs text-[#ef4444]">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="support-topic" className="mb-1 block text-xs font-medium text-[#E5E7EB]">
                Тема <span className="text-[#ef4444]">*</span>
              </label>
              <select
                id="support-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-lg border border-[#2A2F3A] bg-[#0f141b] px-3 py-2 text-sm text-white focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                suppressHydrationWarning
              >
                <option value="">— Выберите тему —</option>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.topic && <p className="mt-1 text-xs text-[#ef4444]">{errors.topic}</p>}
            </div>

            <div>
              <label htmlFor="support-message" className="mb-1 block text-xs font-medium text-[#E5E7EB]">
                Сообщение <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-[#2A2F3A] bg-[#0f141b] px-3 py-2 text-sm text-white placeholder-[#6b7280] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                placeholder="Опишите ваш вопрос или проблему..."
                suppressHydrationWarning
              />
              {errors.message && <p className="mt-1 text-xs text-[#ef4444]">{errors.message}</p>}
            </div>

            <div>
              <label htmlFor="support-file" className="mb-1 block text-xs font-medium text-[#E5E7EB]">
                Прикрепить файл (опционально, до 5 МБ)
              </label>
              <input
                id="support-file"
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-[#B0B8C5] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F97316] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black file:hover:bg-[#FDBA74]"
                suppressHydrationWarning
              />
              {errors.file && <p className="mt-1 text-xs text-[#ef4444]">{errors.file}</p>}
              {!user && (
                <p className="mt-1 text-xs text-[#6b7280]">
                  Чтобы прикрепить файл, войдите в аккаунт.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#FDBA74] disabled:opacity-50"
            >
              {sending ? "Отправка..." : "Отправить"}
            </button>
          </form>
        )}
      </div>

      {/* Донаты — краткая карточка */}
      <div className="card-surface p-6">
        <h2 className="text-base font-semibold tracking-[0.12em] text-white [font-family:var(--font-display-primary)]">
          💰 ПОДДЕРЖАТЬ ПРОЕКТ (ДОНАТЫ)
        </h2>
        <p className="mt-2 text-sm text-[#B0B8C5]">
          Донаты помогают развивать платформу. Игрок: 50₽ = 3 очка, команда: 50₽ = 1 очко.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href="https://pay.cloudtips.ru/p/eceb2434"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-black hover:bg-[#FDBA74]"
          >
            Поддержать как игрок
          </a>
          <a
            href="https://pay.cloudtips.ru/p/c9449598"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#2A2F3A] px-4 py-2 text-sm font-semibold text-[#E5E7EB] hover:border-[#F97316]"
          >
            Поддержать команду
          </a>
        </div>
      </div>
    </div>
  );
}