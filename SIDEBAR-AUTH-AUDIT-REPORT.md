# SIDEBAR-AUTH-AUDIT-REPORT

## Статус
Аудит **не выполнен**: не заданы `E2E_USER_EMAIL` и/или `E2E_USER_PASSWORD`.

## Как запустить локально
```powershell
$env:E2E_USER_EMAIL="you@example.com"
$env:E2E_USER_PASSWORD="your-password"
$env:BASE_URL="http://localhost:3000"  # опционально
npx playwright test e2e/sidebar-auth-audit.spec.ts --project=chromium
```

После успешного прогона появятся:
- `test-results/sidebar-auth/auth-state.json`
- `test-results/sidebar-auth/screenshots/...`
