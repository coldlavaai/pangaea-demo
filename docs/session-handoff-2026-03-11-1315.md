# Session Handoff — 2026-03-11 13:15

## What This Session Fixed (commits 8fd0d00 → 357dc53)

### 1. profile_completion workflow (8fd0d00)
- New workflow type: sends ONE WhatsApp link with `?fields=X&docs=Y`
- Apply page combined mode: DataForm + multiple UploadForm sections stacked
- `handleAction` in missing-fields-card normalises DB keys → DataForm keys, includes operative UUID
- `processDataSubmission` defers completion when document_types still pending
- submit-data no longer clears token (combined mode needs it for uploads after data submission)

### 2. ALF system prompt rewrite (c8e4dcb)
- Principles-first architecture (6 core principles)
- Explicit 1-sentence rule when cards shown
- profile_completion is default for missing_fields card actions

### 3. Confirmation enforcement (737e4ac)
- Chat route now IGNORES ALF's `confirmed` flag in tool input
- Only `/api/assistant/confirm` endpoint (UI button) can execute write tools
- ALF can no longer bypass the confirmation card

### 4. Confirm endpoint shows real results (357dc53)
- Previously: always showed "*Action confirmed and executed*" regardless of outcome
- Now: shows actual executor text_result + rich card on success, or **Error: [message]** on failure
- Confirm endpoint wrapped in try/catch, returns error JSON on failure

### 5. Upload file picker (4c87e4e)
- Removed `capture="environment"` from upload-form.tsx
- Users now get camera OR file browse options (was camera-only)

### 6. Workflow status card redesign (4c87e4e)
- Single-target: step indicator (Created → Sent → Awaiting → Complete)
- Multi-target: sent/complete/pending grid with progress bar
- Replaces confusing "0%" bar on fresh triggers

### 7. smart-send resilience fix (a20ea00)
- `smartSendWhatsApp` was failing silently because `last_inbound_at` column doesn't exist yet and `PROFILE_COMPLETION` template SID is a TODO
- Fix: falls back to `updated_at` if `last_inbound_at` missing, treats unknown threads as "try freeform first", catches freeform failure and falls back to template if available

---

## What The Other Agent Changed (that this session adapted to)

The other agent made these changes which were picked up mid-session:

- **`smartSendWhatsApp`** in `src/lib/whatsapp/smart-send.ts` — new function checking 24h window. All workflow definitions updated to use it. **Issue:** depends on `last_inbound_at` column (migration needed) and `PROFILE_COMPLETION` template (Twilio Console TODO). My fix in a20ea00 makes it resilient but the migration and template still need doing.
- **`submit-data/route.ts`** — added notification creation + engagement tracking (`last_upload_at`)
- **`profile-completion.ts`** — updated to use `smartSendWhatsApp` instead of `sendWhatsApp`
- **`document-chase.ts` + `data-collection.ts`** — also updated to use `smartSendWhatsApp`
- **System prompt** — RAP → RAPS (Safety score added), other tweaks
- **Middleware** — optimised public route early-return, added `/join`, `/briefing`, `/api/cron`
- **`upload-link.ts`** — added error logging on token generation

---

## Still Needs Doing (don't duplicate)

### Migrations (Supabase SQL Editor)
- [ ] `ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMPTZ;`
- [ ] `UPDATE message_threads SET last_inbound_at = updated_at WHERE last_inbound_at IS NULL;`
- [ ] `ALTER TABLE operatives ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;`
- [ ] `ALTER TABLE operatives ADD COLUMN IF NOT EXISTS last_upload_at TIMESTAMPTZ;`

### Twilio Console
- [ ] Create `PROFILE_COMPLETION` template and add SID to `src/lib/whatsapp/templates.ts`
- [ ] Check DOC_CHASE / DOC_REMINDER / DATA_REQUEST approval status

### Code Changes Still Needed
- [ ] Real-time workflow progress (polling from workflow-status card component)
- [ ] Notification bell on document upload / data submission
- [ ] Pending document indicator (purple/amber for uploaded-but-unreviewed)
- [ ] DOC_VERIFIED template: pass actual document type, not generic "passport / driving licence"
- [ ] "Fully verified" message: only fire when truly complete, not just when docs verified
- [ ] Image EXIF orientation fix in upload-form.tsx compressImage()
- [ ] ALF verbosity: reduce get_profile text_result when missing_fields card is shown
- [ ] Document review task queue for Liam

### Testing Operative
- **Oliver Tatler** — UUID: `bb127d2c-60b7-4421-a25e-6f0c70f0cdbc`, Phone: `+447742201349`

---

## Key Coordination Note

Both agents are editing the same files. Key files to be careful with:
- `src/lib/workflows/definitions/profile-completion.ts`
- `src/lib/whatsapp/smart-send.ts`
- `src/lib/assistant/system-prompt.ts`
- `src/app/api/assistant/chat/route.ts`
- `src/components/assistant/renders/workflow-status.tsx`
- `src/components/assistant/use-assistant-stream.ts`

Always `git pull` before making changes to these files.
