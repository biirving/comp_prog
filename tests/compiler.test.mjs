import test from 'node:test';
import assert from 'node:assert/strict';
import {checkCpp} from '../electron/compiler.ts';
test('compiler accepts a C++17 program with the common umbrella header',async()=>{const result=await checkCpp('#include <bits/stdc++.h>\nint main(){std::vector<int> a{1,2}; return a[0]-1;}');assert.equal(result.ok,true,result.output);});
test('compiler produces a source-located diagnostic for an invalid assignment',async()=>{const result=await checkCpp('int main(){ int x = "hello"; return x; }');assert.equal(result.ok,false);assert.ok(result.diagnostics.some(d=>d.line===1&&d.severity==='error'));});
test('compiler validates source size before invoking a process',async()=>{await assert.rejects(()=>checkCpp('x'.repeat(500001)),/500 KB/);});
