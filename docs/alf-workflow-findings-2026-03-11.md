# ALF Workflow Pipeline — Findings & Required Changes (2026-03-11)

This document captures every issue found during end-to-end testing of the ALF → profile_completion workflow → WhatsApp → apply page → data/document submission pipeline. Organised by priority and area.

---

## Current State (HEAD: 737e4ac)

### What's Working
- ALF searches operative, shows missing_fields card with checkboxes
- "Action selected →" button sends structured message with operative UUID, data_fields[], document_types[]
- profile_completion workflow creates ONE upload link with `?fields=X&docs=Y`
- WhatsApp freeform message sent successfully to operative
- Apply page combined mode: DataForm sections + UploadForm per doc type stacked
- DataForm submission updates operative record immediately (NI number confirmed working)
- Document upload via UploadForm works (passport uploaded, Claude Vision auto-verified)
- `processDataSubmission` defers workflow completion when document_types still pending
- Confirmation card now enforced at code level — ALF cannot bypass (737e4ac)

### Key Files
| File | Purpose |
|---|---|
| `src/lib/workflows/definitions/profile-completion.ts` | Profile completion workflow definition |
| `src/lib/workflows/engine.ts` | Workflow engine: trigger, processInbound, processFollowUps, processUpload, processDataSubmission |
| `src/lib/workflows/upload-link.ts` | Token generation + combined link builder (?fields=&docs=) |
| `src/app/apply/[token]/page.tsx` | Apply page with combined mode |
| `src/app/apply/[token]/upload-form.tsx` | Document upload component |
| `src/app/apply/[token]/data-form.tsx` | Data collection form component |
| `src/app/api/apply/[token]/submit-data/route.ts` | Data form submission API |
| `src/app/api/apply/[token]/upload/route.ts` | Document upload API + Claude Vision |
| `src/components/assistant/renders/missing-fields-card.tsx` | Missing fields card with checkboxes + Action button |
| `src/components/assistant/renders/workflow-status.tsx` | Workflow progress card (redesigned with step indicator) |
| `src/app/api/assistant/chat/route.ts` | ALF SSE streaming + confirmation enforcement |
| `src/app/api/assistant/confirm/route.ts` | UI confirmation callback endpoint |
| `src/lib/assistant/system-prompt.ts` | ALF system prompt (principles-first architecture) |
| `src/lib/assistant/executors/workflows.ts` | ALF workflow tool executor |
| `src/lib/assistant/tools.ts` | ALF tool definitions (profile_completion + document_types[]) |
| `src/lib/whatsapp/send.ts` | sendWhatsApp (freeform) + sendWhatsAppTemplate (HSM) |
| `src/lib/whatsapp/templates.ts` | WHATSAPP_TEMPLATES with Content SIDs |

---

## CRITICAL: 24-Hour WhatsApp Session Window

### Problem
WhatsApp Business API only allows freeform messages within 24 hours of the customer's last inbound message. Outside this window, only pre-approved templates (HSM) can be sent. Currently:

- `profile_completion` workflow uses `sendWhatsApp()` (freeform only)
- If operative hasn't messaged in 24h, Twilio silently rejects the message
- The workflow shows "1 contacted" but the operative never received anything
- No fallback to template, no error surfaced to the user
- Same issue exists in `data_collection` and `document_chase` follow-up messages

### Required Changes

#### 1. Add `last_inbound_at` column to `message_threads`
```sql
ALTER TABLE message_threads
  ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;

-- Backfill from existing data
UPDATE message_threads SET last_inbound_at = updated_at WHERE last_inbound_at IS NULL;
```

Update the inbound WhatsApp handler (`src/lib/whatsapp/handler.ts`) to set `last_inbound_at = NOW()` on every inbound message.

#### 2. Create smart send function
New file: `src/lib/whatsapp/smart-send.ts`

```typescript
export async function smartSendWhatsApp(params: {
  phone: string
  orgId: string
  freeformBody: string
  templateSid?: string
  templateVars?: Record<string, string>
}): Promise<{ sid: string; method: 'freeform' | 'template' }> {
  // 1. Check message_threads for last_inbound_at
  // 2. If within 24h → sendWhatsApp(freeformBody)
  // 3. If outside 24h AND templateSid provided → sendWhatsAppTemplate(templateSid, templateVars)
  // 4. If outside 24h AND no template → throw with clear error message
}
```

All workflow definitions should use `smartSendWhatsApp` instead of calling `sendWhatsApp` directly.

#### 3. Create PROFILE_COMPLETION Twilio template
Need a new WhatsApp template in Twilio Console:

| Template | Body | Variables |
|---|---|---|
| `PROFILE_COMPLETION` | "Hi {{1}}, we need a few things from you to keep your Aztec record up to date. Please use this link: {{2}} — Aztec Labour Force" | name, link |

Add the Content SID to `src/lib/whatsapp/templates.ts` once approved.

#### 4. Update all workflow definitions to use smart send
Files to update:
- `src/lib/workflows/definitions/profile-completion.ts` — onTrigger + onFollowUp
- `src/lib/workflows/definitions/document-chase.ts` — onTrigger + onFollowUp
- `src/lib/workflows/definitions/data-collection.ts` — onTrigger + onFollowUp
- `src/lib/workflows/definitions/job-offer.ts` — onTrigger + onFollowUp

---

## ISSUE: Document Verification Messages

### Problem 1: Generic document type in DOC_VERIFIED template
**Current message:** "Your passport / driving licence has been verified by the Aztec team."
**Should say:** "Your passport has been verified" (if passport was uploaded) or "Your driving licence has been verified" (if licence was uploaded).

**Root cause:** The `DOC_VERIFIED` Twilio template uses a generic string. It should pass the actual document type as a variable.

**Fix:** Either:
- Update the Twilio template to include a document type variable: "Your {{2}} has been verified"
- Or create separate templates per document type (less flexible)

The Claude Vision extraction already identifies the document type — the verification flow just doesn't pass it to the template.

**File:** `src/app/api/documents/[docId]/verify/route.ts` — where the verification WhatsApp is sent.

### Problem 2: "Fully verified" fires prematurely
**Current behaviour:** When photo_id + RTW are both verified, the operative status is promoted to `verified` and the `WELCOME_VERIFIED` template fires: "You are now fully verified with Aztec Landscapes!"

**Problem:** The operative may still have missing data fields (NI, bank details, NOK, etc.). "Fully verified" is misleading.

**Fix options:**
1. **Change trigger condition:** Only promote to `verified` when data_completeness_score >= threshold (e.g., 18/24) AND required documents verified
2. **Change message text:** "Your documents are verified" instead of "fully verified" — decouple document verification from data completeness
3. **Add a `docs_verified` status** between `pending_docs` and `verified` — operative can have docs verified but profile incomplete

**Recommended:** Option 2 is quickest. Update the Twilio template text and the status promotion logic.

**File:** `src/lib/whatsapp/sophie-handler.ts` or wherever status promotion happens. Also check `src/app/api/documents/[docId]/verify/route.ts`.

### Problem 3: No upload acknowledgement before verification
**Current flow:** Operative uploads passport → Claude Vision verifies instantly → "Your passport has been verified" message sent.

**Desired flow:**
1. Operative uploads → "Thanks for uploading your passport. We'll review it shortly."
2. Verification happens (auto or manual) → "Your passport has been verified."

**For auto-verified documents:** Both messages could fire in quick succession. Consider:
- If auto-verified: send only the verification message (skip the acknowledgement)
- If queued for manual review: send the acknowledgement, then verification later when Liam approves

**File:** `src/app/api/apply/[token]/upload/route.ts` — add acknowledgement send after successful upload, before verification.

---

## ISSUE: Pending Document Indicator in Missing Fields Card

### Problem
Uploaded-but-unverified documents still show as "missing" in the missing_fields card with the same red/amber styling as completely absent documents. No visual distinction between "never uploaded" and "uploaded, pending review".

### Fix
In the `get_profile` executor (`src/lib/assistant/executors/operative-read.ts`), check the `documents` table for pending uploads:

```typescript
// Current check:
if (!d.has_verified_photo_id) missingDocs.push({ key: 'photo_id', label: 'Photo ID / Passport' })

// Updated check:
if (!d.has_verified_photo_id) {
  // Check if there's a pending (unverified) upload
  const { data: pendingDoc } = await supabase
    .from('documents')
    .select('id, status')
    .eq('operative_id', d.id)
    .eq('document_type', 'photo_id')
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (pendingDoc) {
    missingDocs.push({ key: 'photo_id', label: 'Photo ID / Passport', status: 'pending_review' })
  } else {
    missingDocs.push({ key: 'photo_id', label: 'Photo ID / Passport', status: 'missing' })
  }
}
```

Then in `missing-fields-card.tsx`, render pending items differently:
- **Missing (never uploaded):** amber checkbox (current)
- **Pending review:** purple/violet checkbox with "(uploaded — pending review)" label

---

## ISSUE: Workflow Progress Card Not Real-Time

### Problem
The workflow_status card is rendered once when ALF responds. It doesn't update when the operative submits data or uploads documents. Oliver submitted NI number and passport, but the card still showed "0 done, 0%".

### Design Options

#### Option A: Polling from the card component (simplest)
Add a `useEffect` in `WorkflowStatus` that polls `/api/assistant/workflow-status/[runId]` every 10 seconds while the workflow is active.

```typescript
// In workflow-status.tsx
const [liveData, setLiveData] = useState(data)

useEffect(() => {
  if (liveData.status !== 'active') return
  const interval = setInterval(async () => {
    const res = await fetch(`/api/assistant/workflow-status/${liveData.run_id}`)
    if (res.ok) setLiveData(await res.json())
  }, 10000)
  return () => clearInterval(interval)
}, [liveData.run_id, liveData.status])
```

New endpoint: `src/app/api/assistant/workflow-status/[runId]/route.ts` — returns current run + targets data.

**Pros:** Simple, no infrastructure. **Cons:** 10s delay, unnecessary polling after completion.

#### Option B: Supabase Realtime subscription
Subscribe to `workflow_runs` and `workflow_targets` changes via Supabase Realtime.

**Pros:** Instant updates. **Cons:** Requires Supabase Realtime enabled, more complex client code.

#### Option C: Server-Sent Events from a dedicated endpoint
Stream updates as they happen.

**Pros:** Real-time, efficient. **Cons:** Long-lived connection, more complex.

**Recommended:** Option A (polling) for now — simplest to implement and good enough for the use case.

---

## ISSUE: Notification Bell Integration

### Problem
When an operative uploads a document or submits data via the profile_completion link, there's no in-app notification for Liam. He only finds out by checking ALF or the operative's profile.

### Fix
The notification system already exists (`src/lib/notifications/create.ts` + `createNotification()` + Telegram push). Add calls in:

1. **`src/app/api/apply/[token]/upload/route.ts`** — after successful upload:
   ```
   createNotification({ type: 'document_uploaded', title: 'Oliver Tatler uploaded Passport', ... })
   ```

2. **`src/app/api/apply/[token]/submit-data/route.ts`** — after successful data submission:
   ```
   createNotification({ type: 'data_submitted', title: 'Oliver Tatler updated NI number, UTR', ... })
   ```

3. **Document verification** — already may have notifications, check and ensure consistency.

---

## ISSUE: Image EXIF Orientation

### Problem
Uploaded passport photos sometimes display rotated (portrait instead of landscape). This is an EXIF metadata issue — the camera stores orientation in EXIF, but not all renderers respect it.

### Fix
In the image compression function in `upload-form.tsx`, read EXIF orientation and apply it to the canvas before compression:

```typescript
// In compressImage() — after creating the Image element:
// Read EXIF orientation, rotate canvas accordingly
// Libraries: exifr (lightweight) or manual EXIF parsing
```

Alternatively, apply orientation server-side in the upload API route before storing.

**File:** `src/app/apply/[token]/upload-form.tsx` — `compressImage()` function (line ~119).

---

## ISSUE: ALF Verbosity Persists

### Problem
Despite the principles-first system prompt rewrite (c8e4dcb) and explicit prohibitions, ALF still lists missing fields in text above the card. Examples from testing:

```
> Missing fields: NI number, bank sort code, bank account number, UTR number, next of kin name, next of kin phone
> Missing documents: Verified photo ID, verified right to work
```

This is the EXACT information shown in the card. The system prompt says "1 sentence only when a card is shown" but ALF keeps doing it.

### Possible Fixes
1. **Strip the text_result from get_profile** — currently the executor returns `text_result: Full profile:\n${JSON.stringify(profile)}` which contains all the data ALF uses to generate the verbose text. If we return a minimal text_result like "Profile loaded — card shown below" ALF has less raw data to regurgitate.

2. **Post-processing** — in the chat route, after ALF generates text, check if a missing_fields card is in the rich blocks and truncate the text to 1 sentence.

3. **Stronger model instruction** — add to system prompt: "When get_profile returns a missing_fields card, your ENTIRE text response must be exactly: 'Here's what's outstanding for **[Name]** — select what you'd like me to chase and hit Action.' Do not add ANY other text."

**Recommended:** Combination of 1 and 3. Reduce the text_result from get_profile AND add verbatim instruction.

**File:** `src/lib/assistant/executors/operative-read.ts` (line ~180) — change text_result for get_profile when missing_fields card is returned.

---

## ISSUE: Double Workflow Trigger

### Problem (now fixed)
ALF triggered the workflow twice in some tests. Root causes:
1. Old cached client JS sent ambiguous action message → ALF interpreted "ok" as second confirmation
2. ALF sent `confirmed: true` bypassing the UI confirmation card

### Status
- **Fixed in 737e4ac:** Chat route now ignores ALF's `confirmed` flag. Only the UI confirm endpoint (`/api/assistant/confirm`) can execute write tools.
- **Fixed in 8fd0d00:** New handleAction sends structured message with operative UUID, preventing ambiguity.
- **Requires hard refresh** to pick up the new client-side code.

---

## ISSUE: submit-data Token Clearing

### Current Behaviour
`submit-data/route.ts` no longer clears the upload token after data form submission (changed in 8fd0d00). This allows the operative to still use the same link for document uploads in combined mode.

### Consideration
Token expiry is 24h. For non-combined workflows (data_collection only), the token persists for 24h when it could be cleared. Low risk — data resubmission just overwrites with same values.

---

## Database Field Mapping Reference

### Card keys (DB columns) → DataForm keys
| Card Key (from get_profile) | DataForm Key (for ?fields= param) |
|---|---|
| `bank_sort_code` | `bank_details` |
| `bank_account_number` | `bank_details` |
| `address_line1` | `address` |
| `utr_number` | `utr` |
| `next_of_kin_name` | `nok_name` |
| `next_of_kin_phone` | `nok_phone` |
| `ni_number` | `ni_number` (same) |
| `email` | `email` (same) |
| `phone` | `phone` (same) |
| `date_of_birth` | `date_of_birth` (same) |

This normalisation happens in `missing-fields-card.tsx` → `normalizeDataFields()` using `DB_KEY_TO_FORM_KEY` map.

### Document type keys (used in ?docs= param)
| Key | Label |
|---|---|
| `photo_id` | Photo ID / Passport |
| `right_to_work` | Right to Work |
| `cscs_card` | CSCS Card |
| `cpcs_ticket` | CPCS Ticket |
| `npors_ticket` | NPORS Ticket |
| `first_aid` | First Aid Certificate |

---

## Commits This Session

| Hash | Description |
|---|---|
| `8fd0d00` | profile_completion workflow — one link for all missing fields + docs |
| `c8e4dcb` | ALF system prompt rewrite — principles-first architecture |
| `4661898` | Diagnostic logging (later cleaned up) |
| `276b31f` | Test endpoint (later cleaned up) |
| `aac66ce` | Cleanup — removed test endpoint + diagnostic logging |
| `4c87e4e` | Upload file picker fix, workflow card redesign, confirmation flow, verbosity rules |
| `737e4ac` | Force UI confirmation — ALF cannot bypass confirm button |

---

## Operative Used for Testing

- **Name:** Oliver Tatler
- **UUID:** `bb127d2c-60b7-4421-a25e-6f0c70f0cdbc`
- **Ref:** AZT-0010
- **Phone:** `+447742201349`
- **Status:** qualifying
- **Trade:** Fencer
