# Aztec BOS — Director Briefing
**Date:** 5 March 2026
**Prepared by:** Cold Lava / Oliver Tatler

---

## 1. What's Live Right Now

Everything below is built, deployed, and running in production at `aztec-landscapes-bos.vercel.app`.

### Core Platform
| Module | What It Does |
|---|---|
| **Operatives** | Full profiles — trade, CSCS, RTW, RAP score, work history, documents, allocations |
| **Sites** | Site records, contacts, active/inactive status |
| **Labour Requests** | Duration-based requests with headcount, skills, rate |
| **Allocations** | Offer broadcast to top 3 operatives, 30-min window, first YES wins |
| **Shifts + Timesheets** | Shift logging, timesheet approval, PDF export |
| **NCRs** | Non-conformance reports — type, severity, site, operative, resolution |
| **Documents** | Upload, Vision AI verification, expiry tracking, verify/reject workflow |
| **Reports** | 5 sections (compliance, labour, NCR, RAP, timesheets) + CSV export |
| **Adverts** | Role adverts with AI-generated copy |
| **Audit Trail** | Every action logged — who, what, when |

### Compliance Engine
- Blocks allocations automatically if operative has: expired CSCS, no RTW, blocked status, or WTD violation
- Compliance cron runs daily — flags expired docs, expiring within 7/30 days, unverified RTW
- Working Time Directive enforcement — tracks 48hr weekly limit, rest periods

### Sophie AI (WhatsApp Recruitment)
- 24/7 candidate intake via WhatsApp
- 7-step qualification: RTW eligibility → age → CSCS → trade → experience → name → email
- Auto-creates operative record in BOS when complete
- Sends upload link for ID + CSCS documents — AI reads and verifies them
- CV upload with Claude AI parsing — extracts work history, skills, estimated day rate

### Notifications + Activity
- Real-time notification bell in the dashboard header
- Activity feed — 17 event types (arrivals, NCRs, RAP, offers, documents, emails, compliance)
- Email tab in activity feed — every outgoing email logged

### Settings
- Organisation profile, trades, user management (RBAC: admin / staff / site manager / auditor)
- Microsoft Outlook integration — delegated send, OAuth connected
- Email template editor — WYSIWYG with live preview, role-specific content

---

## 2. The Two Bots — What They Do

### @AztecSiteBot (for Site Managers — Telegram)
JJ and other site managers use this daily. Menu-driven, no typing required.

| Action | How It Works |
|---|---|
| **Log arrival** | Select operative from list → confirms on site, timestamps in BOS |
| **Log NCR** | Select type → severity → describe → saved to BOS instantly |
| **RAP report** | Rate operative 1–5 on Reliability, Attitude, Performance |
| **Request labour** | Submit a labour request directly from site |
| **Finish operative** | Mark end of allocation from site |

### @AlfNotificationsBot (for Admins — Telegram)
Liam and the admin team receive push notifications and can query the system.

| Command | What It Returns |
|---|---|
| **Unread** | All unread notifications |
| **Recent** | Last 10 platform events |
| **NCRs** | Open NCRs with operative name, severity, description, link |
| **Requests** | Open labour requests |
| **Status** | Live platform snapshot |
| **Mark read** | Clears notification queue |

---

## 3. What's Not Built Yet (Honest List)

These are in scope but not yet developed — prioritised for next phase.

| Feature | Notes |
|---|---|
| **Equipment cert gating** | Block allocation if operative's CPCS/NPORS/chainsaw cert is expired |
| **Location matching** | Operative home address vs site postcode — distance flag |
| **Gov.uk RTW API** | Live right-to-work verification against UKVI (requires API access) |
| **Two-factor authentication** | Supabase TOTP — ready to enable, not configured yet |
| **Rate matrices** | Automated day-rate governance per trade/grade |
| **Reallocation priority queue** | When offer expires, auto-try next operative in queue |
| **Multi-language Sophie** | Romanian / Polish / Bulgarian intake |
| **Public induction page** | `/induction/[token]` — site-specific induction checklist |
| **Donseed timesheet integration** | Awaiting API credentials from Liam |

---

## 4. Additions Beyond the Original Spec

Things we built that weren't in the original brief — added because they make the system significantly more useful.

| Addition | Why It Matters |
|---|---|
| **@AlfNotificationsBot** | Admins get push notifications to their phone in real-time — no need to be logged into BOS to know something happened |
| **Activity feed (17 event types)** | Helicopter view of everything — WhatsApp events, doc uploads, offers, compliance, emails — in one timeline |
| **WYSIWYG email template editor** | Liam/Donna can edit invite email copy directly, with live preview. No developer needed for copy changes |
| **Microsoft Outlook integration** | Invite emails come from a real Aztec address (not a generic provider), improving deliverability and professionalism |
| **CV upload + AI parsing** | Upload a CV → Claude extracts work history, trade, experience, estimated day rate automatically |
| **Short URL system** | Upload links sent via Sophie use our own domain (`aztec-landscapes-bos.vercel.app/r/xxxxx`) — not TinyURL |
| **Timesheet PDF export** | One-click PDF of any timesheet, ready to send to payroll |
| **Dashboard compliance panel** | Expired docs, expiring within 7/30 days, blocked operatives — live counts, clickable |

---

## 5. Why Telegram for Internal — WhatsApp for Operatives

**This is the most common question. Here's the full answer.**

### WhatsApp is for operatives — because that's where they already are
- Every operative in the UK construction sector has WhatsApp. No app download, no friction.
- Sophie runs 24/7 on WhatsApp — candidates message a number, get qualified, receive their upload link. Zero barrier.
- Offer messages, document expiry alerts, and arrival reminders all go to operatives via WhatsApp — the channel they check.

### Telegram is for internal (admins + site managers) — because WhatsApp can't do what we need
The WhatsApp Business API has hard technical limits that make it unsuitable for internal tooling:

| Constraint | WhatsApp Business API | Telegram |
|---|---|---|
| **Message templates** | Every outbound message must be a pre-approved template. Takes days to get approved, can be rejected. | No restrictions. Send anything, anytime. |
| **Session window** | Can only reply freely within 24hrs of the last inbound message. Outside that, template-only. | No session window. Message anytime. |
| **Interactive menus** | Very limited (list/button templates only, capped at 10 items, pre-approved) | Full custom keyboards, inline buttons, persistent docks — unlimited |
| **Bot functionality** | No callback queries, no state machines in the conversation layer | Full bot API — callbacks, inline keyboards, state, webhooks |
| **Cost** | ~£0.03–£0.08 per message | Free |
| **Speed to build** | Weeks (template approval + API setup) | Days |

### What this means in practice
- A site manager opening @AztecSiteBot gets a **menu of buttons** — Log Arrival, Log NCR, RAP Report. They tap, don't type. WhatsApp cannot do this.
- Liam opening @AlfNotificationsBot gets **real-time push DMs** the moment an operative arrives, an NCR is logged, or a document is uploaded. WhatsApp cannot push notifications like this without a pre-approved template for every event type.
- If we'd used WhatsApp for internal comms, every single notification type (arrival, NCR, offer accepted, doc uploaded) would require a separate template approval from Meta. That's months of friction and ongoing restrictions.

### The strategic picture
- **WhatsApp** = the operative's world. High adoption, zero friction, correct channel for external comms.
- **Telegram** = the admin's tool. Powerful, free, instant, programmable. The correct channel for internal workflow automation.
- The two work together: a site manager logs an arrival on Telegram → Liam gets a push notification on Telegram → the operative's WhatsApp gets an automated update if needed.

---

## 6. Current System Stats (Live)

To run through on the call — log in to the dashboard for live numbers:
- Total operatives in the system
- Active sites
- Open labour requests
- Compliance flags (expired docs, blocked ops)

Live: https://aztec-landscapes-bos.vercel.app

---

*Prepared by Cold Lava — AI automation & systems for construction*
