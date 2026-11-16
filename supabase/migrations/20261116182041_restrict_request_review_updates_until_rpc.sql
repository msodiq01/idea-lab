-- Remove pre-existing direct status/review writes from request records.
-- These fields require dedicated owner/requester-aware RPCs before being writable.
revoke update (status, owner_note, reviewed_at, updated_at)
  on idea_app.resource_requests from authenticated;
revoke update (status, owner_note, reviewed_at, updated_at)
  on idea_app.partnership_enquiries from authenticated;