'use client'

import { useState, useTransition, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import {
  Mail, Check, Copy, Save, RotateCcw, Loader2, ChevronRight,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Link2, AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Minus, Quote, Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { saveEmailTemplate, resetEmailTemplate } from '@/app/(dashboard)/settings/actions'
import {
  TEMPLATE_DEFINITIONS,
  buildInviteShell,
  buildTelegramSection,
} from '@/lib/email/template-defs'
import type { TemplateDefinition } from '@/lib/email/template-defs'

interface SavedTemplate {
  template_key: string
  subject: string
  body_html: string
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const COLOURS = [
  { label: 'White',   value: '#f9fafb' },
  { label: 'Silver',  value: '#94a3b8' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Sky',     value: '#38bdf8' },
  { label: 'Violet',  value: '#a78bfa' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Red',     value: '#f87171' },
  { label: 'Remove',  value: '' },
]

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EmailTemplatesPanel({ savedTemplates }: { savedTemplates: SavedTemplate[] }) {
  const [selected, setSelected] = useState<TemplateDefinition>(TEMPLATE_DEFINITIONS[0])

  const saved = savedTemplates.find(t => t.template_key === selected.key)
  const currentSubject = saved?.subject ?? selected.defaultSubject
  const currentBody = saved?.body_html ?? selected.defaultBodyHtml

  return (
    <div className="flex gap-0 min-h-[700px]">
      {/* Template list */}
      <div className="w-44 shrink-0 space-y-1 border-r border-border pr-4 mr-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Templates</p>
        {TEMPLATE_DEFINITIONS.map(def => (
          <button
            key={def.key}
            onClick={() => setSelected(def)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors ${
              selected.key === def.key
                ? 'bg-forest-900/30 text-forest-400 border border-forest-800/50'
                : 'text-muted-foreground hover:text-muted-foreground hover:bg-card/60 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{def.name}</span>
            </div>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        ))}
      </div>

      {/* Editor + live preview */}
      <TemplateEditor
        definition={selected}
        initialSubject={currentSubject}
        initialBody={currentBody}
        isCustomised={!!saved}
      />
    </div>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function TemplateEditor({
  definition,
  initialSubject,
  initialBody,
  isCustomised,
}: {
  definition: TemplateDefinition
  initialSubject: string
  initialBody: string
  isCustomised: boolean
}) {
  const router = useRouter()
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [isSaving, startSave] = useTransition()
  const [isResetting, startReset] = useTransition()
  const [colourPickerOpen, setColourPickerOpen] = useState(false)
  const colourRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your email content here...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TextStyle,
      Color,
    ],
    content: initialBody,
    onUpdate: ({ editor }) => setBody(editor.getHTML()),
    editorProps: { attributes: { class: 'email-editor' } },
  })

  // Close colour picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colourRef.current && !colourRef.current.contains(e.target as Node)) {
        setColourPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Re-initialise when template changes
  const [prevKey, setPrevKey] = useState(definition.key)
  if (definition.key !== prevKey) {
    setPrevKey(definition.key)
    setSubject(initialSubject)
    setBody(initialBody)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { editor?.commands.setContent(initialBody) }, [definition.key])

  const isDirty = subject !== initialSubject || body !== initialBody

  // Live preview
  const previewHtml = useMemo(() => {
    const contentHtml = definition.variables.reduce(
      (html, v) => html.replaceAll(`{{${v.key}}}`, v.example),
      body
    )
    return buildInviteShell({
      contentHtml,
      roleLabel: 'Site Manager',
      inviteLink: '#',
      appUrl: 'https://pangaea-demo.vercel.app',
      telegramSection: buildTelegramSection('site_manager', 'James'),
    })
  }, [body, definition])

  const insertVariable = (key: string) => {
    editor?.chain().focus().insertContent(`{{${key}}}`).run()
  }

  const handleSave = () => {
    startSave(async () => {
      try {
        await saveEmailTemplate(definition.key, subject, body)
        toast.success('Template saved')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed')
      }
    })
  }

  const handleReset = () => {
    startReset(async () => {
      try {
        await resetEmailTemplate(definition.key)
        setSubject(definition.defaultSubject)
        setBody(definition.defaultBodyHtml)
        editor?.commands.setContent(definition.defaultBodyHtml)
        toast.success('Reset to default')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Reset failed')
      }
    })
  }

  return (
    <div className="flex-1 min-w-0 flex gap-5">
      {/* ── Left: editor ── */}
      <div className="flex-[2] min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{definition.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{definition.description}</p>
          </div>
          {isCustomised && (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
              Customised
            </span>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Subject line</Label>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="h-9 text-sm bg-card border-border"
            placeholder="Email subject..."
          />
        </div>

        {/* Variable chips */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Variables <span className="text-muted-foreground">(click to insert at cursor)</span></p>
          <div className="flex flex-wrap gap-2">
            {definition.variables.map(v => (
              <VariableChip key={v.key} variable={v} onInsert={insertVariable} />
            ))}
          </div>
        </div>

        {/* WYSIWYG editor */}
        <div className="rounded-lg border border-border overflow-visible">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 bg-card/60 border-b border-border flex-wrap">

            {/* History */}
            <Btn onClick={() => editor?.chain().focus().undo().run()} active={false} title="Undo">
              <Undo2 className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().redo().run()} active={false} title="Redo">
              <Redo2 className="h-3.5 w-3.5" />
            </Btn>

            <Sep />

            {/* Headings */}
            <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 }) ?? false} title="Heading">
              <span className="text-[10px] font-bold leading-none">H2</span>
            </Btn>
            <Btn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 }) ?? false} title="Subheading">
              <span className="text-[10px] font-bold leading-none">H3</span>
            </Btn>

            <Sep />

            {/* Inline */}
            <Btn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold') ?? false} title="Bold">
              <Bold className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic') ?? false} title="Italic">
              <Italic className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline') ?? false} title="Underline">
              <UnderlineIcon className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike') ?? false} title="Strikethrough">
              <Strikethrough className="h-3.5 w-3.5" />
            </Btn>

            <Sep />

            {/* Alignment */}
            <Btn onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' }) ?? false} title="Align left">
              <AlignLeft className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' }) ?? false} title="Align centre">
              <AlignCenter className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' }) ?? false} title="Align right">
              <AlignRight className="h-3.5 w-3.5" />
            </Btn>

            <Sep />

            {/* Colour picker */}
            <div className="relative" ref={colourRef}>
              <Btn
                onClick={() => setColourPickerOpen(o => !o)}
                active={colourPickerOpen}
                title="Text colour"
              >
                <Palette className="h-3.5 w-3.5" />
              </Btn>
              {colourPickerOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 p-2 bg-card border border-border rounded-lg shadow-xl flex gap-1.5 flex-wrap w-[140px]">
                  {COLOURS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onMouseDown={e => {
                        e.preventDefault()
                        if (c.value) {
                          editor?.chain().focus().setColor(c.value).run()
                        } else {
                          editor?.chain().focus().unsetColor().run()
                        }
                        setColourPickerOpen(false)
                      }}
                      className="w-6 h-6 rounded-full border-2 border-border hover:border-white transition-colors flex items-center justify-center"
                      style={{ background: c.value || 'transparent' }}
                    >
                      {!c.value && <span className="text-muted-foreground text-[9px] font-bold">✕</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Sep />

            {/* Lists */}
            <Btn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList') ?? false} title="Bullet list">
              <List className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList') ?? false} title="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote') ?? false} title="Blockquote">
              <Quote className="h-3.5 w-3.5" />
            </Btn>

            <Sep />

            {/* Link + HR */}
            <Btn
              onClick={() => {
                if (editor?.isActive('link')) {
                  editor.chain().focus().unsetLink().run()
                } else {
                  const url = window.prompt('Enter URL')
                  if (url) editor?.chain().focus().setLink({ href: url }).run()
                }
              }}
              active={editor?.isActive('link') ?? false}
              title="Link"
            >
              <Link2 className="h-3.5 w-3.5" />
            </Btn>
            <Btn onClick={() => editor?.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal rule">
              <Minus className="h-3.5 w-3.5" />
            </Btn>

          </div>

          {/* Editor content */}
          <div className="email-editor bg-background">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="bg-forest-600 hover:bg-forest-500 text-white h-9 text-sm"
          >
            {isSaving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><Save className="h-3.5 w-3.5 mr-1.5" />Save changes</>}
          </Button>
          {isCustomised && (
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={isResetting}
              className="h-9 text-sm border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/50 ml-auto"
            >
              {isResetting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Reset to default</>}
            </Button>
          )}
        </div>
      </div>

      {/* ── Right: live preview ── */}
      <div className="flex-[3] min-w-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Live Preview</p>
          <p className="text-[10px] text-muted-foreground">Updates as you type · example values shown</p>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-background overflow-hidden">
          <iframe
            srcDoc={previewHtml}
            title="Email preview"
            className="w-full rounded-xl"
            style={{ height: '680px' }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function Btn({ onClick, active, title, children }: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors flex items-center justify-center min-w-[26px]',
        active ? 'bg-forest-900/50 text-forest-400' : 'text-muted-foreground hover:text-muted-foreground hover:bg-[#444444]'
      )}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-4 bg-[#444444] mx-0.5 shrink-0" />
}

// ─── Variable chip ────────────────────────────────────────────────────────────

function VariableChip({
  variable,
  onInsert,
}: {
  variable: { key: string; label: string; example: string }
  onInsert: (key: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(`{{${variable.key}}}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group relative">
      <button
        onClick={() => onInsert(variable.key)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card border border-border hover:border-forest-600/60 hover:bg-[#444444]/60 transition-colors"
        title={`Insert {{${variable.key}}} — ${variable.label}`}
      >
        <code className="text-[11px] text-forest-400 font-mono">{`{{${variable.key}}}`}</code>
        <span className="text-[10px] text-muted-foreground">{variable.label}</span>
        <button onClick={handleCopy} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {copied
            ? <Check className="h-2.5 w-2.5 text-forest-400" />
            : <Copy className="h-2.5 w-2.5 text-muted-foreground" />}
        </button>
      </button>
    </div>
  )
}
