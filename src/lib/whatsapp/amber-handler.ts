import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'
import { createShortLink } from '@/lib/whatsapp/shorten'
import { estimateDayRate } from '@/lib/pay-rates'
import { createNotification } from '@/lib/notifications/create'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const AMBER_SYSTEM_PROMPT = `You are Amber, the friendly AI recruitment assistant for the company.

You speak to potential new operatives via WhatsApp. Short, warm, conversational messages — like a real recruiter texting. No long paragraphs. Plain English.

════════════════════════════════════
OUTPUT FORMAT — ABSOLUTE RULE
════════════════════════════════════
Every single response MUST be a raw JSON object. Nothing else. No markdown, no code fences, no explanation, no apology text outside of JSON. Even if the message is rude, confusing, or you're unsure — still return JSON.

{
  "reply": "The WhatsApp message to send",
  "next_state": "the next state name",
  "extracted": { ...any data extracted... }
}

════════════════════════════════════
INTELLIGENCE RULES — READ CAREFULLY
════════════════════════════════════
1. NEVER ask for information that has already been given in this conversation. Scan the full message history before asking any question.

2. EXTRACT FROM CONTEXT. If someone says "Yes I'm a British citizen and I'm 28" while answering the RTW question — that also confirms they're over 18. Extract both, skip the age question entirely, advance to awaiting_cscs.

3. HANDLE IMPATIENCE. If someone says "I already told you" or "yes I just said" or similar — they're right. Extract the relevant data from earlier in the conversation, apologise briefly in your reply, and move on. Never make someone repeat themselves.

4. READ NATURALLY. "I'm British" = RTW confirmed. "I'm 34" = over 18 confirmed. "Yes blue card" = CSCS blue. Don't be robotic.

5. IF FRUSTRATED MESSAGE CAUSES UNCERTAINTY — default to extracting a positive confirmation and advancing the state rather than falling back.

════════════════════════════════════
INTAKE FLOW
════════════════════════════════════

state: "start"
→ Warm greeting. Introduce as Amber. Ask if they're looking for work.
→ next_state: "awaiting_rtw"

state: "awaiting_rtw"
→ Ask if they have the legal right to work in the UK (UK/Irish passport, or Home Office share code).
→ YES (British/Irish/UK citizen, has passport, has share code, etc.): extracted: { rtw_confirmed: true }, next_state: "awaiting_age"
  → BUT FIRST: if they also mentioned their age in this message (e.g. "Yes I'm British and I'm 25"), also extract { age_confirmed: true } and go straight to next_state: "awaiting_cscs" — skip the age question.
→ NO: next_state: "rejected", reply we can only take UK work-authorised operatives, wish them well.
→ Unclear: ask again, next_state: "awaiting_rtw"

state: "awaiting_age"
→ FIRST: check if their age was already mentioned anywhere in the conversation. If yes (e.g. they said "I'm 34"), skip asking — just extract { age_confirmed: true } and move to next_state: "awaiting_cscs".
→ If genuinely unknown: ask if they're 18 or over.
→ YES or age ≥ 18 confirmed: extracted: { age_confirmed: true }, next_state: "awaiting_cscs"
→ NO or under 18: next_state: "rejected", reply operatives must be 18+.
→ "I already told you" / "yes I just said" type messages: apologise briefly, extract { age_confirmed: true }, next_state: "awaiting_cscs"

state: "awaiting_cscs"
→ Ask if they have a CSCS card and what colour (green, blue, gold, black, red, or white).
→ YES with colour: extracted: { cscs_card: true, cscs_colour: "blue" }, next_state: "awaiting_trade"
→ YES but no colour mentioned: ask what colour, next_state: "awaiting_cscs"
→ NO CSCS: extracted: { cscs_card: false }, next_state: "awaiting_trade"

state: "awaiting_trade"
→ Ask their main trade or skill (e.g. groundworker, labourer, plant operator, landscaper, fencer, bricklayer).
→ Extract trade: extracted: { trade: "groundworker" }, next_state: "awaiting_experience"

state: "awaiting_experience"
→ Ask how many years of experience they have as a [trade from intake_data].
→ Amber says: "Nice one! How many years of experience do you have as a [trade]?"
→ Extract an integer from natural language: "about 5 years" → 5, "just started" → 0, "15+" → 15, "a couple" → 2, "over 10" → 10
→ extracted: { experience_years: <integer> }, next_state: "awaiting_name"

state: "awaiting_name"
→ Ask for their full name.
→ Extract first and last name: extracted: { first_name: "...", last_name: "..." }, next_state: "awaiting_email"
→ Reply: "Thanks [name]! Almost done — just one more thing." Keep it brief.

state: "awaiting_email"
→ Ask for their email address: "What's the best email address for us to reach you?"
→ Extract email. Validate it contains @ and a dot — if it looks invalid, ask again with next_state: "awaiting_email".
→ extracted: { email: "..." }, next_state: "docs_link_sent"
→ Reply: "Perfect — sending your upload link now..." Keep it brief.

state: "docs_link_sent"
→ Link already sent. If they ask about it: remind them to check their messages.
→ next_state: "docs_link_sent" (no change)

state: "qualified" or "rejected"
→ Reply: "Your details are already with us — the Labour Manager will be in touch shortly. 👷"
→ next_state: same (no change)

════════════════════════════════════
GENERAL RULES
════════════════════════════════════
- Never ask for bank details, NI number, or sensitive personal data.
- Off-topic or abusive messages: reply politely that you can only help with job registration.
- Keep replies under 100 words.
- Be warm and encouraging — these are real people looking for work.`

export interface AmberIntakeData {
  rtw_confirmed?: boolean
  age_confirmed?: boolean
  cscs_card?: boolean
  cscs_colour?: string
  trade?: string
  experience_years?: number
  first_name?: string
  last_name?: string
  email?: string
}

interface AmberResult {
  reply: string
  next_state: string
  extracted: AmberIntakeData
}

// Circuit breaker — protects against Claude API outages.
// In serverless (Vercel), state resets on cold start — acceptable: each cold start gets a fresh attempt.
let claudeFailCount = 0
let claudeCircuitOpen = false
let claudeCircuitOpenAt = 0
const CIRCUIT_COOLDOWN_MS = 60_000 // 1 minute before retrying after 3 consecutive failures

async function callClaudeWithBreaker(
  state: string,
  intakeData: AmberIntakeData,
  messages: { role: 'user' | 'assistant'; content: string }[],
  language = 'en'
): Promise<AmberResult> {
  if (claudeCircuitOpen) {
    if (Date.now() - claudeCircuitOpenAt > CIRCUIT_COOLDOWN_MS) {
      claudeCircuitOpen = false // Half-open: allow one attempt through
      console.log('[amber] Circuit breaker half-open — retrying Claude')
    } else {
      console.warn('[amber] Circuit breaker open — returning fallback without calling Claude')
      return {
        reply: "Hi! We're experiencing a brief delay. the Labour Manager will follow up with you shortly. 👷",
        next_state: state,
        extracted: {},
      }
    }
  }

  try {
    const result = await callClaude(state, intakeData, messages, language)
    claudeFailCount = 0 // Reset on success
    return result
  } catch (err) {
    claudeFailCount++
    console.error('[amber] Claude API error, fail count:', claudeFailCount, err)
    if (claudeFailCount >= 3) {
      claudeCircuitOpen = true
      claudeCircuitOpenAt = Date.now()
      console.error('[amber] Circuit breaker opened after 3 consecutive failures')
    }
    return {
      reply: "Sorry, I'm having a moment! the Labour Manager will message you shortly. 👷",
      next_state: state,
      extracted: {},
    }
  }
}

async function callClaude(
  state: string,
  intakeData: AmberIntakeData,
  recentMessages: { role: 'user' | 'assistant'; content: string }[],
  language = 'en'
): Promise<AmberResult> {
  // State context goes in the system prompt — not as messages.
  // Injecting it as [user, assistant] priming messages caused consecutive same-role
  // violations when combined with conversation history, breaking Claude's output.
  const languageName = LANGUAGE_NAMES[language]
  const languageInstruction = languageName
    ? `\nLANGUAGE: Respond in ${languageName}. All your "reply" values must be in ${languageName}.`
    : ''

  // On first message (state=start), instruct Claude to detect language
  const langDetectionInstruction = state === 'start'
    ? `\nLANGUAGE DETECTION: Detect the language of the incoming message. Include "language": "en"|"ro"|"pl"|"bg" in extracted (default "en" if unclear or other language).`
    : ''

  const system = `${AMBER_SYSTEM_PROMPT}${languageInstruction}${langDetectionInstruction}

---
CURRENT INTAKE STATE: ${state}
DATA COLLECTED SO FAR: ${JSON.stringify(intakeData)}
---
You MUST respond with raw JSON only. No markdown, no code fences, no explanation.`

  // Ensure messages start with 'user' — drop any leading assistant messages
  let msgs: { role: 'user' | 'assistant'; content: string }[] = [...recentMessages]
  while (msgs.length > 0 && msgs[0].role !== 'user') {
    msgs = msgs.slice(1)
  }
  if (msgs.length === 0) {
    msgs = [{ role: 'user', content: '[start]' }]
  }

  let text = ''
  try {
    const response = await anthropic.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system,
        messages: msgs as Anthropic.Messages.MessageParam[],
      },
      { timeout: 10_000 } // 10s — Twilio webhook times out at 15s
    )
    text = response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && (err.message.includes('timeout') || err.message.includes('timed out') || (err as NodeJS.ErrnoException).code === 'ETIMEDOUT')
    console.error('[amber] Claude API error:', isTimeout ? 'timeout' : err)
    return {
      reply: isTimeout
        ? "Bear with me a second — just thinking that one through 👷 Send your message again if I don't reply in a moment!"
        : "Something went a bit wrong on my end — can you send that again? 👷",
      next_state: state,
      extracted: {},
    }
  }

  // Try to parse JSON — first strip code fences, then try to find JSON object anywhere in response
  const stripped = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  // Attempt 1: clean stripped text
  try {
    return JSON.parse(stripped) as AmberResult
  } catch { /* continue */ }

  // Attempt 2: extract first {...} block from response (handles preamble/postamble text)
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) {
    try {
      return JSON.parse(match[0]) as AmberResult
    } catch { /* continue */ }
  }

  // Hard fallback — preserve state, generic holding message
  console.error('[amber] JSON parse failed, raw response:', text.slice(0, 200))
  return {
    reply: "Sorry, just a sec — something went a bit slow on my end. Can you send that again? 👷",
    next_state: state,
    extracted: {},
  }
}

const LANGUAGE_NAMES: Record<string, string> = {
  ro: 'Romanian',
  pl: 'Polish',
  bg: 'Bulgarian',
}

interface HandleAmberParams {
  supabase: SupabaseClient
  threadId: string
  intakeState: string | null
  intakeData: AmberIntakeData
  messageBody: string
  fromPhone: string
  orgId: string
  language?: string | null
}

export async function handleAmberIntake({
  supabase,
  threadId,
  intakeState,
  intakeData,
  messageBody,
  fromPhone,
  orgId,
  language,
}: HandleAmberParams): Promise<string> {
  const currentLang = language ?? 'en'
  const knownStates = ['start', 'awaiting_rtw', 'awaiting_age', 'awaiting_cscs', 'awaiting_trade', 'awaiting_experience', 'awaiting_name', 'awaiting_email', 'docs_link_sent', 'qualified', 'rejected']
  const rawState = intakeState ?? 'start'
  const state = knownStates.includes(rawState) ? rawState : 'start'

  if (state !== rawState) {
    console.warn('[amber] unknown state reset to start:', rawState)
    // Reset stale state in DB
    await supabase.from('message_threads').update({ intake_state: null, intake_data: {} }).eq('id', threadId)
  }

  // Terminal states — just acknowledge
  if (state === 'qualified' || state === 'rejected') {
    return "Your details are already with us — the Labour Manager will be in touch shortly. 👷"
  }

  if (state === 'docs_link_sent') {
    return "Hi! Your upload link has already been sent — check your recent messages. If you have any issues, the Labour Manager will be in touch. 👷"
  }

  // Fetch previous conversation for context (last 9 messages)
  const { data: recentMsgs } = await supabase
    .from('messages')
    .select('direction, body')
    .eq('thread_id', threadId)
    .not('body', 'is', null)
    .order('created_at', { ascending: false })
    .limit(9)

  const history: { role: 'user' | 'assistant'; content: string }[] = (recentMsgs ?? [])
    .reverse()
    .map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body as string,
    }))

  // The inbound message is saved to DB before Amber is called, so it may already
  // appear as the last item in history. Don't append it again or Claude gets two
  // consecutive user messages which breaks the conversation structure.
  const lastHistoryMsg = history[history.length - 1]
  const alreadyInHistory = lastHistoryMsg?.role === 'user' && lastHistoryMsg?.content === messageBody
  const conversationHistory = alreadyInHistory
    ? history
    : [...history, { role: 'user' as const, content: messageBody }]

  console.log('[amber] calling Claude, state:', state, 'lang:', currentLang)
  const result = await callClaudeWithBreaker(state, intakeData, conversationHistory, currentLang)
  console.log('[amber] Claude replied, next_state:', result.next_state, 'reply:', result.reply.slice(0, 80))

  const updatedData: AmberIntakeData = { ...intakeData, ...result.extracted }

  // Persist detected language (only on first message — extracted.language set by Claude)
  const detectedLang = (result.extracted as Record<string, unknown>).language as string | undefined
  const resolvedLang = detectedLang && detectedLang !== 'en' ? detectedLang : currentLang

  // Update thread state + language
  await supabase
    .from('message_threads')
    .update({
      intake_state: result.next_state,
      intake_data: updatedData as Record<string, unknown>,
      language: resolvedLang,
    })
    .eq('id', threadId)

  // Transition to docs_link_sent — create operative + generate upload link
  if (result.next_state === 'docs_link_sent' && state !== 'docs_link_sent') {
    const uploadUrl = await createOperativeAndSendLink({ supabase, orgId, fromPhone, intakeData: updatedData })
    if (uploadUrl) {
      const firstName = updatedData.first_name ?? 'there'
      const hasCSCS = updatedData.cscs_card === true
      return `Thanks ${firstName}! 👷 Here's your document upload link — it's valid for 24 hours:\n\n${uploadUrl}\n\n📄 You'll need:\n• Passport or UK driving licence${hasCSCS ? '\n• Your CSCS card' : ''}\n\nTakes about 2 minutes on your phone. Once done, the Labour Manager will review and be in touch within 1 working day.`
    }
  }

  return result.reply
}

// Returns the upload URL on success, null on failure
async function createOperativeAndSendLink({
  supabase,
  orgId,
  fromPhone,
  intakeData,
}: {
  supabase: SupabaseClient
  orgId: string
  fromPhone: string
  intakeData: AmberIntakeData
}): Promise<string | null> {
  // Match trade to trade_categories if possible
  let tradeCategoryId: string | null = null
  if (intakeData.trade) {
    const { data: tradeMatch } = await supabase
      .from('trade_categories')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('name', `%${intakeData.trade}%`)
      .limit(1)
      .maybeSingle()
    tradeCategoryId = tradeMatch?.id ?? null
  }

  const cscsCardType = intakeData.cscs_card && intakeData.cscs_colour
    ? intakeData.cscs_colour as string
    : null

  // Generate a secure upload token
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

  const { data: operative, error } = await supabase
    .from('operatives')
    .insert({
      organization_id: orgId,
      first_name: intakeData.first_name ?? 'Unknown',
      last_name: intakeData.last_name ?? '',
      phone: fromPhone,
      email: intakeData.email ?? null,
      experience_years: intakeData.experience_years ?? null,
      status: 'pending_docs',
      source: 'Direct',
      entry_source: 'sophie',
      rtw_verified: false,
      trade_category_id: tradeCategoryId,
      cscs_card_type: cscsCardType,
      document_upload_token: token,
      document_upload_token_expires_at: expiresAt,
      notes: `Registered via WhatsApp intake (Amber). Trade: ${intakeData.trade ?? 'unknown'}. CSCS: ${intakeData.cscs_card ? intakeData.cscs_colour : 'none'}. Experience: ${intakeData.experience_years != null ? `${intakeData.experience_years} yrs` : 'unknown'}.`,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[amber] operative create error', error)
    return null
  }

  // Estimate day rate from CSCS colour + experience years
  const estimated = estimateDayRate(intakeData.cscs_colour, intakeData.experience_years ?? 0)

  // Update operative with estimated rate + inferred grade
  await supabase
    .from('operatives')
    .update({
      day_rate: estimated.dayRate,
      hourly_rate: estimated.hourlyRate,
      grade: estimated.grade as 'skilled' | 'highly_skilled' | 'exceptional_skill' | 'specialist_skill' | 'engineer' | 'manager' | 'senior_manager' | 'contracts_manager' | 'project_manager',
      rate_status: 'estimated',
    })
    .eq('id', operative.id)

  // Insert pay rate history row
  await supabase
    .from('operative_pay_rates')
    .insert({
      organization_id: orgId,
      operative_id: operative.id,
      day_rate: estimated.dayRate,
      hourly_rate: estimated.hourlyRate,
      grade: estimated.grade,
      quartile: estimated.quartile,
      rate_type: 'estimated',
      rationale: estimated.rationale,
    })

  // Link operative to thread
  await supabase
    .from('message_threads')
    .update({ operative_id: operative.id })
    .eq('organization_id', orgId)
    .eq('phone_number', fromPhone)

  const fullUrl = `${(process.env.NEXT_PUBLIC_APP_URL ?? '').trim()}/apply/${token}`
  const uploadUrl = await createShortLink(fullUrl)
  console.log('[amber] operative created:', operative.id, 'grade:', estimated.grade, 'day rate: £', estimated.dayRate, 'upload url:', uploadUrl)

  // Notify BOS — new operative completed intake, docs link sent
  const firstName = intakeData.first_name ?? 'Unknown'
  const lastName = intakeData.last_name ?? ''
  const trade = intakeData.trade ?? 'unknown trade'
  const exp = intakeData.experience_years != null ? `${intakeData.experience_years}yr exp` : null
  await createNotification(supabase, {
    type: 'application_complete',
    title: `New Operative: ${firstName} ${lastName}`,
    body: [trade, exp].filter(Boolean).join(' · ') + ' · Docs link sent',
    severity: 'info',
    operative_id: operative.id,
    link_url: `/operatives/${operative.id}`,
    push: true,
  })

  return uploadUrl
}
