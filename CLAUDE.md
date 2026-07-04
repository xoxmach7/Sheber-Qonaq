# Memory — Sheber Qonaq

## Правила работы
- **Git-запись (add/commit/push) из sandbox ломается.** Папка на VirtioFS — та же проблема, что у atelier erp: `.git/index.lock` и `.git/packed-refs.lock` зависают с `Operation not permitted`, git-команды из sandbox либо фейлятся, либо портят репозиторий. **Все git-операции — только из терминала пользователя (PowerShell на Windows).**
- Локальный git-клон в sandbox не считать источником истины по веткам/коммитам — он может быть устаревшим или битым. Для проверки состояния GitHub использовать `https://api.github.com/repos/xoxmach7/Sheber-Qonaq/...` напрямую (репозиторий публичный, токен не нужен и его нельзя присылать в чат).
- В репозитории включён (или должен быть включён) `git config core.autocrlf input` — до этого каждый чекаут на Windows молча конвертировал LF→CRLF и создавал огромный "шумовой" diff по всем файлам. Если видите diff на сотни файлов с почти равным числом +/- строк — это шум CRLF, проверять через `git diff -w`.

## Проект
**Sheber Qonaq** — учёт заездов/бронирования для хостелов (не путать с Atelier ERP / Sheber — это другой, шторный проект).
Репо: https://github.com/xoxmach7/Sheber-Qonaq.git
Ветка по умолчанию: `main`
GitHub: включено (похоже) автоудаление веток после мёржа PR — старые `work/*` ветки исчезают сами после мёржа.

## Стек
| Слой | Технология |
|------|-----------|
| Backend | Django + DRF |
| Frontend | React (Vite, TypeScript) |
| Deploy | Railway (Dockerfile, `start.sh`), + Vercel (i-hostel, sheber-demo, sheber-qonaq превью) |
| CI | GitHub Actions — backend (`pytest`), frontend (`tsc --noEmit`) |

## Аудит безопасности — 2026-07-03/04

### Было (на момент прошлого аудита, `AUDIT_FIXES.md`, 2026-07-01)
Фиксы были **написаны локально, но не закоммичены** — на GitHub `main` до 2026-07-03 всё ещё висели небезопасные дефолты:
- `SECRET_KEY` default `'django-insecure-change-me-in-production'`
- `DEBUG=True` по умолчанию
- `ALLOWED_HOSTS='*'`
- `CORS_ALLOW_ALL_ORIGINS=True`

### Сделано 2026-07-03 — PR #36 смёржен в main
- `config/settings/base.py`: безопасные дефолты (SECRET_KEY без хардкода, DEBUG=False, ALLOWED_HOSTS/CORS закрыты по умолчанию)
- `.env.example`: комментарии по настройке для prod
- `frontend/src/api/client.ts`: обработка 401 / ошибок соединения с уведомлением пользователю
- Рефакторинг: `frontend/src/lib/{dates,toast,constants}.ts` — убрано дублирование кода Occupancy/Stays, магические числа вынесены в константы
- Тесты: 54/54 pytest прошли и локально, и в CI; `tsc --noEmit` чистый
- CI на PR #36: 6/6 чеков зелёные (backend pytest, frontend tsc, 3× Vercel deploy, no unresolved feedback)

### `config/settings/production.py` — уже было ОК
- `DEBUG=False`, `SECRET_KEY` обязателен из env (без дефолта) — падает при отсутствии, это правильно
- `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_PROXY_SSL_HEADER` настроены

### 🔲 Остаётся (не сделано, рекомендации на будущее)
- **Нет rate limiting нигде** — `REST_FRAMEWORK` в `base.py` не содержит `DEFAULT_THROTTLE_CLASSES`, эндпоинт логина (`apps/users/jwt_auth.py`, `CaseInsensitiveTokenObtainPairView`) ничем не защищён от брутфорса
- `production.py`: `ALLOWED_HOSTS` дефолтится в `'*'`, `CORS_ALLOW_ALL_ORIGINS=True` если забыть выставить `FRONTEND_URL` в Railway — защита есть, но zависит от того, что переменную окружения не забудут проставить
- Нет Sentry/логирования ошибок
- Нет Content-Security-Policy headers
- Мало unit-тестов на критическую бизнес-логику (общее число тестов небольшое — 54 на весь проект)

## Git-хозяйство — чистка веток 2026-07-04
На момент аудита было ~30 веток `work/*`/`fix/*`, почти все уже смёржены в main (`ahead_by: 0` через GitHub compare API), просто не удалены. Почищено вручную через GitHub UI (`/branches`), включая:
`feature/cottage-mode`, `work/feat-0628-1025`, `work/feat-0628-2134`, `work/feat-0629-1841`, `work/feat-0629-1658`, `work/ui-0629-1109`, `work/brand-1-5x-topbar-0628-2310`.
Правило на будущее: ветка безопасна к удалению, если на странице `/branches` или в `compare/main...branch` значение **Ahead = 0** (весь её код уже в main).

## .gitignore / гигиена репозитория
`.env`, `db.sqlite3`, `db.sqlite3-journal`, `db_check.sqlite3` — не в git, всё верно, руки не трогать.
