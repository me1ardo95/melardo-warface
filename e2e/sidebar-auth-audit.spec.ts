/**
 * Authenticated dashboard shell audit (diagnostic only).
 *
 * Требования:
 * - E2E_USER_EMAIL, E2E_USER_PASSWORD — рабочий аккаунт в локальном Supabase.
 * - BASE_URL (опционально), по умолчанию http://localhost:3000
 *
 * Скриншоты: test-results/sidebar-auth/screenshots/
 * Storage state: test-results/sidebar-auth/auth-state.json (секреты — в .gitignore)
 * Отчёт: SIDEBAR-AUTH-AUDIT-REPORT.md
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const email = process.env.E2E_USER_EMAIL ?? "";
const password = process.env.E2E_USER_PASSWORD ?? "";

const authDir = path.join("test-results", "sidebar-auth");
const authStatePath = path.join(authDir, "auth-state.json");
const shotsRoot = path.join(authDir, "screenshots");
const reportPath = path.join("SIDEBAR-AUTH-AUDIT-REPORT.md");

const routes = [
  { path: "/profile", name: "Профиль" },
  { path: "/teams", name: "Команды" },
  { path: "/matches", name: "Вызовы" },
  { path: "/tournaments", name: "Турниры" },
  { path: "/referral", name: "Реферал" },
  { path: "/support", name: "Поддержка" },
  { path: "/admin", name: "Админ" },
  { path: "/admin/players", name: "Админ: игроки" },
  { path: "/admin/tournaments", name: "Админ: турниры" },
] as const;

const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 },
] as const;

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function safeSlug(p: string) {
  if (p === "/") return "root";
  return p.replace(/\//g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
}

type CollectedMetrics = {
  finalUrl: string;
  status: number | null;
  pathname: string;
  /** Desktop: видимый aside dashboard (InternalSidebarLayout) */
  dashboardAsideVisible: boolean;
  dashboardAsideWidth: number | null;
  mainLeft: number | null;
  mainWidth: number | null;
  /** Навигация внутри <main> с типичными ссылками «старый» top bar */
  mainNavDuplicatePattern: boolean;
  mainNavCount: number;
  /** Есть ли в main горизонтальный nav с «Команды»+«Профиль» */
  pageLevelNavTeamsProfile: boolean;
  /** AdminNav / верхняя полоса админки */
  adminNavLikeInMain: boolean;
  horizontalOverflow: boolean;
  sidebarScrollOverflow: boolean;
  activeLinkInDashboardAside: boolean;
  /** Текст первого main nav для отчёта */
  mainNavSnippet: string;
};

test.describe("SIDEBAR auth audit (diagnostic)", () => {
  test.describe.configure({ timeout: 300000 });

  test("login via UI → save storageState → audit routes (desktop + mobile)", async ({
    browser,
  }) => {
    if (!email || !password) {
      ensureDir(authDir);
      const stub = [
        "# SIDEBAR-AUTH-AUDIT-REPORT",
        "",
        "## Статус",
        "Аудит **не выполнен**: не заданы `E2E_USER_EMAIL` и/или `E2E_USER_PASSWORD`.",
        "",
        "## Как запустить локально",
        "```powershell",
        "$env:E2E_USER_EMAIL=\"you@example.com\"",
        "$env:E2E_USER_PASSWORD=\"your-password\"",
        "$env:BASE_URL=\"http://localhost:3000\"  # опционально",
        "npx playwright test e2e/sidebar-auth-audit.spec.ts --project=chromium",
        "```",
        "",
        "После успешного прогона появятся:",
        "- `test-results/sidebar-auth/auth-state.json`",
        "- `test-results/sidebar-auth/screenshots/...`",
        "",
      ].join("\n");
      fs.writeFileSync(reportPath, stub, "utf-8");
      throw new Error(
        "Задайте переменные окружения E2E_USER_EMAIL и E2E_USER_PASSWORD для логина через UI."
      );
    }

    ensureDir(authDir);
    ensureDir(shotsRoot);

    // --- Login ---
    const loginCtx = await browser.newContext({ baseURL });
    const loginPage = await loginCtx.newPage();
    await loginPage.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    await loginPage.locator("#email").fill(email);
    await loginPage.locator("#password").fill(password);
    await loginPage.getByRole("button", { name: /^Войти$/ }).click();

    await loginPage
      .waitForURL((u) => !u.pathname.includes("/login"), { timeout: 25000 })
      .catch(() => {});

    const afterLogin = loginPage.url();
    if (afterLogin.includes("/login")) {
      const errText = await loginPage.locator("p.text-sm").first().textContent().catch(() => "");
      await loginCtx.close();
      throw new Error(
        `Логин не удалось завершить (остались на /login). Сообщение: ${errText || "нет"}`
      );
    }

    await loginCtx.storageState({ path: authStatePath });
    await loginCtx.close();

    type Row = {
      viewport: string;
      route: string;
      name: string;
      screenshotInitial: string;
      screenshotCollapsed?: string;
      screenshotDrawerOpen?: string;
      metrics: CollectedMetrics;
    };

    const rows: Row[] = [];

    for (const vp of viewports) {
      const ctx = await browser.newContext({
        baseURL,
        viewport: { width: vp.width, height: vp.height },
        storageState: authStatePath,
      });
      const page = await ctx.newPage();

      for (const r of routes) {
        const slug = safeSlug(r.path);
        const dir = path.join(shotsRoot, vp.name, slug);
        ensureDir(dir);

        let status: number | null = null;
        try {
          const res = await page.goto(r.path, { waitUntil: "domcontentloaded", timeout: 25000 });
          status = res?.status() ?? null;
        } catch {
          status = null;
        }
        await page.waitForTimeout(800).catch(() => {});

        const shotInitial = path.join(dir, "initial.png");
        await page.screenshot({ path: shotInitial, fullPage: false }).catch(() => {});

        let shotCollapsed: string | undefined;
        if (vp.name === "desktop") {
          const toggle = page.getByRole("button", {
            name: /Свернуть меню|Развернуть меню/,
          });
          if (await toggle.first().isVisible().catch(() => false)) {
            await toggle.first().click().catch(() => {});
            await page.waitForTimeout(400).catch(() => {});
            shotCollapsed = path.join(dir, "after-sidebar-toggle.png");
            await page.screenshot({ path: shotCollapsed, fullPage: false }).catch(() => {});
          }
        }

        let shotDrawer: string | undefined;
        if (vp.name === "mobile") {
          const hamburger = page.getByRole("button", { name: /Открыть меню/i }).first();
          if (await hamburger.isVisible().catch(() => false)) {
            await hamburger.click().catch(() => {});
            await page.waitForTimeout(600).catch(() => {});
            shotDrawer = path.join(dir, "drawer-open.png");
            await page.screenshot({ path: shotDrawer, fullPage: false }).catch(() => {});
          }
        }

        const metrics = (await page.evaluate(() => {
          const mainEl = document.querySelector("main");
          const mainBox = mainEl ? (mainEl as HTMLElement).getBoundingClientRect() : null;

          const asides = Array.from(document.querySelectorAll("aside"));
          let dashboardAside: HTMLElement | null = null;
          let dashboardAsideWidth: number | null = null;
          for (const a of asides) {
            const el = a as HTMLElement;
            const cs = window.getComputedStyle(el);
            if (cs.display !== "none" && el.offsetWidth >= 60) {
              dashboardAside = el;
              dashboardAsideWidth = el.getBoundingClientRect().width;
              break;
            }
          }

          const mainNavs = Array.from(document.querySelectorAll("main nav"));
          const mainNavSnippet =
            mainNavs[0]?.innerText?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "";

          const pageLevelNavTeamsProfile = mainNavs.some((n) => {
            const t = n.innerText ?? "";
            return t.includes("Команды") && t.includes("Профиль");
          });

          const adminNavLikeInMain = mainNavs.some((n) => {
            const t = n.innerText ?? "";
            return (
              (t.includes("Админ") || t.includes("admin")) &&
              (t.includes("Турнир") || t.includes("Игрок") || t.includes("Донат"))
            );
          });

          const horizontalOverflow =
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 30;

          const sidebarScrollOverflow = asides.some(
            (a) => (a as HTMLElement).scrollHeight > (a as HTMLElement).clientHeight + 2
          );

          const asideLinks = dashboardAside
            ? Array.from(dashboardAside.querySelectorAll("a"))
            : [];
          const currentPath = window.location.pathname;
          const activeLinkInDashboardAside = asideLinks.some((a) => {
            const href = a.getAttribute("href") || "";
            const cls = (a as HTMLElement).className || "";
            const matchPath =
              href === currentPath ||
              (currentPath.startsWith(href + "/") && href.length > 1);
            const looksActive =
              typeof cls === "string" &&
              (cls.includes("F97316") ||
                cls.includes("ring-[#F97316]") ||
                cls.includes("border-[#F97316]"));
            return matchPath && looksActive;
          });

          return {
            finalUrl: window.location.href,
            pathname: window.location.pathname,
            dashboardAsideVisible: !!dashboardAside && dashboardAsideWidth !== null,
            dashboardAsideWidth,
            mainLeft: mainBox ? mainBox.left : null,
            mainWidth: mainBox ? mainBox.width : null,
            mainNavDuplicatePattern: pageLevelNavTeamsProfile,
            mainNavCount: mainNavs.length,
            pageLevelNavTeamsProfile,
            adminNavLikeInMain,
            horizontalOverflow,
            sidebarScrollOverflow,
            activeLinkInDashboardAside,
            mainNavSnippet,
          };
        })) as Omit<CollectedMetrics, "status">;

        const fullMetrics: CollectedMetrics = { ...metrics, status };

        rows.push({
          viewport: vp.name,
          route: r.path,
          name: r.name,
          screenshotInitial: shotInitial,
          screenshotCollapsed: shotCollapsed,
          screenshotDrawerOpen: shotDrawer,
          metrics: fullMetrics,
        });

        await page.waitForTimeout(150).catch(() => {});
      }

      await ctx.close();
    }

    // --- Markdown report ---
    const rel = (abs: string) => path.relative(process.cwd(), abs).replace(/\\/g, "/");

    const duplicateRoutes = rows.filter(
      (x) => x.metrics.pageLevelNavTeamsProfile && x.metrics.dashboardAsideVisible
    );
    const shellOk = rows.filter(
      (x) =>
        x.metrics.dashboardAsideVisible &&
        !x.metrics.pageLevelNavTeamsProfile &&
        x.viewport === "desktop"
    );
    const shellBroken = rows.filter(
      (x) =>
        (x.metrics.pageLevelNavTeamsProfile && x.metrics.dashboardAsideVisible) ||
        (x.metrics.dashboardAsideVisible &&
          x.metrics.mainLeft !== null &&
          x.metrics.dashboardAsideWidth !== null &&
          x.metrics.mainLeft < 8)
    );

    const lines: string[] = [];
    lines.push("# SIDEBAR-AUTH-AUDIT-REPORT");
    lines.push("");
    lines.push("Аудит выполнен в **залогиненном** состоянии (Playwright: логин через UI → `storageState`).");
    lines.push(`- База: \`${baseURL}\``);
    lines.push(`- Storage state: \`${rel(authStatePath)}\` (не коммитить)`);
    lines.push(`- Скриншоты: \`${rel(shotsRoot)}/\``);
    lines.push("");
    lines.push("## Учётные данные");
    lines.push("- Email брался из переменной окружения `E2E_USER_EMAIL` (значение в отчёт не выводится).");
    lines.push("");
    lines.push("## Проверенные маршруты (после входа)");
    for (const r of routes) {
      lines.push(`- \`${r.path}\` — ${r.name}`);
    }
    lines.push("");
    lines.push("## Редиректы / фактические URL");
    lines.push("| Viewport | Маршрут | Финальный URL | HTTP |");
    lines.push("|---|---|---|---|");
    for (const row of rows) {
      lines.push(
        `| ${row.viewport} | \`${row.route}\` | \`${row.metrics.finalUrl}\` | ${row.metrics.status ?? "?"} |`
      );
    }
    lines.push("");
    lines.push("## Дублирование навигации (dashboard sidebar + page-level `<main><nav>`)");
    lines.push(
      "Эвристика: внутри `<main>` есть `<nav>`, где одновременно встречаются «Команды» и «Профиль» (типичный старый горизонтальный бар)."
    );
    if (duplicateRoutes.length === 0) {
      lines.push("- **Не обнаружено** по этой эвристике ни на одном маршруте/viewport.");
    } else {
      for (const d of duplicateRoutes) {
        lines.push(
          `- **${d.viewport}** \`${d.route}\`: да — см. \`${rel(d.screenshotInitial)}\``
        );
      }
    }
    lines.push("");
    lines.push("## Shell выглядит согласованно (desktop, без дублирующего main-nav по эвристике)");
    const okPaths = [...new Set(shellOk.map((x) => x.route))];
    if (okPaths.length === 0) {
      lines.push("- Нет маршрутов, удовлетворяющих критерию.");
    } else {
      for (const p of okPaths) lines.push(`- \`${p}\``);
    }
    lines.push("");
    lines.push("## Shell выглядит проблемным (эвристика: дубль навигации или main слишком слева при видимом aside)");
    const badPaths = [...new Set(shellBroken.map((x) => `${x.viewport}:${x.route}`))];
    if (badPaths.length === 0) {
      lines.push("- По эвристике явных поломок не отмечено.");
    } else {
      for (const p of badPaths) lines.push(`- ${p}`);
    }
    lines.push("");
    lines.push("## Метрики по страницам");
    lines.push(
      "| Viewport | Путь | aside виден | ширина aside | main.left | main nav | дубль Команды+Профиль | active в aside | overflow X | scroll aside |"
    );
    lines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const row of rows) {
      const m = row.metrics;
      lines.push(
        `| ${row.viewport} | \`${row.route}\` | ${m.dashboardAsideVisible ? "да" : "нет"} | ${m.dashboardAsideWidth?.toFixed(0) ?? "—"} | ${m.mainLeft?.toFixed(0) ?? "—"} | ${m.mainNavCount} | ${m.pageLevelNavTeamsProfile ? "да" : "нет"} | ${m.activeLinkInDashboardAside ? "да" : "нет"} | ${m.horizontalOverflow ? "да" : "нет"} | ${m.sidebarScrollOverflow ? "да" : "нет"} |`
      );
    }
    lines.push("");
    lines.push("## Скриншоты");
    for (const row of rows) {
      lines.push(`### ${row.viewport} — \`${row.route}\``);
      lines.push(`- initial: [${rel(row.screenshotInitial)}](${rel(row.screenshotInitial)})`);
      if (row.screenshotCollapsed) {
        lines.push(
          `- после toggle sidebar: [${rel(row.screenshotCollapsed)}](${rel(row.screenshotCollapsed)})`
        );
      }
      if (row.screenshotDrawerOpen) {
        lines.push(
          `- drawer open: [${rel(row.screenshotDrawerOpen)}](${rel(row.screenshotDrawerOpen)})`
        );
      }
    }
    lines.push("");
    lines.push("## Файлы-источники дублирующей page-level навигации (по коду репозитория)");
    lines.push(
      "- `app/teams/page.tsx` — верхний `<nav>` с Главная/Профиль/Команды/Вызовы/Турниры/Рейтинги."
    );
    lines.push("- `app/referral/page.tsx` — верхний `<nav>` внутри страницы.");
    lines.push(
      "- `app/admin/page.tsx` — верхний `<nav>` + отдельно `AdminNav` (для `/admin` при доступе)."
    );
    lines.push(
      "- Прочие страницы с похожим паттерном (не все входили в список маршрутов): `app/rankings/page.tsx`, `app/dashboard/page.tsx`, `app/profile/edit/page.tsx`, …"
    );
    lines.push("");
    lines.push("## Collapse/expand и mobile drawer");
    lines.push(
      "- Desktop: на маршрутах с видимым `aside` выполнялся клик по кнопке «Свернуть меню» / «Развернуть меню» (если видна), скриншот `after-sidebar-toggle.png`."
    );
    lines.push(
      "- Mobile: попытка открыть drawer кнопкой «Открыть меню»; при успехе — `drawer-open.png`."
    );
    lines.push("");
    lines.push("## Public vs internal / admin vs user layout");
    lines.push(
      "- После логина `AppShell` для внутренних префиксов использует `InternalSidebarLayout` + `Sidebar` (см. `app/components/layout/AppShell.tsx`, `dashboardRouteMatcher.ts`)."
    );
    lines.push(
      "- Админ-маршруты попадают в ту же зону `admin` в matcher, но страницы `/admin*` дополнительно рендерят собственную навигацию (`AdminNav`, иногда верхний `<nav>`) — возможен **тройной** слой: sidebar shell + admin chrome + контент."
    );
    lines.push("");
    lines.push("## Приоритеты исправлений (только рекомендации, UI не менялись)");
    lines.push("### Critical");
    lines.push(
      "- Убрать или вынести page-level `<nav>` с маршрутов, которые уже внутри dashboard shell (`/teams`, `/referral`, `/admin` и т.д.)."
    );
    lines.push("- Согласовать единый верхний уровень навигации для админки vs пользовательского shell.");
    lines.push("### Important");
    lines.push("- Проверить отступы `main` относительно `--sidebar-width` на всех breakpoints.");
    lines.push("- Убедиться, что mobile drawer не перекрывает критичный контент без явного отступа.");
    lines.push("### Optional");
    lines.push("- Улучшить визуальную консистентность `AdminNav` и sidebar.");
    lines.push("");

    fs.writeFileSync(reportPath, lines.join("\n"), "utf-8");
    expect(fs.existsSync(reportPath)).toBeTruthy();
  });
});
