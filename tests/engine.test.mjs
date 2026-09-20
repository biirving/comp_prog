import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {progress,plan,reviews,qualified,elapsed,verifyLogs,validState,DAY,candidates,ratingLadders,trackProfile,savedSolution,completionEvidence,categoryProblems,repeatCandidate} from '../src/engine.ts';
import {topics} from '../src/topics.ts';
const seed=JSON.parse(await readFile(new URL('../public/seed.json',import.meta.url)));
const catalog=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url))).problems;
const fresh=()=>({version:1,duration:30,initialBand:800,profile:{...structuredClone(seed),accepted:{}},logs:[],active:null,deferred:{}});
const log=(overrides={})=>({id:crypto.randomUUID(),problemId:'100A',topicId:'implementation',rating:800,startedAt:100000,finishedAt:100000+1200000,seconds:1200,outcome:'independent',help:false,verified:true,review:false,notes:'Invariant',blocker:'',checks:[true,true,true],...overrides});
test('historical high-rated accepts do not inflate any category',()=>{const s=fresh();for(const t of topics){assert.equal(progress(s,t.id).band,800);assert.equal(progress(s,t.id).cleared,null);}});
test('promotion requires three distinct verified solves and a delayed repeat',()=>{const s=fresh();s.logs=[log(),log({problemId:'101A'}),log({problemId:'102A'})];assert.equal(progress(s,'implementation').band,800);s.logs.push(log({review:true,startedAt:s.logs[0].finishedAt+2*DAY,finishedAt:s.logs[0].finishedAt+2*DAY+1200000}));assert.equal(progress(s,'implementation').band,900);assert.equal(progress(s,'implementation').cleared,800);assert.equal(progress(s,'graphs').band,800);});
test('repeated fresh IDs cannot substitute for three distinct problems',()=>{const s=fresh();s.logs=[log(),log(),log(),log({review:true,startedAt:4*DAY,finishedAt:4*DAY+1200000})];assert.equal(progress(s,'implementation').band,800);});
test('help, slow solves, incomplete checks, unverified results never qualify',()=>{for(const override of [{help:true},{seconds:1501},{verified:false},{outcome:'assisted'},{outcome:'stuck'},{checks:[true,false,true]}])assert.equal(qualified(log(override)),false);assert.equal(qualified(log({seconds:1500})),true);});
test('review before 48 hours cannot unlock promotion',()=>{const s=fresh();s.logs=[log(),log({problemId:'101A'}),log({problemId:'102A'}),log({review:true,startedAt:DAY,finishedAt:DAY+1200000})];assert.equal(progress(s,'implementation').band,800);});
test('off-band solves never skip rating levels',()=>{const s=fresh();s.logs=[log({rating:1600}),log({problemId:'101A',rating:1600}),log({problemId:'102A',rating:1600}),log({rating:1600,review:true,startedAt:4*DAY,finishedAt:4*DAY+1200000})];assert.equal(progress(s,'implementation').band,800);});
test('assisted learning can later earn credit through independent delayed recall',()=>{const s=fresh();s.logs=[log({outcome:'assisted',help:true}),log({review:true,startedAt:4*DAY,finishedAt:4*DAY+1200000})];assert.equal(progress(s,'implementation').fresh,1);assert.equal(progress(s,'implementation').reviewed,false);s.logs.push(log({review:true,startedAt:8*DAY,finishedAt:8*DAY+1200000}));assert.equal(progress(s,'implementation').fresh,1);assert.equal(progress(s,'implementation').reviewed,true);});
test('planner uses exact bands, excludes historical accepts, rotates categories',()=>{const s=fresh();const first=plan(s,catalog);assert.equal(first.problem.rating,800);assert.ok(!s.profile.solved.some(p=>`${p.contestId}${p.index}`===first.problem.id));s.logs.push(log({problemId:first.problem.id,topicId:first.topic.id,finishedAt:Date.now()}));const second=plan(s,catalog);assert.notEqual(second.topic.id,first.topic.id);assert.equal(second.problem.rating,800);});
test('due reviews do not starve fresh categories',()=>{const s=fresh();const p=plan(s,catalog);s.logs=[log({problemId:p.problem.id,topicId:p.topic.id})];const due=plan(s,catalog,10*DAY);assert.equal(due.review,true);s.logs.push(log({problemId:p.problem.id,review:true,finishedAt:10*DAY,startedAt:10*DAY-1200000}));assert.equal(plan(s,catalog,10*DAY+1000).review,false);});
test('review spacing expands after qualifying retrieval',()=>{const s=fresh();s.logs=[log()];assert.equal(reviews(s)[0].dueAt,s.logs[0].finishedAt+2*DAY);s.logs.push(log({review:true,startedAt:4*DAY,finishedAt:4*DAY+1200000}));assert.equal(reviews(s)[0].dueAt,s.logs[1].finishedAt+7*DAY);});
test('acceptance must occur after session start, including reviews',()=>{const s=fresh();s.logs=[log({verified:false}),log({problemId:'101A',review:true,verified:false})];s.profile.accepted={'100A':99999,'101A':200000};verifyLogs(s);assert.equal(s.logs[0].verified,false);assert.equal(s.logs[1].verified,true);});
test('timer uses wall-clock deltas and pauses exactly',()=>{assert.equal(elapsed({elapsed:10,runningSince:1000},6000),15);assert.equal(elapsed({elapsed:10,runningSince:null},999999),10);});
test('backup validation rejects corrupt progress',()=>{const s=fresh();assert.equal(validState(s),true);assert.equal(validState({...s,logs:[{id:'bad'}]}),false);assert.equal(validState({...s,initialBand:5000}),false);assert.equal(validState({...s,active:{problemId:'x'}}),false);});
test('sparse bands use the next supported rating without inventing earned credit',()=>{const s=fresh();s.bands=ratingLadders(catalog);assert.equal(progress(s,'dsu').band,1100);assert.equal(progress(s,'dsu').cleared,null);for(const t of topics){const band=progress(s,t.id).band;const n=catalog.filter(p=>p.rating===band&&p.tags.some(tag=>t.tags.includes(tag))).length;assert.ok(n>=3,`${t.name} only has ${n} problems at ${band}`);}});

test('switching handles isolates verification and restores prior practice',()=>{
 const s=fresh();const original=structuredClone(s.profile);s.logs=[log({verified:false})];
 s.active={problemId:'100B',topicId:'implementation',rating:800,startedAt:1000,elapsed:5,runningSince:1000,duration:30,review:false,help:false,notes:'keep me',checks:[false,false,false],code:'int main(){}'};
 trackProfile(s,{...original,handle:'another_user',accepted:{'100A':300000}},6000);
 assert.equal(s.logs.length,0);assert.equal(s.active,null);assert.equal(s.accounts[original.handle].logs[0].verified,false);
 s.logs=[log({problemId:'200A'})];trackProfile(s,original,7000);
 assert.equal(s.logs[0].problemId,'100A');assert.equal(s.logs[0].verified,false);assert.equal(s.active.notes,'keep me');assert.equal(s.active.elapsed,10);assert.equal(s.active.runningSince,null);
 assert.equal(s.accounts.another_user.logs[0].problemId,'200A');assert.equal(validState(s),true);
});
test('case-only handle updates do not reset progress',()=>{const s=fresh();s.logs=[log()];trackProfile(s,{...s.profile,handle:s.profile.handle.toUpperCase()});assert.equal(s.logs.length,1);assert.equal(s.accounts,undefined);});
test('corrupt account archives are rejected on import',()=>{const s=fresh();assert.equal(validState({...s,accounts:{broken:{logs:[{bad:true}]}}}),false);});

test('reviews deduplicate a problem across categories and use the latest schedule',()=>{
 const s=fresh();s.logs=[log(),log({topicId:'greedy',finishedAt:3*DAY,startedAt:3*DAY-1000,review:true})];
 const queue=reviews(s,3*DAY);assert.equal(queue.length,1);assert.equal(queue[0].log.topicId,'greedy');assert.equal(queue[0].due,false);assert.equal(queue[0].dueAt,10*DAY);
});
test('latest real solution survives starter-only and empty repeat attempts',()=>{
 const s=fresh();s.logs=[log({code:'int main(){return 42;}',finishedAt:DAY}),log({code:'template',finishedAt:2*DAY}),log({code:'',finishedAt:3*DAY})];
 assert.equal(savedSolution(s,'100A','template').code,'int main(){return 42;}');assert.equal(savedSolution(s,'101A','template'),undefined);
 assert.equal(savedSolution({...s,logs:[log({code:'template'})]},'100A','template'),undefined);
});

test('completion evidence explains blockers and includes imported accepts',()=>{
 const s=fresh();s.profile.solved=[{contestId:101,index:'A',rating:800,tags:['implementation']}];s.logs=[log({verified:false,checks:[false,false,false],seconds:1600})];
 const rows=completionEvidence(s,[],'implementation',800);assert.equal(rows.length,2);assert.equal(rows.find(r=>r.problemId==='100A').reasons.length,3);assert.match(rows.find(r=>r.problemId==='101A').reasons[0],/Imported accept/);
});
test('manual completion credits are distinct, reversible, category and rating specific',()=>{
 const s=fresh();s.logs=[log({verified:false,help:true})];const original=structuredClone(s.logs);
 s.manualCredits=[{problemId:'100A',topicId:'implementation',rating:800,grantedAt:DAY},{problemId:'100A',topicId:'implementation',rating:800,grantedAt:DAY}];
 assert.equal(progress(s,'implementation').fresh,1);assert.equal(progress(s,'greedy').fresh,0);assert.deepEqual(s.logs,original);
 assert.equal(completionEvidence(s,[],'implementation',800)[0].manual,true);s.manualCredits=[];assert.equal(progress(s,'implementation').fresh,0);
 s.manualCredits=[{problemId:'100A',topicId:'implementation',rating:900,grantedAt:DAY}];assert.equal(progress(s,'implementation').fresh,0);
});
test('three manual solves still require delayed review to advance',()=>{
 const s=fresh();s.logs=[log({verified:false})];s.manualCredits=['100A','101A','102A'].map(problemId=>({problemId,topicId:'implementation',rating:800,grantedAt:DAY}));
 assert.equal(progress(s,'implementation').fresh,3);assert.equal(progress(s,'implementation').band,800);
 s.logs.push(log({review:true,startedAt:4*DAY,finishedAt:4*DAY+1200000}));assert.equal(progress(s,'implementation').band,900);
 s.manualCredits=[];assert.equal(progress(s,'implementation').band,800);
});
test('manual credits survive account switching and backup validation',()=>{
 const s=fresh(),profile=structuredClone(s.profile);s.manualCredits=[{problemId:'100A',topicId:'implementation',rating:800,grantedAt:DAY}];assert.equal(validState(s),true);
 trackProfile(s,{...profile,handle:'other_user'});assert.deepEqual(s.manualCredits,[]);trackProfile(s,profile);assert.equal(s.manualCredits.length,1);
 assert.equal(validState({...s,manualCredits:[{bad:true}]}),false);
});
test('repeat candidate selects an eligible delayed prior solve',()=>{
 const s=fresh(),first=log({problemId:'282A',finishedAt:DAY,startedAt:DAY-1200000}),second=log({problemId:'231A',finishedAt:DAY+1000,startedAt:DAY-1199000}),third=log({problemId:'263A',finishedAt:DAY+2000,startedAt:DAY-1198000});
 s.logs=[first,second,third];assert.equal(repeatCandidate(s,catalog,'implementation',DAY+2*DAY)?.problem.id,'282A');
 s.logs.push(log({problemId:'282A',review:true,startedAt:DAY+2*DAY,finishedAt:DAY+2*DAY+1200000}));
 s.logs.push(log({problemId:'231A',review:true,startedAt:DAY+2*DAY,finishedAt:DAY+2*DAY+1200000}));
 s.logs.push(log({problemId:'263A',review:true,startedAt:DAY+2*DAY,finishedAt:DAY+2*DAY+1200000}));assert.equal(repeatCandidate(s,catalog,'implementation',DAY+4*DAY),undefined);
});
test('repeat candidate stays unavailable before three completions or 48 hours',()=>{
 const s=fresh();s.logs=[log({problemId:'282A'}),log({problemId:'231A'}),log({problemId:'263A'})];assert.equal(repeatCandidate(s,catalog,'implementation',DAY+DAY),undefined);for(const l of s.logs)l.finishedAt=9*DAY;assert.equal(repeatCandidate(s,catalog,'implementation',10*DAY),undefined);
});

test('category problem history groups retries newest-first and keeps category scope',()=>{
 const s=fresh();s.profile.solved=[];
 const first=log({id:'first',finishedAt:DAY,code:'first solution'}),retry=log({id:'retry',startedAt:3*DAY,finishedAt:3*DAY+1000,rating:900,code:'retry solution'});
 s.logs=[first,log({id:'other-category',topicId:'greedy',finishedAt:4*DAY}),retry];
 const original=structuredClone(s.logs),rows=categoryProblems(s,[],'implementation');
 assert.equal(rows.length,1);assert.deepEqual(rows[0].attempts.map(a=>a.id),['retry','first']);assert.equal(rows[0].rating,900);assert.deepEqual(s.logs,original);
 assert.equal(rows[0].attempts[1].code,'first solution');assert.equal(rows[0].evidence.counted,true);
});
test('active category draft is visible separately from completed attempts',()=>{
 const s=fresh();s.profile.solved=[];s.logs=[log()];
 s.active={...log({problemId:'200A',rating:1100}),elapsed:12,runningSince:null,duration:30,code:'draft'};
 const rows=categoryProblems(s,[],'implementation'),draft=rows.find(p=>p.problemId==='200A');
 assert.equal(rows.length,2);assert.equal(draft.attempts.length,0);assert.equal(draft.active.code,'draft');assert.equal(draft.rating,1100);assert.equal(draft.evidence,undefined);
 assert.equal(categoryProblems(s,[],'greedy').length,0);
 s.active.problemId='100A';assert.equal(categoryProblems(s,[],'implementation').length,1);assert.equal(categoryProblems(s,[],'implementation')[0].attempts.length,1);
});
test('imported accepts and manual-only credits appear with zero saved attempts across bands',()=>{
 const s=fresh();s.profile.solved=[{contestId:101,index:'A',rating:1500,tags:['implementation']},{contestId:102,index:'A',tags:[]},{contestId:103,index:'A',rating:800,tags:['greedy']}];
 s.manualCredits=[{problemId:'104A',topicId:'implementation',rating:1000,grantedAt:DAY},{problemId:'105A',topicId:'greedy',rating:800,grantedAt:DAY}];
 const localCatalog=[{id:'102A',name:'Catalog name',contestId:102,index:'A',rating:1200,tags:['implementation'],solvedCount:100}];
 const rows=categoryProblems(s,localCatalog,'implementation');assert.equal(rows.length,3);
 assert.ok(rows.every(p=>p.attempts.length===0));assert.equal(rows.find(p=>p.problemId==='101A').rating,1500);assert.equal(rows.find(p=>p.problemId==='101A').imported,true);
 assert.equal(rows.find(p=>p.problemId==='102A').name,'Catalog name');assert.equal(rows.find(p=>p.problemId==='102A').rating,1200);
 const manual=rows.find(p=>p.problemId==='104A');assert.equal(manual.rating,1000);assert.equal(manual.imported,false);assert.equal(manual.evidence.manual,true);
});
test('catalog rating wins while historical attempts retain their original rating and source',()=>{
 const s=fresh();s.profile.solved=[{contestId:100,index:'A',rating:800,tags:['implementation']}];s.logs=[log({rating:900})];
 const rows=categoryProblems(s,[{id:'100A',name:'Updated problem',contestId:100,index:'A',rating:1000,tags:['implementation'],solvedCount:100}],'implementation');
 assert.equal(rows.length,1);assert.equal(rows[0].rating,1000);assert.equal(rows[0].attempts[0].rating,900);assert.equal(rows[0].imported,true);assert.equal(rows[0].evidence,undefined);
 assert.deepEqual(categoryProblems(s,[],'unknown-category'),[]);
});

test('backup validates LeetCode profiles and ladder marks without requiring them',()=>{
 const s=fresh();assert.equal(validState(s),true);
 s.leetcode={username:'learner',syncedAt:new Date().toISOString(),totals:{all:1,easy:1,medium:0,hard:0},accepted:{'two-sum':{title:'Two Sum',timestamp:1000}}};s.ladderPractice={'lc:learner:two-sum':true};assert.equal(validState(s),true);
 assert.equal(validState({...s,leetcode:{username:'broken'}}),false);assert.equal(validState({...s,ladderPractice:{'lc:x:y':'yes'}}),false);
});
