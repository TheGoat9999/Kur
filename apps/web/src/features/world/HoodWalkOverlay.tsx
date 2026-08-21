import { useEffect, useState, type CSSProperties } from 'react';
import type { BootstrapState } from '@sol-dorado/contracts';
import type { HoodWalkChoice, HoodWalkEventId, HoodWalkState } from '@sol-dorado/contracts/hood-walk';
import { useNotifications } from '../../components/Notifications';
import { useI18n } from '../../i18n';
import { ApiCommandError } from '../../lib/api';
import { commandHoodWalk, getHoodWalk } from '../../lib/hood-walk-api';
import './hood-walk.css';

interface Props {
  state: BootstrapState;
  onStateChange: (state: BootstrapState) => void;
}

type Locale = 'bg' | 'en';

export function HoodWalkOverlay({ state, onStateChange }: Props) {
  const { locale } = useI18n();
  const { push } = useNotifications();
  const [hood, setHood] = useState<HoodWalkState | null>(null);
  const [busy, setBusy] = useState(false);
  const [streetVisible, setStreetVisible] = useState(true);
  const copy = locale === 'bg' ? bg : en;

  useEffect(() => {
    let cancelled = false;
    void getHoodWalk().then(next => { if (!cancelled) setHood(next); }).catch(() => {
      if (!cancelled) push({ tone:'error', title:copy.errorTitle, message:copy.loadError });
    });
    return () => { cancelled = true; };
  }, [state.location.streetSegment]);

  useEffect(() => {
    const sync = () => setStreetVisible(Boolean(document.querySelector('.street-scene')));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList:true, subtree:true });
    return () => observer.disconnect();
  }, []);

  async function run(command: Parameters<typeof commandHoodWalk>[0]) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await commandHoodWalk(command);
      setHood(result.hood);
      if (result.state) onStateChange(result.state);
      if (result.noticeId === 'completed') push({ tone:'reward', title:copy.completedTitle, message:copy.completedMessage });
    } catch (reason) {
      const code = reason instanceof ApiCommandError ? reason.code : 'hood_walk_failed';
      if (code === 'state_version_conflict') {
        const fresh = await getHoodWalk().catch(() => null);
        if (fresh) setHood(fresh);
      }
      push({ tone:'error', title:copy.errorTitle, message:errorMessage(code, locale) });
    } finally { setBusy(false); }
  }

  if (!streetVisible || !hood) return null;
  const active = hood.phase === 'leads' || hood.phase === 'encounter';

  return <div className={`hood-walk-overlay hood-walk-${hood.phase}`} aria-live="polite">
    {!active && hood.phase === 'idle' && <button type="button" className="hood-walk-launch" disabled={busy} onClick={() => void run({ command:'start', expectedVersion:state.version })}>
      <span className="hood-walk-launch-icon">◇</span><span><b>{copy.launch}</b><small>{copy.launchSub}</small></span>
    </button>}

    {active && <div className="hood-walk-runbar">
      <div className="hood-walk-runbar-title"><span>{copy.run}</span><b>{copy.step} {Math.min(hood.step + 1, hood.maxSteps)}/{hood.maxSteps}</b></div>
      <div className="hood-walk-runmeters">
        <span className="momentum"><i>↗</i><b>{hood.momentum}</b><small>{copy.momentum}</small></span>
        <span className="clues"><i>◇</i><b>{hood.clues}</b><small>{copy.clues}</small></span>
        <span className="danger"><i>!</i><b>{hood.danger}</b><small>{copy.danger}</small></span>
      </div>
      <button type="button" className="hood-walk-end" disabled={busy || !hood.runId} onClick={() => hood.runId && void run({ command:'end', runId:hood.runId })}>{copy.end}</button>
    </div>}

    {hood.phase === 'leads' && hood.leads.map((lead, index) => {
      const style = { '--hood-x':`${lead.anchor.x}%`, '--hood-y':`${lead.anchor.y}%` } as CSSProperties;
      return <button key={lead.id} type="button" className={`hood-walk-lead tone-${lead.tone}`} style={style} disabled={busy || !hood.runId} onClick={() => hood.runId && void run({ command:'pick_lead', runId:hood.runId, leadId:lead.id })}>
        <span className="hood-walk-lead-pulse" /><span className="hood-walk-lead-index">0{index + 1}</span><b>{leadTitle(lead.eventId, lead.clarity, locale)}</b><small>{leadHint(lead.eventId, lead.clarity, locale)}</small>
      </button>;
    })}

    {hood.phase === 'leads' && hood.lastOutcome && <div className="hood-walk-feedback"><span>✓</span><div><b>{outcomeTitle(hood.lastOutcome.outcomeId, locale)}</b><small>{outcomeDetail(hood.lastOutcome.outcomeId, locale)}</small></div></div>}

    {hood.phase === 'encounter' && hood.encounter && <aside className={`hood-walk-encounter tone-${hood.encounter.tone}`}>
      <header><div><span>{copy.encounter}</span><h2>{encounterTitle(hood.encounter.eventId, locale)}</h2><p>{encounterDetail(hood.encounter.eventId, locale)}</p></div><b className="hood-walk-tone">{toneLabel(hood.encounter.tone, locale)}</b></header>
      <div className="hood-walk-choices">
        {hood.encounter.choices.map(choice => <ChoiceButton key={choice.id} choice={choice} locale={locale} disabled={busy || !hood.runId} onClick={() => hood.runId && hood.encounter && void run({ command:'choose', expectedVersion:state.version, runId:hood.runId, encounterId:hood.encounter.id, choiceId:choice.id })} />)}
      </div>
      <p className="hood-walk-consequence-hint">{copy.consequenceHint}</p>
    </aside>}

    {hood.phase === 'complete' && hood.summary && <aside className="hood-walk-summary">
      <div className="hood-walk-summary-mark">{hood.summary.grade === 'wild' ? '!' : hood.summary.grade === 'connected' ? '◎' : hood.summary.grade === 'sharp' ? '◇' : '○'}</div>
      <span>{copy.runComplete}</span><h2>{summaryTitle(hood.summary.grade, locale)}</h2><p>{summaryDetail(hood.summary.reason, locale)}</p>
      <div className="hood-walk-summary-stats"><span><small>{copy.encounters}</small><b>{hood.summary.encounters}/{hood.maxSteps}</b></span><span><small>{copy.streetRead}</small><b>{hood.memory.familiarity}%</b></span><span><small>{copy.score}</small><b>{hood.summary.score}</b></span></div>
      {hood.summary.discoveries.length > 0 && <div className="hood-walk-discoveries">{hood.summary.discoveries.map(item => <span key={item}>{discoveryLabel(item, locale)}</span>)}</div>}
      <button type="button" disabled={busy} onClick={() => void run({ command:'start', expectedVersion:state.version })}>{copy.walkAgain}</button>
    </aside>}
  </div>;
}

function ChoiceButton({ choice, locale, disabled, onClick }: { choice:HoodWalkChoice; locale:Locale; disabled:boolean; onClick:()=>void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`hood-walk-choice risk-${choice.risk}`}><span><b>{choiceLabel(choice.id, locale)}</b><small>{choiceHint(choice.id, locale)}</small></span><em>{riskLabel(choice.risk, locale)}</em></button>;
}

const eventCopy: Record<HoodWalkEventId, { bg:[string,string,string,string]; en:[string,string,string,string] }> = {
  lost_courier:{bg:['Някой търси нещо','Объркан куриер','Куриер търси адрес','Куриерът сравнява номерата на входовете и очевидно е изгубен.'],en:['Someone is looking around','Lost courier','Courier needs an address','A courier keeps checking building numbers and is clearly lost.']},
  open_garage:{bg:['Светлина от гараж','Отворен гараж','Работа зад полуотворена врата','Отворен гараж, разхвърляни части и двама души, които бързат да приключат.'],en:['Light from a garage','Open garage','Work behind a half-open door','An open garage, scattered parts and two people trying to finish quickly.']},
  watchful_stranger:{bg:['Някой стои твърде дълго','Непознат до кола','Непознат наблюдава улицата','Човекът до паркираната кола гледа повече кой минава, отколкото самия автомобил.'],en:['Someone is lingering','Stranger by a car','Stranger watching the street','The person beside the parked car watches passers-by more than the vehicle.']},
  slow_patrol:{bg:['Фарове се влачат бавно','Патрулна кола','Патрул оглежда пресечката','Патрулът минава необичайно бавно и оглежда входовете.'],en:['Headlights moving slowly','Patrol car','Patrol scanning the block','A patrol rolls unusually slowly while watching building entrances.']},
  basement_music:{bg:['Бас от някъде','Музика от мазе','Хора слизат по стълби','Музика излиза от мазе, а няколко местни се поздравяват и слизат надолу.'],en:['Bass from somewhere','Basement music','People heading downstairs','Music leaks from a basement while a few locals greet each other and head down.']},
  corner_argument:{bg:['Повишени гласове','Спор на ъгъла','Напрежение пред магазин','Спор пред малък магазин привлича погледи. Собственикът явно познава участниците.'],en:['Raised voices','Argument on the corner','Tension outside a shop','An argument outside a small shop draws attention. The owner clearly knows the people involved.']},
  quiet_cutthrough:{bg:['Тиха пресечка','Страничен проход','Кратък път между блоковете','Тих проход между сградите е пълен с дребни следи кой реално го използва.'],en:['Quiet side street','Side cut-through','Shortcut between buildings','A quiet cut-through between buildings carries small signs of who actually uses it.']},
  pickup_game:{bg:['Шум от игрище','Игра пред блока','Местни играят наблизо','Няколко души са започнали импровизирана игра и явно има място за още един.'],en:['Noise from a court','Pickup game','Locals playing nearby','A few locals have started an improvised game and there is clearly room for one more.']},
  dog_loose:{bg:['Нещо тича между колите','Изпуснато куче','Собственик търси помощ','Куче се е измъкнало и собственикът се опитва да го прибере преди да излезе на платното.'],en:['Something darts between cars','Loose dog','Owner needs help','A dog slipped loose and its owner is trying to catch it before it reaches traffic.']},
  dumpster_glint:{bg:['Нещо проблясва','Следа до контейнер','Изхвърлено нещо изглежда използваемо','Сред боклука се вижда нещо, което може да е полезно, но ще трябва да провериш отблизо.'],en:['Something glints','Clue by a dumpster','Something discarded looks usable','Something among the trash might be useful, but you would need to check up close.']},
  pattern_spotted:{bg:['Нещо ти прави впечатление','Повтарящ се маршрут','Свързваш предишните следи','Няколко дребни детайла от разходката вече оформят модел, който можеш да последваш.'],en:['Something stands out','Repeated route','Earlier clues connect','Several small details from the walk now form a pattern you can follow.']},
  local_recognition:{bg:['Някой кимва към теб','Познато лице','Вече те разпознават','Местен те поздравява пръв. Вече не изглеждаш като случаен човек на тази улица.'],en:['Someone nods at you','Familiar face','People recognize you now','A local greets you first. You no longer look like a random stranger on this street.']}
};

const choiceCopy: Record<string,{bg:[string,string];en:[string,string]}> = {
  guide:{bg:['Покажи му адреса','Помогни набързо и продължи.'],en:['Show the address','Help quickly and keep moving.']}, carry:{bg:['Помогни с пратката','Включи се реално, не само с посока.'],en:['Help with the parcel','Get involved instead of only pointing.']}, ask_route:{bg:['Попитай за маршрута','Може да научиш кои входове обслужва.'],en:['Ask about the route','You might learn which buildings he serves.']},
  inspect:{bg:['Огледай отстрани','Чети ситуацията, без да се натрапваш.'],en:['Inspect from the side','Read the situation without intruding.']}, help_lift:{bg:['Предложи ръка','Влез за малко в чуждата работа.'],en:['Offer a hand','Step briefly into someone else’s work.']}, snoop:{bg:['Надникни по-навътре','Информацията може да си има цена.'],en:['Look further inside','Information may come with a price.']},
  observe:{bg:['Наблюдавай','Запомни лице и поведение.'],en:['Observe','Remember the face and behavior.']}, approach:{bg:['Заговори го','Разбери дали чака някого.'],en:['Approach','Find out whether he is waiting for someone.']}, circle_back:{bg:['Заобиколи и провери','Виж дали ще остане на същото място.'],en:['Circle back','See whether he stays in the same place.']},
  keep_walking:{bg:['Продължи нормално','Не променяй поведението си.'],en:['Keep walking','Do not change your behavior.']}, change_route:{bg:['Смени пресечката','Не е бягство, просто друг път.'],en:['Change streets','Not running, just another route.']}, ask_what_happened:{bg:['Попитай какво става','Любопитството може да привлече внимание.'],en:['Ask what happened','Curiosity may draw attention.']},
  follow_music:{bg:['Последвай музиката','Виж кой се събира там.'],en:['Follow the music','See who is gathering there.']}, talk_outside:{bg:['Заговори хората отвън','Остани на публичното място.'],en:['Talk outside','Stay in the public part of the scene.']}, keep_moving:{bg:['Продължи','Не всяка врата трябва да се отвори.'],en:['Keep moving','Not every door needs opening.']},
  deescalate:{bg:['Опитай да ги успокоиш','Разговорът е по-бавният, но чист вариант.'],en:['Try to calm them','Talking is slower, but cleaner.']}, back_vendor:{bg:['Застани до собственика','Покажи ясно чия страна държиш.'],en:['Back the owner','Make it clear whose side you are on.']},
  read_markings:{bg:['Огледай следите','Стикери, драскотини, утъпкани пътеки.'],en:['Read the markings','Stickers, scratches and worn paths.']}, take_shortcut:{bg:['Мини напряко','Научи по-бързия път.'],en:['Take the shortcut','Learn the faster route.']}, keep_route:{bg:['Остани на главната улица','Нищо лошо в спокойния избор.'],en:['Stay on the main route','There is nothing wrong with the calm choice.']},
  join:{bg:['Включи се','Малко енергия срещу истински контакт.'],en:['Join in','Spend some energy for a real connection.']}, watch:{bg:['Постой и гледай','Запомни лицата и динамиката.'],en:['Watch for a while','Remember faces and group dynamics.']}, pass:{bg:['Подмини','Имаш друга посока.'],en:['Pass by','You have somewhere else to be.']},
  help_owner:{bg:['Помогни да го хванат','Няколко минути могат да решат проблема.'],en:['Help catch it','A few minutes could solve the problem.']}, block_traffic:{bg:['Пази платното','Дръж колите далеч, докато го приберат.'],en:['Block traffic','Keep cars away while the owner catches it.']}, keep_distance:{bg:['Стой настрана','Не усложнявай ситуацията.'],en:['Keep distance','Do not make the situation harder.']},
  check:{bg:['Провери отблизо','Може да е полезно. Може и да е просто боклук.'],en:['Check it','It may be useful. It may just be trash.']}, look_only:{bg:['Огледай без да ровиш','Запомни какво има около контейнера.'],en:['Look without digging','Remember what is around the dumpster.']}, leave:{bg:['Остави го','Нямаш нужда от всяка възможност.'],en:['Leave it','You do not need every opportunity.']},
  follow_pattern:{bg:['Последвай модела','Използвай събраните парчета информация.'],en:['Follow the pattern','Use the pieces of information you gathered.']}, mark_route:{bg:['Запомни маршрута','Превърни наблюдението в street knowledge.'],en:['Mark the route','Turn observation into street knowledge.']}, ignore:{bg:['Не се разсейвай','Продължи по собствената си линия.'],en:['Ignore it','Stay on your own route.']},
  stop_talk:{bg:['Спри за разговор','Вече има смисъл да отделиш време.'],en:['Stop and talk','It is worth spending a little time now.']}, ask_whats_new:{bg:['Попитай какво е новото','Познатите лица чуват различни неща.'],en:['Ask what is new','Familiar faces hear different things.']}, nod_move:{bg:['Кимни и продължи','Понякога това е достатъчно.'],en:['Nod and move on','Sometimes that is enough.']}
};

function leadTitle(id:HoodWalkEventId, clarity:'vague'|'readable'|'clear', locale:Locale) { const c=eventCopy[id][locale]; return c[clarity==='vague'?0:clarity==='readable'?1:2]; }
function leadHint(id:HoodWalkEventId, clarity:'vague'|'readable'|'clear', locale:Locale) { return clarity==='clear' ? eventCopy[id][locale][3] : locale==='bg'?'Провери какво става':'Check what is happening'; }
function encounterTitle(id:HoodWalkEventId, locale:Locale) { return eventCopy[id][locale][2]; }
function encounterDetail(id:HoodWalkEventId, locale:Locale) { return eventCopy[id][locale][3]; }
function choiceLabel(id:string, locale:Locale) { return choiceCopy[id]?.[locale][0] ?? id; }
function choiceHint(id:string, locale:Locale) { return choiceCopy[id]?.[locale][1] ?? ''; }
function riskLabel(risk:HoodWalkChoice['risk'], locale:Locale) { const d=locale==='bg'?{safe:'спокойно',uncertain:'неясно',risky:'риск'}:{safe:'calm',uncertain:'uncertain',risky:'risk'}; return d[risk]; }
function toneLabel(tone:string, locale:Locale) { const bgMap:Record<string,string>={calm:'СПОКОЙНО',social:'ХОРА',opportunity:'ВЪЗМОЖНОСТ',mystery:'СЛЕДА',risky:'НАПРЕЖЕНИЕ',police:'ПОЛИЦИЯ'}; const enMap:Record<string,string>={calm:'CALM',social:'PEOPLE',opportunity:'OPPORTUNITY',mystery:'CLUE',risky:'TENSION',police:'POLICE'}; return (locale==='bg'?bgMap:enMap)[tone] ?? tone; }
function outcomeTitle(id:string, locale:Locale) { return id.endsWith('_complication') ? (locale==='bg'?'Ситуацията се усложни':'Things got complicated') : (locale==='bg'?'Улицата реагира':'The street reacted'); }
function outcomeDetail(id:string, locale:Locale) { const clean=id.replace('_complication',''); const known:Record<string,[string,string]>={courier_guided:['Куриерът запомни помощта ти, а ти още един адрес.','The courier remembers your help, and you learned another address.'],courier_helped:['Свършихте работата по-бързо и вече не си напълно непознат.','You finished faster together and you are less of a stranger now.'],pattern_confirmed:['Предишните следи се оказаха свързани.','The earlier clues really were connected.'],recognized_chat:['Разговорът е различен, когато другият вече знае лицето ти.','Conversation changes when the other person already knows your face.'],dumpster_useful_find:['Този път имаше нещо използваемо.','This time there was something usable.']}; return known[clean]?.[locale==='bg'?0:1] ?? (id.endsWith('_complication')?(locale==='bg'?'Изборът имаше цена. Запомни я за следващата ситуация.':'The choice had a price. Remember it for the next encounter.'):(locale==='bg'?'Резултатът е записан. Следващата улица вече не е съвсем същата.':'The result is persistent. The next street read is already a little different.')); }
function summaryTitle(grade:string, locale:Locale) { const bgMap:Record<string,string>={quiet:'ТИХА ОБИКОЛКА',sharp:'ОСТРО ОКО',connected:'ПОЗНАТО ЛИЦЕ',wild:'ДИВА НОЩ'}; const enMap:Record<string,string>={quiet:'QUIET WALK',sharp:'SHARP EYE',connected:'KNOWN FACE',wild:'WILD RUN'}; return (locale==='bg'?bgMap:enMap)[grade] ?? grade; }
function summaryDetail(reason:string, locale:Locale) { if(reason==='exhausted')return locale==='bg'?'Прибра се навреме. Улицата остана, но енергията ти не.' :'You got back in time. The street remained, your energy did not.'; if(reason==='left_early')return locale==='bg'?'Реши сам кога да прекратиш обиколката. Натрупаното знание остава.':'You chose when to call it. What you learned remains.'; return locale==='bg'?'Затвори пълния маршрут. Следващата обиколка ще използва натрупаната памет.':'You closed the full route. The next walk will use what the street remembers.'; }
function discoveryLabel(item:'faces'|'routes'|'pressure', locale:Locale) { const d=locale==='bg'?{faces:'Познати лица',routes:'Маршрути и навици',pressure:'Рискови точки'}:{faces:'Familiar faces',routes:'Routes & habits',pressure:'Pressure points'}; return d[item]; }
function errorMessage(code:string, locale:Locale) { if(code==='hood_walk_not_enough_energy') return locale==='bg'?'Трябват ти поне 8 енергия, за да тръгнеш на обиколка.':'You need at least 8 energy to start a walk.'; if(code==='state_version_conflict')return locale==='bg'?'Състоянието се е променило. Обиколката е презаредена.':'Your state changed. The walk was refreshed.'; if(code.includes('inventory_'))return locale==='bg'?'Нямаш място или капацитет за намерения предмет.':'You do not have room or carrying capacity for the found item.'; return locale==='bg'?'Обиколката не може да продължи в момента.':'The walk cannot continue right now.'; }

const bg={launch:'ОБИКОЛИ КВАРТАЛА',launchSub:'5 ситуации · улицата помни',run:'ОБИКОЛКА НА УЛИЦАТА',step:'СИТУАЦИЯ',momentum:'ритъм',clues:'следи',danger:'риск',end:'Прибери се',encounter:'КАКВО СТАВА?',consequenceHint:'Не виждаш числата предварително. Изборът се усеща от последствията.',runComplete:'ОБИКОЛКАТА ПРИКЛЮЧИ',encounters:'Ситуации',streetRead:'Познаване',score:'Run score',walkAgain:'Нова обиколка',completedTitle:'Обиколката е завършена',completedMessage:'Улицата запомни как се държа.',errorTitle:'Обиколката е прекъсната',loadError:'Street memory не можа да се зареди.'};
const en={launch:'WALK THE HOOD',launchSub:'5 encounters · the street remembers',run:'STREET WALK',step:'ENCOUNTER',momentum:'momentum',clues:'clues',danger:'danger',end:'Head home',encounter:'WHAT IS HAPPENING?',consequenceHint:'Numbers stay hidden. You learn the choice through its consequences.',runComplete:'WALK COMPLETE',encounters:'Encounters',streetRead:'Familiarity',score:'Run score',walkAgain:'Walk again',completedTitle:'Walk complete',completedMessage:'The street remembers how you behaved.',errorTitle:'Walk interrupted',loadError:'Street memory could not be loaded.'};
