import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/cpp/register';
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching';
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution';
import 'monaco-editor/editor/contrib/find/browser/findController';
import 'monaco-editor/editor/contrib/linesOperations/browser/linesOperations';
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
export function mountEditor(container:HTMLElement,code:string,onChange:(code:string)=>void){
 disposeEditor();editor=monaco.editor.create(container,{value:code,editContext:false,language:'cpp',theme:'fieldwork',fontSize:12,fontFamily:'Menlo, Monaco, monospace',minimap:{enabled:false},automaticLayout:true,scrollBeyondLastLine:false,padding:{top:16},tabSize:4,bracketPairColorization:{enabled:true},quickSuggestions:true,wordBasedSuggestions:'currentDocument',fixedOverflowWidgets:true});
 editor.onDidChangeModelContent(()=>onChange(editor!.getValue()));
 vimStatus=document.createElement('div');
 vimStatus.className='vim-status';
 vimStatus.setAttribute('aria-label','Vim mode and command line');
 container.insertAdjacentElement('afterend',vimStatus);
 vim=initVimMode(editor,vimStatus);
}
export function showDiagnostics(result:CompileResult){const model=editor?.getModel();if(!model)return;monaco.editor.setModelMarkers(model,'compiler',result.diagnostics.map(d=>({startLineNumber:d.line,endLineNumber:d.line,startColumn:d.column,endColumn:d.column+1,message:d.message,severity:d.severity==='error'?monaco.MarkerSeverity.Error:monaco.MarkerSeverity.Warning})));}
