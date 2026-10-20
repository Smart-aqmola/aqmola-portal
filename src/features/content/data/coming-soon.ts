import type { ComingSoonItem } from "../domain/types";
import { comingSoonTranslations } from "./content-translations";

const baseComingSoon: readonly ComingSoonItem[] = [
  {
    id: "social-support",
    title: { ru: "Социальная поддержка" },
    summary: { ru: "Льготы и пособия онлайн с отслеживанием статуса заявки." },
  },
  {
    id: "appeals-109",
    title: { ru: "Обращения 109" },
    summary: { ru: "Связь с акиматом района: жалобы и предложения." },
  },
  {
    id: "transport",
    title: { ru: "Транспорт" },
    summary: { ru: "Межрайонные маршруты и расписание." },
  },
  {
    id: "libraries",
    title: { ru: "Библиотеки" },
    summary: { ru: "Читательский билет и бронирование книг." },
  },
];

export const comingSoon: readonly ComingSoonItem[] = baseComingSoon.map((item) => {
  const translation = comingSoonTranslations[item.id];
  if (!translation) throw new Error(`Announcement ${item.id} has no translations`);
  const { kk, en } = translation;
  return {
    ...item,
    title: { ru: item.title.ru, kk: kk.title, en: en.title },
    summary: { ru: item.summary.ru, kk: kk.summary, en: en.summary },
  };
});
