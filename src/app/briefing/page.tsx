export default function BriefingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <div className="border-b border-slate-800 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Pangaea</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">BOS — Director Briefing</h1>
          <p className="text-slate-400">5 March 2026 · Prepared by Cold Lava</p>
        </div>

        {/* Section 1 — What's Live */}
        <section>
          <SectionTitle number="1" title="What's Live Right Now" />
          <p className="text-slate-400 mb-4 text-sm">Everything below is built, deployed, and running in production.</p>

          <SubTitle>Core Platform</SubTitle>
          <Table rows={[
            ['Operatives', 'Full profiles — trade, CSCS, RTW, RAP score, work history, documents, allocations'],
            ['Sites', 'Site records, contacts, active/inactive status'],
            ['Labour Requests', 'Duration-based requests with headcount, skills, rate'],
            ['Allocations', 'Offer broadcast to top 3 operatives, 30-min window, first YES wins'],
            ['Shifts + Timesheets', 'Shift logging, timesheet approval, PDF export'],
            ['NCRs', 'Non-conformance reports — type, severity, site, operative, resolution'],
            ['Documents', 'Upload, Vision AI verification, expiry tracking, verify/reject workflow'],
            ['Reports', '5 sections (compliance, labour, NCR, RAP, timesheets) + CSV export'],
            ['Audit Trail', 'Every action logged — who, what, when'],
          ]} />

          <SubTitle>Compliance Engine</SubTitle>
          <ul className="space-y-1.5 text-sm text-slate-300 list-none">
            <Li>Blocks allocations automatically if operative has expired CSCS, no RTW, blocked status, or WTD violation</Li>
            <Li>Compliance cron runs daily — flags expired docs, expiring within 7/30 days, unverified RTW</Li>
            <Li>Working Time Directive enforcement — tracks 48hr weekly limit and rest periods</Li>
          </ul>

          <SubTitle>Amber AI (WhatsApp Recruitment)</SubTitle>
          <ul className="space-y-1.5 text-sm text-slate-300">
            <Li>24/7 candidate intake via WhatsApp — no human involvement needed</Li>
            <Li>7-step qualification: RTW eligibility → age → CSCS → trade → experience → name → email</Li>
            <Li>Auto-creates operative record in BOS when complete, sends document upload link</Li>
            <Li>Vision AI reads and verifies uploaded ID and CSCS cards automatically</Li>
            <Li>CV upload with Claude AI parsing — extracts work history, trade, experience, estimated day rate</Li>
          </ul>

          <SubTitle>Notifications + Activity Feed</SubTitle>
          <ul className="space-y-1.5 text-sm text-slate-300">
            <Li>Real-time notification bell in the dashboard header</Li>
            <Li>Activity feed showing 17 event types — arrivals, NCRs, offers, documents, emails, compliance</Li>
            <Li>Every outgoing email logged and visible in the activity feed</Li>
          </ul>
        </section>

        {/* Section 2 — The Two Bots */}
        <section>
          <SectionTitle number="2" title="The Two Bots" />

          <SubTitle>@PangaeaSiteBot — for Site Managers</SubTitle>
          <p className="text-sm text-slate-400 mb-3">JJ and other site managers use this daily. Menu-driven — tap buttons, no typing required.</p>
          <Table rows={[
            ['Log arrival', 'Select operative from list → confirms on site, timestamps in BOS'],
            ['Log NCR', 'Select type → severity → describe → saved to BOS instantly'],
            ['RAP report', 'Rate operative 1–5 on Reliability, Attitude, Performance'],
            ['Request labour', 'Submit a labour request directly from site'],
            ['Finish operative', 'Mark end of allocation from site'],
          ]} />

          <SubTitle>@RexNotifyBot — for Admins (Liam, Donna)</SubTitle>
          <p className="text-sm text-slate-400 mb-3">Real-time push notifications and on-demand queries.</p>
          <Table rows={[
            ['Unread', 'All unread notifications'],
            ['Recent', 'Last 10 platform events'],
            ['NCRs', 'Open NCRs with operative name, severity, description, direct link'],
            ['Requests', 'Open labour requests'],
            ['Status', 'Live platform snapshot'],
            ['Mark read', 'Clears notification queue'],
          ]} />
        </section>

        {/* Section 3 — Not Built Yet */}
        <section>
          <SectionTitle number="3" title="Phase 2 — What's Coming Next" />
          <p className="text-slate-400 mb-4 text-sm">In scope, prioritised for next phase.</p>
          <Table rows={[
            ['Equipment cert gating', 'Block allocation if operative\'s CPCS/NPORS/chainsaw cert is expired'],
            ['Location matching', 'Operative home address vs site postcode — travel distance flag'],
            ['Gov.uk RTW API', 'Live right-to-work verification against UKVI'],
            ['Two-factor authentication', 'Supabase TOTP — ready to enable, not configured yet'],
            ['Rate matrices', 'Automated day-rate governance per trade and grade'],
            ['Reallocation queue', 'When offer expires, auto-try next operative in queue'],
            ['Multi-language Amber', 'Romanian, Polish, Bulgarian intake flows'],
            ['Donseed integration', 'Timesheet sync — awaiting API credentials'],
          ]} />
        </section>

        {/* Section 4 — Additions Beyond Spec */}
        <section>
          <SectionTitle number="4" title="Additions Beyond the Original Spec" />
          <p className="text-slate-400 mb-4 text-sm">Built proactively — added value beyond what was scoped.</p>
          <Table rows={[
            ['@RexNotifyBot', 'Admins get push notifications to their phone the moment something happens — no need to be logged in'],
            ['Activity feed (17 event types)', 'Helicopter view of everything in one timeline — WhatsApp, docs, offers, compliance, emails'],
            ['WYSIWYG email template editor', 'Liam and Donna can edit invite email copy directly with live preview. No developer needed'],
            ['Microsoft Outlook integration', 'Invite emails come from a real company address — better deliverability, professional appearance'],
            ['CV upload + AI parsing', 'Upload a CV → Claude AI extracts work history, trade, experience, and estimated day rate'],
            ['Short URL system', 'Upload links use your own domain, not TinyURL — looks professional, no third-party dependency'],
            ['Timesheet PDF export', 'One-click PDF of any timesheet, ready to send to payroll'],
            ['Dashboard compliance panel', 'Live counts of expired docs, expiring docs, blocked operatives — clickable, drill-down'],
          ]} />
        </section>

        {/* Section 5 — Telegram vs WhatsApp */}
        <section>
          <SectionTitle number="5" title="Why Telegram for Internal — WhatsApp for Operatives" />
          <p className="text-slate-400 mb-6 text-sm">The most common question. Here is the full answer.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-5">
              <h3 className="font-semibold text-emerald-400 mb-2">WhatsApp → Operatives</h3>
              <p className="text-sm text-slate-300">Every operative in UK construction already has WhatsApp. No app download, no friction. Amber runs 24/7 on it. Offer messages, document alerts, and reminders all reach operatives on the channel they already check.</p>
            </div>
            <div className="rounded-lg border border-sky-800 bg-sky-950/30 p-5">
              <h3 className="font-semibold text-sky-400 mb-2">Telegram → Internal (Admins + Site Managers)</h3>
              <p className="text-sm text-slate-300">Purpose-built for automation. Free, instant, no template approval. Lets us build proper button menus and push any notification type without Meta&apos;s restrictions.</p>
            </div>
          </div>

          <SubTitle>Why WhatsApp Business API can&apos;t do what we need internally</SubTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">Constraint</th>
                  <th className="text-left py-2.5 pr-4 text-slate-400 font-medium">WhatsApp Business API</th>
                  <th className="text-left py-2.5 text-slate-400 font-medium">Telegram</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  ['Message templates', 'Every outbound message needs pre-approved template. Takes days, can be rejected.', 'No restrictions. Send anything, anytime.'],
                  ['Session window', 'Can only reply freely within 24hrs of last inbound. Outside that, templates only.', 'No session window. Message anytime.'],
                  ['Interactive menus', 'Very limited — max 10 items, pre-approved, no custom keyboards.', 'Full custom keyboards, inline buttons, persistent docks — unlimited.'],
                  ['Bot functionality', 'No callback queries, no proper state machines.', 'Full bot API — callbacks, inline keyboards, webhooks, state.'],
                  ['Cost per message', '£0.03–£0.08 per message', 'Free'],
                ].map(([constraint, wa, tg]) => (
                  <tr key={constraint}>
                    <td className="py-2.5 pr-4 text-slate-300 font-medium align-top">{constraint}</td>
                    <td className="py-2.5 pr-4 text-red-400 align-top">{wa}</td>
                    <td className="py-2.5 text-emerald-400 align-top">{tg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h4 className="font-semibold text-slate-200 mb-3">The strategic picture</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <Li>If we&apos;d used WhatsApp for internal comms, every notification type (arrival, NCR, offer accepted, doc uploaded) would require a separate Meta template approval. That&apos;s months of friction and ongoing restrictions on what we can send.</Li>
              <Li>A site manager opening @PangaeaSiteBot gets a <strong className="text-white">menu of buttons</strong> — Log Arrival, Log NCR, RAP Report. They tap, they don&apos;t type. WhatsApp cannot do this.</Li>
              <Li>Liam gets a <strong className="text-white">real-time push DM</strong> the moment an operative arrives or an NCR is logged. No templates, no approval, no delay.</Li>
              <Li>The two channels work together: site manager logs arrival on Telegram → Liam gets push notification on Telegram → operative&apos;s WhatsApp gets update if needed.</Li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-6 text-center">
          <p className="text-slate-500 text-sm">Live system: <a href="https://pangaea-demo.vercel.app" className="text-emerald-500 hover:text-emerald-400">pangaea-demo.vercel.app</a></p>
          <p className="text-slate-600 text-xs mt-1">Prepared by Cold Lava · AI automation &amp; systems for construction</p>
        </div>

      </div>
    </div>
  )
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{number}</span>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
    </div>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mt-6 mb-3">{children}</h3>
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
      <span>{children}</span>
    </li>
  )
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden mb-4">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-800">
          {rows.map(([label, desc]) => (
            <tr key={label} className="hover:bg-slate-900/50 transition-colors">
              <td className="py-2.5 px-4 font-medium text-slate-200 w-48 shrink-0 align-top">{label}</td>
              <td className="py-2.5 px-4 text-slate-400 align-top">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
