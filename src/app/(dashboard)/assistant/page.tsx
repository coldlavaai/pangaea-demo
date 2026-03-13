import { Suspense } from 'react'
import { AssistantFullPage } from '@/components/assistant/assistant-full-page'

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground text-sm">Loading Rex...</div>}>
      <AssistantFullPage />
    </Suspense>
  )
}
