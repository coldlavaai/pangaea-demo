# RBAC Technical Research: Next.js 15 App Router + Supabase Auth
**System:** Aztec BOS — Live workforce management system (UK contractor)  
**Stack:** Next.js 15 (App Router), Supabase (Postgres + Auth), Vercel  
**Roles to implement:** `admin`, `staff`, `site_manager`, `auditor`  
**Date:** March 2026

---

## Table of Contents
1. [Question 1: Session/JWT Approach](#q1-sessionjwt-approach)
2. [Question 2: Middleware Pattern](#q2-middleware-pattern)
3. [Question 3: RLS Policies for Operatives](#q3-rls-policies)
4. [Question 4: Site Scoping Without N+1](#q4-site-scoping)
5. [Question 5: UI Hiding vs Route Protection](#q5-ui-hiding-vs-route-protection)
6. [Question 6: Migration Safety](#q6-migration-safety)
7. [Option A vs Option B Schema Decision](#option-a-vs-option-b)
8. [Edge Cases & Gotchas](#edge-cases--gotchas)
9. [Estimated Scope: Files to Touch](#estimated-scope)
10. [Security Considerations](#security-considerations)

---

## Q1: Session/JWT Approach

### Recommendation: Custom JWT Claim via Supabase Auth Hook

**The cleanest approach is to embed the role directly in the JWT using Supabase's Custom Access Token Hook.** This eliminates any extra DB query per request. The role is decoded from the JWT in middleware and server components — no round trips.

There are three options, ordered by preference:

| Option | Mechanism | DB query per request | Stale risk |
|--------|-----------|---------------------|------------|
| **A (recommended)** | Custom JWT claim via Auth Hook | None — role is in the JWT | On role change, stale until token refresh (~1hr) |
| B | `user_metadata` / `app_metadata` | None — in JWT by default | `user_metadata` is user-modifiable — **do not use for RLS** |
| C | Separate DB query in layout | 1 query per request | Always fresh |

**Option A is correct for Aztec BOS.** Roles are not changed frequently. The 1-hour JWT expiry is acceptable (and you can force a token refresh when an admin changes a role if needed).

---

### Step 1: Create the Custom Access Token Hook

This Postgres function runs every time a JWT is issued. It reads the role from your `users` table and injects it as a claim:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_rbac_jwt_hook.sql

-- Grant the auth admin access to users table (scoped read)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  -- Read role from your users table (not auth.users)
  SELECT role INTO user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    -- Default to 'staff' if no row found (safety net)
    claims := jsonb_set(claims, '{user_role}', '"staff"');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Permissions: only supabase_auth_admin can execute this
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
```

**Enable the hook** in Supabase Dashboard → Authentication → Hooks → Custom Access Token → select `public.custom_access_token_hook`.

For local dev, add to `supabase/config.toml`:
```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

---

### Step 2: Decode the JWT in Server Code

The hook modifies the JWT payload but **not** the auth response object. You must decode the `access_token` to read `user_role`. Use a shared helper:

```typescript
// lib/auth/get-user-role.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { jwtDecode } from 'jwt-decode' // npm install jwt-decode

type UserRole = 'admin' | 'staff' | 'site_manager' | 'auditor'

interface SupabaseJWT {
  sub: string
  email: string
  user_role?: UserRole
  exp: number
  iat: number
  // ...standard Supabase JWT fields
}

export async function getUserRole(): Promise<UserRole | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const jwt = jwtDecode<SupabaseJWT>(session.access_token)
  return jwt.user_role ?? 'staff'
}
```

> **Important:** Use `getSession()` only to read the JWT claims. Use `getUser()` (which makes a server round-trip to verify) for actual authentication checks. For role-reading purposes, decoding the JWT locally is fine because the JWT is signed by Supabase and its signature is verified by the cookie infrastructure.

### Step 3: Access Role in Server Components

```typescript
// app/dashboard/page.tsx (Server Component)
import { getUserRole } from '@/lib/auth/get-user-role'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const role = await getUserRole()
  if (!role) redirect('/login')

  return (
    <div>
      <h1>Dashboard</h1>
      {role === 'admin' && <AdminPanel />}
      {(role === 'admin' || role === 'staff') && <StaffTools />}
    </div>
  )
}
```

### Step 4: React cache() for Performance

Wrap `getUserRole` in React's `cache()` so multiple calls in one render tree only decode once:

```typescript
// lib/auth/get-user-role.ts  (updated)
import { cache } from 'react'

export const getUserRole = cache(async (): Promise<UserRole | null> => {
  // ... same implementation above
})
```

---

## Q2: Middleware Pattern

### Working `middleware.ts` for Next.js 15

This middleware:
1. Refreshes the Supabase session (required for cookie-based auth)
2. Redirects unauthenticated users to `/login`
3. Decodes the JWT to read `user_role` without a DB query
4. Redirects `site_manager` away from restricted routes

```typescript
// middleware.ts  (project root)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

type UserRole = 'admin' | 'staff' | 'site_manager' | 'auditor'

interface SupabaseJWT {
  sub: string
  user_role?: UserRole
  exp: number
}

// Routes that site_manager cannot access
const SITE_MANAGER_BLOCKED_PATHS = [
  '/settings',
  '/adverts',
  '/comms',
  '/operatives/new',
]

// Routes that require authentication
const PUBLIC_PATHS = ['/login', '/auth', '/forgot-password']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Must set on both request and response for Next.js 15 cookie handling
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT add any logic between createServerClient and getUser().
  // This can break session refresh in edge cases.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // 1. Unauthenticated: redirect to login for all non-public paths
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Authenticated: check role-based restrictions
  if (user) {
    // Get role from JWT without extra DB query
    let userRole: UserRole = 'staff'
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const decoded = jwtDecode<SupabaseJWT>(session.access_token)
        userRole = decoded.user_role ?? 'staff'
      }
    } catch {
      // If JWT decode fails, fall through with default 'staff' role
    }

    // 3. site_manager: block restricted routes
    if (userRole === 'site_manager') {
      const isBlocked = SITE_MANAGER_BLOCKED_PATHS.some(
        (blocked) =>
          pathname === blocked || pathname.startsWith(blocked + '/')
      )

      if (isBlocked) {
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = '/dashboard'
        dashboardUrl.searchParams.set('error', 'access_denied')
        return NextResponse.redirect(dashboardUrl)
      }
    }

    // 4. auditor: read-only enforcement (block mutation routes)
    if (userRole === 'auditor') {
      // Block any POST/PUT/PATCH/DELETE to sensitive paths
      const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
        request.method
      )
      const isProtectedMutation =
        isMutatingMethod &&
        (pathname.startsWith('/operatives') ||
          pathname.startsWith('/timesheets') ||
          pathname.startsWith('/allocations'))

      if (isProtectedMutation && !pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  // IMPORTANT: Always return supabaseResponse, not a new NextResponse.
  // This ensures session cookies are correctly forwarded.
  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
```

### Critical Notes on Next.js 15 Middleware

1. **Always return `supabaseResponse`** — never create a new `NextResponse.next()` after cookie operations, or you'll break session persistence.
2. **`getUser()` makes a network call to Supabase** (verifies the JWT server-side). This is the correct approach for auth checks. `getSession()` is only for reading claims from the already-validated cookie.
3. **`getSession()` in middleware** is safe for reading the role claim because the session cookie has already been validated by `getUser()` in the same request.
4. **CVE-2025-29927 awareness:** If self-hosting (not Vercel), strip `x-middleware-subrequest` at your reverse proxy layer. Vercel does this automatically. The middleware redirect-only pattern remains vulnerable unless you also check at the data layer (which is why RLS is essential).

---

## Q3: RLS Policies for Operatives

### Full Policy Set

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_rls_operatives.sql

-- Enable RLS
ALTER TABLE public.operatives ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from users table
-- Using (SELECT ...) pattern to prevent per-row re-evaluation (critical for performance)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- ============================================================
-- Policy 1: admin and staff can read ALL operatives
-- ============================================================
CREATE POLICY "admin_staff_read_all_operatives"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'staff')
);

-- ============================================================
-- Policy 2: auditor can read ALL operatives (read-only)
-- ============================================================
CREATE POLICY "auditor_read_all_operatives"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  (SELECT public.get_user_role()) = 'auditor'
);

-- ============================================================
-- Policy 3: site_manager reads operatives with active
--           allocation on one of their assigned sites
-- ============================================================
-- Performance note: site_id IN (subquery on user_sites) is
-- faster than EXISTS join back to operatives — avoids a join
-- on the source table per row. See Supabase RLS perf docs.
CREATE POLICY "site_manager_read_scoped_operatives"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  (SELECT public.get_user_role()) = 'site_manager'
  AND
  id IN (
    SELECT DISTINCT a.operative_id
    FROM public.allocations a
    WHERE
      a.status = 'active'
      AND a.site_id IN (
        SELECT us.site_id
        FROM public.user_sites us
        WHERE us.user_id = (SELECT auth.uid())
      )
  )
);

-- ============================================================
-- Write policies: only admin and staff can mutate operatives
-- ============================================================
CREATE POLICY "admin_staff_insert_operatives"
ON public.operatives
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT public.get_user_role()) IN ('admin', 'staff')
);

CREATE POLICY "admin_staff_update_operatives"
ON public.operatives
FOR UPDATE
TO authenticated
USING (
  (SELECT public.get_user_role()) IN ('admin', 'staff')
)
WITH CHECK (
  (SELECT public.get_user_role()) IN ('admin', 'staff')
);

CREATE POLICY "admin_only_delete_operatives"
ON public.operatives
FOR DELETE
TO authenticated
USING (
  (SELECT public.get_user_role()) = 'admin'
);
```

### Why `get_user_role()` as a Security Definer Function?

- **Avoids recursive RLS:** If the `users` table itself has RLS, a plain `SELECT FROM users` inside a policy would trigger `users` RLS policies recursively. A `SECURITY DEFINER` function bypasses RLS on the `users` table.
- **Performance:** The `(SELECT public.get_user_role())` pattern (with the outer SELECT) causes Postgres to evaluate the function once per query rather than once per row — critical for tables with many rows. This matches the Supabase RLS performance guide recommendation.
- **Alternative (JWT-based):** You can also read from `auth.jwt() ->> 'user_role'` directly if the JWT hook is set up. This avoids the DB lookup entirely but ties RLS to the JWT claim being present:

```sql
-- JWT-based alternative (faster, no DB lookup in policy)
CREATE POLICY "admin_staff_read_operatives_jwt"
ON public.operatives
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'user_role') IN ('admin', 'staff', 'auditor')
);
```

**Recommendation for Aztec BOS:** Use the JWT-based approach for the simple `IN ('admin', 'staff', 'auditor')` check, and the `user_sites` subquery approach for site_manager (site_manager's site list isn't in the JWT — it would be too large and change frequently).

### Indexes Required

```sql
-- Critical for site_manager policy performance
CREATE INDEX idx_allocations_operative_site_status 
  ON public.allocations(operative_id, site_id, status);

CREATE INDEX idx_user_sites_user_id 
  ON public.user_sites(user_id);

CREATE INDEX idx_user_sites_site_id 
  ON public.user_sites(site_id);

CREATE INDEX idx_allocations_site_id_status 
  ON public.allocations(site_id, status);
```

---

## Q4: Site Scoping Without N+1

### The Problem

A naive implementation passes `site_ids` from the application layer:
```typescript
// BAD: Fetches site IDs first, then passes to every query
const { data: siteIds } = await supabase.from('user_sites').select('site_id')
await supabase.from('allocations').select('*').in('site_id', siteIds)
await supabase.from('timesheets').select('*').in('site_id', siteIds)
await supabase.from('requests').select('*').in('site_id', siteIds)
```

This is 1 extra query on every page plus manual `.in()` on every table.

### Recommended Solution: RLS with Subquery Pattern

Define a single RLS policy on each scoped table that handles the site_manager filter at the database level. Application queries need no modification:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_rls_site_scoping.sql

-- ============================================================
-- Reusable helper: returns site IDs for the current user
-- This is called once per query (using subquery trick),
-- not once per row
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_site_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT site_id FROM public.user_sites WHERE user_id = auth.uid()
$$;

-- ============================================================
-- allocations: scoped by site for site_manager
-- ============================================================
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scoped_allocations_read"
ON public.allocations
FOR SELECT
TO authenticated
USING (
  CASE (SELECT auth.jwt() ->> 'user_role')
    WHEN 'admin'   THEN true
    WHEN 'staff'   THEN true
    WHEN 'auditor' THEN true
    WHEN 'site_manager' THEN
      site_id IN (SELECT public.get_my_site_ids())
    ELSE false
  END
);

-- ============================================================
-- timesheets: same pattern
-- ============================================================
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scoped_timesheets_read"
ON public.timesheets
FOR SELECT
TO authenticated
USING (
  CASE (SELECT auth.jwt() ->> 'user_role')
    WHEN 'admin'   THEN true
    WHEN 'staff'   THEN true
    WHEN 'auditor' THEN true
    WHEN 'site_manager' THEN
      site_id IN (SELECT public.get_my_site_ids())
    ELSE false
  END
);

-- ============================================================
-- requests: same pattern
-- ============================================================
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scoped_requests_read"
ON public.requests
FOR SELECT
TO authenticated
USING (
  CASE (SELECT auth.jwt() ->> 'user_role')
    WHEN 'admin'   THEN true
    WHEN 'staff'   THEN true
    WHEN 'auditor' THEN true
    WHEN 'site_manager' THEN
      site_id IN (SELECT public.get_my_site_ids())
    ELSE false
  END
);
```

Now **every query from every role works automatically**:

```typescript
// In a Server Component or Server Action
const supabase = await createClient()

// site_manager automatically only sees their sites — no .in() needed
// admin/staff/auditor see everything
const { data: allocations } = await supabase
  .from('allocations')
  .select('*, sites(name), operatives(name)')
```

### Alternative: Security-Invoker View (Postgres 15+)

For complex aggregation queries, a `security_invoker` view composes well:

```sql
-- A convenient view that joins related tables
-- security_invoker = true means it uses the CALLER's RLS, not the owner's
CREATE VIEW public.operative_summary
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.name,
  o.status,
  a.site_id,
  a.status AS allocation_status,
  s.name AS site_name,
  t.hours_worked
FROM public.operatives o
LEFT JOIN public.allocations a ON a.operative_id = o.id AND a.status = 'active'
LEFT JOIN public.sites s ON s.id = a.site_id
LEFT JOIN public.timesheets t ON t.operative_id = o.id;
```

Because `security_invoker = true`, querying this view enforces RLS on all underlying tables as the current user. **No additional policy needed on the view itself.**

> **Warning:** Views default to `security_definer` (owner's permissions, bypasses RLS). Always set `security_invoker = true` in Postgres 15+ for views that must respect RLS. This is a common gotcha — see Q5 below.

### Performance Considerations

- The `site_id IN (SELECT public.get_my_site_ids())` pattern is Postgres-plan-friendly. The subquery is evaluated once and used as a hash set.
- Ensure `user_sites(user_id)` has an index (see Q3 indexes above).
- For site_managers with many sites (> ~200), the `IN` approach scales well with a proper index. Beyond ~1000 sites, consider a JOIN approach instead.
- The `CASE` expression in the USING clause short-circuits: for admin/staff/auditor, Postgres evaluates `true` without touching `user_sites`.

---

## Q5: UI Hiding vs Route Protection

### The Correct Mental Model: Defense in Depth

UI hiding and route/API protection serve **different purposes** and both are required:

| Layer | Purpose | Can be bypassed? |
|-------|---------|-----------------|
| **UI hiding** (conditional render) | UX — don't show what users can't use | Yes — via DevTools, direct URL |
| **Middleware redirect** | UX + first line of defense | Yes — CVE-2025-29927 pattern; API calls bypass it |
| **API Route / Server Action check** | Authorization enforcement | No — runs server-side |
| **RLS** | Data enforcement regardless of path | No — enforced at DB level |

**Key principle: middleware redirects are UX, RLS is security.** As the WorkOS authentication guide notes, Server Actions can be called directly from client code, bypassing page-level middleware.

### What This Means for Aztec BOS

**Bank details card example:**

```typescript
// app/operatives/[id]/page.tsx — Server Component

import { getUserRole } from '@/lib/auth/get-user-role'
import { BankDetailsCard } from '@/components/BankDetailsCard'

export default async function OperativePage({ params }) {
  const role = await getUserRole()

  return (
    <div>
      <OperativeProfile />
      {/* UI hiding: don't render for site_manager or auditor */}
      {(role === 'admin' || role === 'staff') && (
        <BankDetailsCard operativeId={params.id} />
      )}
    </div>
  )
}
```

But you ALSO need the API route / Server Action to check:

```typescript
// app/api/operatives/[id]/bank-details/route.ts

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/get-user-role'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const role = await getUserRole()

  // Explicit role check — do not rely on middleware alone
  if (!role || !['admin', 'staff'].includes(role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operative_bank_details')
    .select('*')
    .eq('operative_id', params.id)
    .single()

  if (error) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(data)
}
```

### Is RLS Sufficient Without API Route Checks?

**For most data reads: yes, RLS provides a solid backstop.** If someone bypasses middleware and calls Supabase directly with the user's anon key, RLS still enforces the correct rows.

**But RLS alone is not sufficient for:**

1. **Column-level security** — RLS controls row access, not which columns are returned. If `bank_account_number` is in the `operatives` table and a site_manager's SELECT policy returns rows, they'll get all columns.  
   → Solution: Separate sensitive data into a dedicated table (`operative_sensitive_data`) with its own stricter RLS, or use column masking via a view.

2. **Business logic validation** — RLS can't enforce "site_manager cannot create a new operative with no site assignment." Server Action checks handle this.

3. **Rate limiting / audit logging** — These must be in API routes or Server Actions, not RLS.

4. **Server Actions bypass middleware** — A Server Action like `createOperative()` called from a Client Component goes directly to the server, not through middleware. Always check role inside the Server Action itself.

```typescript
// app/operatives/actions.ts
'use server'

import { getUserRole } from '@/lib/auth/get-user-role'
import { createClient } from '@/lib/supabase/server'

export async function createOperative(formData: FormData) {
  // Must check here — middleware does NOT protect Server Actions
  const role = await getUserRole()
  if (!role || !['admin', 'staff'].includes(role)) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()
  // ... insert logic
}
```

### Summary Rule for Aztec BOS

```
Sensitive data (bank details, salary, personal info):
  → Separate table + strict RLS + explicit API route check + UI hiding

Route access (settings, adverts, comms):
  → Middleware redirect (UX) + Server Component check (security)

Data mutations (create/update/delete):
  → Server Action check + RLS WITH CHECK constraint

Read-only data scoping (allocations, timesheets):
  → RLS is sufficient as the enforcement mechanism
```

---

## Q6: Migration Safety

### Recommended: Expand-Contract Migration in 3 Phases

This system is live with real users. The proposed migration (`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'staff'`) is **already safe on Postgres 11+** because:

- `ADD COLUMN` with a constant `DEFAULT` does not rewrite the table (Postgres 11+ stores the default in catalog metadata, returns it on read)
- The `ACCESS EXCLUSIVE` lock is held only for metadata update (~milliseconds), not for a full table scan
- The `CHECK` constraint validates new inserts but does not scan existing rows on add

However, the full RBAC rollout should be phased to avoid accidental lockouts.

---

### Phase 1: Schema Migration (Zero Downtime)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_rbac_schema.sql

-- ============================================================
-- 1. Add role column — instant on Postgres 11+ (no table rewrite)
-- ============================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff'
  CHECK (role IN ('admin', 'staff', 'site_manager', 'auditor'));

-- All existing users now have role = 'staff'. ✓

-- ============================================================
-- 2. Create user_sites join table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_sites (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  site_id         UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, site_id)
);

-- Required indexes
CREATE INDEX idx_user_sites_user_id ON public.user_sites(user_id);
CREATE INDEX idx_user_sites_site_id ON public.user_sites(site_id);

-- ============================================================
-- 3. Enable RLS on user_sites
-- ============================================================
ALTER TABLE public.user_sites ENABLE ROW LEVEL SECURITY;

-- Only admins can manage user_sites
CREATE POLICY "admin_manage_user_sites"
ON public.user_sites
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'user_role') = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'user_role') = 'admin'
);

-- Users can read their own site assignments
CREATE POLICY "users_read_own_sites"
ON public.user_sites
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 4. Create JWT hook (see Q1 above)
-- ============================================================
-- [include custom_access_token_hook SQL from Q1]

-- ============================================================
-- 5. Add indexes to allocations for site_manager RLS perf
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_allocations_operative_site_status 
  ON public.allocations(operative_id, site_id, status);
CREATE INDEX IF NOT EXISTS idx_allocations_site_id_status 
  ON public.allocations(site_id, status);
```

---

### Phase 2: Deploy Application Code (No RLS Yet)

**Do not enable RLS until the code is deployed.** RLS being active with no application code to handle role errors = broken UI.

Deployment checklist before enabling RLS:
- [ ] JWT hook enabled in Supabase Dashboard
- [ ] `lib/auth/get-user-role.ts` deployed
- [ ] Updated `middleware.ts` deployed
- [ ] Role-checking logic in Server Actions deployed
- [ ] Admin UI for assigning roles deployed
- [ ] Verify: existing users log in and have `role = 'staff'` in JWT claims

---

### Phase 3: Enable RLS (Gradual Rollout)

Enable RLS table by table, starting with the least critical:

```sql
-- STEP 1: Enable on user_sites first (already done in Phase 1)
-- STEP 2: Enable on a low-risk table first to test
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
-- Add policies...

-- STEP 3: Operatives (higher risk — test thoroughly)
ALTER TABLE public.operatives ENABLE ROW LEVEL SECURITY;
-- Add policies from Q3...

-- STEP 4: Financial/sensitive tables last
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
```

---

### Assign Initial Admin Roles

Before enabling RLS on admin-only features, manually assign the first admin:

```sql
-- Run via Supabase Dashboard SQL editor or a one-time migration
UPDATE public.users 
SET role = 'admin' 
WHERE id = '<your-admin-user-uuid>';
```

Then verify the JWT hook is working: sign out and sign back in, and confirm `user_role: "admin"` appears in the decoded JWT.

---

### Rollback Plan

```sql
-- If something breaks, RLS can be disabled instantly per table:
ALTER TABLE public.operatives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets DISABLE ROW LEVEL SECURITY;
-- etc.

-- The role column remains but is inert without policies.
-- Users are never locked out — disabling RLS = everyone sees everything,
-- same as the current state.
```

---

### Forcing Token Refresh After Role Change

When an admin changes a user's role, their JWT still has the old role for up to 1 hour. Options:

```typescript
// Option A: Admin-triggered force refresh (recommended)
// Call this after updating the role in your admin UI
export async function forceUserTokenRefresh(userId: string) {
  // This revokes all sessions for the user, forcing re-login
  const { error } = await supabaseAdmin.auth.admin.signOut(userId, 'others')
  // Or: update a nonce column on users to trigger JWT hook re-evaluation
}
```

For most workforce management scenarios, 1-hour stale role is acceptable. Add a user-facing note: "Role changes take effect on next login."

---

## Option A vs Option B

### The Schemas

**Option A (Recommended): Single `role` column on `users` + `user_sites` join table**

```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'staff'
  CHECK (role IN ('admin', 'staff', 'site_manager', 'auditor'));

CREATE TABLE user_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, site_id)
);
```

**Option B: Separate `user_roles` and `user_sites` tables**

```sql
CREATE TABLE user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'site_manager', 'auditor')),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)  -- or UNIQUE(user_id, organization_id) for multi-org
);
```

### Comparison

| Criteria | Option A | Option B |
|----------|----------|----------|
| **Simplicity** | ✅ One column, one join for all role logic | ❌ Two tables to join, more complex queries |
| **JWT Hook simplicity** | ✅ `SELECT role FROM users WHERE id = ?` | ⚠️ `SELECT role FROM user_roles WHERE user_id = ?` — similar but one more hop |
| **RLS policy complexity** | ✅ Simpler — role is directly on the joined user | ⚠️ Slightly more complex subquery |
| **Multi-role users** | ❌ One role per user | ✅ Multiple roles possible |
| **Multi-org support** | ⚠️ Needs `organization_id` on `users` row or separate org context | ✅ Clean per-org role assignment |
| **Audit trail** | ❌ No history of role changes | ✅ Can add `changed_at`, `changed_by` columns |
| **Migration risk** | ✅ Lower — adding column to existing table | ⚠️ Higher — creating new table, backfilling existing users |
| **Fit for Aztec BOS** | ✅ Single UK contractor, fixed roles | ⚠️ Over-engineered for current requirements |

### Decision for Aztec BOS: **Option A**

Aztec BOS is a single-contractor system with **4 fixed roles and no multi-role users**. Option B's flexibility is unnecessary complexity. Key reasons:

1. A user in a workforce management system has one operational role — a `site_manager` is not also `staff`. The domain model supports a single role per user.
2. Option A's `role` column allows direct use in RLS policies and JWT hooks without additional joins.
3. The `user_sites` join table (already in both options) handles the only real "multi-value" relationship: a site_manager's assigned sites.
4. If requirements change in future (multi-org, multiple simultaneous roles), migrating from a single column to a separate table is straightforward.

**Option B would be correct if:** the system needed multi-org support, role delegation, or time-bounded roles.

---

## Edge Cases & Gotchas

### 1. JWT Role Claim Staleness

**Problem:** When an admin changes a user's role, the user's existing JWT still has the old role. Supabase JWTs expire in 1 hour by default.

**Impact:** A newly-demoted site_manager retains admin-level JWT claims for up to 1 hour. RLS policies that read from `auth.jwt()` will still grant elevated access during this window.

**Mitigations:**
- Use `get_user_role()` (reads from DB) in RLS policies for high-security tables, not `auth.jwt() ->> 'user_role'`
- Call `supabase.auth.admin.signOut(userId, 'others')` after role changes to revoke sessions
- For very sensitive operations, always verify role from DB in the Server Action

---

### 2. Supabase Middleware Cookie Bug (Next.js 15)

**Problem:** The `@supabase/ssr` cookie handling pattern changed significantly. The old `auth-helpers` patterns break in Next.js 15 due to how cookies are managed.

**Fix:** Always use the pattern from Q2 where cookies are set on **both** `request` and `supabaseResponse`:
```typescript
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
  supabaseResponse = NextResponse.next({ request })
  cookiesToSet.forEach(({ name, value, options }) =>
    supabaseResponse.cookies.set(name, value, options)
  )
}
```

---

### 3. Postgres Views Bypass RLS by Default

**Problem:** If you create a Postgres view (e.g., `operative_summary`), it runs as the **view owner** (postgres superuser), bypassing all RLS policies.

**Fix:** Always add `WITH (security_invoker = true)` to views that should respect RLS:
```sql
CREATE VIEW public.operative_summary
WITH (security_invoker = true) AS
SELECT ...
```

This is a critical gotcha — Supabase doesn't warn you in the dashboard when a view is bypassing RLS.

---

### 4. Server Actions Are Not Protected by Middleware

**Problem:** Next.js Server Actions are HTTP endpoints that can be called directly. Middleware redirects do not intercept Server Action calls.

**Fix:** Always check role at the top of every Server Action that performs mutations:
```typescript
'use server'
const role = await getUserRole()
if (!['admin', 'staff'].includes(role ?? '')) {
  throw new Error('Unauthorized')
}
```

---

### 5. `getSession()` vs `getUser()` Security Distinction

**Problem:** Supabase's `getUser()` verifies the JWT with the auth server on every call. `getSession()` reads from cookies without server verification.

**Rules:**
- Use `getUser()` in middleware (and anywhere you need to verify a user is genuinely authenticated)
- Use `getSession()` only to read JWT claims (like `user_role`) after you've already confirmed auth
- **Never** use `getSession()` as the sole auth gate in an API route — it can be spoofed by a crafted cookie

---

### 6. `user_metadata` vs `app_metadata` for Role Claims

**Critical security issue:** Supabase `user_metadata` can be written by the **end user** themselves via `supabase.auth.updateUser()`. If you store `role` in `user_metadata` and use it in RLS, users can escalate their own privileges.

Use `app_metadata` (only writable by service role) or the Custom JWT Hook approach (which reads from your own `users` table that is RLS-protected). Never use `user_metadata` for role-based security decisions.

---

### 7. `FORCE ROW LEVEL SECURITY` for Table Owners

**Problem:** In Postgres, table owners bypass RLS by default. The `postgres` Supabase role is the table owner and will bypass all your RLS policies.

**Fix:** This is already handled correctly when using the Supabase client with the `anon` or `authenticated` role. However, if you ever test policies directly in SQL editor as the `postgres` role, they won't apply. Use this to test:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "your-user-uuid", "role": "authenticated", "user_role": "site_manager"}';
SELECT * FROM operatives;
ROLLBACK;
```

---

### 8. `user_sites` RLS Recursion Risk

If `user_sites` has RLS enabled, and your `operatives` RLS policy reads from `user_sites`, you'll get recursive RLS evaluation. This is why the `get_my_site_ids()` function uses `SECURITY DEFINER` — it bypasses the `user_sites` RLS when called from inside another policy.

---

### 9. Connection Pooling and `set_config()`

If using Supabase's Supavisor (transaction-mode pooling), **session variables set via `set_config()` do not persist across requests**. This is actually fine — each REST request gets a fresh transaction. But if you're building RPC functions that rely on session config, test them with the pooler, not a direct connection.

---

### 10. `auditor` Role Write Attempts

RLS `WITH CHECK` policies silently reject writes (they return a "permission denied" or 0 rows affected without an explicit error in some cases). Ensure your UI checks role before attempting writes to provide a clear UX, and that your Server Actions return meaningful errors for auditor write attempts.

---

## Estimated Scope

### Files to Create (New)

| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDD_add_rbac_schema.sql` | Schema: role column, user_sites table, indexes |
| `supabase/migrations/YYYYMMDD_rbac_jwt_hook.sql` | JWT hook function + grants |
| `supabase/migrations/YYYYMMDD_rls_policies.sql` | All RLS policies |
| `lib/auth/get-user-role.ts` | Server-side role helper (React cached) |
| `lib/auth/types.ts` | `UserRole` type definition |
| `components/role-gate.tsx` | Client component for conditional rendering |
| `app/unauthorized/page.tsx` | 403 page |

### Files to Modify (Existing)

| File | Change |
|------|--------|
| `middleware.ts` | Add role-based redirect logic |
| `lib/supabase/server.ts` | No change (already correct with @supabase/ssr) |
| `lib/supabase/client.ts` | No change |
| `app/layout.tsx` or root layout | Pass role to client context if needed |
| `app/settings/page.tsx` | Add server-side role check + redirect |
| `app/adverts/page.tsx` | Add server-side role check |
| `app/comms/page.tsx` | Add server-side role check |
| `app/operatives/new/page.tsx` | Add server-side role check |
| Any page showing bank details | Conditional render by role |
| Any Server Action doing mutations | Add role check at top |
| `app/admin/users/page.tsx` (if exists) | Add role management UI |

**Total estimate: ~20–35 files touched**, depending on how many pages have sensitive data. Most changes are additive (adding a role check at the top of a Server Component or Server Action).

---

## Security Considerations

### Missed / Underconsidered Areas

#### 1. Column-Level Security for Bank Details

The proposed schema doesn't address **which columns** are accessible, only which rows. If operative bank details are columns on the `operatives` table (e.g., `bank_sort_code`, `bank_account_number`), a site_manager who has read access to an operative row (via the allocation policy) will also see those columns.

**Fix:** Move financial data to a separate table:
```sql
CREATE TABLE public.operative_financial_details (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operative_id UUID NOT NULL REFERENCES public.operatives(id),
  sort_code    TEXT,
  account_number TEXT,
  -- ...
);

ALTER TABLE public.operative_financial_details ENABLE ROW LEVEL SECURITY;

-- Only admin and staff can read financial data
CREATE POLICY "admin_staff_read_financial"
ON public.operative_financial_details
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'user_role') IN ('admin', 'staff')
);
```

#### 2. Audit Logging

There's no audit trail for who changed what. For a live workforce management system in a regulated contractor context, this is a compliance risk.

**Recommendation:** Add a `audit_log` table and a trigger:
```sql
CREATE TABLE public.audit_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation  TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  user_id    UUID REFERENCES auth.users(id),
  user_role  TEXT,
  row_id     UUID,
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name, operation, user_id, user_role, row_id, old_data, new_data
  )
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    auth.jwt() ->> 'user_role',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. IDOR (Insecure Direct Object Reference) Protection

Even with RLS, if `site_manager` queries `/api/operatives/{id}` with an ID they shouldn't have access to, the API should return 404 (not 403). Returning 403 leaks the existence of the resource. RLS handles this correctly (returns 0 rows = 404 behavior), but explicit API routes should also return 404 for unauthorized resources.

#### 4. Service Role Key Exposure

**Never** use the Supabase `service_role` key in client-side code or in environment variables accessible to the browser. The service role bypasses all RLS. In Next.js 15, use `SUPABASE_SERVICE_ROLE_KEY` (without `NEXT_PUBLIC_`) and only access it in Server Components, Server Actions, or Route Handlers.

#### 5. Middleware CVE-2025-29927 (Header Bypass)

A known vulnerability allows bypassing Next.js middleware by sending an `x-middleware-subrequest` header. If Aztec BOS is on Vercel, this is mitigated automatically. If self-hosting (unlikely given the spec), add this to your reverse proxy config.

#### 6. `auditor` Should Never See Draft/Sensitive System Data

The `auditor` policy reads all rows — consider whether there are `status = 'draft'` or `is_deleted = true` soft-deleted rows that auditors should also not see. Add additional conditions to the auditor read policy if needed.

#### 7. Rate Limiting on Admin Role-Change Endpoint

Admin operations (changing user roles) should be rate-limited to prevent abuse if an admin account is compromised. Consider adding request rate limiting on the role management API routes.

#### 8. JWT Token Expiry Configuration

Default Supabase JWT expiry is 3600 seconds (1 hour). For a workforce management system with role changes, consider reducing to 15–30 minutes, or implementing server-side session revocation (signOut on role change). This trades freshness for performance.

---

## References

- [Supabase Custom Claims & RBAC Documentation](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Creating Supabase Client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Migrating from Auth Helpers to @supabase/ssr](https://github.com/orgs/supabase/discussions/27849)
- [Next.js Middleware Authorization Bypass CVE-2025-29927](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [WorkOS: Building Authentication in Next.js App Router 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026)
- [PostgreSQL: Adding Columns Without Locking](https://oneuptime.com/blog/post/2026-01-21-postgresql-add-columns-no-lock/view)
- [Postgres Views: Hidden Security Gotcha in Supabase](https://dev.to/datadeer/postgres-views-the-hidden-security-gotcha-in-supabase-ckd)
- [Cybertec: View Permissions and RLS in PostgreSQL](https://www.cybertec-postgresql.com/en/view-permissions-and-row-level-security-in-postgresql/)
- [Next.js Server Action Security - Arcjet](https://blog.arcjet.com/next-js-server-action-security/)
