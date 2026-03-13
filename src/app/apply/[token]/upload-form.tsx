'use client'

import { useState, useRef } from 'react'

interface UploadFormProps {
  token: string
  firstName: string
  hasCSCS: boolean
  workflowDocType?: string  // When set: workflow chase mode (no address, targeted doc slot only)
}

const WORKFLOW_DOC_CONFIG: Record<string, { label: string; sublabel: string }> = {
  passport:         { label: 'Passport', sublabel: 'Photo page visible, all edges in frame, expiry date readable.' },
  right_to_work:    { label: 'Right to Work document', sublabel: 'Passport, biometric residence permit, or share code screenshot.' },
  photo_id:         { label: 'Passport or UK Driving Licence', sublabel: 'All four edges visible, text clearly readable, expiry date shown.' },
  cscs_card:        { label: 'CSCS Card (front)', sublabel: 'Card colour, card number, and expiry date must be visible.' },
  cpcs_ticket:      { label: 'CPCS Ticket', sublabel: 'Both sides if applicable. All text must be readable.' },
  npors_ticket:     { label: 'NPORS Ticket', sublabel: 'Both sides if applicable. All text must be readable.' },
  first_aid:        { label: 'First Aid Certificate', sublabel: 'Issuing body, your name, and expiry date must be visible.' },
  other:            { label: 'Document', sublabel: 'Please ensure all relevant details are clearly visible.' },
}

interface FilePreview {
  file: File
  url: string
  name: string
}

function FileSlot({
  label,
  sublabel,
  accept,
  value,
  onChange,
  error,
}: {
  label: string
  sublabel: string
  accept: string
  value: FilePreview | null
  onChange: (f: FilePreview | null) => void
  error?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onChange({ file, url: URL.createObjectURL(file), name: file.name })
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>
      </div>

      <div
        onClick={() => ref.current?.click()}
        className={`
          relative border rounded-lg p-4 cursor-pointer transition-all
          ${error ? 'border-red-600 bg-red-950/20' :
            value ? 'border-emerald-700 bg-emerald-950/20' :
            'border-slate-700 bg-slate-800/50 hover:border-slate-500'}
        `}
      >
        {value ? (
          <div className="flex items-center gap-3">
            {value.file.type.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt="preview" className="w-14 h-14 object-cover rounded-md border border-slate-700 shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-slate-700 rounded-md flex items-center justify-center text-xl shrink-0">📄</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 text-sm font-medium">✓ Selected</p>
              <p className="text-slate-500 text-xs truncate mt-0.5">{value.name}</p>
            </div>
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation()
                onChange(null)
                if (ref.current) ref.current.value = ''
              }}
              className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-300 text-sm font-medium">Tap to take photo or choose file</p>
              <p className="text-slate-600 text-xs mt-0.5">JPG, PNG or PDF</p>
            </div>
          </div>
        )}

        <input
          ref={ref}
          type="file"
          accept={accept}
          /* no capture attr — let user choose camera OR file picker */
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  )
}

// Compress image to max 1600px / JPEG 0.85 — keeps files well under 1MB.
// PDFs and non-images pass through unchanged.
async function compressImage(file: File): Promise<File> {
  if (file.type === 'application/pdf' || !file.type.startsWith('image/')) return file
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round((height * MAX) / width); width = MAX }
        else { width = Math.round((width * MAX) / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg', 0.85
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export default function UploadForm({ token, firstName, hasCSCS, workflowDocType }: UploadFormProps) {
  const isWorkflow = !!workflowDocType
  const docConfig = workflowDocType ? (WORKFLOW_DOC_CONFIG[workflowDocType] ?? WORKFLOW_DOC_CONFIG.other) : null

  const [idDoc, setIdDoc] = useState<FilePreview | null>(null)
  const [cscsDoc, setCSCSDoc] = useState<FilePreview | null>(null)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // In workflow mode: only require the document, no address
  const canSubmit = isWorkflow
    ? !!idDoc
    : !!idDoc && !!addressLine1.trim() && !!city.trim() && !!postcode.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    setFieldError(null)

    const [idCompressed, cscsCompressed] = await Promise.all([
      compressImage(idDoc!.file),
      cscsDoc ? compressImage(cscsDoc.file) : Promise.resolve(null),
    ])

    try {
      // Upload ID document first
      const idForm = new FormData()
      if (isWorkflow) {
        idForm.append('workflow_mode', 'true')
        if (workflowDocType) idForm.append('workflow_doc_type', workflowDocType)
      } else {
        idForm.append('address_line1', addressLine1.trim())
        idForm.append('address_line2', addressLine2.trim())
        idForm.append('city', city.trim())
        idForm.append('postcode', postcode.trim().toUpperCase())
      }
      idForm.append('id_document', idCompressed)

      const idRes = await fetch(`/api/apply/${token}/upload`, {
        method: 'POST',
        body: idForm,
      })
      const idData = await idRes.json()

      if (!idRes.ok) {
        setError(idData.error || 'Upload failed. Please try again.')
        if (idData.field) setFieldError(idData.field)
        return
      }

      // Upload CSCS card separately if provided
      if (cscsCompressed) {
        const cscsForm = new FormData()
        cscsForm.append('cscs_card', cscsCompressed)
        // Pass operativeId so the CSCS route can find the operative even after token is cleared
        if (idData.operativeId) cscsForm.append('operative_id', idData.operativeId)

        const cscsRes = await fetch(`/api/apply/${token}/upload-cscs`, {
          method: 'POST',
          body: cscsForm,
        })
        const cscsData = await cscsRes.json()

        if (!cscsRes.ok) {
          setError(cscsData.error || 'CSCS card upload failed. Please try again.')
          if (cscsData.field) setFieldError(cscsData.field)
          return
        }
      }

      setSuccess(true)
    } catch {
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700 text-2xl mx-auto">
          ✓
        </div>
        <h2 className="text-lg font-bold text-white">
          {isWorkflow ? 'Document Received' : 'Documents Received'}
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {isWorkflow
            ? `Thanks ${firstName}! We've received your ${docConfig?.label ?? 'document'}. We'll be in touch shortly.`
            : `Thanks ${firstName}. Our labour manager will review your documents and be in touch within 1–3 working days. Keep an eye on your WhatsApp!`}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Section 1: Address — Amber intake only */}
      {!isWorkflow && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold">1</span>
            <p className="text-sm font-semibold text-slate-200">Your Home Address</p>
          </div>
          <input
            type="text"
            placeholder="Address line 1 *"
            value={addressLine1}
            onChange={e => setAddressLine1(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Address line 2 (optional)"
            value={addressLine2}
            onChange={e => setAddressLine2(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Town / City *"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />
            <input
              type="text"
              placeholder="Postcode *"
              value={postcode}
              onChange={e => setPostcode(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>
      )}

      {/* Document upload slot */}
      <div className="space-y-3">
        {!isWorkflow && (
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold">2</span>
            <p className="text-sm font-semibold text-slate-200">Proof of Identity <span className="text-red-400">*</span></p>
          </div>
        )}
        <FileSlot
          label={docConfig?.label ?? 'Passport or UK Driving Licence'}
          sublabel={docConfig?.sublabel ?? 'All four edges visible, text clearly readable, expiry date shown.'}
          accept="image/*,application/pdf"
          value={idDoc}
          onChange={setIdDoc}
          error={fieldError === 'id_document'}
        />
      </div>

      {/* Section 3: CSCS Card — Amber intake only, when card was declared during intake */}
      {hasCSCS && !isWorkflow && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold">3</span>
            <p className="text-sm font-semibold text-slate-200">CSCS Card</p>
          </div>
          <FileSlot
            label="CSCS Card (front)"
            sublabel="Card colour, card number, and expiry date must be visible."
            accept="image/*,application/pdf"
            value={cscsDoc}
            onChange={setCSCSDoc}
            error={fieldError === 'cscs_card'}
          />
        </div>
      )}

      {/* Photo tips */}
      <div className="rounded-lg border border-slate-800 bg-slate-800/30 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-slate-400">Photo tips</p>
        <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
          <li>Lay the document flat on a surface</li>
          <li>Good lighting — no glare or shadows</li>
          <li>All four edges must be in frame</li>
        </ul>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className={`
          w-full py-3 rounded-lg font-semibold text-sm transition-all
          ${submitting || !canSubmit
            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
            : 'bg-[#D4AF37] hover:bg-[#c9a72f] text-slate-900 active:scale-[0.98]'
          }
        `}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying & uploading...
          </span>
        ) : 'Submit Documents'}
      </button>

      <p className="text-center text-xs text-slate-700">
        Securely stored · Pangaea team only
      </p>
    </form>
  )
}
