'use client'

import { useState, useTransition } from 'react'
import { X, Send, Phone, User, Trash2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { updateUserDetails, deleteUser } from '@/app/(dashboard)/settings/actions'

interface UserEditDrawerProps {
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone_number: string | null
    telegram_chat_id: number | null
    role: string
    created_at: string | null
  }
  isCurrentUser: boolean
  onClose: () => void
  onSave: (updated: { id: string; first_name: string; last_name: string; phone_number: string | null; telegram_chat_id: number | null }) => void
  onDelete: (userId: string) => void
}

export function UserEditDrawer({ user, isCurrentUser, onClose, onSave, onDelete }: UserEditDrawerProps) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)
  const [phone, setPhone] = useState(user.phone_number ?? '')
  const [telegramId, setTelegramId] = useState(user.telegram_chat_id?.toString() ?? '')

  const isDirty =
    firstName !== user.first_name ||
    lastName !== user.last_name ||
    phone !== (user.phone_number ?? '') ||
    telegramId !== (user.telegram_chat_id?.toString() ?? '')

  const handleSave = () => {
    const chatId = telegramId.trim() ? parseInt(telegramId.trim(), 10) : null
    if (telegramId.trim() && isNaN(chatId!)) {
      toast.error('Telegram Chat ID must be a number')
      return
    }
    startTransition(async () => {
      try {
        await updateUserDetails(user.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phone.trim() || null,
          telegram_chat_id: chatId,
        })
        toast.success('User updated')
        onSave({ id: user.id, first_name: firstName.trim(), last_name: lastName.trim(), phone_number: phone.trim() || null, telegram_chat_id: chatId })
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update')
      }
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    startDelete(async () => {
      try {
        await deleteUser(user.id)
        toast.success('User deleted')
        onDelete(user.id)
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete user')
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <p className="text-sm font-semibold text-slate-100">{user.first_name} {user.last_name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Name */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Name</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">First name</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="pl-8 h-9 text-sm bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Last name</Label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="h-9 text-sm bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Email — read only */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Email</Label>
            <Input
              value={user.email}
              readOnly
              className="h-9 text-sm bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-600">Email is managed via Supabase Auth</p>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Phone number</Label>
            <div className="relative">
              <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+44..."
                className="pl-8 h-9 text-sm bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          {/* Telegram */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Telegram Chat ID</Label>
            <div className="relative">
              <Send className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                value={telegramId}
                onChange={e => setTelegramId(e.target.value)}
                placeholder="e.g. 123456789"
                className="pl-8 h-9 text-sm bg-slate-800 border-slate-700 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-600">
              To find your Chat ID: message <span className="text-sky-500">@userinfobot</span> on Telegram
            </p>
            {telegramId && (
              <button
                onClick={() => setTelegramId('')}
                className="text-[10px] text-red-500 hover:text-red-400"
              >
                Remove Telegram link
              </button>
            )}
          </div>

          {/* Joined */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Joined</Label>
            <p className="text-sm text-slate-400">
              {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-5 py-4 space-y-3">
          <Button
            onClick={handleSave}
            disabled={!isDirty || isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-9 text-sm"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>

          {!isCurrentUser && (
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              variant="ghost"
              className={`w-full h-9 text-sm border ${
                confirmDelete
                  ? 'border-red-500 text-red-400 hover:bg-red-950/40'
                  : 'border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/50'
              }`}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : confirmDelete ? (
                <><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Confirm delete</>
              ) : (
                <><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete user</>
              )}
            </Button>
          )}
          {confirmDelete && (
            <button onClick={() => setConfirmDelete(false)} className="w-full text-xs text-slate-600 hover:text-slate-400">
              Cancel
            </button>
          )}
        </div>
      </div>
    </>
  )
}
