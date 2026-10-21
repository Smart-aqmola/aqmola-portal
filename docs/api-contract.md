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
- Подписи: `signatures.application` (заявитель подписал заявление), `signatures.contractApplicant`, `signatures.contractProvider` (договор). Фронт ставит демо-отметку; настоящую ЭЦП проверяет сервер (4.12–4.14). При правке заявления подпись заявления снимается.
- `remarks` — замечания поставщика при возврате или отказе (4.17–4.18). Повторная подача возвращённого заявления сохраняет `number` (4.19). Статус `not_sent` — заявление подписано, но не ушло из-за недоступности внешней системы (14.7); фронт сам его не ставит.
- Переходы поставщика: `registered → under_review → {docs_check_required | returned_for_revision | inspection_required | technical_conditions_required | refused | awaiting_applicant_signature}`; заявитель: `draft | returned_for_revision → registered`, `awaiting_applicant_signature → awaiting_provider_signature`; поставщик: `awaiting_provider_signature → concluded → active → {suspended | terminated}`.

### Attachment — файл (4.7, 18.5)

`id`, `name`, `mimeType` (`application/pdf`, `image/jpeg`, `image/png`), `size`, `sha256`, `uploadedAt`. Допустимые форматы, размер и количество задаёт администратор (4.7), значения по умолчанию согласовать. Проверка содержимого на сервере (19.4).

### Contract — договор (5.1–5.7)

`id`, `number`, `propertyId`, `serviceId`, `providerId`, `applicationId`, `personalAccount`, `status` (тот же набор, что у заявления), `startsAt?`, `signedAt?`, `documents[]` (договор, заявление, приложения), `meters[]` (ids приборов), `hasDebt?` (только если поставщик передаёт), `changeRequests[]` (`id`, `kind`: `contacts` | `account` | `meter` | `other`, `text`, `at`, `status`; подавать можно по договору в силе, 5.6), `statusHistory[]`.

### Meter — прибор учёта (6.3)

`id`, `propertyId`, `resource` (`electricity` | `cold_water` | `hot_water` | `heat` | `gas`; у водоотведения и ТБО приборов нет), `type` (`mechanical` | `electronic` | `smart`), `manufacturer?`, `model?`, `serialNumber`, `personalAccount`, `installedAt`, `commissionedAt?`, `lastVerifiedAt?`, `nextVerificationAt?`, `sealNumber?`, `sealedAt?`, `state` (`working` | `faulty` | `removed` | `replaced`), `digits` (цифр до запятой на барабане) и `decimals` (после запятой): по ним проверяется разрядность показаний (7.5), `initialReading`, `history[]` (`kind`: `installed` | `replaced` | `removed` | `sealed` | `unsealed` | `verified` | `fault`, `at`, `note?`; 8.11).

- Предыдущие показания, дата последней передачи и статус проверки (6.3) сервер вычисляет по показаниям, в самом приборе они не хранятся.
- Заводской номер уникален среди действующих приборов одного вида ресурса; у снятого и заменённого можно повторить.

### MeterReading — показания (7.1–7.13)

`id`, `number` (`DEMO-POK-ГГГГ-NNNNN` в демо), `meterId`, `value` (число, разрядность прибора), `readingDate` (день снятия, не день отправки), `photoIds[]`, `previousValue`, `previousDate`, `status` (см. ниже), `providerComment?`, `submittedAt`, `idempotencyKey`.

- Статусы (ТЗ 7.9): `draft`, `sent`, `registered`, `awaiting_check`, `accepted`, `rejected`, `clarification_required`, `passed_to_system`, `processed`.
- Факт отправки не означает учёт в начислении (7.12): итоговый статус выставляет поставщик. Фронт различает «отправлено», «принято поставщиком» (`accepted`, `passed_to_system`) и «учтено» (`processed`).
- Проверки (7.5) повторяются на сервере: действующий прибор, не отрицательное, формат и разрядность, дубль (тот же прибор, то же значение, тот же день), день снятия не в будущем, не раньше предыдущих показаний и не старше 45 дней (окно приёма настраивается), фото, если оно обязательно у поставщика (в демо: электричество и газ).
- Показания ниже предыдущих принимаются только с подтверждением человека и сразу получают `awaiting_check` (7.7).
- Отклонение и запрос уточнения требуют комментария поставщика (7.13).

### MeterRequest — заявка по прибору (8.1–8.10)

`id`, `number` (`DEMO-ZPR-ГГГГ-NNNNN`), `kind` (`installation` | `replacement` | `sealing` | `unseal` | `verification` | `fault`), `propertyId`, `resource`, `meterId?` (при установке прибора может не быть), `reason` (код из списка своего для каждого вида), `details` (поля вида: `newMeter`, `faultInfo`, `previousSeal`, `installedAt`, `plannedWork`, `lastVerifiedAt`, `nextVerificationAt`), `currentReading?`, `contactPhone`, `slots[]` (до трёх вариантов: `date`, `time`: `morning` | `day` | `evening`), `comment?`, `attachments[]`, `status`, `statusHistory[]`, `scheduled?` (`date`, `time`), `assigneeId?`, `remarks?` (причина отказа или вопрос исполнителя), `result?` (`at`, `newSerial?`, `reading?`, `seal?`, `nextVerification?`), `actId?`.

- Статусы: `registered`, `in_progress`, `info_requested`, `scheduled`, `done`, `rejected`. Отказ и запрос сведений требуют причины, смена уже назначенной даты тоже (8.8).
- Закрытие (`done`) обязано нести результат: для установки и замены новый заводской номер и показания, для опломбировки номер пломбы. Сервер меняет приборы: установка создаёт прибор, замена ставит старому `replaced` и создаёт новый с тем же лицевым счётом и разрядностью, опломбировка и снятие меняют `sealNumber` и `sealedAt`, поверка двигает даты, неисправность ставит `faulty`; всё пишется в `history` прибора (8.11).

### Charge — начисление (9.1–9.3)

`id`, `propertyId`, `providerId`, `sector` (`electricity` | `water` | `heat` | `gas` | `waste`), `personalAccount`, `period` (`YYYY-MM`), `previousDebt`, `accrued`, `recalculated` (отрицательное, если поставщик уменьшил), `penalty`, `paid`, `overpayment`, `total`, `generatedAt`, `dueAt?` (поставщик может срок не давать), `updatedAt` (когда поставщик прислал данные), `available` (false, когда свежих данных нет: тогда суммы последние известные, а фронт показывает дату и уведомление, 9.8). Суммы в целых тенге. Сервер не меняет начисления, он их отображает (9.7).

### Receipt — единая квитанция (9.4–9.9)

`id`, `propertyId`, `period`, `charges[]` (ids), `total`, `pdfUrl` (выдаётся подписанной ссылкой с коротким сроком, 19.5).

### Payment — платёж (9.10–9.18)

`id`, `number` (`DEMO-PAY-ГГГГ-NNNNN`), `propertyId`, `period` (`YYYY-MM`), `method` (`gateway` | `bank_app` | `reference`), `reference` (идентификатор для оплаты, 9.11), `lines[]` (`chargeId`, `providerId`, `sector`, `personalAccount`, `amount`: сумма по поставщику и лицевому счёту, 9.12–9.13), `total`, `status` (см. ниже), `statusHistory[]`, `gatewayPaymentId`, `notices[]` (id уведомлений шлюза, уже принятых), `createdAt`, `updatedAt`.

- Статусы (ТЗ 9.16): `awaiting_payment`, `initiated`, `processing`, `paid`, `declined`, `cancelled`, `refunded`, `awaiting_confirmation`. Переходы фронта: человек запускает (`awaiting_payment` → `initiated`) и отменяет (из `awaiting_payment`, `initiated`); остальное сообщает шлюз: `processing`, затем `paid`, `declined` или `awaiting_confirmation`; из `paid` возможен `refunded`.
- Данные карты в систему не передаются, ввод только в шлюзе (9.19).
- Каждое уведомление шлюза несёт свой идентификатор; повторное уведомление ничего не меняет и не зачисляет платёж дважды (9.17).
- Услугу нельзя оплатить, пока по ней есть платёж в статусе `awaiting_payment`, `initiated`, `processing` или `awaiting_confirmation` (защита от двойной оплаты); платятся только услуги с суммой больше нуля и свежими данными поставщика.
- Оплачивается весь остаток по услуге за текущий месяц. Платёж одним документом может покрывать несколько поставщиков, но `lines[]` хранят поставщика и счёт раздельно, чтобы сервер мог разнести деньги (9.12–9.14).
- Принятый платёж увеличивает `paid` в начислении и уменьшает `total`; возвращённый не учитывается. В демо это считает фронт, в боевой версии начисление обновляет поставщик (9.7).

### Appeal — обращение или жалоба (11.1–11.8)

`id`, `number` (`DEMO-OBR-ГГГГ-NNNNN`), `category` (13 тем ТЗ 11.1: `no_service`, `power_cut`, `water_cut`, `no_heat`, `gas_problem`, `waste_late`, `quality`, `wrong_charges`, `wrong_readings`, `late_payment`, `contract_refused`, `late_request`, `other`), `subcategory` (список зависит от категории, справочник обращений), `sector?` (услуга: берётся из темы или выбирается человеком, обязательна для тем про начисления, показания, платежи, договоры и заявки), `propertyId?`, `address`, `description` (10–1000 знаков), `contactPhone`, `contactEmail?`, `attachments[]`, `violation?` (`date`, `time?`, `duration?`, `unit`: `hours` | `days`; спрашивается для тем про отсутствие и качество услуги, 11.3), `organizationId` (ответственная организация, 11.4), `external?` (`number` в системе электронных обращений, когда обращение идёт в неё, 11.6), `status`, `events[]` (переписка и смены статуса: `at`, `actor`: `applicant` | `executor`, `status?`, `text?`; 11.8), `dueAt` (срок рассмотрения, 11.5).

- Статусы (ТЗ 11.7): `registered`, `sent_to_executor`, `accepted`, `info_required`, `in_review`, `answer_ready`, `executed`, `closed`, `redirected`, `refused`. При создании обращение сразу получает `registered` и `sent_to_executor`.
- Ответственная организация: поставщик услуги по адресу объекта; если услуги нет или адрес не определён, обращение идёт в региональное управление ЖКХ и регистрируется в системе электронных обращений. Организация может перенаправить обращение туда (`redirected`).
- Вопрос, ответ, отказ и перенаправление требуют текста для человека. Ответ человека на вопрос возвращает обращение в `in_review`. Закрыть (`closed`) может человек после `answer_ready` или `executed`; в закрытое сообщения не добавляются.

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
