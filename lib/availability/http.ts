import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fromAvailabilityDatabaseFields,
  fromAvailabilityDatabaseRow,
  toAvailabilityDatabaseFields,
  type AvailabilityDatabaseRow,
} from "./mapping";
import type { WeeklyAvailabilityInput } from "./types";
import { validateWeeklyAvailability } from "./validation";

const availabilitySelection =
  "id,goal_id,weekday,start_time,end_time,timezone,created_at,updated_at";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApiErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "invalid_goal_id"
  | "invalid_slot_id"
  | "goal_not_found"
  | "slot_not_found"
  | "duplicate_slot"
  | "unauthorized"
  | "storage_unavailable";

class AvailabilityApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function reply(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function errorReply(code: ApiErrorCode, message: string, status: number) {
  return reply({ error: message, code }, status);
}

function failure(error: unknown): Response {
  if (error instanceof AvailabilityApiError) {
    return errorReply(error.code, error.message, error.status);
  }

  if (isDatabaseError(error) && error.code === "23505") {
    const message = "This availability window has already been added.";
    return reply(
      {
        error: message,
        code: "duplicate_slot",
        errors: [{ code: "duplicate_slot", field: "slot", message }],
      },
      409
    );
  }

  return errorReply(
    "storage_unavailable",
    "Availability could not be saved right now. Please retry.",
    503
  );
}

function isDatabaseError(error: unknown): error is { code?: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

async function currentUserId(db: SupabaseClient) {
  const { data, error } = await db.auth.getUser();
  return !error && data.user ? data.user.id : null;
}

async function requireUserId(db: SupabaseClient) {
  const userId = await currentUserId(db);
  if (!userId) {
    throw new AvailabilityApiError("unauthorized", 401, "Sign in to manage availability.");
  }
  return userId;
}

function requireUuid(value: string, kind: "goal" | "slot") {
  if (!uuid.test(value)) {
    throw new AvailabilityApiError(
      kind === "goal" ? "invalid_goal_id" : "invalid_slot_id",
      400,
      `A valid ${kind} ID is required.`
    );
  }
}

async function requireOwnedGoal(db: SupabaseClient, goalId: string, userId: string) {
  requireUuid(goalId, "goal");
  const { data, error } = await db
    .from("matching_goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new AvailabilityApiError("goal_not_found", 404, "Learning goal not found.");
  }
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AvailabilityApiError("invalid_json", 400, "Request body must be valid JSON.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AvailabilityApiError("invalid_request", 400, "Request body must be an object.");
  }
  return value as Record<string, unknown>;
}

function runtimeInput(
  body: Record<string, unknown>,
  fallback?: WeeklyAvailabilityInput
): WeeklyAvailabilityInput {
  const has = (field: string) => Object.prototype.hasOwnProperty.call(body, field);
  return {
    dayOfWeek: !has("dayOfWeek")
      ? (fallback?.dayOfWeek ?? Number.NaN)
      : typeof body.dayOfWeek === "number"
        ? body.dayOfWeek
        : Number.NaN,
    startTime: !has("startTime")
      ? (fallback?.startTime ?? "")
      : typeof body.startTime === "string"
        ? body.startTime
        : "",
    endTime: !has("endTime")
      ? (fallback?.endTime ?? "")
      : typeof body.endTime === "string"
        ? body.endTime
        : "",
    timezone: !has("timezone")
      ? (fallback?.timezone ?? "")
      : typeof body.timezone === "string"
        ? body.timezone
        : "",
  };
}

function validationFailure(input: WeeklyAvailabilityInput, existing: WeeklyAvailabilityInput[]) {
  const result = validateWeeklyAvailability(input, existing);
  if (!result.valid) {
    const duplicate = result.errors.find((error) => error.code === "duplicate_slot");
    if (duplicate) {
      return reply(
        {
          error: duplicate.message,
          code: "duplicate_slot",
          errors: [duplicate],
        },
        409
      );
    }
    return reply(
      {
        error: "Check the highlighted availability fields.",
        code: "invalid_request",
        errors: result.errors,
      },
      400
    );
  }
  return result.value;
}

async function slotsForGoal(db: SupabaseClient, goalId: string) {
  const { data, error } = await db
    .from("matching_availability")
    .select(availabilitySelection)
    .eq("goal_id", goalId)
    .order("weekday")
    .order("start_time");
  if (error) throw error;
  return (data ?? []) as AvailabilityDatabaseRow[];
}

export async function listAvailability(db: SupabaseClient, goalId: string) {
  try {
    const userId = await requireUserId(db);
    await requireOwnedGoal(db, goalId, userId);
    const rows = await slotsForGoal(db, goalId);
    return reply({ slots: rows.map(fromAvailabilityDatabaseRow) });
  } catch (error) {
    return failure(error);
  }
}

export async function createAvailability(db: SupabaseClient, goalId: string, request: Request) {
  try {
    const userId = await requireUserId(db);
    await requireOwnedGoal(db, goalId, userId);
    const body = await parseBody(request);
    const existingRows = await slotsForGoal(db, goalId);
    const validated = validationFailure(
      runtimeInput(body),
      existingRows.map(fromAvailabilityDatabaseFields)
    );
    if (validated instanceof Response) return validated;

    const { data, error } = await db
      .from("matching_availability")
      .insert({ goal_id: goalId, ...toAvailabilityDatabaseFields(validated) })
      .select(availabilitySelection)
      .single();
    if (error) throw error;
    return reply({ slot: fromAvailabilityDatabaseRow(data as AvailabilityDatabaseRow) }, 201);
  } catch (error) {
    return failure(error);
  }
}

export async function updateAvailability(
  db: SupabaseClient,
  goalId: string,
  slotId: string,
  request: Request
) {
  try {
    const userId = await requireUserId(db);
    await requireOwnedGoal(db, goalId, userId);
    requireUuid(slotId, "slot");
    const { data: current, error: lookupError } = await db
      .from("matching_availability")
      .select(availabilitySelection)
      .eq("id", slotId)
      .eq("goal_id", goalId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!current) {
      throw new AvailabilityApiError("slot_not_found", 404, "Availability slot not found.");
    }

    const body = await parseBody(request);
    const allowed = ["dayOfWeek", "startTime", "endTime", "timezone"];
    if (!allowed.some((field) => Object.prototype.hasOwnProperty.call(body, field))) {
      throw new AvailabilityApiError(
        "invalid_request",
        400,
        "Provide at least one availability field to update."
      );
    }
    const existingRows = await slotsForGoal(db, goalId);
    const validated = validationFailure(
      runtimeInput(body, fromAvailabilityDatabaseFields(current as AvailabilityDatabaseRow)),
      existingRows.filter((row) => row.id !== slotId).map(fromAvailabilityDatabaseFields)
    );
    if (validated instanceof Response) return validated;

    const { data, error } = await db
      .from("matching_availability")
      .update(toAvailabilityDatabaseFields(validated))
      .eq("id", slotId)
      .eq("goal_id", goalId)
      .select(availabilitySelection)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new AvailabilityApiError("slot_not_found", 404, "Availability slot not found.");
    }
    return reply({ slot: fromAvailabilityDatabaseRow(data as AvailabilityDatabaseRow) });
  } catch (error) {
    return failure(error);
  }
}

export async function deleteAvailability(db: SupabaseClient, goalId: string, slotId: string) {
  try {
    const userId = await requireUserId(db);
    await requireOwnedGoal(db, goalId, userId);
    requireUuid(slotId, "slot");
    const { data, error } = await db
      .from("matching_availability")
      .delete()
      .eq("id", slotId)
      .eq("goal_id", goalId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new AvailabilityApiError("slot_not_found", 404, "Availability slot not found.");
    }
    return reply({ id: data.id, deleted: true });
  } catch (error) {
    return failure(error);
  }
}
