# Master Plan — 12 March 2026

Cross-referenced from:
- Code review session (2026-03-11, Opus agent) — `docs/session-summary-2026-03-11.md`
- WhatsApp/ALF session (2026-03-11, other agent) — `docs/next-session-plan-2026-03-12.md`
- ALF workflow findings — `docs/alf-workflow-findings-2026-03-11.md`
- WhatsApp 24h window status — `docs/whatsapp-24h-window-status.md`

---

## PRIORITY 1: RE_ENGAGE-First Flow (WhatsApp 24h)

**Status:** Partially built. `smartSendWhatsApp` exists with 24h detection + template fallback. `RE_ENGAGE` template created and approved. Deferred message code built in handler.ts. BUT: current flow sends specific templates (PROFILE_COMPLETION etc) directly when outside 24h, which doesn't open the session window for follow-up confirmations.

**What needs doing:**
- Change `smartSendWhatsApp` default: outside 24h → ALWAYS send RE_ENGAGE first, store real message in `deferred_message` on thread
- When operative replies → deferred message delivered automatically (already built in handler.ts lines 149-162)
- This ensures ALL confirmations (data received, doc uploaded, verified) can be sent as freeform
- The specific templates (PROFILE_COMPLETION, DOC_CHASE etc) become unused for outbound-initiated flows

**Files:** `src/lib/whatsapp/smart-send.ts`, `src/lib/whatsapp/handler.ts` (already has deferred delivery)

**Note from code review agent:** Also need to add notification when send fails completely — Liam should see "Failed to reach operative" in the bell. And job_offer onFollowUp still uses `sendWhatsApp` directly, needs updating to `smartSendWhatsApp`.

---

## PRIORITY 2: Inline Editing (Operative Profile)

**Status:** Not started. Currently uses Edit button → page reload → form mode.

**What needs doing:**
- Create reusable `InlineEditField` component (click to edit, Enter/tick to save)
- Apply to operative profile: Contact, Address, Identity, Work Details, RTW, CSCS sections
- Each save → PATCH to DB + audit log entry
- Sets the pattern for sites, allocations, etc.

**Files:** New component + `src/app/(dashboard)/operatives/[id]/page.tsx`

---

## PRIORITY 3: Multi-Language Communications

**Status:** Sophie already detects language on intake and stores `preferred_language`. Messages are currently English-only.

**What needs doing:**
- All outbound WhatsApp messages translated to operative's `preferred_language` before sending
- Inbound replies auto-translated to English for Liam
- Use Claude for translation (already in stack)
- Store both original + translated in messages table
- Template messages may need language variants in Twilio

**Files:** `src/lib/whatsapp/send.ts`, `src/lib/whatsapp/smart-send.ts`, possibly new `translate.ts` utility

---

## PRIORITY 4: ALF Workflow Completion Feedback

**Status:** Workflow progress card exists with real-time polling (built by other agent). But ALF doesn't proactively notify Liam when a workflow completes.

**What needs doing:**
- When workflow hits 100%: ALF shows completion summary
- Create a verification task in dashboard
- Notification bell alert
- Summary: "Oliver Tatler completed everything — NI and UTR submitted, passport uploaded (pending verification)"

**Files:** `src/lib/workflows/engine.ts` (checkAndCompleteRun), notification creation

---

## PRIORITY 5: Data Quality Flag Consistency

**Status:** Three different places check different things for data quality (profile banner, table tooltip, ALF missing_fields card).

**What needs doing:**
- Single shared function for data quality checks
- Used by: operative profile banner, table tooltip, ALF card
- All show same issues consistently

**Files:** Extract to `src/lib/compliance/data-quality.ts`, update consumers

---

## PRIORITY 6: UK Passport = Right to Work

**Status:** Passport and RTW are separate. A verified British passport should auto-satisfy RTW.

**What needs doing:**
- In document verification route: when photo_id verified AND nationality is British → auto-set `rtw_verified = true`, `rtw_type = 'british_citizen'`
- This is PARTIALLY done already (verify/route.ts lines 66-75 derive RTW type from nationality) but may not be firing correctly

**Files:** `src/app/api/documents/[docId]/verify/route.ts`

---

## PRIORITY 7: Quick ALF Persistence

**Status:** Quick ALF widget button built (sidebar). Panel opens/closes. But conversation resets on page navigation.

**What needs doing:**
- Persist conversation state across navigation (store in React context or localStorage)
- Add "New chat" button to widget
- Widget conversations visible in full ALF sidebar

**Files:** `src/components/assistant/assistant-widget.tsx`, potentially new context provider

---

## PRIORITY 8: Donseed Attendance Integration

**Status:** API spec fully reviewed. Endpoint mapping + integration design complete. Client matching strategy (NI number primary, name+DOB fallback). Waiting on API credentials from client.

**What needs doing (when credentials arrive):**
- `donseed_id` field on operatives table
- `src/lib/donseed/client.ts` — API client
- Worker matching: sync Individuals → operatives by NI number
- Daily attendance cron: `GET /TimesheetsToday` → attendance records
- Dashboard widget: "On site today" with live counts per site
- ALF tool: "Who's on site at [project] today?"
- Settings toggle: on/off
- Charge rate from Donseed `Charge Out Rate (£)` → operatives.charge_rate
- WTD compliance from `GetFatigueWorkersByDate` endpoint (replaces manual calc)

**API base:** `https://workplace-odata.donseed.com`
**Key endpoints:** `/TimesheetsToday`, `/Individuals`, `/Projects`, `/GetFatigueWorkersByDate`
**Blocked on:** API credentials from Aztec client

---

## PRIORITY 9: RAP Paper Sheet Scanner

**Status:** Not started. Waiting on Liam's paper RAP template photo.

**What needs doing:**
- Photo upload page/modal
- Claude Vision extraction: operative name → R/A/P/S scores → site manager name → comments
- Match extracted name to operative in DB
- Create performance_reviews record
- Could support batch: photo of sheet with multiple operatives

**Blocked on:** Liam's paper template photo

---

## ALSO OUTSTANDING (not in priority list but must not be forgotten)

| Item | Owner | Status |
|---|---|---|
| **job_offer onFollowUp** — uses `sendWhatsApp` directly, needs `smartSendWhatsApp` | Code | Not done |
| **Notification on smart send failure** — Liam should see "Failed to reach operative" in bell | Code | Not done |
| **Sentry error tracking** — production error visibility | Oliver | Needs account setup |
| **RESEND_API_KEY** — for email sending via Resend | Oliver | Add to Vercel env vars |
| **Regenerate Supabase types** — eliminates `as any` casts for new columns | Code | Quick win |
| **Duplicate NIs** — OSP025, HOW005, ANAMI1239 | Liam | Needs review |
| **Retroactive entry_source** — `UPDATE operatives SET entry_source = 'import' WHERE ...` | SQL | Quick win |
| **Pending document indicator** — purple badge for "uploaded, pending review" in ALF card | Code | Medium |
| **EXIF image rotation** — uploaded photos sometimes display rotated | Code | Low |
| **Site manager history on allocations** — `site_manager_id` FK, tracks who managed per job | Future | Confirm with Liam |
| **Workflow progress polling** | Done ✅ | Built by other agent |

---

## SESSION ORDER RECOMMENDATION

**Phase A — Do now (code work, no blockers):**
1. RE_ENGAGE-first flow (Priority 1)
2. Inline editing (Priority 2)
3. Multi-language (Priority 3)
4. ALF completion feedback (Priority 4)
5. Data quality consistency (Priority 5)
6. UK passport = RTW (Priority 6)
7. Quick ALF persistence (Priority 7)
8. job_offer onFollowUp fix + send failure notifications (quick fixes)
9. Regenerate Supabase types (quick win)

**Phase B — When external dependencies are met:**
10. Donseed attendance integration (Priority 8, needs API credentials)
11. RAP paper sheet scanner (Priority 9, needs Liam's template)

**Phase C — Oliver actions (non-code):**
12. Sentry account setup
13. RESEND_API_KEY to Vercel
14. Liam reviews duplicate NIs

---

## KEY FILES (shared between agents — be careful with conflicts)

| File | Last modified by | Purpose |
|---|---|---|
| `src/lib/whatsapp/smart-send.ts` | Both agents | 24h window logic |
| `src/lib/whatsapp/handler.ts` | Both agents | Inbound routing + deferred messages |
| `src/lib/whatsapp/templates.ts` | Other agent | All template SIDs (all approved now) |
| `src/lib/workflows/definitions/profile-completion.ts` | Both agents | Profile completion workflow |
| `src/lib/assistant/system-prompt.ts` | Code review agent | RAPS, charge_rate, engagement fields |
| `src/components/assistant/assistant-widget.tsx` | Both agents | Widget panel |
| `src/components/sidebar.tsx` | Code review agent | Quick ALF button + nav |
| `src/app/(dashboard)/operatives/[id]/page.tsx` | Code review agent | Lazy tabs, RAP display, charge rate |
| `src/components/operatives/rap-table-view.tsx` | Code review agent | RAP spreadsheet view |

**Always `git pull` before editing these files.**
