import { test } from "node:test";
import assert from "node:assert/strict";
import { rankCandidates, validZone, validateGoal, type Goal } from "../lib/matching/engine";
const now = new Date("2026-11-02T12:00:00Z"); // Monday, after New York DST transition.
function goal(p: Partial<Goal> = {}): Goal {
  return {
    id: "q",
    user_id: "query",
    mode: "course",
    display_name: "Student",
    institution: "NYU",
    course_code: "CS546",
    topic: "React",
    assignment_id: null,
    due_date: null,
    timezone: "America/New_York",
    location_preference: "online",
    location: "",
    is_listed: true,
    archived_at: null,
    availability: [
      {
        weekday: 0,
        start_time: "14:00",
        end_time: "16:00",
        timezone: "America/New_York",
      },
    ],
    ...p,
  };
}
const candidate = (p: Partial<Goal> = {}) => goal({ id: "a", user_id: p.id ?? "other", ...p });
test("timezone validation matches PostgreSQL named timezone support", () => {
  assert.equal(validZone("America/New_York"), true);
  assert.equal(validZone("UTC"), true);
  assert.equal(validZone("+01:00"), false);
  assert.equal(validZone("-05:00"), false);
});
test("US04: descending score, components, approved weights, stable tie-breaker", () => {
  const results = rankCandidates(
    goal(),
    [
      candidate({ id: "z" }),
      candidate({ id: "a" }),
      candidate({
        id: "b",
        location_preference: "in_person",
        location: "Library",
      }),
    ],
    now
  );
  assert.deepEqual(
    results.map((r) => r.candidate_goal_id),
    ["a", "z", "b"]
  );
  assert.equal(results[0].final_score, 100);
  assert.equal(results[2].base_score, 75);
  assert.deepEqual(results[0].components, {
    topic: 100,
    availability: 100,
    location: 100,
  });
  assert.deepEqual(results[0].weights, {
    topic: 0.4,
    availability: 0.35,
    location: 0.25,
  });
});
test("US04: exclude unrelated topic/course, no overlap, self, private and archived goals", () => {
  const results = rankCandidates(
    goal(),
    [
      candidate({ topic: "SQL" }),
      candidate({ course_code: "OTHER" }),
      candidate({
        availability: [
          {
            weekday: 1,
            start_time: "14:00",
            end_time: "16:00",
            timezone: "America/New_York",
          },
        ],
      }),
      candidate({ user_id: "query" }),
      candidate({ is_listed: false }),
      candidate({ archived_at: now.toISOString() }),
      candidate({ institution: "Other university" }),
    ],
    now
  );
  assert.deepEqual(results, []);
});
test("US-07: exam preparation requires the same normalized exam subject", () => {
  const exam = goal({
    information_version: 2,
    category: "exam_prep",
    subject_or_skill: "  Calculus Final ",
    proficiency_level: "intermediate",
    mode: null,
    institution: null,
    course_code: null,
    topic: null,
  });
  const results = rankCandidates(
    exam,
    [
      candidate({
        ...exam,
        id: "exam-match",
        user_id: "other",
        subject_or_skill: "calculus   final",
        proficiency_level: "advanced",
      }),
      candidate({
        ...exam,
        id: "wrong-exam",
        user_id: "other-2",
        subject_or_skill: "Linear Algebra Final",
      }),
      candidate({
        ...exam,
        id: "wrong-category",
        user_id: "other-3",
        category: "skill_practice",
      }),
    ],
    now
  );
  assert.deepEqual(
    results.map((result) => result.candidate_goal_id),
    ["exam-match"]
  );
  assert.equal(results[0].components.topic, 100);
  assert.equal(results[0].urgency_multiplier, 1);
});
test("US04: timezone conversion and partial overlap are measurable", () => {
  const results = rankCandidates(
    goal(),
    [
      candidate({
        availability: [
          {
            weekday: 0,
            start_time: "19:00",
            end_time: "20:00",
            timezone: "UTC",
          },
        ],
      }),
    ],
    now
  );
  assert.equal(results[0].components.availability, 50);
  assert.equal(results[0].overlap_minutes, 120);
  assert.equal(results[0].base_score, 82.5);
});
test("US04: overlapping duplicate windows do not double-count", () => {
  const query = goal({
    availability: [
      ...goal().availability,
      {
        weekday: 0,
        start_time: "15:00",
        end_time: "17:00",
        timezone: "America/New_York",
      },
    ],
  });
  const results = rankCandidates(query, [candidate()], now);
  assert.equal(results[0].overlap_minutes, 240);
  assert.equal(results[0].components.availability, 66.67);
});
test("US04: nonexistent DST time is skipped instead of shifted", () => {
  const dst = new Date("2026-03-07T12:00:00Z");
  const q = goal({
    availability: [
      {
        weekday: 6,
        start_time: "02:30",
        end_time: "03:30",
        timezone: "America/New_York",
      },
    ],
  });
  const results = rankCandidates(q, [candidate({ availability: q.availability })], dst);
  assert.equal(results[0].overlap_minutes, 60); // Only following Sunday is a valid occurrence.
});
test("US05: exact course and case-sensitive assignment ID gate precedes any scoring", () => {
  const q = goal({
    mode: "assignment",
    assignment_id: "HW-01",
    due_date: "2026-11-09",
  });
  const good = candidate({
    mode: "assignment",
    assignment_id: "HW-01",
    due_date: "2026-11-03",
  });
  const results = rankCandidates(
    q,
    [
      good,
      { ...good, id: "bad", assignment_id: "hw-01" },
      { ...good, id: "bad-course", course_code: "CS999" },
    ],
    now
  );
  assert.deepEqual(
    results.map((r) => r.candidate_goal_id),
    ["a"]
  );
  assert.equal(results[0].urgency_multiplier, 1.2);
  assert.equal(results[0].final_score, 99);
});
test("US05: 80 × 1.2 = 96, urgency changes ranking but never eligibility", () => {
  const q = goal({
    mode: "assignment",
    assignment_id: "A",
    due_date: "2026-11-12",
  });
  const c = candidate({
    mode: "assignment",
    assignment_id: "A",
    due_date: "2026-11-03",
    availability: [
      {
        weekday: 0,
        start_time: "14:00",
        end_time: "14:40",
        timezone: "America/New_York",
      },
    ],
  });
  // One of three query occurrences, 40 minutes overlap -> base differs; configure a query with a single occurrence.
  const single = {
    ...q,
    due_date: "2026-11-03",
    availability: [
      {
        weekday: 0,
        start_time: "14:00",
        end_time: "15:10",
        timezone: "America/New_York",
      },
    ],
  };
  const [result] = rankCandidates(single, [c], now);
  assert.equal(result.base_score, 85);
  assert.equal(result.final_score, 102);
  const adjusted = {
    ...c,
    availability: [
      {
        weekday: 0,
        start_time: "14:00",
        end_time: "14:30",
        timezone: "America/New_York",
      },
    ],
  };
  const [example] = rankCandidates(single, [adjusted], now);
  assert.equal(example.base_score, 80);
  assert.equal(example.final_score, 96);
});
test("US05: deadlines clip overlap and past/invalid dates cannot be saved", () => {
  const q = goal({
    mode: "assignment",
    assignment_id: "A",
    due_date: "2026-11-02",
  });
  assert.deepEqual(
    rankCandidates(
      q,
      [
        candidate({
          ...q,
          user_id: "other",
          id: "c",
          availability: [
            {
              weekday: 1,
              start_time: "14:00",
              end_time: "15:00",
              timezone: "America/New_York",
            },
          ],
        }),
      ],
      now
    ),
    []
  );
  for (const due_date of ["2026-11-01", "2026-02-30", "invalid"])
    assert.throws(() => validateGoal({ ...q, due_date }, now));
});
test("validation: malformed times, invalid zones, empty slots and duplicate slots", () => {
  for (const patch of [
    { timezone: "No/SuchZone" },
    { availability: [] },
    { availability: [...goal().availability, ...goal().availability] },
    {
      availability: [{ weekday: 0, start_time: "16:00", end_time: "14:00", timezone: "UTC" }],
    },
    { assignment_id: "unrelated" },
  ])
    assert.throws(() => validateGoal({ ...goal(), ...patch }, now));
});
test("US05: configurable urgency bands and deterministic as_of", () => {
  const q = goal({
      mode: "assignment",
      assignment_id: "A",
      due_date: "2026-11-03",
    }),
    c = candidate({ ...q, id: "c", user_id: "other" });
  const [r] = rankCandidates(q, [c], now, {
    version: "approved-test",
    urgency: [{ within_days: 2, multiplier: 1.5 }],
  });
  assert.equal(r.final_score, 150);
  assert.equal(r.configuration_version, "approved-test");
  assert.throws(() =>
    rankCandidates(q, [c], now, {
      version: "invalid",
      urgency: [{ within_days: 2, multiplier: NaN }],
    })
  );
});

test("US04: one best-scoring goal per student avoids duplicate partners", () => {
  const results = rankCandidates(
    goal(),
    [
      candidate({
        id: "a",
        user_id: "same",
        location_preference: "in_person",
        location: "Library",
      }),
      candidate({ id: "b", user_id: "same" }),
    ],
    now
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].candidate_goal_id, "b");
});
test("US05: urgency is applied before sorting the final results", () => {
  const query = goal({
    mode: "assignment",
    assignment_id: "A",
    due_date: "2026-11-15",
  });
  const far = candidate({
    id: "far",
    mode: "assignment",
    assignment_id: "A",
    due_date: "2026-11-15",
    location_preference: "in_person",
    location: "Library",
  });
  const urgent = candidate({
    id: "urgent",
    mode: "assignment",
    assignment_id: "A",
    due_date: "2026-11-03",
  });
  const results = rankCandidates(query, [far, urgent], now);
  assert.deepEqual(
    results.map((r) => r.candidate_goal_id),
    ["urgent", "far"]
  );
  assert.ok(
    results[0].base_score < results[1].base_score || results[0].final_score > results[1].final_score
  );
});
