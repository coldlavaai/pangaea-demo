# JJ Site Manager Testing — Handoff Document
**Date:** 3 March 2026
**Prepared by:** Oliver Tatler / Claude (Cold Lava AI)
**For:** JJ — Site Manager Testing

---

## 🤖 FOR CLAUDE CODE (READ THIS FIRST)

This document is the starting point for JJ's Claude Code session. JJ is a site manager at Aztec Landscapes testing a WhatsApp bot. Oliver (the project owner) has gone to bed. Your job is to pick up exactly where he left off.

### Your immediate tasks in order:

**1. Check if the WhatsApp invite template has been approved**
```
Go to: console.twilio.com → Messaging → Content Template Builder
Look for: aztec_user_invite (SID: HX877e076c4ff88f0938c7eb9efbb91337)
Check: approval status — Approved / Pending / Rejected
```
- If **Approved** → the invite flow is fully automated. Proceed to Task 2.
- If **Pending** → still waiting. Use the manual copy-link fallback in Task 2.
- If **Rejected** → alert JJ, message Oliver on WhatsApp, do not proceed with bot testing.

**2. Get JJ signed into the BOS**

Go to `https://aztec-landscapes-bos.vercel.app` and log in as Oliver (`oliver@coldlava.ai` / `AztecTest2026!`).

- Go to **Settings → Users tab**
- If Jacob Stray already appears → delete him first (trash icon → "Yes"), then re-invite
- Click **Invite User** → fill in:
  - First name: `Jacob`, Last name: `Stray`
  - Email: `jacobstray7@gmail.com`
  - Role: **Site Manager**
  - Phone: `+447359821793`
  - Site: **Birmingham Business Quarter** (click to select, turns blue)
- Click **Create & get link**
- If template approved: WhatsApp fires automatically to JJ's phone
- If template pending: copy the link → send to JJ manually (Oliver's WhatsApp or however JJ prefers)

**3. Verify JJ's setup before bot testing**

In Settings → Users, confirm:
- [ ] Role = Site Manager (sky blue badge)
- [ ] Phone = `+447359821793`
- [ ] Site = Birmingham Business Quarter assigned

**4. Walk JJ through the bot tests**

The full test scripts are in **Part 2** of this document. Work through each one with JJ. After each test, check the BOS to confirm records were created (Part 3).

**5. Log any bugs**

If something doesn't work, go straight to the debugging section (Part 4). Fix what you can. If it's a code issue that needs a new deployment, log it clearly and message Oliver.

**6. When testing is complete**

Update this document with the results — what passed, what failed, JJ's feedback on usability. Oliver will pick up from there.

### Key credentials you'll need:
| Item | Value |
|------|-------|
| BOS URL | `https://aztec-landscapes-bos.vercel.app` |
| Oliver's login | `oliver@coldlava.ai` / `AztecTest2026!` |
| Supabase dashboard | `https://supabase.com/dashboard/project/ybfhkcvrzbgzrayjskfp` |
| GitHub repo | `https://github.com/Aztec-Landscapes/aztec-bos` |
| Aztec WhatsApp number (the bot) | `+447414157366` |
| JJ's phone | `+447359821793` |
| JJ's email | `jacobstray7@gmail.com` |
| Twilio console | `console.twilio.com` |

### Project context for Claude Code:
- Stack: Next.js 15.5.12 App Router · Supabase · Vercel · Tailwind · shadcn/ui
- Repo: `Aztec-Landscapes/aztec-bos` on GitHub, branch `main`
- Vercel auto-deploys on push to `main` (git email must be `otatler@gmail.com`)
- Read `CLAUDE.md` in the repo root for full architecture rules
- Read `docs/TODO.md` for the full task queue

---

---

## What We're Testing & Why

Aztec Labour Force (ALF) has a **WhatsApp bot for site managers**. Instead of calling the office, JJ can text a single WhatsApp number to:

- Mark an operative as **arrived** on site
- Log a **Non-Conformance Report (NCR)** — safety issue, incident, problem
- Submit a **RAP rating** (Attitude / Reliability / Performance, 1–5 each) for an operative

These actions all create real records in the BOS dashboard that Liam and the team can see instantly. The goal of this test is to validate the full flow end-to-end before rolling it out to all site managers.

---

## Current Status — What's Waiting

### WhatsApp invite template — awaiting Meta approval
When Oliver invites JJ through the BOS, the system generates a secure sign-up link and is supposed to fire it automatically to JJ's WhatsApp. This requires a pre-approved Meta template (`HX877e076c4ff88f0938c7eb9efbb91337`).

Meta approval can take anywhere from **30 minutes to a few hours**. Until then, the system will still generate the link — Oliver just has to copy it manually and WhatsApp it to JJ from his personal phone.

**Oliver to check in the morning:** Go to console.twilio.com → Content Template Builder → find `aztec_user_invite` → check approval status. If approved, the full automated flow is live.

---

## Part 1 — Getting JJ Set Up

### Step 1 — Send JJ his invite link

**If the template is approved (automated):**
1. BOS → Settings → Users tab
2. Click **Invite User** (green button, top right)
3. Fill in: Jacob Stray, `jacobstray7@gmail.com`, Role: **Site Manager**, Phone: `+447359821793`, Site: **Birmingham Business Quarter**
4. Click **Create & get link**
5. Modal says "WhatsApp sent to +447359821793" — JJ receives it automatically

**If the template is still pending (manual fallback):**
1. Same steps through clicking **Create & get link**
2. Modal shows the link — click **Copy**
3. Oliver pastes and sends to JJ via personal WhatsApp

> **Note:** If JJ already has an account in Settings → Users, delete it first using the trash icon (confirm with "Yes"), then re-invite.

---

### Step 2 — JJ signs up

JJ receives a WhatsApp (or manual message) with a link to:
`https://aztec-landscapes-bos.vercel.app`

He taps it, and it opens a **Set Password** screen. He:
1. Creates a password
2. Clicks confirm
3. Gets redirected to the BOS dashboard

**He doesn't need to do anything in the BOS dashboard** — it's just proof the account works. The bot is his interface.

---

### Step 3 — Verify setup before testing

Oliver checks in the BOS before JJ starts:

**Settings → Users tab:**
- [ ] JJ appears in the list
- [ ] Role badge shows **Site Manager** (sky blue)
- [ ] Phone shows `+447359821793`
- [ ] **Birmingham Business Quarter** appears as his assigned site

If any of these are wrong, fix them before proceeding. Role and phone are editable inline in the Users table.

---

## Part 2 — WhatsApp Bot Testing

JJ texts **+447414157366** from his personal phone (`+447359821793`).

> This is the same Aztec WhatsApp number used for everything. The system automatically routes site managers to the bot based on their registered phone number — operatives get a different flow (Sophie intake).

---

### Test 1 — First contact / help menu

| JJ sends | Expected response |
|----------|-----------------|
| `hello` | Welcome message + help menu listing all commands |
| `help` | Help menu again |

**What to check in BOS:**
- Comms → find JJ's thread → conversation appears with the welcome message

---

### Test 2 — Arrival flow

| JJ sends | Expected response |
|----------|-----------------|
| `arrived` | "Who arrived? Reply with the operative's full name." |
| *(e.g. "John Smith")* | "John Smith marked as arrived on site. ✅" |

**What to check in BOS:**
- Allocations → find John Smith's allocation
- Status should now be **Active**
- `actual_start_date` should be today (3 March 2026)

---

### Test 3 — NCR flow

| JJ sends | Expected response |
|----------|-----------------|
| `ncr` | "Please describe the incident:" |
| `Worker refused to wear PPE` | "Which operative is involved?" |
| *(operative full name)* | "NCR logged ✅" + description echoed back |

**What to check in BOS:**
- NCRs → new record appears at the top
- Check: operative name correct, description matches, `reported_via = whatsapp`, reporter = JJ's full name, site = Birmingham Business Quarter
- The operative's NCRs tab on their profile should also show it

---

### Test 4 — RAP rating flow

| JJ sends | Expected response |
|----------|-----------------|
| `rap` | "Who would you like to rate?" |
| *(operative full name)* | "Rating [name]. Attitude score (1–5): 1=Poor 5=Excellent" |
| `4` | "Got it (A: 4). Reliability score (1–5): 1=Often absent 5=Always there" |
| `3` | "Got it (R: 3). Performance score (1–5): 1=Poor quality 5=Exceptional" |
| `5` | "RAP submitted ✅ A:4 R:3 P:5 · Average: 4/5" |

**What to check in BOS:**
- Operatives → find the rated operative → RAP tab
- New review appears with today's date, scores A:4 R:3 P:5
- Traffic light: **Green** (average 4.0 is ≥ 3.5)
- Operative's overall `avg_rap_score` on their profile header should update

---

### Test 5 — Cancel mid-flow

| JJ sends | Expected response |
|----------|-----------------|
| `arrived` | (asks for name) |
| `cancel` | "Cancelled." + help menu resets |
| `ncr` | (asks for description) |
| `stop` | "Cancelled." + help menu resets |

Any of these words cancel mid-flow: `cancel`, `stop`, `quit`, `abort`, `back`, `exit`, `restart`

---

### Test 6 — Unknown message (idle state)

| JJ sends | Expected response |
|----------|-----------------|
| `what's the weather like` | Help menu (bot shows available commands) |

---

## Part 3 — Debugging

### Problem: JJ gets Sophie (operative onboarding bot) instead of the site manager menu

**Cause:** His phone number doesn't match his record in the system.

**Fix:**
1. BOS → Settings → Users → find JJ
2. Click the phone number (or the faint "Add phone" text under his email)
3. Make sure it reads exactly `+447359821793`
4. Try again — the bot checks three formats automatically (+44, 07, 447) so any of these should work

---

### Problem: "Couldn't find [operative name] on your site"

**Cause:** Either the name doesn't match, or that operative has no active/pending/confirmed allocation at Birmingham Business Quarter.

**Fix:**
1. BOS → Operatives — check the exact spelling of the operative's name
2. BOS → Allocations — filter by operative, check their allocation status is `pending`, `confirmed`, or `active` and the site is Birmingham Business Quarter
3. Use the exact full name as it appears in the BOS (e.g. "John Smith" not "Johnny" or "J Smith")

**Alternative for testing:** If JJ has no site assignment in Settings (remove Birmingham Business Quarter), he becomes unrestricted (admin-level) and can find any operative across all sites. Re-add the site after testing is done.

---

### Problem: Sign-up link doesn't work or says "link expired"

**Cause:** Supabase invite links expire after 24 hours.

**Fix:**
1. BOS → Settings → Users → find JJ → trash icon → confirm delete
2. Re-invite with the same details → new link generated → send to JJ

---

### Problem: No response from the bot at all

**Cause:** Something at the server/webhook level.

**Fix:**
1. Oliver checks Vercel dashboard → `aztec-landscapes-bos.vercel.app` project → Functions tab
2. Look for recent invocations of `/api/webhooks/twilio` → any errors shown?
3. Also check Twilio console → Messaging → Logs → find the inbound message → check if it was delivered to the webhook

---

### Problem: JJ gets into the BOS and sees "Unauthorized" or a blank page

**Cause:** Role not set correctly.

**Fix:** Settings → Users → JJ's row → change role dropdown to **Site Manager**. Takes effect on next login.

---

### Problem: "email rate limit exceeded" when trying to invite

**Cause:** This is Supabase's internal email rate limit — irrelevant since we switched to link-based invite (no email is sent). If you're still seeing this error, the old version may be cached — force-refresh the page or clear browser cache.

---

## Part 4 — What Good Looks Like

After a complete successful test, Oliver should see in the BOS:

| Location | What should be there |
|----------|---------------------|
| Comms → JJ's thread | Full conversation history, inbound (blue) and outbound (green) |
| Allocations | Operative status = Active, actual_start_date = today |
| NCRs | New NCR with JJ as reporter, correct site, correct operative |
| Operative → RAP tab | New review with scores, correct traffic light |
| Operative header | Updated avg_rap_score |

---

## Part 5 — Future Direction: Telegram

This is something Oliver and JJ should discuss after testing.

**The plan:** Move site managers to **Telegram** for their bot, while keeping WhatsApp for operative onboarding (Sophie).

**Why Telegram is better for site managers:**

| Feature | WhatsApp (current) | Telegram (proposed) |
|---------|-------------------|-------------------|
| Commands | Type "arrived", "ncr", "rap" | Tap `/arrived` `/ncr` `/rap` slash commands |
| Score entry | Type "4" and hope it parses | Tap `[1] [2] [3] [4] [5]` inline buttons |
| Cost | ~£0.05 per message (Twilio) | Free (Telegram Bot API) |
| Template approval | Required for any outbound | Not required |
| App required | No (everyone has WhatsApp) | Yes (but internal staff can install it) |

**Why WhatsApp stays for operatives:**
Operatives universally have WhatsApp. Asking them to install Telegram is too much friction.

**The split:**
- WhatsApp (`+447414157366`) = Operatives only (Sophie intake, offer replies, document alerts)
- Telegram = Site managers only (arrived, NCR, RAP — with proper inline buttons)

**What JJ should consider:**
- Would he prefer tapping buttons over typing commands?
- Is he OK installing Telegram?
- Which feels more natural when standing on a site in a hard hat?

His feedback after testing WhatsApp will drive the Telegram decision.

---

## Testing Schedule

| When | Task | Who |
|------|------|-----|
| Morning (3 Mar) | Check template approval in Twilio console | Oliver |
| Morning (3 Mar) | Invite JJ (auto or manual link) | Oliver |
| Morning (3 Mar) | JJ signs up via link | JJ |
| Morning (3 Mar) | Run all 6 bot tests (Tests 1–6 above) | JJ |
| Morning (3 Mar) | Verify BOS records created correctly | Oliver |
| Morning (3 Mar) | Report any issues to Oliver via WhatsApp | JJ → Oliver |
| This week | Telegram bot built | Oliver / Claude |
| End of week | JJ tests Telegram bot | JJ |
| End of week | Decision on WhatsApp vs Telegram for site managers | Oliver + JJ |

---

## Quick Reference

| Item | Value |
|------|-------|
| Aztec WhatsApp number to text | `+447414157366` |
| BOS URL | `https://aztec-landscapes-bos.vercel.app` |
| JJ's login email | `jacobstray7@gmail.com` |
| JJ's WhatsApp number (registered) | `+447359821793` |
| JJ's assigned site | Birmingham Business Quarter |
| Bot commands | `arrived` · `ncr` · `rap` · `help` · `cancel` |
| Invite template SID | `HX877e076c4ff88f0938c7eb9efbb91337` |

---

## Notes for Oliver — Next Session

1. **Check template approval** first thing — Twilio console → Content Template Builder
2. **After JJ tests**: debrief on what worked, what didn't, and his Telegram preference
3. **Next build queue (in order):**
   - Timesheet PDF export (`@react-pdf/renderer`, `/api/timesheets/[id]/pdf`)
   - Telegram bot for site managers (same state machine, inline buttons)
   - QA pass (BST timezone on crons, Sophie E2E, mobile responsiveness, 2FA)
4. **Presentation gaps still outstanding** (lower priority post-go-live):
   - Equipment certification gating (CPCS/NPORS/LANTRA)
   - Location-based offer matching (distance calc)
   - Gov.uk RTW verification API
