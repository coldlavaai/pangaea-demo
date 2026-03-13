'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload } from 'lucide-react'
import type { Database } from '@/types/database'

type DocumentType = Database['public']['Enums']['document_type']

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'right_to_work', label: 'Right to Work' },
  { value: 'photo_id', label: 'Photo ID' },
  { value: 'cscs_card', label: 'CSCS Card' },
  { value: 'cpcs_ticket', label: 'CPCS Ticket' },
  { value: 'npors_ticket', label: 'NPORS Ticket' },
  { value: 'lantra_cert', label: 'Lantra Certificate' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'asbestos_awareness', label: 'Asbestos Awareness' },
  { value: 'chainsaw_cs30', label: 'Chainsaw CS30' },
  { value: 'chainsaw_cs31', label: 'Chainsaw CS31' },
  { value: 'cv', label: 'CV' },
  { value: 'other', label: 'Other' },
]

// Types with expiry dates
const EXPIRY_TYPES = new Set<DocumentType>([
  'right_to_work', 'cscs_card', 'cpcs_ticket', 'npors_ticket',
  'lantra_cert', 'first_aid', 'asbestos_awareness', 'chainsaw_cs30', 'chainsaw_cs31',
])

const uploadSchema = z.object({
  document_type: z.enum([
    'right_to_work', 'photo_id', 'cscs_card', 'cpcs_ticket', 'npors_ticket',
    'lantra_cert', 'first_aid', 'asbestos_awareness', 'chainsaw_cs30', 'chainsaw_cs31',
    'cv', 'other',
  ] as const),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
  rtw_share_code: z.string().optional(),
})

type UploadValues = z.infer<typeof uploadSchema>

interface DocumentUploadFormProps {
  operativeId: string
  operativeName: string
}

export function DocumentUploadForm({ operativeId }: DocumentUploadFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const orgId = process.env.NEXT_PUBLIC_ORG_ID!

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [parsingCV, setParsingCV] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { document_type: 'right_to_work' },
  })

  const docType = watch('document_type') as DocumentType
  const showExpiry = EXPIRY_TYPES.has(docType)
  const showShareCode = docType === 'right_to_work'

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFileError(null)
    if (f && f.size > 10 * 1024 * 1024) {
      setFileError('File must be under 10MB')
      setFile(null)
      return
    }
    setFile(f)
  }

  const onSubmit = async (values: UploadValues) => {
    if (!file) {
      setFileError('Please select a file')
      return
    }

    setUploading(true)
    setError(null)
    setProgress(10)

    try {
      // Upload to Supabase Storage
      const ext = file.name.split('.').pop()
      const storageKey = `${orgId}/${operativeId}/${values.document_type}/${Date.now()}.${ext}`

      const { error: storageErr } = await supabase.storage
        .from('operative-documents')
        .upload(storageKey, file, { cacheControl: '3600', upsert: false })

      if (storageErr) throw new Error(`Upload failed: ${storageErr.message}`)
      setProgress(60)

      // Get signed URL for immediate viewing (1 hour)
      const { data: urlData } = await supabase.storage
        .from('operative-documents')
        .createSignedUrl(storageKey, 3600)

      setProgress(80)

      // Insert document record
      const { data: doc, error: dbErr } = await supabase
        .from('documents')
        .insert({
          organization_id: orgId,
          operative_id: operativeId,
          document_type: values.document_type,
          file_name: file.name,
          file_key: storageKey,
          file_url: urlData?.signedUrl ?? null,
          expiry_date: values.expiry_date || null,
          notes: values.notes || null,
          rtw_share_code: values.rtw_share_code || null,
          status: 'pending',
        })
        .select('id')
        .single()

      if (dbErr || !doc) throw new Error(dbErr?.message ?? 'Failed to save document')

      setProgress(100)

      // If CV, trigger AI parsing before redirecting
      if (values.document_type === 'cv') {
        setParsingCV(true)
        try {
          await fetch(`/api/operatives/${operativeId}/parse-cv`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: doc.id }),
          })
        } catch {
          // Parsing failure doesn't block the upload
        }
        setParsingCV(false)
      }

      router.push(`/operatives/${operativeId}?tab=overview`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {/* Document type */}
      <div>
        <Label htmlFor="document_type">Document Type *</Label>
        <select
          id="document_type"
          {...register('document_type')}
          className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {DOC_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {errors.document_type && (
          <p className="text-xs text-destructive mt-1">{errors.document_type.message}</p>
        )}
      </div>

      {/* CV hint */}
      {docType === 'cv' && (
        <div className="rounded-lg border border-forest-800/50 bg-forest-950/30 px-4 py-3 text-xs text-forest-400">
          Upload a PDF or image of the CV — AI will automatically extract work history and populate the profile.
        </div>
      )}

      {/* File picker */}
      <div>
        <Label htmlFor="file">File * <span className="text-muted-foreground font-normal">(PDF, JPG, PNG — max 10MB)</span></Label>
        <Input
          id="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFile}
          className="mt-1"
        />
        {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
        {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
      </div>

      {/* Expiry date — shown for relevant types */}
      {showExpiry && (
        <div>
          <Label htmlFor="expiry_date">Expiry Date</Label>
          <Input id="expiry_date" type="date" {...register('expiry_date')} className="mt-1" />
        </div>
      )}

      {/* Share code — RTW only */}
      {showShareCode && (
        <div>
          <Label htmlFor="rtw_share_code">Share Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="rtw_share_code" {...register('rtw_share_code')} placeholder="e.g. W6WE3N" className="mt-1 uppercase" />
        </div>
      )}

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="notes" {...register('notes')} className="mt-1" />
      </div>

      {/* Progress / parsing status */}
      {uploading && progress > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {parsingCV ? 'Parsing CV with AI — extracting work history…' : 'Uploading…'}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={uploading || parsingCV}>
          {uploading || parsingCV ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {parsingCV ? 'Parsing CV…' : 'Upload Document'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/operatives/${operativeId}?tab=documents`)}
          disabled={uploading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
