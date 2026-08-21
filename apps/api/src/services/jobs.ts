import type { PoolClient } from 'pg';
import {
  JobsStateSchema, JobMutationResultSchema,
  type JobDefinition, type JobEvent, type JobDecision, type JobSkillKey, type JobsState, type JobMutationResult
} from '@sol-dorado/contracts/jobs';
import type { Database } from '../db.js';

type Queryable = Database | PoolClient;

const CAREER_XP = [0,80,190,340,540,800,1120,1510,1970,2500];
const JOB_XP = [0,45,120,230,390,610,900,1260,1700];
const SKILL_XP = [0,35,95,180,300,460,670,930];

export const JOB_SKILLS: JobSkillKey[] = [
  'manual_work','logistics','driving','navigation','safety','machinery','construction','mechanical','electrical','technical',
  'customer_service','commerce','communication','leadership','agriculture','fishing','seamanship','mining','forestry','cooking','hospitality'
];

export function levelFromXp(xp: number, table: number[]) {
  let level = 0;
  for (let index = 1; index < table.length; index += 1) if (xp >= table[index]!) level = index;
  return level;
}

const task = (id: string, titleBg: string, titleEn: string, skill: JobSkillKey) => ({ id, titleBg, titleEn, skill });

export const JOBS: JobDefinition[] = [
  { id:'warehouse',icon:'📦',titleBg:'Складов помощник',titleEn:'Warehouse Helper',employerKey:'quickdrop',employerBg:'QuickDrop Logistics',employerEn:'QuickDrop Logistics',descriptionBg:'Приемаш, сортираш и подготвяш градски доставки.',descriptionEn:'Receive, sort and prepare city freight.',archetype:'workflow',requirements:[],qualification:null,gainSkills:['logistics','manual_work'],tasks:[task('receive','Приеми входящата пратка','Receive incoming freight','logistics'),task('sort','Подреди палетите безопасно','Sort pallets safely','manual_work'),task('dispatch','Подготви експедицията','Prepare dispatch','logistics')] },
  { id:'grounds',icon:'🌿',titleBg:'Работник по поддръжка',titleEn:'Grounds Worker',employerKey:'municipal',employerBg:'Общински услуги Sol Dorado',employerEn:'Sol Dorado Municipal Services',descriptionBg:'Поддържаш паркове и обществени пространства.',descriptionEn:'Maintain parks and public spaces.',archetype:'site',requirements:[],qualification:null,gainSkills:['manual_work','safety'],tasks:[task('secure','Обезопаси работната зона','Secure the work area','safety'),task('green','Поддържай зелените площи','Maintain green areas','manual_work'),task('inspect','Провери оборудването','Inspect equipment','safety')] },
  { id:'sanitation',icon:'🗑️',titleBg:'Служител по чистота',titleEn:'Sanitation Worker',employerKey:'waste',employerBg:'Dorado Waste Services',employerEn:'Dorado Waste Services',descriptionBg:'Работиш по маршрут за отпадъци и рискови точки.',descriptionEn:'Work a waste route and handle risky stops.',archetype:'route',requirements:[{skill:'manual_work',level:1}],qualification:null,gainSkills:['manual_work','safety','logistics'],tasks:[task('southside','Обслужи Southside','Service Southside','manual_work'),task('cypress','Обслужи Cypress','Service Cypress','logistics'),task('downtown','Обслужи Downtown','Service Downtown','safety')] },
  { id:'delivery',icon:'🚐',titleBg:'Помощник доставки',titleEn:'Delivery Assistant',employerKey:'quickdrop',employerBg:'QuickDrop Logistics',employerEn:'QuickDrop Logistics',descriptionBg:'Подготвяш и разнасяш градски доставки.',descriptionEn:'Prepare and deliver local shipments.',archetype:'route',requirements:[{skill:'logistics',level:1}],qualification:null,gainSkills:['logistics','navigation'],tasks:[task('depot','Подготви пратките в склада','Prepare parcels at the depot','logistics'),task('route','Избери ред на доставките','Choose the delivery order','navigation'),task('handoff','Предай пратките','Hand over parcels','logistics')] },
  { id:'construction',icon:'🧱',titleBg:'Строителен работник',titleEn:'Construction Laborer',employerKey:'buildco',employerBg:'Dorado BuildCo',employerEn:'Dorado BuildCo',descriptionBg:'Физическа работа по строителни обекти.',descriptionEn:'Manual work on construction sites.',archetype:'site',requirements:[{skill:'manual_work',level:2}],qualification:null,gainSkills:['construction','safety','manual_work'],tasks:[task('secure','Обезопаси обекта','Secure the site','safety'),task('materials','Подготви материалите','Prepare materials','manual_work'),task('build','Изпълни задачата на обекта','Complete the site task','construction')] },
  { id:'retail',icon:'🏪',titleBg:'Служител в магазин',titleEn:'Retail Assistant',employerKey:'mercado',employerBg:'Mercado Dorado',employerEn:'Mercado Dorado',descriptionBg:'Обслужваш клиенти, наличности и ежедневни задачи.',descriptionEn:'Handle customers, stock and daily retail work.',archetype:'customer',requirements:[{skill:'customer_service',level:1}],qualification:null,gainSkills:['customer_service','commerce'],tasks:[task('customers','Обслужи клиентите','Serve customers','customer_service'),task('stock','Провери наличностите','Check stock','commerce'),task('floor','Подреди търговската зала','Maintain the shop floor','customer_service')] },
  { id:'kitchen',icon:'🍳',titleBg:'Помощник кухня',titleEn:'Kitchen Hand',employerKey:'elsol',employerBg:'El Sol Kitchen',employerEn:'El Sol Kitchen',descriptionBg:'Подготовка на продукти и работа по кухненски поток.',descriptionEn:'Food preparation and kitchen workflow support.',archetype:'workflow',requirements:[{skill:'manual_work',level:1},{skill:'safety',level:1}],qualification:null,gainSkills:['cooking','safety'],tasks:[task('prep','Подготви продуктите','Prepare ingredients','cooking'),task('orders','Подреди поръчките','Prioritize orders','cooking'),task('clean','Почисти станцията','Clean the station','safety')] },
  { id:'dock',icon:'⚓',titleBg:'Пристанищен работник',titleEn:'Dock Worker',employerKey:'port',employerBg:'Пристанище Sol Dorado',employerEn:'Port of Sol Dorado',descriptionBg:'Работиш с товар, манифести и експедиция в пристанището.',descriptionEn:'Handle cargo, manifests and loading at the port.',archetype:'workflow',requirements:[{skill:'manual_work',level:2},{skill:'logistics',level:1}],qualification:null,gainSkills:['logistics','manual_work','safety'],tasks:[task('manifest','Провери манифеста','Check the manifest','logistics'),task('cargo','Провери товара','Inspect cargo','safety'),task('loading','Подготви товаренето','Prepare loading','manual_work')] }
];

interface EventChoiceDefinition { id: string; labelBg: string; labelEn: string; quality: -1|0|1; payDeltaCents: number; consequenceBg: string; consequenceEn: string; skill?: JobSkillKey; needLevel?: number; }
interface EventDefinition { id: string; kind: 'opportunity'|'problem'|'skill'|'responsibility'; titleBg: string; titleEn: string; descriptionBg: string; descriptionEn: string; choices: EventChoiceDefinition[]; }
const EVENTS: Record<string, EventDefinition[]> = {
  warehouse:[{id:'unstable_pallet',kind:'problem',titleBg:'Нестабилен палет',titleEn:'Unstable pallet',descriptionBg:'Палетът изглежда зле подреден. Никой още не е докладвал проблем.',descriptionEn:'A pallet looks poorly stacked and nobody has reported it.',choices:[{id:'restack',labelBg:'Пренареди палета',labelEn:'Re-stack the pallet',quality:1,payDeltaCents:200,consequenceBg:'Проверката предотврати проблем при товаренето.',consequenceEn:'The check prevented a loading problem.',skill:'safety'},{id:'leave',labelBg:'Остави го както е',labelEn:'Leave it as it is',quality:-1,payDeltaCents:-300,consequenceBg:'Няколко кашона паднаха при преместването.',consequenceEn:'Several boxes fell during handling.'}]}],
  grounds:[{id:'crossing_people',kind:'problem',titleBg:'Хора пресичат зоната',titleEn:'People crossing',descriptionBg:'Пешеходци минават близо до работната техника.',descriptionEn:'Pedestrians are passing close to the equipment.',choices:[{id:'secure',labelBg:'Спри и обезопаси зоната',labelEn:'Stop and secure the area',quality:1,payDeltaCents:0,consequenceBg:'Зоната е обезопасена и работата продължава.',consequenceEn:'The area is secured and work resumes.',skill:'safety'},{id:'continue',labelBg:'Продължи внимателно',labelEn:'Keep working carefully',quality:-1,payDeltaCents:-200,consequenceBg:'Супервайзорът прекъсна работата заради риска.',consequenceEn:'The supervisor stopped the work because of the risk.'}]}],
  sanitation:[{id:'suspicious_bag',kind:'problem',titleBg:'Подозрителна торба',titleEn:'Suspicious bag',descriptionBg:'Виждат се счупено стъкло и неизвестна течност.',descriptionEn:'Broken glass and unknown liquid are visible.',choices:[{id:'procedure',labelBg:'Използвай защитната процедура',labelEn:'Use the safety procedure',quality:1,payDeltaCents:200,consequenceBg:'Материалът е обработен безопасно.',consequenceEn:'The material is handled safely.',skill:'safety'},{id:'normal',labelBg:'Вдигни я нормално',labelEn:'Handle it normally',quality:-1,payDeltaCents:-400,consequenceBg:'Торбата се скъса и трябваше да почистиш разсипаното.',consequenceEn:'The bag tore and the spill had to be cleaned.'}]}],
  delivery:[{id:'route_choice',kind:'opportunity',titleBg:'Две доставки са наблизо',titleEn:'Two stops are close',descriptionBg:'Можеш да промениш реда на маршрута.',descriptionEn:'You can change the delivery order.',choices:[{id:'optimize',labelBg:'Оптимизирай маршрута',labelEn:'Optimize the route',quality:1,payDeltaCents:300,consequenceBg:'Маршрутът се оказа по-бърз.',consequenceEn:'The route was faster.',skill:'navigation'},{id:'plan',labelBg:'Следвай плана',labelEn:'Follow the plan',quality:0,payDeltaCents:0,consequenceBg:'Доставките продължиха по стандартния маршрут.',consequenceEn:'Deliveries continued on the standard route.'}]}],
  construction:[{id:'materials',kind:'problem',titleBg:'Материалите са на грешното място',titleEn:'Materials misplaced',descriptionBg:'Част от доставката е оставена от другата страна на обекта.',descriptionEn:'Part of the delivery is across the site.',choices:[{id:'move',labelBg:'Премести ги преди работа',labelEn:'Move them before work',quality:1,payDeltaCents:200,consequenceBg:'След това задачата върви без прекъсване.',consequenceEn:'The task then proceeds without interruption.',skill:'construction'},{id:'start',labelBg:'Започни с наличното',labelEn:'Start with what is here',quality:-1,payDeltaCents:-300,consequenceBg:'Работата спря по средата заради липсващ материал.',consequenceEn:'Work stopped midway because material was missing.'}]}],
  retail:[{id:'price_dispute',kind:'problem',titleBg:'Клиент оспорва цената',titleEn:'Customer disputes price',descriptionBg:'Етикетът на рафта е различен от цената на касата.',descriptionEn:'The shelf label differs from checkout.',choices:[{id:'check',labelBg:'Провери етикета',labelEn:'Check the shelf label',quality:1,payDeltaCents:100,consequenceBg:'Откри грешен етикет и коригира ситуацията.',consequenceEn:'You found a wrong label and corrected the situation.',skill:'customer_service'},{id:'explain',labelBg:'Настоявай за цената на касата',labelEn:'Insist on the checkout price',quality:-1,payDeltaCents:-200,consequenceBg:'Клиентът поиска управител.',consequenceEn:'The customer asked for a manager.'}]}],
  kitchen:[{id:'order_rush',kind:'problem',titleBg:'Три поръчки идват наведнъж',titleEn:'Three orders land together',descriptionBg:'Една е бърза, една чака отдавна, а третата е голяма.',descriptionEn:'One is quick, one has waited longest, and one is large.',choices:[{id:'oldest',labelBg:'Първо най-старата поръчка',labelEn:'Oldest order first',quality:1,payDeltaCents:300,consequenceBg:'Потокът се стабилизира.',consequenceEn:'The workflow stabilized.',skill:'cooking'},{id:'quick',labelBg:'Първо най-бързата',labelEn:'Quick order first',quality:0,payDeltaCents:100,consequenceBg:'Освободи място, но старата поръчка остана под напрежение.',consequenceEn:'You freed space, but the oldest order remained under pressure.'}]}],
  dock:[{id:'cargo_mismatch',kind:'problem',titleBg:'Товарът не съвпада',titleEn:'Cargo mismatch',descriptionBg:'Контейнер е пристигнал без очакваната маркировка.',descriptionEn:'A container arrived without the expected marking.',choices:[{id:'hold',labelBg:'Задръж за проверка',labelEn:'Hold for verification',quality:1,payDeltaCents:400,consequenceBg:'Откри грешно насочен контейнер.',consequenceEn:'You caught a misrouted container.',skill:'logistics'},{id:'load',labelBg:'Продължи товаренето',labelEn:'Continue loading',quality:-1,payDeltaCents:-500,consequenceBg:'По-късно товарът трябваше да бъде изваден.',consequenceEn:'The cargo later had to be removed.'}]}]
};

export class JobCommandError extends Error { constructor(public readonly code: string, public readonly status: number) { super(code); } }

function responsibilityTier(jobLevel: number, rep: number) { if (jobLevel >= 7 && rep >= 75) return 4; if (jobLevel >= 5 && rep >= 45) return 3; if (jobLevel >= 3 && rep >= 20) return 2; return 1; }
function eventPublic(event: EventDefinition, skills: Record<string, number>): JobEvent { return { id:event.id,kind:event.kind,titleBg:event.titleBg,titleEn:event.titleEn,descriptionBg:event.descriptionBg,descriptionEn:event.descriptionEn,choices:event.choices.map(choice=>({id:choice.id,labelBg:choice.labelBg,labelEn:choice.labelEn,locked:Boolean(choice.skill && choice.needLevel && (skills[choice.skill]??0)<choice.needLevel),requires:choice.skill&&choice.needLevel?`${choice.skill}:${choice.needLevel}`:null})) }; }
async function ensureProfile(db: Queryable, playerId: string) { await db.query('INSERT INTO job_profiles(player_id) VALUES ($1) ON CONFLICT (player_id) DO NOTHING',[playerId]); }

export async function getJobsState(db: Queryable, playerId: string): Promise<JobsState> {
  await ensureProfile(db, playerId);
  const [profileResult,skillsResult,progressResult,shiftResult,historyResult] = await Promise.all([
    db.query('SELECT * FROM job_profiles WHERE player_id=$1',[playerId]),
    db.query('SELECT skill_key,xp FROM job_skill_progress WHERE player_id=$1',[playerId]),
    db.query('SELECT job_id,xp,employer_reputation,completed_shifts FROM job_progress WHERE player_id=$1',[playerId]),
    db.query("SELECT * FROM job_shifts WHERE player_id=$1 AND status='active' LIMIT 1",[playerId]),
    db.query('SELECT * FROM job_history WHERE player_id=$1 ORDER BY created_at DESC LIMIT 20',[playerId])
  ]);
  const profile=profileResult.rows[0];
  const skillXp=Object.fromEntries(skillsResult.rows.map(row=>[String(row.skill_key),Number(row.xp)]));
  const skillLevels=Object.fromEntries(JOB_SKILLS.map(skill=>[skill,levelFromXp(skillXp[skill]??0,SKILL_XP)]));
  const progress=Object.fromEntries(progressResult.rows.map(row=>[String(row.job_id),row]));
  const qualifications=(profile.qualifications??[]) as string[];
  const eligible=(job:JobDefinition)=>job.requirements.every(req=>(skillLevels[req.skill]??0)>=req.level)&&(!job.qualification||qualifications.includes(job.qualification));
  const decorate=(job:JobDefinition)=>{ const p=progress[job.id]; const xp=Number(p?.xp??0); const level=levelFromXp(xp,JOB_XP)+1; const rep=Number(p?.employer_reputation??0); return {...job,eligible:eligible(job),missing:[...job.requirements.filter(req=>(skillLevels[req.skill]??0)<req.level).map(req=>({skill:req.skill,level:req.level})),...job.qualification&&!qualifications.includes(job.qualification)?[{qualification:job.qualification}]:[]],jobXp:xp,jobLevel:level,employerReputation:rep,responsibilityTier:responsibilityTier(level,rep)}; };
  const all=JOBS.map(decorate);
  const completedShifts=Number(profile.completed_shifts??0);
  const opportunities=completedShifts<2?all.filter(job=>['warehouse','grounds'].includes(job.id)):all.filter(job=>job.eligible).concat(all.filter(job=>!job.eligible).sort((a,b)=>b.requirements.filter(req=>(skillLevels[req.skill]??0)>=req.level).length-a.requirements.filter(req=>(skillLevels[req.skill]??0)>=req.level).length).slice(0,4));
  const shift=shiftResult.rows[0];
  const activeShift=shift?{id:shift.id,jobId:String(shift.job_id),completedTaskIds:(shift.completed_task_ids??[]) as string[],currentEvent:shift.current_event as JobEvent|null,decisions:(shift.decisions??[]) as JobDecision[],bonusCents:Number(shift.bonus_cents),goodCount:Number(shift.good_count),badCount:Number(shift.bad_count),canFinish:(shift.completed_task_ids??[]).length>=2&&!shift.current_event,startedAt:new Date(shift.started_at).toISOString()}:null;
  return JobsStateSchema.parse({
    profile:{careerXp:Number(profile.career_xp),careerLevel:levelFromXp(Number(profile.career_xp),CAREER_XP)+1,reliability:Number(profile.reliability),completedShifts,qualifications,skills:JOB_SKILLS.map(skill=>{const xp=skillXp[skill]??0,level=levelFromXp(xp,SKILL_XP);return{skill,xp,level,nextLevelXp:level>=SKILL_XP.length-1?null:SKILL_XP[level+1]!};})},
    opportunities,activeShift,
    history:historyResult.rows.map(row=>{const job=JOBS.find(item=>item.id===row.job_id)!;return{id:row.id,jobId:String(row.job_id),titleBg:job?.titleBg??String(row.job_id),titleEn:job?.titleEn??String(row.job_id),employerBg:job?.employerBg??'',employerEn:job?.employerEn??'',payoutCents:Number(row.payout_cents),performance:String(row.performance),completedTasks:Number(row.completed_tasks),createdAt:new Date(row.created_at).toISOString()};})
  });
}

async function cashCents(db: Queryable, playerId:string){const result=await db.query('SELECT cash_cents FROM player_state WHERE player_id=$1',[playerId]);return Number(result.rows[0]?.cash_cents??0);}
async function result(db: Queryable, playerId:string, noticeBg:string, noticeEn:string):Promise<JobMutationResult>{return JobMutationResultSchema.parse({jobs:await getJobsState(db,playerId),cashCents:await cashCents(db,playerId),noticeBg,noticeEn});}

export async function startJobShift(db: Database, playerId:string, jobId:string):Promise<JobMutationResult>{
  const state=await getJobsState(db,playerId); const job=state.opportunities.find(item=>item.id===jobId);
  if(!job) throw new JobCommandError('job_not_available',404); if(!job.eligible) throw new JobCommandError('job_requirements_not_met',409); if(state.activeShift) throw new JobCommandError('job_shift_already_active',409);
  await db.query('INSERT INTO job_shifts(player_id,job_id) VALUES ($1,$2)',[playerId,jobId]);
  return result(db,playerId,'Смяната започна. Избери първата задача.','Shift started. Choose your first task.');
}

export async function completeJobTask(db: Database, playerId:string, shiftId:string, taskId:string):Promise<JobMutationResult>{
  const client=await db.connect();
  try{await client.query('BEGIN'); const shiftResult=await client.query("SELECT * FROM job_shifts WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE",[shiftId,playerId]); const shift=shiftResult.rows[0]; if(!shift) throw new JobCommandError('job_shift_not_found',404); if(shift.current_event) throw new JobCommandError('job_event_requires_choice',409);
    const job=JOBS.find(item=>item.id===shift.job_id); if(!job) throw new JobCommandError('job_definition_missing',500); const work=job.tasks.find(item=>item.id===taskId); if(!work) throw new JobCommandError('job_task_not_found',404); const done=(shift.completed_task_ids??[]) as string[]; if(done.includes(taskId)) throw new JobCommandError('job_task_already_done',409);
    await client.query(`INSERT INTO job_skill_progress(player_id,skill_key,xp) VALUES ($1,$2,6) ON CONFLICT(player_id,skill_key) DO UPDATE SET xp=job_skill_progress.xp+6,updated_at=now()`,[playerId,work.skill]);
    const nextDone=[...done,taskId]; const seen=(shift.seen_event_ids??[]) as string[]; const skillRows=await client.query('SELECT skill_key,xp FROM job_skill_progress WHERE player_id=$1',[playerId]); const levels=Object.fromEntries(skillRows.rows.map(row=>[String(row.skill_key),levelFromXp(Number(row.xp),SKILL_XP)]));
    const candidate=(EVENTS[job.id]??[]).find(event=>!seen.includes(event.id)); const spawn=Boolean(candidate&&nextDone.length<job.tasks.length); const currentEvent=spawn?eventPublic(candidate!,levels):null;
    await client.query('UPDATE job_shifts SET completed_task_ids=$3,seen_event_ids=$4,current_event=$5 WHERE id=$1 AND player_id=$2',[shiftId,playerId,nextDone,spawn?[...seen,candidate!.id]:seen,currentEvent]); await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  return result(db,playerId,'Задачата е изпълнена.','Task completed.');
}

export async function chooseJobEvent(db: Database, playerId:string, shiftId:string, eventId:string, choiceId:string):Promise<JobMutationResult>{
  const client=await db.connect();
  try{await client.query('BEGIN');const shiftResult=await client.query("SELECT * FROM job_shifts WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE",[shiftId,playerId]);const shift=shiftResult.rows[0];if(!shift)throw new JobCommandError('job_shift_not_found',404);const current=shift.current_event as JobEvent|null;if(!current||current.id!==eventId)throw new JobCommandError('job_event_not_active',409);const definition=(EVENTS[String(shift.job_id)]??[]).find(event=>event.id===eventId);const choice=definition?.choices.find(item=>item.id===choiceId);if(!choice)throw new JobCommandError('job_choice_not_found',404);
    if(choice.skill&&choice.needLevel){const skill=await client.query('SELECT xp FROM job_skill_progress WHERE player_id=$1 AND skill_key=$2',[playerId,choice.skill]);if(levelFromXp(Number(skill.rows[0]?.xp??0),SKILL_XP)<choice.needLevel)throw new JobCommandError('job_choice_locked',409);}
    const decision:JobDecision={eventId,choiceId,consequenceBg:choice.consequenceBg,consequenceEn:choice.consequenceEn,quality:choice.quality,payDeltaCents:choice.payDeltaCents};const decisions=[...((shift.decisions??[]) as JobDecision[]),decision];
    if(choice.skill)await client.query(`INSERT INTO job_skill_progress(player_id,skill_key,xp) VALUES ($1,$2,8) ON CONFLICT(player_id,skill_key) DO UPDATE SET xp=job_skill_progress.xp+8,updated_at=now()`,[playerId,choice.skill]);
    await client.query('UPDATE job_shifts SET decisions=$3,current_event=NULL,bonus_cents=bonus_cents+$4,good_count=good_count+$5,bad_count=bad_count+$6 WHERE id=$1 AND player_id=$2',[shiftId,playerId,JSON.stringify(decisions),choice.payDeltaCents,choice.quality>0?1:0,choice.quality<0?1:0]);await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  return result(db,playerId,'Решението има последица върху смяната.','Your decision affected the shift.');
}

export async function finishJobShift(db: Database, playerId:string, shiftId:string):Promise<JobMutationResult>{
  const client=await db.connect();
  let noticeBg='Смяната приключи.',noticeEn='Shift completed.';
  try{await client.query('BEGIN');const shiftResult=await client.query("SELECT * FROM job_shifts WHERE id=$1 AND player_id=$2 AND status='active' FOR UPDATE",[shiftId,playerId]);const shift=shiftResult.rows[0];if(!shift)throw new JobCommandError('job_shift_not_found',404);if(shift.current_event)throw new JobCommandError('job_event_requires_choice',409);const completed=((shift.completed_task_ids??[]) as string[]).length;if(completed<2)throw new JobCommandError('job_shift_not_ready',409);const job=JOBS.find(item=>item.id===shift.job_id);if(!job)throw new JobCommandError('job_definition_missing',500);
    const good=Number(shift.good_count),bad=Number(shift.bad_count),payout=Math.max(500,1800+Number(shift.bonus_cents)+good*200-bad*200),jobXp=10+completed*4+good*3,careerXp=4+completed*2;const repDelta=Math.max(-3,Math.min(3,(completed>=job.tasks.length?1:0)+good-bad));const performance=bad>good?'needs_improvement':good>=2?'excellent':good===1?'good':'completed';const reliabilityDelta=performance==='excellent'?3:performance==='good'?1:performance==='needs_improvement'?-2:0;
    await client.query('UPDATE player_state SET cash_cents=cash_cents+$2,version=version+1,updated_at=now() WHERE player_id=$1',[playerId,payout]);await client.query('UPDATE job_profiles SET career_xp=career_xp+$2,completed_shifts=completed_shifts+1,reliability=GREATEST(0,LEAST(100,reliability+$3)),updated_at=now() WHERE player_id=$1',[playerId,careerXp,reliabilityDelta]);await client.query(`INSERT INTO job_progress(player_id,job_id,xp,employer_reputation,completed_shifts) VALUES($1,$2,$3,GREATEST(0,$4),1) ON CONFLICT(player_id,job_id) DO UPDATE SET xp=job_progress.xp+$3,employer_reputation=GREATEST(0,LEAST(100,job_progress.employer_reputation+$4)),completed_shifts=job_progress.completed_shifts+1,updated_at=now()`,[playerId,job.id,jobXp,repDelta]);await client.query(`INSERT INTO job_skill_progress(player_id,skill_key,xp) VALUES($1,$2,10) ON CONFLICT(player_id,skill_key) DO UPDATE SET xp=job_skill_progress.xp+10,updated_at=now()`,[playerId,job.gainSkills[0]]);
    await client.query('INSERT INTO job_history(player_id,job_id,payout_cents,performance,completed_tasks,decisions,job_xp_earned,career_xp_earned,employer_rep_delta) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[playerId,job.id,payout,performance,completed,JSON.stringify(shift.decisions??[]),jobXp,careerXp,repDelta]);await client.query("UPDATE job_shifts SET status='completed',completed_at=now() WHERE id=$1",[shiftId]);await client.query('COMMIT');noticeBg=`Смяната приключи. Получи $${(payout/100).toFixed(2)}.`;noticeEn=`Shift completed. You earned $${(payout/100).toFixed(2)}.`;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  return result(db,playerId,noticeBg,noticeEn);
}
