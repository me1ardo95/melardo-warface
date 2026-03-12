import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/app/actions/data";
import { AdminNav } from "../AdminNav";

type LogRow = {
  id: string;
  type: string;
  message: string;
  data: Record<string, unknown> | null;
  created_at: string;
};

async function getSystemLogs(limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_logs")
    .select("id, type, message, data, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as LogRow[];
}

export default async function AdminLogsPage() {
  const [profile, logs] = await Promise.all([
    getCurrentProfile(),
    getSystemLogs(),
  ]);
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen p-6">
      <AdminNav active="logs" />

      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Системные логи
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Критические ошибки и события платформы.
          </p>
        </div>

        {logs.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            Логов пока нет.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Время
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Тип
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Сообщение
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    Данные
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(log.created_at).toLocaleString("ru-RU")}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      {log.type}
                    </td>
                    <td className="px-4 py-2 text-neutral-900 dark:text-neutral-100">
                      {log.message}
                    </td>
                    <td className="px-4 py-2">
                      {log.data && Object.keys(log.data).length > 0 ? (
                        <pre className="max-w-md overflow-auto rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-800">
                          {JSON.stringify(log.data, null, 0)}
                        </pre>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
