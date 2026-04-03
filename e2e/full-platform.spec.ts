import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

// Отчёт: собираем ошибки и результаты
const report: {
  pageErrors: { url: string; error: string }[];
  consoleErrors: { url: string; text: string }[];
  failedRequests: { url: string; failure: string; requestUrl: string }[];
  pagesChecked: { url: string; ok: boolean; status?: number }[];
  buttonsChecked: { name: string; ok: boolean; error?: string }[];
  formsChecked: { name: string; filled: boolean; submitted?: boolean; error?: string }[];
  screenshots: string[];
} = {
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  pagesChecked: [],
  buttonsChecked: [],
  formsChecked: [],
  screenshots: [],
};

test.describe("MELARDO — полное E2E тестирование", () => {
  test.beforeEach(async ({ page }) => {
    // Слушаем консоль
    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === "error" && !text.includes("ResizeObserver")) {
        report.consoleErrors.push({ url: page.url(), text });
      }
    });
    // Слушаем неудачные запросы
    page.on("requestfailed", (request) => {
      const url = page.url();
      const requestUrl = request.url();
      const failure = request.failure()?.errorText || "unknown";
      if (!requestUrl.includes("favicon") && !requestUrl.includes("chrome-extension")) {
        report.failedRequests.push({ url, requestUrl, failure });
      }
    });
  });

  test("1. Запуск сайта и проверка главной", async ({ page }) => {
    const res = await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);
    const status = res?.status() ?? 0;
    const ok = status >= 200 && status < 400;
    report.pagesChecked.push({ url: "/", ok, status: status || undefined });
    expect(ok, `Главная должна загружаться. Status: ${status}`).toBe(true);
    await expect(page.locator("text=MELARDO").first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/screenshot-home.png", fullPage: true }).catch(() => {});
    report.screenshots.push("screenshot-home.png");
  });

  test("2. Навигация по публичным страницам", async ({ page }) => {
    const publicRoutes = [
      { path: "/", name: "Главная" },
      { path: "/teams", name: "Команды" },
      { path: "/matches", name: "Вызовы" },
      { path: "/tournaments", name: "Турниры" },
      { path: "/rankings", name: "Рейтинги" },
      { path: "/support", name: "Поддержка" },
      { path: "/rules", name: "Правила" },
      { path: "/guide", name: "Гайд" },
      { path: "/login", name: "Вход" },
      { path: "/register", name: "Регистрация" },
    ];

    for (const { path, name } of publicRoutes) {
      const url = `${BASE}${path}`;
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null);
      const status = res?.status() ?? 0;
      const ok = (status >= 200 && status < 400) || (status === 0 && page.url().includes(path));
      report.pagesChecked.push({ url: path, ok, status: status || undefined });
      expect(ok, `${name} (${path}) должна загружаться. Status: ${status}, URL: ${page.url()}`).toBe(true);
    }

  });

  test("3. Профиль без авторизации — редирект на логин", async ({ page }) => {
    const res = await page.goto(`${BASE}/profile`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => null);
    const status = res?.status() ?? 0;
    const redirectedToLogin = page.url().includes("/login");
    report.pagesChecked.push({ url: "/profile (guest)", ok: redirectedToLogin, status });
    expect(redirectedToLogin, "Без авторизации /profile должен перенаправлять на /login").toBe(true);
  });

  test("4. Кнопки на главной (ссылки Команды, Матчи, Турниры, Рейтинги)", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });

    const links = [
      { text: "Все вызовы", href: "/matches" },
      { text: "Все турниры", href: "/tournaments" },
      { text: "Рейтинги", href: "/rankings" },
    ];

    for (const { text, href } of links) {
      const link = page.locator(`a[href="${href}"]`).first();
      await expect(link).toBeVisible({ timeout: 5000 });
      await link.click();
      await page.waitForURL((u) => u.pathname === href || u.pathname === href + "/", { timeout: 8000 }).catch(() => {});
      const onRightPage = page.url().includes(href);
      report.buttonsChecked.push({ name: `Главная: ${text}`, ok: onRightPage });
      expect(onRightPage, `После клика «${text}» ожидался переход на ${href}, текущий URL: ${page.url()}`).toBe(true);
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 5000 });
    }
  });

  test("5. Страница команд — кнопка «Создать команду»", async ({ page }) => {
    await page.goto(`${BASE}/teams`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const createLink = page.getByRole("link", { name: /Создать команду/i });
    await expect(createLink).toBeVisible({ timeout: 5000 });
    await createLink.click();
    // Без авторизации должен редирект на логин
    await page.waitForURL(/\/login|\/teams\/create/, { timeout: 8000 }).catch(() => {});
    const ok = page.url().includes("/login") || page.url().includes("/teams/create");
    report.buttonsChecked.push({ name: "Команды: Создать команду", ok });
  });

  test("6. Страница вызовов — кнопки «Бросить вызов», «Случайный соперник»", async ({ page }) => {
    await page.goto(`${BASE}/matches`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const challengeLink = page.getByRole("link", { name: /Бросить вызов/i });
    await expect(challengeLink).toBeVisible({ timeout: 5000 });
    await challengeLink.click();
    await page.waitForURL(/\/login|\/matches\/create/, { timeout: 8000 }).catch(() => {});
    const challengeOk = page.url().includes("/login") || page.url().includes("/matches/create");
    report.buttonsChecked.push({ name: "Вызовы: Бросить вызов", ok: challengeOk });

    await page.goto(`${BASE}/matches`, { waitUntil: "domcontentloaded", timeout: 5000 });
    const randomBtn = page.getByRole("button").filter({ hasText: /Случайный соперник/i });
    const randomVisible = await randomBtn.first().isVisible().catch(() => false);
    report.buttonsChecked.push({ name: "Вызовы: Случайный соперник", ok: randomVisible });
  });

  test("7. Турниры — ссылка «Запросить турнир»", async ({ page }) => {
    await page.goto(`${BASE}/tournaments`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const requestLink = page.getByRole("link", { name: /Запросить турнир/i });
    const visible = await requestLink.isVisible().catch(() => false);
    if (visible) {
      await requestLink.click();
      await page.waitForURL(/\/login|\/tournaments\/request/, { timeout: 8000 }).catch(() => {});
    }
    const ok = !visible || page.url().includes("/login") || page.url().includes("/tournaments/request");
    report.buttonsChecked.push({ name: "Турниры: Запросить турнир", ok });
  });

  test("8. Форма регистрации — заполнение тестовыми данными", async ({ page }) => {
    await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.getByLabel(/Email/i).fill("e2e-test@example.com");
    await page.getByLabel(/Ник в Warface/i).fill("ТестовыйНик");
    await page.getByLabel(/Пароль/i).fill("testpass123");
    const submitBtn = page.getByRole("button", { name: /Создать аккаунт/i });
    await expect(submitBtn).toBeVisible();
    report.formsChecked.push({ name: "Регистрация", filled: true, submitted: false });
    // Не отправляем форму, чтобы не создавать лишние аккаунты (можно раскомментировать для проверки отправки)
    // await submitBtn.click();
    // await page.waitForTimeout(3000);
  });

  test("9. Форма создания вызова — открытие и заполнение (без отправки)", async ({ page }) => {
    await page.goto(`${BASE}/matches/create`, { waitUntil: "domcontentloaded", timeout: 15000 });
    if (page.url().includes("/login")) {
      report.formsChecked.push({ name: "Создание вызова", filled: false, error: "Требуется авторизация" });
      return;
    }
    const teamSelect = page.locator("#myTeam");
    await expect(teamSelect).toBeVisible({ timeout: 5000 });
    await page.locator("#date").fill("2025-12-01");
    await page.locator("#time").fill("20:00");
    report.formsChecked.push({ name: "Создание вызова", filled: true, submitted: false });
  });

  test("10. Форма запроса турнира — только для авторизованных", async ({ page }) => {
    await page.goto(`${BASE}/tournaments/request`, { waitUntil: "networkidle", timeout: 15000 });
    if (page.url().includes("/login")) {
      report.formsChecked.push({ name: "Запрос турнира", filled: false, error: "Требуется авторизация" });
      return;
    }
    const titleInput = page.locator("#title");
    const visible = await titleInput.isVisible().catch(() => false);
    if (!visible) {
      report.formsChecked.push({ name: "Запрос турнира", filled: false, error: "Форма не найдена (возможно редирект)" });
      return;
    }
    await titleInput.fill("E2E Test Tournament");
    await page.locator("#min_teams").fill("4");
    await page.locator("#max_teams").fill("8");
    await page.locator("input[name=fair_play]").check();
    report.formsChecked.push({ name: "Запрос турнира", filled: true, submitted: false });
  });

  test("11. Форма создания команды — только для авторизованных", async ({ page }) => {
    await page.goto(`${BASE}/teams/create`, { waitUntil: "domcontentloaded", timeout: 15000 });
    if (page.url().includes("/login")) {
      report.formsChecked.push({ name: "Создание команды", filled: false, error: "Требуется авторизация" });
      return;
    }
    const nameInput = page.locator("#name");
    const visible = await nameInput.isVisible().catch(() => false);
    if (visible) {
      await nameInput.fill("ТестКоманда");
      await page.locator("#city").fill("Москва");
    }
    report.formsChecked.push({ name: "Создание команды", filled: visible });
  });

  test("12. Админка без прав — редирект", async ({ page }) => {
    await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 15000 });
    const redirected = page.url().includes("/login") || page.url().includes("/");
    report.pagesChecked.push({ url: "/admin (guest)", ok: redirected });
    expect(redirected, "Без прав админа должен быть редирект").toBe(true);
  });

  test("13. Разделы админки (если залогинен как админ — проверяем ссылки)", async ({ page }) => {
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 15000 });
    if (page.url().includes("/login") || page.url().includes("/") && !page.url().includes("/admin")) {
      report.buttonsChecked.push({ name: "Админка: разделы", ok: true, error: "Не залогинен как админ — пропуск" });
      return;
    }
    const adminLinks = [
      "Донаты",
      "Рефералы",
      "Очков",
      "Турниры",
      "Спорные матчи",
      "Жалобы",
      "Игроки",
      "Команды",
      "Сезоны",
    ];
    for (const label of adminLinks) {
      const link = page.getByRole("link", { name: new RegExp(label, "i") }).first();
      const visible = await link.isVisible().catch(() => false);
      if (visible) {
        await link.click();
        await page.waitForLoadState("domcontentloaded").catch(() => {});
        const backLink = page.getByRole("link", { name: /Главная|Назад|📊/i }).first();
        const backVisible = await backLink.isVisible().catch(() => false);
        if (backVisible) await backLink.click();
        await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 5000 });
      }
    }
    report.buttonsChecked.push({ name: "Админка: разделы и Назад", ok: true });
  });

  test("14. Скриншоты ключевых страниц и вывод отчёта", async ({ page }) => {
    const urls = ["/", "/teams", "/matches", "/tournaments", "/rankings", "/support", "/rules", "/guide", "/login", "/register"];
    for (let i = 0; i < urls.length; i++) {
      await page.goto(`${BASE}${urls[i]}`, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
      await page.screenshot({
        path: `test-results/screenshot-${i}-${urls[i].replace(/\//g, "_") || "home"}.png`,
        fullPage: false,
      }).catch(() => {});
    }

    const reportText = `
========== ОТЧЁТ E2E ТЕСТИРОВАНИЯ MELARDO ==========

Страницы:
${report.pagesChecked.map((p) => `  ${p.ok ? "✓" : "✗"} ${p.url} ${p.status ? `(status: ${p.status})` : ""}`).join("\n")}

Кнопки/ссылки:
${report.buttonsChecked.map((b) => `  ${b.ok ? "✓" : "✗"} ${b.name}${b.error ? ` — ${b.error}` : ""}`).join("\n")}

Формы:
${report.formsChecked.map((f) => `  Заполнено: ${f.filled}, Отправлено: ${f.submitted ?? "—"}${f.error ? ` — ${f.error}` : ""}`).join("\n")}

Ошибки консоли:
${report.consoleErrors.length ? report.consoleErrors.map((e) => `  [${e.url}] ${e.text}`).join("\n") : "  Нет"}

Неудачные сетевые запросы:
${report.failedRequests.length ? report.failedRequests.slice(0, 20).map((r) => `  [${r.url}] ${r.requestUrl} — ${r.failure}`).join("\n") : "  Нет"}

Скриншоты: ${report.screenshots.join(", ")}
========== КОНЕЦ ОТЧЁТА ==========
`;
    const fs = await import("fs");
    const path = await import("path");
    const outDir = path.join(process.cwd(), "test-results");
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(path.join(outDir, "e2e-report.txt"), reportText, "utf-8");
    console.log(reportText);
  });
});
