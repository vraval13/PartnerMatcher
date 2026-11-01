import { Temporal } from "@js-temporal/polyfill";

export type Slot = {
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
};
export type GoalInput = {
  mode: "course" | "assignment";
  display_name: string;
  institution: string;
  course_code: string;
  topic: string;
  assignment_id: string | null;
  due_date: string | null;
  timezone: string;
  location_preference: "online" | "in_person" | "either";
  location: string;
  is_listed: boolean;
  availability: Slot[];
};
export type Goal = GoalInput & {
  id: string;
  user_id: string;
  archived_at: string | null;
};
export type ScoringConfig = {
  version: string;
  urgency: { within_days: number; multiplier: number }[];
};
// Proposed urgency bands; team approval is still required. Weights follow Sprint 2.
export const DEFAULT_CONFIG: ScoringConfig = {
  version: "course-assignment-v1-proposed-urgency",
  urgency: [
    { within_days: 2, multiplier: 1.2 },
    { within_days: 7, multiplier: 1.1 },
  ],
};
export const WEIGHTS = { topic: 0.4, availability: 0.35, location: 0.25 };
export class ValidationError extends Error {}
export function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
function text(
  value: unknown,
  name: string,
  max: number,
  required = true,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new ValidationError(`Invalid ${name}.`);
  return value.trim();
}
export function validZone(value: string) {
  try {
    Temporal.Now.zonedDateTimeISO(value);
    return true;
  } catch {
    return false;
  }
}
function validDate(value: string) {
  try {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Temporal.PlainDate.from(value).toString() === value
    );
  } catch {
    return false;
  }
}
export function validateGoal(raw: unknown, asOf = new Date()): GoalInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new ValidationError("A goal object is required.");
  const v = raw as Record<string, unknown>;
  if (v.mode !== "course" && v.mode !== "assignment")
    throw new ValidationError("Choose course or assignment.");
  const timezone = text(v.timezone, "timezone", 80);
  if (!validZone(timezone))
    throw new ValidationError("Use a valid IANA timezone.");
  const today = Temporal.Instant.from(asOf.toISOString())
    .toZonedDateTimeISO(timezone)
    .toPlainDate();
  let assignment_id: string | null = null,
    due_date: string | null = null;
  if (v.mode === "assignment") {
    assignment_id = text(v.assignment_id, "assignment ID", 100);
    due_date = text(v.due_date, "due date", 10);
    if (!validDate(due_date) || Temporal.PlainDate.compare(due_date, today) < 0)
      throw new ValidationError(
        "Due date must be a valid date today or later.",
      );
  } else if (v.assignment_id || v.due_date)
    throw new ValidationError("Course goals cannot contain assignment fields.");
  if (
    !["online", "in_person", "either"].includes(String(v.location_preference))
  )
    throw new ValidationError("Invalid location preference.");
  const location = text(v.location ?? "", "location", 120, false);
  if (v.location_preference === "in_person" && !location)
    throw new ValidationError("An in-person location is required.");
  if (typeof v.is_listed !== "boolean")
    throw new ValidationError("Choose whether to list this goal.");
  if (
    !Array.isArray(v.availability) ||
    v.availability.length < 1 ||
    v.availability.length > 21
  )
    throw new ValidationError(
      "Add between 1 and 21 weekly availability slots.",
    );
  const seen = new Set<string>();
  const availability: Slot[] = v.availability.map((rawSlot: unknown) => {
    if (!rawSlot || typeof rawSlot !== "object")
      throw new ValidationError("Invalid availability slot.");
    const s = rawSlot as Record<string, unknown>;
    if (
      !Number.isInteger(s.weekday) ||
      Number(s.weekday) < 0 ||
      Number(s.weekday) > 6
    )
      throw new ValidationError("Invalid weekday.");
    const start = text(s.start_time, "start time", 5),
      end = text(s.end_time, "end time", 5);
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
      start >= end
    )
      throw new ValidationError(
        "Slots must end after they start on the same day.",
      );
    const zone = text(s.timezone, "slot timezone", 80);
    if (!validZone(zone)) throw new ValidationError("Invalid slot timezone.");
    const key = `${s.weekday}/${start}/${end}/${zone}`;
    if (seen.has(key))
      throw new ValidationError("Duplicate availability slot.");
    seen.add(key);
    return {
      weekday: Number(s.weekday),
      start_time: start,
      end_time: end,
      timezone: zone,
    };
  });
  return {
    mode: v.mode,
    display_name: text(v.display_name, "display name", 100),
    institution: text(v.institution, "institution", 120),
    course_code: text(v.course_code, "course code", 40),
    topic: text(v.topic, "topic", 200),
    assignment_id,
    due_date,
    timezone,
    location_preference:
      v.location_preference as GoalInput["location_preference"],
    location,
    is_listed: v.is_listed,
    availability,
  };
}
type Interval = [number, number];
function merge(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const interval of intervals.sort((a, b) => a[0] - b[0])) {
    const last = result.at(-1);
    if (last && interval[0] <= last[1])
      last[1] = Math.max(last[1], interval[1]);
    else result.push([...interval]);
  }
  return result;
}
function deadline(goal: GoalInput): number {
  return goal.due_date
    ? Temporal.PlainDate.from(goal.due_date)
        .add({ days: 1 })
        .toZonedDateTime(goal.timezone).epochMilliseconds
    : Infinity;
}
function intervals(goal: GoalInput, start: number, end: number): Interval[] {
  const out: Interval[] = [];
  for (const slot of goal.availability) {
    const first = Temporal.Instant.fromEpochMilliseconds(start)
      .toZonedDateTimeISO(slot.timezone)
      .toPlainDate();
    // Fourteen-day horizon plus one local boundary date; DST resolved by IANA rules.
    for (let i = 0; i <= 15; i++) {
      const date = first.add({ days: i });
      if (date.dayOfWeek - 1 !== slot.weekday) continue;
      try {
        const a = date
          .toPlainDateTime(slot.start_time)
          .toZonedDateTime(slot.timezone, {
            disambiguation: "reject",
          }).epochMilliseconds;
        const b = date
          .toPlainDateTime(slot.end_time)
          .toZonedDateTime(slot.timezone, {
            disambiguation: "reject",
          }).epochMilliseconds;
        if (Math.min(b, end) > Math.max(a, start))
          out.push([Math.max(a, start), Math.min(b, end)]);
      } catch {
        /* Skip nonexistent/ambiguous DST occurrences, never shift a student's slot. */
      }
    }
  }
  return merge(out);
}
function duration(list: Interval[]) {
  return list.reduce((sum, [a, b]) => sum + b - a, 0);
}
function intersect(a: Interval[], b: Interval[]): Interval[] {
  const result: Interval[] = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i][0], b[j][0]),
      end = Math.min(a[i][1], b[j][1]);
    if (end > start) result.push([start, end]);
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return result;
}
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function rankCandidates(
  query: Goal,
  candidates: Goal[],
  asOf = new Date(),
  config = DEFAULT_CONFIG,
) {
  validateGoal(query, asOf);
  if (
    !config.version ||
    config.urgency.some(
      (band, i) =>
        !Number.isFinite(band.within_days) ||
        band.within_days < 0 ||
        !Number.isFinite(band.multiplier) ||
        band.multiplier < 1 ||
        (i > 0 && band.within_days <= config.urgency[i - 1].within_days),
    )
  )
    throw new ValidationError("Invalid scoring configuration.");
  const start = asOf.getTime(),
    horizon = start + 14 * 86400000;
  const querySlots = intervals(
    query,
    start,
    Math.min(horizon, deadline(query)),
  );
  const ranked = candidates
    .flatMap((candidate) => {
      if (
        candidate.user_id === query.user_id ||
        !candidate.is_listed ||
        candidate.archived_at ||
        candidate.mode !== query.mode ||
        normalized(candidate.institution) !== normalized(query.institution) ||
        normalized(candidate.course_code) !== normalized(query.course_code)
      )
        return [];
      // Eligibility always precedes scoring. Assignment IDs remain case-sensitive.
      if (
        query.mode === "assignment"
          ? candidate.assignment_id !== query.assignment_id
          : normalized(candidate.topic) !== normalized(query.topic)
      )
        return [];
      try {
        validateGoal(candidate, asOf);
      } catch {
        return [];
      }
      const common = intersect(
        querySlots,
        intervals(
          candidate,
          start,
          Math.min(horizon, deadline(query), deadline(candidate)),
        ),
      );
      const overlap = duration(common);
      if (!overlap) return [];
      const topic =
        normalized(candidate.topic) === normalized(query.topic) ? 100 : 0;
      const availability = Math.min(
        100,
        (100 * overlap) / duration(querySlots),
      );
      const location =
        query.location_preference === "either" ||
        candidate.location_preference === "either"
          ? 100
          : query.location_preference !== candidate.location_preference
            ? 0
            : query.location_preference === "online" ||
                normalized(query.location) === normalized(candidate.location)
              ? 100
              : 0;
      const components = { topic, availability: round(availability), location };
      const contributions = {
        topic: topic * WEIGHTS.topic,
        availability: availability * WEIGHTS.availability,
        location: location * WEIGHTS.location,
      };
      const base_score = round(
        Object.values(contributions).reduce((a, b) => a + b, 0),
      );
      const days = candidate.due_date
        ? Temporal.PlainDate.from(candidate.due_date).since(
            Temporal.Instant.from(asOf.toISOString())
              .toZonedDateTimeISO(candidate.timezone)
              .toPlainDate(),
          ).days
        : Infinity;
      const urgency_multiplier =
        query.mode === "assignment"
          ? (config.urgency.find((b) => days <= b.within_days)?.multiplier ?? 1)
          : 1;
      return [
        {
          matched_user_id: candidate.user_id,
          candidate_goal_id: candidate.id,
          display_name: candidate.display_name,
          course_code: candidate.course_code,
          topic: candidate.topic,
          assignment_id: candidate.assignment_id,
          due_date: candidate.due_date,
          location_preference: candidate.location_preference,
          location: candidate.location,
          components,
          weights: WEIGHTS,
          contributions: {
            ...contributions,
            availability: round(contributions.availability),
          },
          base_score,
          urgency_multiplier,
          final_score: round(base_score * urgency_multiplier),
          overlap_minutes: round(overlap / 60000),
          overlapping_slots: common.map(([a, b]) => ({
            start: new Date(a).toISOString(),
            end: new Date(b).toISOString(),
          })),
          configuration_version: config.version,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.final_score - a.final_score ||
        a.candidate_goal_id.localeCompare(b.candidate_goal_id),
    );
  const seen = new Set<string>();
  return ranked
    .filter((result) => {
      if (seen.has(result.matched_user_id)) return false;
      seen.add(result.matched_user_id);
      return true;
    })
    .map((result) => {
      const { matched_user_id, ...publicResult } = result;
      void matched_user_id;
      return publicResult;
    });
}
