import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('short_links')
    .select('target_url, clicks')
    .eq('code', code)
    .single()

  if (!data) {
    return NextResponse.redirect(new URL('/', _req.url), 302)
  }

  // Increment click count — fire and forget
  supabase
    .from('short_links')
    .update({ clicks: (data.clicks ?? 0) + 1 })
    .eq('code', code)
    .then(() => {})

  return NextResponse.redirect(data.target_url, 302)
}
