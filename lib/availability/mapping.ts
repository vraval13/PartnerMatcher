import type { ValidatedWeeklyAvailability, WeeklyAvailabilityInput } from "./types";

export type AvailabilityDatabaseFields = {
  weekday: number;
  start_time: string;
  end_time: string;
  timezone: string;
};

export type AvailabilityDatabaseRow = AvailabilityDatabaseFields & {
  id: string;
  goal_id: string;
  created_at: string;
  updated_at: string;
};

export type AvailabilitySlot = ValidatedWeeklyAvailability & {
  id: string;
  goalId: string;
  createdAt: string;
  updatedAt: string;
};

const minutePrecision = (value: string) => value.slice(0, 5);

export function fromAvailabilityDatabaseFields(
  row: AvailabilityDatabaseFields
): WeeklyAvailabilityInput {
  return {
    dayOfWeek: row.weekday,
    startTime: minutePrecision(row.start_time),
    endTime: minutePrecision(row.end_time),
    timezone: row.timezone,
  };
}

export function toAvailabilityDatabaseFields(
  slot: ValidatedWeeklyAvailability
): AvailabilityDatabaseFields {
  return {
    weekday: slot.dayOfWeek,
    start_time: slot.startTime,
    end_time: slot.endTime,
    timezone: slot.timezone,
  };
}

export function fromAvailabilityDatabaseRow(row: AvailabilityDatabaseRow): AvailabilitySlot {
  return {
    id: row.id,
    goalId: row.goal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...fromAvailabilityDatabaseFields(row),
  } as AvailabilitySlot;
}
