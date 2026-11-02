import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAvailability,
  deleteAvailability,
  listAvailability,
  updateAvailability,
} from "../lib/availability/http";
import {
  fromAvailabilityDatabaseFields,
  fromAvailabilityDatabaseRow,
  toAvailabilityDatabaseFields,
  type AvailabilityDatabaseRow,
} from "../lib/availability/mapping";
import type { ValidatedWeeklyAvailability } from "../lib/availability/types";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const goalId = "33333333-3333-4333-8333-333333333333";
const slotId = "44444444-4444-4444-8444-444444444444";
const secondSlotId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-11-02T12:00:00.000Z";

const initialSlot: AvailabilityDatabaseRow = {
  id: slotId,
  goal_id: goalId,
  weekday: 0,
  start_time: "09:00:00",
  end_time: "10:00:00",
  timezone: "America/New_York",
  created_at: timestamp,
  updated_at: timestamp,
};

type DatabaseState = {
  slots: AvailabilityDatabaseRow[];
  writes: number;
};

function database(userId: string | null = alice) {
  const state: DatabaseState = { slots: [{ ...initialSlot }], writes: 0 };
  type Result = { data: unknown; error: unknown };
  class Query {
    private operation: "select" | "insert" | "update" | "delete" = "select";
    private payload: Record<string, unknown> = {};
    private filters = new Map<string, unknown>();

    constructor(private readonly table: string) {}

    select() {
      return this;
    }
    eq(field: string, value: unknown) {
      this.filters.set(field, value);
      return this;
    }
    is(field: string, value: unknown) {
      this.filters.set(field, value);
      return this;
    }
    order() {
      return this;
    }
    insert(value: Record<string, unknown>) {
      this.operation = "insert";
      this.payload = value;
      return this;
    }
    update(value: Record<string, unknown>) {
      this.operation = "update";
      this.payload = value;
      return this;
    }
    delete() {
      this.operation = "delete";
      return this;
    }
    maybeSingle() {
      return this.execute(true);
    }
    single() {
      return this.execute(true);
    }
    then<TResult1 = Result, TResult2 = never>(
      onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
      return this.execute(false).then(onfulfilled, onrejected);
    }

    private async execute(single: boolean): Promise<Result> {
      if (this.table === "matching_goals") {
        const found =
          this.filters.get("id") === goalId &&
          this.filters.get("user_id") === alice &&
          userId === alice;
        return { data: found ? { id: goalId } : null, error: null };
      }

      assert.equal(this.table, "matching_availability");
      const matching = state.slots.filter(
        (slot) =>
          (!this.filters.has("goal_id") || slot.goal_id === this.filters.get("goal_id")) &&
          (!this.filters.has("id") || slot.id === this.filters.get("id"))
      );

      if (this.operation === "select") {
        return { data: single ? (matching[0] ?? null) : matching, error: null };
      }
      if (this.operation === "insert") {
        const row: AvailabilityDatabaseRow = {
          id: secondSlotId,
          goal_id: String(this.payload.goal_id),
          weekday: Number(this.payload.weekday),
          start_time: `${String(this.payload.start_time)}:00`,
          end_time: `${String(this.payload.end_time)}:00`,
          timezone: String(this.payload.timezone),
          created_at: timestamp,
          updated_at: timestamp,
        };
        state.slots.push(row);
        state.writes += 1;
        return { data: single ? row : [row], error: null };
      }
      if (this.operation === "update") {
        const index = state.slots.findIndex((slot) => slot.id === this.filters.get("id"));
        if (index < 0) return { data: null, error: null };
        state.slots[index] = {
          ...state.slots[index],
          weekday: Number(this.payload.weekday),
          start_time: `${String(this.payload.start_time)}:00`,
          end_time: `${String(this.payload.end_time)}:00`,
          timezone: String(this.payload.timezone),
          updated_at: timestamp,
        };
        state.writes += 1;
        return { data: single ? state.slots[index] : [state.slots[index]], error: null };
      }

      const deleted = matching[0] ?? null;
      state.slots = state.slots.filter((slot) => slot.id !== this.filters.get("id"));
      if (deleted) state.writes += 1;
      return { data: single ? deleted : deleted ? [deleted] : [], error: null };
    }
  }

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: userId ? null : new Error("No session"),
      }),
    },
    from: (table: string) => new Query(table),
  };

  return { client: client as unknown as SupabaseClient, state };
}

function request(method: string, value: unknown) {
  return new Request("http://localhost/api/v1/availability", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

const validInput: ValidatedWeeklyAvailability = {
  dayOfWeek: 2,
  startTime: "14:00",
  endTime: "15:00",
  timezone: "America/New_York",
};

test("availability mapper converts domain and database field names", () => {
  assert.deepEqual(toAvailabilityDatabaseFields(validInput), {
    weekday: 2,
    start_time: "14:00",
    end_time: "15:00",
    timezone: "America/New_York",
  });
  assert.deepEqual(fromAvailabilityDatabaseFields(initialSlot), {
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "10:00",
    timezone: "America/New_York",
  });
  assert.equal(fromAvailabilityDatabaseRow(initialSlot).goalId, goalId);
});

test("owner can read their goal's availability", async () => {
  const { client } = database();
  const response = await listAvailability(client, goalId);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.slots.length, 1);
  assert.equal(body.slots[0].dayOfWeek, 0);
});

test("owner can add a valid slot and partial overlap is allowed", async () => {
  const { client, state } = database();
  const response = await createAvailability(
    client,
    goalId,
    request("POST", { ...validInput, dayOfWeek: 0, startTime: "09:30" })
  );
  assert.equal(response.status, 201);
  assert.equal(state.slots.length, 2);
  assert.equal(state.writes, 1);
});

test("owner can update their own slot", async () => {
  const { client, state } = database();
  const response = await updateAvailability(
    client,
    goalId,
    slotId,
    request("PATCH", { startTime: "10:00", endTime: "11:00" })
  );
  assert.equal(response.status, 200);
  assert.equal(state.slots[0].start_time, "10:00:00");
  assert.equal(state.writes, 1);
});

test("owner can delete their own slot", async () => {
  const { client, state } = database();
  const response = await deleteAvailability(client, goalId, slotId);
  assert.equal(response.status, 200);
  assert.equal(state.slots.length, 0);
  assert.equal(state.writes, 1);
});

test("anonymous availability requests are rejected before data access", async () => {
  const { client, state } = database(null);
  assert.equal((await listAvailability(client, goalId)).status, 401);
  assert.equal((await createAvailability(client, goalId, request("POST", validInput))).status, 401);
  assert.equal(state.writes, 0);
});

test("another user cannot modify a slot under a foreign goal", async () => {
  const { client, state } = database(bob);
  const response = await updateAvailability(
    client,
    goalId,
    slotId,
    request("PATCH", { startTime: "11:00", endTime: "12:00" })
  );
  assert.equal(response.status, 404);
  assert.equal(state.slots[0].start_time, "09:00:00");
  assert.equal(state.writes, 0);
});

test("a slot outside the selected goal is reported as not found", async () => {
  const { client, state } = database();
  const response = await updateAvailability(
    client,
    goalId,
    secondSlotId,
    request("PATCH", { startTime: "11:00", endTime: "12:00" })
  );
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, "slot_not_found");
  assert.equal(state.writes, 0);
});

test("equal or cross-midnight time ranges are rejected", async () => {
  for (const input of [
    { ...validInput, startTime: "14:00", endTime: "14:00" },
    { ...validInput, startTime: "23:00", endTime: "01:00" },
  ]) {
    const { client, state } = database();
    const response = await createAvailability(client, goalId, request("POST", input));
    assert.equal(response.status, 400);
    assert.equal(state.writes, 0);
  }
});

test("an exact duplicate returns 409", async () => {
  const { client, state } = database();
  const response = await createAvailability(
    client,
    goalId,
    request("POST", {
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:00",
      timezone: "America/New_York",
    })
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "duplicate_slot");
  assert.equal(state.writes, 0);
});

test("invalid PATCH leaves the previously valid row unchanged", async () => {
  const { client, state } = database();
  const before = { ...state.slots[0] };
  const response = await updateAvailability(
    client,
    goalId,
    slotId,
    request("PATCH", { startTime: "18:00", endTime: "17:00" })
  );
  assert.equal(response.status, 400);
  assert.deepEqual(state.slots[0], before);
  assert.equal(state.writes, 0);
});

test("PATCH rejects a present field with the wrong runtime type", async () => {
  const { client, state } = database();
  const response = await updateAvailability(
    client,
    goalId,
    slotId,
    request("PATCH", { startTime: 900 })
  );
  assert.equal(response.status, 400);
  assert.equal(state.slots[0].start_time, "09:00:00");
  assert.equal(state.writes, 0);
});
