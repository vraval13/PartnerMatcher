import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
const payload = {
  category: "course",
  subject_or_skill: "Data Structures",
  proficiency_level: "intermediate",
  mode: "assignment",
  display_name: "Alice",
  institution: "NYU",
  course_code: "CS546",
  topic: "React",
  assignment_id: "HW-01",
  due_date: "2099-11-03",
  timezone: "America/New_York",
  location_preference: "online",
  location: "",
  is_listed: false,
  availability: [
    {
      weekday: 0,
      start_time: "14:00",
      end_time: "16:00",
      timezone: "America/New_York",
    },
  ],
};
test("migration: actual Postgres constraints, transaction rollback and RLS permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values('${alice}'),('${bob}'); create table public.profiles(user_id uuid primary key references auth.users(id),is_discoverable boolean not null default true); insert into public.profiles(user_id) values('${alice}'),('${bob}'); alter table public.profiles enable row level security; grant select,update on public.profiles to authenticated; create policy profiles_read on public.profiles for select to authenticated using(true); create policy profiles_update on public.profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));`
    );
    await db.exec(
      `create table public.connections(id uuid primary key default gen_random_uuid(),requester_id uuid not null references auth.users(id),receiver_id uuid not null references auth.users(id),status text not null); insert into public.connections(requester_id,receiver_id,status) values('${alice}','${bob}','pending'),('${alice}','${bob}','accepted'),('${alice}','${bob}','rejected'),('${alice}','${bob}','cancelled'); alter table public.connections enable row level security; grant select on public.connections to authenticated; create policy connections_read_participants on public.connections for select to authenticated using(requester_id=(select auth.uid()) or receiver_id=(select auth.uid()));`
    );
    const legacyMigration = readdirSync("supabase/migrations").find((f) =>
      f.endsWith("_course_assignment_matching.sql")
    )!;
    const informationMigration = readdirSync("supabase/migrations").find((f) =>
      f.endsWith("_us01_matching_information.sql")
    )!;
    const examPauseMigration = readdirSync("supabase/migrations").find((f) =>
      f.endsWith("_us07_us16_exam_pause.sql")
    )!;
    await db.exec(readFileSync(`supabase/migrations/${legacyMigration}`, "utf8"));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${alice}';`);
    const create = async (p: unknown) => {
      const r = await db.query<{ id: string }>(
        "select public.create_matching_goal($1::jsonb) as id",
        [JSON.stringify(p)]
      );
      return r.rows[0].id;
    };
    const legacy = await create(payload);
    await db.exec("reset role");
    await db.exec(readFileSync(`supabase/migrations/${informationMigration}`, "utf8"));
    await db.exec(readFileSync(`supabase/migrations/${examPauseMigration}`, "utf8"));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${alice}';`);
    const legacyRow = (
      await db.query<{
        information_version: number;
        category: string | null;
        subject_or_skill: string | null;
        proficiency_level: string | null;
      }>(
        "select information_version,category,subject_or_skill,proficiency_level from public.matching_goals where id=$1",
        [legacy]
      )
    ).rows[0];
    assert.deepEqual(legacyRow, {
      information_version: 1,
      category: null,
      subject_or_skill: null,
      proficiency_level: null,
    });

    const own = await create(payload);
    const version2 = (
      await db.query<{ information_version: number }>(
        "select information_version from public.matching_goals where id=$1",
        [own]
      )
    ).rows[0];
    assert.equal(version2.information_version, 2);
    await assert.rejects(
      db.query(
        `update public.matching_goals
         set information_version=2,category='course',subject_or_skill='Legacy subject',proficiency_level='beginner'
         where id=$1`,
        [legacy]
      ),
      "Version 1 cannot be promoted to version 2"
    );
    await assert.rejects(
      db.query(
        `update public.matching_goals
         set information_version=1,category=null,subject_or_skill=null,proficiency_level=null
         where id=$1`,
        [own]
      ),
      "Version 2 cannot be demoted to version 1"
    );
    const immutableRows = await db.query<{
      id: string;
      information_version: number;
      category: string | null;
      subject_or_skill: string | null;
      proficiency_level: string | null;
    }>(
      `select id,information_version,category,subject_or_skill,proficiency_level
       from public.matching_goals where id in ($1,$2) order by information_version`,
      [legacy, own]
    );
    assert.deepEqual(immutableRows.rows, [
      {
        id: legacy,
        information_version: 1,
        category: null,
        subject_or_skill: null,
        proficiency_level: null,
      },
      {
        id: own,
        information_version: 2,
        category: "course",
        subject_or_skill: "Data Structures",
        proficiency_level: "intermediate",
      },
    ]);
    assert.equal((await db.query("select * from public.matching_availability")).rows.length, 2);
    const slot = (
      await db.query<{ id: string }>(
        "select id from public.matching_availability where goal_id=$1",
        [own]
      )
    ).rows[0].id;
    await assert.rejects(
      create({
        ...payload,
        availability: [{ ...payload.availability[0], end_time: "13:00" }],
      })
    );
    assert.equal(
      (await db.query("select * from public.matching_goals")).rows.length,
      2,
      "Failed slot insert rolls back the goal"
    );
    await assert.rejects(
      create({ ...payload, mode: "course" }),
      "Course mode forbids assignment fields"
    );
    await assert.rejects(create({ ...payload, timezone: "No/SuchZone" }));
    for (const category of ["exam_prep", "skill_practice"]) {
      const id = await create({
        ...payload,
        category,
        mode: null,
        institution: null,
        course_code: null,
        topic: null,
        assignment_id: null,
        due_date: null,
      });
      const row = (
        await db.query<{ category: string; mode: string | null }>(
          "select category,mode from public.matching_goals where id=$1",
          [id]
        )
      ).rows[0];
      assert.deepEqual(row, { category, mode: null });
      await db.query("delete from public.matching_goals where id=$1", [id]);
    }
    await assert.rejects(
      db.query(
        `insert into public.matching_goals(display_name,timezone,location_preference,is_listed)
         values('Incomplete','UTC','online',false)`
      ),
      "Direct inserts cannot omit version-2 matching information"
    );
    await assert.rejects(
      db.query(
        `insert into public.matching_goals(information_version,mode,display_name,institution,course_code,topic,timezone,location_preference,is_listed)
         values(1,'course','Fake legacy','NYU','CS1','Topic','UTC','online',false)`
      ),
      "Authenticated clients cannot create version-1 rows"
    );
    await assert.rejects(
      db.query(
        `insert into public.matching_goals(category,subject_or_skill,proficiency_level,display_name,timezone,location_preference,is_listed)
         values('unknown','Test','expert','Invalid','UTC','online',false)`
      ),
      "Database constraints reject unsupported values"
    );
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    assert.equal(
      (await db.query("select * from public.matching_goals")).rows.length,
      0,
      "Private goal invisible"
    );
    assert.equal((await db.query("select * from public.matching_availability")).rows.length, 0);
    assert.equal(
      (
        await db.query("update public.matching_goals set is_listed=true where id=$1 returning id", [
          own,
        ])
      ).rows.length,
      0,
      "Foreign updates blocked"
    );
    await assert.rejects(
      db.query(
        "insert into public.matching_availability(goal_id,weekday,start_time,end_time,timezone) values($1,1,'14:00','15:00','UTC')",
        [own]
      )
    );
    assert.equal(
      (
        await db.query(
          "update public.matching_availability set start_time='15:00',end_time='16:00' where id=$1 returning id",
          [slot]
        )
      ).rows.length,
      0,
      "Foreign availability updates blocked"
    );
    assert.equal(
      (await db.query("delete from public.matching_availability where id=$1 returning id", [slot]))
        .rows.length,
      0,
      "Foreign availability deletes blocked"
    );
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    await db.query("update public.matching_goals set is_listed=true where id=$1", [own]);
    await assert.rejects(
      db.query("update public.matching_goals set user_id=$1 where id=$2", [bob, own]),
      "Owner cannot reassign ownership"
    );
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    assert.equal(
      (await db.query("select * from public.matching_goals")).rows.length,
      1,
      "Listed goal readable by signed-in peer"
    );
    assert.equal((await db.query("select * from public.matching_availability")).rows.length, 1);
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    await db.query("update public.profiles set matching_paused=true where user_id=$1", [alice]);
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    assert.equal(
      (await db.query("select * from public.matching_goals")).rows.length,
      0,
      "Paused owner is hidden from new peer discovery"
    );
    assert.equal(
      (
        await db.query<{ paused: boolean }>("select public.matching_goal_is_paused($1) as paused", [
          own,
        ])
      ).rows[0].paused,
      true,
      "A signed-in peer with an old goal ID can receive the unavailable status"
    );
    assert.equal(
      (await db.query("select * from public.matching_availability")).rows.length,
      0,
      "Paused owner's slots are hidden with the goal"
    );
    assert.deepEqual(
      (
        await db.query<{ status: string }>(
          "select status from public.connections order by array_position(array['pending','accepted','rejected','cancelled'],status)"
        )
      ).rows.map((row) => row.status),
      ["pending", "accepted", "rejected", "cancelled"],
      "Pause retains pending, accepted, declined/rejected, and cancelled requests"
    );
    await db.exec(`set request.jwt.claim.sub='${alice}';`);
    assert.equal(
      (await db.query("select * from public.matching_goals where id=$1", [own])).rows.length,
      1,
      "Pause does not remove the owner's goal"
    );
    await db.query("update public.profiles set matching_paused=false where user_id=$1", [alice]);
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    assert.equal(
      (await db.query("select * from public.matching_goals")).rows.length,
      1,
      "Resuming restores listed-goal discovery"
    );
    await db.exec(`set role anon; set request.jwt.claim.sub='';`);
    await assert.rejects(db.query("select * from public.matching_goals"));
    await assert.rejects(
      db.query("select public.create_matching_goal($1::jsonb)", [JSON.stringify(payload)])
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${alice}';`);
    await db.query(
      "update public.matching_goals set is_listed=false,archived_at=now() where id=$1",
      [own]
    );
    await db.exec(`set request.jwt.claim.sub='${bob}';`);
    assert.equal(
      (await db.query("select * from public.matching_goals")).rows.length,
      0,
      "Archived goal hidden"
    );
  } finally {
    await db.close();
  }
});
