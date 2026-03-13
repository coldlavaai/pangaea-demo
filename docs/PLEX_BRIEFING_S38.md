# Plex Briefing — Session S38
**Date:** 2026-03-01 (updated)
**Author:** Claude Code (S38)
**For:** Plex

> **Note:** Previous session had issues. This briefing is restructured to be step-by-step with a verification phase first. Do not proceed to Step 2 until Step 1 is confirmed working. Report back after each step.

---

## What Was Built Since S32

| Session | Feature |
|---|---|
| S33 | Notifications bell, searchable comms, exclude-working toggle on pool search |
| S34 | Engagement form fields, rate history duration column |
| S35 | Duration-based labour requests, finish reminder cron, missing timesheet alerts |
| S36 | 30/60/90 day expiry tiers in compliance cron, goodwill reminder sweep, `sendWhatsAppTemplate()` utility — **stubs ready, SID needed** |
| S37 | CV upload → Claude parse → work history UI, pool search matches work history job titles |
| S38 | Free-form advert creation + AI copy generation |

---

## Step 1 — Verify Twilio Credentials Are Intact

**Do this first before touching anything else.**

Something may have been changed or broken in the last session. Before creating any new templates, confirm the existing Twilio setup is still working correctly.

### 1a. Confirm Account SID and Auth Token are unchanged

Go to: **Twilio Console → Account → General Settings → API Credentials**

Verify that:
- The **Account SID** is: `AC...` (the main Aztec account — not a subaccount)
- The **Auth Token** matches what is set in Vercel env as `TWILIO_AUTH_TOKEN`

To check the Vercel env value: **Vercel → aztec-landscapes-bos → Settings → Environment Variables → `TWILIO_AUTH_TOKEN`**

If the auth token in Twilio has been rotated or changed and no longer matches Vercel, the WhatsApp integration is silently broken. They must match exactly.

### 1b. Confirm the WhatsApp sender number is still active

Go to: **Twilio Console → Messaging → Senders → WhatsApp Senders**

Confirm that `+447414157366` is listed and status is **Active** (not Pending, Suspended, or removed).

### 1c. Confirm existing templates are still present

Go to: **Twilio Console → Content Template Builder**

Confirm the following templates still exist (created in a previous session):
- `aztec_doc_verified`
- `aztec_doc_rejected`
- `aztec_welcome_verified`

If any are missing or show status other than **Approved**, report back before proceeding.

### 1d. Send a test message to confirm end-to-end

Send a simple freeform WhatsApp message from the Twilio console to Oliver's number (`+447414157366`) to confirm the sender is working. This is a 2-second check — just use the "Try it out" feature in the WhatsApp Sender settings.

**→ Report back: "Step 1 confirmed — credentials intact, sender active, templates present" before moving on.**

---

## Step 2 — Create One New Template

Only proceed once Step 1 is confirmed.

### Template: `aztec_doc_expiring`

**Purpose:** Notify an operative that one of their documents is expiring soon. Used by two daily cron jobs — compliance check (midnight) and goodwill reminder sweep (08:00).

**Create in:** Twilio Console → Content Template Builder → New template
**Category:** UTILITY
**Language:** English (UK)

**Template variables:**
| Variable | Content | Example |
|---|---|---|
| `{{1}}` | Operative first name | `James` |
| `{{2}}` | Document type | `CSCS Card` or `Photo ID` |
| `{{3}}` | Expiry date | `2026-04-15` |

**Suggested body text:**
```
Hi {{1}}, this is a reminder that your {{2}} expires on {{3}}. Please renew it before it expires to avoid being taken off active work. Reply or call us if you need any help.
```

Adjust wording as needed — keep the three `{{n}}` variables in the same positions.

**→ Return: the `HX...` Content SID for this template.**

---

## Step 3 — Oliver Activates It (no Plex action needed)

Once Plex returns the SID, Oliver will:

1. Go to **Vercel → aztec-landscapes-bos → Settings → Environment Variables**
2. Add: `AZTEC_DOC_EXPIRING_SID` = `HX...`
3. Redeploy

The two WhatsApp stubs in the cron files are already written and commented out — they activate automatically once the env var is present. No code changes needed.

---

## Reference: What the Code Stubs Look Like

**Compliance cron** (`src/app/api/cron/compliance-check/route.ts`):
```typescript
// TODO (Plex S36): Uncomment when AZTEC_DOC_EXPIRING_SID is in env
// if ((tier.type === 'doc_expiring_30' || tier.type === 'doc_expiring_60') && op.phone) {
//   await sendWhatsAppTemplate(op.phone, process.env.AZTEC_DOC_EXPIRING_SID!, {
//     '1': op.first_name,
//     '2': docLabel,           // e.g. "CSCS Card"
//     '3': mediumTermDoc.expiry_date!,
//   })
// }
```

**Reminders cron** (`src/app/api/v1/cron/reminders/route.ts`):
```typescript
// TODO (Plex S36): Send WhatsApp to operative using aztec_doc_expiring template
// if (op.phone) {
//   await sendWhatsAppTemplate(op.phone, process.env.AZTEC_DOC_EXPIRING_SID!, {
//     '1': op.first_name,
//     '2': docLabel,
//     '3': soonestExpiry.expiry_date!,
//   })
// }
```

---

## Future Items (not blocking anything right now)

- **`aztec_staff_alert` template** — single variable `{{1}}` (message text) for manager escalation alerts. Not yet wired in code — low priority.
- **Phase B** (WTD limits, RBAC, audit log, ranking, advanced reporting) — not started.

---

## Summary Checklist

- [ ] **Step 1:** Verify auth token matches Vercel env, sender active, existing templates present — report back
- [ ] **Step 2:** Create `aztec_doc_expiring` template, return `HX...` SID
- [ ] **Step 3:** Oliver adds `AZTEC_DOC_EXPIRING_SID` to Vercel → live
