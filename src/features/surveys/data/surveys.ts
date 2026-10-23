import type { Survey } from "../domain/types";

/** When a survey ends, counted from today, so the demo always has open and finished ones. */
export type SurveySeed = Omit<Survey, "endsOn"> & { endsInDays: number };

// All surveys and their starting votes are made up for the test portal.
export const surveySeeds: readonly SurveySeed[] = [
  {
    id: "s-heating",
    slug: "heating-season",
    category: "utilities",
    title: {
      ru: "Как прошёл старт отопительного сезона",
      kk: "Жылу беру маусымы қалай басталды",
      en: "How the heating season started",
    },
    summary: {
      ru: "Расскажите, вовремя ли дали тепло и тепло ли сейчас дома.",
      kk: "Жылу уақытында берілді ме және қазір үйде жылы ма, айтып беріңіз.",
      en: "Tell us whether the heat came on time and whether your home is warm now.",
    },
    description: {
      ru: "Опрос нужен, чтобы понять, в каких районах тепло дали с опозданием и где в квартирах холодно.\n\nОтветы обезличены: мы не спрашиваем адрес и имя.",
      kk: "Сауалнама қай аудандарда жылу кешігіп берілгенін және қай пәтерлерде суық екенін түсіну үшін қажет.\n\nЖауаптар иесіз: мекенжай мен атыңызды сұрамаймыз.",
      en: "The survey shows in which districts the heat came late and where flats are cold.\n\nThe answers are anonymous: we do not ask for an address or a name.",
    },
    impact: {
      ru: "Сводку получат теплоснабжающие организации и отдел ЖКХ; районы с жалобами проверят в первую очередь.",
      kk: "Қорытындыны жылумен жабдықтаушы ұйымдар мен ТКШ бөлімі алады; шағымы бар аудандар бірінші тексеріледі.",
      en: "The summary goes to the heat suppliers and the housing department; districts with complaints are checked first.",
    },
    endsInDays: 37,
    minutes: 3,
    participants: 1284,
    popular: true,
    questions: [
      {
        id: "q-on-time",
        kind: "single",
        text: {
          ru: "Тепло в вашем доме дали вовремя?",
          kk: "Үйіңізге жылу уақытында берілді ме?",
          en: "Did your home get heat on time?",
        },
        options: [
          {
            id: "yes",
            text: { ru: "Да, в срок", kk: "Иә, уақытында", en: "Yes, on time" },
            votes: 812,
          },
          {
            id: "late",
            text: {
              ru: "С опозданием на несколько дней",
              kk: "Бірнеше күн кешігіп",
              en: "A few days late",
            },
            votes: 341,
          },
          {
            id: "not-yet",
            text: { ru: "Тепла до сих пор нет", kk: "Жылу әлі жоқ", en: "Still no heat" },
            votes: 63,
          },
          {
            id: "unknown",
            text: { ru: "Затрудняюсь ответить", kk: "Жауап беру қиын", en: "Hard to say" },
            votes: 68,
          },
        ],
      },
      {
        id: "q-warm",
        kind: "single",
        text: {
          ru: "Насколько тепло у вас дома сейчас?",
          kk: "Қазір үйіңіз қаншалықты жылы?",
          en: "How warm is your home now?",
        },
        options: [
          { id: "warm", text: { ru: "Тепло", kk: "Жылы", en: "Warm" }, votes: 704 },
          { id: "cool", text: { ru: "Прохладно", kk: "Салқын", en: "Cool" }, votes: 455 },
          { id: "cold", text: { ru: "Холодно", kk: "Суық", en: "Cold" }, votes: 125 },
        ],
      },
    ],
  },
  {
    id: "s-portal",
    slug: "portal-feedback",
    category: "digital",
    title: {
      ru: "Удобно ли пользоваться порталом",
      kk: "Порталды пайдалану ыңғайлы ма",
      en: "Is the portal easy to use",
    },
    summary: {
      ru: "Помогите сделать портал понятнее: что вы делаете чаще всего и чего не хватает.",
      kk: "Порталды түсініктірек етуге көмектесіңіз: жиі не істейсіз және не жетіспейді.",
      en: "Help make the portal clearer: what you do most often and what is missing.",
    },
    description: {
      ru: "Портал только запускается, и нам важно, какие услуги нужны в первую очередь.\n\nМожно выбрать несколько вариантов.",
      kk: "Портал енді ғана іске қосылып жатыр, қай қызметтер бірінші кезекте қажет екені біз үшін маңызды.\n\nБірнеше нұсқаны таңдауға болады.",
      en: "The portal is just starting, and we want to know which services are needed first.\n\nYou can choose several answers.",
    },
    impact: {
      ru: "Самые частые пожелания попадут в план развития портала на следующий квартал.",
      kk: "Ең жиі тілектер келесі тоқсанға арналған порталды дамыту жоспарына енеді.",
      en: "The most frequent wishes go into the portal development plan for the next quarter.",
    },
    endsInDays: 60,
    minutes: 2,
    participants: 642,
    popular: true,
    questions: [
      {
        id: "q-tasks",
        kind: "multiple",
        text: {
          ru: "Что вы делаете на портале чаще всего?",
          kk: "Порталда көбіне не істейсіз?",
          en: "What do you do on the portal most often?",
        },
        options: [
          {
            id: "readings",
            text: { ru: "Передаю показания", kk: "Көрсеткіш беремін", en: "Submit meter readings" },
            votes: 390,
          },
          {
            id: "pay",
            text: { ru: "Оплачиваю услуги", kk: "Қызметтерді төлеймін", en: "Pay for services" },
            votes: 351,
          },
          {
            id: "contracts",
            text: { ru: "Оформляю договоры", kk: "Шарт рәсімдеймін", en: "Sign contracts" },
            votes: 120,
          },
          {
            id: "appeals",
            text: { ru: "Пишу обращения", kk: "Өтініш жазамын", en: "Write appeals" },
            votes: 97,
          },
        ],
      },
      {
        id: "q-easy",
        kind: "single",
        text: {
          ru: "Насколько легко было найти нужную услугу?",
          kk: "Қажетті қызметті табу қаншалықты оңай болды?",
          en: "How easy was it to find the service you needed?",
        },
        options: [
          { id: "easy", text: { ru: "Легко", kk: "Оңай", en: "Easy" }, votes: 401 },
          { id: "ok", text: { ru: "Нормально", kk: "Қалыпты", en: "Fine" }, votes: 188 },
          { id: "hard", text: { ru: "Сложно", kk: "Қиын", en: "Hard" }, votes: 53 },
        ],
      },
    ],
  },
  {
    id: "s-yards",
    slug: "yard-improvement",
    category: "city",
    title: {
      ru: "Благоустройство дворов в 2027 году",
      kk: "2027 жылы аулаларды абаттандыру",
      en: "Improving yards in 2027",
    },
    summary: {
      ru: "Выберите, что в первую очередь нужно вашему двору.",
      kk: "Аулаңызға бірінші кезекте не қажет екенін таңдаңыз.",
      en: "Choose what your yard needs first.",
    },
    description: {
      ru: "По итогам опроса составят список работ по дворам на следующий год.\n\nМожно выбрать несколько вариантов.",
      kk: "Сауалнама қорытындысы бойынша келесі жылға аулалардағы жұмыстар тізімі жасалады.\n\nБірнеше нұсқаны таңдауға болады.",
      en: "The results become the list of yard works for next year.\n\nYou can choose several answers.",
    },
    impact: {
      ru: "Работы с наибольшим числом голосов войдут в программу благоустройства 2027 года.",
      kk: "Ең көп дауыс алған жұмыстар 2027 жылғы абаттандыру бағдарламасына енеді.",
      en: "The works with the most votes enter the 2027 improvement programme.",
    },
    endsInDays: 10,
    minutes: 2,
    participants: 2017,
    popular: false,
    questions: [
      {
        id: "q-needs",
        kind: "multiple",
        text: {
          ru: "Что нужно вашему двору?",
          kk: "Аулаңызға не керек?",
          en: "What does your yard need?",
        },
        options: [
          {
            id: "playground",
            text: { ru: "Детская площадка", kk: "Балалар алаңы", en: "Playground" },
            votes: 920,
          },
          {
            id: "light",
            text: { ru: "Освещение", kk: "Жарықтандыру", en: "Lighting" },
            votes: 845,
          },
          { id: "parking", text: { ru: "Парковка", kk: "Тұрақ", en: "Parking" }, votes: 701 },
          {
            id: "trees",
            text: { ru: "Деревья и газоны", kk: "Ағаштар мен көгалдар", en: "Trees and lawns" },
            votes: 512,
          },
          {
            id: "benches",
            text: {
              ru: "Скамейки и урны",
              kk: "Орындықтар мен қоқыс жәшіктері",
              en: "Benches and bins",
            },
            votes: 388,
          },
        ],
      },
    ],
  },
  {
    id: "s-waste",
    slug: "waste-sorting",
    category: "ecology",
    title: {
      ru: "Раздельный сбор мусора",
      kk: "Қоқысты бөлек жинау",
      en: "Separate waste collection",
    },
    summary: {
      ru: "Готовы ли вы сортировать отходы, если рядом поставят контейнеры?",
      kk: "Жақын жерге контейнерлер қойылса, қалдықтарды сұрыптауға дайынсыз ба?",
      en: "Would you sort your waste if containers were placed nearby?",
    },
    description: {
      ru: "Опрос поможет понять, где ставить контейнеры для пластика, бумаги и стекла.\n\nЗаймёт одну минуту.",
      kk: "Сауалнама пластик, қағаз және шыныға арналған контейнерлерді қайда қою керектігін түсінуге көмектеседі.\n\nБір минут алады.",
      en: "The survey shows where to place containers for plastic, paper and glass.\n\nIt takes one minute.",
    },
    impact: {
      ru: "Первые площадки для раздельного сбора поставят в районах с наибольшей готовностью жителей.",
      kk: "Бөлек жинауға арналған алғашқы алаңдар тұрғындар дайындығы ең жоғары аудандарда қойылады.",
      en: "The first sorting points go to the districts where residents are most ready.",
    },
    endsInDays: 24,
    minutes: 1,
    participants: 903,
    popular: false,
    questions: [
      {
        id: "q-ready",
        kind: "single",
        text: {
          ru: "Будете сортировать мусор?",
          kk: "Қоқысты сұрыптайсыз ба?",
          en: "Will you sort your waste?",
        },
        options: [
          {
            id: "yes",
            text: { ru: "Да, обязательно", kk: "Иә, міндетті түрде", en: "Yes, for sure" },
            votes: 512,
          },
          {
            id: "maybe",
            text: { ru: "Если будет удобно", kk: "Ыңғайлы болса", en: "If it is convenient" },
            votes: 301,
          },
          { id: "no", text: { ru: "Нет", kk: "Жоқ", en: "No" }, votes: 90 },
        ],
      },
    ],
  },
  {
    id: "s-burabay",
    slug: "burabay-trip",
    category: "tourism",
    title: {
      ru: "Поездка в Бурабай летом",
      kk: "Жазда Бурабайға сапар",
      en: "A summer trip to Burabay",
    },
    summary: {
      ru: "Опрос завершён: смотрите, как отдыхающие оценили сезон.",
      kk: "Сауалнама аяқталды: демалушылар маусымды қалай бағалағанын қараңыз.",
      en: "The survey is over: see how visitors rated the season.",
    },
    description: {
      ru: "Опрос проходил летом среди отдыхающих Бурабая.\n\nГолосование закрыто, результаты открыты для всех.",
      kk: "Сауалнама жазда Бурабай демалушылары арасында өтті.\n\nДауыс беру жабылды, нәтижелер барлығына ашық.",
      en: "The survey ran in summer among visitors of Burabay.\n\nVoting is closed; the results are open to everyone.",
    },
    impact: {
      ru: "По итогам добавили автобусные рейсы выходного дня и новые урны на пляжах.",
      kk: "Қорытындысы бойынша демалыс күнгі автобус рейстері мен жағажайларға жаңа қоқыс жәшіктері қосылды.",
      en: "As a result, weekend buses and new bins on the beaches were added.",
    },
    endsInDays: -20,
    minutes: 2,
    participants: 3410,
    popular: false,
    questions: [
      {
        id: "q-rate",
        kind: "single",
        text: {
          ru: "Как вы оцените отдых?",
          kk: "Демалысты қалай бағалайсыз?",
          en: "How would you rate your stay?",
        },
        options: [
          { id: "great", text: { ru: "Отлично", kk: "Өте жақсы", en: "Great" }, votes: 1720 },
          { id: "good", text: { ru: "Хорошо", kk: "Жақсы", en: "Good" }, votes: 1190 },
          { id: "bad", text: { ru: "Плохо", kk: "Нашар", en: "Poor" }, votes: 500 },
        ],
      },
    ],
  },
];
