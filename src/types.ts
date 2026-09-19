import type {LeetCodeProfile} from './leetcode';
export interface Problem {id:string;contestId:number;index:string;name:string;rating:number;tags:string[];solvedCount:number}
export interface Catalog {updatedAt:string;problems:Problem[]}
export interface Profile {handle:string;rating:number|null;maxRating:number|null;solved:{contestId:number;index:string;rating?:number;tags:string[]}[];accepted:Record<string,number>;submissionCount:number;syncedAt:string}
export interface Topic {id:string;name:string;group:string;tags:string[];icon:string;description:string}
export type Outcome='independent'|'assisted'|'stuck';
export interface Log {id:string;problemId:string;topicId:string;rating:number;startedAt:number;finishedAt:number;seconds:number;outcome:Outcome;help:boolean;verified:boolean;review:boolean;notes:string;blocker:string;checks:boolean[];code?:string}
export interface Active {reflectionDraft?:{notes:string;outcome:Outcome;blocker:string};problemId:string;topicId:string;rating:number;startedAt:number;elapsed:number;runningSince:number|null;duration:number;review:boolean;help:boolean;notes:string;checks:boolean[];code?:string}
export interface ManualCredit {problemId:string;topicId:string;rating:number;grantedAt:number}
export interface AccountProgress {manualCredits?:ManualCredit[];initialBand:number;logs:Log[];active:Active|null;deferred:Record<string,number>}
export interface State {leetcode?:LeetCodeProfile;ladderPractice?:Record<string,boolean>;manualCredits?:ManualCredit[];version:1;duration:number;initialBand:number;profile:Profile;logs:Log[];active:Active|null;deferred:Record<string,number>;catalog?:Catalog;bands?:Record<string,number[]>;accounts?:Record<string,AccountProgress>}
export interface CompileResult {ok:boolean;output:string;diagnostics:{line:number;column:number;severity:'warning'|'error';message:string}[]}
declare global { interface Window {fieldwork?:{load:()=>Promise<string|null>;save:(json:string)=>Promise<void>;sync:(handle:string)=>Promise<Profile>;catalog:()=>Promise<Catalog>;syncLeetCode:(username:string)=>Promise<LeetCodeProfile>;open:(url:string)=>Promise<void>;check:(code:string)=>Promise<CompileResult>;copy:(code:string)=>Promise<void>;readClipboard:()=>Promise<string>}} }
