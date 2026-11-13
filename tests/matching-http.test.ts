import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { findMatches, saveGoal, archiveGoal, listGoals } from "../lib/matching/http";
const id = "11111111-1111-4111-8111-111111111111";
const goalId = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-11-02T12:00:00Z");
const stored = {
  id: goalId,
  user_id: id,
  information_version: 1,
  category: null,
  subject_or_skill: null,
  proficiency_level: null,
  mode: "course",
  display_name: "Kai",
  institution: "NYU",
  course_code: "CS546",
  topic: "React",
  assignment_id: null,
  due_date: null,
  timezone: "UTC",
  location_preference: "online",
  location: "",
  is_listed: false,
  archived_at: null,
  matching_availability: [
    {
      weekday: 0,
      start_time: "14:00:00",
      end_time: "16:00:00",
      timezone: "UTC",
    },
  ],
};
function db(lookup: (url: URL, init?: RequestInit) => unknown, signedIn = true) {
  const client = createClient("https://example.supabase.co", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const data = lookup(new URL(String(input)), init);
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  // Auth verification is stubbed; all PostgREST requests use the real Supabase client.
  Object.defineProperty(client, "auth", {
    value: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({
        data: { user: signedIn ? { id } : null },
        error: signedIn ? null : new Error("No session"),
      }),
    },
  });
  return client;
}
function request(value: unknown) {
  return new Request("http://localhost/api/v1/matches", {
    method: "POST",
    body: JSON.stringify(value),
  });
}
test("US04/US05: anonymous search/list/save/archive return 401 before touching data", async () => {
  const client = db(() => {
    throw new Error("Must not query");
  }, false);
  for (const response of [
    await findMatches(client, request({ goal_id: goalId }), now),
    await saveGoal(client, request({}), now),
    await listGoals(client),
    await archiveGoal(client, request({ goal_id: goalId })),
  ])
    assert.equal(response.status, 401);
});
test("US-01: goal listing returns version-2 information fields", async () => {
  const response = await listGoals(
    db(() => [
      {
        ...stored,
        information_version: 2,
        category: "course",
        subject_or_skill: "Data Structures",
        proficiency_level: "advanced",
      },
    ])
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data = await response.json();
  assert.deepEqual(
    {
      information_version: data.goals[0].information_version,
      category: data.goals[0].category,
      subject_or_skill: data.goals[0].subject_or_skill,
      proficiency_level: data.goals[0].proficiency_level,
    },
    {
      information_version: 2,
      category: "course",
      subject_or_skill: "Data Structures",
      proficiency_level: "advanced",
    }
  );
});
test("US04: owned goal search returns ranked score breakdown and no-store", async () => {
  const client = db((url) => {
    if (url.searchParams.has("id")) {
      assert.equal(url.searchParams.get("user_id"), `eq.${id}`);
      return stored;
    }
    assert.equal(url.searchParams.get("topic_key"), "eq.react");
    assert.equal(url.searchParams.get("user_id"), `neq.${id}`);
    return [
      {
        ...stored,
        id: "33333333-3333-4333-8333-333333333333",
        user_id: "other",
        display_name: "Partner",
        is_listed: true,
      },
    ];
  });
  const response = await findMatches(client, request({ goal_id: goalId }), now);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const data = await response.json();
  assert.equal(data.matches[0].final_score, 100);
  assert.equal(data.matches[0].user_id, undefined);
});
test("US04: no match produces explicit message with an empty list", async () => {
  const response = await findMatches(
    db((url) => (url.searchParams.has("id") ? stored : [])),
    request({ goal_id: goalId }),
    now
  );
  assert.deepEqual((await response.json()).matches, []);
});
test("US05: candidate lookup filters exact assignment before ranking", async () => {
  const assignment = {
    ...stored,
    mode: "assignment",
    assignment_id: "HW-01",
    due_date: "2026-11-03",
  };
  const client = db((url) => {
    if (url.searchParams.has("id")) return assignment;
    assert.equal(url.searchParams.get("assignment_id"), "eq.HW-01");
    return [{ ...assignment, id: "candidate", user_id: "other", is_listed: true }];
  });
  const response = await findMatches(client, request({ goal_id: goalId }), now);
  assert.equal((await response.json()).matches[0].final_score, 120);
});
test("permission: missing, foreign or archived goal returns indistinguishable 404", async () => {
  const client = db((url) => {
    assert.equal(url.searchParams.get("user_id"), `eq.${id}`);
    assert.equal(url.searchParams.get("archived_at"), "is.null");
    return null;
  });
  assert.equal((await findMatches(client, request({ goal_id: goalId }), now)).status, 404);
  assert.equal((await archiveGoal(client, request({ goal_id: goalId }))).status, 404);
});
test("validation: invalid ID, malformed JSON, expired assignment and invalid save return 422", async () => {
  const client = db(() => ({
    ...stored,
    mode: "assignment",
    assignment_id: "A",
    due_date: "2026-11-01",
  }));
  assert.equal((await findMatches(client, request({ goal_id: "bad" }), now)).status, 422);
  assert.equal(
    (await findMatches(client, new Request("http://localhost", { method: "POST", body: "{" }), now))
      .status,
    422
  );
  assert.equal((await findMatches(client, request({ goal_id: goalId }), now)).status, 422);
  assert.equal((await saveGoal(client, request({}), now)).status, 422);
});
test("saving uses atomic RPC with validated fields, never client-supplied owner", async () => {
  const client = db((url, init) => {
    assert.equal(url.pathname, "/rest/v1/rpc/create_matching_goal");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.payload.user_id, undefined);
    assert.equal(body.payload.availability.length, 1);
    return goalId;
  });
  const response = await saveGoal(
    client,
    request({
      ...stored,
      category: "course",
      subject_or_skill: "React",
      proficiency_level: "intermediate",
      availability: stored.matching_availability.map((s) => ({
        ...s,
        start_time: "14:00",
        end_time: "16:00",
      })),
      user_id: "attacker",
    }),
    now
  );
  assert.equal(response.status, 201);
  assert.equal((await response.json()).id, goalId);
});
test("US-01: exam and skill saves do not send fake course fields", async () => {
  for (const category of ["exam_prep", "skill_practice"]) {
    const client = db((_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.payload.information_version, 2);
      assert.equal(body.payload.category, category);
      assert.equal(body.payload.mode, null);
      assert.equal(body.payload.institution, null);
      assert.equal(body.payload.course_code, null);
      assert.equal(body.payload.topic, null);
      return goalId;
    });
    const response = await saveGoal(
      client,
      request({
        ...stored,
        category,
        subject_or_skill: category === "exam_prep" ? "Calculus exam" : "Japanese",
        proficiency_level: "beginner",
        mode: null,
        institution: null,
        course_code: null,
        topic: null,
        availability: stored.matching_availability.map((slot) => ({
          ...slot,
          start_time: "14:00",
          end_time: "16:00",
        })),
      }),
      now
    );
    assert.equal(response.status, 201);
  }
});
test("US-01: save errors include a stable code and all missing information fields", async () => {
  const response = await saveGoal(
    db(() => {
      throw new Error("Must not write");
    }),
    request({
      ...stored,
      category: "",
      subject_or_skill: "",
      proficiency_level: "",
      location_preference: "",
    }),
    now
  );
  assert.equal(response.status, 422);
  const data = await response.json();
  assert.equal(data.code, "INVALID_MATCHING_INFORMATION");
  assert.deepEqual(
    data.field_errors.map((item: { field: string }) => item.field),
    ["category", "subject_or_skill", "proficiency_level", "location_preference"]
  );
});
test("timezone validation rejects fixed offsets before calling the RPC", async () => {
  for (const timezone of ["+01:00", "-05:00"]) {
    const response = await saveGoal(
      db(() => {
        throw new Error("Must not call RPC or write data");
      }),
      request({
        ...stored,
        category: "course",
        subject_or_skill: "React",
        proficiency_level: "intermediate",
        timezone,
        availability: stored.matching_availability.map((slot) => ({
          ...slot,
          start_time: "14:00",
          end_time: "16:00",
        })),
      }),
      now
    );
    assert.equal(response.status, 422);
    const data = await response.json();
    assert.equal(data.code, "INVALID_TIMEZONE");
    assert.deepEqual(data.field_errors, [
      {
        field: "timezone",
        code: "INVALID_VALUE",
        message: "Use a supported IANA timezone such as America/New_York or UTC.",
      },
    ]);
  }
});
test("US-06: exam preparation search uses exact normalized subject and ranks matches", async () => {
  const exam = {
    ...stored,
    information_version: 2,
    category: "exam_prep",
    subject_or_skill: "Calculus Final",
    proficiency_level: "beginner",
    mode: null,
    institution: null,
    course_code: null,
    topic: null,
  };
  const response = await findMatches(
    db((url) => {
      if (url.searchParams.has("id")) return exam;
      assert.equal(url.searchParams.get("information_version"), "eq.2");
      assert.equal(url.searchParams.get("category"), "eq.exam_prep");
      assert.equal(url.searchParams.get("subject_or_skill_key"), "eq.calculus final");
      return [
        {
          ...exam,
          id: "33333333-3333-4333-8333-333333333333",
          user_id: "other",
          display_name: "Exam Partner",
          is_listed: true,
        },
      ];
    }),
    request({ goal_id: goalId }),
    now
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.matches[0].subject_or_skill, "Calculus Final");
  assert.equal(data.matches[0].final_score, 100);
});
test("US-07: skill practice search filters by normalized skill and returns 50% availability weight", async () => {
  const practice = {
    ...stored,
    information_version: 2,
    category: "skill_practice",
    subject_or_skill: "Japanese Conversation",
    proficiency_level: "beginner",
    mode: null,
    institution: null,
    course_code: null,
    topic: null,
  };
  const response = await findMatches(
    db((url) => {
      if (url.searchParams.has("id")) return practice;
      assert.equal(url.searchParams.get("information_version"), "eq.2");
      assert.equal(url.searchParams.get("category"), "eq.skill_practice");
      assert.equal(url.searchParams.get("subject_or_skill_key"), "eq.japanese conversation");
      return [
        {
          ...practice,
          id: "33333333-3333-4333-8333-333333333333",
          user_id: "other",
          display_name: "Practice Partner",
          is_listed: true,
        },
      ];
    }),
    request({ goal_id: goalId }),
    now
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.matches[0].subject_or_skill, "Japanese Conversation");
  assert.equal(data.matches[0].weights.availability, 0.5);
  assert.equal(data.matches[0].contributions.availability, 50);
});
test("database outage returns actionable 503 without raw database details", async () => {
  const response = await findMatches(
    db(() => {
      throw new Error("private database detail");
    }),
    request({ goal_id: goalId }),
    now
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private database detail/);
});
