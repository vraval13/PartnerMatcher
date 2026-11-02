import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isDuplicateAvailabilitySlot,
  validateWeeklyAvailability,
} from "../lib/availability/validation";
import type { WeeklyAvailabilityInput } from "../lib/availability/types";

const validSlot: WeeklyAvailabilityInput = {
  dayOfWeek: 1,
  startTime: "09:30",
  endTime: "11:00",
  timezone: "America/New_York",
};

function errorCodes(input: WeeklyAvailabilityInput): string[] {
  const result = validateWeeklyAvailability(input);
  return result.valid ? [] : result.errors.map((error) => error.code);
}

test("accepts a valid weekly availability window", () => {
  const result = validateWeeklyAvailability(validSlot);

  assert.equal(result.valid, true);
  if (result.valid) assert.deepEqual(result.value, validSlot);
});

test("rejects dayOfWeek values outside 0 through 6", () => {
  assert.ok(errorCodes({ ...validSlot, dayOfWeek: -1 }).includes("invalid_day_of_week"));
  assert.ok(errorCodes({ ...validSlot, dayOfWeek: 7 }).includes("invalid_day_of_week"));
  assert.ok(errorCodes({ ...validSlot, dayOfWeek: 1.5 }).includes("invalid_day_of_week"));
});

test("rejects an invalid 24-hour time format", () => {
  assert.ok(errorCodes({ ...validSlot, startTime: "9:30" }).includes("invalid_start_time"));
  assert.ok(errorCodes({ ...validSlot, endTime: "24:00" }).includes("invalid_end_time"));
});

test("rejects an end time equal to the start time", () => {
  assert.ok(
    errorCodes({ ...validSlot, endTime: validSlot.startTime }).includes("end_not_after_start")
  );
});

test("rejects an end time earlier than the start time", () => {
  assert.ok(
    errorCodes({
      ...validSlot,
      startTime: "14:00",
      endTime: "13:00",
    }).includes("cross_midnight_not_supported")
  );
});

test("rejects a window that would cross midnight", () => {
  assert.ok(
    errorCodes({
      ...validSlot,
      startTime: "23:30",
      endTime: "00:30",
    }).includes("cross_midnight_not_supported")
  );
});

test("rejects an empty timezone", () => {
  assert.ok(errorCodes({ ...validSlot, timezone: "  " }).includes("timezone_required"));
});

test("rejects an invalid IANA timezone", () => {
  assert.ok(errorCodes({ ...validSlot, timezone: "Not/A_Timezone" }).includes("invalid_timezone"));
});

test("detects a completely duplicate availability window", () => {
  assert.equal(isDuplicateAvailabilitySlot(validSlot, [validSlot]), true);

  const result = validateWeeklyAvailability(validSlot, [validSlot]);
  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.ok(result.errors.some((error) => error.code === "duplicate_slot"));
  }
});

test("does not treat a partially overlapping window as a duplicate", () => {
  const overlappingSlot: WeeklyAvailabilityInput = {
    ...validSlot,
    startTime: "10:30",
    endTime: "12:00",
  };

  assert.equal(isDuplicateAvailabilitySlot(overlappingSlot, [validSlot]), false);
  assert.equal(validateWeeklyAvailability(overlappingSlot, [validSlot]).valid, true);
});
