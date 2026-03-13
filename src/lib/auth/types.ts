export type UserRole = 'super_admin' | 'admin' | 'staff' | 'site_manager' | 'auditor' | 'director' | 'labour_manager' | 'project_manager'

export interface SupabaseJWT {
  sub: string
  email: string
  user_role?: UserRole
  exp: number
  iat: number
}
