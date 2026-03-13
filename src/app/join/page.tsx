import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ token?: string }>
}

// Clean invite URL: pangaea-demo.vercel.app/join?token=...
// Redirects to Supabase verify endpoint so the ugly supabase.co URL is never seen
export default async function JoinPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) redirect('/')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pangaea-demo.vercel.app'

  const verifyUrl = `${supabaseUrl}/auth/v1/verify?token=${token}&type=invite&redirect_to=${appUrl}`

  redirect(verifyUrl)
}
