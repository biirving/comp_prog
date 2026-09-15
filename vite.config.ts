import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
let lastCall=0;let queue:Promise<unknown>=Promise.resolve();
function api(method:string,params:Record<string,string>){const next=queue.then(async()=>{await new Promise(r=>setTimeout(r,Math.max(0,2100-(Date.now()-lastCall))));lastCall=Date.now();const r=await fetch(`https://codeforces.com/api/${method}?${new URLSearchParams(params)}`,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Codeforces unavailable');const j=await r.json();if(j.status!=='OK')throw new Error('Codeforces rejected the request. Check your handle.');return j.result;});queue=next.catch(()=>{});return next;}
export default defineConfig({base:'/',resolve:{alias:[
 // monaco-vim's browser export is UMD, and its imports predate Monaco 0.56's export map.
 {find:/^monaco-vim$/,replacement:fileURLToPath(new URL('./node_modules/monaco-vim/dist/index.mjs',import.meta.url))},
 {find:/^monaco-editor\/esm\/vs\//,replacement:'monaco-editor/'}
]},server:{port:5173,strictPort:true},plugins:[{name:'public-codeforces-preview',configureServer(server){server.middlewares.use('/api',async(req,res,next)=>{
 const url=new URL(req.url||'/','http://localhost');
 if(!['/codeforces','/catalog'].includes(url.pathname))return next();
 res.setHeader('Content-Type','application/json');
 try{
 if(url.pathname==='/catalog'){const data=await api('problemset.problems',{});const counts=new Map(data.problemStatistics.map((p:any)=>[`${p.contestId}${p.index}`,p.solvedCount]));return res.end(JSON.stringify({updatedAt:new Date().toISOString(),problems:data.problems.filter((p:any)=>p.rating&&p.contestId&&!p.tags.includes('*special')).map((p:any)=>({...p,id:`${p.contestId}${p.index}`,solvedCount:counts.get(`${p.contestId}${p.index}`)||0}))}));}
 const handle=url.searchParams.get('handle')||'';if(!/^[a-zA-Z0-9_.-]{3,24}$/.test(handle)){res.statusCode=400;return res.end(JSON.stringify({error:'Enter a valid Codeforces handle.'}));}
 const [user]=await api('user.info',{handles:handle});const solved=new Map(),accepted:Record<string,number>={};let submissionCount=0;
 for(let from=1;;from+=10000){const page=await api('user.status',{handle,from:String(from),count:'10000'});submissionCount+=page.length;for(const s of page)if(s.verdict==='OK'){const id=`${s.problem.contestId}${s.problem.index}`;solved.set(id,s.problem);accepted[id]=Math.max(accepted[id]||0,s.creationTimeSeconds*1000);}if(page.length<10000)break;}
 res.end(JSON.stringify({handle:user.handle,rating:user.rating??null,maxRating:user.maxRating??null,solved:[...solved.values()],accepted,submissionCount,syncedAt:new Date().toISOString()}));
 }catch(e){res.statusCode=502;res.end(JSON.stringify({error:(e as Error).message}));}
 });}}]});
