import type { Sector } from "@/features/catalog/domain/types";
import type { Localized } from "@/shared/i18n/localized";

/**
 * Test address directory (spec 3.2). Streets and villages are fictional picks, not an official
 * register; the backend replaces this with the real address register.
 * `without` lists the networks a place does not have, so the demo can show "your address is not
 * served" (spec 1.5): many villages have no gas pipeline.
 */
export type AddressEntry = {
  id: string;
  territoryId: string;
  locality: Localized;
  street: Localized;
  without?: readonly Sector[];
};

const kokshetau = { ru: "Кокшетау", kk: "Көкшетау" };
const stepnogorsk = { ru: "Степногорск", kk: "Степногор" };
const kosshy = { ru: "Косшы", kk: "Қосшы" };
const akkol = { ru: "Акколь", kk: "Ақкөл" };
const atbasar = { ru: "Атбасар", kk: "Атбасар" };
const shchuchinsk = { ru: "Щучинск", kk: "Щучинск" };

const central = { ru: "улица Центральная", kk: "Орталық көшесі" };
const school = { ru: "улица Школьная", kk: "Мектеп көшесі" };
const abay = { ru: "улица Абая", kk: "Абай көшесі" };
const auezov = { ru: "улица Ауэзова", kk: "Әуезов көшесі" };
const mira = { ru: "улица Мира", kk: "Бейбітшілік көшесі" };
const beybitshilik = { ru: "улица Бейбитшилик", kk: "Бейбітшілік көшесі" };
const pobedy = { ru: "улица Победы", kk: "Жеңіс көшесі" };

export const addressDirectory: readonly AddressEntry[] = [
  { id: "kokshetau-abay", territoryId: "kokshetau", locality: kokshetau, street: abay },
  {
    id: "kokshetau-gorky",
    territoryId: "kokshetau",
    locality: kokshetau,
    street: { ru: "улица Горького", kk: "Горький көшесі" },
  },
  { id: "kokshetau-auezov", territoryId: "kokshetau", locality: kokshetau, street: auezov },
  {
    id: "kokshetau-nazarbayev",
    territoryId: "kokshetau",
    locality: kokshetau,
    street: { ru: "проспект Назарбаева", kk: "Назарбаев даңғылы" },
  },
  {
    id: "kokshetau-satpayev",
    territoryId: "kokshetau",
    locality: kokshetau,
    street: { ru: "улица Сатпаева", kk: "Сәтбаев көшесі" },
  },
  {
    id: "kokshetau-momyshuly",
    territoryId: "kokshetau",
    locality: kokshetau,
    street: { ru: "улица Момышулы", kk: "Момышұлы көшесі" },
  },
  {
    id: "kokshetau-kenesary",
    territoryId: "kokshetau",
    locality: kokshetau,
    street: { ru: "улица Кенесары", kk: "Кенесары көшесі" },
  },

  {
    id: "stepnogorsk-mkr1",
    territoryId: "stepnogorsk",
    locality: stepnogorsk,
    street: { ru: "микрорайон 1", kk: "1-шағын аудан" },
  },
  {
    id: "stepnogorsk-mkr4",
    territoryId: "stepnogorsk",
    locality: stepnogorsk,
    street: { ru: "микрорайон 4", kk: "4-шағын аудан" },
  },
  {
    id: "stepnogorsk-mkr6",
    territoryId: "stepnogorsk",
    locality: stepnogorsk,
    street: { ru: "микрорайон 6", kk: "6-шағын аудан" },
  },

  { id: "kosshy-mira", territoryId: "kosshy", locality: kosshy, street: mira },
  { id: "kosshy-central", territoryId: "kosshy", locality: kosshy, street: central },

  {
    id: "akkol-zheltoksan",
    territoryId: "akkol",
    locality: akkol,
    street: { ru: "улица Желтоксан", kk: "Желтоқсан көшесі" },
  },
  { id: "akkol-auezov", territoryId: "akkol", locality: akkol, street: auezov },
  {
    id: "akkol-novorybinka",
    territoryId: "akkol",
    locality: { ru: "Новорыбинка", kk: "Новорыбинка" },
    street: school,
    without: ["gas"],
  },

  {
    id: "atbasar-valikhanov",
    territoryId: "atbasar",
    locality: atbasar,
    street: { ru: "улица Валиханова", kk: "Уәлиханов көшесі" },
  },
  { id: "atbasar-pobedy", territoryId: "atbasar", locality: atbasar, street: pobedy },
  {
    id: "atbasar-marinovka",
    territoryId: "atbasar",
    locality: { ru: "Мариновка", kk: "Мариновка" },
    street: central,
    without: ["gas", "heat"],
  },

  {
    id: "burabay-shchuchinsk-kabanbay",
    territoryId: "burabay",
    locality: shchuchinsk,
    street: { ru: "улица Кабанбай батыра", kk: "Қабанбай батыр көшесі" },
  },
  {
    id: "burabay-shchuchinsk-auezov",
    territoryId: "burabay",
    locality: shchuchinsk,
    street: auezov,
  },
  {
    id: "burabay-resort",
    territoryId: "burabay",
    locality: { ru: "Бурабай", kk: "Бурабай" },
    street: { ru: "улица Абылай хана", kk: "Абылай хан көшесі" },
  },
  {
    id: "burabay-katarkol",
    territoryId: "burabay",
    locality: { ru: "Катарколь", kk: "Қатарколь" },
    street: { ru: "улица Советская", kk: "Кеңес көшесі" },
    without: ["gas"],
  },

  {
    id: "shortandy-beybitshilik",
    territoryId: "shortandy",
    locality: { ru: "Шортанды", kk: "Шортанды" },
    street: beybitshilik,
  },

  {
    id: "zerendi-abay",
    territoryId: "zerendi",
    locality: { ru: "Зеренда", kk: "Зеренді" },
    street: abay,
  },
  {
    id: "zerendi-birlestik",
    territoryId: "zerendi",
    locality: { ru: "Бирлестик", kk: "Бірлестік" },
    street: central,
    without: ["gas"],
  },

  {
    id: "arshaly-tauelsizdik",
    territoryId: "arshaly",
    locality: { ru: "Аршалы", kk: "Аршалы" },
    street: { ru: "улица Тауелсиздик", kk: "Тәуелсіздік көшесі" },
  },
  {
    id: "arshaly-turgenevka",
    territoryId: "arshaly",
    locality: { ru: "Тургеневка", kk: "Тургеневка" },
    street: { ru: "улица Садовая", kk: "Бақ көшесі" },
    without: ["gas"],
  },

  {
    id: "tselinograd-akmol",
    territoryId: "tselinograd",
    locality: { ru: "Акмол", kk: "Ақмол" },
    street: beybitshilik,
  },
  {
    id: "tselinograd-karaotkel",
    territoryId: "tselinograd",
    locality: { ru: "Караоткель", kk: "Қараөткел" },
    street: school,
    without: ["gas"],
  },

  {
    id: "esil-mira",
    territoryId: "esil",
    locality: { ru: "Есиль", kk: "Есіл" },
    street: mira,
  },
  {
    id: "korgalzhyn-pobedy",
    territoryId: "korgalzhyn",
    locality: { ru: "Коргалжын", kk: "Қорғалжың" },
    street: pobedy,
    without: ["gas", "heat"],
  },
  {
    id: "ereymentau-abay",
    territoryId: "ereymentau",
    locality: { ru: "Ерейментау", kk: "Ерейментау" },
    street: abay,
  },
  {
    id: "sandyktau-balkashino",
    territoryId: "sandyktau",
    locality: { ru: "Балкашино", kk: "Балқашино" },
    street: central,
    without: ["gas"],
  },
];
