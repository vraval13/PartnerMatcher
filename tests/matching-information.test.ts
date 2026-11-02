import { test } from "node:test";
import assert from "node:assert/strict";
import { MatchingInformationError, validateMatchingInformation } from "../lib/matching/information";

const valid = {
  category: "skill_practice",
  subject_or_skill: "  Data Structures  ",
  proficiency_level: "intermediate",
  location_preference: "online",
  location: "",
  mode: null,
  institution: null,
  course_code: null,
  topic: null,
  assignment_id: null,
  due_date: null,
};

test("US-01: all supported categories accept complete matching information", () => {
  for (const category of ["course", "exam_prep", "skill_practice"]) {
    const input =
      category === "course"
        ? {
            ...valid,
            category,
            mode: "course",
            institution: "NYU",
            course_code: "CS-101",
            topic: "Graphs",
          }
        : { ...valid, category };
    assert.deepEqual(validateMatchingInformation(input), {
      information_version: 2,
      category,
      subject_or_skill: "Data Structures",
      proficiency_level: "intermediate",
      location_preference: "online",
    });
  }
});

test("US-01: each missing required field receives a stable field error", () => {
  for (const field of [
    "category",
    "subject_or_skill",
    "proficiency_level",
    "location_preference",
  ]) {
    assert.throws(
      () => validateMatchingInformation({ ...valid, [field]: "" }),
      (error) =>
        error instanceof MatchingInformationError &&
        error.code === "INVALID_MATCHING_INFORMATION" &&
        error.field_errors.some((item) => item.field === field && item.code === "REQUIRED")
    );
  }
});

test("US-01: invalid category and proficiency are rejected on their fields", () => {
  assert.throws(
    () =>
      validateMatchingInformation({
        ...valid,
        category: "assignment",
        proficiency_level: "expert",
      }),
    (error) =>
      error instanceof MatchingInformationError &&
      error.field_errors.length === 2 &&
      error.field_errors.every((item) => item.code === "INVALID_VALUE")
  );
});

test("US-01: blank and overlong subject or skill are rejected", () => {
  for (const subject_or_skill of ["   ", "x".repeat(121)])
    assert.throws(
      () => validateMatchingInformation({ ...valid, subject_or_skill }),
      (error) =>
        error instanceof MatchingInformationError &&
        error.field_errors.some((item) => item.field === "subject_or_skill")
    );
});

test("US-01: in-person matching information requires a location", () => {
  assert.throws(
    () => validateMatchingInformation({ ...valid, location_preference: "in_person" }),
    (error) =>
      error instanceof MatchingInformationError &&
      error.field_errors.some((item) => item.field === "location" && item.code === "REQUIRED")
  );
});

test("US-01: category-specific course fields are required and forbidden elsewhere", () => {
  assert.throws(
    () =>
      validateMatchingInformation({
        ...valid,
        category: "course",
        mode: "course",
        institution: "",
        course_code: "",
        topic: "",
      }),
    (error) =>
      error instanceof MatchingInformationError &&
      ["institution", "course_code", "topic"].every((field) =>
        error.field_errors.some((item) => item.field === field && item.code === "REQUIRED")
      )
  );
  assert.throws(
    () =>
      validateMatchingInformation({
        ...valid,
        category: "skill_practice",
        institution: "Fake university",
      }),
    (error) =>
      error instanceof MatchingInformationError &&
      error.field_errors.some(
        (item) => item.field === "institution" && item.code === "NOT_APPLICABLE"
      )
  );
});
