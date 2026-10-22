import type { Locale } from "./config";

/**
 * The few words of the pages shown when something goes wrong. They live here rather than in the
 * big dictionaries because an error page must not depend on loading anything (spec 18.8): it
 * says what happened in plain words and never shows the reason inside the program.
 */
export const systemMessages: Record<
  Locale,
  {
    notFound: { title: string; text: string; home: string };
    error: { title: string; text: string; retry: string; home: string };
  }
> = {
  ru: {
    notFound: {
      title: "Страница не найдена",
      text: "Такой страницы нет или она переехала. Проверьте адрес или вернитесь на главную.",
      home: "На главную",
    },
    error: {
      title: "Что-то пошло не так",
      text: "Страница не открылась. Ваши данные на месте. Попробуйте ещё раз, а если не получится, зайдите позже.",
      retry: "Попробовать ещё раз",
      home: "На главную",
    },
  },
  kk: {
    notFound: {
      title: "Бет табылмады",
      text: "Мұндай бет жоқ немесе басқа жерге көшкен. Мекенжайды тексеріңіз немесе басты бетке оралыңыз.",
      home: "Басты бетке",
    },
    error: {
      title: "Бір нәрсе дұрыс болмады",
      text: "Бет ашылмады. Деректеріңіз орнында. Қайталап көріңіз, болмаса кейінірек кіріңіз.",
      retry: "Қайталап көру",
      home: "Басты бетке",
    },
  },
  en: {
    notFound: {
      title: "Page not found",
      text: "There is no such page, or it has moved. Check the address or go back to the home page.",
      home: "Home page",
    },
    error: {
      title: "Something went wrong",
      text: "The page did not open. Your data is safe. Try again, and if it still fails, come back later.",
      retry: "Try again",
      home: "Home page",
    },
  },
};
