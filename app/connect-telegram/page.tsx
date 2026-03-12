import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ConnectTelegramPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Подключение Telegram
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Для подключения Telegram сначала авторизуйтесь на платформе.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const connectCode = user.id;
  const botLink = botUsername
    ? `https://t.me/${botUsername}?start=${encodeURIComponent(connectCode)}`
    : null;

  return (
    <div className="min-h-screen p-6">
      <nav className="mb-6 flex items-center gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Link
          href="/"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          Главная
        </Link>
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          Подключение Telegram
        </span>
      </nav>

      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Подключить Telegram
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Подключите Telegram, чтобы получать мгновенные уведомления о матчах,
            очереди быстрых матчей, изменении рейтинга доверия и важных событиях
            аккаунта.
          </p>

          <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
            <p>
              1. Нажмите кнопку{" "}
              <span className="font-medium">«Подключить Telegram»</span>.
            </p>
            <p className="mt-1">
              2. В открывшемся чате с ботом отправьте команду{" "}
              <code className="rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-white">
                /start {connectCode}
              </code>
              .
            </p>
            <p className="mt-1">
              3. Бот автоматически свяжет ваш Telegram с аккаунтом на платформе.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {botLink ? (
              <a
                href={botLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Подключить Telegram
              </a>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">
                Бот Telegram ещё не настроен. Добавьте переменную
                <code className="ml-1 rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-white">
                  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
                </code>
                .
              </p>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(connectCode);
                  // eslint-disable-next-line no-alert
                  alert("Код подключения скопирован в буфер обмена");
                } catch {
                  // eslint-disable-next-line no-alert
                  alert("Не удалось скопировать код. Скопируйте вручную.");
                }
              }}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              Скопировать код подключения
            </button>
          </div>

          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            Ваш код подключения (ID аккаунта):{" "}
            <code className="break-all rounded bg-neutral-900 px-1.5 py-0.5 text-[11px] text-white">
              {connectCode}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

