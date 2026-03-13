# Known Bugs — Aztec BOS

---

### 2026-02-25 — CSCS colour not cross-referenced in Vision verify

- **Location:** `src/app/api/apply/[token]/upload/route.ts` line ~291
- **Behaviour:** `intakeCscsColour` reads `operative.intake_data.cscs_colour` — but `intake_data` is on `message_threads`, NOT on `operatives`. Result: always null. Vision prompt for CSCS verification always says `expected colour: "unknown"`.
- **Expected:** Should read `operative.cscs_card_type` (e.g. "blue") as the expected colour.
- **Severity:** 🟡 Medium — CSCS upload still works and is verified, but colour mismatch flag never fires.
- **Fix:** Removed `intakeData` read entirely. Now reads `operative.cscs_card_type` and `operative.first_name/last_name` directly.
- **Status:** ✅ Fixed

---

### 2026-02-25 — TinyURL dependency for upload links (temp workaround)

- **Location:** `src/lib/whatsapp/sophie-handler.ts` — `shortenUrl()`
- **Behaviour:** Upload link shortened via TinyURL API (4s timeout, falls back to full URL). Full URL is `https://aztec-landscapes-bos.vercel.app/apply/[token]` — 34-char domain breaks WhatsApp line wrapping.
- **Expected:** Proper short domain (custom) so link is always single-line and clickable.
- **Severity:** 🟡 Medium — TinyURL works but introduces external dependency and looks unofficial.
- **Status:** Workaround in place. Needs permanent fix.

---

### 2026-02-25 — Twilio signature validation disabled

- **Location:** `src/app/api/webhooks/twilio/route.ts`
- **Behaviour:** Twilio signature validation commented out. Webhook accepts all POST requests.
- **Expected:** Should validate `X-Twilio-Signature` before processing.
- **Severity:** 🟡 Medium — security gap, low real-world risk while URL is obscure.
- **Status:** ✅ Fixed — validation active in current code (lines 54–60). BUGS.md was stale.

---

### FIXED — 2026-02-25 — Sophie conversation fallback ("Thanks for your message! Let me just check a few things...")

- **Root cause:** Two bugs:
  1. Inbound message saved to DB before Sophie called → DB history fetch included it → appended again = two consecutive user messages
  2. `[user:context, assistant:Understood]` priming pair prepended to messages → when history window started on assistant message, two consecutive assistant messages → broken
- **Fix:** Dedup check on history. State context moved to system prompt. Leading assistant messages stripped from history array.
- **Status:** ✅ Fixed (S25)

---

### FIXED — 2026-02-25 — CSCS upload slot not showing on apply form

- **Root cause:** `apply/[token]/page.tsx` read `operative.intake_data.cscs_card` — field doesn't exist on `operatives` table (it's on `message_threads`) → always false → only 1 upload slot shown.
- **Fix:** Now reads `operative.cscs_card_type` (populated by Sophie during intake).
- **Status:** ✅ Fixed (S25)

---

### FIXED — 2026-02-25 — Upload link URL split in WhatsApp

- **Root cause:** `NEXT_PUBLIC_APP_URL` had trailing `\n` → URL sent as two lines. Domain too long for WhatsApp bubble width.
- **Fix:** `.trim()` on env var + TinyURL shortening.
- **Status:** ✅ Fixed (S25)
