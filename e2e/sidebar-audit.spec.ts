import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

type ViewportSpec = { name: string; width: number; height: number };

type RouteSpec = {
  section: string;
  name: string;
  path: string;
};

type SidebarRect = { left: number; top: number; right: number; width: number } | null;

type AuditMetrics = {
  finalUrl: string;
  status: number | null;
  asideCount: number;
  navCount: number;
  headerCount: number;
  mainLeft: number | null;
  sidebarRect: SidebarRect;
  topNavMatchCount: number;
  horizontalOverflow: boolean;
  sidebarScrollOverflow: boolean;
  activeLinkPresent: boolean;
};

type AuditRecord = {
  viewport: string;
  route: RouteSpec;
  screenshotInitial: string;
  screenshotDrawerOpen?: string;
  metrics: AuditMetrics;
};

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

const viewports: ViewportSpec[] = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 },
];

const routes: RouteSpec[] = [
  // Публичные
  { section: "Публичные", name: "Главная", path: "/" },
  { section: "Публичные", name: "Вход", path: "/login" },
  { section: "Публичные", name: "Регистрация", path: "/register" },

  // Внутренние
  { section: "Внутренние", name: "Профиль", path: "/profile" },
  { section: "Внутренние", name: "Команды", path: "/teams" },
  { section: "Внутренние", name: "Вызовы", path: "/matches" },
  { section: "Внутренние", name: "Турниры", path: "/tournaments" },
  { section: "Внутренние", name: "Реферал", path: "/referral" },
  { section: "Внутренние", name: "Поддержка", path: "/support" },

  // Админка
  { section: "Админка", name: "Админ", path: "/admin" },
  { section: "Админка", name: "Админ: игроки", path: "/admin/players" },
  { section: "Админка", name: "Админ: турниры", path: "/admin/tournaments" },

  // Mobile (минимум /profile и /teams в mobile viewport)
];

function safeSlug(input: string) {
  const trimmed = input.replace(/[?#].*$/, "");
  if (trimmed === "/") return "root";
  return trimmed.replace(/\//g, "_").replace(/[^a-zA-Z0-9_\\-]/g, "");
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

test.describe("SIDEBAR / Layout audit (diagnostic)", () => {
  // Чтобы не упираться в дефолтный timeout Playwright (30s).
  test.describe.configure({ timeout: 180000 });

  const outRoot = path.join("test-results", "sidebar-audit");
  const shotsRoot = path.join(outRoot, "screenshots");
  ensureDir(shotsRoot);

  const records: AuditRecord[] = [];

  for (const viewport of viewports) {
    test(`audit routes in ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();

      for (const route of routes) {
        const url = `${baseURL}${route.path}`;
        const routeSlug = safeSlug(route.path);
        const viewportDir = path.join(shotsRoot, viewport.name, routeSlug);
        ensureDir(viewportDir);

        let responseStatus: number | null = null;
        try {
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
          responseStatus = res?.status() ?? null;
        } catch {
          responseStatus = null;
        }

        // Минимальная пауза: обычно DOMContentLoaded достаточно, но чуть-чуть подождём.
        await page.waitForTimeout(600).catch(() => {});

        const screenshotInitialPath = path.join(viewportDir, "initial.png");
        await page.screenshot({ path: screenshotInitialPath, fullPage: false }).catch(() => {});

        const metrics = (await page.evaluate(() => {
          const rectOf = (el: Element | null) => {
            if (!el) return null;
            const r = (el as HTMLElement).getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, width: r.width };
          };

          const main = document.querySelector("main");
          const mainBox = main ? (main as HTMLElement).getBoundingClientRect() : null;

          const sidebarLogo = document.querySelector(
            'svg[role="img"][aria-label="MELARDO"]'
          );
          const sidebarRect = rectOf(sidebarLogo);

          const asides = Array.from(document.querySelectorAll("aside"));
          const navs = Array.from(document.querySelectorAll("nav"));
          const headers = Array.from(document.querySelectorAll("header"));

          const topNavMatches = navs.filter((n) => {
            const t = n.innerText ?? "";
            return t.includes("Команды") && t.includes("Профиль");
          }).length;

          const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 30;
          const sidebarScrollOverflow = asides.some(
            (a) => (a as HTMLElement).scrollHeight > (a as HTMLElement).clientHeight + 2
          );

          const ariaCurrent = document.querySelector('[aria-current="page"]') !== null;

          // Rough “active state” heuristic:
          const currentPath = window.location.pathname;
          const activeHref = Array.from(document.querySelectorAll("a"))
            .some((a) => {
              const href = a.getAttribute("href") || "";
              const cls = a.className || "";
              return (
                href === currentPath &&
                typeof cls === "string" &&
                (cls.includes("F97316") || cls.includes("Fbbf24"))
              );
            });

          return {
            finalUrl: window.location.href,
            asideCount: asides.length,
            navCount: navs.length,
            headerCount: headers.length,
            mainLeft: mainBox ? mainBox.left : null,
            sidebarRect,
            topNavMatchCount: topNavMatches,
            horizontalOverflow,
            sidebarScrollOverflow,
            activeLinkPresent: ariaCurrent || activeHref,
          };
        })) as Omit<AuditMetrics, "status">;

        let drawerShotPath: string | undefined;
        if (viewport.name === "mobile" && (route.path === "/profile" || route.path === "/teams")) {
          // Mobile: если есть “hamburger” для нового sidebar, откроем и сделаем второй скрин.
          const candidate = path.join(viewportDir, "drawer-open.png");
          try {
            const btn = page.getByRole("button", { name: /Открыть меню/i }).first();
            if (await btn.isVisible().catch(() => false)) {
              await btn.click().catch(() => {});
              await page.waitForTimeout(600).catch(() => {});
              await page.screenshot({ path: candidate, fullPage: false }).catch(() => {});
              drawerShotPath = candidate;
            }
          } catch {
            // ignore
          }
        }

        const metricsWithStatus: AuditMetrics = { ...metrics, status: responseStatus };

        records.push({
          viewport: viewport.name,
          route,
          screenshotInitial: screenshotInitialPath,
          screenshotDrawerOpen: drawerShotPath,
          metrics: metricsWithStatus,
        });

        // Короткая пауза между страницами.
        await page.waitForTimeout(200).catch(() => {});
      }

      await context.close();
    });
  }

  test.afterAll(() => {
    const reportPath = path.join("SIDEBAR-AUDIT-REPORT.md");

    const grouped = new Map<string, AuditRecord[]>();
    for (const r of records) {
      const key = `${r.viewport}::${r.route.section}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    const duplicationNotes = [
      "Многие внутренние страницы содержат собственный верхний `<nav>` (например, `app/teams/page.tsx` и `app/admin/page.tsx`). При одновременной отрисовке бокового меню это даёт дублирование навигации.",
      "Для `zone=user|admin` используется `InternalSidebarLayout` (sidebar + контент со смещением), но сами страницы всё равно могут рендерить верхнюю навигацию `<nav>`, поэтому layout визуально выглядит как «наложение/двойной shell».",
      "Для случаев когда авторизация отсутствует, `AppShell` возвращает `SupabaseSidebarNav` (узкий sidebar) — и дублирование часто остаётся, потому что верхний `<nav>` в страницах не отключается.",
    ];

    const lines: string[] = [];
    lines.push(`# SIDEBAR-AUDIT-REPORT`);
    lines.push(``);
    lines.push(`Сгенерирован локально через Playwright.`);
    lines.push(`База: ${baseURL}`);
    lines.push(``);

    for (const [key, items] of grouped.entries()) {
      lines.push(`## ${key}`);
      for (const r of items) {
        const screenshotInitialRel = path
          .relative(process.cwd(), r.screenshotInitial)
          .replace(/\\/g, "/");
        const drawerRel = r.screenshotDrawerOpen
          ? path.relative(process.cwd(), r.screenshotDrawerOpen).replace(/\\/g, "/")
          : null;

        const duplicationLikely = !!(r.metrics.sidebarRect && r.metrics.topNavMatchCount > 0);
        const overlapLikely =
          r.metrics.sidebarRect && r.metrics.mainLeft !== null
            ? r.metrics.mainLeft < r.metrics.sidebarRect.right + 10
            : false;

        lines.push(`### ${r.route.name} (\`${r.route.path}\`)`);
        lines.push(`- URL: \`${r.metrics.finalUrl}\``);
        lines.push(`- Status: \`${r.metrics.status ?? "?"}\``);
        lines.push(
          `- Sidebar: ${r.metrics.sidebarRect ? `да (width≈${Math.round(r.metrics.sidebarRect.width)}px)` : "нет"}`
        );
        lines.push(`- Top-nav matches: \`${r.metrics.topNavMatchCount}\``);
        lines.push(`- Оверлап (по эвристике): \`${overlapLikely ? "да" : "нет"}\``);
        lines.push(`- Дублирование навигации: \`${duplicationLikely ? "да (вероятно)" : "не обнаружено"}\``);
        lines.push(`- Горизонтальный overflow: \`${r.metrics.horizontalOverflow ? "да" : "нет"}\``);
        lines.push(`- Sidebar scroll overflow: \`${r.metrics.sidebarScrollOverflow ? "да" : "нет"}\``);
        lines.push(`- Active state heuristic: \`${r.metrics.activeLinkPresent ? "есть/есть признаки" : "не обнаружено"}\``);

        lines.push(`- Скриншот (initial): [${screenshotInitialRel}](${screenshotInitialRel})`);
        if (drawerRel) {
          lines.push(`- Скриншот (drawer-open, mobile): [${drawerRel}](${drawerRel})`);
        }
      }

      lines.push(``);
    }

    lines.push(`## Что нужно исправлять дальше (приоритет)`);
    lines.push(`1. **Critical**`);
    lines.push(
      "   - Убрать дублирование навигации на внутренних/админ страницах (оставить либо верхний <nav>, либо боковую навигацию shell)."
    );
    lines.push(`   - Привести layout к единому “dashboard shell” (без визуального наложения/двойной навигации).`);
    lines.push(`2. **Important**`);
    lines.push(`   - Проверить смещения для разных viewport’ов (особенно mobile).`);
    lines.push(`   - Уточнить active state: обеспечить явное выделение текущего пункта в sidebar.`);
    lines.push(`3. **Nice to have**`);
    lines.push(`   - Консистентность стилей и читаемость sidebar (touch-friendly поведение, hover-зоны).`);

    lines.push(``);
    lines.push(`## Найденные причины дублирования (по коду + DOM эвристике)`);
    for (const n of duplicationNotes) lines.push(`- ${n}`);
    lines.push(``);

    fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");
    // eslint-disable-next-line no-console
    console.log(`[sidebar-audit] Saved report: ${reportPath}`);
    // eslint-disable-next-line no-console
    console.log(`[sidebar-audit] Screenshots folder: ${shotsRoot.replace(/\\/g, "/")}`);
  });
});

