# AZTEC BOS — Canonical Session Plan

**Reconciled by:** Claude Code + TARS
**Date:** 2026-02-21
**Status:** Canonical — supersedes all previous session lists
**Source of truth for WHAT:** AZTEC_BOS_MASTER_PLAN.md (Section 26)
**Source of truth for ORDER:** This document

---

## Why This Document Exists

Three session lists existed across the planning repo with conflicting numbering:
- `AZTEC_BOS_MASTER_PLAN.md` Section 26 — 28 sessions, most granular, missing auth
- `HANDOFF_FOR_ASSISTANT.md` Section 10 — 20 sessions, auth included, less granular
- `SESSION_1_BRIEF_FOR_CLAUDE_CODE.md` — partial list, guided Session 1 build

**Key conflicts resolved:**
1. Auth/middleware/login was fully specced (Section 7) but not given a build session — now **S2**
2. Dashboard shell + shared components were in separate sessions — merged into **S3**
3. Master plan's granular operative split (list / profile / forms) preserved as **S4, S5, S6**
4. All master plan sessions S2–S28 shift by +1 as a result

---

## The 29 Sessions

| Session | Deliverable | Status |
|---------|------------|--------|
| **S1** | Repo init, all deps, DB migrations 00001–00006, Supabase linked (ybfhkcvrzbgzrayjskfp), vercel.json cron config, `operative-documents` Storage bucket (private), NEXT_PUBLIC_ORG_ID set | ✅ COMPLETE |
| **S2** | Auth: Supabase client helpers (server.ts + client.ts), DB TypeScript types generated, middleware.ts (session refresh + route guard), /auth/callback route, /login page (dark theme, RHF+Zod), (dashboard) route group layout with server-side auth check | ✅ COMPLETE |
| **S3** | Dashboard shell + shared components: app layout, sidebar navigation (all module links per Section 9), dark theme globals, StatsCard, PageHeader, DataTable, StatusBadge, EmptyState, ConfirmDialog, AlertsBell | ✅ COMPLETE |
| **S4** | Operatives list page — search, filters, pagination, URL state, AZT-XXXX reference display | ✅ COMPLETE |
| **S5** | Operative profile page — all 6 tabs: Overview, Documents, Allocations, RAP, NCRs, Comms | ✅ COMPLETE |
| **S6** | Create + Edit operative forms — full address, NI number, RTW type, lat/lng geocoding | ✅ COMPLETE |
| **S7** | Sites — list, create, detail, multiple site managers, project fields | ✅ COMPLETE |
| **S8** | Document upload modal, Supabase Storage integration, document list, WTD opt-out upload | ⏳ |
| **S9** | Compliance dashboard (/documents) — expiry alerts by RTW/CSCS/CPCS thresholds, filter by urgency | ⏳ |
| **S10** | Labour requests — list, create form, request detail with Reallocation First 4-step workflow | ⏳ |
| **S11** | Labour pool search — ranking algorithm (RAP × availability × distance, Google Maps geocoding), reallocation-first banner (GAP-053) | ⏳ |
| **S12** | Allocations — list, detail, status management, compliance gate check on create | ⏳ |
| **S13** | Allocation offer flow — WhatsApp send, offer_expires_at set, cascade mechanism wired up | ⏳ |
| **S14** | Shifts + Timesheets — detail, approval, CSV export | ⏳ |
| **S15** | NCRs — list, create form, auto-block confirmation, resolution fields | ⏳ |
| **S16** | RAP DB migration + validation + API endpoint (A = Attitude, confirmed) | ⏳ |
| **S17** | RAP web UI — form on allocation detail, history tab on operative profile, RAPBadge everywhere | ⏳ |
| **S18** | WhatsApp webhook handler — routing, waitUntil async, Twilio sig validation, MessageSid dedup, message logging, org-scoped service client | ⏳ |
| **S19** | Sophie intake flow — English, all states, duplicate phone handling, error fallback, session expiry | ⏳ |
| **S20** | Sophie multi-language — Romanian, Polish, Bulgarian (GAP-030) | ⏳ |
| **S21** | Site manager channel — full state machine (arrival, NCR, RAP, referrals, GAP-057), crew complete msg, NCR free-text parsing, optimistic concurrency on SM sessions | ⏳ |
| **S22** | Site manager RAP submission via WhatsApp — full RAP flow in SM channel | ⏳ |
| **S23** | Compliance cron — auto-block on expired docs, WTD enforcement, offer cascade, CPCS warnings (GAP-055) | ⏳ |
| **S24** | Comms log — conversation view + manual WhatsApp send (GAP-050) | ⏳ |
| **S25** | Settings — org settings, user management, trade categories, Liam's WhatsApp number, offer_window_minutes, offer_broadcast_count, reallocation_radius_miles | ⏳ |
| **S26** | Adverts — template builder, published advert tracking, metrics dashboard | ⏳ |
| **S27** | Timesheet PDF export (@react-pdf/renderer) + CSV export + reporting | ⏳ |
| **S28** | Public induction page (/induction/[id]) + induction-complete API endpoint + Whisper voice transcription | ⏳ |
| **S29** | QA pass — concurrent offer race conditions, BST timezone edge cases, multi-tab realtime, mobile polish, final bugs | ⏳ |

---

## Phase Map

| Phase | Sessions | Theme |
|-------|---------|-------|
| 0 | S1–S3 | Foundation (repo, DB, auth, UI shell) |
| 1 | S4–S6 | Operatives (list, profile, forms) |
| 2 | S7 | Sites |
| 3 | S8–S9 | Documents + compliance |
| 4 | S10–S11 | Labour requests + pool search |
| 5 | S12–S13 | Allocations + offer flow |
| 6 | S14 | Shifts + Timesheets |
| 7 | S15 | NCRs |
| 8 | S16–S17 | RAP scoring |
| 9 | S18–S20 | WhatsApp + Sophie AI |
| 10 | S21–S22 | Site manager channel |
| 11 | S23 | Compliance cron |
| 12 | S24–S25 | Comms log + Settings |
| 13 | S26 | Adverts |
| 14 | S27–S29 | Export + Whisper + QA |

---

## Key Architecture Decisions (Locked — Do Not Revisit)

- **Offer model:** Simultaneous broadcast (top 3, 30-min window, first YES wins via `accept_allocation_offer()` atomic PG function). Sequential cascade REJECTED.
- **RAP:** A = Attitude (not Attendance). Confirmed definitively.
- **Sophie intake order:** RTW → Age 18+ → CSCS → Details → Docs
- **Site managers:** WhatsApp only in v1. No web login.
- **Payroll:** Manual CSV export only. Xero = Phase 2.
- **2FA:** Deferred. Supabase TOTP available but not built in v1.
- **Supabase project:** `ybfhkcvrzbgzrayjskfp` (Frankfurt). The old ref `ylajlmhimwgekxzvdzwy` is dead — never use it.
- **Git config:** Must be `Oliver Tatler / otatler@gmail.com` for Vercel auto-deploy.
- **Liam's WhatsApp:** `+447742201349` is a placeholder (Oliver's mobile). Replace before go-live.
- **AZTEC Twilio number:** `+447414157366` (confirmed, existing WhatsApp Business number).
- **AZTEC org ID:** `00000000-0000-0000-0000-000000000001` (seeded in migration 00002).

---

*This file lives in `aztec-bos/docs/SESSION_PLAN.md` and is the single source of truth for build sequencing.*
*Update the Status column at the end of each session.*
