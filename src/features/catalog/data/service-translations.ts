type Texts = { title: string; summary: string; fullTitle?: string };

/**
 * Kazakh and English texts of the test services, keyed by slug. Russian stays in services.ts.
 * The Kazakh is a draft by a non-native writer and must be reviewed by a native speaker.
 */
export const serviceTranslations: Record<string, { kk: Texts; en: Texts }> = {
  "water-meter-readings": {
    kk: {
      title: "Су есептегіштерінің көрсеткішін беру",
      summary:
        "Абоненттік бөлімге бармай-ақ суық және ыстық су есептегіштерінің көрсеткішін беріңіз.",
    },
    en: {
      title: "Submitting water meter readings",
      summary: "Send cold and hot water meter readings without visiting the customer office.",
    },
  },
  "electricity-meter-readings": {
    kk: {
      title: "Электр есептегішінің көрсеткішін беру",
      summary: "Ағымдағы көрсеткішті көрсетіңіз, есептеулер өздігінен қайта есептеледі.",
    },
    en: {
      title: "Submitting electricity meter readings",
      summary: "Enter the current reading and the charges are recalculated automatically.",
    },
  },
  "gas-meter-readings": {
    kk: {
      title: "Газ есептегішінің көрсеткішін беру",
      summary: "Газ қызметіне қоңырау шалудың орнына көрсеткішті онлайн беріңіз.",
    },
    en: {
      title: "Submitting gas meter readings",
      summary: "Send readings online instead of calling the gas service.",
    },
  },
  "electricity-meter-replacement": {
    kk: {
      title: "Электр есептегішін ауыстыру және тексеру",
      summary:
        "Есептегішті ауыстыруға немесе тексеруге жазылыңыз, шебер келісілген уақытта келеді.",
    },
    en: {
      title: "Electricity meter replacement and verification",
      summary: "Book a replacement or verification, and a technician comes at the agreed time.",
    },
  },
  "water-meter-sealing": {
    kk: {
      title: "Су өлшегішке пломба салу",
      summary: "Жаңа немесе тексерілген су есептегішіне пломба салуға өтінім.",
    },
    en: {
      title: "Sealing a water meter",
      summary: "An application to seal a new or verified water meter.",
    },
  },
  "gas-meter-sealing": {
    kk: {
      title: "Газ есептегішіне пломба салу",
      summary: "Маман пломба салу және саңылаусыздығын тексеру үшін шығады.",
    },
    en: {
      title: "Sealing a gas meter",
      summary: "A specialist visits to fit the seal and check the tightness.",
    },
  },
  "water-technical-conditions": {
    kk: {
      title: "Сумен жабдықтау және су бұру бойынша техникалық шарттар",
      summary: "Объектіні су және кәріз желілеріне қосу шарттарын алыңыз.",
      fullTitle:
        "Жеке және заңды тұлғаларға сумен жабдықтау және су бұру желілеріне қосылуға техникалық шарттар беру",
    },
    en: {
      title: "Technical conditions for water supply and sewerage",
      summary: "Get the conditions for connecting a property to the water and sewer networks.",
      fullTitle:
        "Issuing technical conditions for connection to water supply and sewerage networks for individuals and legal entities",
    },
  },
  "gas-connection": {
    kk: {
      title: "Жеке үйді газға қосу",
      summary: "Қосылу мүмкіндігін тексеру, техникалық шарттар және шарт.",
    },
    en: {
      title: "Connecting a private house to gas",
      summary: "A check of the connection possibility, technical conditions and a contract.",
    },
  },
  "electricity-technical-conditions": {
    kk: {
      title: "Электрмен жабдықтау бойынша техникалық шарттар",
      summary: "Тұрғын немесе тұрғын емес объектіні қосу үшін қуатты есептеу және шарттар.",
      fullTitle: "Жеке және заңды тұлғаларға электр желілеріне қосылуға техникалық шарттар беру",
    },
    en: {
      title: "Technical conditions for electricity supply",
      summary: "Power calculation and connection conditions for a residential or other property.",
      fullTitle:
        "Issuing technical conditions for connection to electric networks for individuals and legal entities",
    },
  },
  "heat-technical-conditions": {
    kk: {
      title: "Жылу желілеріне қосылуға техникалық шарттар",
      summary: "Жаңа ғимаратты орталықтандырылған жылытуға қосу шарттары.",
      fullTitle: "Заңды тұлғаларға объектіні жылу желілеріне қосуға техникалық шарттар беру",
    },
    en: {
      title: "Technical conditions for connection to heat networks",
      summary: "Conditions for connecting a new building to district heating.",
      fullTitle:
        "Issuing technical conditions for connecting a property to heat networks for legal entities",
    },
  },
  "storm-sewer-conditions": {
    kk: {
      title: "Нөсер кәрізіне техникалық шарттар",
      summary: "Құрылысшыларға жаңбыр және еріген суды бұру шарттары.",
    },
    en: {
      title: "Technical conditions for storm sewers",
      summary: "Rainwater and meltwater drainage conditions for developers.",
    },
  },
  "water-cut-in-business": {
    kk: {
      title: "Сумен жабдықтау желісіне қосылуға өтінім",
      summary: "Заңды тұлғаның жұмыс істеп тұрған су құбырына қосылуға өтінімі.",
    },
    en: {
      title: "Application to tap into the water supply network",
      summary: "A legal entity's application to connect to an existing water main.",
    },
  },
  "temporary-power": {
    kk: {
      title: "Құрылыс кезеңіне уақытша электрмен жабдықтау",
      summary: "Объект пайдалануға берілгенге дейін құрылыс алаңын қосу.",
    },
    en: {
      title: "Temporary power for the construction period",
      summary: "Connecting a construction site before the building is put into operation.",
    },
  },
  "account-owner-change": {
    kk: {
      title: "Меншік иесі ауысқанда жеке шотты қайта рәсімдеу",
      summary: "Жаңа меншік иесі кеңсеге бармай-ақ өз атына шот алады.",
      fullTitle:
        "Жылжымайтын мүлік объектісінің меншік иесі ауысқанда абоненттің жеке шотын қайта рәсімдеу",
    },
    en: {
      title: "Re-issuing a personal account when the owner changes",
      summary: "The new owner gets an account in their name without visiting an office.",
      fullTitle:
        "Re-issuing a subscriber's personal account when the owner of a real estate property changes",
    },
  },
  "epd-mailing": {
    kk: {
      title: "ЕТҚ электрондық таратуына қосылу",
      summary: "Бірыңғай төлем құжаты қағаз түбіртектің орнына электрондық поштаға келеді.",
      fullTitle: "Жеке тұлғалар үшін бірыңғай төлем құжатын (ЕТҚ) электрондық таратуға қосылу",
    },
    en: {
      title: "Joining the electronic mailing of the single payment document",
      summary: "The single payment document arrives by email instead of a paper bill.",
      fullTitle:
        "Joining the electronic mailing of the single payment document (SPD) for individuals",
    },
  },
  "residents-count-change": {
    kk: {
      title: "Жеке шоттағы тұрғындар санын өзгерту",
      summary: "Су және жылу бойынша есептеулер тұрғындар санына қарай қайта есептеледі.",
      fullTitle:
        "Жеке тұлғаларға коммуналдық қызмет көрсету кезінде абоненттің жеке шоттарындағы тұрғындар санын өзгерту",
    },
    en: {
      title: "Changing the number of residents on a personal account",
      summary: "Water and heating charges are recalculated for the number of residents.",
      fullTitle:
        "Changing the number of residents on a subscriber's personal accounts when providing utilities to individuals",
    },
  },
  "gas-contract": {
    kk: {
      title: "Газбен жабдықтау шартын жасасу",
      summary: "Шартқа онлайн қол қойыңыз, көшірмесі өтінімдеріңізде сақталады.",
    },
    en: {
      title: "Concluding a gas supply contract",
      summary: "Sign the contract online and a copy is kept in your applications.",
    },
  },
  "electricity-contract-resident": {
    kk: {
      title: "Пәтер немесе үй үшін электрмен жабдықтау шарты",
      summary: "Энергиямен жабдықтаушы ұйыммен шарт жасасу.",
    },
    en: {
      title: "Electricity supply contract for an apartment or a house",
      summary: "Concluding a contract with the energy supplier.",
    },
  },
  "electricity-contract-business": {
    kk: {
      title: "Заңды тұлғалар үшін электрмен жабдықтау шарты",
      summary: "Компаниялар мен ЖК үшін шартты жасасу және өзгерту.",
    },
    en: {
      title: "Electricity supply contract for legal entities",
      summary: "Concluding and amending a contract for companies and sole proprietors.",
    },
  },
  "water-contract-business": {
    kk: {
      title: "Заңды тұлғалар үшін сумен жабдықтау шартын қайта жасасу",
      summary: "Кеңсеге бармай-ақ шартты ұзарту немесе деректемелерді өзгерту.",
    },
    en: {
      title: "Renewing a water supply contract for legal entities",
      summary: "Extend a contract or change the details without visiting an office.",
    },
  },
  "tariff-change": {
    kk: {
      title: "Электр энергиясы тарифінің түрін өзгерту",
      summary: "Өз қалауыңыз бойынша бір немесе көп аймақты тарифке көшу.",
    },
    en: {
      title: "Changing the electricity tariff type",
      summary: "Switch to a single-zone or multi-zone tariff as you choose.",
    },
  },
  "heating-readiness-passport": {
    kk: {
      title: "Үйдің жылыту маусымына дайындық паспорты",
      summary: "МИБ және басқарушы компаниялар үшін: үйді тексеру және паспорт беру.",
      fullTitle: "Тұрғын үйдің жылыту маусымына дайындық паспортын рәсімдеу",
    },
    en: {
      title: "Building readiness passport for the heating season",
      summary: "For homeowners' associations and management companies: inspection and passport.",
      fullTitle: "Issuing a residential building's readiness passport for the heating season",
    },
  },
  "heating-flushing": {
    kk: {
      title: "Жылыту жүйесін шаюға және сынауға өтінім",
      summary: "Шаю күніне жазылыңыз және сынақ актісін алыңыз.",
    },
    en: {
      title: "Application for flushing and pressure testing of the heating system",
      summary: "Book a flushing date and receive the test report.",
    },
  },
  "heating-recalculation": {
    kk: {
      title: "Сапасыз жылыту үшін қайта есептеу",
      summary: "Пәтер суық болса, өтінім беріңіз, біз температураны тексереміз.",
    },
    en: {
      title: "Recalculation for poor heating",
      summary: "If the flat is cold, submit an application and we will check the temperature.",
    },
  },
  "heat-meter-installation": {
    kk: {
      title: "Жылу есептегішін орнату",
      summary: "Жобаны келісу және жылу есептеу құралын пайдалануға беру.",
    },
    en: {
      title: "Installing a heat meter",
      summary: "Project approval and commissioning of the heat metering device.",
    },
  },
  "heat-unit-check": {
    kk: {
      title: "Жылу торабын тексеру үшін маман шақыру",
      summary: "Радиаторлар біркелкі қызбаса немесе қысым түссе, шебер шығады.",
    },
    en: {
      title: "Calling a specialist to check the heat unit",
      summary: "A technician visits if radiators heat unevenly or the pressure drops.",
    },
  },
  "osi-registration": {
    kk: {
      title: "Мүлік иелерінің бірлестігін (МИБ) тіркеу",
      summary: "Қадамдық нұсқаулық, құжат үлгілері және консультация.",
    },
    en: {
      title: "Registering a homeowners' association",
      summary: "Step-by-step instructions, document templates and consultation.",
    },
  },
  "waste-contract-kokshetau": {
    kk: {
      title: "Көкшетауда ТҚО шығаруға шарт",
      summary: "Тұрмыстық қатты қалдықтарды шығаруға шарт жасасыңыз және кестені біліңіз.",
    },
    en: {
      title: "Solid waste removal contract in Kokshetau",
      summary: "Conclude a household waste removal contract and find out the schedule.",
    },
  },
  "waste-contract-region": {
    kk: {
      title: "Облыс қалалары мен аудандарында ТҚО шығаруға шарт",
      summary: "Жеке секторға және ұйымдарға қалдық шығаруға шарт.",
    },
    en: {
      title: "Waste removal contract in the cities and districts of the region",
      summary: "A waste removal contract for the private sector and organizations.",
    },
  },
  "waste-schedule-change": {
    kk: {
      title: "Қалдық шығару кестесін өзгерту",
      summary: "Үйіңіздің жанынан қалдық шығару күнін немесе уақытын өзгертуді сұраңыз.",
    },
    en: {
      title: "Changing the waste removal schedule",
      summary: "Ask to change the day or time of waste collection near your house.",
    },
  },
  "common-property-repair": {
    kk: {
      title: "Көппәтерлі үйдің ортақ мүлкін жөндеуге өтінім",
      summary: "Кіреберіс, шатыр, лифт немесе аула: өтінім аудандық ТКШ бөліміне түседі.",
    },
    en: {
      title: "Application to repair the common property of an apartment building",
      summary:
        "Entrance, roof, lift or yard: the request goes to the district utilities department.",
    },
  },
  "sketch-approval": {
    kk: {
      title: "Жеке үйдің эскизін келісу",
      summary: "Эскиздің қала құрылысы нормаларына сәйкестігін тексеру.",
    },
    en: {
      title: "Approval of a private house sketch",
      summary: "Checking that the sketch meets urban planning standards.",
    },
  },
  "sign-approval": {
    kk: {
      title: "Маңдайша орналастыруды келісу",
      summary: "Эскиз бен қасбет фотосын жүктеңіз, шешім жеке кабинетке келеді.",
      fullTitle: "Заңды тұлғаларға елді мекен аумағында маңдайша орналастыруды келісу",
    },
    en: {
      title: "Approval of a shop sign placement",
      summary: "Upload a sketch and a photo of the facade, and the decision comes to your account.",
      fullTitle: "Approval of placing a sign on the territory of a settlement for legal entities",
    },
  },
  "outdoor-advertising": {
    kk: {
      title: "Сыртқы жарнама орналастыру",
      summary: "Елді мекен шегінде жарнама құрылымына рұқсат.",
    },
    en: {
      title: "Placing outdoor advertising",
      summary: "A permit for an advertising structure within a settlement.",
    },
  },
  "reconstruction-approval": {
    kk: {
      title: "Қайта жоспарлау мен қайта жаңғыртуды келісу",
      summary: "Тұрғын немесе тұрғын емес ғимарат жобасындағы өзгерістерді келісу.",
    },
    en: {
      title: "Approval of remodeling and reconstruction",
      summary: "Approval of changes to the project of a residential or non-residential building.",
    },
  },
  "land-for-business": {
    kk: {
      title: "Бизнеске арналған жер учаскелері бойынша консультация",
      summary: "Қандай учаскелер бар, оларды қалай алуға болады және қандай құжат керек.",
    },
    en: {
      title: "Consultation on land plots for business",
      summary: "Which plots are available, how to get them and which documents are needed.",
    },
  },
  "support-measures": {
    kk: {
      title: "Мемлекеттік қолдау шараларын іріктеу",
      summary: "Бірнеше сұраққа жауап беріңіз, қандай қолдау сізге сәйкес екенін біліңіз.",
    },
    en: {
      title: "Choosing government support measures",
      summary: "Answer a few questions and find out which support suits you.",
    },
  },
  "investment-project-support": {
    kk: {
      title: "Инвестициялық жобаны сүйемелдеу",
      summary: "Жеке менеджер барлық келісуден өтуге көмектеседі.",
    },
    en: {
      title: "Support for an investment project",
      summary: "A personal manager helps you get through all the approvals.",
    },
  },
  "business-utility-connection": {
    kk: {
      title: "Бизнеске арналған желілерге қосылудың бірыңғай терезесі",
      summary: "Жаңа объектіге су, жылу, газ және электрге бір өтінім.",
    },
    en: {
      title: "One-stop utility connection for business",
      summary: "One application for water, heat, gas and electricity for a new property.",
    },
  },
  "report-accident": {
    kk: {
      title: "Желілердегі апат туралы хабарлау",
      summary: "Тәулік бойы қабылдау: мекенжайды көрсетіп, фото тіркеңіз.",
    },
    en: {
      title: "Reporting an accident on the networks",
      summary: "Accepted around the clock: give the address and attach a photo.",
    },
  },
  "service-quality-complaint": {
    kk: {
      title: "Коммуналдық қызмет сапасына шағым",
      summary: "Су, жылу, жарық немесе газ: мәселені сипаттаңыз, жауап мерзімінде келеді.",
    },
    en: {
      title: "Complaint about the quality of a utility service",
      summary: "Water, heat, power or gas: describe the problem and the answer comes on time.",
    },
  },
  "improvement-proposal": {
    kk: {
      title: "Аула абаттандыру бойынша ұсыныс",
      summary: "Аулада немесе көшеде нені жақсартуға болатынын ұсыныңыз да, қаралуын қадағалаңыз.",
    },
    en: {
      title: "Proposal to improve a yard",
      summary: "Suggest what to improve in a yard or street and follow how it is reviewed.",
    },
  },
  "outage-notifications": {
    kk: {
      title: "Жоспарлы өшірулер туралы хабарламаға жазылу",
      summary: "Мекенжайыңыз бойынша су, жарық және жылудың өшірілуі туралы хабарлама алыңыз.",
    },
    en: {
      title: "Subscribing to planned outage notifications",
      summary: "Get messages about water, power and heat outages at your address.",
    },
  },
  "water-contract-resident": {
    kk: {
      title: "Сумен жабдықтау және су бұру шартын жасасу",
      summary: "Кеңсеге бармай-ақ мекенжайыңыз бойынша сутоппен шарт жасаңыз.",
    },
    en: {
      title: "Signing a water supply and sewage contract",
      summary:
        "Sign a contract with the water utility for your address without visiting an office.",
    },
  },
  "heat-contract": {
    kk: {
      title: "Жылумен жабдықтау шартын жасасу",
      summary: "Объект мекенжайы бойынша жылу беруші ұйыммен шарт жасасуға өтініш беріңіз.",
    },
    en: {
      title: "Signing a heating supply contract",
      summary: "Apply for a contract with the heating company for your property address.",
    },
  },
  "meter-installation-replacement": {
    kk: {
      title: "Есептегішті орнату және ауыстыру",
      summary: "Жаңа есептегішті орнатуға немесе ақаулысын ауыстыруға жазылыңыз.",
    },
    en: {
      title: "Installing or replacing a meter",
      summary: "Book the installation of a new meter or the replacement of a faulty one.",
    },
  },
  "meter-unsealing": {
    kk: {
      title: "Есептеу құралынан пломбаны алу",
      summary: "Пломбаны жөндеу немесе құралды ауыстыру үшін алу керек болса, өтініш беріңіз.",
    },
    en: {
      title: "Removing a seal from a meter",
      summary: "Apply if the seal must be removed for repair or for replacing the meter.",
    },
  },
  "meter-verification": {
    kk: {
      title: "Есептегішті тексеру (поверка)",
      summary: "Есептеу құралын тексеру күнін белгілеңіз және алдыңғы тексеру құжаттарын тіркеңіз.",
    },
    en: {
      title: "Meter verification",
      summary:
        "Choose a date to verify the meter and attach the papers of the previous verification.",
    },
  },
  "unified-receipt": {
    kk: {
      title: "Бірыңғай түбіртек алу",
      summary:
        "Таңдалған ай үшін объектіңіздің барлық коммуналдық қызметтері бойынша бір түбіртек.",
    },
    en: {
      title: "Getting the unified receipt",
      summary: "One receipt for all utility services of your property for the chosen month.",
    },
  },
  "utility-payment": {
    kk: {
      title: "Коммуналдық қызметтерге төлеу",
      summary:
        "Қызметтерді бір сомамен төлеңіз немесе қайсысына төлейтініңізді таңдаңыз. Картаны тек банк бетінде енгізіңіз.",
    },
    en: {
      title: "Paying for utilities",
      summary:
        "Pay for services in one sum or choose which to pay. Enter your card only on the bank's page.",
    },
  },
  "recalculation-request": {
    kk: {
      title: "Қайта есептеуге өтініш беру",
      summary:
        "Есептеу көрсеткіштерге сәйкес келмесе немесе қызмет көрсетілмесе, қайта есептеуге өтініш беріңіз.",
    },
    en: {
      title: "Applying for a recalculation",
      summary:
        "If a charge does not match the readings or the service was not provided, apply for a recalculation.",
    },
  },
};
