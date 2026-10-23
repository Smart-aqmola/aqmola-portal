import type { Localized } from "@/shared/i18n/localized";

export type ContactCard = {
  name: Localized;
  phones: string[];
  email: string;
  address: Localized;
  hours: Localized;
};

// All contacts are made up: the numbers use 00-xx-xx and the mail is on the reserved .test domain,
// so nobody calls or writes to a real office.
export const operator: ContactCard & { coordinates: { lat: number; lon: number } } = {
  name: {
    ru: "ТОО «Aqmola Digital» (демо-оператор портала)",
    kk: "«Aqmola Digital» ЖШС (порталдың демо-операторы)",
    en: "Aqmola Digital LLP (demo operator of the portal)",
  },
  phones: ["+7 (7162) 00-10-01", "+7 (7162) 00-10-02"],
  email: "info@aqmola.test",
  address: {
    ru: "Кокшетау, улица Абая, 89 (демо-адрес)",
    kk: "Көкшетау, Абай көшесі, 89 (демо-мекенжай)",
    en: "Kokshetau, Abay street 89 (demo address)",
  },
  hours: { ru: "Пн–Пт, 09:00–18:00", kk: "Дс–Жм, 09:00–18:00", en: "Mon–Fri, 9:00–18:00" },
  coordinates: { lat: 53.2833, lon: 69.3833 },
};

/** Service desks of the providers, by organization id. */
export const providerContacts: Record<string, { phone: string; email: string; hours: Localized }> =
  {
    "akmola-water": {
      phone: "+7 (7162) 00-20-01",
      email: "water@aqmola.test",
      hours: operator.hours,
    },
    "akmola-heat": {
      phone: "+7 (7162) 00-20-02",
      email: "heat@aqmola.test",
      hours: operator.hours,
    },
    "akmola-grid": {
      phone: "+7 (7162) 00-20-03",
      email: "grid@aqmola.test",
      hours: operator.hours,
    },
    "akmola-energy-sales": {
      phone: "+7 (7162) 00-20-04",
      email: "energy@aqmola.test",
      hours: operator.hours,
    },
    "akmola-gas": { phone: "+7 (7162) 00-20-05", email: "gas@aqmola.test", hours: operator.hours },
    "kokshetau-eco": {
      phone: "+7 (7162) 00-20-06",
      email: "eco@aqmola.test",
      hours: operator.hours,
    },
    "region-eco": {
      phone: "+7 (7162) 00-20-07",
      email: "region-eco@aqmola.test",
      hours: operator.hours,
    },
    "billing-center": {
      phone: "+7 (7162) 00-20-08",
      email: "billing@aqmola.test",
      hours: operator.hours,
    },
    dispatch: {
      phone: "+7 (7162) 00-20-09",
      email: "dispatch@aqmola.test",
      hours: { ru: "Круглосуточно", kk: "Тәулік бойы", en: "24/7" },
    },
  };
