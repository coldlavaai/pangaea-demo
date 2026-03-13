# Architecture Decisions — Aztec BOS

---

### Offer model — simultaneous broadcast, not sequential cascade
- **Decision:** Top 3 operatives notified simultaneously, 30-min window, first YES wins via `accept_allocation_offer()` atomic Postgres function.
- **Rejected:** Sequential cascade (one at a time). Too slow for time-sensitive groundworks.

### RAP: A = Attitude (not Attendance)
- **Decision:** Confirmed with client. A = Attitude.

### Sophie intake order
- RTW → Age 18+ → CSCS → Trade → Name → Docs link
- Deliberately collects qualifying data before personal details.

### Sophie state context — system prompt only
- **Decision:** State + collected data injected into system prompt on every call. Never injected as fake `[user, assistant]` message pairs.
- **Why:** Fake message pairs cause consecutive same-role violations when history window starts on wrong turn. System prompt injection is always safe.

### `intake_data` lives on `message_threads`, not `operatives`
- **Decision:** `message_threads.intake_data` (JSONB) stores Sophie's intermediate data. `operatives` table gets properly typed fields once operative is created.
- **Implication:** Upload API must NOT read `operative.intake_data` — it doesn't exist. Read typed fields directly (e.g. `operative.cscs_card_type`).

### Allocation creation — via API only
- **Decision:** All allocation creates go through `POST /api/allocations` which runs `canAllocate()` compliance gate. Never direct Supabase insert.

### Site managers — WhatsApp only in v1
- **Decision:** No web login for site managers. WhatsApp-only interface.

### Payroll — manual CSV export only
- **Decision:** No Xero integration in v1. CSV export from timesheets page.

### Supabase migrations — SQL editor only
- **Decision:** No `supabase db execute` or `supabase migration up`. Apply via Supabase SQL editor directly.
- **Why:** Production safety, avoids CLI permission issues.

### enum values (locked)
- `allocation_status`: `pending | confirmed | active | completed | terminated | no_show` — NO 'cancelled', NO 'expired'
- `operative_status`: `prospect | qualifying | pending_docs | verified | available | working | unavailable | blocked`
- `cscs_card_type`: `green | blue | gold | black | red | white | null` — NO 'none'

### FK join syntax in Supabase
- Must use explicit FK name: `operatives!allocations_operative_id_fkey`
- Cannot use just `operatives` — ambiguous when multiple FKs to same table.

### Twilio WhatsApp number
- `+447414157366` — existing Aztec Landscapes WhatsApp Business number.
- Format in env: `whatsapp:+447414157366`

### LIAM_WHATSAPP_NUMBER
- Currently `+447742201349` (Oliver's number, placeholder). Replace before go-live.

### Git author for Vercel auto-deploy
- Must be `Oliver Tatler / otatler@gmail.com`. Other authors don't trigger auto-deploy.

### TinyURL for upload links (temp)
- Full URL `https://aztec-landscapes-bos.vercel.app/apply/[token]` breaks WhatsApp line wrapping.
- Temporary fix: TinyURL API with 4s timeout and full URL fallback.
- Long-term: custom short domain.
