# RBAC Planning Brief — Aztec BOS
**Date:** 2026-03-01
**For:** Perplexity / Claude Desktop + Oliver review
**Status:** Planning phase — DO NOT implement until this document is signed off

---

## Why Now

The system currently has no role differentiation — every logged-in user sees everything including financials, bank details, and sensitive compliance data. As more users are added (site managers, auditors, potentially Donna's team) this becomes a problem. Retrofitting RBAC later means touching every page. Building it now while the codebase is structured is the right time.

**Principle:** Go slow, get it right. One wrong decision here touches every route in the system.

---

## Roles Required (as requested by Donna and Liam)

| Role | Who | Access Level |
|---|---|---|
| `admin` | Oliver / system owner | Everything — settings, all data, all operatives |
| `staff` | Donna, office team | Everything except system settings (can't add/remove users, change org config) |
| `site_manager` | Liam (field) + site managers | **Own sites only** — no bank details, no rates, no sensitive compliance data |
| `auditor` | ISO auditor, compliance reviewer | **Read-only** — documents, RTW status, expiry dates, compliance cron output |

---

## Access Matrix — What Each Role Can Do

### Operatives

| Action | admin | staff | site_manager | auditor |
|---|---|---|---|---|
| View operative list | ✅ all | ✅ all | ✅ assigned sites only | ✅ read-only |
| View operative profile | ✅ | ✅ | ✅ limited (no bank/rate) | ✅ compliance fields only |
| View bank details / UTR | ✅ | ✅ | ❌ | ❌ |
| View pay rates | ✅ | ✅ | ❌ | ❌ |
| Edit operative | ✅ | ✅ | ❌ | ❌ |
| Create operative | ✅ | ✅ | ❌ | ❌ |
| Verify/reject documents | ✅ | ✅ | ❌ | ❌ |
| Upload CV | ✅ | ✅ | ❌ | ❌ |

### Labour Requests + Allocations

| Action | admin | staff | site_manager | auditor |
|---|---|---|---|---|
| View requests | ✅ all | ✅ all | ✅ own sites only | ❌ |
| Create/edit requests | ✅ | ✅ | ❌ | ❌ |
| View allocations | ✅ all | ✅ all | ✅ own sites only | ❌ |
| Create allocations | ✅ | ✅ | ❌ | ❌ |

### Timesheets + Shifts

| Action | admin | staff | site_manager | auditor |
|---|---|---|---|---|
| View timesheets | ✅ all | ✅ all | ✅ own sites only | ❌ |
| Approve timesheets | ✅ | ✅ | ✅ own sites only | ❌ |
| View shifts | ✅ | ✅ | ✅ own sites | ❌ |

### Documents + Compliance

| Action | admin | staff | site_manager | auditor |
|---|---|---|---|---|
| View documents list | ✅ | ✅ | ❌ | ✅ read-only |
| View document detail + extracted data | ✅ | ✅ | ❌ | ✅ |
| Verify / reject | ✅ | ✅ | ❌ | ❌ |
| View compliance dashboard | ✅ | ✅ | ❌ | ✅ |

### Settings + Admin

| Action | admin | staff | site_manager | auditor |
|---|---|---|---|---|
| Settings page | ✅ | ❌ | ❌ | ❌ |
| Add/remove users | ✅ | ❌ | ❌ | ❌ |
| View adverts | ✅ | ✅ | ❌ | ❌ |
| Comms / WhatsApp log | ✅ | ✅ | ❌ | ❌ |
| RAP scoring | ✅ | ✅ | ✅ (view only) | ❌ |
| NCRs | ✅ | ✅ | ✅ (own sites) | ✅ (read-only) |

---

## Technical Approach — Options for Review

### Option A: Role column on `users` table + middleware checks

**How it works:**
- Add `role` column to `users` table: `admin | staff | site_manager | auditor`
- Add `assigned_site_ids UUID[]` column to `users` for site_manager scoping
- Next.js middleware reads role from session/JWT → redirects or restricts
- Server components check role before rendering sensitive sections
- Supabase RLS policies enforce at DB level (belt + braces)

**Pros:** Simple, single source of truth, easy to query
**Cons:** Array of site IDs is a bit loose — better would be a join table

### Option B: Separate `user_roles` and `user_sites` tables

**How it works:**
```sql
user_roles: user_id, role (enum), organization_id
user_sites: user_id, site_id  -- for site_manager scoping
```
- Cleaner normalisation
- Easier to give a user multiple roles in future
- More queries but more flexible

**Pros:** Proper relational design, future-proof
**Cons:** Slightly more complex to query on every request

### Option C: Supabase RLS only (no middleware)

**How it works:**
- All access control via Supabase Row Level Security policies
- No middleware layer — trust the DB

**Pros:** Enforced at DB level, can't be bypassed
**Cons:** Complex RLS policies, hard to debug, doesn't control UI rendering (you'd still show/hide elements based on something in the frontend)

---

## Recommended Approach (for Perplexity/Claude to validate)

**Likely best: Option A or B with RLS as a backup layer.**

- Store role in `users` table (Option A) for simplicity at this scale (single org, small team)
- Add a `user_sites` join table for site_manager scoping (cleaner than an array)
- Next.js middleware for route-level protection
- Server component role checks for section-level hiding (e.g. hide bank details card)
- Supabase RLS policies to enforce at DB level for the sensitive tables (operatives, operative_pay_rates, documents)

---

## Questions for Perplexity / Claude Desktop to Answer

1. **Session/JWT approach:** In Next.js 15 App Router with Supabase Auth, what's the cleanest way to store and access a user's role on every request without an extra DB query per page load? (Options: custom JWT claim, session metadata, separate API call on layout)

2. **Middleware pattern:** Show a working Next.js 15 middleware.ts that reads role from Supabase session and redirects `site_manager` away from `/settings`, `/adverts`, `/comms`, `/operatives/new`.

3. **RLS policies:** For the `operatives` table, write a Supabase RLS policy that:
   - Allows `admin` and `staff` to read all rows
   - Allows `site_manager` to read only operatives who have an active allocation on one of their assigned sites
   - Allows `auditor` to read all rows (read-only)

4. **Site scoping without N+1:** How do we efficiently scope all queries (requests, allocations, timesheets) to a site_manager's assigned sites without adding `.in('site_id', assignedSiteIds)` to every single query manually? Is there a clean pattern using RLS or a Postgres view?

5. **UI hiding vs route protection:** What's the right balance between hiding UI elements (e.g. bank details card) vs. API route protection? Should the API routes also check role, or is RLS sufficient?

6. **Migration safety:** This system is already live with real data. What's the safest migration strategy to add RBAC without locking out existing users? (Existing users should default to `staff` role on migration.)

---

## Proposed DB Migration (for review)

```sql
-- Add role to users
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'staff'
  CHECK (role IN ('admin', 'staff', 'site_manager', 'auditor'));

-- Site assignments for site managers
CREATE TABLE user_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, site_id)
);

CREATE INDEX idx_user_sites_user ON user_sites(user_id);
CREATE INDEX idx_user_sites_site ON user_sites(site_id);

-- Existing users get staff role (safe default — same as current access)
UPDATE users SET role = 'staff' WHERE role IS NULL;

-- Oliver (admin) to be updated manually after migration:
-- UPDATE users SET role = 'admin' WHERE email = 'oliver@coldlava.ai';
```

---

## What We Need Back from Research

1. Validated recommendation on Option A vs B (with reasoning)
2. Answer to all 5 technical questions above with working code examples
3. Any edge cases or gotchas specific to Next.js 15 App Router + Supabase Auth that we should know before starting
4. Estimated scope: how many files will need touching? (rough count)
5. Any security considerations we've missed

---

## Sign-off Required Before Building

- [ ] Oliver reviews access matrix — anything missing or wrong?
- [ ] Research questions answered by Perplexity/Claude Desktop
- [ ] Migration reviewed and approved
- [ ] Oliver confirms current user list and what role each should have
