/** Public LeetCode profile snapshot; recent accepts are limited to the latest 20 submissions. */
export interface LeetCodeProfile {
 username:string;
 syncedAt:string;
 totals:{all:number;easy:number;medium:number;hard:number};
 accepted:Record<string,{title:string;timestamp:number}>;
}
const usernamePattern=/^[a-zA-Z0-9_-]{1,40}$/;
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
export function validLeetCode(value:unknown):value is LeetCodeProfile {
 if(!record(value)||typeof value.username!=='string'||!usernamePattern.test(value.username)||typeof value.syncedAt!=='string'||!Number.isFinite(Date.parse(value.syncedAt))||!record(value.totals)||!record(value.accepted))return false;
 const totals=value.totals;
 if(!['all','easy','medium','hard'].every(key=>count(totals[key])))return false;
 if(value.totals.all!==Number(value.totals.easy)+Number(value.totals.medium)+Number(value.totals.hard))return false;
 return Object.entries(value.accepted).every(([slug,entry])=>slugPattern.test(slug)&&record(entry)&&typeof entry.title==='string'&&entry.title.length>0&&entry.title.length<=500&&count(entry.timestamp)&&entry.timestamp>0);
}
export function mergeLeetCode(previous:LeetCodeProfile|undefined,next:LeetCodeProfile):LeetCodeProfile {
 const merged=structuredClone(next);
 if(previous?.username.toLowerCase()!==next.username.toLowerCase())return merged;
 merged.accepted={...structuredClone(previous.accepted),...merged.accepted};
 for(const [slug,entry] of Object.entries(previous.accepted))if(entry.timestamp>(merged.accepted[slug]?.timestamp||0))merged.accepted[slug]=structuredClone(entry);
 return merged;
}
const query=`query FieldworkPublicProgress($username: String!, $limit: Int!) {
 matchedUser(username: $username) { username submitStatsGlobal { acSubmissionNum { difficulty count } } }
 recentAcSubmissionList(username: $username, limit: $limit) { title titleSlug timestamp }
}`;
export async function fetchLeetCode(username:string,fetcher:(input:string,init?:RequestInit)=>Promise<Response>=fetch):Promise<LeetCodeProfile> {
 if(typeof username!=='string'||!usernamePattern.test(username.trim()))throw new Error('Enter a valid LeetCode username (letters, numbers, underscores or hyphens).');
 username=username.trim();
 let response:Response;
 try {
  response=await fetcher('https://leetcode.com/graphql/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables:{username,limit:20}}),signal:AbortSignal.timeout(20000)});
 }catch(error){
  if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))throw new Error('LeetCode sync timed out. Your saved progress is unchanged. Try again later.');
  throw new Error('Could not reach LeetCode. Your saved progress is unchanged. Try again later.');
 }
 if(!response.ok)throw new Error('LeetCode is unavailable or blocked this request. Your saved progress is unchanged. Try again later.');
 let body:unknown;
 try{body=await response.json();}catch{throw new Error('LeetCode returned an unreadable response. Your saved progress is unchanged.');}
 if(record(body)&&record(body.data)&&body.data.matchedUser===null)throw new Error('LeetCode user not found. Check the username and public profile.');
 if(!record(body)||('errors' in body&&(!Array.isArray(body.errors)||body.errors.length>0)))throw new Error('LeetCode could not provide public progress. Your saved progress is unchanged.');
 const data=body.data;
 const invalid=()=>new Error('LeetCode returned incomplete progress. Your saved progress is unchanged.');
 if(!record(data)||!record(data.matchedUser)||!record(data.matchedUser.submitStatsGlobal)||!Array.isArray(data.matchedUser.submitStatsGlobal.acSubmissionNum)||!Array.isArray(data.recentAcSubmissionList))throw invalid();
 const user=data.matchedUser;
 if(typeof user.username!=='string'||user.username.toLowerCase()!==username.toLowerCase())throw invalid();
 const totals:LeetCodeProfile['totals']={all:0,easy:0,medium:0,hard:0};
 const seen=new Set<string>();
 for(const row of data.matchedUser.submitStatsGlobal.acSubmissionNum){
  if(!record(row)||typeof row.difficulty!=='string'||!count(row.count))throw invalid();
  const key=row.difficulty.toLowerCase();
  if(!['all','easy','medium','hard'].includes(key)||seen.has(key))throw invalid();
  seen.add(key);totals[key as keyof typeof totals]=row.count;
 }
 if(seen.size!==4)throw invalid();
 const accepted:LeetCodeProfile['accepted']={};
 if(data.recentAcSubmissionList.length>20)throw invalid();
 for(const row of data.recentAcSubmissionList){
  if(!record(row)||typeof row.titleSlug!=='string'||!slugPattern.test(row.titleSlug)||typeof row.title!=='string'||!row.title.trim()||row.title.length>500||!['string','number'].includes(typeof row.timestamp))throw invalid();
  const seconds=Number(row.timestamp);
  if(!count(seconds)||seconds<=0||seconds>Date.now()/1000+86400)throw invalid();
  const timestamp=seconds*1000;
  if(timestamp>(accepted[row.titleSlug]?.timestamp||0))accepted[row.titleSlug]={title:row.title,timestamp};
 }
 const result={username:user.username,syncedAt:new Date().toISOString(),totals,accepted};
 if(!validLeetCode(result))throw invalid();
 return result;
}
