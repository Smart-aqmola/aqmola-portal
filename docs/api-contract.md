# Контракт данных для бэкенда

Обновлено: 2026-10-21. Документ для бэкендера. Фронт сейчас работает на заглушках в браузере; когда появится сервер, страницы менять не придётся: достаточно подключить API под те же интерфейсы репозиториев (см. [codemap.md](codemap.md), раздел «Слои»).

Источник требований: техническое задание, номера пунктов в скобках. Всё, что помечено **«предложение»**, фронт придумал сам, бэкендер может изменить.

## Общие правила

- Адреса: префикс `/api/v1` (как в прототипе `~/Downloads/aqmola`, если он подойдёт).
- Формат: JSON, кодировка UTF-8. Даты — ISO 8601 в UTC (`2026-10-21T06:08:00Z`). Суммы — целое число тенге в минимальных единицах (тиын) или строка с двумя знаками; выбрать одно и держать везде.
- Языки: `ru`, `kk`. Текст, который показывается пользователю, приходит в обоих языках, если он есть. Английский не поддерживается (решение 2026-10-21).
- Идентификаторы: UUID. Регистрационные номера (заявления, показания, заявки, обращения) — отдельное поле `number` вида `DEMO-2026-00001` в тестовом режиме; в боевом формате — отдельно согласовать (8.8, 4.10).
- Ошибки: код HTTP и тело `{ "error": { "code": "...", "message": "..." } }`. `message` — понятный текст без технических деталей (18.8). Ошибки полей — `fields: { "<имя>": "<код>" }` (4.9).
- Версия объекта: поле `version`, при изменении увеличивается; запрос на изменение присылает ожидаемую версию, при несовпадении — `409 stale` (уже реализовано на фронте для заявок).
- Роли (ТЗ 2.6): `resident`, `representative`, `tenant`, `lawful_user`, `provider_employee`, `contact_operator`, `request_specialist`, `inspector`, `meter_specialist`, `accountant`, `organization_admin`, `system_admin`. Проверка прав — только на сервере. Фронт прячет экраны, но не считает это защитой (ТЗ 2.7, 19.1).
- Персональные данные (ИИН, телефон, email, адрес): маскируются в ответах там, где не нужны полностью (19.4).
- Журнал: каждое изменение статуса, подписи, показаний и платежа пишется в журнал с пользователем, временем и старым/новым значением (12.7, 13.4, 19.7).
- Идемпотентность: отправка заявления, показаний и платежа принимает ключ `Idempotency-Key`; повторная доставка не создаёт вторую запись (9.17, 20.5).

## Сущности

### User — пользователь портала (2.1, 2.6)

`id`, `iin` (маска), `lastName`, `firstName`, `middleName?`, `phone`, `email?`, `roles[]`, `organizationId?`, `createdAt`, `status` (`active` | `blocked`).

### Session — вход (2.2)

Вход по телефону и одноразовому коду, либо по гос. механизму / ЭЦП (заглушка, пока не подключено). Сессия: `expiresAt`, таймаут бездействия (19.4). Поля фронта: `role`, `name`, `organizationId?` (сейчас демо-вход в `localStorage`).

### Property — объект недвижимости (3.1–3.8)

`id`, `ownerUserId`, `territoryId` (регион, район, город), `localityId` (населённый пункт), `street`, `house`, `flat?`, `type` (квартира, частный дом, нежилое помещение, иной), `personalAccount?` (лицевой счёт), `ownerInfo` (собственник или законный пользователь), `verification` (см. ниже), `addressId?` (ссылка на справочник адресов), `createdAt`.

- `verification.status`: `unverified` (только что добавлен) | `pending_check` | `confirmed` | `rejected` (предложение; ТЗ 3.6 описывает проверку, но не перечисляет статусы). Из `unverified` и `rejected` можно запросить подтверждение; `pending_check` решает сотрудник. Фронт хранит у загруженных документов только имя и размер.
- `verification.method`: `state_integration` | `document` (3.4).
- `verification.documents[]`: ссылки на загруженные файлы.

### Address — справочник адресов (3.2)

`id`, `territoryId`, `localityId`, `street`, `house`, `kind` (`city` | `rural`). Поиск по строке с вариантами.

### Provider — поставщик / организация (1.4, 4.3)

`id`, `name`, `contacts` (телефон, email, сайт), `serviceAreaIds[]`, `services[]` (ids услуг), `onlineAvailable`, `requirements`, `documents[]`, `inspectionRequired`, `meterCheckRequired`, `signingMethods[]`.

### ServiceAvailability — какой поставщик обслуживает адрес (1.4, 1.5)

`propertyId` → `providers[]`. Если услуга по адресу не предоставляется, сервер отвечает `422 not_serviced` и не создаёт заявление (1.5).

### ContractApplication — заявление на заключение договора (4.4–4.21)

`id`, `number`, `propertyId`, `serviceId`, `providerId`, `applicant` (ФИО, ИИН маской, телефон, email — 4.5), `propertyType`, `basis` (основание пользования), `rightStartDate?`, `personalAccount?`, `previousContractId?`, `meter?` (сведения о приборе), `notifyChannel`, `attachments[]`, `status` (см. ниже), `statusHistory[]`, `submittedAt?`, `signatures[]`, `version`.

- Черновик сохраняется отдельно (18.4): `draft: { payload, updatedAt }`.
- Статусы (ТЗ 5.4): `draft`, `not_sent`, `registered`, `under_review`, `docs_check_required`, `returned_for_revision`, `awaiting_applicant_signature`, `awaiting_provider_signature`, `inspection_required`, `technical_conditions_required`, `concluded`, `active`, `suspended`, `terminated`, `refused`.
- Договор считается заключённым только в статусе `concluded` или дальше, и не раньше подписания (4.21, 4.16).

### Attachment — файл (4.7, 18.5)

`id`, `name`, `mimeType` (`application/pdf`, `image/jpeg`, `image/png`), `size`, `sha256`, `uploadedAt`. Допустимые форматы, размер и количество задаёт администратор (4.7), значения по умолчанию согласовать. Проверка содержимого на сервере (19.4).

### Contract — договор (5.1–5.7)

`id`, `number`, `propertyId`, `serviceId`, `providerId`, `applicationId`, `personalAccount`, `status` (тот же набор, что у заявления), `startsAt?`, `signedAt?`, `documents[]` (договор, заявление, приложения), `meters[]` (ids приборов), `hasDebt?` (только если поставщик передаёт), `changeRequests[]`, `statusHistory[]`.

### Meter — прибор учёта (6.3)

`id`, `propertyId`, `resource` (электро, холодная вода, горячая вода, водоотведение, тепло, газ, ТБО), `type`, `manufacturer?`, `model?`, `serialNumber`, `personalAccount`, `installedAt`, `commissionedAt`, `lastVerifiedAt`, `nextVerificationAt?`, `sealNumber?`, `sealedAt?`, `state` (работает / неисправен / снят / и т.д.), `lastReading`, `lastReadingAt`, `readingCheckStatus`.

### MeterReading — показания (7.1–7.13)

`id`, `number`, `meterId`, `value` (число, разрядность прибора), `readingDate`, `photoIds[]`, `previousValue`, `previousDate`, `status` (см. ниже), `providerComment?`, `submittedAt`, `idempotencyKey`.

- Статусы (ТЗ 7.9): `draft`, `sent`, `registered`, `awaiting_check`, `accepted`, `rejected`, `clarification_required`, `transferred_to_provider`, `processed_by_provider`.
- Факт отправки не означает учёт в начислении (7.12): итоговый статус выставляет поставщик.

### MeterRequest — заявка по прибору (8.1–8.10)

`id`, `number`, `kind` (`installation` | `replacement` | `sealing` | `unseal` | `verification` | `fault`), `propertyId`, `meterId?`, `reason`, `preferredDates[]`, `scheduledAt?`, `assigneeId?`, `contactPhone`, `comment?`, `attachments[]`, `result?` (новый номер прибора, показания, номер пломбы, дата следующей поверки), `actId?`, `status` (`submitted` | `in_progress` | `done` | `rejected`, общий набор из кода), `statusHistory[]`.

### Charge — начисление (9.1–9.3)

`id`, `propertyId`, `providerId`, `resource`, `personalAccount`, `period` (`YYYY-MM`), `previousDebt`, `accrued`, `recalculated`, `penalty`, `paid`, `overpayment`, `total`, `generatedAt`, `dueAt?`, `updatedAt`. Сервер не меняет начисления, он их отображает (9.7).

### Receipt — единая квитанция (9.4–9.9)

`id`, `propertyId`, `period`, `charges[]` (ids), `total`, `pdfUrl` (выдаётся подписанной ссылкой с коротким сроком, 19.5).

### Payment — платёж (9.10–9.18)

`id`, `receiptId?`, `items[]` (`chargeId`, `amount`), `total`, `status` (см. ниже), `gateway`, `gatewayPaymentId`, `receivedAt`, `distribution[]` (сумма по поставщику и лицевому счёту, 9.12–9.13).

- Статусы (ТЗ 9.16): `awaiting_payment`, `initiated`, `processing`, `paid`, `rejected`, `cancelled`, `refunded`, `awaiting_provider_confirmation`.
- Данные карты в систему не передаются, ввод только в шлюзе (9.19).
- Повторное уведомление шлюза не должно зачислять платёж дважды (9.17).

### Appeal — обращение или жалоба (11.1–11.8)

`id`, `number`, `category`, `subcategory`, `propertyId`, `address`, `description`, `contact`, `incidentStart?`, `incidentDuration?`, `attachments[]`, `responsibleOrganizationId`, `status` (см. ниже), `history[]` (переписка), `dueAt` (срок рассмотрения, 11.5).

- Статусы (ТЗ 11.7): `registered`, `sent_to_executor`, `accepted`, `info_required`, `under_review`, `response_prepared`, `done`, `closed`, `redirected`, `refused`.

### Notification — уведомление (16.1–16.4)

`id`, `userId`, `event` (из списка ТЗ 16.1), `text` (ru/kk), `createdAt`, `readAt?`, `channels[]` (`in_app` | `email` | `sms`), `deliveryStatus?` (по каналам, если сервис его отдаёт).

### OrganizationCabinet — кабинет организации (12.1–12.8)

Реестры по организации (заявления, договоры, заявки по приборам, показания, обращения, начисления, платежи), журнал действий сотрудников `AuditEntry { id, userId, action, entityType, entityId, before?, after?, at }`. Все выборки фильтруются по `organizationId` пользователя на сервере.

### Admin — администрирование (13.1–13.5)

Справочники, роли, конфигурация форм и обязательных документов по поставщику, маршруты согласования, статусы и сроки, шаблоны уведомлений (ru, kk), языки интерфейса, журнал интеграций, отчёты. Системный администратор не может менять начисления и подтверждать договоры (13.5).

### Report — отчёт (17.1–17.4)

Параметры: период, регион, район, населённый пункт, организация, вид услуги, статус. Выгрузка `xlsx`, `csv`, `pdf` — формирует сервер.

## Маршруты (предложение)

| Метод и путь                                                | Назначение                                                                            | ТЗ        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------- |
| `POST /auth/register`                                       | Регистрация (ИИН, ФИО, телефон, email)                                                | 2.1       |
| `POST /auth/otp/request`, `POST /auth/otp/verify`           | Код из SMS и вход                                                                     | 2.2       |
| `GET /me`, `PATCH /me`                                      | Профиль                                                                               | 2.1       |
| `GET /properties`, `POST /properties`                       | Мои объекты, добавление                                                               | 2.4, 3.1  |
| `GET /properties/:id`, `PATCH /properties/:id`              | Карточка объекта                                                                      | 3.1       |
| `POST /properties/:id/verification`                         | Подтверждение объекта                                                                 | 3.4–3.6   |
| `GET /properties/:id/services`                              | Услуги и поставщики по адресу                                                         | 1.4, 3.7  |
| `GET /addresses/search?q=`                                  | Поиск адреса                                                                          | 3.2       |
| `GET /services`, `GET /services/:code`                      | Каталог услуг                                                                         | 1.2, 1.3  |
| `POST /contract-applications`                               | Создать или сохранить черновик                                                        | 4.4       |
| `PUT /contract-applications/:id`                            | Изменить черновик                                                                     | 4.19      |
| `POST /contract-applications/:id/submit`                    | Отправить заявление                                                                   | 4.8–4.10  |
| `GET /contract-applications/:id/receipt`                    | Подтверждение подачи                                                                  | 4.11      |
| `POST /contract-applications/:id/sign`                      | Подписание (через ЭЦП-сервис)                                                         | 4.12–4.14 |
| `POST /attachments`                                         | Загрузка файла (multipart)                                                            | 4.7       |
| `GET /contracts`, `GET /contracts/:id`                      | Мои договоры                                                                          | 5.1–5.4   |
| `GET /contracts/:id/documents/:docId`                       | Скачивание (подписанная ссылка)                                                       | 5.5, 19.5 |
| `POST /contracts/:id/change-requests`                       | Заявка на изменение                                                                   | 5.6       |
| `GET /properties/:id/meters`, `POST /properties/:id/meters` | Приборы учёта                                                                         | 6.1–6.5   |
| `POST /meters/:id/readings`                                 | Передача показаний (с ключом идемпотентности)                                         | 7.1, 7.5  |
| `GET /meters/:id/readings`                                  | История показаний                                                                     | 7.13      |
| `POST /meter-requests`                                      | Заявка по прибору (тип в теле)                                                        | 8.2–8.6   |
| `GET /meter-requests/:id`                                   | Карточка заявки и история                                                             | 8.8–8.9   |
| `GET /properties/:id/charges?period=`                       | Начисления                                                                            | 9.1–9.3   |
| `GET /properties/:id/receipts/:period.pdf`                  | Квитанция                                                                             | 9.4–9.9   |
| `POST /payments`                                            | Создать платёж, получить ссылку шлюза                                                 | 9.10–9.15 |
| `POST /payments/callback`                                   | Уведомление шлюза (проверка подписи, идемпотентно)                                    | 9.15–9.17 |
| `GET /requests`                                             | Единый реестр заявок всех видов                                                       | 10.1–10.3 |
| `POST /appeals`, `GET /appeals/:id`                         | Обращения и жалобы                                                                    | 11.1–11.8 |
| `GET /notifications`, `POST /notifications/:id/read`        | Уведомления                                                                           | 16.1–16.4 |
| `GET /org/...`                                              | Реестры кабинета организации                                                          | 12.2      |
| `POST /org/contract-applications/:id/actions`               | Действия сотрудника: проверить, вернуть, отклонить, согласовать, сформировать договор | 12.4      |
| `GET /admin/...`                                            | Администрирование и справочники                                                       | 13.2      |
| `GET /reports?...&format=xlsx\|csv\|pdf`                    | Отчёты                                                                                | 17.1–17.3 |

## Что фронт сейчас делает в браузере (для переноса)

| Данные сейчас | Где                                  | Что заменяет                              |
| ------------- | ------------------------------------ | ----------------------------------------- |
| Демо-сессия   | `localStorage` `aqmola:session`      | `Session` и `/auth/*`                     |
| Заявки услуг  | `localStorage` `aqmola:applications` | `ContractApplication` и `MeterRequest`    |
| Избранное     | `localStorage` `aqmola:favorites`    | Пользовательские настройки (предложение)  |
| Вид сайта     | `localStorage` `aqmola:display`      | Остаётся в браузере, это настройка экрана |

Заявки в браузере видны только в том же браузере; это временное ограничение демо.

## Интеграции (ТЗ 14, 15) — заглушки на фронте

Фронт не вызывает внешние системы. Экраны ЭЦП, гос. входа, SMS, платёжного шлюза и выгрузки отчётов показывают понятное состояние «демо» и не отправляют данные наружу. Для бэкендера нужно решить:

1. Провайдер SMS и срок жизни кода.
2. Способ входа через гос. механизмы и ЭЦП, формат подписи (14.5, 15.4).
3. Платёжный шлюз: редирект или виджет, формат уведомлений и подписи (9.10, 9.15).
4. Хранилище файлов и срок ссылок на скачивание (19.5).
5. Очередь исходящих сообщений и повторная отправка (14.7, 20.5).

## Открытые вопросы к бэкенду

- Единый формат номеров заявлений: кто и как выдаёт (4.10, 8.8).
- Список допустимых форматов и размеров файлов по умолчанию (4.7).
- Срок рассмотрения по каждой услуге — источник данных (10.3, 11.5).
- Какие поставщики отдают задолженность и в каком виде (5.3).
