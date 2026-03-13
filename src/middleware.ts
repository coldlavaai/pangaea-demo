import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'
import type { UserRole, SupabaseJWT } from '@/lib/auth/types'

// Routes that site_manager and auditor cannot access
const SITE_MANAGER_BLOCKED = [
  '/settings',
  '/adverts',
  '/comms',
  '/operatives/new',
]

const AUDITOR_ALLOWED = [
  '/dashboard',
  '/documents',
  '/reports',
  '/operatives',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — skip Supabase auth entirely for speed
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/apply') ||
    pathname.startsWith('/apply') ||
    pathname.startsWith('/r/') ||
    pathname.startsWith('/induction') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/briefing')

  // Early return for public routes — no Supabase round-trip needed
  if (isPublicRoute) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must call getUser() to keep session alive
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated user trying to access a protected route → redirect to /login
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user trying to access /login → redirect to /dashboard
  if (pathname.startsWith('/login')) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  // Role-based route guards
  if (user) {
    let userRole: UserRole = 'staff'
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const decoded = jwtDecode<SupabaseJWT>(session.access_token)
        userRole = decoded.user_role ?? 'staff'
      }
    } catch {
      // Fall through with default 'staff' role
    }

    // site_manager: block restricted routes
    if (userRole === 'site_manager') {
      const isBlocked = SITE_MANAGER_BLOCKED.some(
        (blocked) => pathname === blocked || pathname.startsWith(blocked + '/')
      )
      if (isBlocked) {
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    }

    // auditor: only allow dashboard, documents, reports, operatives (read-only)
    if (userRole === 'auditor') {
      const isAllowed =
        AUDITOR_ALLOWED.some(
          (allowed) => pathname === allowed || pathname.startsWith(allowed + '/')
        )
      if (!isAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/unauthorized'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|svg|jpg|jpeg|webp|gif|ico|woff|woff2|ttf)$).*)',
  ],
}
