# Open Questions — Aztec BOS
**Purpose:** Every question here directly changes how the system is built. No answer = no build. No guessing.
**Rule:** If the answer doesn't unlock specific code or config, the question gets cut.
**Last reviewed:** 2026-03-07 — 15 open, 17 answered. Liam answered Q1/Q3–Q8 on 2026-03-06.

---

## Known Facts (no longer questions)

- Rate column in spreadsheet = **hourly rate** (£21.95/day would be below minimum wage)
- Plant Operator = someone who **operates plant or vehicles** (360 excavator, dumper, forklift, telehandler)
- All SQL migrations 00035–00039 ran successfully
- Importer updated: multi-trade splitting, multi-CSCS cards, agency auto-create, 9 new grades mapped
- Liam's role → **staff** (Oliver's call — set)
- Site managers use **WhatsApp** — Telegram is out entirely (Oliver confirmed)
- Labour transfers → **site managers initiate, Liam approves all** (confirmed on call)
- Offer dispatch → **Liam approves before anything is sent** (confirmed on call — "manual oversight, Liam is governor")
- Sophie Stage 1 fields → **Name, trade, experience, address, geographic radius, expected pay rate** (confirmed on call)
- Sophie Stage 2 fields → **Bank details, right-to-work docs, induction forms** (confirmed on call)
- Stage 2 trigger → **when operative is being placed** (offer accepted) (confirmed on call)
- Skill band vs job role → **two separate fields** — skill band (Skilled/Highly Skilled/etc.) is the ranking, job role (Groundworker/Plant Operator/etc.) is what they do. A groundworker can be skilled or exceptional. Obviously not one field.
- Liam's WhatsApp number → **known, not needed yet** — nothing is live sending yet
- WhatsApp broadcast group → **not needed yet** — existing group exists, will revisit at go-live
- **5 fields in spreadsheet — all now handled:**
  - `last_worked_date` → migration 00040 run ✅ (1,654 operatives have it)
  - `borough` / locality → stored in existing `county` field ✅
  - `emergency_contact_name` → stored in existing `next_of_kin_name` field ✅
  - `emergency_contact_phone` → stored in existing `next_of_kin_phone` field ✅
  - `start_date` → already in DB ✅
- **Rate vs Hourly Rate** — confirmed by Liam: col 8 = charge rate, col 27 = pay rate. Fixed in importer. ✅
- **Elite agency** — Liam didn't recognise the question as relevant; treating Elite as a regular agency label with no special rate logic. ✅
- **Trades finalised** — Slinger Signaller (one trade), Cladder (renamed), migration 00043. ✅

---

## CSCS CARDS

**Q1 — CPCS, GQA, NPORS, EUSR: do these count as valid?**
Blocks: Compliance cron — what card schemes count as valid for allocation
Who: Liam

Some operatives hold cards from other schemes: CPCS (plant), GQA (groundworks/paving), NPORS, EUSR. Does Aztec accept all of these as valid proof of competency, or does the scheme matter per trade?

**Q2 — Two CSCS cards: which one governs compliance?**
Blocks: Compliance cron logic for ~60 dual-card operatives
Who: Liam

Some operatives have two cards (e.g. white academic + green labourer). Which card counts for compliance:
- The highest colour
- The one relevant to the specific job
- Both must be valid

**Q3 — Expired CSCS: hard block or warning?**
Blocks: Compliance cron behaviour — `blocked` status vs warning notification
Who: Liam

Currently the system blocks an operative entirely if their CSCS is expired. Is that right, or should it be a warning that Liam can override (e.g. renewal in progress)?

---

## WORKFLOWS

**Q4 — If Liam is unavailable: what happens to pending approvals?**
*Relevant because: all transfers and offers require Liam's approval (confirmed on call)*
Blocks: Whether to build a backup approver, auto-approve timer, or hold queue
Who: Liam

If Liam is away and there are pending transfer or offer approvals — do they hold until he's back, is there a backup approver (who?), or should the system auto-approve after a time limit?

---

## RAP SCORES

**Q5 — RAP Excel format: what columns?**
Blocks: RAP bulk importer — can't build the parser without the column layout
Who: Liam

When the RAP Excel is ready to upload, what will each row contain? Example: NI number · First name · Last name · R score (1–10) · A score (1–10) · P score (1–10) · Date assessed · Notes

**Q6 — RAP: one current score or full history?**
Blocks: DB schema — one row per operative (overwrite) vs one row per assessment (append)
Who: Liam

Does each operative have one current RAP score that gets updated when reassessed, or do you want the full history of every assessment kept?

**Q7 — RAP visibility: can site managers see scores?**
Blocks: RBAC — whether to add RAP read permission to the site_manager role
Who: Liam

Currently RAP scores are visible to admin and staff only (Liam, Donna, Jacob). Should site managers see RAP scores for operatives on their site?

---

## USERS & GO-LIVE

**Q8 — Donna's access level**
Blocks: Setting Donna's role correctly before go-live
Who: Liam/Oliver

What should Donna be able to do:
- **Full admin** — same as Oliver (can change system settings and user roles)
- **Staff** — full operational access, no system settings
- **View only** — can read reports and operative records, no editing

**Q9 — Site managers: access from go-live or back-office only initially?**
Blocks: How many accounts to set up, whether to build site manager onboarding before go-live
Who: Liam

Current back-office accounts: Oliver · Liam · Donna · Jacob (Cold Lava) · JJ (being re-invited). Do site managers get logins from day one, or do you want to start with just back-office access and roll site managers in later?

**Q10 — 154 operatives with invalid NI numbers**
Blocks: Whether we build a "fix NI" queue in BOS or just leave them in notes until corrected
Who: Liam

154 imported operatives have NI numbers in non-standard formats (e.g. "ANAMI1240"). They're in the system with the invalid NI stored in their notes field:
1. Leave them — fix NI numbers manually in BOS over time
2. Get the correct NIs and send a corrected spreadsheet to re-import

**Q11 — Operatives with no contact details: what does that mean?**
Blocks: Import validation rules — whether missing phone/email is an error, a warning, or expected
Who: Liam

A number of imported operatives have no phone number and no email. Questions:
1. Is there a legitimate reason someone would be in the system without contact details (e.g. passed on by a site manager verbally, agency-supplied where Aztec doesn't hold direct contact)?
2. Should these be imported as normal prospects, flagged for follow-up, or held separately until contact details are obtained?
3. If they have no phone, can they ever be offered work — or are they effectively uncontactable until details are added?

**Q12 — Duplicate operatives: keep a log or discard silently?**
Blocks: Import deduplication behaviour — whether to surface duplicates to Liam for review or just skip them
Who: Liam

The importer detects duplicates by matching NI number or phone number. When a duplicate is found it's currently skipped. Questions:
1. Should duplicates be logged somewhere visible so you can review them — e.g. "this person appears twice, here's why" — in case the two records have different data worth merging?
2. Is there any scenario where two people could legitimately share a phone number (e.g. husband and wife both on the books)?

**Q13 — Agencies: full module or just a label?**
Blocks: Whether to build the Agencies management section in Settings
Who: Liam

The system records which agency each operative came from. Do you want:
- A full agency directory — contact details, payment tracking per operative per week
- Just the label on the operative record (what we have now)

**Q14 — Go-live date and minimum requirements**
Blocks: Sprint prioritisation — what gets built next vs deferred
Who: Liam/Oliver

1. What is the target go-live date?
2. What is the absolute minimum the system must do before you switch to using it live?

---

## Answered

| Q | Answer | Date | Source | Unblocked |
|---|---|---|---|---|
| Rate column = hourly or daily? | Hourly — £21.95/day < min wage | 2026-03-06 | Obvious from data | pay-rates.ts mapping |
| Plant Operator = what? | Someone who operates plant/vehicles — distinct from skilled labourer | 2026-03-06 | Obvious from job title | Trade category definition |
| Liam's role in BOS | Staff (not admin) — Oliver's call | 2026-03-06 | Oliver | Role config |
| Site managers: Telegram or WhatsApp? | WhatsApp — Telegram dropped entirely | 2026-03-06 | Oliver + call confirms site managers prefer WhatsApp | Rebuild site manager comms as WhatsApp |
| Labour transfer: who raises it? | Either site manager raises it (via WhatsApp to agent). Liam approves all. | 2026-03-06 | Call transcript | Transfer UI — raise button for site_manager role |
| Labour transfer: Liam approval required? | Yes — all transfers through Liam | 2026-03-06 | Call transcript ("All labour moves go through Liam") | Approval gate in transfer flow |
| Offer dispatch: Liam approves before sending? | Yes — manual oversight, Liam is governor | 2026-03-06 | Call transcript ("Version 1 goal: manual oversight by Liam") | Offer approval gate build |
| Sophie Stage 1: what to collect? | Name, trade, experience, address, geographic radius, expected pay rate | 2026-03-06 | Call transcript (Section 6) | Sophie Stage 1 state machine |
| Sophie Stage 2: what to collect? | Bank details, right-to-work docs, induction forms | 2026-03-06 | Call transcript (Section 6) | Sophie Stage 2 flow |
| Sophie Stage 2: what triggers it? | When operative is being placed (offer accepted) | 2026-03-06 | Call transcript ("only when operative is being placed") | Stage 2 automation logic |
| Skill band vs job role: one field or two? | Two fields — skill band = ranking, job role = what they do. Obviously separate. | 2026-03-06 | Obvious from domain | Add `job_role` field to schema |
| Col 8 "Rate" = charge rate? | CORRECT. Col 8 = charge rate (site billing), col 27 = pay rate (operative). | 2026-03-06 | Liam | Importer: col 8 → charge_rate, col 27 → hourly_rate |
| Plant Operator charge rate = Skilled Landscaper? | CORRECT — £26.59 charge rate. | 2026-03-06 | Liam | pay-rates.ts OPERATIONAL_RATES |
| Agency Labour rates? | Pay £28.75/hr, charge £31.74/hr | 2026-03-06 | Liam | pay-rates.ts OPERATIONAL_RATES |
| Document Controller rates? | Pay £13.57/hr, charge £21.95/hr | 2026-03-06 | Liam | pay-rates.ts OPERATIONAL_RATES |
| "static crew" grade? | Historical terminology, no longer used. Leave unmapped — 1 operative, fix manually. | 2026-03-06 | Liam | GRADE_MAP → null |
| "Manager" grade? | Historical. Current term is Site Manager. | 2026-03-06 | Liam | GRADE_MAP: manager → site_manager |
| Q3 — Semi-Skilled vs Skilled distinction? | Could be any factor (qualifications, experience, age) — subjective judgement by Liam. Grade stays distinct. | 2026-03-06 | Liam | semi_skilled enum value added, no hard rule to build |
| Q4 — Slinger and Signaller: one trade or two? | ONE trade — Slinger Signaller. | 2026-03-06 | Liam | Merged in migration 00043 |
| Q5 — Plant subtypes: separate or under Plant Operator? | Broadly sub-types of Plant Operator. Keep specific categories for detail. | 2026-03-06 | Liam | No change to trade_categories |
| Q6 — Paver vs Block Paver? | Paver is umbrella term, Block Paver is specific trade. Keep both. | 2026-03-06 | Liam | No change |
| Q7 — Site Supervisor/Manager as trade types? | Grades only (seniority levels), not types of allocatable work. | 2026-03-06 | Liam | Not added to trade_categories |
| Q8 — Trade name corrections? | Slinger Signaller (merged), Cladder (not Cladding). All else correct. | 2026-03-06 | Liam | migration 00043 |
