interface DatabaseWebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

const ALLOWED_TABLES = new Set(["profiles", "connection_requests", "availability"]);

const ALLOWED_EVENTS = new Set(["INSERT", "UPDATE"]);

function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const x = encoder.encode(a);
  const y = encoder.encode(b);

  if (x.length !== y.length) return false;

  let difference = 0;
  for (let i = 0; i < x.length; i++) {
    difference |= x[i] ^ y[i];
  }

  return difference === 0;
}

function getDescription(table: string, type: string): string {
  const names: Record<string, string> = {
    profiles: "Student profile",
    connection_requests: "Partner connection request",
    availability: "Student availability",
  };

  const action = type === "INSERT" ? "New record created" : "Record updated";

  return `${names[table]}: ${action}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const expectedSecret = Deno.env.get("DATABASE_WEBHOOK_SECRET");
  const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
  const receivedSecret = req.headers.get("x-webhook-secret") ?? "";

  if (!expectedSecret || !slackUrl) {
    console.error("Required environment variables are missing.");
    return new Response("Server configuration error", { status: 500 });
  }

  if (!safeEqual(receivedSecret, expectedSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload: DatabaseWebhookPayload = await req.json();

    if (
      payload.schema !== "public" ||
      !ALLOWED_TABLES.has(payload.table) ||
      !ALLOWED_EVENTS.has(payload.type)
    ) {
      return new Response("Event not allowed", { status: 400 });
    }

    // Never forward database records or personal information to Slack.
    const slackMessage = {
      text: [
        "*PartnerMatcher Database Update*",
        getDescription(payload.table, payload.type),
        `Table: \`${payload.schema}.${payload.table}\``,
        `Event: \`${payload.type}\``,
      ].join("\n"),
    };

    const response = await fetch(slackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("Slack notification failed:", response.status);
      return new Response("Slack notification failed", { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new Response("Invalid webhook payload", { status: 400 });
  }
});
