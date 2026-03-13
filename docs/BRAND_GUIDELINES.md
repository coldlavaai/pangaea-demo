# Pangea — Brand Guidelines v1.0

**Cold Lava AI Ltd — March 2026**

---

## Brand Concept

**Pangea** — the original supercontinent. One connected landmass. One solid structure. The name signals unity, foundation, global reach, and permanence. For construction, it works on every level: land, building, solid ground, everything connected.

**Tagline options:**
- "One platform. Every worker. Site ready."
- "Built on solid ground."
- "One connected workforce."

---

## 01. Colour Palette

### Primary — Forest

The primary palette is deep forest green. Green means "safe," "compliant," "go" in every construction context. It IS the product's core action — moving workers from unverified to site-ready.

| Token | Hex | Usage |
|-------|-----|-------|
| forest-900 | `#0B2118` | Darkest backgrounds (dark mode) |
| forest-800 | `#1B4332` | **Navigation, sidebar, primary headers** |
| forest-700 | `#2D6A4F` | **Primary buttons, active states, "verified" badges** |
| forest-600 | `#40916C` | Hover states, secondary actions |
| forest-500 | `#52B788` | Icons, progress indicators |
| forest-400 | `#74C69D` | Light accents |
| forest-300 | `#95D5B2` | Tag backgrounds |
| forest-200 | `#B7E4C7` | Light fills |
| forest-100 | `#D8F3DC` | **Success/verified backgrounds, card highlights** |
| forest-50  | `#F0FBF4` | Lightest tint, page background accent |

### Accent — Copper

Warm copper accent for CTAs, attention states, and highlights. A construction material pulled from the earth. Creates complementary tension against the green.

| Token | Hex | Usage |
|-------|-----|-------|
| copper-900 | `#5C3A1E` | Darkest copper text |
| copper-800 | `#7A4E2A` | Dark accent |
| copper-700 | `#9A6339` | Hover state for accent buttons |
| copper-600 | `#B47543` | Active state |
| copper-500 | `#C17F59` | **Primary accent — CTAs, highlights, notification badges** |
| copper-400 | `#D4976F` | Light accent |
| copper-300 | `#E0B08A` | Subtle highlight |
| copper-200 | `#EBCAAA` | Background tint |
| copper-100 | `#F5E2CE` | Card background accent |
| copper-50  | `#FDF6EE` | Lightest tint |

### Neutral

| Token | Hex | Usage |
|-------|-----|-------|
| neutral-950 | `#0A0A0A` | Dark mode background |
| neutral-900 | `#1A1A1A` | **Primary text colour** |
| neutral-800 | `#2E2E2E` | Dark mode card surfaces |
| neutral-700 | `#444444` | Secondary text |
| neutral-600 | `#5C5C5C` | Tertiary text, placeholders |
| neutral-500 | `#777777` | Disabled text |
| neutral-400 | `#999999` | Muted text, timestamps |
| neutral-300 | `#BBBBBB` | Borders (dark mode) |
| neutral-200 | `#DDDDDD` | Borders, dividers |
| neutral-100 | `#EEEEEE` | Table header backgrounds |
| neutral-50  | `#F8F9FA` | **Page background** |
| white | `#FFFFFF` | Card surfaces, inputs |

### Semantic / Status Colours

These are non-negotiable. They map directly to worker compliance states.

| Status | Hex | Meaning |
|--------|-----|---------|
| Site Ready | `#2D6A4F` | Worker is verified, inducted, and cleared for site |
| Verifying | `#E09F3E` | Documents submitted, awaiting AI check or manual review |
| Non-Compliant | `#D62828` | Failed verification or missing required documentation |
| Pending | `#457B9D` | Worker has started but not completed the onboarding flow |
| Expired | `#9B2226` | Cert or document has passed its expiry date |

---

## 02. Typography

### Three Fonts, Three Jobs

| Font | Family | Role |
|------|--------|------|
| **DM Serif Display** | Serif | Brand name, hero headings, section titles only |
| **DM Sans** | Sans-serif | Everything else: body, buttons, nav, forms, labels |
| **JetBrains Mono** | Monospace | Data: CSCS numbers, dates, statuses, worker IDs, timestamps |

### Type Scale

| Name | Size | Weight | Line Height | Font |
|------|------|--------|-------------|------|
| Display XL | 48px | 400 | 1.1 | DM Serif Display |
| Display L | 36px | 400 | 1.15 | DM Serif Display |
| Heading 1 | 24px | 700 | 1.3 | DM Sans |
| Heading 2 | 18px | 600 | 1.4 | DM Sans |
| Body | 15px | 400 | 1.6 | DM Sans |
| Small | 13px | 400 | 1.5 | DM Sans |
| Label | 11px | 500 | 1.4 | JetBrains Mono (uppercase, 2px tracking) |
| Data | 13px | 400 | 1.4 | JetBrains Mono |

### Google Fonts Import

```
https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&display=swap
```

---

## 03. Component Patterns

### Status Badges

All badges use pill shape (full border-radius), monospace font, 11px uppercase with 1px letter-spacing.

- **Site Ready:** Green bg `#E8F5E9`, green text `#2D6A4F`, green dot
- **Verifying:** Amber bg `#FFF8E1`, dark amber text `#7A6200`, amber dot
- **Pending:** Blue bg `#E3F2FD`, blue text `#1565C0`, blue dot
- **Non-Compliant:** Red bg `#FFEBEE`, red text `#9B2226`, red dot

### Buttons

- **Primary:** `forest-700` bg, white text, `forest-800` on hover
- **Secondary:** White bg, `forest-700` border + text
- **Accent:** `copper-500` bg, white text (use sparingly — CTAs, assign-to-site, urgent actions)
- **Ghost:** Transparent, `neutral-200` border, `neutral-600` text

### Cards

- White background, 1px `neutral-100` border, `radius-lg` (12px)
- Subtle shadow on hover: `0 4px 24px rgba(0,0,0,0.06)`
- Worker name: 15px DM Sans bold
- Trade/card type: 13px DM Sans, `neutral-500`
- Data fields: 11px JetBrains Mono, `neutral-400` label / `neutral-700` value

### Spacing Scale

| Token | Value |
|-------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |
| 3xl | 64px |
| 4xl | 96px |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 4px | Inputs, small elements |
| md | 8px | Buttons, badges |
| lg | 12px | Cards, modals |
| xl | 16px | Large containers, sections |
| full | 9999px | Pills, avatars |

---

## 04. Usage Rules

### Do

- Use Forest-800 (`#1B4332`) as the primary brand colour for navigation, headers, and primary surfaces.
- Use Copper-500 (`#C17F59`) sparingly for CTAs, accent highlights, and attention-drawing elements.
- Use DM Serif Display only for the brand name "Pangea" and major section headings. Keep it special.
- Use JetBrains Mono for all data values: CSCS numbers, dates, statuses, worker IDs, timestamps.
- Let green always mean "verified/safe/compliant" and red always mean "expired/danger/non-compliant."

### Don't

- Don't use forest green for error states or destructive actions.
- Don't use copper as a background fill or large surface area. It's an accent only.
- Don't use DM Serif Display for buttons, form labels, table headers, or body text.
- Don't mix data fonts. If it's a number, date, or status code, it's always monospace.
- Don't use the forest green on red backgrounds or vice versa. The complementary pair is forest + copper.

---

## 05. Voice & Tone

**Direct.** Construction people don't have time for waffle. Say what it does. Say what it costs. Say how long it takes.

**Grounded.** No jargon. No "leverage synergies." Workers use this product. Speak like a site manager, not a SaaS marketer.

**Confident.** Not arrogant. State facts. Show the data. Let the product speak.

### Examples

| Context | Good | Bad |
|---------|------|-----|
| Worker verified | "Worker verified. CSCS valid until March 2027. Ready for site." | "Congratulations! Your onboarding journey is complete! Welcome aboard!" |
| Expiry alert | "3 cards expire this month. View workers." | "Action required: Please review your upcoming certification renewals dashboard." |
| Error state | "CSCS card not readable. Upload a clearer photo." | "Oops! We had trouble processing your document. Please try again!" |
| Empty state | "No workers yet. Send your first invite." | "Your workforce management hub is empty. Begin your journey by inviting team members." |

---

## 06. Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#F0FBF4',
          100: '#D8F3DC',
          200: '#B7E4C7',
          300: '#95D5B2',
          400: '#74C69D',
          500: '#52B788',
          600: '#40916C',
          700: '#2D6A4F',
          800: '#1B4332',
          900: '#0B2118',
        },
        copper: {
          50:  '#FDF6EE',
          100: '#F5E2CE',
          200: '#EBCAAA',
          300: '#E0B08A',
          400: '#D4976F',
          500: '#C17F59',
          600: '#B47543',
          700: '#9A6339',
          800: '#7A4E2A',
          900: '#5C3A1E',
        },
        status: {
          ready:    '#2D6A4F',
          verifying:'#E09F3E',
          danger:   '#D62828',
          pending:  '#457B9D',
          expired:  '#9B2226',
        },
      },
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
}

export default config
```

---

## 07. CSS Variables (for non-Tailwind contexts)

```css
:root {
  --forest-50: #F0FBF4;
  --forest-100: #D8F3DC;
  --forest-200: #B7E4C7;
  --forest-300: #95D5B2;
  --forest-400: #74C69D;
  --forest-500: #52B788;
  --forest-600: #40916C;
  --forest-700: #2D6A4F;
  --forest-800: #1B4332;
  --forest-900: #0B2118;

  --copper-50: #FDF6EE;
  --copper-100: #F5E2CE;
  --copper-200: #EBCAAA;
  --copper-300: #E0B08A;
  --copper-400: #D4976F;
  --copper-500: #C17F59;
  --copper-600: #B47543;
  --copper-700: #9A6339;
  --copper-800: #7A4E2A;
  --copper-900: #5C3A1E;

  --neutral-950: #0A0A0A;
  --neutral-900: #1A1A1A;
  --neutral-800: #2E2E2E;
  --neutral-700: #444444;
  --neutral-600: #5C5C5C;
  --neutral-500: #777777;
  --neutral-400: #999999;
  --neutral-300: #BBBBBB;
  --neutral-200: #DDDDDD;
  --neutral-100: #EEEEEE;
  --neutral-50: #F8F9FA;

  --status-ready: #2D6A4F;
  --status-verifying: #E09F3E;
  --status-danger: #D62828;
  --status-pending: #457B9D;
  --status-expired: #9B2226;

  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

---

*Pangea Brand Guidelines v1.0 — Cold Lava AI Ltd — March 2026*
