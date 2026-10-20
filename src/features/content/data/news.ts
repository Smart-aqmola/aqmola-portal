import type { NewsItem, Photo } from "../domain/types";
import { newsTranslations, withAlt } from "./content-translations";

const THUMB = "https://thumb.wikimedia.org/wikipedia/commons/thumb";

function photo(path: string, file: string, author: string, alt: string): Photo {
  return {
    url: `${THUMB}/${path}/960px-${file}`,
    alt: { ru: alt },
    credit: {
      author,
      license: "CC BY-SA 4.0",
      sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}`,
    },
  };
}

const museum = photo(
  "e/e0/Museum_of_History_of_Kokshetau_in_March_2025.jpg",
  "Museum_of_History_of_Kokshetau_in_March_2025.jpg",
  "Kristianmusic",
  "Музей истории Кокшетау",
);
const zerenda = photo(
  "b/bd/Zerenda_June_07.jpg",
  "Zerenda_June_07.jpg",
  "Saltanat-alikhanova",
  "Зеренда летом",
);
const burabay = photo(
  "3/3b/Lake_Burabai_2.jpg",
  "Lake_Burabai_2.jpg",
  "Kul-Tegin Makishev",
  "Озеро Бурабай",
);

// Test data: every headline is invented. Dates are fixed so tests stay stable.
const baseNews: readonly NewsItem[] = [
  {
    id: "heat-flushing-kokshetau",
    slug: "heat-flushing-kokshetau",
    date: "2026-10-18",
    territoryId: "kokshetau",
    title: { ru: "В Кокшетау стартовала промывка тепловых сетей перед зимой" },
    summary: { ru: "Работы идут по графику, проверьте дату для вашего дома в заявках." },
    body: {
      ru: "Промывка тепловых сетей проходит по графику. Дату для вашего дома можно уточнить в заявках.\n\nВо время работ возможно временное снижение температуры батарей.",
    },
    topic: "utilities",
    views: 120,
    photo: museum,
  },
  {
    id: "readings-online",
    slug: "readings-online",
    date: "2026-10-15",
    title: { ru: "Показания счётчиков принимают онлайн во всех районах области" },
    summary: { ru: "Передать показания воды, света и газа можно без визита в офис." },
    body: {
      ru: "Показания воды, света и газа можно передать онлайн во всех районах области. Для этого не нужно приходить в офис.\n\nНайдите услугу в каталоге и подайте тестовую заявку.",
    },
    topic: "services",
    views: 340,
    photo: zerenda,
  },
  {
    id: "burabay-water-schedule",
    slug: "burabay-water-schedule",
    date: "2026-10-11",
    territoryId: "burabay",
    title: { ru: "Бурабайский район: график плановых отключений воды" },
    summary: { ru: "Отключения затронут несколько посёлков, время указано в уведомлении." },
    body: {
      ru: "В нескольких посёлках Бурабайского района пройдут плановые отключения воды. Точное время указано в уведомлении.\n\nЗапаситесь водой заранее.",
    },
    topic: "utilities",
    views: 210,
    photo: burabay,
  },
  {
    id: "epd-electronic",
    slug: "epd-electronic",
    date: "2026-10-07",
    title: { ru: "Единый платёжный документ можно получать по электронной почте" },
    summary: { ru: "Подключите рассылку в каталоге услуг, бумажную квитанцию можно отменить." },
    body: {
      ru: "Единый платёжный документ можно получать по электронной почте. Подключить рассылку можно в каталоге услуг.\n\nБумажную квитанцию при этом можно отменить.",
    },
    topic: "services",
    views: 275,
    photo: museum,
  },
  {
    id: "zerendi-road-works",
    slug: "zerendi-road-works",
    date: "2026-10-03",
    territoryId: "zerendi",
    title: { ru: "Зерендинский район: ремонт водопровода на центральной улице" },
    summary: { ru: "Подача воды ограничена днём, к вечеру ее восстановят." },
    body: {
      ru: "На центральной улице Зерендинского района ремонтируют водопровод. Днём подача воды ограничена.\n\nК вечеру воду обещают вернуть.",
    },
    topic: "utilities",
    views: 64,
    photo: zerenda,
  },
  {
    id: "heating-season-started",
    slug: "heating-season-started",
    date: "2026-09-30",
    title: { ru: "В области начался отопительный сезон" },
    summary: { ru: "Если в квартире холодно, подайте заявку на перерасчёт." },
    body: {
      ru: "В области начался отопительный сезон. Если в квартире холодно, подайте заявку на перерасчёт.\n\nЗаявку можно подать онлайн из каталога услуг.",
    },
    topic: "utilities",
    views: 410,
    photo: burabay,
  },
  {
    id: "stepnogorsk-embankment",
    slug: "stepnogorsk-embankment",
    date: "2026-09-26",
    territoryId: "stepnogorsk",
    title: { ru: "В Степногорске благоустроили набережную" },
    summary: { ru: "Появились новые дорожки и скамейки, работы завершены." },
    body: {
      ru: "В Степногорске закончили благоустройство набережной: проложены дорожки, установлены скамейки и освещение.\n\nЭто тестовая новость, события в ней вымышлены.",
    },
    topic: "city",
    views: 150,
    photo: museum,
  },
  {
    id: "kokshetau-bus-routes",
    slug: "kokshetau-bus-routes",
    date: "2026-09-22",
    territoryId: "kokshetau",
    title: { ru: "В Кокшетау изменились маршруты автобусов" },
    summary: { ru: "Часть маршрутов продлили до новых микрорайонов." },
    body: {
      ru: "В Кокшетау обновили схему автобусных маршрутов: часть линий продлили до новых микрорайонов.\n\nЭто тестовая новость, события в ней вымышлены.",
    },
    topic: "city",
    views: 95,
    photo: zerenda,
  },
  {
    id: "region-service-points",
    slug: "region-service-points",
    date: "2026-09-18",
    title: { ru: "Пункты обслуживания работают по новому графику" },
    summary: { ru: "Часы приёма указаны в карточке каждой услуги." },
    body: {
      ru: "Пункты обслуживания в районах области перешли на новый график приёма. Часы работы указаны в карточке услуги.\n\nЭто тестовая новость, события в ней вымышлены.",
    },
    topic: "services",
    views: 180,
    photo: burabay,
  },
];

export const news: readonly NewsItem[] = baseNews.map((item) => {
  const translation = newsTranslations[item.slug];
  if (!translation) throw new Error(`News ${item.slug} has no translations`);
  const { kk, en } = translation;
  return {
    ...item,
    title: { ru: item.title.ru, kk: kk.title, en: en.title },
    summary: { ru: item.summary.ru, kk: kk.summary, en: en.summary },
    body: { ru: item.body.ru, kk: kk.body, en: en.body },
    photo: { ...item.photo, alt: withAlt(item.photo.alt) },
  };
});
