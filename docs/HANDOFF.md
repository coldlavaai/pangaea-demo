# AZTEC BOS — Session Handoff

**Date:** 2026-02-21 (Session 3)
**Last commit:** see `git log --oneline -3`

---

## Current State

- `aztec-bos` — **THE repo. Build here. S1–S14 complete, clean build, pushed.**
- Production URL: `https://aztec-5f7qgc7sy-olivers-projects-a3cbd2e0.vercel.app`
- Vercel project: `olivers-projects-a3cbd2e0/aztec-bos` (GitHub auto-deploy now connected)
- Supabase: `ybfhkcvrzbgzrayjskfp` (Frankfurt)

---

## Sessions Complete

| Session | Deliverable |
|---------|------------|
| S1 | Repo init, migrations 00001–00006, Supabase linked |
| S2 | Auth: Supabase clients, DB types, middleware, login page |
| S3 | Dashboard shell: sidebar, shared components, real dashboard |
| S4 | Operatives list: search, filters, pagination, URL state |
| S5 | Operative profile: 6 tabs (Overview, Docs, Allocs, RAP, NCRs, Comms) |
| S6 | Create + Edit operative forms (RHF+Zod, 30 fields, postcodes.io geocoding) |
| S7 | Sites: list, create, detail (3 tabs), edit, site managers |
| S8 | Document upload (Supabase Storage), detail, verify/reject/delete |
| S9 | Compliance dashboard (/documents) — expiry alerts by urgency |
| S10 | Labour requests: list, create, detail, edit, status actions |
| S11 | Labour pool search — Haversine ranking (RAP + distance + availability), one-click allocate |
| S12 | Allocations: list, detail, status state machine |
| S13 | WhatsApp offer flow — Twilio send, offer_sent_at/expires_at, SendOfferButton |
| S14 | Shifts list + Timesheets list/detail, approval workflow, CSV export |

---

## IMMEDIATE NEXT STEP: S15 — NCRs

### S15 — NCRs (Non-Conformance Reports)

**Files to create:**
- `src/app/(dashboard)/ncrs/page.tsx` — list with filters (type, site, operative)
- `src/app/(dashboard)/ncrs/new/page.tsx` — create form
- `src/app/(dashboard)/ncrs/[id]/page.tsx` — detail with auto-block logic display
- `src/components/ncrs/ncr-form.tsx` — shared RHF+Zod form

**Schema (from migration 00001):**
```sql
CREATE TABLE non_conformance_incidents (
  id, organization_id, operative_id, site_id, allocation_id,
  ncr_type (no_show|walk_off|late_arrival|quality_issue|safety_violation|misconduct|other),
  severity (minor|moderate|severe|critical),
  description TEXT, resolution TEXT,
  reported_by UUID REFERENCES users(id),
  incident_date DATE,
  auto_blocked BOOLEAN DEFAULT FALSE,  -- Set TRUE if 3+ NCRs trigger auto-block
  resolved_at TIMESTAMPTZ, resolved_by UUID,
  created_at, updated_at
)
```
- `ncr_type` enum: `no_show | walk_off | late_arrival | quality_issue | safety_violation | misconduct | other`
- `severity` enum: `minor | moderate | severe | critical`
- Auto-block: when operative gets 3+ NCRs, their status → 'blocked' (trigger in migration 00006)

**After S15: S16 — RAP DB migration + API endpoint**

---

## S16 — RAP Scoring (after S15)

- Migration: `00008_rap_scoring.sql` — `performance_reviews` table already exists in 00001
- API endpoint: `POST /api/operatives/[id]/rap` — creates review, triggers avg_rap_score update
- RAP form on operative profile (RAP tab currently shows placeholder)
- Fields: attitude (1-5), punctuality (1-5), quality (1-5), communication (1-5), notes, allocation_id

---

## Key Config

- Supabase project: `ybfhkcvrzbgzrayjskfp` (Frankfurt)
- Org ID: `00000000-0000-0000-0000-000000000001`
- Git must be: `Oliver Tatler / otatler@gmail.com` for Vercel auto-deploy
- Twilio WhatsApp: `+447414157366` (TWILIO_ACCOUNT_SID is still AC_PLACEHOLDER in .env.local — Oliver needs to fill in real credentials before S13 send-offer works live)
- Next.js: 15.5.12 (do NOT upgrade to 16)
- Production: `https://aztec-5f7qgc7sy-olivers-projects-a3cbd2e0.vercel.app`

## Schema Discoveries (confirmed from build)

- `allocation_status` enum: `pending | confirmed | active | completed | no_show | terminated`
- `request_status` enum: `pending | searching | partial | fulfilled | cancelled`
- `shift_status` enum: `scheduled | published | confirmed | in_progress | completed | cancelled | no_show`
- `timesheet_status` enum: `draft | submitted | approved | rejected | locked`
- `document_type` enum: 12 types (right_to_work, cscs_card, etc.)
- `ncr_type` enum: `no_show | walk_off | late_arrival | quality_issue | safety_violation | misconduct | other`
- `operative_status` enum: `prospect | qualifying | pending_docs | verified | available | working | unavailable | blocked`
- `reemploy_status` enum: `active | caution | do_not_rehire`
- `users` table requires `auth_user_id` → migration 00007 auto-creates on signup
- `createServiceClient()` is in `@/lib/supabase/server` (NOT a separate service.ts file)
- Supabase Storage bucket: `operative-documents` (private)
- Messages table uses `external_id` column (NOT `twilio_sid`)

## Testing Plan

- Oliver manual testing at Session 10
- Playwright infrastructure exists but auth blocked (GitHub OAuth only)
  - Fix: enable email auth in Supabase dashboard OR create test user manually
- Run: `npm run dev` then `npm test`

## Architecture Patterns (established, use consistently)

- Server Components for all pages — data fetched via `createClient()` server Supabase
- `Promise.all()` for parallel queries
- Client components for interactive bits — suffix with status in filename (`-actions.tsx`, `-form.tsx`, `-button.tsx`)
- Zod schemas: use `z.enum([...] as const)` not `z.ZodType<EnumType>` cast
- `z.boolean()` not `z.boolean().default()` with zodResolver (type conflict)
- Numeric form fields: `z.string().optional()` + manual parse in submit
- `PageHeader` props: `title`, `description`, `action?: React.ReactNode` (no `children`, no `backHref`)
- `StatsCard` props: `title` not `label`
- `EmptyState` props: `action?: React.ReactNode` (pass JSX, not `{ label, href }`)
- FK names for Supabase joins: `operatives!allocations_operative_id_fkey`, `sites!allocations_site_id_fkey` etc.
- `allocation_status.terminated` NOT `cancelled` — allocations use `terminated`

## File Structure

```
src/app/(dashboard)/
  operatives/          S4-S6
  sites/               S7
  documents/           S9 (compliance)
  requests/            S10-S11
  allocations/         S12-S13
  shifts/              S14
  timesheets/          S14
  ncrs/                S15 (next)

src/components/
  operatives/
  sites/
  documents/
  requests/
  allocations/
  timesheets/
  ncrs/               (create for S15)

src/app/api/
  allocations/[id]/send-offer/  S13
```
