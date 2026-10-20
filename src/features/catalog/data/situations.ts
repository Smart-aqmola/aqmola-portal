import type { Situation } from "../domain/types";

export const situations: readonly Situation[] = [
  {
    id: "meters",
    name: {
      ru: "Приборы учёта и показания",
      kk: "Есептеу құралдары мен көрсеткіштер",
      en: "Meters and readings",
    },
    summary: {
      ru: "Передача показаний, поверка, замена и опломбировка",
      kk: "Көрсеткіштерді беру, тексеру, ауыстыру және пломбалау",
      en: "Submitting readings, verification, replacement and sealing",
    },
  },
  {
    id: "connection",
    name: {
      ru: "Подключение и технические условия",
      kk: "Қосылу және техникалық шарттар",
      en: "Connection and technical conditions",
    },
    summary: {
      ru: "Вода, тепло, газ и электричество для дома и бизнеса",
      kk: "Үй мен бизнеске арналған су, жылу, газ және электр",
      en: "Water, heat, gas and electricity for homes and business",
    },
  },
  {
    id: "contracts",
    name: {
      ru: "Договоры, лицевые счета и ЕПД",
      kk: "Шарттар, дербес шоттар және бірыңғай төлем құжаты",
      en: "Contracts, accounts and bills",
    },
    summary: {
      ru: "Заключение, переоформление и электронные квитанции",
      kk: "Жасасу, қайта рәсімдеу және электрондық түбіртектер",
      en: "Signing, transferring and electronic bills",
    },
  },
  {
    id: "heating",
    name: { ru: "Отопительный сезон", kk: "Жылыту маусымы", en: "Heating season" },
    summary: {
      ru: "Подготовка дома, промывка, перерасчёт",
      kk: "Үйді дайындау, шаю, қайта есептеу",
      en: "Preparing the building, flushing, recalculation",
    },
  },
  {
    id: "housing",
    name: {
      ru: "Жильё и коммунальное хозяйство",
      kk: "Тұрғын үй және коммуналдық шаруашылық",
      en: "Housing and utilities",
    },
    summary: {
      ru: "ОСИ, вывоз отходов и ремонт общего имущества",
      kk: "ПИБ, қалдықтарды шығару және ортақ мүлікті жөндеу",
      en: "Homeowner associations, waste collection and shared-property repairs",
    },
  },
  {
    id: "construction",
    name: {
      ru: "Строительство и согласования",
      kk: "Құрылыс және келісулер",
      en: "Construction and approvals",
    },
    summary: {
      ru: "Эскизы, вывески, реклама и реконструкция",
      kk: "Эскиздер, маңдайшалар, жарнама және реконструкция",
      en: "Sketches, signs, advertising and reconstruction",
    },
  },
  {
    id: "business",
    name: {
      ru: "Бизнес и инвестиции",
      kk: "Бизнес және инвестициялар",
      en: "Business and investment",
    },
    summary: {
      ru: "Земля, поддержка и подключение к сетям",
      kk: "Жер, қолдау және желілерге қосылу",
      en: "Land, support measures and utility connections",
    },
  },
  {
    id: "appeals",
    name: {
      ru: "Обращения и качество услуг",
      kk: "Өтініштер және қызмет сапасы",
      en: "Appeals and service quality",
    },
    summary: {
      ru: "Аварии, жалобы, предложения и уведомления",
      kk: "Апаттар, шағымдар, ұсыныстар және хабарламалар",
      en: "Accidents, complaints, proposals and notifications",
    },
  },
];
