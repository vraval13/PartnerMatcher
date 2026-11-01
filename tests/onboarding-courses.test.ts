import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {saveCourses} from '../lib/onboarding/courses';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
const course={name:'Software Engineer',code:'CS-GY_6063',goal:'study'};
test('onboarding: existing course uses DO NOTHING, separate lookup, and own enrollment',async()=>{
 const calls:string[]=[];
 const client=createClient('https://example.supabase.co','public-test-key',{auth:{persistSession:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input));calls.push(url.pathname);
  if(init?.method==='POST'&&url.pathname.endsWith('/courses')){
   assert.match(new Headers(init.headers).get('Prefer')??'',/resolution=ignore-duplicates/);
   return new Response(null,{status:201});
  }
  if(url.pathname.endsWith('/user_courses')){assert.equal(JSON.parse(String(init?.body)).user_id,'owner');return new Response(null,{status:201});}
  return new Response(JSON.stringify({id:'existing-course'}),{status:200,headers:{'Content-Type':'application/json'}});
 }}});
 assert.equal(await saveCourses(client,'owner','NYU',[course]),1);assert.equal(calls.length,3);
 await assert.rejects(saveCourses(client,'owner','NYU',[{...course,code:''}]),/course code/);
});
test('onboarding: real PostgreSQL reproduces missing INSERT policy and verifies fix without allowing UPDATE',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role authenticated; create schema auth; create function auth.uid() returns uuid language sql stable as $$select '11111111-1111-4111-8111-111111111111'::uuid$$; grant usage on schema auth,public to authenticated; create table public.courses(id uuid default gen_random_uuid() primary key,name text not null,code text not null,university text,unique(code,university)); alter table courses enable row level security; grant select,insert,update on courses to authenticated; create policy courses_select_all on courses for select using(true); set role authenticated;`);
  await assert.rejects(db.query('insert into courses(name,code,university) values($1,$2,$3)',['Software Engineer','CS-GY_6063','NYU']),/row-level security/);
  await db.exec('reset role;');await db.exec(readFileSync('supabase/migrations/20261101020059_onboarding_course_insert.sql','utf8'));
  await db.exec('set role authenticated;');
  await db.query('insert into courses(name,code,university) values($1,$2,$3) on conflict(code,university) do nothing',[course.name,course.code,'NYU']);
  await db.query('insert into courses(name,code,university) values($1,$2,$3) on conflict(code,university) do nothing',['Other name',course.code,'NYU']);
  assert.equal((await db.query('select * from courses')).rows.length,1);
  assert.equal((await db.query('update courses set name=$1 returning id',['Not allowed'])).rows.length,0);
 } finally {await db.close();}
});
