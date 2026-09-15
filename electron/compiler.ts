import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
export interface Diagnostic {line:number;column:number;severity:'error'|'warning';message:string}
export async function checkCpp(code:unknown):Promise<{ok:boolean;output:string;diagnostics:Diagnostic[]}>{
 if(typeof code!=='string'||code.length>500000)throw new Error('C++ source must be under 500 KB.');
 const folder=await mkdtemp(join(tmpdir(),'fieldwork-cpp-'));
 try{
  const source=join(folder,'solution.cpp');await writeFile(source,code);
  // Apple Clang has no libstdc++ umbrella header. Provide common standard headers for local syntax checks.
  await mkdir(join(folder,'bits'));
  await writeFile(join(folder,'bits','stdc++.h'),['algorithm','array','bitset','cassert','cctype','climits','cmath','cstdint','cstring','deque','functional','iomanip','iostream','iterator','limits','list','map','numeric','optional','queue','random','set','sstream','stack','string','tuple','unordered_map','unordered_set','utility','vector'].map(h=>`#include <${h}>`).join('\n'));
  const result=await new Promise<{error:Error|null;stderr:string}>((resolve)=>execFile(process.platform==='win32'?'g++':'clang++',['-std=c++17','-fsyntax-only','-Wall','-Wextra','-fno-color-diagnostics','-I',folder,source],{timeout:15000,maxBuffer:1024*1024},(error,_stdout,stderr)=>resolve({error,stderr})));
  if((result.error as NodeJS.ErrnoException)?.code==='ENOENT')throw new Error('No C++ compiler found. On macOS, install Xcode Command Line Tools with xcode-select --install.');
  const diagnostics:Diagnostic[]=[];
  for(const line of result.stderr.split('\n')){
   const match=line.match(/solution\.cpp:(\d+):(\d+):\s+(error|warning|fatal error):\s+(.*)/);
   if(match)diagnostics.push({line:Number(match[1]),column:Number(match[2]),severity:match[3]==='warning'?'warning':'error',message:match[4]});
  }
  return {ok:!result.error,output:result.stderr.replaceAll(folder+'/','')|| (result.error?'The compiler timed out or failed.':'No syntax errors found. This does not test your algorithm.'),diagnostics};
 }finally{await rm(folder,{recursive:true,force:true});}
}
