import { redirect } from 'next/navigation'

// Root route — middleware handles auth, but redirect here as a fallback.
export default function RootPage() {
  redirect('/dashboard')
}
