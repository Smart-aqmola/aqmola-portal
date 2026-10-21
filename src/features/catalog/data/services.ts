import type { Audience, Service, ServiceChannel, SituationId } from "../domain/types";
import { organizations } from "./organizations";
import { serviceTranslations } from "./service-translations";

/** What is written by hand for each service; the rest is added below. */
type BaseService = Pick<
  Service,
  | "id"
  | "slug"
  | "situationId"
  | "organizationId"
  | "audiences"
  | "title"
  | "summary"
  | "free"
  | "workingDays"
>;

const resident: readonly Audience[] = ["resident"];
const business: readonly Audience[] = ["business"];
const both: readonly Audience[] = ["resident", "business"];

function service(
  slug: string,
  situationId: SituationId,
  organizationId: string,
  audiences: readonly Audience[],
  days: number,
  title: string,
  summary: string,
): BaseService {
  return {
    id: slug,
    slug,
    situationId,
    organizationId,
    audiences,
    title: { ru: title },
    summary: { ru: summary },
    free: true,
    workingDays: days,
  };
}

// Test data. Russian is written here; Kazakh and English texts are in service-translations.ts.
const baseServices: readonly BaseService[] = [
  // Meters and readings
  service(
    "water-meter-readings",
    "meters",
    "akmola-water",
    resident,
    1,
    "Передача показаний приборов учёта воды",
    "Передайте показания счётчиков холодной и горячей воды без визита в абонентский отдел.",
  ),
  service(
    "electricity-meter-readings",
    "meters",
    "akmola-energy-sales",
    resident,
    1,
    "Передача показаний электросчётчика",
    "Укажите текущие показания, и начисления пересчитаются автоматически.",
  ),
  service(
    "gas-meter-readings",
    "meters",
    "akmola-gas",
    resident,
    1,
    "Передача показаний газового счётчика",
    "Передавайте показания онлайн вместо звонка в газовую службу.",
  ),
  service(
    "electricity-meter-replacement",
    "meters",
    "akmola-grid",
    both,
    10,
    "Замена и поверка электросчётчика",
    "Запишитесь на замену или поверку счётчика, мастер приедет в согласованное время.",
  ),
  service(
    "water-meter-sealing",
    "meters",
    "akmola-water",
    resident,
    5,
    "Опломбировка водомера",
    "Заявка на опломбировку нового или поверенного прибора учёта воды.",
  ),
  service(
    "gas-meter-sealing",
    "meters",
    "akmola-gas",
    resident,
    7,
    "Опломбировка газового счётчика",
    "Выезд специалиста для установки пломбы и проверки герметичности.",
  ),

  // Connection and technical conditions
  service(
    "water-technical-conditions",
    "connection",
    "akmola-water",
    both,
    15,
    "Технические условия на водоснабжение и водоотведение",
    "Получите условия подключения объекта к сетям воды и канализации.",
  ),
  service(
    "gas-connection",
    "connection",
    "akmola-gas",
    resident,
    20,
    "Подключение частного дома к газу",
    "Проверка возможности подключения, технические условия и договор.",
  ),
  service(
    "electricity-technical-conditions",
    "connection",
    "akmola-grid",
    both,
    10,
    "Технические условия на электроснабжение",
    "Расчёт мощности и условия подключения жилого или нежилого объекта.",
  ),
  service(
    "heat-technical-conditions",
    "connection",
    "akmola-heat",
    business,
    15,
    "Технические условия на подключение к тепловым сетям",
    "Условия подключения нового здания к централизованному отоплению.",
  ),
  service(
    "storm-sewer-conditions",
    "connection",
    "akmola-water",
    business,
    15,
    "Технические условия на ливневую канализацию",
    "Условия отвода дождевых и талых вод для застройщиков.",
  ),
  service(
    "water-cut-in-business",
    "connection",
    "akmola-water",
    business,
    10,
    "Заявка на врезку в сети водоснабжения",
    "Заявка юридического лица на подключение к действующему водопроводу.",
  ),
  service(
    "temporary-power",
    "connection",
    "akmola-grid",
    business,
    7,
    "Временное электроснабжение на период строительства",
    "Подключение строительной площадки до ввода объекта в эксплуатацию.",
  ),

  // Contracts, accounts and bills
  service(
    "account-owner-change",
    "contracts",
    "billing-center",
    resident,
    3,
    "Переоформление лицевого счёта при смене собственника",
    "Новый собственник получает счёт на своё имя без визита в офис.",
  ),
  service(
    "epd-mailing",
    "contracts",
    "billing-center",
    resident,
    1,
    "Включение в электронную рассылку ЕПД",
    "Единый платёжный документ приходит на электронную почту вместо бумажной квитанции.",
  ),
  service(
    "residents-count-change",
    "contracts",
    "billing-center",
    resident,
    3,
    "Изменение количества проживающих на лицевом счёте",
    "Начисления по воде и теплу пересчитываются с учётом числа жильцов.",
  ),
  service(
    "gas-contract",
    "contracts",
    "akmola-gas",
    resident,
    5,
    "Заключение договора газоснабжения",
    "Подпишите договор онлайн, копия сохранится в ваших заявках.",
  ),
  service(
    "electricity-contract-resident",
    "contracts",
    "akmola-energy-sales",
    resident,
    5,
    "Договор электроснабжения для квартиры или дома",
    "Заключение договора с энергоснабжающей организацией.",
  ),
  service(
    "electricity-contract-business",
    "contracts",
    "akmola-energy-sales",
    business,
    7,
    "Договор электроснабжения для юридических лиц",
    "Заключение и изменение договора для компаний и ИП.",
  ),
  service(
    "water-contract-business",
    "contracts",
    "akmola-water",
    business,
    7,
    "Перезаключение договора водоснабжения для юридических лиц",
    "Продление договора или смена реквизитов без визита в офис.",
  ),
  service(
    "tariff-change",
    "contracts",
    "akmola-energy-sales",
    resident,
    3,
    "Изменение вида тарифа на электроэнергию",
    "Переход на однозонный или многозонный тариф по вашему выбору.",
  ),

  // Heating season
  service(
    "heating-readiness-passport",
    "heating",
    "akmola-heat",
    both,
    10,
    "Паспорт готовности дома к отопительному сезону",
    "Для ОСИ и управляющих компаний: проверка дома и выдача паспорта.",
  ),
  service(
    "heating-flushing",
    "heating",
    "akmola-heat",
    both,
    7,
    "Заявка на промывку и опрессовку системы отопления",
    "Запишитесь на дату промывки и получите акт испытаний.",
  ),
  service(
    "heating-recalculation",
    "heating",
    "akmola-heat",
    resident,
    10,
    "Перерасчёт за некачественное отопление",
    "Если в квартире холодно, подайте заявку, и мы проверим температуру.",
  ),
  service(
    "heat-meter-installation",
    "heating",
    "akmola-heat",
    both,
    10,
    "Установка теплового счётчика",
    "Согласование проекта и ввод прибора учёта тепла в эксплуатацию.",
  ),
  service(
    "heat-unit-check",
    "heating",
    "akmola-heat",
    both,
    5,
    "Вызов специалиста для проверки теплового узла",
    "Выезд мастера, если батареи греют неравномерно или падает давление.",
  ),

  // Housing and utilities
  service(
    "osi-registration",
    "housing",
    "housing",
    resident,
    15,
    "Регистрация объединения собственников имущества (ОСИ)",
    "Пошаговая инструкция, шаблоны документов и консультация.",
  ),
  service(
    "waste-contract-kokshetau",
    "housing",
    "kokshetau-eco",
    both,
    5,
    "Договор на вывоз ТБО в Кокшетау",
    "Заключите договор на вывоз твёрдых бытовых отходов и узнайте график.",
  ),
  service(
    "waste-contract-region",
    "housing",
    "region-eco",
    both,
    5,
    "Договор на вывоз ТБО в районах и городах области",
    "Договор на вывоз отходов для частного сектора и организаций.",
  ),
  service(
    "waste-schedule-change",
    "housing",
    "kokshetau-eco",
    resident,
    3,
    "Изменение графика вывоза отходов",
    "Попросите изменить день или время вывоза у вашего дома.",
  ),
  service(
    "common-property-repair",
    "housing",
    "housing",
    resident,
    10,
    "Заявка на ремонт общего имущества многоквартирного дома",
    "Подъезд, крыша, лифт или двор: заявка попадёт в районный отдел ЖКХ.",
  ),

  // Construction and approvals
  service(
    "sketch-approval",
    "construction",
    "architecture",
    both,
    15,
    "Согласование эскиза частного дома",
    "Проверка эскиза на соответствие градостроительным нормам.",
  ),
  service(
    "sign-approval",
    "construction",
    "architecture",
    business,
    10,
    "Согласование размещения вывески",
    "Загрузите эскиз и фото фасада, решение придёт в личный кабинет.",
  ),
  service(
    "outdoor-advertising",
    "construction",
    "architecture",
    business,
    15,
    "Размещение наружной рекламы",
    "Разрешение на рекламную конструкцию в черте населённого пункта.",
  ),
  service(
    "reconstruction-approval",
    "construction",
    "architecture",
    both,
    20,
    "Согласование перепланировки и реконструкции",
    "Согласование изменений в проекте жилого или нежилого здания.",
  ),

  // Business and investment
  service(
    "land-for-business",
    "business",
    "business-center",
    business,
    5,
    "Консультация по земельным участкам для бизнеса",
    "Какие участки доступны, как их получить и какие документы нужны.",
  ),
  service(
    "support-measures",
    "business",
    "business-center",
    business,
    5,
    "Подбор мер государственной поддержки",
    "Ответьте на несколько вопросов и узнайте, какая поддержка вам подходит.",
  ),
  service(
    "investment-project-support",
    "business",
    "business-center",
    business,
    10,
    "Сопровождение инвестиционного проекта",
    "Персональный менеджер поможет пройти все согласования.",
  ),
  service(
    "business-utility-connection",
    "business",
    "business-center",
    business,
    7,
    "Единое окно подключения к сетям для бизнеса",
    "Одна заявка на воду, тепло, газ и электричество для нового объекта.",
  ),

  // Appeals and service quality
  service(
    "report-accident",
    "appeals",
    "dispatch",
    resident,
    1,
    "Сообщить об аварии на сетях",
    "Круглосуточный приём: укажите адрес и приложите фото.",
  ),
  service(
    "service-quality-complaint",
    "appeals",
    "dispatch",
    both,
    5,
    "Жалоба на качество коммунальной услуги",
    "Вода, тепло, свет или газ: опишите проблему, ответ придёт в срок.",
  ),
  service(
    "improvement-proposal",
    "appeals",
    "housing",
    resident,
    15,
    "Предложение по благоустройству двора",
    "Предложите, что улучшить во дворе или на улице, и следите за рассмотрением.",
  ),
  service(
    "outage-notifications",
    "appeals",
    "dispatch",
    both,
    1,
    "Подписка на уведомления о плановых отключениях",
    "Получайте сообщения об отключениях воды, света и тепла по вашему адресу.",
  ),

  // The utility services named in the technical specification (1.2). Added at the end so the
  // codes of the services above do not move.
  service(
    "water-contract-resident",
    "contracts",
    "akmola-water",
    resident,
    5,
    "Заключение договора на водоснабжение и водоотведение",
    "Оформите договор с водоканалом по вашему адресу без визита в офис.",
  ),
  service(
    "heat-contract",
    "contracts",
    "akmola-heat",
    resident,
    5,
    "Заключение договора на теплоснабжение",
    "Подайте заявление на договор с теплоснабжающей организацией по адресу объекта.",
  ),
  service(
    "meter-installation-replacement",
    "meters",
    "akmola-water",
    both,
    10,
    "Установка и замена счётчика",
    "Запишитесь на установку нового прибора учёта или замену неисправного.",
  ),
  service(
    "meter-unsealing",
    "meters",
    "akmola-water",
    resident,
    5,
    "Снятие пломбы с прибора учёта",
    "Подайте заявку, если пломбу нужно снять для ремонта или замены прибора.",
  ),
  service(
    "meter-verification",
    "meters",
    "akmola-water",
    both,
    10,
    "Поверка счётчика",
    "Назначьте дату поверки прибора учёта и приложите документы о прошлой поверке.",
  ),
  service(
    "unified-receipt",
    "contracts",
    "billing-center",
    resident,
    1,
    "Получение единой квитанции",
    "Одна квитанция по всем коммунальным услугам вашего объекта за выбранный месяц.",
  ),
  service(
    "utility-payment",
    "contracts",
    "billing-center",
    resident,
    1,
    "Оплата коммунальных услуг",
    "Оплатите услуги одной суммой или выберите, за какие платить. Карту вводите только на странице банка.",
  ),
  service(
    "recalculation-request",
    "contracts",
    "billing-center",
    resident,
    10,
    "Подача заявления на перерасчёт",
    "Если начисление не совпадает с показаниями или услуги не было, подайте заявление на перерасчёт.",
  ),
];

const popularSlugs = new Set([
  "water-meter-readings",
  "electricity-meter-readings",
  "gas-meter-readings",
  "water-technical-conditions",
  "account-owner-change",
  "epd-mailing",
  "heating-readiness-passport",
  "waste-contract-kokshetau",
  "sketch-approval",
  "report-accident",
]);

const newSlugs = new Set([
  "outage-notifications",
  "business-utility-connection",
  "heat-unit-check",
]);

// Services that need a visit or a specialist on site; everything else is handled online.
const frontOfficeSlugs = new Set([
  "water-meter-sealing",
  "gas-meter-sealing",
  "electricity-meter-replacement",
  "heat-unit-check",
  "gas-connection",
  "osi-registration",
  "meter-installation-replacement",
  "meter-unsealing",
  "meter-verification",
]);

// Test prices in tenge for the few paid services; everything else is free. Not real tariffs.
const prices: Record<string, number> = {
  "meter-installation-replacement": 6500,
  "meter-verification": 4500,
};

// Official long names, only for services where the short card title leaves something out.
const fullTitles: Record<string, string> = {
  "water-technical-conditions":
    "Выдача технических условий на подключение к сетям водоснабжения и водоотведения для физических и юридических лиц",
  "heat-technical-conditions":
    "Выдача технических условий на подключение объекта к тепловым сетям для юридических лиц",
  "electricity-technical-conditions":
    "Выдача технических условий на присоединение к электрическим сетям для физических и юридических лиц",
  "account-owner-change":
    "Переоформление лицевого счёта абонента при смене собственника объекта недвижимости",
  "residents-count-change":
    "Изменение количества проживающих на лицевых счетах абонента при оказании коммунальных услуг для физических лиц",
  "epd-mailing":
    "Включение в электронную рассылку единого платёжного документа (ЕПД) для физических лиц",
  "sign-approval":
    "Согласование размещения вывески на территории населённого пункта для юридических лиц",
  "heating-readiness-passport": "Оформление паспорта готовности жилого дома к отопительному сезону",
};

const updatedAt: Record<string, string> = {
  "epd-mailing": "2026-10-19",
  "outage-notifications": "2026-10-18",
  "heat-unit-check": "2026-10-17",
};

const sectorOf = new Map(
  organizations.map((organization) => [organization.id, organization.sector]),
);

export const services: readonly Service[] = baseServices.map((base, index) => {
  const categoryId = sectorOf.get(base.organizationId);
  if (!categoryId) throw new Error(`Service ${base.slug} points at an unknown organization`);
  const channel: ServiceChannel = frontOfficeSlugs.has(base.slug) ? "front-office" : "online";
  const fullTitle = fullTitles[base.slug];
  const translation = serviceTranslations[base.slug];
  if (!translation) throw new Error(`Service ${base.slug} has no translations`);
  const { kk, en } = translation;
  return {
    ...base,
    title: { ru: base.title.ru, kk: kk.title, en: en.title },
    summary: { ru: base.summary.ru, kk: kk.summary, en: en.summary },
    // Codes follow the order of this list, so reorder carefully: people may remember a code.
    code: String(1001 + index),
    categoryId,
    ...(fullTitle ? { fullTitle: { ru: fullTitle, kk: kk.fullTitle, en: en.fullTitle } } : {}),
    channel,
    free: !(base.slug in prices),
    ...(base.slug in prices ? { price: prices[base.slug] } : {}),
    popular: popularSlugs.has(base.slug),
    isNew: newSlugs.has(base.slug),
    updatedAt: updatedAt[base.slug] ?? "2026-10-15",
  };
});
