'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        setServerError('Invalid email or password.')
      } else if (error.message.toLowerCase().includes('inactive')) {
        setServerError('Your account is inactive. Contact your administrator.')
      } else {
        setServerError(error.message)
      }
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword() {
    const email = getValues('email')
    if (!email) {
      setServerError('Enter your email address above, then click Forgot password.')
      return
    }

    setResetLoading(true)
    const supabase = createClient()

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
    })

    setResetLoading(false)
    setResetSent(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <img src="/pangaea-mark.png" className="w-24 mx-auto mb-4" alt="Pangaea" />
          <p className="text-2xl font-bold tracking-[0.3em] text-[#C4A84A]">Pangaea</p>
          <p className="text-xs tracking-[0.25em] text-[#C4A84A]/70 uppercase mt-1">Workforce Management</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Sign in</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.co.uk"
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2">
                <p className="text-sm text-red-400">{serverError}</p>
              </div>
            )}

            {/* Reset sent confirmation */}
            {resetSent && (
              <div className="rounded-lg bg-emerald-950 border border-emerald-800 px-3 py-2">
                <p className="text-sm text-emerald-400">
                  Password reset email sent. Check your inbox.
                </p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium mt-2"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>

          </form>

          {/* Forgot password */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              {resetLoading ? 'Sending…' : 'Forgot password?'}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          No account? Contact Cold Lava to get set up.
        </p>

      </div>
    </div>
  )
}
