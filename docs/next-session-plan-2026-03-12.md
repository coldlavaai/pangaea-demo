# Next Session Plan — 12 March 2026

## Session Priorities (in order)

### 1. RE_ENGAGE-First Flow (WhatsApp 24h fix)

**Current:** When outside 24h, sends PROFILE_COMPLETION template directly with the link. Operative clicks link, submits, but we can't send confirmations because clicking a link doesn't open the 24h window.

**Required:** When outside 24h, ALWAYS send RE_ENGAGE first → wait for reply → 24h window opens → send freeform with the link. This ensures all confirmation messages (data received, document uploaded, verification status) can be sent.

**Flow:**
```
Outside 24h:
  1. RE_ENGAGE: "Hi Oliver, we need some updates from you — are you able to do that now?"
  2. Oliver replies: "yes" / "yeah" / anything
  3. Deferred message delivered: "Thanks! Here's the link: [url] — Aztec Construction"
  4. Oliver submits data + uploads docs via link
  5. Confirmations sent freely (window is open):
     - "Thanks! We've updated your NI number and UTR."
     - "We've received your passport — we'll review it shortly."
     - (After verification) "Your passport has been verified."

Within 24h:
  Same as now — send freeform directly with the link.
```

**Code change:** In `smartSendWhatsApp`, when outside 24h, ALWAYS use `tryReEngageAndDefer()` instead of sending the specific template. The PROFILE_COMPLETION/DOC_CHASE templates become unused for outbound-initiated messages (keep them for potential future use).

**Files:**
- `src/lib/whatsapp/smart-send.ts` — change fallback logic
- `src/lib/workflows/definitions/profile-completion.ts` — may need to adjust
- `src/lib/whatsapp/handler.ts` — deferred message delivery already built

### 2. Inline Editing (Operative Profile)

**Current:** Click "Edit" top-right → page reloads into form mode → edit → save → back to view.

**Required:** Click on any field value → becomes editable inline → save with Enter or tick → logs to audit. No page refresh, no mode switch. Apply pattern to entire operative profile (Contact, Address, Identity, Work Details, Right to Work, CSCS).

**Scope:** This sets the UI pattern for the whole system (sites, allocations, etc.).

**Files:**
- `src/app/operatives/[id]/page.tsx` (or wherever the profile view lives)
- New component: `InlineEditField` — reusable click-to-edit component
- API: existing PATCH endpoint or new field-level update endpoint

### 3. Multi-Language Communications

**Current:** All WhatsApp messages in English. Many operatives speak Romanian, Polish, other Eastern European languages.

**Required:**
- `preferred_language` as an essential field on operatives
- WhatsApp messages translated to operative's language before sending
- Inbound replies auto-translated to English for Liam
- ALF shows translated content with original language noted

**Considerations:**
- Use Claude for translation (already in the stack)
- Store both original and translated versions in message_threads
- Language detection on inbound messages
- Template messages may need language variants in Twilio

### 4. ALF Workflow Completion Feedback

**Current:** Workflow completes, checklist shows 100%, but ALF doesn't proactively notify Liam.

**Required:** When workflow hits 100%:
- ALF shows a completion summary: "Oliver Tatler completed everything — NI and UTR submitted, passport uploaded (pending verification)."
- Create a task in the dashboard for document verification
- Notification bell alert

### 5. Data Quality Flag Consistency

**Current:** The data quality banner on operative profile only checks NI, Photo ID, RTW. The table view tooltip checks NI, UTR, Photo ID, RTW Doc, Start Date. They use different logic.

**Required:** Single source of truth for data quality checks used everywhere:
- Operative profile banner
- Table view tooltip
- ALF missing_fields card
- All should show the same issues

### 6. UK Passport = Right to Work

**Current:** Passport and RTW are treated as separate documents. A verified British passport should satisfy RTW.

**Required:** When a verified photo_id document exists AND nationality is "BRITISH CITIZEN", auto-mark RTW as satisfied.

### 7. Quick ALF Persistence

**Current:** Quick ALF widget loses conversation on page navigation.

**Required:** Persist conversation state across navigation. Add "New chat" button. Conversations visible in full ALF sidebar.

---

## What's Working (from this session)

- Profile completion workflow end-to-end: ALF → card → action → confirm → WhatsApp template → link → data form + upload → real-time checklist → 100% completion
- Smart send with 24h window detection (freeform only when confirmed within 24h)
- RE_ENGAGE + deferred message queue (code built, needs to be default path)
- All Twilio templates created and approved
- Field mapping: all 9 data fields correctly map form keys → DB columns
- Confirmation enforcement: ALF can't bypass UI confirm button
- Error reporting: actual errors shown, not false "confirmed and executed"
- Branding: all sign-offs "Aztec Construction"
- File picker: camera + file browse options

## Key Files Reference

| File | Purpose |
|---|---|
| `src/lib/whatsapp/smart-send.ts` | 24h window logic — needs RE_ENGAGE-first change |
| `src/lib/whatsapp/handler.ts` | Inbound handler — deferred message delivery built |
| `src/lib/whatsapp/templates.ts` | All template SIDs (all approved) |
| `src/lib/workflows/definitions/profile-completion.ts` | Profile completion workflow |
| `src/components/assistant/renders/workflow-status.tsx` | Real-time checklist card |
| `src/components/assistant/renders/missing-fields-card.tsx` | Missing fields card + Action button |
| `src/app/api/assistant/confirm/route.ts` | Confirmation endpoint (uses public user ID) |
| `src/components/assistant/use-assistant-stream.ts` | Confirm handler (shows real results) |
| `src/app/api/apply/[token]/submit-data/route.ts` | Data form submission + field mapping |
| `src/app/api/apply/[token]/upload/route.ts` | Document upload + acknowledgement |

## Testing Operative
- **Oliver Tatler** — UUID: `bb127d2c-60b7-4421-a25e-6f0c70f0cdbc`, Phone: `+447742201349`, Ref: AZT-0010
