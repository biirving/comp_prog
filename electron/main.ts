import { app, BrowserWindow, ipcMain, shell, protocol, net, session, clipboard } from 'electron';
import {checkCpp} from './compiler.js';
import {fetchLeetCode} from './leetcode.js';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
protocol.registerSchemesAsPrivileged([{scheme:'fieldwork',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let window: BrowserWindow | null = null;
const allowedHosts = new Set(['codeforces.com','youkn0wwho.academy','cp-algorithms.com','leetcode.com']);
function trusted(event: Electron.IpcMainInvokeEvent) {
 if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || !event.senderFrame.url.startsWith('fieldwork://app/')) throw new Error('Untrusted request');
}
let lastApi = 0;
let apiQueue: Promise<unknown> = Promise.resolve();
function api(method: string, parameters: Record<string,string>) {
 const result = apiQueue.then(async () => {
  await new Promise(r=>setTimeout(r,Math.max(0,2100-(Date.now()-lastApi))));
  lastApi=Date.now();
  const response = await net.fetch(`https://codeforces.com/api/${method}?${new URLSearchParams(parameters)}`,{signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('Codeforces is unavailable. Your saved data is unchanged.');
  const data=await response.json();
  if (data.status!=='OK') throw new Error('Codeforces could not complete this request. Check the handle and try again later.');
  return data.result;
 });
 apiQueue=result.catch(()=>{}); return result;
}
let saveQueue: Promise<void> = Promise.resolve();
app.whenReady().then(async () => {
 const root=path.resolve(here,'../dist');
 protocol.handle('fieldwork',async request=>{
  const url=new URL(request.url);
  const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(url.host!=='app'||!target.startsWith(root+path.sep)) return new Response('Forbidden',{status:403});
  return net.fetch(pathToFileURL(target).toString());
 });
 session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 ipcMain.handle('cpp:check',async(event,code:unknown)=>{trusted(event);return checkCpp(code);});
 ipcMain.handle('lc:sync',async(event,username:unknown)=>{trusted(event);if(typeof username!=='string')throw new Error('Enter a valid LeetCode username.');return fetchLeetCode(username,net.fetch);});
 ipcMain.handle('code:copy',async(event,code:unknown)=>{trusted(event);if(typeof code!=='string'||code.length>500000)throw new Error('Invalid source');await clipboard.writeText(code);});
 ipcMain.handle('code:paste',async event=>{trusted(event);const text=await clipboard.readText();if(text.length>500000)throw new Error('Clipboard text must be under 500 KB.');return text;});
 ipcMain.handle('state:load',async event=>{trusted(event);try{return await readFile(path.join(app.getPath('userData'),'progress.json'),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}});
 ipcMain.handle('state:save',(event,json: unknown)=>{
  trusted(event);if(typeof json!=='string'||json.length>20_000_000)throw new Error('Invalid progress file');
  const parsed=JSON.parse(json);if(parsed.version!==1||!Array.isArray(parsed.logs))throw new Error('Invalid progress file');
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{
   const directory=app.getPath('userData');await mkdir(directory,{recursive:true});
   const target=path.join(directory,'progress.json');await writeFile(target+'.tmp',json as string);await rename(target+'.tmp',target);
  });return saveQueue;
 });
 ipcMain.handle('cf:sync',async(event,handle:unknown)=>{
  trusted(event);if(typeof handle!=='string'||!/^[a-zA-Z0-9_.-]{3,24}$/.test(handle))throw new Error('Enter a valid Codeforces handle.');
  const [user]=await api('user.info',{handles:handle});
  const accepted: Record<string,number>={};const solved=new Map();let submissionCount=0;
  for(let from=1;;from+=10000){
   const page=await api('user.status',{handle,from:String(from),count:'10000'});submissionCount+=page.length;
   for(const s of page)if(s.verdict==='OK'){
    const id=`${s.problem.contestId}${s.problem.index}`;solved.set(id,s.problem);
    accepted[id]=Math.max(accepted[id]||0,s.creationTimeSeconds*1000);
   }
   if(page.length<10000)break;
  }
  return {handle:user.handle,rating:user.rating??null,maxRating:user.maxRating??null,solved:[...solved.values()],accepted,submissionCount,syncedAt:new Date().toISOString()};
 });
 ipcMain.handle('cf:catalog',async event=>{
  trusted(event);const result=await api('problemset.problems',{lang:'en'});
  const counts=new Map(result.problemStatistics.map((p:any)=>[`${p.contestId}${p.index}`,p.solvedCount]));
  return {updatedAt:new Date().toISOString(),problems:result.problems.filter((p:any)=>p.rating&&p.contestId&&!p.tags.includes('*special')).map((p:any)=>({...p,id:`${p.contestId}${p.index}`,solvedCount:counts.get(`${p.contestId}${p.index}`)||0}))};
 });
 ipcMain.handle('external:open',async(event,url:unknown)=>{trusted(event);if(typeof url!=='string')return;const parsed=new URL(url);if(parsed.protocol!=='https:'||!allowedHosts.has(parsed.hostname))throw new Error('Unsupported link');await shell.openExternal(parsed.href);});
 const create=()=>{
  window=new BrowserWindow({width:1400,height:950,minWidth:840,minHeight:650,title:'Fieldwork',backgroundColor:'#121815',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.loadURL('fieldwork://app/');window.on('closed',()=>{window=null;});
 };
 create();app.on('activate',()=>{if(!window)create();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
