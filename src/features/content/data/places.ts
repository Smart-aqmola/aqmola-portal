import type { Photo, Place } from "../domain/types";
import { placeTranslations, withAlt } from "./content-translations";
import { localPhotoUrl } from "./photo-files";

const LICENSE = "CC BY-SA 4.0";

function commonsPhoto(file: string, author: string, alt: Photo["alt"]): Photo {
  return {
    url: localPhotoUrl(file),
    alt,
    credit: {
      author,
      license: LICENSE,
      sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}`,
    },
  };
}

// Photos come from Wikimedia Commons and are fine for a test site; replace them before launch.
const basePlaces: readonly Place[] = [
  {
    id: "burabay",
    slug: "burabay",
    territoryId: "burabay",
    name: { ru: "Бурабай", kk: "Бурабай", en: "Burabay" },
    summary: { ru: "Национальный парк с озёрами и сосновыми горами." },
    description: {
      ru: "Бурабай известен озёрами, сосновыми лесами и невысокими горами. Здесь удобно проводить выходные и летом, и зимой.\n\nЭто тестовое описание: перед запуском его нужно заменить проверенным текстом.",
    },
    facts: ["nature", "lake", "rest"],
    photo: commonsPhoto("View_of_Burabay_lake_and_Kokshe_mountains.jpg", "Noiembrie", {
      ru: "Озеро Бурабай и горы Кокше",
    }),
  },
  {
    id: "okzhetpes",
    slug: "okzhetpes",
    territoryId: "burabay",
    name: { ru: "Скала Окжетпес", kk: "Оқжетпес жартасы", en: "Okzhetpes Rock" },
    summary: { ru: "Одна из самых известных скал Бурабая с видом на озеро." },
    description: {
      ru: "Скала с видом на озеро и сосновый лес, один из символов Бурабая. К ней идут пешие маршруты разной сложности.\n\nЭто тестовое описание: перед запуском его нужно заменить проверенным текстом.",
    },
    facts: ["nature", "lake"],
    photo: commonsPhoto(
      "%D0%9E%D0%BA%D0%B6%D0%B5%D1%82%D0%BF%D0%B5%D1%81_%D0%91%D1%83%D1%80%D0%B0%D0%B1%D0%B0%D0%B9.jpg",
      "Dots foto",
      { ru: "Скала Окжетпес в Бурабае" },
    ),
  },
  {
    id: "zerenda",
    slug: "zerenda",
    territoryId: "zerendi",
    name: { ru: "Зеренда", kk: "Зеренді", en: "Zerenda" },
    summary: { ru: "Озеро, леса и базы отдыха недалеко от Кокшетау." },
    description: {
      ru: "Зеренда привлекает озером, лесом и местами для отдыха. До неё удобно добраться из Кокшетау.\n\nЭто тестовое описание: перед запуском его нужно заменить проверенным текстом.",
    },
    facts: ["lake", "rest"],
    photo: commonsPhoto("Zerenda_June_07.jpg", "Saltanat-alikhanova", {
      ru: "Зеренда летом",
    }),
  },
  {
    id: "korgalzhyn",
    slug: "korgalzhyn",
    territoryId: "korgalzhyn",
    name: { ru: "Коргалжынский заповедник", kk: "Қорғалжың қорығы", en: "Korgalzhyn Reserve" },
    summary: { ru: "Заповедник на озёрах, где останавливаются фламинго." },
    description: {
      ru: "Заповедник охраняет озёра и степь, где останавливаются перелётные птицы. Туристам нужны разрешения и сопровождение, поэтому заранее уточняйте правила посещения.\n\nЭто тестовое описание: перед запуском его нужно заменить проверенным текстом.",
    },
    facts: ["reserve", "nature"],
    photo: commonsPhoto("Sunset_in_Korgalzhyn_Nature_Reserve.jpg", "Dildakhmet", {
      ru: "Закат в Коргалжынском заповеднике",
    }),
  },
  {
    id: "kokshetau-museum",
    slug: "kokshetau-museum",
    territoryId: "kokshetau",
    name: {
      ru: "Музей истории Кокшетау",
      kk: "Көкшетау тарихы мұражайы",
      en: "Kokshetau History Museum",
    },
    summary: { ru: "Музей в центре города: история края от древности до наших дней." },
    description: {
      ru: "Музей находится в центре Кокшетау и рассказывает об истории края. Подойдёт для спокойной прогулки по городу в любую погоду.\n\nЭто тестовое описание: перед запуском его нужно заменить проверенным текстом.",
    },
    facts: ["museum", "city"],
    photo: commonsPhoto("Museum_of_History_of_Kokshetau_in_March_2025.jpg", "Kristianmusic", {
      ru: "Музей истории Кокшетау",
    }),
  },
  {
    id: "stepnogorsk",
    slug: "stepnogorsk",
    territoryId: "stepnogorsk",
    name: { ru: "Степногорск", kk: "Степногор", en: "Stepnogorsk" },
    summary: { ru: "Город среди степи и озёр с широкими панорамами." },
    description: {
      ru: "Степногорск расположен среди степи и озёр, из города открываются широкие панорамы.\n\nЭто тестовое описание: перед запуском его нужно заменить проверенным текстом.",
    },
    facts: ["city", "nature"],
    photo: commonsPhoto(
      "%D0%A1%D1%82%D0%B5%D0%BF%D0%BD%D0%BE%D0%B3%D0%BE%D1%80%D1%81%D0%BA%2C_%D0%BF%D0%B0%D0%BD%D0%BE%D1%80%D0%B0%D0%BC%D0%B0.JPG",
      "Alexander Veretnov",
      { ru: "Панорама Степногорска" },
    ),
  },
];

export const places: readonly Place[] = basePlaces.map((place) => {
  const translation = placeTranslations[place.slug];
  if (!translation) throw new Error(`Place ${place.slug} has no translations`);
  const { kk, en } = translation;
  return {
    ...place,
    summary: { ru: place.summary.ru, kk: kk.summary, en: en.summary },
    description: { ru: place.description.ru, kk: kk.description, en: en.description },
    photo: { ...place.photo, alt: withAlt(place.photo.alt) },
  };
});
