# Research Brief — Donseed Integration
**Date:** 2026-03-01
**For:** Perplexity / Claude Desktop
**Context:** Aztec BOS is a custom-built CRM/workforce management system for a UK groundworks and landscaping contractor (Aztec Landscapes). Stack: Next.js 15 + Supabase (Postgres) + Vercel.

---

## What We Know

Liam (Aztec's operations manager) uses **Donseed** on his construction sites for biometric time and attendance tracking (fingerprint check-in/out). He wants BOS to eventually integrate with it so that:
- Timesheets in BOS are auto-populated from Donseed clock-in/out data
- Attendance discrepancies are flagged automatically (e.g. operative clocked out but timesheet not submitted)
- We reduce manual timesheet entry

We have no credentials or API details yet — Liam hasn't provided them.

---

## Research Questions

### 1. What is Donseed?
- What does the Donseed product actually do? Is it biometric-only or does it also handle wages/payroll?
- Is it UK construction-specific or generic?
- Who owns/operates Donseed? (company details, UK-based?)
- Is it still actively maintained and used in 2025/2026?

### 2. API / Integration Capabilities
- Does Donseed offer a REST API or webhook system?
- Is there public API documentation? Where?
- What authentication method does it use? (API key, OAuth, etc.)
- What data endpoints are available? (clock-in events, site attendance, operative records, etc.)
- Are there rate limits or data export restrictions?
- Does it support real-time webhooks or is it poll-based?

### 3. Data Model
- What does a typical Donseed attendance record look like? (fields, timestamps, operative identifier)
- How does Donseed identify an operative? (name, employee ID, fingerprint hash — what's the linkable key?)
- Does Donseed have a concept of "sites" or "projects" that could map to our `sites` table?

### 4. Integration Approaches Used by Others
- Are there any known integrations between Donseed and other workforce/CRM systems?
- Any npm packages, Python libraries, or community tools for Donseed?
- Any case studies of companies integrating Donseed into custom software?

### 5. Alternatives
- If Donseed has a poor/no API, are there alternative UK construction biometric time tracking systems with better integration support? (e.g. Biosite, Sievert, SmartTask, Procore)
- What's the industry standard for biometric time tracking API integration in UK construction?

---

## What We Need Back

A structured response covering:
1. Donseed API existence + quality verdict (does it have one, is it usable?)
2. Authentication method + base URL if available
3. Key endpoints relevant to: clock-in events, site attendance, operative lookup
4. How to map Donseed operative identity → our `operatives.id`
5. Recommended integration pattern (webhook push vs. scheduled pull)
6. Any gotchas or known issues

If Donseed has no viable API, recommend the best alternative biometric attendance system for UK construction with confirmed API access.

---

## Our System Context (for Perplexity to understand the target)

```
operatives table: id (UUID), first_name, last_name, phone, reference_number
sites table: id (UUID), name, lat, lng
timesheets table: id, operative_id, site_id, week_start, status, hours_mon–hours_fri
allocations table: id, operative_id, labour_request_id, status (active/completed/etc.)
```

The integration goal: when a Donseed clock-in/out event fires, find the matching `operative` by some identifier, find their active `allocation`, and either auto-create a timesheet row or flag a discrepancy.
