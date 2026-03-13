# Changelog — Aztec BOS

---

### 2026-02-25 — Docs structure + CLAUDE.md update

- **Files modified:** `CLAUDE.md`, `docs/PROJECT_STATE.md`, `docs/TODO.md`, `docs/BUGS.md`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`
- **What changed:** Set up full documentation structure. Replaced minimal context-management CLAUDE.md with comprehensive project-specific version including docs maintenance rules and workflow commands.
- **Status:** ✅ Complete

---

### 2026-02-25 — Sophie bug fixes + upload form redesign (S25, commit 47deaac + 586d629)

- **Files modified:** `src/lib/whatsapp/sophie-handler.ts`, `src/app/apply/[token]/page.tsx`, `src/app/apply/[token]/upload-form.tsx`, `src/app/api/apply/[token]/upload/route.ts`
- **What changed:**
  - Fixed `hasCSCS` reading wrong field (`intake_data.cscs_card` → `cscs_card_type`)
  - Added TinyURL shortener for upload links
  - Upload form redesigned: BOS dark styling, numbered sections (1=Address, 2=ID, 3=CSCS)
  - Address fields added to form and saved to operative on upload
- **Status:** ✅ Complete

### 2026-02-25 — Sophie conversation reliability fixes (S25, commit e9e4f85 + 99eba1c)

- **Files modified:** `src/lib/whatsapp/sophie-handler.ts`
- **What changed:**
  - Removed `[user:context, assistant:Understood]` priming pair — state context now in system prompt
  - Added dedup check: if last history item matches current message, don't append again
  - Leading assistant messages stripped from history array
- **Why:** Two consecutive user messages or assistant messages broke Claude's alternating role requirement, causing non-JSON fallback responses.
- **Status:** ✅ Complete

### 2026-02-24 — Vision verify + document upload API (S24)

- **Files modified:** `src/app/api/apply/[token]/upload/route.ts` (new)
- **What changed:** Vision-based document verification using Claude claude-sonnet-4-6. Extracts name/DOB/expiry from passport/licence. Extracts card colour/number/expiry from CSCS. Cross-references with intake data. Uploads to Supabase Storage. Notifies Liam via WhatsApp.
- **Status:** ✅ Complete

### 2026-02-24 — Sophie WhatsApp intake + upload page (S23/S24)

- **Files modified:** `src/lib/whatsapp/sophie-handler.ts`, `src/lib/whatsapp/handler.ts`, `src/app/apply/[token]/page.tsx`, `src/app/apply/[token]/upload-form.tsx`
- **What changed:** Full 7-step Sophie intake flow. Auto-creates operative on name collection. Generates secure upload token. Upload page with BOS styling.
- **Status:** ✅ Complete (with bugs fixed S25)

### 2026-02-24 — Comms log (S21)

- **Files modified:** `src/app/(dashboard)/comms/page.tsx`, `src/app/(dashboard)/comms/[id]/page.tsx`
- **What changed:** WhatsApp conversation log. Thread list with last message + unread count. Thread detail with full message history. Intake state badge.
- **Status:** ✅ Complete

### 2026-02-24 — Settings enterprise upgrade (S20b)

- **Files modified:** `src/app/(dashboard)/settings/page.tsx` + components
- **What changed:** Optimistic updates, Sonner toasts, client-side tabs.
- **Status:** ✅ Complete

### 2026-02-24 — S18–S20: Gender, adverts, settings

- **What changed:** Gender field + machine operator flag + onboarding checklist (S18). Adverts page (S19). Settings page with org/trade categories/users (S20).
- **Status:** ✅ Complete

### Prior sessions — S1–S17

See `docs/sessions/` for full session notes (S1–S23).
