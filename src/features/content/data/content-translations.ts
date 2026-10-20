import type { Localized } from "@/shared/i18n/localized";

type Pair<T> = { kk: T; en: T };
type Article = { title: string; summary: string; body: string };

/**
 * Kazakh and English texts of the test news, places and announcements. Russian stays in the data files.
 * The Kazakh is a draft by a non-native writer and must be reviewed by a native speaker.
 */
export const newsTranslations: Record<string, Pair<Article>> = {
  "heat-flushing-kokshetau": {
    kk: {
      title: "Көкшетауда қыс алдында жылу желілерін шаю басталды",
      summary: "Жұмыстар кесте бойынша жүріп жатыр, үйіңіздің күнін өтінімдерден тексеріңіз.",
      body: "Жылу желілерін шаю кесте бойынша өтіп жатыр. Үйіңіздің күнін өтінімдерден нақтылауға болады.\n\nЖұмыс кезінде радиаторлардың температурасы уақытша төмендеуі мүмкін.",
    },
    en: {
      title: "Heating network flushing before winter has started in Kokshetau",
      summary: "The work follows the schedule; check the date for your house in your applications.",
      body: "Flushing of the heating networks is going on schedule. You can check the date for your house in your applications.\n\nDuring the work the radiators may get cooler for a while.",
    },
  },
  "readings-online": {
    kk: {
      title: "Есептегіш көрсеткіштерін облыстың барлық аудандарында онлайн қабылдайды",
      summary: "Су, жарық және газ көрсеткішін кеңсеге бармай-ақ беруге болады.",
      body: "Су, жарық және газ көрсеткішін облыстың барлық аудандарында онлайн беруге болады. Кеңсеге келудің қажеті жоқ.\n\nҚызметті каталогтан тауып, сынақ өтінім беріңіз.",
    },
    en: {
      title: "Meter readings are accepted online in all districts of the region",
      summary: "Water, power and gas readings can be sent without visiting an office.",
      body: "Water, power and gas readings can be sent online in all districts of the region. There is no need to come to an office.\n\nFind the service in the catalog and submit a test application.",
    },
  },
  "burabay-water-schedule": {
    kk: {
      title: "Бурабай ауданы: суды жоспарлы өшіру кестесі",
      summary: "Өшіру бірнеше кентке әсер етеді, уақыты хабарламада көрсетілген.",
      body: "Бурабай ауданының бірнеше кентінде суды жоспарлы өшіру өтеді. Нақты уақыты хабарламада көрсетілген.\n\nСуды алдын ала жинап қойыңыз.",
    },
    en: {
      title: "Burabay District: schedule of planned water outages",
      summary: "The outages affect several villages; the time is given in the notification.",
      body: "Planned water outages will take place in several villages of Burabay District. The exact time is given in the notification.\n\nStore some water in advance.",
    },
  },
  "epd-electronic": {
    kk: {
      title: "Бірыңғай төлем құжатын электрондық поштамен алуға болады",
      summary: "Таратуды қызметтер каталогынан қосыңыз, қағаз түбіртекті болдырмауға болады.",
      body: "Бірыңғай төлем құжатын электрондық поштамен алуға болады. Таратуды қызметтер каталогынан қосуға болады.\n\nҚағаз түбіртекті сонымен бірге болдырмауға болады.",
    },
    en: {
      title: "The single payment document can be received by email",
      summary: "Turn on the mailing in the service catalog; the paper bill can be cancelled.",
      body: "The single payment document can be received by email. You can turn on the mailing in the service catalog.\n\nThe paper bill can be cancelled at the same time.",
    },
  },
  "zerendi-road-works": {
    kk: {
      title: "Зеренді ауданы: орталық көшеде су құбырын жөндеу",
      summary: "Күндіз су беру шектелген, кешке қалпына келтіреді.",
      body: "Зеренді ауданының орталық көшесінде су құбырын жөндеп жатыр. Күндіз су беру шектелген.\n\nКешке суды қайтаруға уәде беріп отыр.",
    },
    en: {
      title: "Zerendi District: water main repair on the central street",
      summary: "Water supply is limited during the day and will be restored by evening.",
      body: "A water main on the central street of Zerendi District is being repaired. Water supply is limited during the day.\n\nThe water is promised back by evening.",
    },
  },
  "heating-season-started": {
    kk: {
      title: "Облыста жылыту маусымы басталды",
      summary: "Пәтер суық болса, қайта есептеуге өтінім беріңіз.",
      body: "Облыста жылыту маусымы басталды. Пәтер суық болса, қайта есептеуге өтінім беріңіз.\n\nӨтінімді қызметтер каталогынан онлайн беруге болады.",
    },
    en: {
      title: "The heating season has started in the region",
      summary: "If your flat is cold, submit a recalculation application.",
      body: "The heating season has started in the region. If your flat is cold, submit a recalculation application.\n\nYou can submit the application online from the service catalog.",
    },
  },
  "stepnogorsk-embankment": {
    kk: {
      title: "Степногорскіде жағалауды абаттандырды",
      summary: "Жаңа жолдар мен орындықтар пайда болды, жұмыстар аяқталды.",
      body: "Степногорскіде жағалауды абаттандыру аяқталды: жолдар салынды, орындықтар мен жарық орнатылды.\n\nБұл сынақ жаңалық, оқиғалар ойдан шығарылған.",
    },
    en: {
      title: "The embankment in Stepnogorsk has been improved",
      summary: "New paths and benches have appeared; the work is finished.",
      body: "The improvement of the embankment in Stepnogorsk is finished: paths were laid, benches and lighting installed.\n\nThis is a test news item, the events in it are made up.",
    },
  },
  "kokshetau-bus-routes": {
    kk: {
      title: "Көкшетауда автобус маршруттары өзгерді",
      summary: "Кейбір маршруттар жаңа шағын аудандарға дейін ұзартылды.",
      body: "Көкшетауда автобус маршруттарының схемасы жаңартылды: кейбір желілер жаңа шағын аудандарға дейін ұзартылды.\n\nБұл сынақ жаңалық, оқиғалар ойдан шығарылған.",
    },
    en: {
      title: "Bus routes have changed in Kokshetau",
      summary: "Some routes were extended to the new neighborhoods.",
      body: "The bus route scheme in Kokshetau was updated: some lines were extended to the new neighborhoods.\n\nThis is a test news item, the events in it are made up.",
    },
  },
  "region-service-points": {
    kk: {
      title: "Қызмет көрсету пункттері жаңа кесте бойынша жұмыс істейді",
      summary: "Қабылдау сағаттары әр қызметтің карточкасында көрсетілген.",
      body: "Облыс аудандарындағы қызмет көрсету пункттері қабылдаудың жаңа кестесіне көшті. Жұмыс сағаттары қызмет карточкасында көрсетілген.\n\nБұл сынақ жаңалық, оқиғалар ойдан шығарылған.",
    },
    en: {
      title: "Service points work on a new schedule",
      summary: "The opening hours are given on the card of each service.",
      body: "Service points in the districts of the region moved to a new opening schedule. The hours are given on the service card.\n\nThis is a test news item, the events in it are made up.",
    },
  },
};

type PlaceTexts = { summary: string; description: string };

export const placeTranslations: Record<string, Pair<PlaceTexts>> = {
  burabay: {
    kk: {
      summary: "Көлдері мен қарағайлы таулары бар ұлттық саябақ.",
      description:
        "Бурабай көлдерімен, қарағайлы ормандарымен және аласа таулармен танымал. Мұнда жазда да, қыста да демалысты өткізу ыңғайлы.\n\nБұл сынақ сипаттама: іске қосар алдында оны тексерілген мәтінмен ауыстыру керек.",
    },
    en: {
      summary: "A national park with lakes and pine-covered mountains.",
      description:
        "Burabay is known for its lakes, pine forests and low mountains. It is a good place to spend a weekend both in summer and in winter.\n\nThis is a test description: it must be replaced with a checked text before launch.",
    },
  },
  okzhetpes: {
    kk: {
      summary: "Бурабайдың көлге қараған ең әйгілі жартастарының бірі.",
      description:
        "Көл мен қарағайлы орманға қараған жартас, Бурабайдың белгілерінің бірі. Оған әртүрлі күрделіктегі жаяу бағыттар апарады.\n\nБұл сынақ сипаттама: іске қосар алдында оны тексерілген мәтінмен ауыстыру керек.",
    },
    en: {
      summary: "One of the best-known rocks of Burabay with a view of the lake.",
      description:
        "A rock overlooking a lake and a pine forest, one of the symbols of Burabay. Walking routes of different difficulty lead to it.\n\nThis is a test description: it must be replaced with a checked text before launch.",
    },
  },
  zerenda: {
    kk: {
      summary: "Көкшетауға таяу көл, орман және демалыс базалары.",
      description:
        "Зеренді көлімен, ормандарымен және демалыс орындарымен тартымды. Көкшетаудан жету ыңғайлы.\n\nБұл сынақ сипаттама: іске қосар алдында оны тексерілген мәтінмен ауыстыру керек.",
    },
    en: {
      summary: "A lake, forests and holiday bases not far from Kokshetau.",
      description:
        "Zerenda attracts visitors with its lake, forest and places to rest. It is easy to reach from Kokshetau.\n\nThis is a test description: it must be replaced with a checked text before launch.",
    },
  },
  korgalzhyn: {
    kk: {
      summary: "Фламинголар аялдайтын көлдердегі қорық.",
      description:
        "Қорық көлдер мен далаға қорғау жасайды, мұнда қоныс аударатын құстар аялдайды. Туристерге рұқсат пен ілесіп жүру қажет, сондықтан келу ережесін алдын ала нақтылаңыз.\n\nБұл сынақ сипаттама: іске қосар алдында оны тексерілген мәтінмен ауыстыру керек.",
    },
    en: {
      summary: "A reserve on lakes where flamingos stop.",
      description:
        "The reserve protects lakes and steppe where migratory birds stop. Tourists need permits and an escort, so check the visiting rules in advance.\n\nThis is a test description: it must be replaced with a checked text before launch.",
    },
  },
  "kokshetau-museum": {
    kk: {
      summary: "Қала орталығындағы мұражай: өлке тарихы ежелгі заманнан бүгінге дейін.",
      description:
        "Мұражай Көкшетау орталығында орналасқан және өлке тарихын баяндайды. Кез келген ауа райында қаланы тыныш аралауға жарайды.\n\nБұл сынақ сипаттама: іске қосар алдында оны тексерілген мәтінмен ауыстыру керек.",
    },
    en: {
      summary: "A museum in the city center: the history of the land from ancient times to today.",
      description:
        "The museum is in the center of Kokshetau and tells the history of the land. It suits a quiet walk around the city in any weather.\n\nThis is a test description: it must be replaced with a checked text before launch.",
    },
  },
  stepnogorsk: {
    kk: {
      summary: "Дала мен көлдердің арасындағы қала, кең панорамалары бар.",
      description:
        "Степногорск дала мен көлдердің арасында орналасқан, қаладан кең панорамалар ашылады.\n\nБұл сынақ сипаттама: іске қосар алдында оны тексерілген мәтінмен ауыстыру керек.",
    },
    en: {
      summary: "A city among the steppe and lakes with wide panoramas.",
      description:
        "Stepnogorsk lies among the steppe and lakes, and wide panoramas open from the city.\n\nThis is a test description: it must be replaced with a checked text before launch.",
    },
  },
};

export const comingSoonTranslations: Record<string, Pair<{ title: string; summary: string }>> = {
  "social-support": {
    kk: {
      title: "Әлеуметтік қолдау",
      summary: "Жеңілдіктер мен жәрдемақылар онлайн, өтінім күйін қадағалау мүмкіндігімен.",
    },
    en: {
      title: "Social support",
      summary: "Benefits and allowances online with tracking of the application status.",
    },
  },
  "appeals-109": {
    kk: {
      title: "109 өтініштері",
      summary: "Аудан әкімдігімен байланыс: шағымдар мен ұсыныстар.",
    },
    en: {
      title: "Appeals 109",
      summary: "Contact with the district administration: complaints and suggestions.",
    },
  },
  transport: {
    kk: { title: "Көлік", summary: "Аудандар арасындағы маршруттар мен кесте." },
    en: { title: "Transport", summary: "Intercity routes and timetables." },
  },
  libraries: {
    kk: { title: "Кітапханалар", summary: "Оқырман билеті және кітаптарды брондау." },
    en: { title: "Libraries", summary: "A reader's card and book reservations." },
  },
};

/** Photo captions, keyed by the Russian text. */
export const photoAltTranslations: Record<string, { kk: string; en: string }> = {
  "Музей истории Кокшетау": {
    kk: "Көкшетау тарихы мұражайы",
    en: "Kokshetau History Museum",
  },
  "Зеренда летом": { kk: "Зеренді жазда", en: "Zerenda in summer" },
  "Озеро Бурабай": { kk: "Бурабай көлі", en: "Lake Burabay" },
  "Озеро Бурабай и горы Кокше": {
    kk: "Бурабай көлі мен Көкше таулары",
    en: "Lake Burabay and the Kokshe mountains",
  },
  "Скала Окжетпес в Бурабае": {
    kk: "Бурабайдағы Оқжетпес жартасы",
    en: "Okzhetpes Rock in Burabay",
  },
  "Закат в Коргалжынском заповеднике": {
    kk: "Қорғалжың қорығындағы күн батуы",
    en: "Sunset in the Korgalzhyn Reserve",
  },
  "Панорама Степногорска": { kk: "Степногорск панорамасы", en: "Panorama of Stepnogorsk" },
};

/** Fills in the Kazakh and English caption of a photo when we have one. */
export function withAlt(alt: Localized): Localized {
  const translation = photoAltTranslations[alt.ru];
  return translation ? { ru: alt.ru, kk: translation.kk, en: translation.en } : alt;
}
