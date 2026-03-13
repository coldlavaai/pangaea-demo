# Donseed API Research Report
### Prepared for: Aztec Landscapes — Next.js + Supabase Workforce Integration
**Date:** March 2026  
**Scope:** Pre-integration due diligence on Causeway Donseed (formerly Donseed) API viability

---

## Executive Summary

**Verdict:** Donseed (now branded as **CausewayOne Attendance**) does have a REST API — but it is a **gated, enterprise-only integration** that requires formal approval from Causeway Technologies before access is granted. There is no self-serve developer portal, no public API key signup, and no community SDK ecosystem. The API exists and is real, but it is closer to an "available on request from your account manager" feature than an open developer platform.

For a small groundworks/landscaping contractor like Aztec Landscapes, this creates a significant practical barrier. Causeway is unlikely to grant API access to a small SME without a structured enterprise arrangement. The recommended alternative with a more accessible API is **Biosite Systems**, the UK construction market leader.

---

## 1. What Is Donseed?

### Product Overview

Donseed is a biometric time and attendance system purpose-built for the UK construction industry. It is now officially branded **CausewayOne Attendance** (sometimes still referred to as "Causeway Donseed" in marketing materials). The product captures fingerprint and facial recognition clock-in/out events on construction sites, replacing paper timesheets.

Core capabilities include:
- Fingerprint and facial recognition identification on-site
- To-the-minute attendance recording
- CSCS smart card validation (real-time)
- Right-to-Work records management
- Online site inductions and toolbox talks
- GPS geo-fencing for mobile sign-in verification
- Payroll build-up (basic gross pay calculation including overtime)
- Health and safety compliance tracking
- Qualifications and trade records per operative
- Real-time dashboards across multiple sites
- iOS/Android mobile app + dedicated rugged tablet hardware

The system is **not** a full payroll system — it builds attendance data and provides export to payroll, but does not process pay itself. It does support payroll integrations.

### Company Details

Donseed was originally a standalone company founded in **2007**, headquartered in Birmingham (Lombard House, 145 Great Charles Street). It was **acquired by Causeway Technologies in 2019**, which is now the operating entity.

**Causeway Technologies Limited**
- Registered in the UK
- Headquarters: Comino House, Furlong Road, Bourne End, Buckinghamshire, SL8 5AQ (also: Sterling House, 20 Station Road, Gerrards Cross, SL9 8EL)
- Telephone: 01628 552000
- Contact for Donseed/CausewayOne Attendance: hywel.evans@causeway.com
- Causeway is described as the **largest specialist software provider to the UK construction market**, with 300+ employees worldwide, 2,500+ customers, and an annual turnover of ~£35m (as of ~2022 filings).

Sources: [CB Insights – Donseed](https://www.cbinsights.com/company/donseed), [Causeway Digital Marketplace listing](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/705071385596685), [Prodigitas playbook PDF](https://www.prodigitas.com/hubfs/Work%20Examples/SaaS%20Playbook.pdf)

### UK Construction Focus

The system is explicitly built for UK construction only. Key UK-specific integrations include:
- CSCS card validation (via CSCS IT Partner status)
- Compliance with UK Working Time Regulations
- Right-to-Work verification
- GDPR-compliant biometric template storage (UK/EEA data centres)

It is not marketed outside the UK/Ireland construction sector.

### Active Status in 2025/2026

**Yes, actively maintained.** As of late 2025/early 2026:
- Listed on the **UK Government G-Cloud 14 framework** (the current procurement framework as of 2024), confirming active commercial status
- Case studies published as recently as September 2024 (Kaybridge Construction, B&E Construction)
- Product listings on Capterra and GetApp updated to "2026 Pricing" dates
- Causeway's support portal lists CausewayOne Attendance as an active product alongside other maintained products

Sources: [G-Cloud 14 listing](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/705071385596685), [Causeway support portal](https://support.causeway.com/s/?language=en_US), [Causeway case studies](https://www.causeway.com/case-studies/causeway-donseed-provides-simple-accurate-time-recording-for-kaybridge-construction)

---

## 2. API / Integration Capabilities

### Does an API Exist?

**Yes.** Causeway's own G-Cloud 14 government procurement listing (the most authoritative publicly available technical spec) confirms:

> *"Donseed offers a powerful API for approved users to connect your existing systems with our platform. This integration ensures seamless data flow and simplifies workforce management."*

The key phrase is **"approved users"** — API access is not open or self-serve. It requires formal approval from Causeway.

### API Technical Specification (from G-Cloud 14)

| Property | Detail |
|---|---|
| API type | RESTful service with **OData protocol** |
| Authentication | SSL + Identity Authentication (Active Directory / Microsoft identity stack) |
| Auth options | Username/Password, SSO, or MFA — agreed at requirements phase |
| Documentation format | **OpenAPI (Swagger)** + HTML |
| Sandbox/test environment | Yes (exists, granted to approved integrators) |
| Data transport security | TLS 1.2 or above |
| Data export formats | JSON, XML, CSV, XLS |
| Data import formats | JSON, CSV, XLS |
| Webhooks | Not mentioned anywhere in public documentation |

Sources: [G-Cloud 14 listing — full API details](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/705071385596685)

### Public API Documentation

There is **no publicly accessible API documentation URL**. The Swagger/OpenAPI docs are not published on a public developer portal. Causeway's developer support page for "Ermeo API" (a different Causeway product) suggests docs are provided via a client_id and client_secret issued to approved integrators — the same model almost certainly applies to Donseed/CausewayOne Attendance.

No public base URL, no open Swagger spec URL, no developer signup form has been found through exhaustive web research.

### Authentication Method

Based on G-Cloud 14 disclosure and the Causeway platform's wider architecture (Causeway Mobile Platform, Ermeo API), authentication almost certainly follows:
1. Client is issued a `client_id` and `client_secret` (or API key) through onboarding
2. An OAuth 2.0 / Microsoft identity token exchange is performed
3. Bearer token included in all subsequent API calls
4. SSL enforced on all connections

The Causeway Mobile Platform Google Play listing notes: *"Integrate the mobile applications you designed with back office systems using a set of public APIs."* This confirms the wider Causeway platform uses token-based auth tied to Microsoft/Active Directory infrastructure.

### Available Endpoints (Inferred)

No public endpoint catalogue exists. Based on the product's feature set and G-Cloud disclosures, endpoints almost certainly cover:

| Likely Endpoint Category | Description |
|---|---|
| Attendance / clock events | Time-stamped sign-in and sign-out events per operative |
| Operative/worker records | Operative profile data (name, trade, qualifications, CSCS) |
| Sites / projects | Site definitions, site membership |
| Inductions | Induction completion status per operative |
| Timesheets | Aggregated hours by operative by period |
| Qualifications | Training records, expiry dates |
| Right-to-Work | Document records |

The OData protocol means queries are likely structured as filtered GET requests: e.g., `GET /attendances?$filter=siteId eq '123' and datetime ge 2026-01-01`

### Rate Limits

No published information. Enterprise APIs with OData typically impose pagination limits (e.g., 1,000–10,000 records per request with cursor-based paging) rather than hard rate limits, but this is unconfirmed for Donseed.

### Webhooks vs. Poll

**No webhook functionality is described anywhere in public documentation.** The API appears to be **poll-based** — you query for attendance records on a schedule rather than receiving push notifications when someone clocks in. This is consistent with how other OData-based workforce systems (e.g., WorkForce Software) operate.

### Important Discrepancy — GetApp Listing

One software review site (GetApp) lists under FAQs: *"No, Causeway Donseed does not have an API available."* This conflicts directly with Causeway's own G-Cloud listing. The GetApp entry appears to be auto-populated from third-party data and is likely incorrect or outdated. **The G-Cloud 14 listing, authored by Causeway itself, is authoritative.** The only confirmed public third-party integration listed is **Fatigue360** (a fatigue management platform).

Sources: [GetApp listing](https://www.getapp.com/hr-employee-management-software/a/causeway-donseed/), [G-Cloud 14 – confirmed API: Yes](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/705071385596685)

---

## 3. Data Model

### What Does an Attendance Record Look Like?

No public schema is available. Based on the product description and analogous systems, a Donseed attendance event almost certainly contains:

```json
{
  "eventId": "uuid or internal ID",
  "operativeId": "internal operative identifier",
  "siteId": "site/project identifier",
  "eventType": "SIGN_IN | SIGN_OUT",
  "timestamp": "ISO 8601 datetime",
  "verificationMethod": "FINGERPRINT | FACIAL | SMARTCARD | MOBILE",
  "gpsLocation": { "lat": ..., "lng": ... },  // if mobile app
  "cscsCardNumber": "optional, if verified at sign-in",
  "grossHoursToDate": "running total (if timesheet aggregation)"
}
```

The system records to-the-minute precision, GPS geo-tagging is available on mobile, and CSCS card data is linked at time of sign-in.

### How Does Donseed Identify an Operative?

Operatives are enrolled in the system with a **profile** that ties together:
- A biometric template (fingerprint and/or facial scan) — stored as an encrypted mathematical template, not a raw image
- Name and personal details
- CSCS card number (validated at enrolment)
- Trade/skill designation
- Qualifications and certifications
- Right-to-Work documents

The **linkable key** for external system mapping would be:
1. **Internal Donseed operative ID** — a system-assigned identifier (almost certainly a GUID or integer ID)
2. **CSCS card number** — the most reliable external identifier in UK construction, as all registered tradespeople have one; this is the recommended mapping key for joining Donseed operatives to an external system

The biometric template itself is never exposed via API — it is a one-way hash/template used only for on-device matching.

For Aztec Landscapes' use case: map operative UUID in Supabase ↔ CSCS card number or Donseed operativeId. CSCS number is preferable as it is portable across multiple systems.

### Sites and Projects

Yes — Donseed has a first-class concept of **sites**. Multiple sites can be managed within a single account. Operatives can be enrolled once and then admitted to multiple sites. Site managers can be assigned per site. The portal provides cross-site visibility at company level. The API almost certainly exposes site as a top-level entity and filter dimension.

Sources: [Causeway Donseed product page](https://www.causeway.com/workforce/time-and-attendance), [G-Cloud 14 listing](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/705071385596685), [Kaybridge case study](https://www.causeway.com/case-studies/causeway-donseed-provides-simple-accurate-time-recording-for-kaybridge-construction)

---

## 4. Integration Approaches Used by Others

### Known Integrations

**Fatigue360** is the only confirmed third-party integration publicly documented (listed on GetApp). Fatigue360 is a fatigue/hours management platform used in rail and infrastructure — its release notes confirm it integrates with "Worksite360" (a related biometric attendance system), and suggests the integration is pre-built via partner agreement.

Causeway also owns **Ermeo** (mobile data capture), **SkillGuard/CausewayOne Skills Passport**, and **CausewayOne Estimating** — these are integrated within the Causeway platform suite natively.

For payroll, the product page states it integrates with payroll systems generally, and case studies reference using timesheet reports as the input to payroll processing — but no specific named payroll integrations (e.g., Sage, Xero) are publicly documented for Donseed. Integration with payroll appears to be achieved via **CSV/XLS export** rather than live API connection in most deployments.

### npm Packages / Python Libraries / Community Tools

**None found.** There are no public npm packages, Python libraries, GitHub repositories, or community tools for Donseed/CausewayOne Attendance. A thorough search of npm, GitHub, and developer forums returned no results. The closed API model means no developer community has formed around it.

### Case Studies of Custom Integrations

No public case studies of companies building custom software integrations (as opposed to hardware deployments or switching from paper) were found. Case studies on the Causeway website focus exclusively on operational outcomes (time saved, fraud reduced, etc.) rather than technical integration stories.

Sources: [GetApp – Fatigue360 integration](https://www.getapp.com/hr-employee-management-software/a/causeway-donseed/), [Causeway case studies hub](https://www.causeway.com/workforce/time-and-attendance)

---

## 5. Alternatives with Better API Access

### UK Construction Biometric Time Tracking — API Comparison

| System | Owner | API Status | API Type | Notes |
|---|---|---|---|---|
| **Biosite Systems** | Biosite Systems Ltd (Solihull) | **Confirmed, accessible** | REST ("Sense" open API) | Market leader for UK construction; HS2-deployed; Work Wallet integration via API |
| **Causeway Donseed** | Causeway Technologies | Confirmed, **gated/approved users only** | REST + OData | No public docs; enterprise approval required |
| **VIS Systems** | VIS Systems Ltd | **Confirmed, accessible** | REST ("Construction API") | CSCS Smart Check partner; aimed at small-mid contractors |
| **Allday Time Systems** | Allday Time Systems | Advertised | Not specified | UK-based; general T&A, not construction-specific |
| **Kelio** | Bodet Group | **Confirmed** | REST | French-owned; UK office; GDPR-compliant; strong payroll integrations (Sage, Xero) |

### Recommended Alternative: Biosite Systems

**Biosite Systems Ltd** (Lancaster House, Drayton Road, Shirley, Solihull, B90 4NG; +44 121 374 2939; support@biositesystems.com) is the UK market leader for biometric access control and workforce management in construction.

Key facts:
- Deployed on **HS2** (the UK's largest infrastructure project), Kier, Wates, Bouygues, GMI Construction, Bowmer + Kirkland
- Founded 2011, purpose-built for UK construction
- Supports fingerprint and facial recognition biometric access
- Has a confirmed **"secure API"** that is used for real third-party integrations
- **"Sense" open API** explicitly designed to combine Biosite biometric workforce data with third-party applications
- Demonstrated live integration with **Work Wallet** (a H&S software platform) via *"secure API connection"* — the partnership announcement in 2023 confirms this is a real, working integration, not just a roadmap item
- **"One person, one profile"** model — each operative has a single global profile with a unique biometric identifier, making identity mapping clean

The Biosite API is described as:
> *"Biosite's secure API allows customers to integrate their existing software tools with Biosite's software products, making it possible for two different platforms to communicate with each other. It allows the efficient sharing of operative data and working history with other platforms."*

While Biosite does not publish a public developer portal URL either, the evidence of live third-party integrations (Work Wallet, Sense BI) and the language of the API description suggests the access model is more commercially accessible than Donseed's. API access would need to be requested through Biosite sales, but they actively market this as a capability.

Sources: [Biosite API/reporting page](https://www.biositesystems.com/global/en/solutions/workforce-management-software/reporting), [Biosite + Work Wallet partnership](https://www.biositesystems.com/global/en/stories/news/biosite-partners-with-work-wallet-on-integrated-site-software-solution), [HS2 Biosite contract](https://www.biometricupdate.com/202101/construction-site-biometrics-advance-with-biosite-contract-and-new-redrock-product)

### VIS Systems (Secondary Alternative)

VIS Systems is a smaller UK provider that explicitly markets a **"construction API"** for integration and is a CSCS IT Partner. Their website states:

> *"By leveraging the construction API, site operations are integrated into a unified system."*

VIS may be more accessible for smaller contractors than either Causeway or Biosite. Contact: vis-systems.com.

Source: [VIS Systems time and attendance page](https://www.vis-systems.com/sub-solutions/time-attendance)

---

## 6. Output Summary: Integration Assessment for Aztec Landscapes

### 1. Donseed API Existence + Quality Verdict

**API exists: Yes.** Quality: **Medium** — well-structured (OData/REST, Swagger docs, sandbox), but gated behind enterprise approval. Practically inaccessible for a small contractor without a direct commercial relationship with Causeway and explicit API enablement in their contract. The API is designed for large contractors or software vendors who build integrations as part of a formal partnership, not for individual customers self-building integrations.

### 2. Authentication Method + Base URL

- **Authentication:** Bearer token via Microsoft identity/SSO, with client credentials issued by Causeway on approval. Similar to OAuth 2.0 client credentials flow.
- **Base URL:** Not publicly disclosed. No public endpoint has been found. Likely follows a pattern such as `https://api.causeway.com/attendance/v1/` or tenant-specific subdomain, but this is unconfirmed.

To obtain the actual base URL and credentials: Aztec Landscapes would need to contact Causeway Technologies (hywel.evans@causeway.com / 01628 552000) and request API access as part of their subscription. This needs to be negotiated at contract level.

### 3. Key Endpoints Relevant to the Use Case

Not publicly documented. Based on OData protocol and product feature set, the relevant queries for Aztec Landscapes would likely be:

```
GET /attendances?$filter=siteId eq '{siteId}' and timestamp ge {date}
GET /operatives/{operativeId}
GET /operatives?$filter=cscsCardNumber eq '{cardNumber}'
GET /sites
GET /timesheets?$filter=operativeId eq '{id}' and week eq '{week}'
```

The OData protocol means standard `$filter`, `$orderby`, `$top`, `$skip` query parameters would be supported.

### 4. Mapping Donseed Operative Identity → Supabase UUID

**Recommended mapping key: CSCS card number**

Every UK construction operative is required to hold a CSCS card for site access. CSCS numbers are:
- Unique per individual
- Persistent across employers and sites
- Already captured by Donseed at enrolment
- Validated in real-time against CSCS's own database

Integration pattern:
1. At enrolment in Donseed, capture the operative's CSCS number
2. In your Supabase `operatives` table, store `cscs_card_number VARCHAR` as a column alongside the internal UUID
3. On each sync, join on `cscs_card_number` to link Donseed attendance records to Supabase operative records

Fallback: Donseed's internal operative ID, if CSCS is not available for all operatives (e.g., labour-only workers, certain subcontractors). This would require storing the Donseed ID in Supabase at the time of operative registration.

### 5. Recommended Integration Pattern: Webhook Push vs. Scheduled Pull

**Recommended: Scheduled poll (every 5–15 minutes)**

Rationale:
- No webhook system is documented for Donseed
- OData REST APIs are inherently poll-based
- For a groundworks/landscaping contractor, real-time updates are not critical — knowing who clocked in within 15 minutes is operationally sufficient
- A Next.js API route (or a Supabase Edge Function) can run on a cron schedule, polling the Donseed OData endpoint for new attendance events since the last sync timestamp, and upsert into a Supabase `attendance_events` table

Example Supabase Edge Function architecture:
```
Cron (every 10 min)
  → Supabase Edge Function: fetch_donseed_attendance
  → GET /attendances?$filter=timestamp gt {lastSyncTime}
  → Upsert into attendance_events table
  → Update sync_state table with lastSyncTime
```

### 6. Gotchas and Known Issues

| Issue | Details |
|---|---|
| **API approval barrier** | The single biggest gotcha. Causeway's API is "for approved users" — this means enterprise customers or established software partners, not individual SME contractors self-building integrations. Aztec Landscapes should proactively raise API access in their contract negotiation before signing. |
| **No public documentation** | You cannot prototype or spec the integration until Causeway grants access to their Swagger docs and sandbox. This creates a planning dependency. |
| **OData learning curve** | OData is less commonly used than plain REST. Developers comfortable with SQL-like query strings should adapt quickly, but it is not as intuitive as a standard REST API. |
| **No community or open-source tooling** | Zero npm packages, zero GitHub repos, zero Stack Overflow questions about Donseed. You are building from scratch with no community help. |
| **Biometric data sensitivity** | Under UK GDPR, biometric data is "special category" data. The API will expose attendance records tied to biometrically-verified identities. Ensure Aztec Landscapes has an Information Commissioner's Office (ICO) registration, a Data Processing Agreement (DPA) with Causeway, and a legitimate processing basis (e.g., contract performance) before integrating. |
| **Potential "no API for SMEs" outcome** | If Causeway refuses API access for an account of Aztec Landscapes' size, the fallback is CSV export automation — downloading the weekly timesheet CSV from the Donseed portal and ingesting it via a script. This is low-tech but reliable. |
| **Product renaming** | "Donseed" is legacy branding. When contacting Causeway, refer to "CausewayOne Attendance" — using the old name may create confusion. |
| **Support availability** | 08:00–17:30 Monday–Friday only. No third-party API support included in standard plan. |

### 7. If No Viable API — Best Alternative

**Biosite Systems** is the recommended alternative if Causeway Donseed's API proves inaccessible.

- **API status:** Confirmed, actively used for third-party integrations (Work Wallet, Sense BI)
- **Contact:** info@biositesystems.com / +44 121 374 2939
- **Why better:** Biosite explicitly markets API integration as a product capability, has live public examples of partner integrations via API, and uses an "open API" for their Sense BI product — suggesting a more developer-accessible model
- **Operative identity:** "One person, one profile" model with biometric + CSCS linking — clean UUID mapping
- **UK construction focus:** HS2, Kier, Wates, GMI — same industry credibility as Donseed
- **Caveat:** Biosite is typically deployed on larger sites (Tier 1 contractors). May be over-specified for a small groundworks contractor and may have similar commercial barriers. Worth a direct conversation.

Second alternative: **VIS Systems** — smaller, explicitly advertises a construction API, CSCS IT Partner, potentially more SME-friendly.

---

## Appendix: Research Confidence Levels

| Topic | Confidence | Basis |
|---|---|---|
| Donseed is owned by Causeway | High | Multiple authoritative sources |
| API exists (REST + OData) | High | Causeway's own G-Cloud 14 government listing |
| API is gated/approval required | High | Explicit wording: "approved users" |
| Swagger docs + sandbox exist | High | G-Cloud 14 self-declaration |
| No public base URL | High | Exhaustive search returned nothing |
| Authentication method (bearer/MS identity) | Medium | Inferred from Causeway platform architecture |
| Specific endpoint names | Low | Inferred from product features and OData convention |
| Donseed data model (field names) | Low | Inferred — no public schema found |
| No webhooks | Medium | Absent from all documentation |
| Biosite API accessible to SMEs | Medium | Confirmed API exists; access model requires direct contact |

---

## Appendix: Contact References

**Causeway Technologies (Donseed/CausewayOne Attendance)**
- Commercial: hywel.evans@causeway.com / 01628 552000
- Support portal: support.causeway.com
- G-Cloud listing: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/705071385596685

**Biosite Systems**
- General: info@biositesystems.com / +44 121 374 2939
- Support: support@biositesystems.com
- Website: biositesystems.com

**VIS Systems**
- Website: vis-systems.com

---

*Report compiled March 2026. Sources include Causeway Technologies UK Government G-Cloud 14 listing, Causeway product and case study pages, UK Digital Marketplace procurement database, Biometric Update trade press, GetApp/Capterra software directories, and Biosite Systems product documentation.*
