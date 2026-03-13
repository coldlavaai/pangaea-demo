# WhatsApp Template Strategy — Complete Plan

## The Big Picture

Two approaches depending on the situation:

1. **Direct template** — when we have a template that covers the exact use case (doc chase, job offer, profile completion). Works outside 24h window.
2. **Re-engage then freeform** — when we need to send a complex/custom message. Send a generic "we have an update" template, wait for reply, then send the detailed freeform message.

This means we never hit a dead end. Every outbound message has a path to delivery.

---

## All Templates Needed

### Already Approved (4)
| Name | Status |
|---|---|
| DOC_VERIFIED | Approved |
| DOC_REJECTED | Approved |
| WELCOME_VERIFIED | Approved |
| JOB_OFFER | Approved |

### Awaiting Meta Approval (3) — CHECK STATUS
| Name | SID | Action |
|---|---|---|
| DOC_CHASE | `HX96e82100e8241fc7b10b1163269d6f35` | Check approval in Twilio Console |
| DOC_REMINDER | `HX02ee37ca3485bf75c482042dd9e38fbc` | Check approval in Twilio Console |
| DATA_REQUEST | `HXaded45da36979766c438e85427df969b` | Check approval in Twilio Console |

### Need Creating (4 NEW) — Step-by-Step Below

| # | Name | Category | Purpose |
|---|---|---|---|
| 1 | PROFILE_COMPLETION | UTILITY | Combined data + document chase link (MOST URGENT) |
| 2 | RE_ENGAGE | UTILITY | Universal fallback — prompts reply to open 24h window |
| 3 | JOB_OFFER_REMINDER | UTILITY | Follow-up for unanswered job offers |
| 4 | AVAILABILITY_CHECK | MARKETING | Cold outreach for dormant operatives |

---

## Step-by-Step: Create Each Template

### How to get there
1. Go to https://console.twilio.com
2. Navigate to **Messaging → Content Editor** (or search "Content Template Builder")
3. Click **Create new**

---

### Template 1: PROFILE_COMPLETION (URGENT — code already references this)

**Settings:**
- Friendly Name: `PROFILE_COMPLETION`
- Language: `en`
- Category: **UTILITY**
- Content Type: `twilio/text`

**Body (copy exactly):**
```
Hi {{1}}, we need a few things from you to keep your Aztec record up to date. Please use this link: {{2}} — Aztec Labour Force
```

**Variable examples:**
- `{{1}}`: `Dave`
- `{{2}}`: `https://aztec-landscapes-bos.vercel.app/apply/abc123`

**After creation:** Copy the `HX...` Content SID.

---

### Template 2: RE_ENGAGE (universal fallback)

**Settings:**
- Friendly Name: `RE_ENGAGE`
- Language: `en`
- Category: **UTILITY**
- Content Type: `twilio/text`

**Body (copy exactly):**
```
Hi {{1}}, we have an update for you from Aztec Landscapes. Please reply to this message so we can share the details. — Aztec Labour Force
```

**Variable examples:**
- `{{1}}`: `Dave`

**Why this works:** Framed as "we have an update" (transactional, tied to their record). Prompts a reply which opens the 24h session window. Then we send the real detailed message.

---

### Template 3: JOB_OFFER_REMINDER

**Settings:**
- Friendly Name: `JOB_OFFER_REMINDER`
- Language: `en`
- Category: **UTILITY**
- Content Type: `twilio/text`

**Body (copy exactly):**
```
Hi {{1}}, just checking — are you available for {{2}} starting {{3}} at {{4}}/day? Reply YES or NO. — Aztec Labour Force
```

**Variable examples:**
- `{{1}}`: `Dave`
- `{{2}}`: `Whitefield Park`
- `{{3}}`: `Mon 15 Apr`
- `{{4}}`: `£180`

---

### Template 4: AVAILABILITY_CHECK (lower priority)

**Settings:**
- Friendly Name: `AVAILABILITY_CHECK`
- Language: `en`
- Category: **MARKETING** (this is promotional outreach, not transactional)
- Content Type: `twilio/text`

**Body (copy exactly):**
```
Hi {{1}}, it's Aztec Landscapes. We've got work coming up and wanted to check your availability. Reply here and we'll send you the details. — Aztec Labour Force
```

**Variable examples:**
- `{{1}}`: `Dave`

---

## After Creating Each Template

1. **Copy the Content SID** (starts with `HX...`)
2. **Tell me the SID** — I'll add it to `src/lib/whatsapp/templates.ts`
3. **Wait for Meta approval** (usually <24h, often within minutes for UTILITY)
4. Templates work in code immediately after SID is added — if Meta hasn't approved yet, Twilio will queue the message until approval

---

## The Re-Engage Flow (Code Changes Needed After Templates Created)

### How it works:

```
Workflow wants to send message to operative
  ↓
Check 24h window
  ↓
Within 24h? → Send freeform (rich, personalised) → Done
  ↓
Outside 24h + specific template exists? → Send template → Done
  ↓
Outside 24h + NO specific template? → Send RE_ENGAGE template
  + Store the intended freeform message in message_threads.deferred_message
  ↓
Operative replies to RE_ENGAGE → 24h window opens
  ↓
Inbound handler detects deferred_message on thread
  → Sends the stored freeform message immediately
  → Clears deferred_message
  → Continues with normal routing (workflow/Sophie/etc.)
```

### What this needs:
1. New DB column: `ALTER TABLE message_threads ADD COLUMN deferred_message TEXT;`
2. Update `smartSendWhatsApp` to use RE_ENGAGE as ultimate fallback + store deferred message
3. Update inbound handler to check for and send deferred messages on reply

I'll implement these code changes once you've created the templates and given me the SIDs.

---

## When Each Template Is Used

| Scenario | Within 24h | Outside 24h |
|---|---|---|
| Profile completion (missing fields card action) | Freeform | **PROFILE_COMPLETION** template |
| Single document chase | Freeform | **DOC_CHASE** template |
| Document chase reminder | Freeform | **DOC_REMINDER** template |
| Single data field request | Freeform | **DATA_REQUEST** template |
| Job offer | Freeform | **JOB_OFFER** template |
| Job offer follow-up | Freeform | **JOB_OFFER_REMINDER** template |
| Document verified notification | Freeform | **DOC_VERIFIED** template |
| Document rejected notification | Freeform | **DOC_REJECTED** template |
| Complex/multi-item ALF message | Freeform | **RE_ENGAGE** → reply → freeform |
| Bulk re-engagement campaign | Freeform | **AVAILABILITY_CHECK** template |
| Any unknown/custom message | Freeform | **RE_ENGAGE** → reply → freeform |

RE_ENGAGE is the safety net. It means **no outbound message ever silently fails**.

---

## Priority Order

1. **PROFILE_COMPLETION** — create NOW (code already references it, currently fails when outside 24h)
2. **RE_ENGAGE** — create NOW (universal fallback, prevents all silent failures)
3. **Check DOC_CHASE/DOC_REMINDER/DATA_REQUEST approval** — these might already be approved
4. **JOB_OFFER_REMINDER** — create when ready (fixes job offer follow-up gap)
5. **AVAILABILITY_CHECK** — create later (for future bulk outreach features)
