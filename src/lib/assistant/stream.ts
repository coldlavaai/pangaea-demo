import type { SSEEvent } from './types'

export function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export function createSSEStream(): {
  stream: ReadableStream<Uint8Array>
  emit: (event: SSEEvent) => void
  close: () => void
} {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })

  return {
    stream,
    emit(event: SSEEvent) {
      try {
        controller.enqueue(encoder.encode(encodeSSE(event)))
      } catch {
        // Stream already closed
      }
    },
    close() {
      try {
        controller.close()
      } catch {
        // Already closed
      }
    },
  }
}
