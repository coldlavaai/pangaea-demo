# Aztec Landscapes — Client Reference Documents

All source documents from the client. **Do not modify** — these are Aztec's originals.

Last updated: 2026-02-26 (by Plex, S28)

---

## Files

| File | Purpose | Version |
|------|---------|---------|
| `Aztec_Grade_Pay_Rates.csv` | **PAY RATE CARD** — Hourly pay rates by grade + quartile. THE source of truth for operative pay rates. | From `Aztec-worker-database-New.xlsm` |
| `Full_Workers_List_Template.csv` | Column headers from Aztec's full worker database — defines every field Aztec tracks per operative. | From `Full Workers List.xlsx` |
| `Company_Induction_Form_Rev2.pdf` | Full company induction form — 8 sections, completed day 1 on site. Rev 2. | Rev 2, May 2020 |
| `New_Starter_Checklist_Rev2.pdf` | Site manager checklist for onboarding new starters. Rev 2. | Rev 2 |
| `RAP_Scoring_System_v2.docx` | RAP scoring definition — R/A/P categories, 1–5 scale, traffic light thresholds. | Latest from Oliver |
| `New_Starter_Form_Giant.xlsx` | Giant/Flamingo agency new starter form — fields required to register worker with payroll. | Original |
| `Company_Induction_Form.pdf` | Company induction form (Rev 1 — kept for reference). | Rev 1, May 2020 |
| `New_Starter_Checklist.pdf` | New starter checklist (original — kept for reference). | Original |
| `RAP_Scoring_System.docx` | RAP scoring system (original — kept for reference). | Original |

---

## Aztec Grade Pay Rates — CRITICAL FOR PHASE D

Source: `Aztec_Grade_Pay_Rates.csv` (extracted from `Aztec-worker-database-New.xlsm`, sheet "Grades Margin By Quartile")

This is Aztec's actual pay structure. Rates are **hourly**. The grade maps directly to the `operative_grade` DB enum.

### Pay Rate Table (Hourly, £)

| Grade | Min Pay (£/hr) | Max Pay (£/hr) | Charge Rate (£/hr) | Q1 Range | Q2 Range | Q3 Range | Q4 Range |
|-------|---------------|---------------|-------------------|----------|----------|----------|----------|
| **Skilled** | £14.00 | £17.00 | £21.00 | £14.00–£14.75 | £14.76–£15.50 | £15.51–£16.25 | £16.26–£17.00 |
| **Highly Skilled** | £17.01 | £21.00 | £25.50 | £17.01–£18.01 | £18.02–£19.01 | £19.02–£20.00 | £20.01–£21.00 |
| **Exceptional Skill** | £21.01 | £25.00 | £30.50 | £21.01–£22.01 | £22.02–£23.01 | £23.02–£24.00 | £24.01–£25.00 |
| **Specialist Skill** | £25.01 | £29.00 | £36.00 | £25.01–£26.01 | £26.02–£27.01 | £27.02–£28.00 | £28.01–£29.00 |
| **Engineer** | £25.00 | £40.00 | £40.00 | £25.00–£28.75 | £28.76–£32.50 | £32.51–£36.25 | £36.26–£40.00 |
| **Manager** | £25.00 | £40.00 | £40.00 | £25.00–£28.75 | £28.76–£32.50 | £32.51–£36.25 | £36.26–£40.00 |
| **Senior Manager** | — | — | — | #ERROR (source data) | | | |
| **Contracts Manager** | £27.78 | £40.00 | £40.00 | £27.78–£30.84 | £30.85–£33.89 | £33.90–£36.95 | £36.96–£40.00 |
| **Project Manager** | £27.78 | £40.00 | £40.00 | £27.78–£30.84 | £30.85–£33.89 | £33.90–£36.95 | £36.96–£40.00 |

### Converted to Day Rates (×8 hours)

| Grade | Min Day Rate | Max Day Rate | Charge Day Rate |
|-------|-------------|-------------|-----------------|
| **Skilled** | £112 | £136 | £168 |
| **Highly Skilled** | £136 | £168 | £204 |
| **Exceptional Skill** | £168 | £200 | £244 |
| **Specialist Skill** | £200 | £232 | £288 |
| **Engineer** | £200 | £320 | £320 |
| **Manager** | £200 | £320 | £320 |
| **Contracts Manager** | £222 | £320 | £320 |
| **Project Manager** | £222 | £320 | £320 |

### How Quartiles Work
- **Q1 (entry):** Bottom of pay range for that grade — new to role, less experience
- **Q2:** Developing — competent, building experience
- **Q3:** Experienced — reliable, consistent performer
- **Q4 (top):** Senior/expert within grade — high RAP scores, proven track record

### Grade ↔ DB Enum Mapping
These grades map 1:1 to the `operative_grade` Postgres enum:
`skilled | highly_skilled | exceptional_skill | specialist_skill | engineer | manager | senior_manager | contracts_manager | project_manager`

### Margin Column
The "Charge Rate" column is what Aztec charges the client. The margin % columns show profit margin at each quartile (higher quartile = lower margin because operative gets paid more).

---

## Full Workers List — Column Template

Source: `Full_Workers_List_Template.csv` (from `Full Workers List.xlsx`, sheet "Workers")

These are the exact columns Aztec uses to track operatives in their spreadsheet system:

| # | Column | Maps to BOS field | Notes |
|---|--------|-------------------|-------|
| 1 | NI | `ni_number` | National Insurance number |
| 2 | Surname | `last_name` | |
| 3 | First name(s) | `first_name` | |
| 4 | Contact Tel No | `phone` | |
| 5 | E-mail | `email` | Required for Flamingo payroll |
| 6 | Last Worked | — | Not currently tracked; could be derived from allocations |
| 7 | **Grade** | `grade` (enum) | **Links to pay rate table above** |
| 8 | **Rate** | `day_rate` / `hourly_rate` | **The agreed rate for this operative** |
| 9 | Date of Birth | `date_of_birth` | |
| 10 | Flat No. | `address_line2` | Part of address |
| 11 | House No. & Street name | `address_line1` | |
| 12 | Borough/locality | — | Not a separate field in BOS; part of address |
| 13 | Town | `city` | |
| 14 | Postcode | `postcode` | Geocoded to lat/lng |
| 15 | Emergency contact Name | — | **NOT in BOS yet** |
| 16 | Emergency contact Phone No. | — | **NOT in BOS yet** |
| 17 | Bank Sort Code | `bank_sort_code` | Masked in UI |
| 18 | Bank Acc No | `bank_account_number` | Masked in UI |
| 19 | UTR Tax Reference No | `utr_number` | Masked in UI |
| 20 | Title On Cscs Card | `cscs_card_title` | |
| 21 | Colour Of Cscs Card | `cscs_card_type` | Enum: green/blue/gold/black/red/white |
| 22 | Cscs Card No | `cscs_card_number` | |
| 23 | Cscs Expiry Date | `cscs_expiry` | |
| 24 | Description On Back Of Cscs Card | — | Stored as text field |
| 25 | Type of work to be undertaken | `trade_category_id` → `trade_categories.name` | |
| 26 | **Daily Rate (Site Manager)** | `day_rate` | Site manager sets this on arrival |
| 27 | **Hourly Rate** | `hourly_rate` | Auto-calculated from day rate ÷ 8 |
| 28 | Agency name | `source` | e.g. "Giant", "Elite", "Direct" |
| 29 | Start Date | — | **NOT explicitly tracked in BOS yet** |
| 30 | Notes | `notes` | |

### Missing from BOS (gaps identified)
- **Emergency contact name + phone** — on induction form but not in operatives table
- **Start date** — when they first worked for Aztec (Q5 from JJ_HANDOFF.md)
- **Last worked date** — derivable from allocations but not a stored field
- **Borough/locality** — currently address is line1 + city + postcode only

---

## RAP Scoring System

Source: `RAP_Scoring_System_v2.docx`

- **R** = Reliability (turns up, completes tasks, follows instructions, works without chasing)
- **A** = Attitude (professional, works with team, takes direction, no conflict)
- **P** = Performance (quality of work, safety, productive, minimal rework)
- Scale: 1 (Unacceptable) → 5 (Excellent)
- Average = (R + A + P) ÷ 3, rounded to 1 decimal
- Traffic lights: **Green** ≥ 4.0 | **Amber** 3.0–3.9 | **Red** < 3.0
- Comment **required** for scores of 1 or 2. Optional for 3–5.
- Designed to take under 30 seconds per assessment.

---

## Giant New Starter Form — Fields Required for Flamingo Payroll

Source: `New_Starter_Form_Giant.xlsx`

Two sheets: "Starter form" (data entry) and "Contract" (auto-generated subcontractor agreement).

### Required Fields
- Ex-Agency name (if from another agency)
- Site + Start date
- Surname, first name(s)
- Share code (RTW) OR passport if British
- National Insurance number
- Date of birth
- Full address (flat, house/street, borough, town, postcode)
- Mobile number
- Emergency contact (name + phone)
- Bank sort code + account number
- Email address (required — pay slips sent by email)
- Gender
- Machine operator (yes/no — digger/telehandler/dumper qualified?)
- UTR tax reference
- CSCS card: title, colour, number, expiry, description on back
- Type of work to be undertaken
- **Daily rate** (filled in by site manager — auto-calculates hourly rate)
- Hourly rate

### Contract Sheet
Auto-populates a subcontractor agreement using data from the starter form. Includes:
- Subcontractor name + address (from form)
- Initial site + start date
- Hourly rate (from form)
- Standard Aztec T&Cs (engagement, duties, termination, data protection)

---

## Company Induction Form (Rev 2)

Source: `Company_Induction_Form_Rev2.pdf` (5 pages)

### Sections
1. **About You** — name, gender, NI, DOB, age, nationality, RTW, English ability
2. **Contact Details** — phone, full address, postcode, next of kin (name, relationship, number, address)
3. **Employment Information** — job role/trade, years in UK construction, supervisor status, apprentice status, qualifications, training (manual handling, abrasive wheels, traffic marshal, confined space, harness, face fit)
4. **Medical** — 9 health questions (epilepsy, diabetes, blackouts, chest pain, heart conditions, hearing, musculoskeletal, allergies, medication)
5. **Skills & Training** — CSCS, CPCS (plant), PAL/IPAF (powered access), CISRS (scaffolding), NRSWA (highways), other cards
6. **New/Agency Worker Review** — blue sticker issued, buddy allocated, 2-week reassessment
7. **Declarations** — drug testing, plant training, RAMS, site rules
8. **Data Protection + Signature**

### Key Field: "How Long Have You Worked in Construction in the UK"
This is the **experience years** field referenced in Phase D. Aztec asks this during induction — Sophie should ask it during WhatsApp intake to pre-populate.

---

## New Starter Checklist (Rev 2)

Source: `New_Starter_Checklist_Rev2.pdf` (2 pages)

Site manager completes on day 1:
- Company induction form ✓
- RTW checked ✓
- Site induction ✓
- Bank details and salary form ✓
- Qualifications photocopied ✓
- Training matrix updated ✓
- RAMS read and signed ✓
- Site access (turnstiles) ✓
- Blue sticker issued ✓
- Donseed fingerprint (if applicable) ✓
- Blackhat supervisor interview (if applicable) ✓
- Machine competency assessment (if applicable) ✓
- 2-week follow-up review

---

*Last updated: 2026-02-26 by Plex (S28)*
*All documents provided by Oliver Tatler (Cold Lava AI) from Aztec Landscapes client materials.*
