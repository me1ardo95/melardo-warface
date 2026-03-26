"use client";

type CopyConnectCodeButtonProps = {
  connectCode: string;
};

export function CopyConnectCodeButton({ connectCode }: CopyConnectCodeButtonProps) {
  return (
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
  );
}
