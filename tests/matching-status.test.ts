import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMatchingStatus, setMatchingStatus } from "../lib/matching/status";

const userId = "11111111-1111-4111-8111-111111111111";

function db(
  paused: boolean,
  signedIn = true,
  observe?: (value: { table: string; selected?: string; updated?: unknown; user?: string }) => void
) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: signedIn ? { id: userId } : null },
        error: signedIn ? null : new Error("No session"),
      }),
    },
    from(table: string) {
      const state: { table: string; selected?: string; updated?: unknown; user?: string } = {
        table,
      };
      const builder = {
        select(value: string) {
          state.selected = value;
          return builder;
        },
        update(value: unknown) {
          state.updated = value;
          return builder;
        },
        eq(field: string, value: string) {
          if (field === "user_id") state.user = value;
          return builder;
        },
        async maybeSingle() {
          observe?.(state);
          return { data: { matching_paused: paused }, error: null };
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

function patch(value: unknown) {
  return new Request("http://localhost/api/v1/matching-status", {
    method: "PATCH",
    body: JSON.stringify(value),
  });
}

test("US-16: anonymous users cannot read or update matching status", async () => {
  const client = db(false, false, () => {
    throw new Error("Must not query profiles");
  });
  assert.equal((await getMatchingStatus(client)).status, 401);
  assert.equal((await setMatchingStatus(client, patch({ paused: true }))).status, 401);
});

test("US-16: matching status is read only for the signed-in profile", async () => {
  let observed: { table: string; selected?: string; updated?: unknown; user?: string } | undefined;
  const response = await getMatchingStatus(db(false, true, (value) => (observed = value)));
  assert.equal(response.status, 200);
  assert.equal(observed?.table, "profiles");
  assert.equal(observed?.user, userId);
  assert.equal(observed?.selected, "matching_paused");
  assert.deepEqual(await response.json(), { paused: false });
});

test("US-16: pause and resume update only the signed-in profile", async () => {
  for (const paused of [true, false]) {
    let observed:
      { table: string; selected?: string; updated?: unknown; user?: string } | undefined;
    const response = await setMatchingStatus(
      db(paused, true, (value) => (observed = value)),
      patch({ paused })
    );
    assert.equal(response.status, 200);
    assert.equal(observed?.user, userId);
    assert.deepEqual(observed?.updated, { matching_paused: paused });
    assert.deepEqual(await response.json(), { paused });
  }
});

test("US-16: malformed pause input cannot update profile state", async () => {
  for (const value of [{}, { paused: "yes" }, null]) {
    const response = await setMatchingStatus(
      db(false, true, () => {
        throw new Error("Must not update profiles");
      }),
      patch(value)
    );
    assert.equal(response.status, 422);
    assert.equal((await response.json()).code, "INVALID_MATCHING_STATUS");
  }
});
