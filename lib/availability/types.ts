export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Database-independent input used by availability forms and validation.
 * Database identifiers and matching-goal relationships live in the separate
 * persistence and API mapping types.
 */
export type WeeklyAvailabilityInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
};

export type ValidatedWeeklyAvailability = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  timezone: string;
};

export type AvailabilityValidationErrorCode =
  | "invalid_day_of_week"
  | "invalid_start_time"
  | "invalid_end_time"
  | "end_not_after_start"
  | "cross_midnight_not_supported"
  | "timezone_required"
  | "invalid_timezone"
  | "duplicate_slot";

export type AvailabilityValidationError = {
  code: AvailabilityValidationErrorCode;
  field: keyof WeeklyAvailabilityInput | "slot";
  message: string;
};

export type AvailabilityValidationResult =
  | {
      valid: true;
      value: ValidatedWeeklyAvailability;
      errors: [];
    }
  | {
      valid: false;
      errors: AvailabilityValidationError[];
    };
