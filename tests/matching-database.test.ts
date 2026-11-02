import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
const payload = {
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
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values('${alice}'),('${bob}');`
    );
    const filename = readdirSync("supabase/migrations").find((f) =>
      f.endsWith("_course_assignment_matching.sql")
    )!;
    await db.exec(readFileSync(`supabase/migrations/${filename}`, "utf8"));
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${alice}';`);
    const create = async (p: unknown) => {
      const r = await db.query<{ id: string }>(
        "select public.create_matching_goal($1::jsonb) as id",
        [JSON.stringify(p)]
      );
      return r.rows[0].id;
    };
    const own = await create(payload);
    assert.equal((await db.query("select * from public.matching_availability")).rows.length, 1);
    await assert.rejects(
      create({
        ...payload,
        availability: [{ ...payload.availability[0], end_time: "13:00" }],
      })
    );
    assert.equal(
      (await db.query("select * from public.matching_goals")).rows.length,
      1,
      "Failed slot insert rolls back the goal"
    );
    await assert.rejects(
      create({ ...payload, mode: "course" }),
      "Course mode forbids assignment fields"
    );
    await assert.rejects(create({ ...payload, timezone: "No/SuchZone" }));
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
