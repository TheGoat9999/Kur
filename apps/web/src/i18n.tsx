import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'bg' | 'en';

const en = {
  'common.loading': 'Loading…',
  'common.close': 'Close',
  'common.clear': 'Clear',
  'common.active': 'Active',
  'common.locked': 'Locked',
  'common.available': 'available',
  'common.unavailable': 'unavailable',
  'common.backendLive': 'Backend live',
  'common.actionBlocked': 'Action blocked',
  'common.dismiss': 'Dismiss notification',
  'common.language': 'Language',
  'common.languageChanged': 'Language changed',
  'common.languageChangedMessage': 'The interface is now in English.',
  'common.notifications': 'Notifications',
  'shell.persistentCity': 'Persistent city',
  'shell.closeNavigation': 'Close navigation',
  'shell.openNavigation': 'Open navigation',
  'shell.expandSidebar': 'Expand sidebar',
  'shell.collapseSidebar': 'Collapse sidebar',
  'shell.navigation': 'Game navigation',
  'shell.noCharacter': 'No active character',
  'shell.sessionOnline': 'Session online',
  'shell.serverTime': 'Server time',
  'shell.shard': 'Shard',
  'shell.cash': 'Cash',
  'nav.city': 'City',
  'nav.progression': 'Progression',
  'nav.assets': 'Assets',
  'nav.institutions': 'Institutions',
  'nav.world': 'World',
  'nav.character': 'Character',
  'nav.inventory': 'Inventory',
  'nav.finance': 'Finance',
  'nav.jobs': 'Jobs & Careers',
  'nav.vehicles': 'My Vehicles',
  'nav.property': 'Real Estate',
  'nav.hospitality': 'Hospitality',
  'nav.police': 'Police',
  'stage.live': 'Playable',
  'stage.foundation': 'Foundation',
  'stage.migration': 'Prototype migration',
  'hud.health': 'Health',
  'hud.energy': 'Energy',
  'hud.satiety': 'Satiety',
  'hud.hydration': 'Hydration',
  'hud.stress': 'Stress',
  'hud.policeHeat': 'Police heat',
  'startup.connecting': 'CONNECTING TO SOL DORADO…',
  'startup.title': 'Backend is not ready',
  'startup.help': 'Start PostgreSQL and Redis, then run migrations and seed.',
  'world.liveDistrict': 'Live district',
  'world.title': 'Las Palmas West',
  'world.description': 'One connected MVP district. Streets, actions and consequences now resolve against backend state.',
  'world.calm': 'Calm',
  'world.apartment': 'Apartment',
  'world.homeBlock': 'Home block',
  'world.cornerStore': 'Corner store',
  'world.storeState': 'Open · moderate traffic',
  'world.deliveryWork': 'Delivery work available',
  'world.you': 'You',
  'world.contextualActions': 'Contextual actions',
  'world.resolving': 'Resolving…',
  'world.serverRule': 'No reward is applied in the browser. Each choice is resolved, persisted and versioned by the Node API.',
  'world.walk.label': 'Walk to Market Street',
  'world.walk.description': 'Move through Las Palmas on foot.',
  'world.work.label': 'Take delivery shift',
  'world.work.description': 'Earn cash, but spend energy and hydration.',
  'world.crime.label': 'Shoplift corner store',
  'world.crime.description': 'Fast cash with stress and police risk.',
  'inventory.eyebrow': 'Physical possessions',
  'inventory.title': 'Inventory',
  'inventory.description': 'Every item occupies a real container and slot. Access follows the player, property and vehicle state.',
  'inventory.loading': 'Loading physical inventory…',
  'inventory.context': 'External inventory context',
  'inventory.accessible': 'Accessible now',
  'inventory.drag': 'DRAG',
  'inventory.selected': 'Selected item',
  'inventory.drink': 'Drink',
  'inventory.eat': 'Eat',
  'inventory.moveTo': 'Move to {target}',
  'inventory.selectHint': 'Select an item to inspect or move it.',
  'inventory.player': 'Player',
  'inventory.external': 'External',
  'inventory.of': 'of {weight}',
  'inventory.movedTitle': 'Item moved',
  'inventory.movedMessage': 'The item has been moved to the selected container.',
  'inventory.usedTitle': 'Item used',
  'inventory.usedMessage': 'Your condition and inventory were updated.',
  'character.renderer': 'HM08 renderer port is the next character task.',
  'character.identity': 'Persistent identity',
  'character.noCharacter': 'No character',
  'character.description': 'The accepted creator recipe now has a backend contract and PostgreSQL home. The Three.js UI remains regression-protected until it is ported module by module.',
  'character.id': 'Character ID',
  'character.body': 'Body',
  'character.age': 'Age',
  'character.hair': 'Hair',
  'integration.notPlayable': 'Not yet playable',
  'integration.migration': 'Prototype migration',
  'integration.description': 'The prototype defines the functionality below. It remains visible so the browser game has stable navigation, but it is not implemented until PostgreSQL state, API commands and React interactions work together.',
  'integration.finance.1': 'Branch, ATM and phone access rules', 'integration.finance.2': 'Checking, savings, transfers and transaction ledger', 'integration.finance.3': 'Credit score, loans and DoradoX crypto exchange',
  'integration.vehicles.1': 'Persistent owned vehicles and active vehicle selection', 'integration.vehicles.2': 'Fuel, condition, mileage, trunk and parking location', 'integration.vehicles.3': 'Walk, bus, taxi and vehicle travel consequences',
  'integration.property.1': 'Property ownership separated from operating businesses', 'integration.property.2': 'Rentals, tenants, storage, parking and access', 'integration.property.3': 'Agent, broker and commission progression',
  'integration.jobs.1': 'Opportunity-based work offers', 'integration.jobs.2': 'Career, job and skill XP with qualifications', 'integration.jobs.3': 'Reliability, employer trust and shift history',
  'integration.hospitality.1': 'Supplier orders, ingredients and slot storage', 'integration.hospitality.2': 'Recipes, prepared products and customer demand', 'integration.hospitality.3': 'Staff, reputation, certification and venue operations',
  'integration.police.1': 'Imperfect dispatch information and civilian perspective', 'integration.police.2': 'Encounters, legal grounds, evidence and intelligence', 'integration.police.3': 'Pursuit, visual loss, Last Known Position and search areas',
  'finance.loading': 'Opening Dorado National secure services…',
  'finance.eyebrow': 'Dorado National financial network',
  'finance.title': 'Finance',
  'finance.description': 'Your access point changes what is possible. Every movement is persistent and recorded in one authoritative ledger.',
  'finance.netPosition': 'Net liquid position',
  'finance.transferLimit': '{access} · {amount} transfer limit',
  'finance.sections': 'Finance sections',
  'finance.tab.access': 'Access',
  'finance.tab.accounts': 'Accounts',
  'finance.tab.transfers': 'Transfers',
  'finance.tab.credit': 'Credit',
  'finance.tab.crypto': 'DoradoX',
  'finance.tab.ledger': 'Ledger',
  'finance.access.branch': 'Bank Branch',
  'finance.access.atm': 'ATM',
  'finance.access.phone': 'Phone App',
  'finance.branch.description': 'Full banking, lending and physical cash.',
  'finance.atm.description': 'Fast cash and limited transfers.',
  'finance.phone.description': 'Remote banking and DoradoX access.',
  'finance.branch.location': 'Dorado National · Las Palmas',
  'finance.atm.location': 'Vespucci Blvd · 42 m',
  'finance.phone.location': 'Connected · Secure session',
  'finance.cap.cash': 'Deposit and withdraw cash',
  'finance.cap.transfer10': 'Transfers up to $10,000',
  'finance.cap.transfer1': 'Transfers up to $1,000',
  'finance.cap.transfer5': 'Transfers up to $5,000',
  'finance.cap.loans': 'Loan applications',
  'finance.cap.crypto': 'DoradoX trading',
  'finance.cap.accounts': 'View and move account funds',
  'finance.cap.funding': 'DoradoX funding and trading',
  'finance.cap.physical': 'Physical cash operations',
  'finance.currentAccess': 'Current access',
  'finance.contextMatters': 'Context matters',
  'finance.cityBanking': 'Banking is part of the city',
  'finance.cityBankingText': 'Branches support lending and large transfers. ATMs offer fast street access. The phone connects remote banking and DoradoX.',
  'finance.enter': 'Enter {access}',
  'finance.wallet': 'Wallet',
  'finance.physicalCash': 'Physical cash',
  'finance.deposit': 'Deposit',
  'finance.withdraw': 'Withdraw',
  'finance.checking': 'Checking · ••4821',
  'finance.primaryAccount': 'Primary account',
  'finance.savings': 'Savings · ••0904',
  'finance.reserve': 'Reserve balance',
  'finance.moveFunds': 'Move funds',
  'finance.businessAccount': 'Business account',
  'finance.requiresBusiness': 'Requires an operating business',
  'finance.businessLater': 'Connected later through Hospitality and owned businesses.',
  'finance.accountServices': 'Account services',
  'finance.secureConnected': 'Secure and connected',
  'finance.cardPin': 'Card & PIN',
  'finance.cardPinDetail': 'Card active · PIN configured',
  'finance.mobileBanking': 'Mobile banking',
  'finance.mobileDetail': 'Enabled for remote access',
  'finance.statements': 'Statements',
  'finance.statementsDetail': 'All activity feeds the Ledger',
  'finance.position': 'Position',
  'finance.atGlance': 'At a glance',
  'finance.liquidFunds': 'Liquid funds',
  'finance.totalDebt': 'Total debt',
  'finance.creditScore': 'Credit score',
  'finance.moneyMovement': 'Money movement',
  'finance.sendMoney': 'Send money',
  'finance.recipient': 'Recipient',
  'finance.amount': 'Amount',
  'finance.reference': 'Reference',
  'finance.referencePlaceholder': 'Rent / split / payment',
  'finance.sending': 'Sending…',
  'finance.sendTransfer': 'Send transfer',
  'finance.currentPermissions': 'Current permissions',
  'finance.perTransfer': 'Per-transfer limit',
  'finance.apiPermissions': 'Permissions are enforced by the API, not only the interface.',
  'finance.recipientAvailable': 'Recipient transfers available',
  'finance.physicalStatus': 'Physical cash {status}',
  'finance.referenceLedger': 'Reference recorded in ledger',
  'finance.creditProfile': 'Credit profile',
  'finance.score': 'Score',
  'finance.creditText': 'Credit follows repayment behavior and debt usage. It is not a generic XP meter.',
  'finance.payInstallment': 'Pay next installment',
  'finance.activeDebt': 'Active debt',
  'finance.activeProducts': '{count} active product',
  'finance.noDebt': 'No active debt',
  'finance.payments': '{count} payments · next {amount}',
  'finance.noPayment': 'No payment is currently due.',
  'finance.personal': 'Personal',
  'finance.personalLoan': 'Quick Personal Loan',
  'finance.personalDescription': 'Flexible unsecured lending.',
  'finance.apply': 'Apply',
  'finance.vehicle': 'Vehicle',
  'finance.autoFinance': 'Auto Finance',
  'finance.autoDescription': 'Eligibility before vehicle selection.',
  'finance.checkEligibility': 'Check eligibility',
  'finance.business': 'Business',
  'finance.businessCredit': 'Business Credit Line',
  'finance.variable': 'Variable',
  'finance.requiresBusinessAction': 'Requires business',
  'finance.weeks12': '12 weeks',
  'finance.weeks36': '36 weeks',
  'finance.fictionalMarket': 'DoradoX · Fictional market',
  'finance.exchangeCash': 'Exchange cash available for trading.',
  'finance.fund500': 'Fund $500',
  'finance.withdrawAll': 'Withdraw all',
  'finance.advanceMarket': 'Advance market',
  'finance.manualTick': 'Manual simulation tick',
  'finance.liveMarket': 'Live test market',
  'finance.fictionalAssets': 'Fictional assets',
  'finance.fictionalAsset': 'fictional asset',
  'finance.exchangeWallet': 'Exchange wallet',
  'finance.tradeAssets': 'Trade assets',
  'finance.asset': 'Asset',
  'finance.usdAmount': 'USD amount',
  'finance.buyAsset': 'Buy asset',
  'finance.sellValue': 'Sell by value',
  'finance.history': 'Financial history',
  'finance.authoritativeLedger': 'Authoritative ledger',
  'finance.firstTransaction': 'Your first transaction will appear here.',
  'finance.action': 'Finance action',
  'finance.internalTransfer': 'Internal transfer',
  'finance.depositCash': 'Deposit cash',
  'finance.withdrawCash': 'Withdraw cash',
  'finance.moveAccountFunds': 'Move account funds',
  'finance.direction': 'Direction',
  'finance.checkingToSavings': 'Checking → Savings',
  'finance.savingsToChecking': 'Savings → Checking',
  'finance.confirmMovement': 'Confirm movement',
  'finance.validAmount': 'Enter a valid amount.',
  'finance.validTransfer': 'Enter a valid transfer amount.',
  'finance.validTrade': 'Enter a valid USD trade amount.',
  'credit.excellent': 'Excellent',
  'credit.good': 'Good',
  'credit.fair': 'Fair',
  'credit.weak': 'Weak'
} as const;

export type TranslationKey = keyof typeof en;

const bg: Record<TranslationKey, string> = {
  ...en,
  'common.loading': 'Зареждане…', 'common.close': 'Затвори', 'common.clear': 'Изчисти', 'common.active': 'Активна', 'common.locked': 'Заключено',
  'common.available': 'достъпни', 'common.unavailable': 'недостъпни', 'common.backendLive': 'Backend активен', 'common.actionBlocked': 'Действието е блокирано',
  'common.dismiss': 'Затвори известието', 'common.language': 'Език', 'common.languageChanged': 'Езикът е сменен', 'common.languageChangedMessage': 'Интерфейсът вече е на български.',
  'common.notifications': 'Известия',
  'shell.persistentCity': 'Постоянен град', 'shell.closeNavigation': 'Затвори навигацията', 'shell.openNavigation': 'Отвори навигацията',
  'shell.expandSidebar': 'Разгъни страничното меню', 'shell.collapseSidebar': 'Свий страничното меню', 'shell.navigation': 'Навигация на играта',
  'shell.noCharacter': 'Няма активен герой', 'shell.sessionOnline': 'Сесията е активна', 'shell.serverTime': 'Сървърно време', 'shell.shard': 'Свят', 'shell.cash': 'В брой',
  'nav.city': 'Град', 'nav.progression': 'Развитие', 'nav.assets': 'Активи', 'nav.institutions': 'Институции', 'nav.world': 'Свят', 'nav.character': 'Герой',
  'nav.inventory': 'Инвентар', 'nav.finance': 'Финанси', 'nav.jobs': 'Работа и кариера', 'nav.vehicles': 'Моите автомобили', 'nav.property': 'Имоти',
  'nav.hospitality': 'Заведения', 'nav.police': 'Полиция', 'stage.live': 'Активно', 'stage.foundation': 'Основа', 'stage.migration': 'Миграция на прототип',
  'hud.health': 'Здраве', 'hud.energy': 'Енергия', 'hud.satiety': 'Ситост', 'hud.hydration': 'Хидратация', 'hud.stress': 'Стрес', 'hud.policeHeat': 'Полицейско внимание',
  'startup.connecting': 'СВЪРЗВАНЕ СЪС SOL DORADO…', 'startup.title': 'Backend системата не е готова', 'startup.help': 'Стартирай PostgreSQL и Redis, след това изпълни миграциите и seed командата.',
  'world.liveDistrict': 'Активен квартал', 'world.title': 'Лас Палмас Уест', 'world.description': 'Първият свързан MVP квартал. Улиците, действията и последствията вече се обработват от backend състоянието.',
  'world.calm': 'Спокойно', 'world.apartment': 'Апартамент', 'world.homeBlock': 'Жилищна сграда', 'world.cornerStore': 'Квартален магазин',
  'world.storeState': 'Отворено · умерен трафик', 'world.deliveryWork': 'Има работа за доставки', 'world.you': 'Ти', 'world.contextualActions': 'Контекстни действия',
  'world.resolving': 'Обработване…', 'world.serverRule': 'Наградите не се изчисляват в браузъра. Всеки избор се обработва, записва и версионира от Node API.',
  'world.walk.label': 'Разходка до Market Street', 'world.walk.description': 'Придвижи се пеша през Лас Палмас.', 'world.work.label': 'Започни смяна за доставки',
  'world.work.description': 'Спечели пари за сметка на енергия и хидратация.', 'world.crime.label': 'Обери кварталния магазин', 'world.crime.description': 'Бързи пари с риск от стрес и полицейско внимание.',
  'inventory.eyebrow': 'Физически притежания', 'inventory.title': 'Инвентар', 'inventory.description': 'Всеки предмет заема реален контейнер и слот. Достъпът зависи от героя, имота и автомобила.',
  'inventory.loading': 'Зареждане на инвентара…', 'inventory.context': 'Външен контекст на инвентара', 'inventory.accessible': 'Достъпно сега', 'inventory.drag': 'ПЛЪЗНИ',
  'inventory.selected': 'Избран предмет', 'inventory.drink': 'Изпий', 'inventory.eat': 'Изяж', 'inventory.moveTo': 'Премести в {target}', 'inventory.selectHint': 'Избери предмет, за да го разгледаш или преместиш.',
  'inventory.player': 'Играч', 'inventory.external': 'Външен', 'inventory.of': 'от {weight}', 'inventory.movedTitle': 'Предметът е преместен',
  'inventory.movedMessage': 'Предметът беше преместен в избрания контейнер.', 'inventory.usedTitle': 'Предметът е използван', 'inventory.usedMessage': 'Състоянието и инвентарът ти са обновени.',
  'character.renderer': 'Портването на HM08 renderer-а е следващата задача за героя.', 'character.identity': 'Постоянна самоличност', 'character.noCharacter': 'Няма герой',
  'character.description': 'Одобрената рецепта вече има backend contract и PostgreSQL запис. Three.js интерфейсът остава защитен в прототипа, докато бъде пренесен модул по модул.',
  'character.id': 'ID на героя', 'character.body': 'Тяло', 'character.age': 'Възраст', 'character.hair': 'Коса',
  'integration.notPlayable': 'Все още не е достъпно', 'integration.migration': 'Миграция на прототип',
  'integration.description': 'Прототипът определя функционалността по-долу. Системата остава видима за стабилна навигация, но не се счита за реализирана преди PostgreSQL, API командите и React взаимодействията да работят заедно.',
  'integration.finance.1': 'Правила за достъп през клон, банкомат и телефон', 'integration.finance.2': 'Разплащателна и спестовна сметка, преводи и регистър', 'integration.finance.3': 'Кредитен рейтинг, кредити и крипто борса DoradoX',
  'integration.vehicles.1': 'Постоянни притежавани автомобили и избор на активен автомобил', 'integration.vehicles.2': 'Гориво, състояние, километраж, багажник и паркиране', 'integration.vehicles.3': 'Последствия при ходене, автобус, такси и пътуване с автомобил',
  'integration.property.1': 'Собствеността на имота е отделна от управлявания бизнес', 'integration.property.2': 'Наеми, наематели, складове, паркиране и достъп', 'integration.property.3': 'Развитие като агент, брокер и комисиони',
  'integration.jobs.1': 'Предложения за работа според възможностите', 'integration.jobs.2': 'Кариера, работа, умения и квалификации', 'integration.jobs.3': 'Надеждност, доверие на работодателя и история на смените',
  'integration.hospitality.1': 'Поръчки от доставчици, съставки и складови слотове', 'integration.hospitality.2': 'Рецепти, готови продукти и клиентско търсене', 'integration.hospitality.3': 'Персонал, репутация, лицензи и управление на обекта',
  'integration.police.1': 'Непълна информация от диспечерите и цивилна перспектива', 'integration.police.2': 'Срещи, законови основания, доказателства и разузнаване', 'integration.police.3': 'Преследване, загуба от поглед, последна позиция и зони за търсене',
  'finance.loading': 'Отваряне на защитените услуги на Dorado National…', 'finance.eyebrow': 'Финансова мрежа Dorado National', 'finance.title': 'Финанси',
  'finance.description': 'Точката за достъп определя възможните действия. Всяко движение се пази в един официален регистър.', 'finance.netPosition': 'Обща ликвидна позиция',
  'finance.transferLimit': '{access} · лимит {amount}', 'finance.sections': 'Финансови секции', 'finance.tab.access': 'Достъп', 'finance.tab.accounts': 'Сметки',
  'finance.tab.transfers': 'Преводи', 'finance.tab.credit': 'Кредит', 'finance.tab.ledger': 'История', 'finance.access.branch': 'Банков клон',
  'finance.tab.crypto': 'DoradoX',
  'finance.access.atm': 'Банкомат', 'finance.access.phone': 'Телефон', 'finance.branch.description': 'Пълно банкиране, кредити и операции с пари в брой.',
  'finance.atm.description': 'Бърз достъп до пари и ограничени преводи.', 'finance.phone.description': 'Дистанционно банкиране и достъп до DoradoX.',
  'finance.branch.location': 'Dorado National · Лас Палмас', 'finance.atm.location': 'Vespucci Blvd · 42 м',
  'finance.phone.location': 'Свързано · защитена сесия', 'finance.cap.cash': 'Внасяне и теглене на пари', 'finance.cap.transfer10': 'Преводи до $10 000',
  'finance.cap.transfer1': 'Преводи до $1 000', 'finance.cap.transfer5': 'Преводи до $5 000', 'finance.cap.loans': 'Кандидатстване за кредит',
  'finance.cap.crypto': 'Търговия в DoradoX', 'finance.cap.accounts': 'Преглед и движение между сметки', 'finance.cap.funding': 'Захранване и търговия в DoradoX',
  'finance.cap.physical': 'Операции с пари в брой', 'finance.currentAccess': 'Текущ достъп', 'finance.contextMatters': 'Контекстът има значение',
  'finance.cityBanking': 'Банкирането е част от града', 'finance.cityBankingText': 'Клоновете предлагат кредити и големи преводи. Банкоматите дават бърз уличен достъп. Телефонът свързва дистанционното банкиране и DoradoX.',
  'finance.enter': 'Отвори {access}', 'finance.wallet': 'Портфейл', 'finance.physicalCash': 'Пари в брой', 'finance.deposit': 'Внеси', 'finance.withdraw': 'Изтегли',
  'finance.checking': 'Разплащателна · ••4821', 'finance.primaryAccount': 'Основна сметка', 'finance.savings': 'Спестовна · ••0904', 'finance.reserve': 'Резервни средства',
  'finance.moveFunds': 'Премести средства', 'finance.businessAccount': 'Бизнес сметка', 'finance.requiresBusiness': 'Изисква действащ бизнес',
  'finance.businessLater': 'Ще бъде свързано по-късно чрез Заведения и притежаваните бизнеси.', 'finance.accountServices': 'Услуги по сметката',
  'finance.secureConnected': 'Защитени и свързани', 'finance.cardPin': 'Карта и ПИН', 'finance.cardPinDetail': 'Картата е активна · ПИН е настроен',
  'finance.mobileBanking': 'Мобилно банкиране', 'finance.mobileDetail': 'Активирано за дистанционен достъп', 'finance.statements': 'Извлечения',
  'finance.statementsDetail': 'Всички действия се записват в История', 'finance.position': 'Позиция', 'finance.atGlance': 'Общ преглед', 'finance.liquidFunds': 'Ликвидни средства',
  'finance.totalDebt': 'Общ дълг', 'finance.creditScore': 'Кредитен рейтинг', 'finance.moneyMovement': 'Движение на средства', 'finance.sendMoney': 'Изпрати пари',
  'finance.recipient': 'Получател', 'finance.amount': 'Сума', 'finance.reference': 'Основание', 'finance.referencePlaceholder': 'Наем / разделяне / плащане',
  'finance.sending': 'Изпращане…', 'finance.sendTransfer': 'Изпрати превод', 'finance.currentPermissions': 'Текущи права', 'finance.perTransfer': 'Лимит за превод',
  'finance.apiPermissions': 'Правилата се прилагат от API, а не само от интерфейса.', 'finance.recipientAvailable': 'Преводите към получатели са достъпни',
  'finance.physicalStatus': 'Операциите с пари в брой са {status}', 'finance.referenceLedger': 'Основанието се записва в историята', 'finance.creditProfile': 'Кредитен профил',
  'finance.score': 'Рейтинг', 'finance.creditText': 'Кредитът следва поведението при погасяване и използването на дълг. Това не е обикновена XP система.',
  'finance.payInstallment': 'Плати следващата вноска', 'finance.activeDebt': 'Активен дълг', 'finance.activeProducts': '{count} активен продукт', 'finance.noDebt': 'Няма активен дълг',
  'finance.payments': '{count} вноски · следваща {amount}', 'finance.noPayment': 'В момента няма дължима вноска.', 'finance.personal': 'Личен',
  'finance.personalLoan': 'Бърз личен кредит', 'finance.personalDescription': 'Гъвкаво необезпечено финансиране.', 'finance.apply': 'Кандидатствай',
  'finance.vehicle': 'Автомобил', 'finance.autoFinance': 'Автомобилно финансиране', 'finance.autoDescription': 'Проверка на допустимостта преди избор на автомобил.',
  'finance.checkEligibility': 'Провери допустимост', 'finance.business': 'Бизнес', 'finance.businessCredit': 'Бизнес кредитна линия', 'finance.variable': 'Променлива',
  'finance.requiresBusinessAction': 'Изисква бизнес', 'finance.weeks12': '12 седмици', 'finance.weeks36': '36 седмици', 'finance.fictionalMarket': 'DoradoX · измислен пазар',
  'finance.exchangeCash': 'Налични средства за търговия.', 'finance.fund500': 'Захрани с $500', 'finance.withdrawAll': 'Изтегли всичко', 'finance.advanceMarket': 'Раздвижи пазара',
  'finance.manualTick': 'Ръчна симулационна стъпка', 'finance.liveMarket': 'Тестов пазар', 'finance.fictionalAssets': 'Измислени активи', 'finance.fictionalAsset': 'измислен актив',
  'finance.exchangeWallet': 'Борсов портфейл', 'finance.tradeAssets': 'Търговия с активи', 'finance.asset': 'Актив', 'finance.usdAmount': 'Сума в USD',
  'finance.buyAsset': 'Купи актив', 'finance.sellValue': 'Продай по стойност', 'finance.history': 'Финансова история', 'finance.authoritativeLedger': 'Официален регистър',
  'finance.firstTransaction': 'Първата ти транзакция ще се появи тук.', 'finance.action': 'Финансово действие', 'finance.internalTransfer': 'Вътрешен превод',
  'finance.depositCash': 'Внасяне на пари', 'finance.withdrawCash': 'Теглене на пари', 'finance.moveAccountFunds': 'Преместване между сметки',
  'finance.direction': 'Посока', 'finance.checkingToSavings': 'Разплащателна → Спестовна', 'finance.savingsToChecking': 'Спестовна → Разплащателна',
  'finance.confirmMovement': 'Потвърди движението', 'finance.validAmount': 'Въведи валидна сума.', 'finance.validTransfer': 'Въведи валидна сума за превод.',
  'finance.validTrade': 'Въведи валидна сума в USD.', 'credit.excellent': 'Отличен', 'credit.good': 'Добър', 'credit.fair': 'Среден', 'credit.weak': 'Слаб'
};

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, variables?: Record<string, string | number>) => string;
  money: (cents: number, decimals?: boolean) => string;
  dateTime: (value: string | Date) => string;
  runtime: (value: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => localStorage.getItem('sd_locale') === 'en' ? 'en' : 'bg');

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('sd_locale', locale);
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const dictionary = locale === 'bg' ? bg : en;
    const t = (key: TranslationKey, variables: Record<string, string | number> = {}) =>
      Object.entries(variables).reduce((text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)), dictionary[key]);
    return {
      locale,
      setLocale: setLocaleState,
      t,
      money: (cents, decimals = false) => new Intl.NumberFormat(locale === 'bg' ? 'bg-BG' : 'en-US', {
        style: 'currency', currency: 'USD', minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0
      }).format(cents / 100),
      dateTime: value => new Intl.DateTimeFormat(locale === 'bg' ? 'bg-BG' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)),
      runtime: value => localizeRuntime(value, locale)
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

const runtimeBg: Record<string, string> = {
  'My Character': 'Моят герой', 'Backpack & Pockets': 'Раница и джобове', 'Nearby / Ground': 'Наблизо / Земя',
  'Cypress Apartment · Storage': 'Апартамент Cypress · Склад', 'Active Vehicle · Trunk': 'Активен автомобил · Багажник',
  'Carried by the player': 'Носи се от играча', 'Items at the current street segment': 'Предмети на текущата улица',
  'Travel to Cypress Apartment to access this storage': 'Отиди до апартамент Cypress, за да използваш склада',
  'Stand beside the active vehicle and unlock its trunk': 'Застани до активния автомобил и отключи багажника',
  Phone: 'Телефон', Wallet: 'Портфейл', 'Identity Card': 'Лична карта', Water: 'Вода', Sandwich: 'Сандвич',
  'Work Gloves': 'Работни ръкавици', Toolbox: 'Кутия с инструменти', Crowbar: 'Лост', Device: 'Устройство', Personal: 'Лични',
  Document: 'Документ', Consumable: 'Консуматив', Food: 'Храна', Clothing: 'Облекло', Tool: 'Инструмент',
  'Market Street': 'Market Street', 'Delivery completed': 'Доставката е завършена', Witnessed: 'Забелязан', 'Clean exit': 'Чисто измъкване',
  'You reach the market block on foot. The district is active around you.': 'Стигаш пеша до пазарния квартал. Районът около теб е оживен.',
  'The restaurant signs off the delivery and pays you $85 cash.': 'Ресторантът приема доставката и ти плаща $85 в брой.',
  'A clerk sees you leave. You keep part of the score, but a description reaches dispatch.': 'Служител те вижда да излизаш. Запазваш част от плячката, но описание достига до диспечерите.',
  'You leave with $35 in goods before anyone connects you to the loss.': 'Тръгваш си със стоки за $35, преди някой да те свърже с липсата.',
  'Bank Branch': 'Банков клон', 'Phone App': 'Телефон', 'Cash deposit': 'Внасяне на пари', 'Cash withdrawal': 'Теглене на пари',
  'Internal account transfer': 'Вътрешен превод', 'Personal loan funded': 'Отпуснат личен кредит', 'Loan installment': 'Вноска по кредит',
  'DoradoX funding': 'Захранване на DoradoX', 'DoradoX cash withdrawal': 'Теглене от DoradoX', 'Checking → exchange': 'Разплащателна → борса',
  'Exchange → checking': 'Борса → разплащателна', 'Checking → Savings': 'Разплащателна → Спестовна', 'Savings → Checking': 'Спестовна → Разплащателна',
  'Quick Personal Loan': 'Бърз личен кредит'
  , 'Cash deposited': 'Парите са внесени', 'Cash withdrawn': 'Парите са изтеглени', 'Funds moved': 'Средствата са преместени',
  'Transfer completed': 'Преводът е завършен', Eligible: 'Допустим', 'Loan approved': 'Кредитът е одобрен', 'Payment completed': 'Плащането е завършено',
  'DoradoX funded': 'DoradoX е захранен', 'Exchange cash withdrawn': 'Средствата са изтеглени от борсата', 'Purchase completed': 'Покупката е завършена',
  'Sale completed': 'Продажбата е завършена', 'Market advanced': 'Пазарът е раздвижен'
};

function localizeRuntime(value: string, locale: Locale) {
  if (locale === 'en') return value;
  if (runtimeBg[value]) return runtimeBg[value];
  if (value.startsWith('Transfer to ')) return value.replace('Transfer to ', 'Превод към ');
  if (value.startsWith('Bought ')) return value.replace('Bought ', 'Покупка на ');
  if (value.startsWith('Sold ')) return value.replace('Sold ', 'Продажба на ');
  if (/^Financial permissions now follow the .+ access point\.$/.test(value)) return 'Финансовите права вече следват избраната точка за достъп.';
  const walletToChecking = value.match(/^(\$[\d,.]+) moved from your wallet to checking\.$/);
  if (walletToChecking) return `${walletToChecking[1]} бяха преместени от портфейла в разплащателната сметка.`;
  const checkingToWallet = value.match(/^(\$[\d,.]+) moved from checking to your wallet\.$/);
  if (checkingToWallet) return `${checkingToWallet[1]} бяха преместени от разплащателната сметка в портфейла.`;
  const sent = value.match(/^(\$[\d,.]+) sent to (.+)\.$/);
  if (sent) return `${sent[1]} бяха изпратени към ${sent[2]}.`;
  const funded = value.match(/^(\$[\d,.]+) is available for trading\.$/);
  if (funded) return `${funded[1]} са налични за търговия.`;
  const returned = value.match(/^(\$[\d,.]+) returned to checking\.$/);
  if (returned) return `${returned[1]} бяха върнати в разплащателната сметка.`;
  const paid = value.match(/^(\$[\d,.]+) paid on time\. Your credit score improved\.$/);
  if (paid) return `${paid[1]} бяха платени навреме. Кредитният ти рейтинг се подобри.`;
  if (value === 'Your credit profile passes the first Auto Finance check. Vehicle selection is connected in the Vehicles slice.') return 'Кредитният ти профил премина първата проверка за автомобилно финансиране. Изборът на автомобил ще бъде свързан във Vehicles.';
  if (value === '$2,500 funded to checking. On-time repayment will affect your credit profile.') return '$2 500 бяха преведени по разплащателната сметка. Навременното погасяване ще влияе на кредитния ти профил.';
  if (value === 'DoradoX prices moved by one manual simulation tick.') return 'Цените в DoradoX се промениха с една ръчна симулационна стъпка.';
  const assetMove = value.match(/^([\d.]+) ([A-Z]+) (added to|sold from) your DoradoX wallet\.$/);
  if (assetMove) return `${assetMove[1]} ${assetMove[2]} ${assetMove[3] === 'added to' ? 'бяха добавени към' : 'бяха продадени от'} DoradoX портфейла ти.`;
  return value;
}
