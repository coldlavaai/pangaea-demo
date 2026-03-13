import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OperativeRow = Record<string, any>

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('operatives')
    .select('*')
    .eq('document_upload_token', token)
    .eq('organization_id', ORG_ID)
    .maybeSingle()

  const operative = data as OperativeRow | null

  if (error || !operative) {
    // Return same shape + status for not-found and expired to prevent token enumeration
    return NextResponse.json({ valid: false }, { status: 404 })
  }

  const expiresAt: string | null = operative.document_upload_token_expires_at ?? null
  if (!expiresAt || new Date(expiresAt) < new Date()) {
    // Same 404 as not-found to prevent token enumeration
    return NextResponse.json({ valid: false }, { status: 404 })
  }

  const intakeData = (operative.intake_data as Record<string, unknown>) ?? {}
  const hasCSCS = intakeData.cscs_card === true

  return NextResponse.json({
    valid: true,
    firstName: operative.first_name as string,
    hasCSCS,
    expiresAt,
  })
}
