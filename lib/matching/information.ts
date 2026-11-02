export const MATCHING_CATEGORIES = ["course", "exam_prep", "skill_practice"] as const;
export const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const LOCATION_PREFERENCES = ["online", "in_person", "either"] as const;

export type MatchingCategory = (typeof MATCHING_CATEGORIES)[number];
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];
export type LocationPreference = (typeof LOCATION_PREFERENCES)[number];

export type MatchingInformation = {
  information_version: 2;
  category: MatchingCategory;
  subject_or_skill: string;
  proficiency_level: ProficiencyLevel;
  location_preference: LocationPreference;
};

export type MatchingFieldError = {
  field: string;
  code: "REQUIRED" | "INVALID_VALUE" | "TOO_LONG" | "NOT_APPLICABLE";
  message: string;
};

export class MatchingInformationError extends Error {
  readonly code = "INVALID_MATCHING_INFORMATION";

  constructor(readonly field_errors: MatchingFieldError[]) {
    super("Please correct the highlighted matching information.");
    this.name = "MatchingInformationError";
  }
}

function requiredString(
  value: unknown,
  field: string,
  label: string,
  max: number,
  errors: MatchingFieldError[]
) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push({ field, code: "REQUIRED", message: `${label} is required.` });
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    errors.push({
      field,
      code: "TOO_LONG",
      message: `${label} must be ${max} characters or fewer.`,
    });
  }
  return trimmed;
}

export function validateMatchingInformation(raw: Record<string, unknown>): MatchingInformation {
  const errors: MatchingFieldError[] = [];
  const category = raw.category;
  if (typeof category !== "string" || !category) {
    errors.push({
      field: "category",
      code: "REQUIRED",
      message: "Learning goal category is required.",
    });
  } else if (!MATCHING_CATEGORIES.includes(category as MatchingCategory)) {
    errors.push({
      field: "category",
      code: "INVALID_VALUE",
      message: "Choose course, exam preparation, or skill/language practice.",
    });
  }

  const subject_or_skill = requiredString(
    raw.subject_or_skill,
    "subject_or_skill",
    "Subject or skill",
    120,
    errors
  );

  const proficiency = raw.proficiency_level;
  if (typeof proficiency !== "string" || !proficiency) {
    errors.push({
      field: "proficiency_level",
      code: "REQUIRED",
      message: "Proficiency level is required.",
    });
  } else if (!PROFICIENCY_LEVELS.includes(proficiency as ProficiencyLevel)) {
    errors.push({
      field: "proficiency_level",
      code: "INVALID_VALUE",
      message: "Choose beginner, intermediate, or advanced.",
    });
  }

  const location = raw.location_preference;
  if (typeof location !== "string" || !location) {
    errors.push({
      field: "location_preference",
      code: "REQUIRED",
      message: "Location preference is required.",
    });
  } else if (!LOCATION_PREFERENCES.includes(location as LocationPreference)) {
    errors.push({
      field: "location_preference",
      code: "INVALID_VALUE",
      message: "Choose online, in person, or either.",
    });
  }

  if (location === "in_person" && (typeof raw.location !== "string" || !raw.location.trim())) {
    errors.push({
      field: "location",
      code: "REQUIRED",
      message: "A meeting location is required for in-person goals.",
    });
  }

  if (category === "course") {
    if (raw.mode !== "course" && raw.mode !== "assignment")
      errors.push({
        field: "mode",
        code: "REQUIRED",
        message: "Choose a course topic or assignment goal.",
      });
    requiredString(raw.institution, "institution", "University or institution", 120, errors);
    requiredString(raw.course_code, "course_code", "Course code", 40, errors);
    requiredString(raw.topic, "topic", "Course topic", 200, errors);
  } else if (category === "exam_prep" || category === "skill_practice") {
    for (const field of [
      "mode",
      "institution",
      "course_code",
      "topic",
      "assignment_id",
      "due_date",
    ]) {
      if (raw[field] !== null && raw[field] !== undefined && raw[field] !== "")
        errors.push({
          field,
          code: "NOT_APPLICABLE",
          message: `${field} is not used for this learning goal category.`,
        });
    }
  }

  if (errors.length) throw new MatchingInformationError(errors);
  return {
    information_version: 2,
    category: category as MatchingCategory,
    subject_or_skill,
    proficiency_level: proficiency as ProficiencyLevel,
    location_preference: location as LocationPreference,
  };
}
