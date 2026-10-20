import type { Category } from "../domain/types";

// Same order as `sectors`, which is also the order of the category chips in the catalog.
export const categories: readonly Category[] = [
  {
    id: "water",
    name: {
      ru: "Водоснабжение и водоотведение",
      kk: "Сумен жабдықтау және су бұру",
      en: "Water supply and sewerage",
    },
  },
  { id: "heat", name: { ru: "Теплоснабжение", kk: "Жылумен жабдықтау", en: "Heating" } },
  {
    id: "electricity",
    name: { ru: "Электроснабжение", kk: "Электрмен жабдықтау", en: "Electricity" },
  },
  { id: "gas", name: { ru: "Газоснабжение", kk: "Газбен жабдықтау", en: "Gas supply" } },
  { id: "waste", name: { ru: "Вывоз ТБО", kk: "ҚТҚ шығару", en: "Waste collection" } },
  {
    id: "billing",
    name: { ru: "Лицевые счета и ЕПД", kk: "Дербес шоттар және БТҚ", en: "Accounts and bills" },
  },
  {
    id: "housing",
    name: { ru: "Жилищные вопросы", kk: "Тұрғын үй мәселелері", en: "Housing issues" },
  },
  {
    id: "architecture",
    name: {
      ru: "Архитектура и градостроительство",
      kk: "Сәулет және қала құрылысы",
      en: "Architecture and urban planning",
    },
  },
  {
    id: "business",
    name: {
      ru: "Бизнес и инвестиции",
      kk: "Бизнес және инвестициялар",
      en: "Business and investment",
    },
  },
  {
    id: "dispatch",
    name: { ru: "Обращения и аварии", kk: "Өтініштер мен апаттар", en: "Appeals and emergencies" },
  },
];
