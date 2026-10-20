import type { Territory } from "../domain/types";

// Test data. Check the list against the official administrative division before launch.
export const territories: readonly Territory[] = [
  { id: "kokshetau", kind: "city", name: { ru: "Кокшетау", kk: "Көкшетау", en: "Kokshetau" } },
  {
    id: "stepnogorsk",
    kind: "city",
    name: { ru: "Степногорск", kk: "Степногор", en: "Stepnogorsk" },
  },
  { id: "kosshy", kind: "city", name: { ru: "Косшы", kk: "Қосшы", en: "Kosshy" } },

  {
    id: "akkol",
    kind: "district",
    name: { ru: "Аккольский район", kk: "Ақкөл ауданы", en: "Akkol District" },
  },
  {
    id: "arshaly",
    kind: "district",
    name: { ru: "Аршалынский район", kk: "Аршалы ауданы", en: "Arshaly District" },
  },
  {
    id: "astrakhan",
    kind: "district",
    name: { ru: "Астраханский район", kk: "Астрахан ауданы", en: "Astrakhan District" },
  },
  {
    id: "atbasar",
    kind: "district",
    name: { ru: "Атбасарский район", kk: "Атбасар ауданы", en: "Atbasar District" },
  },
  {
    id: "birzhan-sal",
    kind: "district",
    name: { ru: "Район Биржан сал", kk: "Біржан сал ауданы", en: "Birzhan sal District" },
  },
  {
    id: "bulandy",
    kind: "district",
    name: { ru: "Буландынский район", kk: "Бұланды ауданы", en: "Bulandy District" },
  },
  {
    id: "burabay",
    kind: "district",
    name: { ru: "Бурабайский район", kk: "Бурабай ауданы", en: "Burabay District" },
  },
  {
    id: "egindykol",
    kind: "district",
    name: { ru: "Егиндыкольский район", kk: "Егіндікөл ауданы", en: "Egindykol District" },
  },
  {
    id: "ereymentau",
    kind: "district",
    name: { ru: "Ерейментауский район", kk: "Ерейментау ауданы", en: "Ereymentau District" },
  },
  {
    id: "esil",
    kind: "district",
    name: { ru: "Есильский район", kk: "Есіл ауданы", en: "Esil District" },
  },
  {
    id: "korgalzhyn",
    kind: "district",
    name: { ru: "Коргалжынский район", kk: "Қорғалжың ауданы", en: "Korgalzhyn District" },
  },
  {
    id: "sandyktau",
    kind: "district",
    name: { ru: "Сандыктауский район", kk: "Сандықтау ауданы", en: "Sandyktau District" },
  },
  {
    id: "shortandy",
    kind: "district",
    name: { ru: "Шортандинский район", kk: "Шортанды ауданы", en: "Shortandy District" },
  },
  {
    id: "tselinograd",
    kind: "district",
    name: { ru: "Целиноградский район", kk: "Целиноград ауданы", en: "Tselinograd District" },
  },
  {
    id: "zerendi",
    kind: "district",
    name: { ru: "Зерендинский район", kk: "Зеренді ауданы", en: "Zerendi District" },
  },
  {
    id: "zhaksy",
    kind: "district",
    name: { ru: "Жаксынский район", kk: "Жақсы ауданы", en: "Zhaksy District" },
  },
  {
    id: "zharkain",
    kind: "district",
    name: { ru: "Жаркаинский район", kk: "Жарқайың ауданы", en: "Zharkain District" },
  },
];
