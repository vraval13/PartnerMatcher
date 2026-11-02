import type {
  AvailabilityValidationError,
  AvailabilityValidationResult,
  DayOfWeek,
  ValidatedWeeklyAvailability,
  WeeklyAvailabilityInput,
} from "./types";

const TIME_24_HOUR_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isDayOfWeek(value: number): value is DayOfWeek {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

export function isValid24HourTime(value: string): boolean {
  return TIME_24_HOUR_PATTERN.test(value);
}

export function isValidIanaTimezone(value: string): boolean {
  const timezone = value.trim();
  if (!timezone) return false;

  if (
    typeof Intl === "undefined" ||
    typeof Intl.DateTimeFormat !== "function"
  ) {
    return true;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function normalizeSlot(
  slot: WeeklyAvailabilityInput
): WeeklyAvailabilityInput {
  return {
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime.trim(),
    endTime: slot.endTime.trim(),
    timezone: slot.timezone.trim(),
  };
}

export function isDuplicateAvailabilitySlot(
  candidate: WeeklyAvailabilityInput,
  existingSlots: readonly WeeklyAvailabilityInput[]
): boolean {
  const normalizedCandidate = normalizeSlot(candidate);

  return existingSlots.some((slot) => {
    const normalizedExisting = normalizeSlot(slot);

    return (
      normalizedExisting.dayOfWeek === normalizedCandidate.dayOfWeek &&
      normalizedExisting.startTime === normalizedCandidate.startTime &&
      normalizedExisting.endTime === normalizedCandidate.endTime &&
      normalizedExisting.timezone === normalizedCandidate.timezone
    );
  });
}

export function validateWeeklyAvailability(
  input: WeeklyAvailabilityInput,
  existingSlots: readonly WeeklyAvailabilityInput[] = []
): AvailabilityValidationResult {
  const slot = normalizeSlot(input);
  const errors: AvailabilityValidationError[] = [];

  if (!isDayOfWeek(slot.dayOfWeek)) {
    errors.push({
      code: "invalid_day_of_week",
      field: "dayOfWeek",
      message: "Day of week must be an integer from 0 through 6.",
    });
  }

  const startTimeIsValid = isValid24HourTime(slot.startTime);
  const endTimeIsValid = isValid24HourTime(slot.endTime);

  if (!startTimeIsValid) {
    errors.push({
      code: "invalid_start_time",
      field: "startTime",
      message: "Start time must use 24-hour HH:MM format.",
    });
  }

  if (!endTimeIsValid) {
    errors.push({
      code: "invalid_end_time",
      field: "endTime",
      message: "End time must use 24-hour HH:MM format.",
    });
  }

  if (startTimeIsValid && endTimeIsValid) {
    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);

    if (endMinutes === startMinutes) {
      errors.push({
        code: "end_not_after_start",
        field: "endTime",
        message: "End time must be later than start time.",
      });
    } else if (endMinutes < startMinutes) {
      errors.push({
        code: "cross_midnight_not_supported",
        field: "endTime",
        message:
          "Availability cannot cross midnight. Choose an end time later on the same day.",
      });
    }
  }

  if (!slot.timezone) {
    errors.push({
      code: "timezone_required",
      field: "timezone",
      message: "Timezone is required.",
    });
  } else if (!isValidIanaTimezone(slot.timezone)) {
    errors.push({
      code: "invalid_timezone",
      field: "timezone",
      message: "Timezone must be a valid IANA timezone.",
    });
  }

  if (isDuplicateAvailabilitySlot(slot, existingSlots)) {
    errors.push({
      code: "duplicate_slot",
      field: "slot",
      message: "This availability window has already been added.",
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // The day has been narrowed by isDayOfWeek above; the remaining fields are
  // normalized strings that passed their respective validation checks.
  const value: ValidatedWeeklyAvailability = {
    ...slot,
    dayOfWeek: slot.dayOfWeek as DayOfWeek,
  };

  return {
    valid: true,
    value,
    errors: [],
  };
}
