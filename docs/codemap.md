# Карта проекта

Обновлено: 2026-10-21. Нужна, чтобы быстро найти, где что лежит и как связано. Решения и причины — в [brief.md](brief.md), этапы — в [plan.md](plan.md), контракт данных для бэкенда — в [api-contract.md](api-contract.md), разбор образца — в [research/astana-kz.md](research/astana-kz.md), правила для разработчика — в [../AGENTS.md](../AGENTS.md).

## Что это за проект

Тестовый портал услуг Акмолинской области: русский и казахский (английский по адресу `/en` работает, но в переключателе не показывается), без сервера и базы данных, все данные и заявки вымышленные. Данные лежат в коде (`src/features/*/data`), заявки и сессия — в `localStorage` браузера. Стек: Next.js 16 (App Router, Cache Components), React 19, TypeScript strict, CSS Modules, pnpm.

## Слои и зависимости

```
страница (src/app/[lang]/…)
   └─ load-*.ts  собирает данные страницы на нужном языке
        └─ репозиторий (domain/repository.ts)  ← интерфейс
             └─ заглушка (data/stub-*-repository.ts)  ← тестовые данные
   └─ компоненты ui/  показывают данные
```

- `ui` → `domain` ← `data`. Страницы берут данные только через `load-*` и репозитории, не напрямую из `data`. Когда появится настоящий сервер, меняется только заглушка репозитория.
- `domain` не знает о React: чистые функции и типы (поиск, фильтры, статусы).
- Общее для всех фич — `src/shared`. Для кабинетов: стили `shared/ui/cabinet/`, хранилища записей `shared/lib/collection.ts`, проверки сохранённых данных `shared/lib/stored-data.ts`, номера `shared/lib/numbering.ts`, показ длинных списков частями `shared/ui/show-more/`, словарь для клиентских компонентов — только нужные разделы через `shared/i18n/pick-dictionary.ts`.

## Страницы (`src/app/[lang]/`, язык `ru` | `kk` | `en`)

| Адрес                             | Файл                       | Что показывает                                                                                 |
| --------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `/`                               | `page.tsx`                 | Hero, поиск, жизненные ситуации, новости, форма, анонсы                                        |
| `/services`                       | `services/page.tsx`        | Каталог: поиск, фильтры, категории, страницы                                                   |
| `/services/<slug>`                | `services/[slug]/page.tsx` | Карточка услуги: шаги, документы, справка                                                      |
| `/services/<slug>/apply`          | `services/[slug]/apply/`   | Мастер заявки из 4 шагов                                                                       |
| `/applications`, `/<номер>`       | `applications/…`           | Заявки жителя и страница заявки с историей                                                     |
| `/operator`, `/<номер>`           | `operator/…`               | Кабинет организации: заявки на услуги и смена статуса                                          |
| `/operator/contracts` и ещё шесть | `operator/…`               | Договоры, заявки по приборам, показания, обращения, платежи, календарь работ, журнал действий  |
| `/sign-in`                        | `sign-in/page.tsx`         | Вход по телефону и коду, заглушки eGov/ЭЦП, демо-профили                                       |
| `/contracts`                      | `contracts/page.tsx`       | Мои договоры по объектам, фильтр по статусу                                                    |
| `/contracts/new`                  | `contracts/new/page.tsx`   | Договор: выбор объекта, услуги и поставщика                                                    |
| `/contracts/<id>`                 | `contracts/[id]/page.tsx`  | Мастер заявления, затем статус, договор и история                                              |
| `/organizations`                  | `organizations/page.tsx`   | Организации по направлениям, где работают, ссылка на услуги                                    |
| `/events`, `/<slug>`              | `events/…`                 | Афиша: жанры, популярное, выходные, площадки, бесплатно; страница события с .ics               |
| `/surveys`, `/<slug>`             | `surveys/…`                | Опросы: категории, популярные, идут сейчас, завершённые; опрос с вкладками, ответом и итогами  |
| `/contacts`                       | `contacts/page.tsx`        | Контакты оператора, форма «Остались вопросы?», абонентские отделы поставщиков                  |
| `/situations`, `/<id>`            | `situations/…`             | Жизненные ситуации; страница ситуации по образцу astana.kz: категории, услуги, другие ситуации |
| `/help`                           | `help/page.tsx`            | Частые вопросы и ответы                                                                        |
| `/sign-up`                        | `sign-up/page.tsx`         | Регистрация жителя: данные, код из SMS (демо)                                                  |
| `/properties`                     | `properties/page.tsx`      | Мои объекты недвижимости со статусом подтверждения                                             |
| `/properties/new`                 | `properties/new/page.tsx`  | Добавление объекта: поиск адреса в справочнике, форма                                          |
| `/properties/<id>`                | `properties/[id]/page.tsx` | Объект: сведения, подтверждение, поставщики по адресу                                          |
| `/meters`                         | `meters/page.tsx`          | Мои счётчики: карточки приборов, добавление прибора                                            |
| `/meters/submit`                  | `meters/submit/`           | Передача показаний: проверки, фото, подтверждение                                              |
| `/meters/history`                 | `meters/history/`          | История показаний со статусами и комментарием поставщика                                       |
| `/meters/order/<вид>`             | `meters/order/[kind]/`     | Заявка: установка, замена, пломба, снятие, поверка, ремонт                                     |
| `/meters/requests`, `/<id>`       | `meters/requests/…`        | Заявки по счётчикам, карточка с историей и актом                                               |
| `/billing`                        | `billing/page.tsx`         | Начисления по объекту и месяцу, сводно или по поставщикам                                      |
| `/billing/receipt`                | `billing/receipt/`         | Единая квитанция, скачивание, прошлые месяцы                                                   |
| `/billing/pay`                    | `billing/pay/`             | Выбор услуг и способа, переход к платежу                                                       |
| `/billing/payments`, `/<id>`      | `billing/payments/…`       | История платежей, страница платежа и демо платёжного сервиса                                   |
| `/news`, `/<slug>`                | `news/…`                   | Новости: поиск, темы, вкладки                                                                  |
| `/tourism`, `/<slug>`             | `tourism/…`                | Места с фото                                                                                   |
| `/about`                          | `about/page.tsx`           | Города и районы                                                                                |
| `/design`                         | `design/page.tsx`          | Служебная страница с компонентами                                                              |
| (общий каркас)                    | `layout.tsx`               | Шапка, подвал, баннер «демо», тосты, шрифт                                                     |

## Фичи (`src/features/<фича>/`)

| Фича            | Что делает                                          | Главные файлы                                                                                                                                                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `catalog`       | Услуги, категории, ситуации, организации            | `domain/query-services.ts` (фильтры), `domain/search.ts` (поиск е/ё), `load-catalog.ts`, `data/services.ts`                                                                                                                                                                                                                                                                                |
| `applications`  | Демо-вход, заявки, статусы, оператор                | `domain/status.ts` (переходы), `domain/storage.ts` (хранилище), `ui/apply-wizard.tsx`, `ui/status-form.tsx`                                                                                                                                                                                                                                                                                |
| `account`       | Регистрация, вход по телефону, объекты недвижимости | `domain/profile.ts`, `domain/phone.ts`, `domain/iin.ts`, `domain/otp.ts` (демо-код 123456), `domain/property.ts` (проверка формы и правила подтверждения), `data/address-directory.ts` (тестовый справочник адресов), `domain/availability.ts` (какие услуги и поставщики есть по адресу), `ui/sign-up-form.tsx`, `ui/phone-sign-in.tsx`, `ui/property-form.tsx`, `ui/property-detail.tsx` |
| `meters`        | Счётчики, показания и заявки по приборам            | `domain/meter.ts` (прибор, проверка формы), `domain/reading.ts` (проверки показаний, статусы), `domain/meter-request.ts` (шесть форм, переходы, последствия закрытия), `ui/meters-area.tsx` (вход, меню из 10 частей), `ui/reading-form.tsx`, `ui/request-form.tsx`, `ui/request-detail.tsx`                                                                                               |
| `billing`       | Начисления, квитанция, платежи                      | `domain/charge.ts` (начисление, месяцы), `domain/payment.ts` (статусы, переходы, повторное уведомление, учёт оплаты), `domain/connected.ts` (поставщики объекта), `data/stub-charge-repository.ts` (тестовые суммы), `ui/billing-area.tsx`, `ui/pay-page.tsx`, `ui/payment-detail.tsx`                                                                                                     |
| `appeals`       | Обращения и жалобы                                  | `domain/appeal.ts` (темы, проверка формы, организация по адресу, статусы, переписка), `ui/appeal-form.tsx`, `ui/appeal-detail.tsx`                                                                                                                                                                                                                                                         |
| `registry`      | Единый реестр «Мои заявки»                          | `domain/registry.ts` (строка реестра, срок, фильтры), `ui/registry-items.ts` (как из каждого источника получить строку), `ui/requests-registry.tsx`                                                                                                                                                                                                                                        |
| `notifications` | Уведомления и колокольчик                           | `domain/notifications.ts` (что произошло, из историй других фич), `domain/read-state.ts` (до какого момента прочитано), `ui/use-notifications.ts`, `ui/notification-bell.tsx` (в шапке), `ui/notification-text.ts` (слова события)                                                                                                                                                         |
| `content`       | Новости, места, анонсы, фото                        | `data/news.ts`, `data/places.ts`, `data/photo-files.ts`, `domain/query-news.ts`, `load-news.ts`                                                                                                                                                                                                                                                                                            |
| `home`          | Блоки главной страницы                              | `load-home.ts`, `ui/rotating-words.tsx`, `ui/situation-services.tsx`, `ui/home-search.tsx`                                                                                                                                                                                                                                                                                                 |
| `favorites`     | Избранное в браузере                                | `domain/favorites.ts`, `ui/favorite-button.tsx`                                                                                                                                                                                                                                                                                                                                            |
| `display`       | Тема, высокий контраст, крупный шрифт               | `domain/settings.ts`, `ui/display-settings.tsx`                                                                                                                                                                                                                                                                                                                                            |

## Общее (`src/shared/`)

- `ui/` — переиспользуемые компоненты: `button`, `card`, `icon`, `breadcrumbs`, `site-header`, `site-footer`, `language-switcher`, `demo-banner`, `photo-credits`, `scroll-row` (ряд со стрелкой), `reveal` (появление при прокрутке), `skeleton` (заглушка загрузки), `toast` (короткие сообщения).
- `i18n/` — языки и словари. Тексты только в `i18n/dictionaries/{ru,kk,en}.json`; тест следит, чтобы ключи во всех языках совпадали. Казахский пока черновик.
- `styles/` — `tokens.css` (цвета, отступы, размеры, темы), `globals.css` (база, `reduced-motion`, класс `visually-hidden`).
- `lib/` — `local-store.ts` (чтение и запись `localStorage`), `use-hydrated.ts`.

## Состояние в браузере

| Ключ `localStorage`     | Что хранит                       | Где описан                                |
| ----------------------- | -------------------------------- | ----------------------------------------- |
| `aqmola:session`        | Демо-сессия (роль и организация) | `features/applications/domain/storage.ts` |
| `aqmola:applications`   | Заявки и история статусов        | `features/applications/domain/storage.ts` |
| `aqmola:profiles`       | Зарегистрированные жители        | `features/account/domain/storage.ts`      |
| `aqmola:properties`     | Объекты недвижимости жителей     | `features/account/domain/storage.ts`      |
| `aqmola:contracts`      | Заявления на договоры            | `features/contracts/domain/storage.ts`    |
| `aqmola:meters`         | Приборы учёта                    | `features/meters/domain/storage.ts`       |
| `aqmola:readings`       | Переданные показания             | `features/meters/domain/storage.ts`       |
| `aqmola:meter-requests` | Заявки по приборам               | `features/meters/domain/storage.ts`       |
| `aqmola:favorites`      | Избранные услуги                 | `features/favorites/domain/favorites.ts`  |
| `aqmola:display`        | Тема, контраст, крупный шрифт    | `features/display/domain/settings.ts`     |

Заявки живут только в браузере, поэтому оператор видит заявки жителя только из того же браузера.

## Фото

Семь тестовых фото лежат в `public/photos/` (копии Wikimedia Commons, CC BY-SA 4.0). Соответствие «файл на Commons → наш файл» — `features/content/data/photo-files.ts`, авторы — `public/photos/CREDITS.md`. Картинки идут через `next/image` (формат AVIF с запасным WebP). Перед запуском нужно заменить своими.

## Как проверять

| Команда         | Что делает                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm check`    | Формат, линтер, типы, юнит-тесты, сборка. Запускать перед каждым коммитом                       |
| `pnpm test:e2e` | Сценарии в браузере (собирает сайт и запускает на порту 3100)                                   |
| `pnpm perf`     | Скорость страниц: вес, LCP, CLS на «телефоне». Сначала `pnpm build`, потом `pnpm start -p 3200` |
| `pnpm dev`      | Сайт для разработки на `localhost:3000`                                                         |

Тесты лежат рядом с кодом (`*.test.ts(x)`, больше 110 файлов) и в `tests/e2e/` (по разделам, плюс `interface` и `scenarios` — сквозные сценарии ТЗ 21.2, описаны в [test-cases.md](test-cases.md)). Черновики форм: `shared/lib/use-draft-state.ts` (sessionStorage); страницы ошибок: `app/[lang]/error.tsx`, `not-found.tsx`, тексты в `shared/i18n/system-messages.ts`.

## Скорость (замер 2026-10-21, телефон 375 px, медленная сеть, процессор ×4 медленнее)

| Страница      | LCP до | LCP после | Вес до | Вес после |
| ------------- | ------ | --------- | ------ | --------- |
| `/ru`         | 1,84 с | 1,27 с    | 391 КБ | 350 КБ    |
| `/ru/news`    | 2,97 с | 1,68 с    | 554 КБ | 430 КБ    |
| `/ru/tourism` | 2,37 с | 1,22 с    | 519 КБ | 419 КБ    |

Что сделано: формат AVIF (вдвое меньше WebP), первая фото на странице грузится с высоким приоритетом, главное фото — через `preload`. Скачков вёрстки нет (CLS = 0), блокировки потока минимальны (TBT до 10 мс).

## Правила, которые важно помнить

- Минимальная ширина экрана — 375 px; проверять на 375 и 1280.
- Все бесконечные анимации — только внутри `@media (prefers-reduced-motion: no-preference)`: глобальное правило `reduce` не останавливает повторы.
- Сервер всегда отдаёт страницу полностью видимой: скрытие (`Reveal`) включается только после загрузки и только для блоков ниже первого экрана.
- Все пользовательские строки — через словари, без текста в компонентах.
- Новые пакеты — только после согласования.

## Ветки

`dev` — общая ветка, где проверяется весь фронт; в `main` попадает только проверенное, через pull request. CI (`.github/workflows/ci.yml`) работает на каждый push и pull request.
