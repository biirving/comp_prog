import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/cpp/register';
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching';
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution';
import 'monaco-editor/editor/contrib/find/browser/findController';
import 'monaco-editor/editor/contrib/linesOperations/browser/linesOperations';
import 'monaco-editor/editor/contrib/clipboard/browser/clipboard';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import type {CompileResult} from './types';
import {initVimMode, type VimAdapterInstance} from 'monaco-vim';
declare global {interface Window {MonacoEnvironment:monaco.Environment}}
window.MonacoEnvironment={getWorker:()=>new EditorWorker()};

export const starter=`#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Read the constraints. Start with a correct approach.

    return 0;
}
`;
monaco.editor.defineTheme('fieldwork',{base:'vs-dark',inherit:true,rules:[{token:'comment',foreground:'73876A'},{token:'keyword',foreground:'B6D99D'},{token:'string',foreground:'D9C28F'},{token:'number',foreground:'BCAFD6'}],colors:{'editor.background':'#131B15','editor.foreground':'#D4DECE','editorLineNumber.foreground':'#53634D','editorLineNumber.activeForeground':'#AAC393','editorCursor.foreground':'#C6E4AE','editor.selectionBackground':'#3B5233','editor.lineHighlightBackground':'#1B291D','editorIndentGuide.background1':'#2D3C28'}});
const snippets=[['for','for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t${0}\n}','Indexed loop'],['rangefor','for (const auto& ${1:x} : ${2:values}) {\n\t${0}\n}','Range-based loop'],['vector','vector<${1:int}> ${2:values}(${3:n});','Vector declaration'],['sort','sort(${1:values}.begin(), ${1:values}.end());','Sort a range'],['lower_bound','lower_bound(${1:values}.begin(), ${1:values}.end(), ${2:target})','First value not less than target'],['solve','void solve() {\n\t${0}\n}','Solve function'],['testcases','int t;\ncin >> t;\nwhile (t--) {\n\tsolve();\n}','Test case loop']];
monaco.languages.registerCompletionItemProvider('cpp',{provideCompletionItems:(model,position)=>{
 const word=model.getWordUntilPosition(position),range={startLineNumber:position.lineNumber,endLineNumber:position.lineNumber,startColumn:word.startColumn,endColumn:word.endColumn};
 return {suggestions:[...snippets.map(([label,insertText,detail])=>({label,insertText,detail,kind:monaco.languages.CompletionItemKind.Snippet,insertTextRules:monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,range})),...['int','long long','double','bool','string','unordered_map','unordered_set','priority_queue','queue','stack','set','map','pair','auto','const','return','continue','break','while','if','else','size_t'].map(label=>({label,insertText:label,kind:monaco.languages.CompletionItemKind.Keyword,range}))]};
}});
let editor:monaco.editor.IStandaloneCodeEditor|null=null;
let vim:VimAdapterInstance|null=null;
let vimStatus:HTMLElement|null=null;
export function disposeEditor(){vim?.dispose();vim=null;vimStatus?.remove();vimStatus=null;if(editor){const model=editor.getModel();editor.dispose();model?.dispose();editor=null;}}
export async function copyCode(text:string){
 if(window.fieldwork)await window.fieldwork.copy(text);else await navigator.clipboard.writeText(text);
}
export async function pasteCode(){
 const target=editor,model=target?.getModel(),selection=target?.getSelection();
 if(!target||!model||!selection)return;
 const version=model.getVersionId();
 const text=window.fieldwork?await window.fieldwork.readClipboard():await navigator.clipboard.readText();
 if(!text)throw new Error('Your clipboard has no text to paste.');
 if(editor!==target||model.getVersionId()!==version)throw new Error('The editor changed. Paste again at your current cursor.');
 if(model.getValueLength()-model.getValueInRange(selection).length+text.length>500000)throw new Error('Code must be under 500 KB.');
 const offset=model.getOffsetAt(selection.getStartPosition());
 target.pushUndoStop();target.executeEdits('clipboard',[{range:selection,text,forceMoveMarkers:true}]);target.pushUndoStop();
 target.setPosition(model.getPositionAt(offset+text.length));target.focus();
}
export function selectAllCode(){const model=editor?.getModel();if(model){editor!.setSelection(model.getFullModelRange());editor!.focus();}}
export function mountEditor(container:HTMLElement,code:string,onChange:(code:string)=>void,onMessage:(message:string)=>void=()=>{}){
 disposeEditor();editor=monaco.editor.create(container,{value:code,editContext:false,language:'cpp',theme:'fieldwork',fontSize:12,fontFamily:'Menlo, Monaco, monospace',minimap:{enabled:false},automaticLayout:true,scrollBeyondLastLine:false,padding:{top:16},tabSize:4,bracketPairColorization:{enabled:true},quickSuggestions:true,wordBasedSuggestions:'currentDocument',fixedOverflowWidgets:true});
 editor.onDidChangeModelContent(()=>onChange(editor!.getValue()));
 vimStatus=document.createElement('div');
 vimStatus.className='vim-status';
 vimStatus.setAttribute('aria-label','Vim mode and command line');
 container.insertAdjacentElement('afterend',vimStatus);
 vim=initVimMode(editor,vimStatus);
 // Keep standard system clipboard shortcuts available in both Normal and Insert mode.
 const dom=editor.getDomNode()!;
 const mac=/Mac|iPhone|iPad/.test(navigator.platform);
 const clipboardKey=(event:KeyboardEvent)=>{
  if(!(mac?event.metaKey:event.ctrlKey)||event.altKey||event.shiftKey)return;
  const key=event.key.toLowerCase();if(!['a','c','v'].includes(key))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(key==='a'){selectAllCode();return;}
  if(key==='v'){void pasteCode().catch(e=>onMessage(e.message));return;}
  const model=editor?.getModel(),selection=editor?.getSelection();
  if(model&&selection)void copyCode(selection.isEmpty()?model.getValue():model.getValueInRange(selection)).catch(()=>onMessage('Could not access the clipboard. Use Copy code.'));
 };
 dom.addEventListener('keydown',clipboardKey,true);
 editor.onDidDispose(()=>dom.removeEventListener('keydown',clipboardKey,true));
}
export function showDiagnostics(result:CompileResult){const model=editor?.getModel();if(!model)return;monaco.editor.setModelMarkers(model,'compiler',result.diagnostics.map(d=>({startLineNumber:d.line,endLineNumber:d.line,startColumn:d.column,endColumn:d.column+1,message:d.message,severity:d.severity==='error'?monaco.MarkerSeverity.Error:monaco.MarkerSeverity.Warning})));}
