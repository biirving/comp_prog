import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchLeetCode,mergeLeetCode,validLeetCode} from '../electron/leetcode.ts';
const fixture=()=>({data:{matchedUser:{username:'Learner',submitStatsGlobal:{acSubmissionNum:[{difficulty:'All',count:6},{difficulty:'Easy',count:3},{difficulty:'Medium',count:2},{difficulty:'Hard',count:1}]}},recentAcSubmissionList:[{title:'Two Sum',titleSlug:'two-sum',timestamp:'1700000000'},{title:'Two Sum',titleSlug:'two-sum',timestamp:'1700000001'}]}});
const reply=body=>async()=>new Response(JSON.stringify(body),{status:200});
test('LeetCode sync validates public totals and deduplicates recent accepts',async()=>{
 let request;
 const result=await fetchLeetCode(' learner ',async(url,init)=>{request={url,...init};return reply(fixture())();});
 assert.equal(result.username,'Learner');assert.deepEqual(result.totals,{all:6,easy:3,medium:2,hard:1});
 assert.deepEqual(result.accepted,{'two-sum':{title:'Two Sum',timestamp:1700000001000}});
 assert.equal(validLeetCode(result),true);assert.equal(request.url,'https://leetcode.com/graphql/');
 assert.deepEqual(JSON.parse(request.body).variables,{username:'learner',limit:20});
 assert.ok(request.signal);assert.equal(request.credentials,undefined);
});
test('LeetCode sync handles missing users and GraphQL errors without accepting partial state',async()=>{
 await assert.rejects(fetchLeetCode('Learner',reply({data:{matchedUser:null},errors:[{message:'That user does not exist.'}]})),/user not found/);
 await assert.rejects(fetchLeetCode('Learner',reply({...fixture(),errors:[{message:'Unavailable'}]})),/could not provide/);
});
test('LeetCode sync reports blocked, unreadable, failed and timed-out requests',async()=>{
 await assert.rejects(fetchLeetCode('Learner',async()=>new Response('Blocked',{status:403})),/unavailable or blocked/);
 await assert.rejects(fetchLeetCode('Learner',async()=>new Response('<html>challenge</html>')),/unreadable/);
 await assert.rejects(fetchLeetCode('Learner',async()=>{throw new Error('Network');}),/Could not reach/);
 await assert.rejects(fetchLeetCode('Learner',async()=>{throw new DOMException('Timeout','TimeoutError');}),/timed out/);
});
test('LeetCode sync rejects malformed and mismatched profile snapshots',async()=>{
 for(const change of [
  body=>delete body.data.matchedUser.submitStatsGlobal,
  body=>body.data.matchedUser.submitStatsGlobal.acSubmissionNum.pop(),
  body=>body.data.matchedUser.submitStatsGlobal.acSubmissionNum[0].count=100,
  body=>body.data.matchedUser.username='SomeoneElse',
  body=>body.data.recentAcSubmissionList=null,
  body=>body.data.recentAcSubmissionList[0].titleSlug='../bad',
  body=>body.data.recentAcSubmissionList[0].timestamp='oops',
  body=>body.data.recentAcSubmissionList[0].timestamp=Date.now(),
 ]){const body=fixture();change(body);await assert.rejects(fetchLeetCode('Learner',reply(body)),/incomplete/);}
 let called=false;
 await assert.rejects(fetchLeetCode('invalid username',async()=>{called=true;return reply(fixture())();}),/valid LeetCode username/);
 assert.equal(called,false);
});
test('LeetCode merge accumulates recent observations for the same account only',async()=>{
 const previous=await fetchLeetCode('Learner',reply(fixture()));
 const next=structuredClone(previous);next.username='learner';next.accepted={'valid-parentheses':{title:'Valid Parentheses',timestamp:1700000010000}};
 const merged=mergeLeetCode(previous,next);
 assert.deepEqual(Object.keys(merged.accepted).sort(),['two-sum','valid-parentheses']);
 assert.equal(Object.keys(next.accepted).length,1);assert.equal(Object.keys(previous.accepted).length,1);
 const other={...next,username:'Other'};
 assert.deepEqual(mergeLeetCode(previous,other).accepted,other.accepted);
 const stale=structuredClone(previous);stale.accepted['two-sum'].timestamp-=1000;
 assert.equal(mergeLeetCode(previous,stale).accepted['two-sum'].timestamp,previous.accepted['two-sum'].timestamp);
});
test('LeetCode saved-state guard rejects invalid counts, timestamps and slugs',async()=>{
 const profile=await fetchLeetCode('Learner',reply(fixture()));
 assert.equal(validLeetCode(undefined),false);assert.equal(validLeetCode({...profile,totals:{all:6,easy:3,medium:2,hard:-1}}),false);
 assert.equal(validLeetCode({...profile,syncedAt:'not-a-date'}),false);
 assert.equal(validLeetCode({...profile,accepted:{'../bad':{title:'Bad',timestamp:10}}}),false);
 assert.equal(validLeetCode({...profile,accepted:{'two-sum':{title:'Two Sum',timestamp:NaN}}}),false);
});
