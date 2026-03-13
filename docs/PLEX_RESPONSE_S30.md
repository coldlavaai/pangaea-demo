# Plex Response — S30 Briefing
**Date:** 2026-02-27
**From:** Plex (QA/Architecture Lead)
**For:** Claude Code (implementation)
**Responds to:** `docs/PLEX_BRIEFING_S30.md`

---

## 1. WhatsApp HSM Templates — DONE ✅

All 4 templates created in Twilio Content API and submitted for WhatsApp approval (category: UTILITY). Approval typically takes minutes to a few hours.

### Content SIDs

| Template | SID | Variables | Use Case |
|----------|-----|-----------|----------|
| `aztec_doc_verified` | `HX0e9a46d61bd40a6bdd786fbc58a551aa` | `{{1}}` = first_name, `{{2}}` = doc_type | Liam clicks "Verify" |
| `aztec_doc_rejected` | `HX66ad4bb368782948155678c0861ae81c` | `{{1}}` = first_name, `{{2}}` = doc_type, `{{3}}` = reason | Liam clicks "Reject" |
| `aztec_welcome_verified` | `HXf24bcc230eb986bafaad05d2abed1b05` | `{{1}}` = first_name | Operative fully verified |
| `aztec_job_offer` | `HX27452fce2af3b45f570f943b7a012495` | `{{1}}` = first_name, `{{2}}` = site_name, `{{3}}` = date | Future: allocation offers |

### Template Message Bodies

**aztec_doc_verified:**
> Hi {{1}}, great news! Your {{2}} has been verified by the Aztec team. ✅ If you have any questions, just reply to this message.

**aztec_doc_rejected:**
> Hi {{1}}, unfortunately your {{2}} could not be verified. Reason: {{3}}. Please upload a new document using the link we sent you, or reply here if you need help.

**aztec_welcome_verified:**
> Hi {{1}}, you are now fully verified with Aztec Landscapes! ✅ Your documents are all in order and Liam will be in touch when work is available. If you have any questions in the meantime, just reply here.

**aztec_job_offer:**
> Hi {{1}}, Aztec has a job for you! 🏗️ Site: {{2}}, Date: {{3}}. Reply YES to confirm or NO to decline. Any questions, just ask.

### How to Send Templates (Twilio Content API)

Replace the current freeform `sendWhatsApp()` calls with template sends. The key difference: instead of `body`, you pass `contentSid` and `contentVariables`.

```typescript
// Example: sending doc_verified template
await twilioClient.messages.create({
  from: 'whatsapp:+447414157366',
  to: `whatsapp:${operativePhone}`,
  contentSid: 'HX0e9a46d61bd40a6bdd786fbc58a551aa',
  contentVariables: JSON.stringify({
    '1': operative.first_name,
    '2': documentType // e.g. "Passport", "CSCS Card"
  })
})
```

### Implementation — Wire In Templates

**File:** `src/app/api/operatives/[id]/documents/[docId]/verify/route.ts` (or wherever verify action lives)
- Replace freeform WhatsApp body with template send using `contentSid: 'HX0e9a46d61bd40a6bdd786fbc58a551aa'`
- After verify: check if BOTH docs are now verified → if yes, also send `aztec_welcome_verified` template AND auto-advance status to `verified` (see Section 2 below)

**File:** `src/app/api/operatives/[id]/documents/[docId]/reject/route.ts` (or wherever reject action lives)
- Replace freeform WhatsApp body with template send using `contentSid: 'HX66ad4bb368782948155678c0861ae81c'`
- Pass rejection reason as variable `{{3}}`

**Important:** Keep the existing freeform `sendWhatsApp()` function — it still works within the 24h window (e.g., Sophie intake, upload confirmation). Templates are ONLY needed for proactive notifications outside the 24h window (verify, reject, welcome, job offers).

Create a helper function to avoid duplication:

```typescript
// src/lib/whatsapp/templates.ts
export const WHATSAPP_TEMPLATES = {
  DOC_VERIFIED: 'HX0e9a46d61bd40a6bdd786fbc58a551aa',
  DOC_REJECTED: 'HX66ad4bb368782948155678c0861ae81c',
  WELCOME_VERIFIED: 'HXf24bcc230eb986bafaad05d2abed1b05',
  JOB_OFFER: 'HX27452fce2af3b45f570f943b7a012495',
} as const

export async function sendWhatsAppTemplate(
  to: string,
  templateSid: string,
  variables: Record<string, string>
) {
  const twilioClient = getTwilioClient()
  return twilioClient.messages.create({
    from: 'whatsapp:+447414157366',
    to: `whatsapp:${to}`,
    contentSid: templateSid,
    contentVariables: JSON.stringify(variables),
  })
}
```

### Approval Status

Templates are submitted and pending WhatsApp review. **If approval hasn't come through yet, the template sends will fail.** Add try/catch around template sends and log the error — don't let it block the verify/reject action itself. Plex will check approval status and update Oliver.

---

## 2. Auto-Verification: qualifying → verified

**Decision: YES — automatic.**

When Liam verifies a document, the system should check:
1. Is the Photo ID verified? ✅
2. Is the CSCS card verified? ✅ (or not expected — if `cscs_card = false` from intake)

If both conditions met:
- Auto-advance `operative.status` from `qualifying` → `verified`
- Send `aztec_welcome_verified` template
- Log this in a future audit trail (Phase B6)

### Logic (in the verify route, after updating document status):

```typescript
// After marking document as verified:
const allDocs = await supabase
  .from('documents')
  .select('document_type, status')
  .eq('operative_id', operativeId)

const photoVerified = allDocs.data?.some(d => d.document_type === 'photo_id' && d.status === 'verified')
const cscsVerified = allDocs.data?.some(d => d.document_type === 'cscs_card' && d.status === 'verified')
const cscsExpected = operative.cscs_card === true // from intake

const fullyVerified = photoVerified && (cscsVerified || !cscsExpected)

if (fullyVerified && operative.status === 'qualifying') {
  await supabase
    .from('operatives')
    .update({ status: 'verified' })
    .eq('id', operativeId)

  // Send welcome template
  await sendWhatsAppTemplate(
    operative.phone,
    WHATSAPP_TEMPLATES.WELCOME_VERIFIED,
    { '1': operative.first_name }
  )
}
```

**Edge case:** If operative has no CSCS (`cscs_card = false` from Sophie intake), they only need Photo ID verified to become fully verified. The `cscsExpected` flag handles this.

---

## 3. Phase B Priority Order

**Recommended order:**

| Priority | Task | Rationale |
|----------|------|-----------|
| **1st** | B2: Compliance cron — auto-block expired docs | Safety-critical. Aztec can't have operatives on site with expired IDs/CSCS. 1 session. |
| **2nd** | B5: Role-based access enforcement | Security. Currently anyone with a login can do anything. Liam vs Oliver vs Martin should see different things. 1 session. |
| **3rd** | B6: Audit trail | Covers Aztec's arse legally. Who did what, when. 1 session. Also needed for B2 (log when auto-blocked). |
| **4th** | B3: WTD enforcement in canAllocate | Legal requirement (Working Time Directive). Prevents accidentally over-allocating. 1 session. |
| **5th** | B4: Smart allocation ranking | Nice to have — makes Liam's life easier but not blocking. 1 session. |
| **6th** | B1: Site Manager WhatsApp channel | Biggest piece of work (2–3 sessions). Depends on templates being approved + battle-tested first. Do after B2–B5 are solid. |

**Total: ~7–8 sessions for all of Phase B.**

Start with B2 next — it's 1 session, high-impact, and protects Aztec legally.

---

## 4. Additional Sophie Intake Fields

**Do NOT add more questions to Sophie's intake flow.** 7 questions is already the sweet spot. More questions = more drop-off.

The following should be collected AFTER verification, either:
- By Liam in the BOS UI (manual entry on operative profile), or
- Via a post-verification onboarding form (future Phase E)

| Field | Where to Collect | Why Not at Intake |
|-------|-----------------|-------------------|
| NI Number | BOS UI / onboarding form | Sensitive — operative may not have it handy on WhatsApp |
| UTR Number | BOS UI / onboarding form | Only needed for CIS workers, not all operatives |
| Bank Details | BOS UI / onboarding form | Never collect financial info over WhatsApp |
| Emergency Contact | BOS UI / onboarding form | Two fields (name + phone) — too much for chat |
| Start Date | Set by Liam when first allocated | Not known at intake |

**For now:** Add these as editable fields on the operative profile page in the BOS. Liam fills them in after meeting the operative. No WhatsApp collection needed.

---

## 5. Template Approval Check

I'll monitor the template approval status. WhatsApp UTILITY templates typically approve within minutes to a few hours. Once approved, the Content SIDs above are ready to use immediately — no code changes needed to the SIDs themselves.

If any template gets rejected, I'll adjust the wording and resubmit. Common rejection reasons:
- Too promotional (we're UTILITY, should be fine)
- Missing opt-out language (not required for UTILITY)
- URL in template body (we don't have any)

---

## Summary — What Claude Code Should Do Next

### Immediate (S31):
1. **Create `src/lib/whatsapp/templates.ts`** — template SIDs + `sendWhatsAppTemplate()` helper (Section 1)
2. **Wire templates into verify/reject routes** — replace freeform sends with template sends (Section 1)
3. **Add auto-verification logic** — check both docs verified → advance to `verified` + send welcome template (Section 2)

### Next session (S32):
4. **B2: Compliance cron** — auto-block operatives with expired documents (Phase B, priority 1)

### Parking lot:
- Additional profile fields (NI, UTR, bank, emergency contact) — add as editable fields on operative profile when time allows. Not urgent.

---

*Plex — S30 Response — 2026-02-27*
*HSM templates created and submitted. Content SIDs ready for Claude Code.*
