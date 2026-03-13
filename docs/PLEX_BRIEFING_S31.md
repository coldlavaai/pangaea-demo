# Plex Briefing — Session S31
**Date:** 2026-02-27
**Author:** Claude Code (S31)
**For:** Plex — next phase handoff

---

## S31 — What Was Built

### WhatsApp HSM Templates — Wired ✅

Created `src/lib/whatsapp/templates.ts`:
- `WHATSAPP_TEMPLATES` — all 4 Content SIDs from Plex's response
- `sendWhatsAppTemplate(to, templateSid, variables)` — uses Twilio `contentSid` + `contentVariables` (Content API approach)

**Verify route** (`src/app/api/documents/[docId]/verify/route.ts`):
- Replaced freeform `sendWhatsApp()` with `aztec_doc_verified` template send
- Template variables: `{{1}}` = first_name, `{{2}}` = doc type label
- Both sends wrapped in try/catch — verify action succeeds even if template fails

**Reject route** (`src/app/api/documents/[docId]/reject/route.ts`):
- Replaced freeform `sendWhatsApp()` with `aztec_doc_rejected` template send
- Template variables: `{{1}}` = first_name, `{{2}}` = doc type, `{{3}}` = reason

### Auto-Verification: qualifying → verified ✅

Added to verify route — after marking a doc verified, it:
1. Fetches all documents for the operative
2. Checks: `photo_id` verified AND (`cscs_card` verified OR `cscs_card_type === null` = no CSCS expected)
3. If fully verified AND operative status is `qualifying`:
   - Updates `operative.status` to `verified`
   - Sends `aztec_welcome_verified` template

**Commit:** `5bc0e1a`

---

## Current State

### Template Approval
- All 4 templates confirmed in Twilio Content Template Builder ✅
- SIDs match exactly ✅
- **WhatsApp business initiated: UNDER REVIEW** (pending Meta approval)
- WhatsApp user initiated: Approved ✅
- Template sends will fail silently until business-initiated approval comes through — try/catch means verify/reject actions still work

### What's Working
- Verify button works — document status updates correctly
- Auto-verification logic is live — will fire the moment templates are approved
- Reject button works — document status + reason saved correctly
- Freeform `sendWhatsApp()` untouched — Sophie intake + upload confirmation still work (inside 24h window)

---

## Next Steps — Awaiting Plex Direction

Per Plex's S30 response, Phase B priority order was:
1. **B2: Compliance cron** — auto-block operatives with expired docs (1 session, safety-critical) ← Plex recommended starting here
2. B5: Role-based access enforcement
3. B6: Audit trail
4. B3: WTD enforcement in canAllocate
5. B4: Smart allocation ranking
6. B1: Site Manager WhatsApp channel

Ready to start B2 whenever Plex gives the go-ahead. Questions before starting:

1. **B2 specifics** — should the cron block (`status = 'blocked'`) or just flag? What happens to active shifts if an operative gets auto-blocked?
2. **B2 trigger** — daily cron at midnight UK time? Or also check on every allocation attempt?
3. **Template approval ETA** — anything Plex can do to expedite Meta review, or just wait?

---

*Claude Code — S31 — 2026-02-27*
