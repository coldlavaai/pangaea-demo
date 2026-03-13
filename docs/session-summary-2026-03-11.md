# Session Summary — 2026-03-11 (Code Review & Hardening)

## What We Set Out To Do
Full system code review covering architecture, security, database, code quality, scalability, and technical debt — then fix everything found, expand RAP scoring, and prepare for Donseed attendance integration.

---

## What We Did

### Phase 1: Security Hardening ✅ COMPLETE
- Auth checks added to 5 unprotected API routes (verify, reject, re-extract, send-offer, generate-copy)
- Storage bucket set to private + all upload routes switched to signed URLs (7-day expiry)
- 23 unchecked DB operations in workflow engine now log errors
- Race condition fix on workflow completion counter (atomic increment RPC)
- Role check on DELETE operative (admin/staff/super_admin only)
- Token enumeration fix (unified 404 for not-found and expired)
- Compliance cron batched for 2000+ operatives (was N+1, would have timed out)

### Phase 1b: Performance ✅ COMPLETE
- Loading skeletons on all 11 major dashboard pages
- Operative detail page: lazy tab queries (only loads data for active tab)
- Middleware: early return for public routes (skips Supabase auth call)
- Documents page: server-side pagination (50/page, was loading ALL documents)
- Reports page: query limits tightened
- Operatives search: persistent via URL params, router.replace for clean back button

### Phase 2: RAP Score Expansion ✅ COMPLETE
- Safety score (H&S) added as 4th dimension: R/A/P/S (1-5 each)
- Charge rate field on operatives + allocations
- DB trigger updated: backward-compatible (4 scores if safety present, 3 if not)
- Traffic light thresholds unified (DB trigger is single source of truth, fixed mismatch)
- Web form on operative RAP tab: updated to 4 scores
- WhatsApp handler: 4-step flow (R → A → P → S), DB trigger handles calculation
- Telegram handler: same 4-step flow
- ALF tools: quality_read returns R/A/P/S/Avg, write_rap_reviews enabled by default
- System prompt: RAPS not RAP, charge_rate + engagement fields documented

### Phase 2b: RAP Spreadsheet View ✅ COMPLETE
- "RAP Scores" pill on operatives page toolbar — toggles to spreadsheet layout
- Columns: Name, Ref, Trade, Grade, CSCS, DOB, Last Worked, R, A, P, S, Total/20, RAG, Pay £, Charge £, Margin %
- Click any R/A/P/S cell to enter inline scores (1-5 tap buttons)
- Auto-calculates Total, RAG, Margin as you score
- Save per row — creates review + updates rates + creates notification
- Server-side column sorting (full database, not just current page)
- Up/down arrow indicators on all sortable headers
- RAG row tinting (green/amber/red left border + background)
- Score cells show coloured badges when filled
- Reset button (hover on name) — wipes all reviews + rates for testing
- Scores persist after save (fetched from latest review on mount)

### Phase 2c: Quick RAP Add ✅ COMPLETE
- Dashboard modal: search operative → tap scores → enter rates → submit
- Rich search results with trade, site, phone last 4, CSCS, day rate
- Live preview: Total/20, Average/5, RAG colour, Margin %
- Success message persists after submit
- Notification created in activity feed on every RAP submission
- reviewer_id FK fixed (uses public.users.id not auth.uid)

### Phase 3: Engagement & WhatsApp ✅ COMPLETE
- Engagement tracking columns: last_contacted_at, last_reply_at, last_upload_at on operatives
- last_inbound_at on message_threads (for 24h window detection)
- smartSendWhatsApp() — checks 24h session window, freeform → template → error fallback
- All 4 workflow definitions updated to use smart send
- Inbound handler sets last_inbound_at + last_reply_at on every message
- Upload/submit-data routes set last_upload_at
- Notifications on document uploads + data submissions (push to Telegram)

### Phase 4: Roles & UI ✅ COMPLETE
- super_admin role added (Oliver) — accepted everywhere admin is (12 locations)
- Users panel: super_admin with fuchsia badge
- ALF widget: "Quick ALF" button in sidebar (opens widget panel)
- ALF nav item: restored as Link to /assistant (full page)
- Charge rate field added to operative edit form
- Margin display on operative profile (colour-coded)
- Total/20 display alongside Average/5 on RAP tab

---

## What We Didn't Do (Still Outstanding)

### Needs External Action
| Item | Blocked on |
|---|---|
| PROFILE_COMPLETION WhatsApp template | Create in Twilio Console, add SID to templates.ts |
| DOC_CHASE/DOC_REMINDER/DATA_REQUEST approval | Check Twilio Console for Meta approval status |
| RE_ENGAGE template | Create in Twilio Console (generic "please reply" for 24h window) |
| JOB_OFFER_REMINDER template | Create in Twilio Console |
| RESEND_API_KEY | Oliver to add to Vercel env vars |
| Donseed API credentials | Request from Aztec client |
| Sentry DSN | Create Sentry project |

### Needs Code Work (Future Sessions)
| Item | Priority | Notes |
|---|---|---|
| Donseed attendance integration | High | API spec reviewed, client + matching logic designed, waiting for credentials |
| RAP paper sheet scanner | High | Waiting for Liam's paper template photo |
| Workflow progress card polling | Medium | Real-time updates when operative submits data/docs |
| Pending document indicator in missing fields card | Medium | Purple badge for "uploaded, pending review" |
| DOC_VERIFIED template: pass actual doc type | Low | Currently says generic "passport / driving licence" |
| "Fully verified" message timing | Low | Fires when docs verified, should say "documents verified" not "fully verified" |
| EXIF image rotation fix | Low | Uploaded photos sometimes display rotated |
| job_offer onFollowUp: use smartSendWhatsApp | Medium | Currently uses sendWhatsApp directly |
| Notification when smart send fails | Medium | Liam should see "Failed to reach operative — outside 24h window" |
| Regenerate Supabase types | Low | Eliminates `as any` casts for new columns |
| Duplicate NIs | Liam | OSP025, HOW005, ANAMI1239 need review |
| Retroactive entry_source | Low | `UPDATE operatives SET entry_source = 'import' WHERE source = 'bulk_import'` |
| Site manager history on allocations | Future | Track who managed each operative per job |

---

## Commits This Session (selected)
| Hash | Description |
|---|---|
| Security fixes | Auth on 5 routes, storage private, error handling, batched cron |
| Performance | Loading skeletons, lazy tabs, middleware, pagination |
| RAP expansion | safety_score, charge_rate, trigger update, form updates |
| super_admin | Role type + 12 route checks + users panel |
| Smart send | 24h window awareness, engagement tracking, template fallback |
| RAP table | Inline spreadsheet, server-side sort, reset, RAG tinting |
| Quick RAP | Dashboard modal with search, rates, margin preview |
| ALF sidebar | Full page link + Quick ALF widget button |

---

## Key Architecture Decisions Made
- DB trigger is single source of truth for RAP averages + traffic lights (no manual calculation in handlers)
- smartSendWhatsApp for all workflow outbound (freeform → template → error chain)
- Engagement tracking on operatives for recommendation tiebreaking
- Server-side sorting on RAP table (full database, not page-only)
- super_admin role separate from admin (tech owner vs business admin)
- Telegram deprioritised for site managers, kept for Oliver notifications only
