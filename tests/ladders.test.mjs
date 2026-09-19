import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ladders,nextLadderStep} from '../src/ladders.ts';
import {topics} from '../src/topics.ts';

const catalog=JSON.parse(await readFile(new URL('../public/catalog.json',import.meta.url))).problems;
const problemIds=new Set(catalog.map(problem=>problem.id));
const keys=step=>[...step.codeforcesIds.map(id=>`cf:${id}`),...step.leetcode.map(problem=>`lc:${problem.slug}`)];

test('curated ladders have valid topics, unique identities, and real catalog references',()=>{
 const ids=new Set();const slugs=new Set();const cfIds=new Set();
 for(const ladder of ladders){
  assert.ok(!ids.has(ladder.id));ids.add(ladder.id);
  assert.ok(topics.some(topic=>topic.id===ladder.topicId));
  assert.ok(ladder.steps.length>=3);
  for(const step of ladder.steps){
   assert.ok(!ids.has(step.id));ids.add(step.id);
   assert.ok(step.title&&step.concept&&step.buildsOn);
   assert.ok(step.leetcode.length>0);
   for(const id of step.codeforcesIds){assert.ok(problemIds.has(id),`Unknown Codeforces problem ${id}`);assert.ok(!cfIds.has(id));cfIds.add(id);}
   for(const problem of step.leetcode){
    assert.match(problem.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!slugs.has(problem.slug));slugs.add(problem.slug);
    assert.ok(['Easy','Medium','Hard'].includes(problem.difficulty));assert.ok(problem.title);
   }
  }
 }
});

test('next step waits for every exercise and does not skip unfinished prerequisites',()=>{
 for(const ladder of ladders){
  const completed=new Set(ladder.steps.slice(1).flatMap(keys));
  assert.equal(nextLadderStep(ladder,completed),ladder.steps[0]);
  for(const key of keys(ladder.steps[0]).slice(0,-1))completed.add(key);
  assert.equal(nextLadderStep(ladder,completed),ladder.steps[0]);
  completed.add(keys(ladder.steps[0]).at(-1));
  assert.equal(nextLadderStep(ladder,completed),undefined);
 }
});

test('completion advances in curated order using provider-specific keys without mutating input',()=>{
 for(const ladder of ladders){
  const completed=new Set(['unrelated']);
  for(const step of ladder.steps){
   const before=[...completed];
   assert.equal(nextLadderStep(ladder,completed),step);
   assert.deepEqual([...completed],before);
   for(const key of keys(step))completed.add(key);
  }
  assert.equal(nextLadderStep(ladder,completed),undefined);
  const unprefixed=new Set(ladder.steps.flatMap(keys).map(key=>key.slice(3)));
  assert.equal(nextLadderStep(ladder,unprefixed),ladder.steps[0]);
 }
});
