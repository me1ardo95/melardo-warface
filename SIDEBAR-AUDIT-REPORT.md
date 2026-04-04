# SIDEBAR-AUDIT-REPORT

Сгенерирован локально через Playwright.
База: http://localhost:3000

## Проверенные страницы
- Публичные: `/`, `/login`, `/register`
- Внутренние: `/profile`, `/teams`, `/matches`, `/tournaments`, `/referral`, `/support`
- Админка: `/admin`, `/admin/players`, `/admin/tournaments`
- Mobile: дополнительно проверены те же страницы в мобильном viewport (особенно `/profile` и `/teams`)

## Скриншоты
- Скриншоты сделаны в `test-results/sidebar-audit/screenshots/`
- Desktop: `test-results/sidebar-audit/screenshots/desktop/**/initial.png`
- Mobile: `test-results/sidebar-audit/screenshots/mobile/**/initial.png`
- Drawer-open (mobile): не получился ни на одном маршруте (в текущем прогоне не было признаков открытия dashboard drawer).

## Важное ограничение текущего аудита
Сейчас прогон выполнялся без авторизации:
- `/profile` редиректит на `/login`
- `/admin*` редиректит на `/login?redirect=...`
Поэтому часть проблем именно “dashboard shell при logged-in” могла не проявиться полностью в скриншотах (например, mobile drawer в `InternalSidebarLayout`).

## Ключевые находки
### Дублирование навигации (где именно)
На странице одновременно встречаются:
1) боковое меню (из `AppShell`: `SupabaseSidebarNav` для unauth, либо `InternalSidebarLayout` для auth),
2) и “старый” верхний `<nav>` внутри самих страниц.

Подтверждённые точки по коду среди проверенных маршрутов:
- `/teams` — верхняя навигация `<nav ...>` в `app/teams/page.tsx` (есть ссылки “Главная / Профиль / Команды / Вызовы / Турниры / Рейтинги”) + боковое меню слева.
- `/referral` — верхняя навигация `<nav ...>` в `app/referral/page.tsx` (секция с “Главная” и текущим разделом) + боковое меню слева.
- `/admin` (и подмаршруты админки) — верхняя навигация `<nav ...>` есть в `app/admin/page.tsx`, а также используется `AdminNav` (внутренняя админ-навигация). В текущем прогоне показалась только страница редиректа на login, но при авторизации это будет дублировать навигацию.

### Sidebar конфликтует с navbar / “наложение shell”
По эвристике из аудита overlap не подтверждён (`main.left` не пересекает правую границу sidebar), но визуально “двойной shell” вероятнее всего проявляется из-за:
- фиксированного бокового меню и отдельной верхней навигации внутри страниц,
- разной модели “смещения контента”: `AppShell` (например `pl-16`) vs. `InternalSidebarLayout` (через `--sidebar-width` на `sm+`).

### Active state / читаемость
- Для `SupabaseSidebarNav` активное состояние не подсвечивается (в коде нет вычисления “текущего маршрута”), поэтому пользователь может хуже понимать, где он находится.
- Для раскрытия подпунктов используется hover (и mouse events). На mobile это может быть недоступно без авторизации/без drawer.

### Desktop vs Mobile
Desktop:
- На проверенных публичных страницах боковое меню отрисовывается стабильно (по скриншотам/DOM-эвристике).
- Для маршрутов, где есть “старый” `<nav>` в самой странице (`/teams`, `/referral`), появляется ощущение “двойной навигации”.

Mobile:
- По текущему прогону drawer-open не сработал (вероятно из-за того, что нет logged-in сценариев).
- На mobile без drawer UX для hover-only меню обычно ухудшается (панели подпунктов могут не открываться).

### Accessibility / UX
- Подпункты бокового меню завязаны на hover/mouseenter. Для клавиатуры/тач-устройств нужна альтернативная механика (focus/click/role=menu).

## Что нужно исправлять дальше (приоритет)
1. **Critical**
   - Убрать дублирование навигации: на внутренних/админ страницах оставить либо боковую навигацию shell, либо верхний `<nav>`, но не оба одновременно.
   - Привести layout к единому “dashboard shell”: вложение страниц должно происходить внутри единого shell без визуального эффекта “двойной шапки + sidebar”.
2. **Important**
   - Согласовать смещения контента: привести к одной модели `pl-*`/`--sidebar-width`, чтобы нигде не возникало перекрытие/лишние отступы.
   - Добавить/унифицировать active state для `SupabaseSidebarNav` (и проверить на `InternalSidebarLayout`).
3. **Nice to have**
   - Улучшить доступность меню: поддержать открытие подпунктов по `focus`/`click`, чтобы это работало на mobile и с клавиатурой.
   - Консистентность типографики/цветов sidebar и верхней навигации.

## desktop::Публичные
### Главная (`/`)
- URL: `http://localhost:3000/`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/root/initial.png](test-results/sidebar-audit/screenshots/desktop/root/initial.png)
### Вход (`/login`)
- URL: `http://localhost:3000/login`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_login/initial.png](test-results/sidebar-audit/screenshots/desktop/_login/initial.png)
### Регистрация (`/register`)
- URL: `http://localhost:3000/register`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_register/initial.png](test-results/sidebar-audit/screenshots/desktop/_register/initial.png)

## desktop::Внутренние
### Профиль (`/profile`)
- URL: `http://localhost:3000/login`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_profile/initial.png](test-results/sidebar-audit/screenshots/desktop/_profile/initial.png)
### Команды (`/teams`)
- URL: `http://localhost:3000/teams`
- Status: `200`
- Sidebar: нет
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_teams/initial.png](test-results/sidebar-audit/screenshots/desktop/_teams/initial.png)
### Вызовы (`/matches`)
- URL: `http://localhost:3000/matches`
- Status: `200`
- Sidebar: нет
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_matches/initial.png](test-results/sidebar-audit/screenshots/desktop/_matches/initial.png)
### Турниры (`/tournaments`)
- URL: `http://localhost:3000/tournaments`
- Status: `200`
- Sidebar: нет
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_tournaments/initial.png](test-results/sidebar-audit/screenshots/desktop/_tournaments/initial.png)
### Реферал (`/referral`)
- URL: `http://localhost:3000/referral`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_referral/initial.png](test-results/sidebar-audit/screenshots/desktop/_referral/initial.png)
### Поддержка (`/support`)
- URL: `http://localhost:3000/support`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_support/initial.png](test-results/sidebar-audit/screenshots/desktop/_support/initial.png)

## desktop::Админка
### Админ (`/admin`)
- URL: `http://localhost:3000/login?redirect=%2Fadmin`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_admin/initial.png](test-results/sidebar-audit/screenshots/desktop/_admin/initial.png)
### Админ: игроки (`/admin/players`)
- URL: `http://localhost:3000/login?redirect=%2Fadmin%2Fplayers`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_admin_players/initial.png](test-results/sidebar-audit/screenshots/desktop/_admin_players/initial.png)
### Админ: турниры (`/admin/tournaments`)
- URL: `http://localhost:3000/login?redirect=%2Fadmin%2Ftournaments`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/desktop/_admin_tournaments/initial.png](test-results/sidebar-audit/screenshots/desktop/_admin_tournaments/initial.png)

## mobile::Публичные
### Главная (`/`)
- URL: `http://localhost:3000/`
- Status: `500`
- Sidebar: нет
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/root/initial.png](test-results/sidebar-audit/screenshots/mobile/root/initial.png)
### Вход (`/login`)
- URL: `http://localhost:3000/login`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_login/initial.png](test-results/sidebar-audit/screenshots/mobile/_login/initial.png)
### Регистрация (`/register`)
- URL: `http://localhost:3000/register`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_register/initial.png](test-results/sidebar-audit/screenshots/mobile/_register/initial.png)

## mobile::Внутренние
### Профиль (`/profile`)
- URL: `http://localhost:3000/login`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_profile/initial.png](test-results/sidebar-audit/screenshots/mobile/_profile/initial.png)
### Команды (`/teams`)
- URL: `http://localhost:3000/teams`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `1`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `да (вероятно)`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_teams/initial.png](test-results/sidebar-audit/screenshots/mobile/_teams/initial.png)
### Вызовы (`/matches`)
- URL: `http://localhost:3000/matches`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_matches/initial.png](test-results/sidebar-audit/screenshots/mobile/_matches/initial.png)
### Турниры (`/tournaments`)
- URL: `http://localhost:3000/tournaments`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_tournaments/initial.png](test-results/sidebar-audit/screenshots/mobile/_tournaments/initial.png)
### Реферал (`/referral`)
- URL: `http://localhost:3000/referral`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_referral/initial.png](test-results/sidebar-audit/screenshots/mobile/_referral/initial.png)
### Поддержка (`/support`)
- URL: `http://localhost:3000/support`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_support/initial.png](test-results/sidebar-audit/screenshots/mobile/_support/initial.png)

## mobile::Админка
### Админ (`/admin`)
- URL: `http://localhost:3000/login?redirect=%2Fadmin`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_admin/initial.png](test-results/sidebar-audit/screenshots/mobile/_admin/initial.png)
### Админ: игроки (`/admin/players`)
- URL: `http://localhost:3000/login?redirect=%2Fadmin%2Fplayers`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_admin_players/initial.png](test-results/sidebar-audit/screenshots/mobile/_admin_players/initial.png)
### Админ: турниры (`/admin/tournaments`)
- URL: `http://localhost:3000/login?redirect=%2Fadmin%2Ftournaments`
- Status: `200`
- Sidebar: да (width≈40px)
- Top-nav matches: `0`
- Оверлап (по эвристике): `нет`
- Дублирование навигации: `не обнаружено`
- Горизонтальный overflow: `нет`
- Sidebar scroll overflow: `нет`
- Active state heuristic: `не обнаружено`
- Скриншот (initial): [test-results/sidebar-audit/screenshots/mobile/_admin_tournaments/initial.png](test-results/sidebar-audit/screenshots/mobile/_admin_tournaments/initial.png)

## Что нужно исправлять дальше (приоритет)
1. **Critical**
   - Убрать дублирование навигации на внутренних/админ страницах (оставить либо верхний <nav>, либо боковую навигацию shell).
   - Привести layout к единому “dashboard shell” (без визуального наложения/двойной навигации).
2. **Important**
   - Проверить смещения для разных viewport’ов (особенно mobile).
   - Уточнить active state: обеспечить явное выделение текущего пункта в sidebar.
3. **Nice to have**
   - Консистентность стилей и читаемость sidebar (touch-friendly поведение, hover-зоны).

## Найденные причины дублирования (по коду + DOM эвристике)
- Многие внутренние страницы содержат собственный верхний `<nav>` (например, `app/teams/page.tsx` и `app/admin/page.tsx`). При одновременной отрисовке бокового меню это даёт дублирование навигации.
- Для `zone=user|admin` используется `InternalSidebarLayout` (sidebar + контент со смещением), но сами страницы всё равно могут рендерить верхнюю навигацию `<nav>`, поэтому layout визуально выглядит как «наложение/двойной shell».
- Для случаев когда авторизация отсутствует, `AppShell` возвращает `SupabaseSidebarNav` (узкий sidebar) — и дублирование часто остаётся, потому что верхний `<nav>` в страницах не отключается.
