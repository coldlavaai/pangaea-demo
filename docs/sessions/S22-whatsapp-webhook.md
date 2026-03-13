# Session S22 — WhatsApp Webhook Handler

**Date:** 2026-02-24

---

## What Was Built

Inbound WhatsApp message handling — from Twilio webhook to DB storage to offer YES/NO routing.

---

## Files

- `src/app/api/webhooks/twilio/route.ts` — Twilio webhook entry point
- `src/lib/whatsapp/send.ts` — `sendWhatsApp()` REST helper
- `src/lib/whatsapp/handler.ts` — inbound message router
- `src/lib/whatsapp/offer-handler.ts` — YES/NO offer reply handler
- `supabase/migrations/00012_whatsapp_helpers.sql` — `increment_thread_unread()` DB function

---

## Flow

```
Twilio POST /api/webhooks/twilio
  → validateRequest() — rejects if X-Twilio-Signature invalid
  → parse application/x-www-form-urlencoded body
  → handleInbound()
      → upsert message_thread (keyed: phone_number + org_id)
      → link operative_id if phone matches operatives.phone
      → dedup check: messages.external_id (UNIQUE) + early exit on duplicate
      → insert messages row (direction: inbound)
      → update thread last_message + last_message_at
      → increment_thread_unread() — atomic DB function (migration 00012)
      → route:
          offer pending? → handleOfferReply()
          else           → default reply (if operative known) or silence
  → return TwiML <Response> with reply or empty
```

---

## Offer YES/NO Handler

**YES keywords:** yes, y, yeah, yep, yup, ok, okay, accept, 1, ✓, ✅
**NO keywords:** no, n, nope, reject, decline, 2, ✗, ❌, can't, cant

Active offer = pending allocation where `offer_sent_at IS NOT NULL` AND `offer_expires_at > NOW()`

**On YES:**
1. Sets allocation `status = 'confirmed'`, `offer_responded_at = NOW()`
2. Sends Liam: "✅ [Name] has ACCEPTED for [Site] ([Trade]) on [Date]"
3. Replies to operative: "Great, you're confirmed for [Site] ([trade]) on [date]. See you there! 👷"

**On NO:**
1. Sets allocation `status = 'terminated'`, `offer_responded_at = NOW()`
2. Sends Liam: "❌ [Name] has DECLINED for [Site] ([Trade]) on [Date]"
3. Replies: "No problem, we'll remove you from this one. We'll be in touch with other opportunities."

**Unknown body (not YES/NO):** falls through to default reply.

---

## Signature Validation

Uses `twilio.validateRequest(authToken, signature, webhookUrl, params)`.
Returns HTTP 403 if invalid — prevents spoofed requests.

**Critical:** `TWILIO_WEBHOOK_URL` env var must EXACTLY match the URL registered in Twilio console.
Current production URL: `https://aztec-landscapes-bos.vercel.app/api/webhooks/twilio`

---

## Migration 00012 — Apply via Supabase SQL Editor

```sql
CREATE OR REPLACE FUNCTION increment_thread_unread(thread_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE message_threads
  SET unread_count = unread_count + 1
  WHERE id = thread_id;
$$;
```

**Status: ✅ APPLIED**

---

## Environment Variables Required

All already in Vercel (encrypted):
- `TWILIO_ACCOUNT_SID` ✅
- `TWILIO_AUTH_TOKEN` ✅
- `TWILIO_WHATSAPP_NUMBER` = `whatsapp:+447414157366` ✅
- `TWILIO_WEBHOOK_URL` — **must be updated to** `https://aztec-landscapes-bos.vercel.app/api/webhooks/twilio`
- `LIAM_WHATSAPP_NUMBER` = `whatsapp:+447742201349` ✅ (placeholder — replace with real number)

**Also update Twilio console:** WhatsApp Sender > When a message comes in > `https://aztec-landscapes-bos.vercel.app/api/webhooks/twilio`

---

## What's NOT Done (S23)

- Sophie AI intake state machine — when no active offer and operative messages, should route to Sophie
- `message_threads` needs a `intake_state` column or a separate `intake_sessions` table for Sophie's conversation state
- Decision deferred to S23

---

## Key Decisions

- **Always return 200 to Twilio** (even on errors) — non-200 triggers Twilio retry storm
- **Silence for unknown numbers** — don't reply to random numbers not in the operatives table (avoids spam replies)
- **Atomic unread increment** — DB function avoids race conditions from concurrent messages
- **TwiML reply** (not REST API) for immediate operative responses — simpler, lower latency
- **REST API** (`sendWhatsApp()`) for proactive messages to Liam — separate from the webhook response
