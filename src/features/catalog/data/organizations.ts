import type { Organization } from "../domain/types";
import { territories } from "./territories";

const everywhereExceptKokshetau = territories
  .map((territory) => territory.id)
  .filter((id) => id !== "kokshetau");

// All organizations are fictional. Names are generic on purpose so nobody mistakes them for real ones.
export const organizations: readonly Organization[] = [
  {
    id: "akmola-water",
    sector: "water",
    territories: "all",
    name: { ru: "Водоканал Акмолы", kk: "Ақмола су арнасы", en: "Akmola Water Utility" },
  },
  {
    id: "akmola-heat",
    sector: "heat",
    territories: "all",
    name: { ru: "Теплосети Акмолы", kk: "Ақмола жылу желілері", en: "Akmola Heating Networks" },
  },
  {
    id: "akmola-grid",
    sector: "electricity",
    territories: "all",
    name: { ru: "Электросети Акмолы", kk: "Ақмола электр желілері", en: "Akmola Power Grids" },
  },
  {
    id: "akmola-energy-sales",
    sector: "electricity",
    territories: "all",
    name: { ru: "Энергосбыт Акмолы", kk: "Ақмола энергиясбыт", en: "Akmola Energy Sales" },
  },
  {
    id: "akmola-gas",
    sector: "gas",
    territories: "all",
    name: { ru: "Газ Акмола", kk: "Газ Ақмола", en: "Akmola Gas" },
  },
  {
    id: "kokshetau-eco",
    sector: "waste",
    territories: ["kokshetau"],
    name: { ru: "Эко Кокшетау", kk: "Эко Көкшетау", en: "Eco Kokshetau" },
  },
  {
    id: "region-eco",
    sector: "waste",
    territories: everywhereExceptKokshetau,
    name: { ru: "Чистая область", kk: "Таза облыс", en: "Clean Region" },
  },
  {
    id: "billing-center",
    sector: "billing",
    territories: "all",
    name: {
      ru: "Единый расчётный центр",
      kk: "Бірыңғай есеп айырысу орталығы",
      en: "Unified Billing Center",
    },
  },
  {
    id: "dispatch",
    sector: "dispatch",
    territories: "all",
    name: {
      ru: "Единая диспетчерская",
      kk: "Бірыңғай диспетчерлік қызмет",
      en: "Unified Dispatch Service",
    },
  },
  {
    id: "architecture",
    sector: "architecture",
    territories: "all",
    name: {
      ru: "Отдел архитектуры района",
      kk: "Аудан сәулет бөлімі",
      en: "District Architecture Department",
    },
  },
  {
    id: "housing",
    sector: "housing",
    territories: "all",
    name: {
      ru: "Отдел ЖКХ района",
      kk: "Аудан тұрғын үй-коммуналдық шаруашылық бөлімі",
      en: "District Housing and Utilities Department",
    },
  },
  {
    id: "business-center",
    sector: "business",
    territories: "all",
    name: {
      ru: "Центр поддержки бизнеса",
      kk: "Бизнесті қолдау орталығы",
      en: "Business Support Center",
    },
  },
];
