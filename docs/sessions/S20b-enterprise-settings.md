# Session S20b — Settings Enterprise Upgrade

**Date:** 2026-02-24
**Commit:** `3bba139`

---

## Why

Oliver explicitly requested "enterprise level" settings — "everything needs to be currently linked, it needs to update automatically immediately without being refreshed." The original settings page used `router.refresh()` after every mutation, which caused jarring full-page re-renders.

---

## What Changed

### Problem with original implementation
- Every role change → `router.refresh()` → full server re-render → jarring
- Every toggle → `router.refresh()` → same
- Switching tabs = URL navigation (`?tab=org`) → page load
- Errors were silent (no user feedback)
- The "Saved" checkmark in OrgSettingsForm was inline (easy to miss)

### Solution

**1. Sonner toasts wired up** (`src/app/layout.tsx`)
- `<Toaster theme="dark" richColors position="bottom-right" />`
- `sonner` was already installed but never connected to the layout

**2. New `SettingsTabs` client component** (`src/components/settings/settings-tabs.tsx`)
- Replaced URL-param tab navigation with client-side `useState`
- Tabs switch instantly — no navigation, no page load
- All 3 panels rendered at all times, hidden via CSS `hidden` class
- **Key decision: CSS `hidden` not conditional rendering** — panels stay mounted, local state preserved when switching tabs (if you add a trade, switch to Users, come back — your new trade is still there)
- Count badges on Trade Categories and Users tabs (updates as data changes locally)

**3. `UsersPanel` rewritten** (`src/components/settings/users-panel.tsx`)
- `useState(initialUsers)` — local copy of data
- `updateRole` — optimistic update (setState immediately) → Supabase call → toast success/error → rollback on error
- `toggleActive` — same pattern
- Zero `router.refresh()` calls
- Removed `useRouter` import entirely

**4. `TradeCategoriesPanel` rewritten** (`src/components/settings/trade-categories-panel.tsx`)
- `useState(initialCategories)` — local copy
- `handleAdd` — uses `.select().single()` after insert to get the new record's ID → appends to local state
- `toggleActive` — optimistic toggle → save → toast → rollback on error
- `seedAztecTrades` — inserts missing trades → uses `.select()` to get all inserted records → appends to local state
- `EditRow` callback changed: `onDone(updatedCat: TradeCategory)` instead of `onDone()` — parent updates its local state without a DB refetch
- Zero `router.refresh()` calls

**5. `OrgSettingsForm` simplified** (`src/components/settings/org-settings-form.tsx`)
- Removed `router.refresh()` (form already reflects typed values)
- Removed inline "Saved" checkmark state (`saved`, `setSaved`)
- Replaced with `toast.success('Settings saved')` and `toast.error(err.message)`
- Removed `useRouter` import

### Result

| Action | Before | After |
|---|---|---|
| Tab switch | URL navigation (page reload) | Instant, no reload |
| Role change | `router.refresh()` + re-render | Optimistic → toast |
| Toggle active | `router.refresh()` + re-render | Optimistic → toast |
| Add trade | Full page refetch | Local append → toast |
| Seed trades | Full page refetch | Local append → toast |
| Edit trade | `router.refresh()` | Callback updates parent state → toast |
| Org save | Inline checkmark + refresh | Toast only |
| Errors | Silent | `toast.error(...)` |

**Files changed:**
- `src/app/layout.tsx` — added `<Toaster />`
- `src/app/(dashboard)/settings/page.tsx` — removed searchParams, renders `<SettingsTabs />`
- `src/components/settings/settings-tabs.tsx` (NEW)
- `src/components/settings/org-settings-form.tsx`
- `src/components/settings/users-panel.tsx`
- `src/components/settings/trade-categories-panel.tsx`

**Type error hit:**
- `org?.settings` is `Json | null` — not directly assignable to `Org.settings: Record<string, unknown>`
- Fix in page.tsx: `settings: (org?.settings ?? {}) as Record<string, unknown>`
