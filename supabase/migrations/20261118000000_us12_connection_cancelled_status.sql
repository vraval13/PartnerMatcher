-- US-12: add the 'cancelled' status PATCH /api/v1/connections/[id] writes when
-- a requester cancels their own pending request (lib/connections/http.ts:584).
-- This value was referenced in code but never added to the live enum.
begin;

alter type connection_status_enum add value if not exists 'cancelled';

commit;
