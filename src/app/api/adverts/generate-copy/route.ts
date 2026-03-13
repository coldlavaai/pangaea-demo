/**
 * POST /api/adverts/generate-copy
 *
 * Generates recruitment advert copy using Claude.
 * Body: { trade, location, rate, description? }
 * Returns: { headline, facebook_body, short_version, hashtags }
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  // Auth check: only authenticated users can generate ad copy (uses Claude API credits)
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { trade?: string; location?: string; rate?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { trade, location, rate, description } = body

  if (!trade || !location) {
    return NextResponse.json({ error: 'trade and location are required' }, { status: 400 })
  }

  const prompt = `You are writing recruitment adverts for a UK groundworks and landscaping contractor.

Job details:
- Role: ${trade}
- Location: ${location}
- Rate: ${rate || 'Competitive rate'}${description ? `\n- Additional info: ${description}` : ''}

Generate advert copy in the following JSON format (no markdown, no explanation):
{
  "headline": "Short punchy headline for the job ad (max 10 words, no emoji)",
  "facebook_body": "Full Facebook/LinkedIn post body (3-4 short paragraphs, professional but direct, mention the role and key benefits like competitive rate, immediate start if applicable, UK construction industry tone). Include the location. End with a clear call to action. No hashtags here.",
  "short_version": "Short version for Instagram/Twitter (max 150 characters, punchy, include location and role)",
  "hashtags": "5-8 relevant hashtags as a single string e.g. #Groundworker #ConstructionJobs #HiringNow #London #CSCS"
}

Use plain British English. No exclamation marks in the headline. Keep it professional but direct — this is for tradespeople.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      headline: parsed.headline ?? '',
      facebook_body: parsed.facebook_body ?? '',
      short_version: parsed.short_version ?? '',
      hashtags: parsed.hashtags ?? '',
    })
  } catch (e) {
    console.error('[generate-copy] Claude error', e)
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 500 })
  }
}
