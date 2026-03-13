# Task Queue — Aztec BOS
**Last updated:** 2026-03-05 (Session S49 — post-analysis reorder)

---

## 🔴 IMMEDIATE — Do before anything else

### A. Run email_templates SQL migration
Oliver needs to run this in Supabase SQL editor or the email template editor will fail silently:
```sql
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  template_key text not null,
  subject text not null,
  body_html text not null,
  updated_at timestamptz not null default now(),
  constraint email_templates_org_key unique (organization_id, template_key)
);
alter table email_templates enable row level security;
create policy "service role all" on email_templates using (true) with check (true);
```

### B. Fix admin display names
Settings → Users → click each name and fix:
- `liam.butt@aztec-landscapes.co.uk` → Liam Butt
- `donna@thefoundersfriend.co.uk` → Donna (last name?)
- `jacob@coldlava.ai` → Jacob (Cold Lava)

---

## 🔴 Priority 1 — Short domain (replace TinyURL)

**Why:** Sophie sends operative upload links as `tinyurl.com/...` — looks unprofessional, could be blocked by spam filters, breaks if TinyURL goes down.

**What to build:**
- Route: `src/app/r/[code]/route.ts` — looks up `short_links` table, redirects to full URL
- Helper: `src/lib/short-link.ts` — `createShortLink(url)` → inserts row, returns `https://aztec-landscapes-bos.vercel.app/r/XXXXXX`
- Update Sophie handler (`src/lib/whatsapp/sophie-handler.ts`) — replace `tinyurl` call with `createShortLink()`
- `short_links` table already exists in DB (check if populated or empty)

**Key file:** `src/lib/whatsapp/sophie-handler.ts` — search for `tinyurl` to find the exact line

---

## 🔴 Priority 2 — Dashboard live stats

**Why:** Dashboard currently shows basic content. Liam and Donna need a helicopter view the moment they log in — live numbers that tell them what needs attention.

**What to build:**
Stats cards row:
- Active operatives on site today (allocations with status=active, date=today)
- Open labour requests (status=open/pending)
- Pending offers (status=pending, not expired)
- Documents awaiting review (unverified, non-rejected)
- Open NCRs (resolved=false)
- Missing timesheets (shifts with no timesheet, past end date)

Quick-action list (below stats):
- Recent arrivals today (last 5 allocations confirmed today)
- Pending offers about to expire (within 30 min)
- Compliance blocks (operatives with status=blocked)

**Implementation:** Server component queries run in parallel, pass to client card components. Add realtime subscription for arrivals.

---

## 🟡 Priority 3 — JJ re-invite

Now unblocked (email works, Outlook connected, invite template ready with Telegram instructions).

- Settings → Users → Invite User
- Role: Site Manager
- Assign to relevant sites
- JJ receives invite email → sets password → messages @AztecSiteBot
- Verify: JJ logs arrival → notification appears in @AlfNotificationsBot

---

## 🟡 Priority 4 — Notification E2E testing

Run through each flow manually and verify the full chain works:

- [ ] Oliver: WhatsApp → Sophie intake → operative created → `application_complete` push notification appears in @AlfNotificationsBot
- [ ] Oliver: Upload doc via apply link → `document_uploaded` appears in Activity feed bell
- [ ] JJ: Arrive on site via @AztecSiteBot → notification bell + @AlfNotificationsBot DM
- [ ] Verify `receive_notifications` toggle only pushes to users with it enabled
- [ ] Verify email log appears in Activity feed → Email tab

---

## 🟡 Priority 5 — Offer expiry notification (gap fix)

**The gap:** `src/app/api/v1/cron/offer-expiry/route.ts` expires offers but creates NO notification. Admin never knows an offer timed out.

**Fix:** After expiring an offer, call `createNotification()` with:
```
type: 'offer_expired'
title: `Offer expired — ${operative.first_name} ${operative.last_name}`
body: `No response within 30 minutes for ${requestTitle}`
severity: 'warning'
push: true
```
Also add `offer_expired` to ActivityFeed type metadata (icon + colour).

---

## 🟡 Priority 6 — Mobile QA pass

JJ is on mobile 100% of the time. Before go-live, check:
- [ ] Settings page on small screen
- [ ] Operative profile tabs on mobile
- [ ] Activity feed / notification bell
- [ ] Timesheets list
- [ ] The apply/upload page (already somewhat mobile-optimised but verify)

---

## 🟡 Priority 7 — @AztecSiteBot cleanup

- [ ] Remove 🔄 Reset button from MAIN_MENU keyboard (once JJ re-tests all flows cleanly)
- [ ] Test "Different date" arrive flow (date confirmation added S45, not yet verified by JJ)

---

## 🟢 Priority 8 — Sophie E2E full test

1. Delete a test operative from DB
2. WhatsApp message Sophie from a clean number
3. Go through full intake (RTW → age → CSCS → trade → experience → name → email)
4. Click upload link, upload ID + CSCS
5. Verify in BOS: operative created, docs visible, notifications fired
6. Confirm email received (if email connected)

---

## 🟢 Priority 9 — Presentation gaps (pre-demo)

| Feature | Notes |
|---|---|
| Equipment cert gating | Block allocation if operative has expired equipment cert |
| Location matching | Operative address vs site postcode — show distance/flag |
| Gov.uk RTW API | Real-time right-to-work check against UKVI |
| 2FA (Supabase TOTP) | For admin accounts |

---

## 🟢 Priority 10 — Backlog

- [ ] Liam's real WhatsApp number — update `LIAM_WHATSAPP_NUMBER` env var on Vercel
- [ ] Sophie multi-language (RO/PL/BG) — language detection + translated prompts
- [ ] Public induction page (`/induction/[token]`)
- [ ] Donseed timesheet integration — waiting on Liam for API credentials

---

## ✅ Completed

- [x] **S49** — WYSIWYG email template editor (TipTap, live split-pane preview, alignment/colour/underline toolbar)
- [x] **S49** — Expanded @AlfNotificationsBot: persistent keyboard, NCR with operative name, URL buttons
- [x] **S49** — Microsoft OAuth delegated email (Outlook connect, token auto-refresh)
- [x] **S49** — Activity feed "Email" tab — all sent emails logged and visible
- [x] **S49** — Invite email: role-specific Telegram setup guide with download links, bot deep links, step-by-step verification
- [x] **S48** — Activity feed expansion (WhatsApp, docs, offers events — 17 total types)
- [x] **S48** — @AlfNotificationsBot — new admin notification bot (full build)
- [x] **S48** — User edit drawer — click user → edit name/phone/Telegram ID
- [x] **S48** — deleteUser — nullifies all 16 FK references + deletes Supabase Auth
- [x] **S48** — createNotification() pushes via @AlfNotificationsBot DM
- [x] **S48** — Settings: Telegram linked indicator per user
- [x] **S45** — Timesheet PDF export
- [x] **S45** — Quick-assign + terminate allocation on operative detail page
- [x] **S45** — Telegram bot: date confirmation, large roster search, NCR type+severity
- [x] **S42** — RBAC Phase 1+2+3, audit log, reports overhaul, WTD enforcement
- [x] **S39** — Reports module (5 sections + CSV export)
- [x] **S37** — CV upload + Claude parsing + pool search with work history matching
- [x] **S38/39** — WhatsApp alerts to operatives + Liam via Twilio templates
