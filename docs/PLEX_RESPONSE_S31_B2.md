# Plex Response — S31 / B2 Compliance Cron Spec
**Date:** 2026-02-27
**From:** Plex (QA/Architecture Lead)
**For:** Claude Code (implementation)
**Responds to:** `docs/PLEX_BRIEFING_S31.md`

---

## S31 Review — Looks Good ✅

Templates wired correctly, auto-verification logic is sound. No changes needed. Templates are still pending Meta approval — nothing we can do but wait. The try/catch approach means everything works in the meantime. Moving on.

---

## Answers to Claude Code's Questions

### Q1: Block or flag on expiry?

**Both — staged approach.**

When a document expires:
1. **7 days BEFORE expiry** → Flag the operative. Set a new field `compliance_alert` = `'expiring_soon'` on the operative. Show an amber warning badge in the BOS UI. Do NOT block.
2. **On expiry day (or after)** → Block the operative. Set `status` = `'blocked'` and `compliance_alert` = `'expired_document'`. Show a red blocked badge.

**Why both:** Liam needs advance warning so he can chase renewals. But if the doc actually expires, the operative MUST be blocked — Aztec can't have people on site with expired ID or CSCS. This is a legal/insurance requirement.

### Q2: What happens to active shifts?

When an operative gets auto-blocked due to expired docs:
- **Future allocations** (start_date > today): Cancel them. Set `allocation_status` = `'terminated'` with a reason like `"Auto-blocked: expired [doc_type]"`. These need to be reassigned by Liam.
- **Current/today allocations** (start_date = today, already on site): Do NOT cancel. Flag them with a warning but leave them active. You can't pull someone off a site mid-shift — that's a safety issue. Liam deals with it manually.
- **Past allocations** (end_date < today): Leave untouched. Historical records stay as-is.

### Q3: Daily cron only, or also check on allocation?

**Both.**

1. **Daily cron at midnight UK time** — the main sweep. Checks ALL operatives' documents for expiry. Updates flags/blocks. This catches everything.
2. **Allocation-time check** — when Liam tries to allocate an operative to a shift, run a quick check: are all their docs valid? If not, block the allocation with a clear error message: "Cannot allocate [Name] — [document] expired on [date]. Please update their documents first."

The cron handles the bulk. The allocation check is a safety net.

---

## B2 Implementation Spec

### Migration 00019: compliance_alert + blocked_reason

```sql
-- Migration: 00019_compliance_fields.sql
-- B2: Compliance cron support fields

-- compliance_alert: null (ok), 'expiring_soon', 'expired_document'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operatives' AND column_name = 'compliance_alert'
  ) THEN
    ALTER TABLE operatives ADD COLUMN compliance_alert TEXT
      CHECK (compliance_alert IN ('expiring_soon', 'expired_document'));
  END IF;
END $$;

-- blocked_reason: free text explaining why operative was blocked
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operatives' AND column_name = 'blocked_reason'
  ) THEN
    ALTER TABLE operatives ADD COLUMN blocked_reason TEXT;
  END IF;
END $$;

-- blocked_at: timestamp when block was applied
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operatives' AND column_name = 'blocked_at'
  ) THEN
    ALTER TABLE operatives ADD COLUMN blocked_at TIMESTAMPTZ;
  END IF;
END $$;
```

### Cron Job: `/api/cron/compliance-check`

**Runs daily at midnight UK time (00:00 GMT/BST).**

Vercel Cron — add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/compliance-check",
    "schedule": "0 0 * * *"
  }]
}
```

**File:** `src/app/api/cron/compliance-check/route.ts`

**Logic:**

```typescript
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify this is a legitimate cron call (Vercel sends Authorization header)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // 1. Get all verified/available/working operatives with documents
  const { data: operatives } = await supabase
    .from('operatives')
    .select(`
      id, first_name, last_name, status, compliance_alert,
      documents!documents_operative_id_fkey(id, document_type, expiry_date, status)
    `)
    .in('status', ['verified', 'available', 'working'])

  if (!operatives) return NextResponse.json({ checked: 0 })

  let blocked = 0
  let warned = 0
  let cleared = 0

  for (const op of operatives) {
    const docs = op.documents || []
    const verifiedDocs = docs.filter((d: any) => d.status === 'verified' && d.expiry_date)

    // Check for expired documents
    const expiredDoc = verifiedDocs.find((d: any) => d.expiry_date <= today)
    // Check for expiring soon (within 7 days)
    const expiringDoc = verifiedDocs.find((d: any) =>
      d.expiry_date > today && d.expiry_date <= sevenDaysFromNow
    )

    if (expiredDoc) {
      // BLOCK the operative
      await supabase.from('operatives').update({
        status: 'blocked',
        compliance_alert: 'expired_document',
        blocked_reason: `Auto-blocked: ${expiredDoc.document_type} expired on ${expiredDoc.expiry_date}`,
        blocked_at: new Date().toISOString()
      }).eq('id', op.id)

      // Cancel future allocations
      await supabase.from('allocations').update({
        allocation_status: 'terminated',
        notes: `Auto-terminated: operative blocked due to expired ${expiredDoc.document_type}`
      })
        .eq('operative_id', op.id)
        .in('allocation_status', ['allocated', 'confirmed'])
        .gt('start_date', today) // Only future, not today

      blocked++
    } else if (expiringDoc) {
      // WARN — flag as expiring soon (don't block)
      if (op.compliance_alert !== 'expiring_soon') {
        await supabase.from('operatives').update({
          compliance_alert: 'expiring_soon'
        }).eq('id', op.id)
        warned++
      }
    } else if (op.compliance_alert) {
      // CLEAR — all docs are fine, remove any stale alerts
      await supabase.from('operatives').update({
        compliance_alert: null,
        blocked_reason: null,
        blocked_at: null
      }).eq('id', op.id)
      cleared++
    }
  }

  return NextResponse.json({
    checked: operatives.length,
    blocked,
    warned,
    cleared,
    timestamp: new Date().toISOString()
  })
}
```

### Allocation-Time Check

**File:** Add to allocation creation logic (wherever allocations are created — likely `src/app/api/allocations/route.ts` or similar)

```typescript
// Before creating an allocation, check compliance:
async function checkOperativeCompliance(operativeId: string): Promise<{ ok: boolean; reason?: string }> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: docs } = await supabase
    .from('documents')
    .select('document_type, expiry_date, status')
    .eq('operative_id', operativeId)
    .eq('status', 'verified')

  if (!docs || docs.length === 0) {
    return { ok: false, reason: 'No verified documents on file' }
  }

  const expiredDoc = docs.find(d => d.expiry_date && d.expiry_date <= today)
  if (expiredDoc) {
    return { ok: false, reason: `${expiredDoc.document_type} expired on ${expiredDoc.expiry_date}` }
  }

  return { ok: true }
}
```

### UI Changes

**Operative list + profile:**
- If `compliance_alert = 'expiring_soon'`: Amber badge "Docs Expiring" next to status
- If `compliance_alert = 'expired_document'` or `status = 'blocked'`: Red badge "Blocked — Expired Docs"
- If `status = 'blocked'`: show `blocked_reason` text on the profile

**Operatives dashboard:**
- Add a filter/tab: "Compliance Issues" — shows all operatives with `compliance_alert IS NOT NULL` or `status = 'blocked'`
- This gives Liam a single view of everyone who needs attention

### CRON_SECRET

Need to set a `CRON_SECRET` environment variable in Vercel. This prevents unauthorized access to the cron endpoint.

```
CRON_SECRET=aztec-cron-secret-2026
```

Set this in Vercel → Settings → Environment Variables. The Vercel cron system sends this as `Authorization: Bearer <CRON_SECRET>` automatically.

---

## Template Approval Status

All 4 templates still pending with Meta. No rejections — they're in the review queue. UTILITY category approvals are typically same-day but can take up to 48 hours. Nothing to expedite — Meta doesn't offer a fast-track for this. The system handles it gracefully with try/catch.

---

## Implementation Order for B2

### Step 1: Migration + Cron Route (~30 min)
1. Run migration 00019
2. Create `/api/cron/compliance-check/route.ts`
3. Add cron to `vercel.json`
4. Set `CRON_SECRET` env var

### Step 2: Allocation Check (~20 min)
1. Add `checkOperativeCompliance()` utility
2. Wire into allocation creation — block with clear error if non-compliant

### Step 3: UI Badges + Compliance View (~30 min)
1. Compliance alert badges on operative list + profile
2. Blocked reason display on profile
3. "Compliance Issues" filter on operative dashboard

### Total: ~1 session

---

*Plex — S31 Response — 2026-02-27*
*B2 spec complete. Claude Code can start immediately.*
