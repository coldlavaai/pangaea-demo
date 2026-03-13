# WhatsApp 24-Hour Session Window — Implementation Status

**Date:** 2026-03-11
**Author:** Code review agent (Opus)
**For:** WhatsApp/ALF agent to continue work

---

## What's Built

### Smart Send Function

**File:** `src/lib/whatsapp/smart-send.ts`

A single function `smartSendWhatsApp()` that all workflow definitions now use instead of calling `sendWhatsApp()` directly. Logic:

1. Look up the operative's message thread in DB
2. Check `last_inbound_at` (when they last messaged US)
3. If within 24 hours → send freeform (rich, personalised message)
4. If freeform fails (Twilio rejects) → fall back to template if one was provided
5. If outside 24 hours AND template SID provided → send template directly
6. If outside 24 hours AND no template → throw error (logged, not silent)
7. After successful send → update `operative.last_contacted_at`

### 24h Window Tracking

**Column:** `message_threads.last_inbound_at` (TIMESTAMPTZ)

- **Set in:** `src/lib/whatsapp/handler.ts` line 135 — on every inbound WhatsApp message
- **Backfilled:** All existing threads had `last_inbound_at` set to `last_message_at` via migration
- **Fallback:** If `last_inbound_at` is null, smart-send falls back to `updated_at`. If both null, tries freeform first (optimistic), catches failure and falls back to template

### Engagement Tracking Columns (on `operatives` table)

| Column | Set where | When |
|---|---|---|
| `last_contacted_at` | `smart-send.ts` line 84 | Every successful outbound WhatsApp |
| `last_reply_at` | `handler.ts` line 145 | Every inbound WhatsApp from operative |
| `last_upload_at` | `upload/route.ts` + `submit-data/route.ts` | Every document upload or data submission |

### Which Workflows Use Smart Send

| Workflow | File | onTrigger | onFollowUp | Template Fallback |
|---|---|---|---|---|
| profile_completion | `definitions/profile-completion.ts` | ✅ `smartSendWhatsApp` | ✅ `smartSendWhatsApp` | `PROFILE_COMPLETION` (**NOT YET CREATED**) |
| document_chase | `definitions/document-chase.ts` | ✅ `smartSendWhatsApp` | ✅ `smartSendWhatsApp` | `DOC_CHASE` / `DOC_REMINDER` |
| data_collection | `definitions/data-collection.ts` | ✅ `smartSendWhatsApp` | ✅ `smartSendWhatsApp` | `DATA_REQUEST` |
| job_offer | `definitions/job-offer.ts` | `sendWhatsAppTemplate` (direct) | ⚠️ `sendWhatsApp` (direct, NOT smart) | `JOB_OFFER` |

---

## What's NOT Handled — Needs Doing

### 1. PROFILE_COMPLETION template doesn't exist in Twilio

The code references `(WHATSAPP_TEMPLATES as Record<string, string>).PROFILE_COMPLETION` which is currently `undefined`.

When undefined, smart-send tries freeform. If freeform fails (outside 24h), it throws because there's no template fallback.

**Action:** Create template in Twilio Console:
- **Name:** `PROFILE_COMPLETION`
- **Body:** `Hi {{1}}, we need a few things from you to keep your Aztec record up to date. Please use this link: {{2}} — Aztec Labour Force`
- **Variables:** `{{1}}` = first name, `{{2}}` = link
- Then add the Content SID to `src/lib/whatsapp/templates.ts`

### 2. DOC_CHASE, DOC_REMINDER, DATA_REQUEST still awaiting Meta approval

These templates exist in Twilio but haven't been approved by Meta yet. If not approved, the template fallback also fails silently.

**SIDs already in code:**
- `DOC_CHASE`: `HX96e82100e8241fc7b10b1163269d6f35`
- `DOC_REMINDER`: `HX02ee37ca3485bf75c482042dd9e38fbc`
- `DATA_REQUEST`: `HXaded45da36979766c438e85427df969b`

**Action:** Check Twilio Console → Messaging → Content Editor for approval status.

### 3. No UI notification when send fails due to 24h window

**This is the biggest gap.** Currently:
- Error is logged to `console.error`
- NOT surfaced to Liam in dashboard or notification bell
- Workflow target shows "contacted" even though message never arrived
- Liam thinks it worked but the operative got nothing

**Action:** In `smartSendWhatsApp`, when the send fails completely (no freeform, no template), create a notification:
```typescript
await createNotification(supabase, {
  type: 'send_failed',
  title: 'WhatsApp failed — [Operative Name]',
  body: 'Outside 24h window, no approved template available',
  severity: 'warning',
  operative_id: operativeId,
  link_url: `/operatives/${operativeId}`,
  push: true,
})
```
Also: do NOT mark the workflow target as "contacted" if the send failed.

### 4. Job offer onFollowUp doesn't use smart send

**File:** `src/lib/workflows/definitions/job-offer.ts` — `onFollowUp` method (around line 196)

Currently calls `sendWhatsApp()` directly. If operative hasn't replied within 24h, the follow-up silently fails.

**Action:** Replace with `smartSendWhatsApp()` using `JOB_OFFER` template as fallback (or a new `JOB_OFFER_REMINDER` template).

### 5. No generic "re-engage" template

When we're outside 24h and need the operative to reply first (so we can then send freeform), there's no catch-all template.

**Suggested template:**
- **Name:** `RE_ENGAGE`
- **Body:** `Hi {{1}}, we have an update for you from Aztec Landscapes. Please reply to this message so we can share the details.`
- This could be the ultimate fallback when no specific template matches.

---

## How Smart Send Works (for reference)

```
smartSendWhatsApp({
  phone: '+447700900000',
  freeformBody: 'Hi Oliver, we need your NI number...',
  templateSid: 'HXaded45da36979766c438e85427df969b',  // optional
  templateVars: { '1': 'Oliver', '2': 'NI number' },   // optional
  operativeId: 'uuid-here',                             // optional, for engagement tracking
})

Flow:
  ┌─ Check message_threads.last_inbound_at
  │
  ├─ Within 24h? → Try freeform
  │   ├─ Success → return { sid, method: 'freeform' }
  │   └─ Failure → template available?
  │       ├─ Yes → send template → return { sid, method: 'template' }
  │       └─ No → throw error
  │
  └─ Outside 24h? → template available?
      ├─ Yes → send template → return { sid, method: 'template' }
      └─ No → throw error
```

---

## Files Reference

| File | Purpose |
|---|---|
| `src/lib/whatsapp/smart-send.ts` | Smart send function (24h window logic) |
| `src/lib/whatsapp/send.ts` | Raw `sendWhatsApp()` (freeform only) |
| `src/lib/whatsapp/templates.ts` | Template SIDs + `sendWhatsAppTemplate()` |
| `src/lib/whatsapp/handler.ts` | Inbound handler — sets `last_inbound_at` |
| `src/lib/workflows/definitions/*.ts` | All 4 workflow definitions |
| `src/lib/notifications/create.ts` | Notification helper (for failed send alerts) |
