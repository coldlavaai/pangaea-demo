# Plex Recommendations — Action Log

**Source:** `AZTEC_BOS_FULL_BRIEFING.md` + `WHATSAPP_ARCHITECTURE_REVIEW.md` (2026-02-26)
**Actioned by:** Claude Code (S26)
**Last updated:** 2026-02-26 S28

---

## Phase A: Critical Fixes

| # | Task | Status | Commit | Notes |
|---|------|--------|--------|-------|
| A1 | Fix `/apply/[token]` middleware — add to `isPublicRoute` | ✅ Done | `3fd8e30` | Also added `/api/apply` and `/r/` (short links) |
| A2 | Fix NCRs page server error | ✅ Done | `3fd8e30` | `<select onChange>` in Server Component → extracted to `SiteFilter` client component |
| A3 | Rotate Twilio auth token, remove from Git | ✅ Done | `3fd8e30` | Redacted from docs (S26). Token rotated in Twilio console by Plex (S27). Old token in Git history is now dead. |

---

## WhatsApp Robustness (from Architecture Review)

| # | Task | Status | Commit | Notes |
|---|------|--------|--------|-------|
| W1 | Self-hosted URL shortener — replace is.gd | ✅ Done | `834a31b` | `short_links` table + `/r/[code]` route + `shorten.ts`. Migration 00016 run ✅ |
| W2 | Twilio signature validation | ✅ Already active | `834a31b` | Was active in code, BUGS.md was stale — updated |
| W3 | Claude API 10s timeout + graceful fallback | ✅ Done | `834a31b` | try/catch wraps API call, preserves intake state on timeout |
| W4 | `send.ts` returns MessageSid + statusCallback | ✅ Done | `834a31b` | All REST API sends now attach statusCallback URL |
| W5 | Status callback endpoint | ✅ Done | `834a31b` | `/api/webhooks/twilio/status` — updates `messages.status` by `external_id` |
| W6 | Add `#rc=5&rp=all&rt=10000` to Twilio webhook URL | ✅ Done | — | Plex actioned in Twilio console (S27) |
| W7 | Enable Vercel Fluid Compute | ✅ Done | — | Plex actioned in Vercel dashboard (S27) |
| W8 | Rotate Twilio auth token | ✅ Done | — | Plex actioned in Twilio console (S27). New token live in Vercel env vars. |
| W9 | Claude API circuit breaker | ✅ Done | `f30dad8` | 3-failure threshold, 60s cooldown, graceful fallback reply |

---

## E2E Test — Sophie → Upload → BOS

| # | Test | Status | Notes |
|---|------|--------|-------|
| E1 | Sophie conversation flow (RTW → age → CSCS → trade → name) | ✅ Done S27 | Full intake working |
| E2 | Upload link received via WhatsApp (self-hosted `/r/` short link) | ✅ Done S27 | |
| E3 | Upload form — 3 sections (address + ID + CSCS) | ✅ Done S27 | |
| E4 | ID Vision verify — name matching with middle names | ✅ Fixed S27 `b5d9614` | OLIVER RUSSEL BRIGGS TATLER → Oliver Tatler ✅ |
| E5 | Documents upload to Supabase Storage | ✅ Done S28 | Oliver confirmed successful |
| E6 | Operative updated to `qualifying` in BOS | ✅ Done S28 | Token cleared, address saved |
| E7 | Post-upload WhatsApp to operative | ✅ Done S28 `f216da9` | Anonymised (no Liam name), 1–3 working days |
| E8 | Liam notification WhatsApp | ✅ Built | Sends operative name, docs, flags + direct BOS link |

**Sophie → Document Upload pipeline: FULLY WORKING ✅**

---

## Phase D: Sophie Intake Enrichment ✅ COMPLETE (S28–S29)

| # | Task | Status | Commit | Notes |
|---|------|--------|--------|-------|
| D1 | Add email address to Sophie intake | ✅ Done | `ed59ebc` | `awaiting_email` state after name |
| D2 | Add years of experience to intake | ✅ Done | `ed59ebc` | `awaiting_experience` state after trade |
| D3 | Skill level → quartile mapping | ✅ Done | `6e1b27f` | Experience years → Q1–Q4 |
| D4 | Auto-assign estimated day rate | ✅ Done | `6e1b27f` | `src/lib/pay-rates.ts` — Aztec rate card |
| D5 | Pay rate history table | ✅ Done | `6e1b27f` | `operative_pay_rates` table, migration 00017 |
| D6 | BOS rate confirmation UI | ✅ Done | `c9f399b` | Confirm/Adjust dialogs + history table |
| D7 | CSCS upload bug fix | ✅ Done | `d8455e5` | Early return before formData parse |
| D8 | Full ID field extraction + save | ✅ Done | `3be578e` | Doc number, nationality, ID expiry |
| D9 | WhatsApp summary after upload | ✅ Done | `3be578e` | Fires from CSCS route after both docs processed |
| D10 | Verify/reject FK join fix | ✅ Done | `0030570` | `documents_operative_id_fkey` |
| D11 | Extracted details on doc page | ✅ Done | `0030570` | AI-extracted section per doc type |

---

## Phase B: Presentation Alignment

| # | Task | Status | Notes |
|---|------|--------|-------|
| B1 | Site Manager WhatsApp channel | ❌ Not started | 2–3 sessions |
| B2 | Compliance cron — auto-block expired docs | ❌ Not started | 1 session |
| B3 | WTD enforcement in `canAllocate` | ❌ Not started | 1 session |
| B4 | Smart allocation ranking (RAP × distance × availability) | ❌ Not started | 1 session |
| B5 | Role-based access enforcement | ❌ Not started | 1 session |
| B6 | Audit trail (action logging table) | ❌ Not started | 1 session |

---

## Phase C: Completeness

| # | Task | Status | Notes |
|---|------|--------|-------|
| C1 | Timesheet PDF export | ❌ Not started | |
| C2 | Custom short domain (replace `vercel.app/r/`) | ⚠️ Partial | Self-hosted shortener built — just needs a real domain pointed at it |
| C3 | Google Maps API key (real, not placeholder) | ❌ Not started | |
| C4 | Public induction page `/induction/[id]` | ❌ Not started | |

---

## Presentation Errors (Factual — need fix in aztec-presentation repo)

| Issue | Status |
|-------|--------|
| "Supabase — UK data centre (London)" — actually Frankfurt | ❌ Not fixed |
| "OpenAI / GPT-4" — actually Anthropic `claude-sonnet-4-6` | ❌ Not fixed |

---

## Stale Docs

| Issue | Status |
|-------|--------|
| `SESSION_PLAN.md` — diverged from actual build after S17 | ❌ Low priority |
| `HANDOFF.md` + `JJ_HANDOFF.md` — superseded by `HANDOFF_PERPLEXITY.md` | ❌ Low priority |
