import {topics} from './topics.ts';
import type {State,Log,Problem,Topic,Active,Profile} from './types.ts';
export const DAY=86400000;
export const key=(p:{contestId:number;index:string})=>`${p.contestId}${p.index}`;
export const qualified=(l:Log)=>l.outcome==='independent'&&!l.help&&l.verified&&l.seconds<=25*60&&l.checks.every(Boolean)&&l.checks.length===3;
export function ratingLadders(catalog:Problem[]){return Object.fromEntries(topics.map(t=>{
 const counts=new Map<number,number>();for(const p of catalog)if(p.tags.some(tag=>t.tags.includes(tag)))counts.set(p.rating,(counts.get(p.rating)||0)+1);
 return [t.id,[...counts].filter(([,count])=>count>=3).map(([rating])=>rating).sort((a,b)=>a-b)];
}));}
export function progress(state:State,topicId:string){
 const logs=state.logs.filter(l=>l.topicId===topicId).sort((a,b)=>a.finishedAt-b.finishedAt);
 const ladder=state.bands?.[topicId]||Array.from({length:28},(_,i)=>800+i*100);
 let band=ladder.find(r=>r>=state.initialBand)??state.initialBand, cleared:number|null=null, since=0;
 let fresh:Log[]=[],reviewed=false;
 for(let round=0;round<35;round++){
  const relevant=logs.filter(l=>l.rating===band&&l.finishedAt>=since);
  const earned=new Map<string,Log>();
  for(const l of relevant){
   const delayedRecall=!l.review||logs.some(previous=>previous.problemId===l.problemId&&l.startedAt-previous.finishedAt>=2*DAY);
   if(qualified(l)&&delayedRecall&&!earned.has(l.problemId))earned.set(l.problemId,l);
  }
  fresh=[...earned.values()];
  const reviews=relevant.filter(l=>l.review&&qualified(l)&&fresh.some(f=>f.problemId===l.problemId&&l.startedAt-f.finishedAt>=2*DAY));
  reviewed=reviews.length>0;
  if(fresh.length<3||!reviewed)break;
  const third=fresh.sort((a,b)=>a.finishedAt-b.finishedAt)[2].finishedAt;
  since=Math.max(third,Math.min(...reviews.map(l=>l.finishedAt)));cleared=band;band=ladder.find(r=>r>band)??band+100;
 }
 return {band,cleared,fresh:Math.min(3,fresh.length),reviewed,attempts:logs.length,last:logs.at(-1)?.finishedAt||0};
}
export function reviews(state:State,now=Date.now()){
 const latest=new Map<string,Log>();
 for(const l of [...state.logs].sort((a,b)=>a.finishedAt-b.finishedAt))latest.set(l.topicId+':'+l.problemId,l);
 return [...latest.values()].map(l=>{
  const passes=state.logs.filter(x=>x.problemId===l.problemId&&x.topicId===l.topicId&&x.review&&qualified(x)).length;
  const days=l.outcome==='stuck'?1:l.outcome==='assisted'||!qualified(l)?2:[2,7,21,45][Math.min(passes,3)];
  return {log:l,dueAt:l.finishedAt+days*DAY,due:l.finishedAt+days*DAY<=now};
 }).sort((a,b)=>a.dueAt-b.dueAt);
}
export function candidates(state:State,catalog:Problem[],topic:Topic,band:number,now=Date.now()){
 const excluded=new Set([...state.profile.solved.map(key),...state.logs.map(l=>l.problemId)]);
 return catalog.filter(p=>p.rating===band&&p.tags.some(t=>topic.tags.includes(t))&&!excluded.has(p.id)&&(state.deferred[p.id]||0)<=now)
 .sort((a,b)=>b.solvedCount-a.solvedCount||a.id.localeCompare(b.id));
}
export function plan(state:State,catalog:Problem[],now=Date.now(),onlyTopic?:string){
 const due=reviews(state,now).filter(r=>r.due&&(!onlyTopic||r.log.topicId===onlyTopic));
 // At most one scheduled review between fresh problems, so overdue work cannot starve coverage.
 const last=state.logs.at(-1);
 if(due.length&&(!last?.review||onlyTopic)){
  const match=due.find(r=>catalog.some(p=>p.id===r.log.problemId)&&(state.deferred[r.log.problemId]||0)<=now);
  if(match)return {problem:catalog.find(p=>p.id===match.log.problemId)!,topic:topics.find(t=>t.id===match.log.topicId)!,review:true,reason:'Due for retrieval practice. Solve it again without your old notes.'};
 }
 const ordered=topics.filter(t=>!onlyTopic||t.id===onlyTopic).sort((a,b)=>{
  const pa=progress(state,a.id),pb=progress(state,b.id);
  return pa.last-pb.last||pa.band-pb.band||topics.indexOf(a)-topics.indexOf(b);
 });
 for(const topic of ordered){
  const level=progress(state,topic.id);const list=candidates(state,catalog,topic,level.band,now);
  if(list.length)return {problem:list[0],topic,review:false,reason:level.last?'Your least recently practiced available category. Another step at your current band.':'An uncalibrated category. Start with one problem and build evidence.'};
 }
 return null;
}
export function elapsed(active:Active,now=Date.now()){return active.elapsed+(active.runningSince===null?0:Math.max(0,(now-active.runningSince)/1000));}
export function localDay(timestamp:number){const d=new Date(timestamp);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function verifyLogs(state:State){
 for(const l of state.logs){if((state.profile.accepted[l.problemId]||0)>=l.startedAt)l.verified=true;}
}
export function trackProfile(state:State,profile:Profile,now=Date.now()){
 const previous=state.profile.handle.toLowerCase(),next=profile.handle.toLowerCase();
 if(previous!==next){
  if(state.active){state.active.elapsed=elapsed(state.active,now);state.active.runningSince=null;}
  state.accounts={...state.accounts,[previous]:structuredClone({initialBand:state.initialBand,logs:state.logs,active:state.active,deferred:state.deferred})};
  const restored=Object.hasOwn(state.accounts,next)?state.accounts[next]:null;
  state.initialBand=restored?.initialBand??800;state.logs=structuredClone(restored?.logs??[]);
  state.active=structuredClone(restored?.active??null);state.deferred={...restored?.deferred};
  if(state.active)state.active.runningSince=null;
 }
 state.profile=profile;verifyLogs(state);
}
export function validState(value:unknown):value is State {
 if(!value||typeof value!=='object')return false;const s=value as State;
 const validCatalog=!s.catalog||(typeof s.catalog.updatedAt==='string'&&Number.isFinite(Date.parse(s.catalog.updatedAt))&&Array.isArray(s.catalog.problems)&&s.catalog.problems.length>0&&s.catalog.problems.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&Number.isFinite(p.contestId)&&typeof p.index==='string'&&Number.isFinite(p.rating)&&Number.isFinite(p.solvedCount)&&Array.isArray(p.tags)&&p.tags.every(t=>typeof t==='string')));
 const validAccounts=s.accounts===undefined||!!s.accounts&&typeof s.accounts==='object'&&!Array.isArray(s.accounts)&&Object.entries(s.accounts).every(([handle,account])=>/^[a-zA-Z0-9_.-]{3,24}$/.test(handle)&&!!account&&validState({...s,...account,accounts:undefined,catalog:undefined}));
 return validAccounts&&validCatalog&&s.version===1&&[30,45,60].includes(s.duration)&&[800,900,1000].includes(s.initialBand)&&Array.isArray(s.logs)&&s.logs.every(l=>
  typeof l.id==='string'&&typeof l.problemId==='string'&&topics.some(t=>t.id===l.topicId)&&Number.isFinite(l.rating)&&Number.isFinite(l.startedAt)&&Number.isFinite(l.finishedAt)&&l.finishedAt>=l.startedAt&&Number.isFinite(l.seconds)&&l.seconds>=0&&['independent','assisted','stuck'].includes(l.outcome)&&typeof l.notes==='string'&&typeof l.blocker==='string'&&typeof l.help==='boolean'&&typeof l.review==='boolean'&&typeof l.verified==='boolean'&&Array.isArray(l.checks)&&l.checks.length===3&&l.checks.every(x=>typeof x==='boolean'))&&
  !!s.profile&&typeof s.profile.handle==='string'&&Number.isFinite(Date.parse(s.profile.syncedAt))&&Array.isArray(s.profile.solved)&&s.profile.solved.every(p=>Number.isFinite(p.contestId)&&typeof p.index==='string'&&Array.isArray(p.tags)&&p.tags.every(t=>typeof t==='string'))&&!!s.profile.accepted&&typeof s.profile.accepted==='object'&&Object.values(s.profile.accepted).every(Number.isFinite)&&!!s.deferred&&typeof s.deferred==='object'&&Object.values(s.deferred).every(Number.isFinite)&&
  (s.active===null||!!s.active&&typeof s.active.problemId==='string'&&topics.some(t=>t.id===s.active!.topicId)&&Number.isFinite(s.active.rating)&&Number.isFinite(s.active.startedAt)&&Number.isFinite(s.active.elapsed)&&s.active.elapsed>=0&&(s.active.runningSince===null||Number.isFinite(s.active.runningSince))&&Number.isFinite(s.active.duration)&&typeof s.active.notes==='string'&&typeof s.active.help==='boolean'&&typeof s.active.review==='boolean'&&Array.isArray(s.active.checks)&&s.active.checks.length===3&&s.active.checks.every(x=>typeof x==='boolean'));
}
