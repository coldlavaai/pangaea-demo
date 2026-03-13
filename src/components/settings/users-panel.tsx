'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, X, Plus, UserPlus, Phone, Check, Trash2, Copy, CheckCheck, Bell, BellOff, Send, ChevronRight } from 'lucide-react'
import { UserEditDrawer } from './user-edit-drawer'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  updateUserRole,
  toggleUserActive,
  addUserSite,
  removeUserSite,
  inviteUser,
  updateUserPhone,
  deleteUser,
  toggleReceiveNotifications,
} from '@/app/(dashboard)/settings/actions'

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  is_active: boolean | null
  created_at: string | null
  phone_number: string | null
  auth_user_id: string | null
  receive_notifications: boolean | null
  telegram_chat_id: number | null
}

interface Site {
  id: string
  name: string
}

interface UserSite {
  user_id: string
  site_id: string
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
  site_manager: 'Site Manager',
  auditor: 'Auditor',
  director: 'Director',
  labour_manager: 'Labour Manager',
  project_manager: 'Project Manager',
}

const ROLE_COLOURS: Record<string, string> = {
  super_admin: 'text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-900',
  admin: 'text-amber-400 bg-amber-950/60 border-amber-900',
  staff: 'text-emerald-400 bg-emerald-950/60 border-emerald-900',
  site_manager: 'text-sky-400 bg-sky-950/60 border-sky-900',
  auditor: 'text-violet-400 bg-violet-950/60 border-violet-900',
  director: 'text-rose-400 bg-rose-950/60 border-rose-900',
  labour_manager: 'text-orange-400 bg-orange-950/60 border-orange-900',
  project_manager: 'text-cyan-400 bg-cyan-950/60 border-cyan-900',
}

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? ''

const BLANK_INVITE = {
  first_name: '',
  last_name: '',
  email: '',
  role: 'staff',
  phone_number: '',
  site_ids: [] as string[],
}

export function UsersPanel({
  users: initialUsers,
  sites,
  userSites: initialUserSites,
  currentAuthUserId,
}: {
  users: User[]
  sites: Site[]
  userSites: UserSite[]
  currentAuthUserId: string
}) {
  const [users, setUsers] = useState(initialUsers)
  const [userSites, setUserSites] = useState(initialUserSites)
  const [savingRole, setSavingRole] = useState<string | null>(null)
  const [savingToggle, setSavingToggle] = useState<string | null>(null)
  const [addingSite, setAddingSite] = useState<string | null>(null)
  const [removingSite, setRemovingSite] = useState<string | null>(null)
  const [editingPhone, setEditingPhone] = useState<string | null>(null) // userId
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({})
  const [savingPhone, setSavingPhone] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null) // userId
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState(BLANK_INVITE)
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [invitedName, setInvitedName] = useState('')
  const [invitedPhone, setInvitedPhone] = useState('')
  const [invitedRole, setInvitedRole] = useState('')
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const getSitesForUser = (userId: string) =>
    userSites
      .filter((us) => us.user_id === userId)
      .map((us) => sites.find((s) => s.id === us.site_id))
      .filter(Boolean) as Site[]

  const getUnassignedSites = (userId: string) => {
    const assignedIds = new Set(
      userSites.filter((us) => us.user_id === userId).map((us) => us.site_id)
    )
    return sites.filter((s) => !assignedIds.has(s.id))
  }

  const handleUpdateRole = (userId: string, role: string) => {
    const prev = [...users]
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, role } : x)))
    setSavingRole(userId)
    startTransition(async () => {
      try {
        await updateUserRole(userId, role)
        toast.success(`Role updated — takes effect on next login`)
      } catch {
        setUsers(prev)
        toast.error('Failed to update role')
      } finally {
        setSavingRole(null)
      }
    })
  }

  const handleToggleActive = (userId: string, current: boolean | null) => {
    const next = !current
    const prev = [...users]
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, is_active: next } : x)))
    setSavingToggle(userId)
    startTransition(async () => {
      try {
        await toggleUserActive(userId, next)
        toast.success(current ? 'User disabled' : 'User enabled')
      } catch {
        setUsers(prev)
        toast.error('Failed to update user status')
      } finally {
        setSavingToggle(null)
      }
    })
  }

  const handleToggleNotifications = (userId: string, current: boolean | null) => {
    const next = current === false ? true : false
    const prev = [...users]
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, receive_notifications: next } : x)))
    startTransition(async () => {
      try {
        await toggleReceiveNotifications(userId, next)
        toast.success(next ? 'Telegram notifications enabled' : 'Telegram notifications disabled')
      } catch {
        setUsers(prev)
        toast.error('Failed to update notification preference')
      }
    })
  }

  const handleAddSite = (userId: string, siteId: string) => {
    if (!siteId) return
    const prev = [...userSites]
    setUserSites((us) => [...us, { user_id: userId, site_id: siteId }])
    setAddingSite(userId)
    startTransition(async () => {
      try {
        await addUserSite(userId, siteId, ORG_ID)
      } catch {
        setUserSites(prev)
        toast.error('Failed to assign site')
      } finally {
        setAddingSite(null)
      }
    })
  }

  const handleRemoveSite = (userId: string, siteId: string) => {
    const key = `${userId}-${siteId}`
    const prev = [...userSites]
    setUserSites((us) => us.filter((x) => !(x.user_id === userId && x.site_id === siteId)))
    setRemovingSite(key)
    startTransition(async () => {
      try {
        await removeUserSite(userId, siteId)
      } catch {
        setUserSites(prev)
        toast.error('Failed to remove site')
      } finally {
        setRemovingSite(null)
      }
    })
  }

  const startEditPhone = (user: User) => {
    setEditingPhone(user.id)
    setPhoneInputs((p) => ({ ...p, [user.id]: user.phone_number ?? '' }))
  }

  const handleSavePhone = (userId: string) => {
    const phone = phoneInputs[userId]?.trim() || null
    const prev = [...users]
    setUsers((u) => u.map((x) => (x.id === userId ? { ...x, phone_number: phone } : x)))
    setSavingPhone(userId)
    setEditingPhone(null)
    startTransition(async () => {
      try {
        await updateUserPhone(userId, phone)
        toast.success('Phone number updated')
      } catch {
        setUsers(prev)
        toast.error('Failed to update phone')
      } finally {
        setSavingPhone(null)
      }
    })
  }

  const handleDelete = async (userId: string, name: string) => {
    setDeleting(userId)
    setConfirmDelete(null)
    try {
      await deleteUser(userId)
      setUsers((u) => u.filter((x) => x.id !== userId))
      setUserSites((us) => us.filter((x) => x.user_id !== userId))
      toast.success(`${name} deleted`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete user')
    } finally {
      setDeleting(null)
    }
  }

  const handleInvite = async () => {
    if (!inviteForm.first_name || !inviteForm.last_name || !inviteForm.email) {
      toast.error('Name and email are required')
      return
    }
    setInviting(true)
    const result = await inviteUser({
      first_name: inviteForm.first_name,
      last_name: inviteForm.last_name,
      email: inviteForm.email,
      role: inviteForm.role,
      phone_number: inviteForm.phone_number || undefined,
      site_ids: inviteForm.role === 'site_manager' ? inviteForm.site_ids : [],
    })
    setInviting(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    setInvitedName(`${inviteForm.first_name} ${inviteForm.last_name}`)
    setInvitedPhone(inviteForm.phone_number)
    setInviteLink(result.link ?? null)
    setInvitedRole(inviteForm.role)
  }

  const handleCopyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInviteDone = () => {
    setInviteOpen(false)
    setInviteForm(BLANK_INVITE)
    setInviteLink(null)
    setInvitedName('')
    setInvitedPhone('')
    setInvitedRole('')
    setCopied(false)
  }

  const toggleInviteSite = (siteId: string) => {
    setInviteForm((f) => ({
      ...f,
      site_ids: f.site_ids.includes(siteId)
        ? f.site_ids.filter((id) => id !== siteId)
        : [...f.site_ids, siteId],
    }))
  }

  const active = users.filter((u) => u.is_active !== false)
  const inactive = users.filter((u) => u.is_active === false)

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {active.length} active user{active.length !== 1 ? 's' : ''}
          {inactive.length > 0 && `, ${inactive.length} inactive`}
        </p>
        <Button
          size="sm"
          onClick={() => setInviteOpen(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <p className="text-xs text-slate-600">
        Role changes take effect on the user&apos;s next login (JWT expires after ~1 hour).
      </p>

      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">User</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Joined</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((user) => {
              const assignedSites = getSitesForUser(user.id)
              const unassigned = getUnassignedSites(user.id)
              const isEditingPhone = editingPhone === user.id
              const isSavingPhone = savingPhone === user.id
              return (
                <>
                  <tr
                    key={user.id}
                    className={`transition-opacity hover:bg-slate-900/50 ${user.is_active === false ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="flex items-center gap-1 font-medium text-slate-200 hover:text-emerald-400 transition-colors group"
                      >
                        {user.first_name} {user.last_name}
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="text-xs text-slate-500">{user.email}</div>
                      {/* Site assignment — inline for site_manager */}
                      {user.role === 'site_manager' && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {assignedSites.length === 0 && (
                            <span className="text-xs text-slate-600 italic">No sites assigned</span>
                          )}
                          {assignedSites.map((site) => {
                            const key = `${user.id}-${site.id}`
                            return (
                              <span
                                key={site.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/60 border border-sky-900 text-xs text-sky-300"
                              >
                                {site.name}
                                <button
                                  onClick={() => handleRemoveSite(user.id, site.id)}
                                  disabled={removingSite === key}
                                  className="hover:text-white transition-colors"
                                >
                                  {removingSite === key ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </button>
                              </span>
                            )
                          })}
                          {unassigned.length > 0 && (
                            <Select
                              value=""
                              onValueChange={(siteId) => handleAddSite(user.id, siteId)}
                              disabled={addingSite === user.id}
                            >
                              <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs border border-slate-700 bg-slate-800/60 text-slate-400 rounded-full px-2 gap-1">
                                {addingSite === user.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3" />
                                    Add site
                                  </>
                                )}
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                {unassigned.map((site) => (
                                  <SelectItem key={site.id} value={site.id} className="text-xs text-slate-200">
                                    {site.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                      {/* Phone number — inline edit */}
                      <div className="mt-1 flex items-center gap-1">
                        {isEditingPhone ? (
                          <>
                            <Input
                              value={phoneInputs[user.id] ?? ''}
                              onChange={(e) =>
                                setPhoneInputs((p) => ({ ...p, [user.id]: e.target.value }))
                              }
                              placeholder="+447700900000"
                              className="h-6 w-36 text-xs bg-slate-800 border-slate-700 text-slate-200 px-2 py-0"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePhone(user.id)
                                if (e.key === 'Escape') setEditingPhone(null)
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePhone(user.id)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingPhone(null)}
                              className="text-slate-500 hover:text-slate-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditPhone(user)}
                            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                            {isSavingPhone ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : user.phone_number ? (
                              <span className="text-slate-400">{user.phone_number}</span>
                            ) : (
                              <span className="italic">Add phone</span>
                            )}
                          </button>
                        )}
                        {user.telegram_chat_id ? (
                          <span className="flex items-center gap-1 text-xs text-sky-500" title="Telegram linked">
                            <Send className="h-3 w-3" />
                            Telegram linked
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={user.role}
                        onValueChange={(v) => handleUpdateRole(user.id, v)}
                        disabled={savingRole === user.id}
                      >
                        <SelectTrigger
                          className={`h-7 w-40 text-xs border rounded-full px-3 ${ROLE_COLOURS[user.role] ?? 'text-slate-300 bg-slate-800 border-slate-700'}`}
                        >
                          {savingRole === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                            <SelectItem key={val} value={val} className="text-xs text-slate-200">
                              {lbl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {user.created_at ? format(new Date(user.created_at), 'd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {confirmDelete === user.id ? (
                          <>
                            <span className="text-xs text-red-400 mr-1">Delete?</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
                              onClick={() => handleDelete(user.id, `${user.first_name} ${user.last_name}`)}
                              disabled={deleting === user.id}
                            >
                              {deleting === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-slate-500"
                              onClick={() => setConfirmDelete(null)}
                            >
                              No
                            </Button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleNotifications(user.id, user.receive_notifications)}
                              title={user.receive_notifications !== false ? 'Telegram notifications ON — click to disable' : 'Telegram notifications OFF — click to enable'}
                              className={`h-6 w-6 inline-flex items-center justify-center rounded transition-colors ${
                                user.receive_notifications !== false
                                  ? 'text-amber-400 hover:text-amber-300'
                                  : 'text-slate-700 hover:text-slate-500'
                              }`}
                            >
                              {user.receive_notifications !== false
                                ? <Bell className="h-3.5 w-3.5" />
                                : <BellOff className="h-3.5 w-3.5" />
                              }
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-6 px-2 text-xs transition-colors ${user.is_active === false ? 'text-emerald-400' : 'text-slate-500'}`}
                              onClick={() => handleToggleActive(user.id, user.is_active)}
                              disabled={!!savingToggle}
                            >
                              {savingToggle === user.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : user.is_active === false ? (
                                'Enable'
                              ) : (
                                'Disable'
                              )}
                            </Button>
                            {user.auth_user_id !== currentAuthUserId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-slate-700 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                onClick={() => setConfirmDelete(user.id)}
                                title="Delete user"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                </>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-600">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) handleInviteDone() }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {inviteLink ? 'Share invite link' : 'Invite User'}
            </DialogTitle>
          </DialogHeader>

          {/* ── Link screen — shown after successful invite ── */}
          {inviteLink && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-400">
                Account created for <span className="text-slate-200 font-medium">{invitedName}</span>.
                {invitedPhone
                  ? <> WhatsApp sent to <span className="text-emerald-400">{invitedPhone}</span>.</>
                  : <> Copy and send this link so they can set their password.</>
                }
              </p>
              {invitedRole === 'site_manager' && (
                <div className="rounded-md bg-sky-950/40 border border-sky-900 px-3 py-2 text-xs text-sky-300 space-y-1">
                  <p className="font-medium">Site Manager setup:</p>
                  <p>1. Send them the link below to set their password</p>
                  <p>2. Tell them to download Telegram and message <span className="font-mono">@PangaeaSiteBot</span></p>
                  <p>3. They type their email in the bot to activate site manager commands</p>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="bg-slate-800 border-slate-700 text-slate-300 text-xs"
                />
                <Button
                  onClick={handleCopyLink}
                  className={`shrink-0 gap-1.5 transition-colors ${copied ? 'bg-emerald-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                >
                  {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={handleInviteDone} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full">
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── Form screen ── */}
          {!inviteLink && <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">First name</Label>
                <Input
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="James"
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Last name</Label>
                <Input
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="Smith"
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@company.co.uk"
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v, site_ids: [] }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                    <SelectItem key={val} value={val} className="text-slate-200">
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                Phone number
                {inviteForm.role === 'site_manager' && (
                  <span className="ml-1 text-sky-400">— required for WhatsApp bot</span>
                )}
              </Label>
              <Input
                type="tel"
                value={inviteForm.phone_number}
                onChange={(e) => setInviteForm((f) => ({ ...f, phone_number: e.target.value }))}
                placeholder="+447700900000"
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            {/* Site assignment — only shown for site_manager */}
            {inviteForm.role === 'site_manager' && sites.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Assign to sites</Label>
                <div className="flex flex-wrap gap-2">
                  {sites.map((site) => {
                    const selected = inviteForm.site_ids.includes(site.id)
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => toggleInviteSite(site.id)}
                        className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                          selected
                            ? 'bg-sky-900/60 border-sky-700 text-sky-300'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 inline mr-1" />}
                        {site.name}
                      </button>
                    )
                  })}
                </div>
                {inviteForm.site_ids.length === 0 && (
                  <p className="text-xs text-slate-600">
                    No sites selected — user will have access to all sites (admin-level).
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={handleInviteDone}
                disabled={inviting}
                className="text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {inviting ? 'Creating account...' : 'Create & get link'}
              </Button>
            </DialogFooter>
          </div>}
        </DialogContent>
      </Dialog>

      {/* User edit drawer */}
      {editingUser && (
        <UserEditDrawer
          user={editingUser}
          isCurrentUser={editingUser.auth_user_id === currentAuthUserId}
          onClose={() => setEditingUser(null)}
          onSave={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u))
            setEditingUser(null)
          }}
          onDelete={(userId) => {
            setUsers(prev => prev.filter(u => u.id !== userId))
            setUserSites(prev => prev.filter(us => us.user_id !== userId))
          }}
        />
      )}
    </div>
  )
}
