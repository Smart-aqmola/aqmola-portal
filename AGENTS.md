<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aqmola portal — правила проекта

- Бриф и решения: `docs/brief.md`. План этапов: `docs/plan.md`. Основа дизайна: `design/variants/1-panorama.html`.
- Стек: Next.js App Router, TypeScript strict, CSS Modules + токены, pnpm. Без внешних API: данные только через репозитории в `src/features/*/data`.
- Структура: `src/features/<feature>/{domain,data,ui}`, общее — `src/shared`. Зависимости: `ui` → `domain` ← `data`.
- Все пользовательские строки — через словари ru/kk/en. Все данные тестовые, без реальных персональных данных.
- Перед сдачей этапа: `pnpm check` (format, lint, typecheck, test, build), для интерфейса ещё `pnpm test:e2e` и просмотр на 375 и 1280 px.
- Новые пакеты — только после согласования с пользователем.
