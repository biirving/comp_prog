import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('fieldwork',{
 load:()=>ipcRenderer.invoke('state:load'),
 save:(json:string)=>ipcRenderer.invoke('state:save',json),
 sync:(handle:string)=>ipcRenderer.invoke('cf:sync',handle),
 catalog:()=>ipcRenderer.invoke('cf:catalog'),
 open:(url:string)=>ipcRenderer.invoke('external:open',url),
 check:(code:string)=>ipcRenderer.invoke('cpp:check',code),
 copy:(code:string)=>ipcRenderer.invoke('code:copy',code),
 readClipboard:()=>ipcRenderer.invoke('code:paste')
});
